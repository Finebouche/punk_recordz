/* SPDX-License-Identifier: GPL-3.0-or-later */

import pbconfig from "./pbconfig";
import { PunkRecordzBase } from "./base";

class PunkRecordzExtension extends PunkRecordzBase {
  name = pbconfig.name;
}

export const PunkRecordz = new PunkRecordzExtension();
