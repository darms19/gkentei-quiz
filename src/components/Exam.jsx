import { useEffect, useMemo, useState } from "react";
import { EXAM_PRESETS, buildExamQuestions } from "../lib/exam.js";
import { CATEGORIES, recordAnswer, getStats } from "../lib/storage.js";

const CHOICE_LABELS = ["A", "B", "C", "D"];
const PASS_LINE = 0.7; // 合格ラインは非公開のため一般に言われる70%を目安とする

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function accColor(acc) {
  if (acc >= 0.8) return "bg-green-500";
  if (acc >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

// 結果画面の1問ぶんの振り返り(タップで解説を開閉)
function ReviewItem({ question, index, answer }) {
  const [open, setOpen] = useState(false);
  const mark =
    answer === null ? "−" : answer === question.answerIndex ? "○" : "×";
  const markClass =
    answer === null
      ? "text-slate-400"
      : answer === question.answerIndex
        ? "text-green-600 dark:text-green-400"
        : "text-red-500";

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <span className={`w-5 shrink-0 font-bold ${markClass}`}>{mark}</span>
        <span className="flex-1 text-xs leading-relaxed">
          <span className="mr-1 text-slate-400">Q{index + 1}.</span>
          {question.question}
        </span>
        <span className="shrink-0 text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3">
          {question.choices.map((choice, i) => {
            const isAnswer = i === question.answerIndex;
            const isSelected = i === answer;
            return (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${
                  isAnswer
                    ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                    : isSelected
                      ? "border-red-400 bg-red-50 dark:bg-red-900/30"
                      : "border-transparent"
                }`}
              >
                <span className="font-bold">{CHOICE_LABELS[i]}</span>
                <span className="leading-relaxed">{choice}</span>
              </div>
            );
          })}
          <p className="rounded-lg bg-white p-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Exam({ onRunningChange, onStatsChange, onHome }) {
  const [phase, setPhase] = useState("setup"); // setup | running | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // null | 0-3
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [preset, setPreset] = useState(null);

  // 受験中かどうかを親に伝える(ナビゲーション時の中断確認用)
  useEffect(() => {
    onRunningChange?.(phase === "running");
    return () => onRunningChange?.(false);
  }, [phase, onRunningChange]);

  // タイマー
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // 時間切れで自動採点
  useEffect(() => {
    if (phase === "running" && remaining === 0) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const handleStart = (p) => {
    setPreset(p);
    setQuestions(buildExamQuestions(p.total));
    setAnswers(Array(p.total).fill(null));
    setCurrent(0);
    setRemaining(p.minutes * 60);
    setPhase("running");
  };

  const handleSelect = (choiceIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      // 同じ選択肢をもう一度タップすると解除
      next[current] = next[current] === choiceIndex ? null : choiceIndex;
      return next;
    });
  };

  function handleSubmit() {
    // 解答済みの問題のみ通常の成績・履歴に記録する(未回答は記録しない)
    questions.forEach((q, i) => {
      if (answers[i] !== null) {
        recordAnswer(q.category, q.difficulty, answers[i] === q.answerIndex);
      }
    });
    onStatsChange?.(getStats());
    setPhase("result");
  }

  const confirmSubmit = () => {
    const unanswered = answers.filter((a) => a === null).length;
    const message =
      unanswered > 0
        ? `未回答が${unanswered}問あります(未回答は不正解として採点)。採点しますか？`
        : "採点しますか？";
    if (window.confirm(message)) handleSubmit();
  };

  const result = useMemo(() => {
    if (phase !== "result") return null;
    let correct = 0;
    const byCategory = {};
    questions.forEach((q, i) => {
      const isCorrect = answers[i] === q.answerIndex;
      if (isCorrect) correct += 1;
      const c = (byCategory[q.category] ??= { correct: 0, total: 0 });
      c.total += 1;
      if (isCorrect) c.correct += 1;
    });
    return { correct, acc: correct / questions.length, byCategory };
  }, [phase, questions, answers]);

  // --- 設定画面 ---
  if (phase === "setup") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">📝 模擬試験</h2>
          <button
            onClick={onHome}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            ホームへ
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          内蔵問題から全カテゴリ均等に出題します。解答中は正誤が表示されず、
          終了後にまとめて採点されます。前の問題に戻って解答を変更できます。
        </p>
        <div className="space-y-3">
          {EXAM_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleStart(p)}
              className="w-full rounded-2xl bg-white p-5 text-left shadow transition hover:shadow-md active:scale-[0.98] dark:bg-slate-800"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold">{p.label}</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {p.total}問 / {p.minutes}分
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- 受験画面 ---
  if (phase === "running") {
    const q = questions[current];
    const answeredCount = answers.filter((a) => a !== null).length;
    return (
      <div className="space-y-4">
        {/* タイマーと進捗 */}
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow dark:bg-slate-800">
          <span
            className={`text-xl font-bold tabular-nums ${
              remaining <= 60 ? "text-red-500" : ""
            }`}
          >
            ⏱ {formatTime(remaining)}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {current + 1} / {questions.length}問(解答済 {answeredCount})
          </span>
        </div>

        {/* 問題 */}
        <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center gap-2 text-[10px]">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {q.category}
            </span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {q.difficulty}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{q.question}</p>
        </div>

        {/* 選択肢 */}
        <div className="space-y-2">
          {q.choices.map((choice, i) => {
            const selected = answers[current] === i;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left shadow-sm transition active:scale-[0.99] ${
                  selected
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/40"
                    : "border-transparent bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {CHOICE_LABELS[i]}
                </span>
                <span className="pt-0.5 text-sm leading-relaxed">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* 前後ナビゲーション */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex-1 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] disabled:opacity-40 dark:bg-slate-700 dark:text-slate-200"
          >
            ← 前へ
          </button>
          <button
            onClick={() =>
              setCurrent((c) => Math.min(questions.length - 1, c + 1))
            }
            disabled={current === questions.length - 1}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            次へ →
          </button>
        </div>

        {/* 問題パレット */}
        <div className="rounded-2xl bg-white p-4 shadow dark:bg-slate-800">
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`aspect-square rounded text-[10px] font-semibold transition ${
                  i === current
                    ? "ring-2 ring-blue-600 " +
                      (answers[i] !== null
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700")
                    : answers[i] !== null
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={confirmSubmit}
          className="w-full rounded-2xl bg-green-600 py-4 font-bold text-white shadow transition active:scale-[0.98]"
        >
          採点する
        </button>
      </div>
    );
  }

  // --- 結果画面 ---
  const passed = result.acc >= PASS_LINE;
  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl p-6 text-center text-white shadow ${
          passed ? "bg-green-600" : "bg-slate-600"
        }`}
      >
        <div className="text-sm">{preset.label}の結果</div>
        <div className="mt-1 text-5xl font-bold">
          {Math.round(result.acc * 100)}%
        </div>
        <div className="mt-1 text-sm">
          {result.correct} / {questions.length} 問正解
        </div>
        <div className="mt-3 text-sm font-semibold">
          {passed
            ? "🎉 合格圏内です(目安70%)"
            : "もう少し！合格の目安は70%です"}
        </div>
      </div>

      {/* カテゴリ別内訳 */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h3 className="mb-4 font-bold">カテゴリ別の内訳</h3>
        <div className="space-y-3">
          {CATEGORIES.filter((c) => result.byCategory[c]).map((c) => {
            const s = result.byCategory[c];
            const acc = s.correct / s.total;
            return (
              <div key={c}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{c}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {s.correct}/{s.total}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full ${accColor(acc)}`}
                    style={{ width: `${Math.max(acc * 100, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 全問の振り返り */}
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-slate-800">
        <h3 className="mb-3 font-bold">振り返り(タップで解説)</h3>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <ReviewItem key={i} question={q} index={i} answer={answers[i]} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setPhase("setup")}
          className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98]"
        >
          もう一度挑戦する
        </button>
        <button
          onClick={onHome}
          className="w-full rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
        >
          ホームへ
        </button>
      </div>
    </div>
  );
}
