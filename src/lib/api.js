// 各LLMプロバイダのAPIをブラウザから直接呼び出して問題を生成する

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function buildPrompt(category, difficulty, recentQuestions) {
  const avoid =
    recentQuestions.length > 0
      ? `\n\n以下は最近出題済みの問題です。これらと重複しない新しい問題を作成してください:\n${recentQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "";

  return `あなたはJDLA G検定(ジェネラリスト検定)の試験問題作成の専門家です。

以下の条件で、G検定の本試験と同等の品質の4択問題を1問作成してください。

- カテゴリ: ${category}
- 難易度: ${difficulty}
- 問題文は明確で、選択肢は紛らわしすぎず、正解が一意に定まること
- 解説は正解の理由に加え、他の選択肢がなぜ誤りかにも触れること
- 解説で選択肢に言及する場合は「選択肢A」〜「選択肢D」と表記すること(1番目=A、2番目=B、3番目=C、4番目=D)${avoid}

次のJSON形式のみで回答してください。JSON以外のテキスト(前置き・コードブロック記号など)は一切含めないでください。

{
  "question": "問題文",
  "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "answerIndex": 0,
  "explanation": "解説文"
}

answerIndex は正解の選択肢のインデックス(0〜3)です。正解の位置はランダムにしてください。`;
}

// モデルの応答からJSONを取り出す(コードフェンスが付いた場合にも対応)
function parseQuestionJson(text) {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("応答にJSONが見つかりません");
  const data = JSON.parse(cleaned.slice(start, end + 1));

  if (
    typeof data.question !== "string" ||
    !Array.isArray(data.choices) ||
    data.choices.length !== 4 ||
    !Number.isInteger(data.answerIndex) ||
    data.answerIndex < 0 ||
    data.answerIndex > 3 ||
    typeof data.explanation !== "string"
  ) {
    throw new Error("応答JSONの形式が不正です");
  }
  return data;
}

// HTTPエラーを共通の日本語メッセージに変換する
async function throwApiError(res, providerLabel) {
  let message = `${providerLabel} APIエラー (HTTP ${res.status})`;
  try {
    const err = await res.json();
    const detail =
      err?.error?.message ?? // Anthropic / OpenAI / Gemini 共通の形
      (typeof err?.error === "string" ? err.error : null);
    if (detail) message = detail;
  } catch {
    /* JSONでないエラー応答は無視 */
  }
  if (res.status === 401 || res.status === 403)
    message = `${providerLabel} のAPIキーが無効です。設定を確認してください。`;
  if (res.status === 404)
    message = `モデルが見つかりません。設定のモデル名を確認してください。`;
  if (res.status === 429)
    message = "リクエスト制限に達しました。少し待ってから再試行してください。";
  if (res.status >= 500)
    message = "APIが混雑しています。少し待ってから再試行してください。";
  throw new ApiError(message, res.status);
}

// --- Anthropic (Claude) ---

async function callClaude({ apiKey, model, prompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // ブラウザからの直接呼び出しに必要なヘッダー
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) await throwApiError(res, "Claude");
  const body = await res.json();
  return body.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// --- OpenAI ---

async function callOpenAI({ apiKey, model, prompt }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      // プロンプトで「JSON」と明示しているため json_object モードが使える
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) await throwApiError(res, "OpenAI");
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI の応答が空です");
  return text;
}

// --- Google Gemini ---

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) await throwApiError(res, "Gemini");
  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini の応答が空です");
  return text;
}

const CALLERS = {
  claude: callClaude,
  openai: callOpenAI,
  gemini: callGemini,
};

export async function generateQuestion({
  provider,
  apiKey,
  model,
  category,
  difficulty,
  recentQuestions,
}) {
  const call = CALLERS[provider];
  if (!call) throw new Error(`未対応のプロバイダです: ${provider}`);
  const prompt = buildPrompt(category, difficulty, recentQuestions);
  const text = await call({ apiKey, model, prompt });
  return parseQuestionJson(text);
}
