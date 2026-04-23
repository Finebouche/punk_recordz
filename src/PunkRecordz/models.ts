/* SPDX-License-Identifier: GPL-3.0-or-later */

export type CatalogueEntry = {
  mangaId: string;
  title: string;
  image: string;
};

export const PUNK_RECORDZ_STATE_KEYS = {
  showCatalogueOnHome: "punkrecordz_show_catalogue_on_home",
} as const;

export function getShowCatalogueOnHome(): boolean {
  const value = Application.getState(PUNK_RECORDZ_STATE_KEYS.showCatalogueOnHome);
  return typeof value === "boolean" ? value : true;
}
