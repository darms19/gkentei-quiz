import { useMemo, useState } from "react";
import {
  CATEGORIES,
  accuracyOf,
  getReviewItems,
  getBookmarks,
} from "../lib/storage.js";
import { GLOSSARY } from "../data/glossary.js";

// カテゴリごとの配色(Tailwindはリテラルのクラス名のみ検出するため、組み立てずに固定で持つ)
const CAT = {
  機械学習: {
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-400 dark:border-blue-500/70",
    on: "bg-blue-600 text-white border-blue-600",
  },
  深層学習: {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-400 dark:border-violet-500/70",
    on: "bg-violet-600 text-white border-violet-600",
  },
  数学基礎: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-400 dark:border-emerald-500/70",
    on: "bg-emerald-600 text-white border-emerald-600",
  },
  AIの歴史: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-400 dark:border-amber-500/70",
    on: "bg-amber-600 text-white border-amber-600",
  },
  法律: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-400 dark:border-rose-500/70",
    on: "bg-rose-600 text-white border-rose-600",
  },
  倫理: {
    dot: "bg-teal-500",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-400 dark:border-teal-500/70",
    on: "bg-teal-600 text-white border-teal-600",
  },
  ビジネス応用: {
    dot: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-400 dark:border-indigo-500/70",
    on: "bg-indigo-600 text-white border-indigo-600",
  },
};

// 間違えた問題・ブックマークを要点カードとして描画する
function PointCard({ q }) {
  const c = CAT[q.category] ?? CAT["機械学習"];
  return (
    <div
      className={`rounded-lg border-l-2 ${c.border} bg-slate-50 p-2.5 dark:bg-slate-800/60`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {q.category} · {q.difficulty}
        </span>
      </div>
      <p className="text-xs font-medium leading-snug text-slate-800 dark:text-slate-100">
        {q.question}
      </p>
      <p className="mt-1 text-xs leading-snug text-emerald-700 dark:text-emerald-400">
        <span className="font-bold">✓ </span>
        {q.choices[q.answerIndex]}
      </p>
      {q.explanation && (
        <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {q.explanation}
        </p>
      )}
    </div>
  );
}

export default function CribSheet({ stats, onBack }) {
  // 苦手カテゴリ(正解率60%未満)。なければ全カテゴリを初期選択にする
  const weak = useMemo(
    () =>
      CATEGORIES.filter((c) => {
        const a = accuracyOf(stats, c);
        return a !== null && a < 0.6;
      }),
    [stats]
  );
  const [selected, setSelected] = useState(
    () => new Set(weak.length > 0 ? weak : CATEGORIES)
  );
  const [query, setQuery] = useState("");
  const [show, setShow] = useState({
    terms: true,
    mistakes: true,
    bookmarks: true,
  });

  const q = query.trim().toLowerCase();
  const hit = (...texts) =>
    !q || texts.some((t) => (t ?? "").toLowerCase().includes(q));

  const toggleCat = (c) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  const terms = useMemo(
    () =>
      GLOSSARY.filter(
        (g) => selected.has(g.category) && hit(g.term, g.definition)
      ),
    [selected, q]
  );
  const mistakes = useMemo(
    () =>
      getReviewItems()
        .map((i) => i.question)
        .filter((qq) => selected.has(qq.category) && hit(qq.question, qq.explanation)),
    [selected, q]
  );
  const bookmarks = useMemo(
    () =>
      getBookmarks().filter(
        (qq) => selected.has(qq.category) && hit(qq.question, qq.explanation)
      ),
    [selected, q]
  );

  // 表示順はカテゴリ定義順にそろえる
  const shownCats = CATEGORIES.filter((c) => selected.has(c));
  const hasTerms = show.terms && terms.length > 0;
  const hasMistakes = show.mistakes && mistakes.length > 0;
  const hasBookmarks = show.bookmarks && bookmarks.length > 0;
  const empty = !hasTerms && !hasMistakes && !hasBookmarks;

  const sectionChips = [
    { key: "terms", label: `📚 用語 ${terms.length}` },
    { key: "mistakes", label: `❌ 間違えた ${mistakes.length}` },
    { key: "bookmarks", label: `🔖 ブックマーク ${bookmarks.length}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📝 カンペ(要点シート)</h2>
        <button
          onClick={onBack}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        苦手カテゴリの要点を1枚に集約しています。カテゴリ・表示項目を絞り込めます。
        ブラウザの検索(Ctrl+F / ⌘F)でも素早く探せます。
      </p>

      {/* コントロール */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="用語・問題を検索…"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />

        {/* カテゴリ選択 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((c) => {
            const active = selected.has(c);
            const style = CAT[c];
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? style.on
                    : "border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {c}
              </button>
            );
          })}
          <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
          <button
            onClick={() => setSelected(new Set(weak.length > 0 ? weak : CATEGORIES))}
            className="rounded-full px-2 py-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            苦手のみ
          </button>
          <button
            onClick={() => setSelected(new Set(CATEGORIES))}
            className="rounded-full px-2 py-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            全部
          </button>
        </div>

        {/* 表示する項目 */}
        <div className="flex flex-wrap gap-1.5">
          {sectionChips.map((s) => {
            const active = show[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setShow((p) => ({ ...p, [s.key]: !p[s.key] }))}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "border-slate-700 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-600"
                    : "border-slate-300 bg-white text-slate-400 line-through dark:border-slate-600 dark:bg-slate-800"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {empty && (
        <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
          表示する内容がありません。
          <br />
          カテゴリや表示項目の選択を見直してください。
        </p>
      )}

      {/* 用語(カテゴリ別・2カラム高密度) */}
      {hasTerms && (
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
          <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-700">
            <h3 className="text-base font-bold">📚 重要用語</h3>
            <span className="text-xs text-slate-400">{terms.length}語</span>
          </div>
          {shownCats.map((cat) => {
            const catTerms = terms.filter((t) => t.category === cat);
            if (catTerms.length === 0) return null;
            const c = CAT[cat];
            return (
              <div key={cat} className="mt-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${c.dot}`} />
                  <h4 className={`text-sm font-bold ${c.text}`}>{cat}</h4>
                  <span className="text-[11px] text-slate-400">
                    {catTerms.length}語
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
                  {catTerms.map((g) => (
                    <div
                      key={g.term}
                      className={`border-l-2 ${c.border} pl-2 leading-snug`}
                    >
                      <span className={`text-[13px] font-bold ${c.text}`}>
                        {g.term}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {g.definition}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 間違えた問題の要点 */}
      {hasMistakes && (
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
          <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-700">
            <h3 className="text-base font-bold">❌ 間違えた問題の要点</h3>
            <span className="text-xs text-slate-400">{mistakes.length}問</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {mistakes.map((qq, i) => (
              <PointCard key={qq.id ?? `m-${i}`} q={qq} />
            ))}
          </div>
        </section>
      )}

      {/* ブックマーク */}
      {hasBookmarks && (
        <section className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
          <div className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-700">
            <h3 className="text-base font-bold">🔖 ブックマーク</h3>
            <span className="text-xs text-slate-400">{bookmarks.length}問</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {bookmarks.map((qq, i) => (
              <PointCard key={qq.id ?? `b-${i}`} q={qq} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
