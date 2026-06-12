import { useMemo, useState } from "react";
import { CATEGORIES, getKnownTerms, setTermKnown, resetKnownTerms } from "../lib/storage.js";
import { GLOSSARY } from "../data/glossary.js";

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards({ onBack }) {
  const [phase, setPhase] = useState("setup"); // setup | session | done
  const [category, setCategory] = useState("すべて");
  const [unknownOnly, setUnknownOnly] = useState(true);
  const [known, setKnown] = useState(getKnownTerms);
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionResult, setSessionResult] = useState({ known: 0, unknown: 0 });

  const knownCount = Object.keys(known).length;

  const candidates = useMemo(() => {
    return GLOSSARY.filter((g) => {
      if (category !== "すべて" && g.category !== category) return false;
      if (unknownOnly && known[g.term]) return false;
      return true;
    });
  }, [category, unknownOnly, known]);

  const handleStart = () => {
    setDeck(shuffle(candidates));
    setIndex(0);
    setFlipped(false);
    setSessionResult({ known: 0, unknown: 0 });
    setPhase("session");
  };

  const handleMark = (isKnown) => {
    const term = deck[index].term;
    setTermKnown(term, isKnown);
    setKnown(getKnownTerms());
    setSessionResult((r) => ({
      known: r.known + (isKnown ? 1 : 0),
      unknown: r.unknown + (isKnown ? 0 : 1),
    }));
    if (index + 1 >= deck.length) {
      setPhase("done");
    } else {
      setIndex(index + 1);
      setFlipped(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("フラッシュカードの習得状況をリセットしますか？")) {
      resetKnownTerms();
      setKnown({});
    }
  };

  // --- 設定画面 ---
  if (phase === "setup") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🃏 フラッシュカード</h2>
          <button
            onClick={onBack}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            ホームへ
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          用語集{GLOSSARY.length}語をカードで暗記。表(用語)を見て意味を思い浮かべ、
          めくって「覚えた / まだ」で仕分けます。習得済み: {knownCount} / {GLOSSARY.length}語
        </p>

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

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unknownOnly}
            onChange={(e) => setUnknownOnly(e.target.checked)}
            className="h-5 w-5 accent-blue-600"
          />
          <span className="text-slate-700 dark:text-slate-200">
            未習得の用語だけ出題する
          </span>
        </label>

        <button
          onClick={handleStart}
          disabled={candidates.length === 0}
          className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98] disabled:opacity-40"
        >
          {candidates.length > 0
            ? `${candidates.length}枚ではじめる`
            : "出題できるカードがありません 🎉"}
        </button>

        {knownCount > 0 && (
          <button
            onClick={handleReset}
            className="w-full rounded-xl py-2 text-sm text-red-500 underline-offset-2 hover:underline"
          >
            習得状況をリセット
          </button>
        )}
      </div>
    );
  }

  // --- カード画面 ---
  if (phase === "session") {
    const card = deck[index];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            {index + 1} / {deck.length}枚
          </span>
          <button
            onClick={() => setPhase("setup")}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            中断する
          </button>
        </div>

        <button
          onClick={() => setFlipped(true)}
          disabled={flipped}
          className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl bg-white p-6 shadow transition active:scale-[0.99] dark:bg-slate-800"
        >
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {card.category}
          </span>
          <span className="mt-3 text-center text-xl font-bold">{card.term}</span>
          {flipped ? (
            <span className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {card.definition}
            </span>
          ) : (
            <span className="mt-6 text-xs text-slate-400 dark:text-slate-500">
              タップして意味を表示
            </span>
          )}
        </button>

        {flipped && (
          <div className="flex gap-3">
            <button
              onClick={() => handleMark(false)}
              className="flex-1 rounded-2xl bg-orange-500 py-4 font-bold text-white shadow transition active:scale-[0.98]"
            >
              まだ 🤔
            </button>
            <button
              onClick={() => handleMark(true)}
              className="flex-1 rounded-2xl bg-green-600 py-4 font-bold text-white shadow transition active:scale-[0.98]"
            >
              覚えた ✅
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- 結果画面 ---
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-blue-600 p-6 text-center text-white shadow">
        <div className="text-sm">フラッシュカード完了！</div>
        <div className="mt-2 flex items-center justify-center gap-8">
          <div>
            <div className="text-3xl font-bold">{sessionResult.known}</div>
            <div className="text-xs text-blue-100">覚えた</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{sessionResult.unknown}</div>
            <div className="text-xs text-blue-100">まだ</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-100">
          習得済み {Object.keys(known).length} / {GLOSSARY.length}語
        </div>
      </div>
      <button
        onClick={() => setPhase("setup")}
        className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow transition active:scale-[0.98]"
      >
        もう一度
      </button>
      <button
        onClick={onBack}
        className="w-full rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:scale-[0.98] dark:bg-slate-700 dark:text-slate-200"
      >
        ホームへ
      </button>
    </div>
  );
}
