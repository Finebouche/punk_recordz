/* SPDX-License-Identifier: GPL-3.0-or-later */

import { basePbConfig } from "./config";

const pbConfig = {
  ...basePbConfig,
};

pbConfig.name = "PunkRecordz";
pbConfig.description = "Extension that pulls content from punkrecordz.com.";
pbConfig.language = "fr";

export default pbConfig;
