import { useState } from "react";
import { getBookmarks, removeBookmark } from "../lib/storage.js";

export default function Bookmarks({ onRetry, onBack }) {
  const [bookmarks, setBookmarks] = useState(getBookmarks);

  const handleRemove = (q) => {
    if (!window.confirm("このブックマークを削除しますか？")) return;
    removeBookmark(q);
    setBookmarks(getBookmarks());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">🔖 ブックマーク</h2>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {bookmarks.length} 件
      </p>

      <div className="space-y-3">
        {bookmarks.map((q, i) => (
          <div
            key={q.id ?? `ai-${i}`}
            className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800"
          >
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {q.category}
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {q.difficulty}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {q.question}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onRetry(q)}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                解き直す
              </button>
              <button
                onClick={() => handleRemove(q)}
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-300"
              >
                削除
              </button>
            </div>
          </div>
        ))}
        {bookmarks.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
            ブックマークした問題はまだありません。
            <br />
            解説画面の「🔖 ブックマーク」から登録できます。
          </p>
        )}
      </div>
    </div>
  );
}
