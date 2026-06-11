import { useState } from "react";
import {
  PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
  getProviderConfigs,
  setProviderConfig,
  isBankFirst,
  setBankFirst,
} from "../lib/storage.js";
import { QUESTION_BANK } from "../data/questionBank.js";

export default function Settings({ onDone }) {
  const [provider, setProvider] = useState(getSelectedProvider);
  // 全プロバイダの編集中の設定をまとめて保持する
  const [configs, setConfigs] = useState(() => {
    const saved = getProviderConfigs();
    const initial = {};
    for (const id of Object.keys(PROVIDERS)) {
      initial[id] = {
        apiKey: saved[id]?.apiKey ?? "",
        model: saved[id]?.model ?? PROVIDERS[id].defaultModel,
      };
    }
    return initial;
  });
  const [showKey, setShowKey] = useState(false);
  const [bankFirst, setBankFirstState] = useState(isBankFirst);

  const current = configs[provider];
  const def = PROVIDERS[provider];

  const updateCurrent = (patch) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...patch },
    }));
  };

  const handleSave = () => {
    for (const id of Object.keys(PROVIDERS)) {
      setProviderConfig(id, configs[id]);
    }
    setSelectedProvider(provider);
    setBankFirst(bankFirst);
    onDone();
  };

  // 内蔵問題のみで使う場合はAPIキーなしでも保存できる
  const canSave = bankFirst || current.apiKey.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 出題ソース */}
      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="font-bold">📦 出題ソース</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={bankFirst}
            onChange={(e) => setBankFirstState(e.target.checked)}
            className="mt-1 h-5 w-5 accent-blue-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-700">
              内蔵問題を優先して出題(APIクレジット節約)
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              アプリに収録済みの{QUESTION_BANK.length}問(各カテゴリ9問)から先に出題し、
              使い切ったらAIで生成します。APIキーなしでも内蔵問題だけで学習できます。
            </span>
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="font-bold">⚙️ AI設定</h2>

        {/* プロバイダ選択 */}
        <div className="mt-4">
          <span className="text-sm font-medium text-slate-700">
            使用するAI
          </span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {Object.entries(PROVIDERS).map(([id, p]) => (
              <button
                key={id}
                type="button"
                onClick={() => setProvider(id)}
                className={`rounded-xl border-2 px-2 py-2.5 transition ${
                  provider === id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                }`}
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div
                  className={`text-[10px] ${
                    provider === id ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {p.company}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 選択中プロバイダのAPIキー */}
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">
            {def.label} APIキー
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={current.apiKey}
              onChange={(e) => updateCurrent({ apiKey: e.target.value })}
              placeholder={def.keyPlaceholder}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 rounded-xl bg-slate-200 px-3 text-sm"
              type="button"
            >
              {showKey ? "隠す" : "表示"}
            </button>
          </div>
          <a
            href={def.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 underline-offset-2 hover:underline"
          >
            APIキーの取得はこちら →
          </a>
        </label>

        {/* 選択中プロバイダのモデル */}
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">モデル</span>
          <input
            type="text"
            value={current.model}
            onChange={(e) => updateCurrent({ model: e.target.value })}
            placeholder={def.defaultModel}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <span className="mt-1 block text-xs text-slate-500">
            既定: {def.defaultModel}
            {provider === "claude" &&
              current.model === "claude-sonnet-4-20250514" &&
              "(2026年6月15日廃止予定。廃止後は claude-sonnet-4-6 などへの変更が必要です)"}
          </span>
        </label>

        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          ⚠️ APIキーはこの端末のブラウザ(localStorage)にのみ保存されます。
          共有端末では使用後にキーを削除してください。本構成はフロントエンドから
          APIを直接呼び出すため、個人学習用途を想定しています。
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98] disabled:opacity-40"
      >
        保存してはじめる
      </button>
    </div>
  );
}
