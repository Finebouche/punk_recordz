/* SPDX-License-Identifier: GPL-3.0-or-later */

import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export const basePbConfig: ExtensionInfo = {
  name: "PunkRecordz",
  description: "Extension that pulls content from punkrecordz.com.",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "fr",
  contentRating: ContentRating.EVERYONE,
  capabilities:
    SourceIntents.SETTINGS_FORM_PROVIDING |
    SourceIntents.CHAPTER_PROVIDING |
    SourceIntents.DISCOVER_SECTION_PROVIDING |
    SourceIntents.SEARCH_RESULT_PROVIDING,
  badges: [],
  developers: [
    {
      name: "Finebouche",
      github: "https://github.com/Finebouche",
    },
  ],
};
