// 内蔵問題バンク・用語集データの整合性を検証するスクリプト。
// 問題の追加・編集でデータが壊れていないかをCIで自動チェックするために使う。
// エラーが1件でもあれば終了コード1で終了する。
//
// 実行: node scripts/validate-data.mjs  (または npm run validate)

import { loadQuestionBank } from "../src/data/questionBank.js";
import { GLOSSARY } from "../src/data/glossary.js";
import { CATEGORIES, DIFFICULTIES } from "../src/lib/storage.js";

const MIN_PER_BUCKET = 30; // カテゴリ×難易度ごとの最低問題数
const errors = [];
const fail = (msg) => errors.push(msg);

// --- 問題バンクの検証 ---
const bank = await loadQuestionBank();

// 1. カテゴリ×難易度ごとに最低問題数を満たすか(均等が前提だが追加で増えるのは可)
const dist = {};
for (const q of bank) {
  const key = `${q.category}/${q.difficulty}`;
  dist[key] = (dist[key] ?? 0) + 1;
}
for (const category of CATEGORIES) {
  for (const difficulty of DIFFICULTIES) {
    const key = `${category}/${difficulty}`;
    const count = dist[key] ?? 0;
    if (count < MIN_PER_BUCKET) {
      fail(`件数不足: ${key} は ${count}問 (最低 ${MIN_PER_BUCKET}問必要)`);
    }
  }
}

// 2. ID の重複・構造・選択肢・正解インデックスの検証
const seenIds = new Set();
const seenQuestions = new Set();
for (const q of bank) {
  const label = q.id ?? "(id未設定)";

  if (!q.id || typeof q.id !== "string") fail(`ID不正: ${label}`);
  else if (seenIds.has(q.id)) fail(`ID重複: ${q.id}`);
  else seenIds.add(q.id);

  if (!CATEGORIES.includes(q.category))
    fail(`未知のカテゴリ: ${label} -> "${q.category}"`);
  if (!DIFFICULTIES.includes(q.difficulty))
    fail(`未知の難易度: ${label} -> "${q.difficulty}"`);

  if (typeof q.question !== "string" || q.question.trim() === "")
    fail(`問題文が空: ${label}`);
  else if (seenQuestions.has(q.question)) fail(`問題文の重複: ${label}`);
  else seenQuestions.add(q.question);

  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    fail(`選択肢が4つでない: ${label}`);
  } else {
    if (q.choices.some((c) => typeof c !== "string" || c.trim() === ""))
      fail(`空の選択肢がある: ${label}`);
    if (new Set(q.choices).size !== q.choices.length)
      fail(`選択肢が重複している: ${label}`);
  }

  if (
    !Number.isInteger(q.answerIndex) ||
    q.answerIndex < 0 ||
    q.answerIndex > 3
  ) {
    fail(`answerIndexが不正(0〜3): ${label} -> ${q.answerIndex}`);
  }

  if (typeof q.explanation !== "string" || q.explanation.trim() === "")
    fail(`解説が空: ${label}`);
}

// --- 用語集の検証 ---
const seenTerms = new Set();
for (const g of GLOSSARY) {
  const label = g.term ?? "(term未設定)";
  if (!g.term || typeof g.term !== "string" || g.term.trim() === "")
    fail(`用語名が空: ${label}`);
  else if (seenTerms.has(g.term)) fail(`用語の重複: ${g.term}`);
  else seenTerms.add(g.term);

  if (!CATEGORIES.includes(g.category))
    fail(`用語のカテゴリが未知: ${label} -> "${g.category}"`);
  if (typeof g.definition !== "string" || g.definition.trim() === "")
    fail(`用語の定義が空: ${label}`);
}

// --- 結果出力 ---
if (errors.length > 0) {
  console.error(`❌ データ検証に失敗しました (${errors.length}件)\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ データ検証OK");
console.log(`  問題数: ${bank.length}問 (各カテゴリ×難易度は最低${MIN_PER_BUCKET}問)`);
const catTotals = CATEGORIES.map((c) => {
  const n = DIFFICULTIES.reduce((sum, d) => sum + (dist[`${c}/${d}`] ?? 0), 0);
  return `${c}:${n}`;
});
console.log(`  カテゴリ別: ${catTotals.join(" / ")}`);
console.log(`  用語数: ${GLOSSARY.length}語`);
