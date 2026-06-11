import { useState } from "react";
import { CATEGORIES, DIFFICULTIES, accuracyOf } from "../lib/storage.js";

export default function Home({ stats, onStart }) {
  const [difficulty, setDifficulty] = useState("標準");

  // 苦手分野(正解率60%未満)を表示用に抽出
  const weakCategories = CATEGORIES.filter((c) => {
    const acc = accuracyOf(stats, c);
    return acc !== null && acc < 0.6;
  });

  return (
    <div className="space-y-6">
      {/* 難易度選択 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">難易度</h2>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border-2 py-2.5 text-sm font-medium transition ${
                difficulty === d
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
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

      {/* カテゴリ選択 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">
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
                className="rounded-2xl bg-white p-4 text-left shadow transition hover:shadow-md active:scale-[0.98]"
              >
                <div className="font-semibold">{c}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {acc === null
                    ? "未学習"
                    : `正解率 ${Math.round(acc * 100)}%`}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
