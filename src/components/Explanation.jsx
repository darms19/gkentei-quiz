const CHOICE_LABELS = ["A", "B", "C", "D"];

export default function Explanation({
  question,
  selectedIndex,
  onNext,
  onHome,
  onDashboard,
}) {
  const isCorrect = selectedIndex === question.answerIndex;

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
      <div className="rounded-2xl bg-white p-5 shadow">
        <p className="text-sm leading-relaxed text-slate-700">
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
                    ? "border-green-500 bg-green-50"
                    : isSelected
                      ? "border-red-400 bg-red-50"
                      : "border-transparent bg-slate-50"
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
      <div className="rounded-2xl bg-white p-5 shadow">
        <h3 className="mb-2 font-bold text-blue-700">📖 解説</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {question.explanation}
        </p>
      </div>

      {/* アクション */}
      <div className="space-y-3 pt-2">
        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white shadow transition active:scale-[0.98]"
        >
          次の問題へ →
        </button>
        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
          >
            ホームへ
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98]"
          >
            成績を見る
          </button>
        </div>
      </div>
    </div>
  );
}
