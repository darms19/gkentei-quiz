// AI生成問題の事前ストック
// 出題のたびにAPIを待つとテンポが悪いため、カテゴリ×難易度ごとに
// 最大5問をバックグラウンドで先に生成しておき、出題時は即時に取り出す。

import { generateQuestion } from "./api.js";
import { getRecentQuestions } from "./storage.js";

const KEY = "gkentei.aiStock";
export const STOCK_TARGET = 5;

// 同じカテゴリ×難易度の補充が同時に走らないようにするガード
const inFlight = new Set();

function readStock() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeStock(stock) {
  localStorage.setItem(KEY, JSON.stringify(stock));
}

const keyOf = (category, difficulty) => `${category}|${difficulty}`;

// ストック全体の問題数(設定画面の表示用)
export function totalStockCount() {
  return Object.values(readStock()).reduce((n, list) => n + list.length, 0);
}

export function clearStock() {
  localStorage.removeItem(KEY);
}

// ストックから1問取り出す(なければ null)
export function takeFromStock(category, difficulty) {
  const stock = readStock();
  const list = stock[keyOf(category, difficulty)] ?? [];
  if (list.length === 0) return null;
  const q = list.shift();
  stock[keyOf(category, difficulty)] = list;
  writeStock(stock);
  return q;
}

// ストックが目標数になるまでバックグラウンドで生成する。
// 呼び出し側は await しない(失敗しても画面には影響させない)。
export async function refillStock({
  provider,
  apiKey,
  model,
  category,
  difficulty,
  target = STOCK_TARGET,
}) {
  if (!apiKey) return;
  const key = keyOf(category, difficulty);
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    // 1問ずつ直列に生成する(レート制限を避け、重複回避リストを毎回更新するため)
    while ((readStock()[key] ?? []).length < target) {
      const stockTexts = (readStock()[key] ?? []).map((q) => q.question);
      const q = await generateQuestion({
        provider,
        apiKey,
        model,
        category,
        difficulty,
        recentQuestions: [...getRecentQuestions(category), ...stockTexts],
      });
      q.category = category;
      q.difficulty = difficulty;
      q.source = "ai";
      const stock = readStock();
      (stock[key] ??= []).push(q);
      writeStock(stock);
    }
  } catch {
    // バックグラウンド補充の失敗は無視(次回出題時に再試行される)
  } finally {
    inFlight.delete(key);
  }
}
