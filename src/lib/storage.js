// localStorage を使った永続化レイヤー

const KEYS = {
  provider: "gkentei.provider",
  providers: "gkentei.providers",
  stats: "gkentei.stats",
  recent: "gkentei.recentQuestions",
  bankUsed: "gkentei.bankUsed",
  bankFirst: "gkentei.bankFirst",
  history: "gkentei.history",
  bookmarks: "gkentei.bookmarks",
  theme: "gkentei.theme",
  review: "gkentei.review",
  flashcards: "gkentei.flashcards",
  // v1(Claude単独対応時代)のキー。初回読み込み時に providers へ移行する
  legacyApiKey: "gkentei.apiKey",
  legacyModel: "gkentei.model",
};

export const CATEGORIES = [
  "機械学習",
  "深層学習",
  "数学基礎",
  "AIの歴史",
  "法律",
  "倫理",
  "ビジネス応用",
];

export const DIFFICULTIES = ["やさしい", "標準", "むずかしい"];

// 対応プロバイダの定義
export const PROVIDERS = {
  claude: {
    label: "Claude",
    company: "Anthropic",
    defaultModel: "claude-sonnet-4-6",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/",
  },
  openai: {
    label: "OpenAI",
    company: "OpenAI",
    defaultModel: "gpt-5-mini",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    label: "Gemini",
    company: "Google",
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
  },
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- プロバイダ設定 ---
// providers = { [providerId]: { apiKey: string, model: string } }

function migrateLegacyConfig(providers) {
  const legacyKey = read(KEYS.legacyApiKey, null);
  if (legacyKey && !providers.claude) {
    providers.claude = {
      apiKey: legacyKey,
      model: read(KEYS.legacyModel, PROVIDERS.claude.defaultModel),
    };
    write(KEYS.providers, providers);
    localStorage.removeItem(KEYS.legacyApiKey);
    localStorage.removeItem(KEYS.legacyModel);
  }
  return providers;
}

export function getProviderConfigs() {
  return migrateLegacyConfig(read(KEYS.providers, {}));
}

export function setProviderConfig(providerId, config) {
  const providers = getProviderConfigs();
  providers[providerId] = {
    apiKey: (config.apiKey ?? "").trim(),
    model: (config.model ?? "").trim() || PROVIDERS[providerId].defaultModel,
  };
  write(KEYS.providers, providers);
}

export function getSelectedProvider() {
  const p = read(KEYS.provider, "claude");
  return PROVIDERS[p] ? p : "claude";
}

export function setSelectedProvider(providerId) {
  if (PROVIDERS[providerId]) write(KEYS.provider, providerId);
}

// 現在選択中のプロバイダの実効設定を返す
export function getActiveConfig() {
  const provider = getSelectedProvider();
  const config = getProviderConfigs()[provider] ?? {};
  return {
    provider,
    apiKey: config.apiKey ?? "",
    model: config.model || PROVIDERS[provider].defaultModel,
  };
}

// --- 内蔵問題バンクの利用設定・出題済み記録 ---

// 内蔵問題を優先して出題するか(APIクレジット節約。既定: ON)
export function isBankFirst() {
  return read(KEYS.bankFirst, true);
}

export function setBankFirst(value) {
  write(KEYS.bankFirst, !!value);
}

export function getUsedBankIds() {
  return read(KEYS.bankUsed, []);
}

export function markBankUsed(id) {
  const used = getUsedBankIds();
  if (!used.includes(id)) {
    used.push(id);
    write(KEYS.bankUsed, used);
  }
}

export function removeUsedBankIds(ids) {
  const remove = new Set(ids);
  write(
    KEYS.bankUsed,
    getUsedBankIds().filter((id) => !remove.has(id))
  );
}

// --- カテゴリ別成績 ---
// stats = { [category]: { correct: number, total: number } }

export function getStats() {
  return read(KEYS.stats, {});
}

export function recordAnswer(category, difficulty, isCorrect) {
  const stats = getStats();
  const s = stats[category] ?? { correct: 0, total: 0 };
  stats[category] = {
    correct: s.correct + (isCorrect ? 1 : 0),
    total: s.total + 1,
  };
  write(KEYS.stats, stats);
  addHistoryEntry(category, difficulty, isCorrect);
  return stats;
}

export function resetStats() {
  write(KEYS.stats, {});
  write(KEYS.history, []);
}

// --- 解答履歴(学習記録・難易度別成績・推移グラフの元データ) ---
// history = [{ date: "YYYY-MM-DD", category, difficulty, correct: boolean }]

const HISTORY_LIMIT = 5000;

function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function getHistory() {
  return read(KEYS.history, []);
}

function addHistoryEntry(category, difficulty, isCorrect) {
  const history = getHistory();
  history.push({
    date: todayKey(),
    category,
    difficulty,
    correct: !!isCorrect,
  });
  write(KEYS.history, history.slice(-HISTORY_LIMIT));
}

// 日別の解答数・正解数。{ "YYYY-MM-DD": { total, correct } }
export function getDailyLog() {
  const daily = {};
  for (const h of getHistory()) {
    const d = (daily[h.date] ??= { total: 0, correct: 0 });
    d.total += 1;
    if (h.correct) d.correct += 1;
  }
  return daily;
}

// 連続学習日数。今日まだ解いていない場合は昨日までの連続を返す
export function getStreak() {
  const daily = getDailyLog();
  let streak = 0;
  let offset = daily[todayKey()] ? 0 : -1;
  while (daily[todayKey(offset - streak)]) streak += 1;
  return streak;
}

// 難易度別の成績。{ [difficulty]: { correct, total } }
export function getDifficultyStats() {
  const result = {};
  for (const h of getHistory()) {
    if (!h.difficulty) continue;
    const s = (result[h.difficulty] ??= { correct: 0, total: 0 });
    s.total += 1;
    if (h.correct) s.correct += 1;
  }
  return result;
}

// カテゴリの正解率。未回答は null を返す
export function accuracyOf(stats, category) {
  const s = stats[category];
  if (!s || s.total === 0) return null;
  return s.correct / s.total;
}

// 苦手分野優先モード: 正解率が低いカテゴリほど高い確率で選ばれる
// 未回答カテゴリは正解率50%扱いで適度に混ぜる
export function pickWeakCategory(stats) {
  const weights = CATEGORIES.map((c) => {
    const acc = accuracyOf(stats, c);
    const effective = acc === null ? 0.5 : acc;
    return { category: c, weight: Math.max(0.05, 1.05 - effective) };
  });
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.category;
  }
  return weights[weights.length - 1].category;
}

