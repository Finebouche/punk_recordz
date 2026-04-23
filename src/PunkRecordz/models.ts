/* SPDX-License-Identifier: GPL-3.0-or-later */

import type {
  Chapter,
  ChapterDetails,
  DiscoverSection,
  DiscoverSectionItem,
  SearchResultItem,
  SourceManga,
} from "@paperback/types";

export type CatalogueEntry = {
  mangaId: string;
  title: string;
  image: string;
};

export const PUNK_RECORDZ_SECTIONS = {
  latest: "latest",
  catalogue: "catalogue",
} as const;

export type PunkRecordzSectionId =
  (typeof PUNK_RECORDZ_SECTIONS)[keyof typeof PUNK_RECORDZ_SECTIONS];

export type DiscoverItemType = "featuredCarouselItem" | "simpleCarouselItem";

export type PunkRecordzMangaDetails = Pick<SourceManga, "mangaId" | "mangaInfo">;
export type PunkRecordzChapter = Chapter;
export type PunkRecordzChapterDetails = ChapterDetails;
export type PunkRecordzSearchResult = SearchResultItem;
export type PunkRecordzDiscoverItem = DiscoverSectionItem;
export type PunkRecordzDiscoverSection = DiscoverSection;

export const PUNK_RECORDZ_STATE_KEYS = {
  showCatalogueOnHome: "punkrecordz_show_catalogue_on_home",
} as const;

export function getShowCatalogueOnHome(): boolean {
  const value = Application.getState(PUNK_RECORDZ_STATE_KEYS.showCatalogueOnHome);
  return typeof value === "boolean" ? value : true;
}
