/* SPDX-License-Identifier: GPL-3.0-or-later */

import type { CatalogueEntry } from "./models";
import { toAbsoluteImage } from "./utils";

function decodeJsonText(value: string): string {
  return JSON.parse(`"${value}"`) as string;
}

function decodeHtml(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMatch(regex: RegExp, value: string): RegExpExecArray | undefined {
  return regex.exec(value) ?? undefined;
}

export function extractMetaContent(
  html: string,
  attribute: "name" | "property",
  key: string,
): string | undefined {
  const escapedKey = escapeRegex(key);
  const regex = new RegExp(`<meta[^>]+${attribute}="${escapedKey}"[^>]+content="([^"]+)"`, "i");
  return decodeHtml(extractMatch(regex, html)?.[1]);
}

export function extractTagContent(html: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, "i");
  return decodeHtml(extractMatch(regex, html)?.[1]);
}

export function extractLatestUpdatedMangaIds(html: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const regex = /href="\/mangas\/([^/"?#]+)\/[^"?#/]+"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const mangaId = match[1];
    if (!mangaId || seen.has(mangaId)) {
      continue;
    }

    ids.push(mangaId);
    seen.add(mangaId);
  }

  return ids;
}

export function extractChapterNumber(chapterId: string, title: string): number {
  const titleMatch = /chapitre\s+([\d.]+)/i.exec(title);
  if (titleMatch?.[1]) {
    return Number(titleMatch[1]);
  }

  const chapterMatch = /([\d.]+)/.exec(chapterId);
  return chapterMatch?.[1] ? Number(chapterMatch[1]) : 0;
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\s+\|\s+Punk Records.*$/i, "")
    .replace(/\s+-\s+Scan couleur$/i, "")
    .trim();
}

export function normalizeString(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function parseCatalogue(html: string): CatalogueEntry[] {
  const entries: CatalogueEntry[] = [];
  const seen = new Set<string>();
  const objectRegex = /{[^{}]*"__typename":"Manga"[^{}]*}/g;
  let match: RegExpExecArray | null;

  while ((match = objectRegex.exec(html)) !== null) {
    const block = match[0];
    const rawTitle = /"name":"((?:\\.|[^"\\])*)"/.exec(block)?.[1];
    const mangaId = /"slug":"([^"]+)"/.exec(block)?.[1];
    const thumb = /"thumb":"([^"]+)"/.exec(block)?.[1];
    const published = /"published":(true|false)/.exec(block)?.[1] === "true";

    if (!published || !rawTitle || !mangaId || !thumb || seen.has(mangaId)) {
      continue;
    }

    entries.push({
      mangaId,
      title: decodeJsonText(rawTitle),
      image: toAbsoluteImage(thumb),
    });
    seen.add(mangaId);
  }

  if (!entries.length) {
    throw new Error("Couldn't parse the PunkRecordz catalogue.");
  }

  return entries;
}
