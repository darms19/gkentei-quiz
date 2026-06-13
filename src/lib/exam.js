// 模擬試験モードの出題セット生成
import { loadQuestionBank } from "../data/questionBank.js";
import { CATEGORIES } from "./storage.js";
import { shuffleChoices } from "./shuffleChoices.js";

export const EXAM_PRESETS = [
  {
    id: "mini",
    label: "ミニ模試",
    total: 20,
    minutes: 15,
    description: "すきま時間で力試し",
  },
  {
    id: "half",
    label: "ハーフ模試",
    total: 80,
    minutes: 60,
    description: "本番の半分の分量",
  },
  {
    id: "full",
    label: "フル模試",
    total: 160,
    minutes: 120,
    description: "本番と同じ160問・120分",
  },
];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 内蔵問題からカテゴリ均等(端数はランダムなカテゴリに配分)に抽出した出題セットを作る。
// 通常モードの「出題済み記録」とは独立しており、何度でも受験できる。
export async function buildExamQuestions(total) {
  const bank = await loadQuestionBank();
  const base = Math.floor(total / CATEGORIES.length);
  const remainder = total - base * CATEGORIES.length;
  const extra = new Set(shuffle(CATEGORIES).slice(0, remainder));
  const selected = [];
  for (const category of CATEGORIES) {
    const count = base + (extra.has(category) ? 1 : 0);
    const pool = shuffle(bank.filter((q) => q.category === category));
    selected.push(...pool.slice(0, count));
  }
  return shuffle(selected).map((q) => shuffleChoices({ ...q, source: "bank" }));
}
