import { CATEGORIES, accuracyOf, resetStats } from "../lib/storage.js";

function barColor(acc) {
  if (acc >= 0.8) return "bg-green-500";
  if (acc >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

export default function Dashboard({ stats, onStatsChange, onHome }) {
  const totalAnswered = CATEGORIES.reduce(
    (sum, c) => sum + (stats[c]?.total ?? 0),
    0
  );
  const totalCorrect = CATEGORIES.reduce(
    (sum, c) => sum + (stats[c]?.correct ?? 0),
    0
  );

  // 正解率の低い順(未回答は最後)
  const sorted = [...CATEGORIES].sort((a, b) => {
    const accA = accuracyOf(stats, a);
    const accB = accuracyOf(stats, b);
    if (accA === null && accB === null) return 0;
    if (accA === null) return 1;
    if (accB === null) return -1;
    return accA - accB;
  });

  const handleReset = () => {
    if (window.confirm("成績データをすべてリセットしますか？")) {
      resetStats();
      onStatsChange({});
    }
  };

  return (
    <div className="space-y-6">
      {/* 総合成績 */}
      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="font-bold">📊 総合成績</h2>
        <div className="mt-3 flex items-end gap-6">
          <div>
            <div className="text-3xl font-bold text-blue-700">
              {totalAnswered === 0
                ? "—"
                : `${Math.round((totalCorrect / totalAnswered) * 100)}%`}
            </div>
            <div className="text-xs text-slate-500">全体正解率</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-700">
              {totalAnswered}
            </div>
            <div className="text-xs text-slate-500">回答数</div>
          </div>
        </div>
      </div>

      {/* カテゴリ別正解率グラフ */}
      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 font-bold">カテゴリ別正解率(低い順)</h2>
        <div className="space-y-4">
          {sorted.map((c) => {
            const acc = accuracyOf(stats, c);
            const s = stats[c];
            return (
              <div key={c}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{c}</span>
                  <span className="text-xs text-slate-500">
                    {acc === null
                      ? "未学習"
                      : `${Math.round(acc * 100)}% (${s.correct}/${s.total})`}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  {acc !== null && (
                    <div
                      className={`h-full rounded-full transition-all ${barColor(acc)}`}
                      style={{ width: `${Math.max(acc * 100, 2)}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> 80%以上
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-500" /> 60〜79%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> 60%未満
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onHome}
          className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98]"
        >
          学習をはじめる
        </button>
        <button
          onClick={handleReset}
          className="w-full rounded-xl py-2 text-sm text-red-500 underline-offset-2 hover:underline"
        >
          成績データをリセット
        </button>
      </div>
    </div>
  );
}
