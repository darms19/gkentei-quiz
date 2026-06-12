import { useState } from "react";
import {
  CATEGORIES,
  DIFFICULTIES,
  accuracyOf,
  getBookmarks,
  getStreak,
  getDueReviewItems,
  getKnownTerms,
} from "../lib/storage.js";
import { GLOSSARY } from "../data/glossary.js";

export default function Home({
  stats,
  onStart,
  onBookmarks,
  onExam,
  onReview,
  onFlashcards,
}) {
  const [difficulty, setDifficulty] = useState("標準");
  const bookmarkCount = getBookmarks().length;
  const streak = getStreak();
  const dueCount = getDueReviewItems().length;
  const knownCount = Object.keys(getKnownTerms()).length;

  // 苦手分野(正解率60%未満)を表示用に抽出
  const weakCategories = CATEGORIES.filter((c) => {
    const acc = accuracyOf(stats, c);
    return acc !== null && acc < 0.6;
  });

  return (
    <div className="space-y-6">
      {/* 連続学習日数 */}
      {streak > 0 && (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow dark:bg-slate-800">
          🔥 連続学習 <span className="font-bold text-orange-600 dark:text-orange-400">{streak}日目</span>
        </div>
      )}

      {/* 難易度選択 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">難易度</h2>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                difficulty === d
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      {/* 苦手分野優先モード */}
      <section>
        <button
          onClick={() => onStart({ mode: "weak", category: null, difficulty })}
          className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4 text-left text-white shadow-lg transition active:scale-[0.98]"
        >
          <div className="text-lg font-bold">🔥 苦手分野優先モード</div>
          <div className="mt-1 text-sm text-orange-100">
            {weakCategories.length > 0
              ? `苦手: ${weakCategories.join("・")}`
              : "正解率の低い分野から優先的に出題します"}
          </div>
        </button>
      </section>

      {/* 模擬試験モード */}
      <section>
        <button
          onClick={onExam}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-left text-white shadow-lg transition active:scale-[0.98]"
        >
          <div className="text-lg font-bold">📝 模擬試験モード</div>
          <div className="mt-1 text-sm text-indigo-100">
            時間制限つきでまとめて解いて、本番形式で実力を測ります
          </div>
        </button>
      </section>

      {/* 復習モード */}
      <section>
        <button
          onClick={onReview}
          className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-4 text-left text-white shadow-lg transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">🔁 復習モード</div>
            {dueCount > 0 && (
              <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold">
                今日 {dueCount}問
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-teal-100">
            {dueCount > 0
              ? "間違えた問題の復習期日が来ています"
              : "間違えた問題を間隔反復で復習します"}
          </div>
        </button>
      </section>

      {/* カテゴリ選択 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          カテゴリを選んで出題
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((c) => {
            const acc = accuracyOf(stats, c);
            return (
              <button
                key={c}
                onClick={() =>
                  onStart({ mode: "category", category: c, difficulty })
                }
                className="rounded-2xl bg-white p-4 text-left shadow transition hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
              >
                <div className="font-semibold">{c}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {acc === null
                    ? "未学習"
                    : `正解率 ${Math.round(acc * 100)}%`}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ブックマーク・フラッシュカード */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={onBookmarks}
          className="rounded-2xl bg-white p-4 text-left shadow transition hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
        >
          <div className="font-semibold">🔖 ブックマーク</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {bookmarkCount > 0
              ? `${bookmarkCount}問を保存中`
              : "保存した問題を解き直す"}
          </div>
        </button>
        <button
          onClick={onFlashcards}
          className="rounded-2xl bg-white p-4 text-left shadow transition hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
        >
          <div className="font-semibold">🃏 フラッシュカード</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            用語 習得 {knownCount}/{GLOSSARY.length}
          </div>
        </button>
      </section>
    </div>
  );
}
