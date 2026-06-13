import { useEffect, useRef, useState } from "react";
import {
  PROVIDERS,
  getSelectedProvider,
  setSelectedProvider,
  getProviderConfigs,
  setProviderConfig,
  isBankFirst,
  setBankFirst,
  exportData,
  importData,
} from "../lib/storage.js";
import { totalStockCount, clearStock, STOCK_TARGET } from "../lib/aiStock.js";
import { loadQuestionBank } from "../data/questionBank.js";

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
  const [dataMessage, setDataMessage] = useState(null);
  const [stockCount, setStockCount] = useState(totalStockCount);
  // 内蔵問題は動的importで読み込むため、件数は非同期で取得する
  const [bankSize, setBankSize] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadQuestionBank().then((bank) => {
      if (active) setBankSize(bank.length);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleClearStock = () => {
    if (window.confirm("AI生成問題のストックを削除しますか？")) {
      clearStock();
      setStockCount(0);
    }
  };

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

  const handleExport = () => {
    const json = JSON.stringify(exportData(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gkentei-data-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMessage({ type: "ok", text: "学習データをダウンロードしました。" });
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを再選択できるようにする
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (
        !window.confirm(
          "現在の学習データ(成績・履歴・ブックマーク)をファイルの内容で上書きします。よろしいですか？"
        )
      ) {
        return;
      }
      importData(parsed);
      setDataMessage({
        type: "ok",
        text: "学習データを読み込みました。画面を再読み込みして反映します…",
      });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setDataMessage({
        type: "error",
        text: `読み込みに失敗しました: ${err.message}`,
      });
    }
  };

  // 内蔵問題のみで使う場合はAPIキーなしでも保存できる
  const canSave = bankFirst || current.apiKey.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 出題ソース */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="font-bold">📦 出題ソース</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={bankFirst}
            onChange={(e) => setBankFirstState(e.target.checked)}
            className="mt-1 h-5 w-5 accent-blue-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              内蔵問題を優先して出題(APIクレジット節約)
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              アプリに収録済みの{bankSize ?? 658}問から先に出題し、
              使い切ったらAIで生成します。APIキーなしでも内蔵問題だけで学習できます。
            </span>
          </span>
        </label>
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              AI生成問題のストック
            </span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
              {stockCount}問
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            AI出題を使うと、待ち時間をなくすためカテゴリ×難易度ごとに
            {STOCK_TARGET}問まで裏で先に生成してストックします。
            ストックからの出題は即時に表示されます。
          </p>
          {stockCount > 0 && (
            <button
              type="button"
              onClick={handleClearStock}
              className="mt-2 text-xs text-red-500 underline-offset-2 hover:underline"
            >
              ストックを削除
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="font-bold">⚙️ AI設定</h2>

        {/* プロバイダ選択 */}
        <div className="mt-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {def.label} APIキー
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={current.apiKey}
              onChange={(e) => updateCurrent({ apiKey: e.target.value })}
              placeholder={def.keyPlaceholder}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 rounded-xl bg-slate-200 px-3 text-sm dark:bg-slate-700 dark:text-slate-200"
              type="button"
            >
              {showKey ? "隠す" : "表示"}
            </button>
          </div>
          <a
            href={def.keyUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            APIキーの取得はこちら →
          </a>
        </label>

        {/* 選択中プロバイダのモデル */}
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">モデル</span>
          <input
            type="text"
            value={current.model}
            onChange={(e) => updateCurrent({ model: e.target.value })}
            placeholder={def.defaultModel}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            既定: {def.defaultModel}
            {provider === "claude" &&
              current.model === "claude-sonnet-4-20250514" &&
              "(このモデルは2026年6月15日に廃止されます。claude-sonnet-4-6 などへ変更してください)"}
          </span>
        </label>

        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          ⚠️ APIキーはこの端末のブラウザ(localStorage)にのみ保存されます。
          共有端末では使用後にキーを削除してください。本構成はフロントエンドから
          APIを直接呼び出すため、個人学習用途を想定しています。
        </div>
      </div>

      {/* データ管理 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="font-bold">💾 データ管理</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          成績・解答履歴・ブックマークをJSONファイルとして保存し、別の端末やブラウザに引き継げます。
          APIキーはファイルに含まれません。
        </p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
          >
            エクスポート
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
          >
            インポート
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        {dataMessage && (
          <p
            className={`mt-3 text-xs ${
              dataMessage.type === "ok"
                ? "text-green-600 dark:text-green-400"
                : "text-red-500"
            }`}
          >
            {dataMessage.text}
          </p>
        )}
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
