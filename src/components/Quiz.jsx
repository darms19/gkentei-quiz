import { useEffect } from "react";

const CHOICE_LABELS = ["A", "B", "C", "D"];

export default function Quiz({ question, loading, error, onAnswer, onRetry, onBack }) {
  // PCでの学習用: 数字キー1〜4、またはA〜Dキーで選択肢を回答できるようにする
  useEffect(() => {
    if (!question) return;
    const count = question.choices.length;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const num = Number(e.key);
      const letter = "abcd".indexOf(e.key.toLowerCase());
      if (num >= 1 && num <= count) onAnswer(num - 1);
      else if (letter >= 0 && letter < count) onAnswer(letter);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [question, onAnswer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-slate-600 dark:text-slate-300">問題を準備しています…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-800">
        <p className="font-semibold text-red-600 dark:text-red-400">エラー</p>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{error}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white transition active:scale-[0.98]"
          >
            再試行
          </button>
          <button
            onClick={onBack}
            className="flex-1 rounded-xl bg-slate-200 py-3 font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
          >
            ホームへ
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← 中断してホームへ
      </button>

      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {question.category}
        </span>
        <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {question.difficulty}
        </span>
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            question.source === "bank"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
          }`}
        >
          {question.source === "bank" ? "内蔵問題" : "AI生成"}
        </span>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <p className="leading-relaxed">{question.question}</p>
      </div>

      <div className="space-y-3">
        {question.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow transition hover:bg-blue-50 active:scale-[0.98] dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {CHOICE_LABELS[i]}
            </span>
            <span className="pt-0.5 text-sm leading-relaxed">{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
