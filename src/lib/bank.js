// 内蔵問題バンクからの出題ロジック
import { loadQuestionBank } from "../data/questionBank.js";
import { shuffleChoices } from "./shuffleChoices.js";
import {
  getUsedBankIds,
  markBankUsed,
  removeUsedBankIds,
} from "./storage.js";

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 未出題の内蔵問題を1問選ぶ。同難易度を優先し、なければ同カテゴリの他難易度から選ぶ。
// 未出題が1問もなければ null を返す。
export async function pickBankQuestion(category, difficulty) {
  const bank = await loadQuestionBank();
  const used = new Set(getUsedBankIds());
  const inCategory = bank.filter((q) => q.category === category);

  let pool = inCategory.filter(
    (q) => q.difficulty === difficulty && !used.has(q.id)
  );
  if (pool.length === 0) {
    pool = inCategory.filter((q) => !used.has(q.id));
  }
  if (pool.length === 0) return null;

  const q = pickRandom(pool);
  markBankUsed(q.id);
  return shuffleChoices({ ...q, source: "bank" });
}

// カテゴリの出題済み記録をリセットする(APIキーなしで使い切った場合の再利用用)
export async function resetBankForCategory(category) {
  const bank = await loadQuestionBank();
  const idsInCategory = bank
    .filter((q) => q.category === category)
    .map((q) => q.id);
  removeUsedBankIds(idsInCategory);
}
