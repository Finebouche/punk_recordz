/* SPDX-License-Identifier: GPL-3.0-or-later */

import type { Request } from "@paperback/types";

const DOMAIN = "https://punkrecordz.com";
const API_DOMAIN = "https://api.punkrecordz.com";
const MANGA_PATH = `${DOMAIN}/mangas`;

export type CatalogueEntry = {
  mangaId: string;
  title: string;
  image: string;
};

export { API_DOMAIN, DOMAIN, MANGA_PATH };

export async function fetchText(request: Request): Promise<string> {
  const [response, data] = await Application.scheduleRequest(request);
  if (response.status >= 400) {
    throw new Error(`Request failed with status ${response.status} for ${request.url}`);
  }

  return Application.arrayBufferToUTF8String(data);
}

export function toAbsoluteImage(thumb: string): string {
  const normalizedThumb = thumb.replace(/\.[^.]+$/, "");
  return `${API_DOMAIN}/images/webp/${normalizedThumb}.webp`;
}

export function toMangaUrl(mangaId: string): string {
  return `${MANGA_PATH}/${mangaId}`;
}

export function toChapterUrl(mangaId: string, chapterId: string): string {
  return `${MANGA_PATH}/${mangaId}/${chapterId}`;
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

export function decodeJsonText(value: string): string {
  return JSON.parse(`"${value}"`) as string;
}

export function decodeHtml(value: string | undefined): string | undefined {
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

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractMatch(regex: RegExp, value: string): RegExpExecArray | undefined {
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