// --- 出題済み問題の記録(重複出題を避けるためプロンプトに渡す) ---
// recent = { [category]: string[] } 直近の問題文(最大20件)

export function getRecentQuestions(category) {
  const recent = read(KEYS.recent, {});
  return recent[category] ?? [];
}

export function addRecentQuestion(category, questionText) {
  const recent = read(KEYS.recent, {});
  const list = recent[category] ?? [];
  list.push(questionText);
  recent[category] = list.slice(-20);
  write(KEYS.recent, recent);
}

// --- ブックマーク ---
// AI生成問題も保存できるよう、問題オブジェクトを丸ごと保存する。
// 内蔵問題は id、AI生成問題は問題文で同一判定する。

function sameQuestion(a, b) {
  if (a.id && b.id) return a.id === b.id;
  return a.question === b.question;
}

export function getBookmarks() {
  return read(KEYS.bookmarks, []);
}

export function isBookmarked(question) {
  return getBookmarks().some((b) => sameQuestion(b, question));
}

// 登録/解除をトグルし、登録後の状態(true=登録済み)を返す
export function toggleBookmark(question) {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex((b) => sameQuestion(b, question));
  if (index >= 0) {
    bookmarks.splice(index, 1);
    write(KEYS.bookmarks, bookmarks);
    return false;
  }
  bookmarks.push(question);
  write(KEYS.bookmarks, bookmarks);
  return true;
}

