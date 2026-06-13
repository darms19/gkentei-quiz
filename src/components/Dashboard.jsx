import {
  CATEGORIES,
  DIFFICULTIES,
  accuracyOf,
  resetStats,
  getDailyLog,
  getStreak,
  getDifficultyStats,
} from "../lib/storage.js";

function barColor(acc) {
  if (acc >= 0.8) return "bg-green-500";
  if (acc >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

// 直近 n 日分の日付キー("YYYY-MM-DD")を古い順に返す
function lastDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${d.getFullYear()}-${m}-${day}`);
  }
  return days;
}

// 日別正解率の推移を折れ線で描く(解答のあった日のみプロット)
function TrendChart({ days, daily }) {
  const points = days
    .map((date) => ({ date, log: daily[date] }))
    .filter((p) => p.log && p.log.total > 0)
    .map((p) => ({ date: p.date, acc: p.log.correct / p.log.total }));

  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        2日以上学習すると推移グラフが表示されます。
      </p>
    );
  }

  const W = 280;
  const H = 90;
  const PAD = 14;
  const xOf = (i) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const yOf = (acc) => H - PAD - acc * (H - PAD * 2);
  const polyline = points
    .map((p, i) => `${xOf(i)},${yOf(p.acc)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* 50% / 100% の目安線 */}
      {[0.5, 1].map((acc) => (
        <line
          key={acc}
          x1={PAD}
          y1={yOf(acc)}
          x2={W - PAD}
          y2={yOf(acc)}
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      <polyline
        points={polyline}
        fill="none"
        className="stroke-blue-500"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={xOf(i)} cy={yOf(p.acc)} r="3" className="fill-blue-500" />
          <text
            x={xOf(i)}
            y={yOf(p.acc) - 6}
            textAnchor="middle"
            className="fill-slate-500 text-[8px] dark:fill-slate-400"
          >
            {Math.round(p.acc * 100)}
          </text>
        </g>
      ))}
      {/* 始点・終点の日付ラベル */}
      <text
        x={PAD}
        y={H - 2}
        textAnchor="start"
        className="fill-slate-400 text-[8px]"
      >
        {points[0].date.slice(5).replace("-", "/")}
      </text>
      <text
        x={W - PAD}
        y={H - 2}
        textAnchor="end"
        className="fill-slate-400 text-[8px]"
      >
        {points[points.length - 1].date.slice(5).replace("-", "/")}
      </text>
    </svg>
  );
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

  const daily = getDailyLog();
  const streak = getStreak();
  const diffStats = getDifficultyStats();
  const days = lastDays(14);
  const todayLog = daily[days[days.length - 1]];
  const maxDailyTotal = Math.max(1, ...days.map((d) => daily[d]?.total ?? 0));

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
    if (window.confirm("成績データ(解答履歴を含む)をすべてリセットしますか？")) {
      resetStats();
      onStatsChange({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📊 成績</h2>
        <button
          onClick={onHome}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>

      {/* 総合成績 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="font-bold">総合成績</h2>
        <div className="mt-3 flex items-end gap-6">
          <div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {totalAnswered === 0
                ? "—"
                : `${Math.round((totalCorrect / totalAnswered) * 100)}%`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">全体正解率</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">
              {totalAnswered}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">回答数</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {streak}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">連続学習日数</div>
          </div>
        </div>
      </div>

      {/* 学習記録(直近14日) */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="font-bold">📅 学習記録(直近14日)</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          今日の回答数: {todayLog?.total ?? 0}問
        </p>
        <div className="mt-3 flex h-24 gap-1">
          {days.map((date) => {
            const log = daily[date];
            const acc = log && log.total > 0 ? log.correct / log.total : null;
            const height =
              log && log.total > 0
                ? Math.max(8, (log.total / maxDailyTotal) * 100)
                : 0;
            return (
              <div key={date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  {height > 0 ? (
                    <div
                      className={`w-full rounded-t ${barColor(acc)}`}
                      style={{ height: `${height}%` }}
                      title={`${date}: ${log.correct}/${log.total}`}
                    />
                  ) : (
                    <div className="h-1 w-full rounded bg-slate-200 dark:bg-slate-700" />
                  )}
                </div>
                <span className="text-[8px] text-slate-400 dark:text-slate-500">
                  {date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 正解率の推移 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="mb-2 font-bold">📈 正解率の推移(日別)</h2>
        <TrendChart days={days} daily={daily} />
      </div>

      {/* 難易度別正解率 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="mb-4 font-bold">難易度別正解率</h2>
        <div className="space-y-4">
          {DIFFICULTIES.map((d) => {
            const s = diffStats[d];
            const acc = s && s.total > 0 ? s.correct / s.total : null;
            return (
              <div key={d}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{d}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {acc === null
                      ? "未学習"
                      : `${Math.round(acc * 100)}% (${s.correct}/${s.total})`}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
      </div>

      {/* カテゴリ別正解率グラフ */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h2 className="mb-4 font-bold">カテゴリ別正解率(低い順)</h2>
        <div className="space-y-4">
          {sorted.map((c) => {
            const acc = accuracyOf(stats, c);
            const s = stats[c];
            return (
              <div key={c}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{c}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {acc === null
                      ? "未学習"
                      : `${Math.round(acc * 100)}% (${s.correct}/${s.total})`}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
        <div className="mt-4 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
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
