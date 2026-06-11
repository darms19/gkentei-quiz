// localStorage を使った永続化レイヤー

const KEYS = {
  provider: "gkentei.provider",
  providers: "gkentei.providers",
  stats: "gkentei.stats",
  recent: "gkentei.recentQuestions",
  bankUsed: "gkentei.bankUsed",
  bankFirst: "gkentei.bankFirst",
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
    defaultModel: "claude-sonnet-4-20250514",
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

export function recordAnswer(category, isCorrect) {
  const stats = getStats();
  const s = stats[category] ?? { correct: 0, total: 0 };
  stats[category] = {
    correct: s.correct + (isCorrect ? 1 : 0),
    total: s.total + 1,
  };
  write(KEYS.stats, stats);
  return stats;
}

export function resetStats() {
  write(KEYS.stats, {});
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
