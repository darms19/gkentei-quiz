import { useMemo, useState } from "react";
import { isBookmarked, toggleBookmark } from "../lib/storage.js";
import { GLOSSARY } from "../data/glossary.js";

const CHOICE_LABELS = ["A", "B", "C", "D"];
const MAX_RELATED_TERMS = 4;

// 用語の表記ゆれに対応するため、括弧で区切った各部分も照合対象にする
// 例: "過学習(オーバーフィッティング)" → ["過学習(オーバーフィッティング)", "過学習", "オーバーフィッティング"]
function termVariants(term) {
  const parts = term.split(/[()（）]/).map((s) => s.trim());
  return [term, ...parts].filter((s) => s.length >= 2);
}

function findRelatedTerms(question) {
  const text = [question.question, ...question.choices, question.explanation]
    .join("\n")
    .toLowerCase();
  return GLOSSARY.filter((g) =>
    termVariants(g.term).some((v) => text.includes(v.toLowerCase()))
  ).slice(0, MAX_RELATED_TERMS);
}

export default function Explanation({
  question,
  selectedIndex,
  onNext,
  onHome,
  onDashboard,
}) {
  const isCorrect = selectedIndex === question.answerIndex;
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(question));
  const relatedTerms = useMemo(() => findRelatedTerms(question), [question]);

  const handleBookmark = () => {
    setBookmarked(toggleBookmark(question));
  };

  return (
    <div className="space-y-4">
      {/* 正誤バナー */}
      <div
        className={`rounded-2xl p-5 text-center text-white shadow ${
          isCorrect ? "bg-green-600" : "bg-red-500"
        }`}
      >
        <div className="text-3xl font-bold">
          {isCorrect ? "⭕ 正解！" : "❌ 不正解"}
        </div>
        {!isCorrect && (
          <div className="mt-1 text-sm">
            正解は {CHOICE_LABELS[question.answerIndex]} です
          </div>
        )}
      </div>

      {/* 問題と選択肢の振り返り */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {question.question}
        </p>
        <div className="mt-4 space-y-2">
          {question.choices.map((choice, i) => {
            const isAnswer = i === question.answerIndex;
            const isSelected = i === selectedIndex;
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl border-2 p-3 text-sm ${
                  isAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                    : isSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-900/30"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/40"
                }`}
              >
                <span className="font-bold">{CHOICE_LABELS[i]}</span>
                <span className="leading-relaxed">{choice}</span>
                {isAnswer && <span className="ml-auto shrink-0">✅</span>}
                {!isAnswer && isSelected && (
                  <span className="ml-auto shrink-0">✖️</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 解説 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h3 className="mb-2 font-bold text-blue-700 dark:text-blue-400">
          📖 解説
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {question.explanation}
        </p>
      </div>

      {/* 関連用語(用語集から自動抽出) */}
      {relatedTerms.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
          <h3 className="mb-3 font-bold text-blue-700 dark:text-blue-400">
            🔗 関連用語
          </h3>
          <div className="space-y-3">
            {relatedTerms.map((g) => (
              <div key={g.term}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{g.term}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {g.category}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {g.definition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleBookmark}
          className={`w-full rounded-xl border-2 py-3 text-sm font-semibold transition active:scale-[0.98] ${
            bookmarked
              ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {bookmarked ? "🔖 ブックマーク済み(タップで解除)" : "🔖 ブックマークする"}
        </button>
        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white shadow transition active:scale-[0.98]"
        >
          次の問題へ →
        </button>
        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
          >
            ホームへ
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
          >
            成績を見る
          </button>
        </div>
      </div>
    </div>
  );
}
