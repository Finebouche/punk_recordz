/* SPDX-License-Identifier: GPL-3.0-or-later */

import {
  BasicRateLimiter,
  ContentRating,
  DiscoverSectionType,
  type Form,
  type Chapter,
  type ChapterDetails,
  type ChapterProviding,
  type DiscoverSection,
  type DiscoverSectionItem,
  type DiscoverSectionProviding,
  type Extension,
  type MangaProviding,
  type PagedResults,
  type SearchFilter,
  type SearchQuery,
  type SearchResultItem,
  type SearchResultsProviding,
  type SettingsFormProviding,
  type SortingOption,
  type SourceManga,
} from "@paperback/types";
import { SettingsForm } from "./forms";
import { getShowCatalogueOnHome } from "./models";
import { MainInterceptor } from "./network";
import {
  DOMAIN,
  MANGA_PATH,
  fetchText,
  toChapterUrl,
  toMangaUrl,
} from "./utils";
import type { CatalogueEntry } from "./models";
import {
  cleanTitle,
  extractChapterNumber,
  extractLatestUpdatedMangaIds,
  extractMetaContent,
  extractTagContent,
  normalizeString,
  parseCatalogue,
} from "./parsers";

type PunkRecordzImplementation = Extension &
  SettingsFormProviding &
  DiscoverSectionProviding &
  SearchResultsProviding &
  MangaProviding &
  ChapterProviding;

export class PunkRecordzExtension implements PunkRecordzImplementation {
  mainRateLimiter = new BasicRateLimiter("main", {
    numberOfRequests: 5,
    bufferInterval: 1,
    ignoreImages: true,
  });

  mainInterceptor = new MainInterceptor("main");

  async initialise(): Promise<void> {
    this.mainRateLimiter.registerInterceptor();
    this.mainInterceptor.registerInterceptor();
  }

  async getSettingsForm(): Promise<Form> {
    return new SettingsForm();
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    const sections: DiscoverSection[] = [
      {
        id: "latest",
        title: "Dernieres sorties",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];

    if (getShowCatalogueOnHome()) {
      sections.push({
        id: "catalogue",
        title: "Catalogue",
        type: DiscoverSectionType.simpleCarousel,
      });
    }

    return sections;
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: unknown | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    void metadata;

    const [catalogue, homeHtml] = await Promise.all([
      this.fetchCatalogue(),
      section.id === "latest" ? this.fetchHtml(DOMAIN) : Promise.resolve(""),
    ]);

    if (section.id === "latest") {
      const latestIds = extractLatestUpdatedMangaIds(homeHtml);
      const latestEntries = latestIds
        .map((mangaId) => catalogue.find((entry) => entry.mangaId === mangaId))
        .filter((entry): entry is CatalogueEntry => entry !== undefined);

      return { items: latestEntries.map((entry) => this.toDiscoverItem(entry)) };
    }

    if (section.id === "catalogue") {
      return { items: catalogue.map((entry) => this.toDiscoverItem(entry)) };
    }

    return { items: [] };
  }

  async getSearchFilters(): Promise<SearchFilter[]> {
    return [];
  }

  async getSearchResults(
    query: SearchQuery,
    metadata: unknown | undefined,
    sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    void metadata;
    void sortingOption;

    const catalogue = await this.fetchCatalogue();
    const search = normalizeString(query.title ?? "");
    const items = catalogue
      .filter((entry) => !search || normalizeString(entry.title).includes(search))
      .map((entry) => ({
        mangaId: entry.mangaId,
        title: entry.title,
        imageUrl: entry.image,
        contentRating: ContentRating.EVERYONE,
      }));

    return { items };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [html, catalogue] = await Promise.all([
      this.fetchHtml(toMangaUrl(mangaId)),
      this.fetchCatalogue(),
    ]);
    const fallbackEntry = catalogue.find((manga) => manga.mangaId === mangaId);
    const primaryTitle = cleanTitle(
      extractTagContent(html, "title") ?? fallbackEntry?.title ?? mangaId,
    );
    const thumbnailUrl =
      extractMetaContent(html, "property", "og:image") ??
      fallbackEntry?.image ??
      `${DOMAIN}/logo512.png`;
    const synopsis =
      extractMetaContent(html, "name", "description") ?? "Aucune description disponible.";

    return {
      mangaId,
      mangaInfo: {
        thumbnailUrl,
        synopsis,
        primaryTitle,
        secondaryTitles: [],
        contentRating: ContentRating.EVERYONE,
        status: "Inconnu",
        artist: "N/A",
        author: "N/A",
        additionalInfo: {
          format: "Scan couleur",
        },
        artworkUrls: [thumbnailUrl],
        shareUrl: toMangaUrl(mangaId),
      },
    };
  }

  async getChapters(sourceManga: SourceManga, sinceDate?: Date): Promise<Chapter[]> {
    void sinceDate;

    const html = await this.fetchHtml(toMangaUrl(sourceManga.mangaId));
    const chapters: Chapter[] = [];
    const seen = new Set<string>();
    const regex = new RegExp(
      `href="/mangas/${sourceManga.mangaId}/([^"?#/]+)"[^>]*>([^<]+)<`,
      "g",
    );
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const chapterId = match[1]?.trim();
      const title = match[2]?.trim() ?? "";

      if (!chapterId || seen.has(chapterId)) {
        continue;
      }

      chapters.push({
        chapterId,
        sourceManga,
        langCode: "FR",
        chapNum: extractChapterNumber(chapterId, title),
        title: title || undefined,
      });
      seen.add(chapterId);
    }

    if (!chapters.length) {
      throw new Error(`Couldn't find any chapters for mangaId: ${sourceManga.mangaId}!`);
    }

    return chapters;
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const html = await this.fetchHtml(toChapterUrl(chapter.sourceManga.mangaId, chapter.chapterId));
    const regex =
      /<img[^>]+alt="[^"]*-page-[^"]*"[^>]+src="(https:\/\/api\.punkrecordz\.com\/images\/[^"]+)"/g;
    const pages: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(html)) !== null) {
      const page = match[1]?.trim();
      if (!page || seen.has(page)) {
        continue;
      }

      pages.push(page);
      seen.add(page);
    }

    if (!pages.length) {
      throw new Error(
        `Couldn't find any pages for mangaId: ${chapter.sourceManga.mangaId} chapterId: ${chapter.chapterId}!`,
      );
    }

    return {
      id: chapter.chapterId,
      mangaId: chapter.sourceManga.mangaId,
      pages,
    };
  }

  private async fetchCatalogue(): Promise<CatalogueEntry[]> {
    const html = await this.fetchHtml(MANGA_PATH);
    return parseCatalogue(html);
  }

  private async fetchHtml(url: string): Promise<string> {
    return fetchText({
      url,
      method: "GET",
    });
  }

  private toDiscoverItem(entry: CatalogueEntry): DiscoverSectionItem {
    return {
      type: "simpleCarouselItem",
      mangaId: entry.mangaId,
      title: entry.title,
      imageUrl: entry.image,
      contentRating: ContentRating.EVERYONE,
    };
  }
}

export const PunkRecordz = new PunkRecordzExtension();
