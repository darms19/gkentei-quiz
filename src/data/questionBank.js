// 内蔵問題バンク(APIクレジットを消費せずに出題するための事前作成問題)
// 各カテゴリ: やさしい30問・標準30問・むずかしい30問 = 90問 × 7カテゴリ = 630問

import { ML_QUESTIONS } from "./questions/ml.js";
import { DL_QUESTIONS } from "./questions/dl.js";
import { MATH_QUESTIONS } from "./questions/math.js";
import { HIST_QUESTIONS } from "./questions/hist.js";
import { LAW_QUESTIONS } from "./questions/law.js";
import { ETH_QUESTIONS } from "./questions/eth.js";
import { BIZ_QUESTIONS } from "./questions/biz.js";

export const QUESTION_BANK = [
  ...ML_QUESTIONS,
  ...DL_QUESTIONS,
  ...MATH_QUESTIONS,
  ...HIST_QUESTIONS,
  ...LAW_QUESTIONS,
  ...ETH_QUESTIONS,
  ...BIZ_QUESTIONS,
];