export function removeBookmark(question) {
  write(
    KEYS.bookmarks,
    getBookmarks().filter((b) => !sameQuestion(b, question))
  );
}

// --- 間違えた問題の復習リスト(間隔反復) ---
// item = { question, stage, due: "YYYY-MM-DD", wrongCount }
// 正解するたびに次回が 1→3→7→14日後 と延び、全段階クリアで卒業(リストから削除)。
// 間違えると最初の段階に戻る。

const REVIEW_INTERVALS = [1, 3, 7, 14];

export function getReviewItems() {
  return read(KEYS.review, []);
}

export function getDueReviewItems() {
  const today = todayKey();
  return getReviewItems().filter((item) => item.due <= today);
}

// 不正解だった問題を復習リストに登録する(登録済みなら段階をリセット)
export function addToReview(question) {
  const items = getReviewItems();
  const existing = items.find((item) => sameQuestion(item.question, question));
  if (existing) {
    existing.stage = 0;
    existing.due = todayKey();
    existing.wrongCount += 1;
  } else {
    items.push({ question, stage: 0, due: todayKey(), wrongCount: 1 });
  }
  write(KEYS.review, items);
}

// 復習での解答結果を反映する。卒業した場合は true を返す
export function recordReviewResult(question, isCorrect) {
  const items = getReviewItems();
  const index = items.findIndex((item) =>
    sameQuestion(item.question, question)
  );
  if (index < 0) return false;
  const item = items[index];
  if (isCorrect) {
    if (item.stage >= REVIEW_INTERVALS.length) {
      items.splice(index, 1); // 卒業
      write(KEYS.review, items);
      return true;
    }
    const d = new Date();
    d.setDate(d.getDate() + REVIEW_INTERVALS[item.stage]);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    item.due = `${d.getFullYear()}-${m}-${day}`;
    item.stage += 1;
  } else {
    item.stage = 0;
    item.due = todayKey();
    item.wrongCount += 1;
  }
  write(KEYS.review, items);
  return false;
}

export function removeReviewItem(question) {
  write(
    KEYS.review,
    getReviewItems().filter((item) => !sameQuestion(item.question, question))
  );
}

// --- フラッシュカードの習得状況 ---
// known = { [term]: true }

export function getKnownTerms() {
  return read(KEYS.flashcards, {});
}

export function setTermKnown(term, known) {
  const map = getKnownTerms();
  if (known) map[term] = true;
  else delete map[term];
  write(KEYS.flashcards, map);
}

export function resetKnownTerms() {
  write(KEYS.flashcards, {});
}

// --- 学習データのエクスポート/インポート ---
// APIキー(providers)は安全のため含めない

const EXPORT_KEYS = [
  KEYS.stats,
  KEYS.history,
  KEYS.bookmarks,
  KEYS.recent,
  KEYS.bankUsed,
  KEYS.bankFirst,
  KEYS.review,
  KEYS.flashcards,
];

export function exportData() {
  const data = {};
  for (const key of EXPORT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw);
  }
  return {
    app: "gkentei-quiz",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// 成功時は true。形式不正なら例外を投げる
export function importData(parsed) {
  if (parsed?.app !== "gkentei-quiz" || !parsed.data) {
    throw new Error("このアプリのエクスポートファイルではありません");
  }
  for (const key of EXPORT_KEYS) {
    if (key in parsed.data) write(key, parsed.data[key]);
  }
  return true;
}

// --- テーマ(ライト/ダーク) ---

export function getTheme() {
  return read(KEYS.theme, "light");
}

export function setTheme(theme) {
  write(KEYS.theme, theme === "dark" ? "dark" : "light");
}
