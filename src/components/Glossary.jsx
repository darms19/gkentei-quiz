import { useMemo, useState } from "react";
import { CATEGORIES } from "../lib/storage.js";
import { GLOSSARY } from "../data/glossary.js";

export default function Glossary({ onBack, onStart }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((g) => {
      if (category !== "すべて" && g.category !== category) return false;
      if (!q) return true;
      return (
        g.term.toLowerCase().includes(q) ||
        g.definition.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📖 用語集</h2>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="用語を検索…"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />

      <div className="flex flex-wrap gap-2">
        {["すべて", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              category === c
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 shadow hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {filtered.length} / {GLOSSARY.length} 件
      </p>

      <div className="space-y-3">
        {filtered.map((g) => (
          <div key={g.term} className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{g.term}</h3>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {g.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {g.definition}
            </p>
            {onStart && (
              <button
                onClick={() =>
                  onStart({
                    mode: "category",
                    category: g.category,
                    difficulty: "標準",
                  })
                }
                className="mt-3 text-xs font-medium text-blue-600 underline-offset-2 transition hover:underline dark:text-blue-400"
              >
                この分野の問題を解く →
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
            該当する用語が見つかりませんでした。
          </p>
        )}
      </div>
    </div>
  );
}
