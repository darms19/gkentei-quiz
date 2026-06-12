import { useState } from "react";
import {
  getReviewItems,
  getDueReviewItems,
  removeReviewItem,
} from "../lib/storage.js";

const TOTAL_STAGES = 5; // 4回の間隔(1/3/7/14日)+ 最終確認で卒業

export default function Review({ onStart, onBack }) {
  const [items, setItems] = useState(getReviewItems);
  const due = getDueReviewItems();

  const handleRemove = (q) => {
    removeReviewItem(q);
    setItems(getReviewItems());
  };

  // 次回日付の近い順に表示
  const sorted = [...items].sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🔁 復習モード</h2>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        間違えた問題は自動でここに登録されます。正解するたびに次回の出題が
        1日後 → 3日後 → 7日後 → 14日後と延びていき、すべてクリアすると卒業します。
        間違えると最初からやり直しです。
      </p>

      {/* 今日の復習 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {due.length}
              <span className="ml-1 text-base font-medium text-slate-500 dark:text-slate-400">
                問
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              今日の復習
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              {items.length}
              <span className="ml-1 text-base font-medium text-slate-500 dark:text-slate-400">
                問
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              復習リスト合計
            </div>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={due.length === 0}
          className="mt-4 w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98] disabled:opacity-40"
        >
          {due.length > 0 ? "今日の復習をはじめる" : "今日の復習はありません 🎉"}
        </button>
      </div>

      {/* 復習リスト */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            復習リスト
          </h3>
          {sorted.map((item, i) => (
            <div
              key={item.question.id ?? `ai-${i}`}
              className="rounded-xl bg-white p-3 shadow dark:bg-slate-800"
            >
              <div className="flex items-center gap-2 text-[10px]">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {item.question.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    item.due <= new Date().toISOString().slice(0, 10)
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  次回: {item.due.slice(5).replace("-", "/")}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  ステージ {Math.min(item.stage + 1, TOTAL_STAGES)}/{TOTAL_STAGES}
                </span>
                <button
                  onClick={() => handleRemove(item.question)}
                  className="ml-auto text-slate-400 hover:text-red-500"
                  aria-label="復習リストから削除"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {item.question.question}
              </p>
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          復習リストは空です。問題に間違えると自動で追加されます。
        </p>
      )}
    </div>
  );
}
