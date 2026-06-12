import { useState, useEffect, useCallback } from "react";
import Home from "./components/Home.jsx";
import Quiz from "./components/Quiz.jsx";
import Explanation from "./components/Explanation.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Settings from "./components/Settings.jsx";
import Glossary from "./components/Glossary.jsx";
import { generateQuestion } from "./lib/api.js";
import { pickBankQuestion, resetBankForCategory } from "./lib/bank.js";
import {
  getActiveConfig,
  getStats,
  recordAnswer,
  pickWeakCategory,
  getRecentQuestions,
  addRecentQuestion,
  isBankFirst,
} from "./lib/storage.js";

// 画面: home | quiz | explanation | dashboard | settings | glossary
export default function App() {
  const [screen, setScreen] = useState("home");
  const [stats, setStats] = useState(getStats);
  const [session, setSession] = useState(null); // { mode, category, difficulty }
  const [question, setQuestion] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 初回起動時にAPIキー未設定でも内蔵問題で使えるため、設定画面への強制遷移は
  // 「内蔵問題優先がOFFかつキー未設定」のときのみ行う
  useEffect(() => {
    if (!getActiveConfig().apiKey && !isBankFirst()) setScreen("settings");
  }, []);

  const loadQuestion = useCallback(
    async ({ mode, category, difficulty }) => {
      const { provider, apiKey, model } = getActiveConfig();
      // 苦手分野優先モードでは毎問カテゴリを選び直す
      const actualCategory =
        mode === "weak" ? pickWeakCategory(getStats()) : category;

      setSession({ mode, category, difficulty });
      setError(null);
      setQuestion(null);
      setSelectedIndex(null);
      setScreen("quiz");

      // 1. 内蔵問題バンクから出題(APIクレジット消費なし)
      if (isBankFirst()) {
        let q = pickBankQuestion(actualCategory, difficulty);
        // バンクを使い切っていてAPIキーもない場合は、出題記録をリセットして再利用
        if (!q && !apiKey) {
          resetBankForCategory(actualCategory);
          q = pickBankQuestion(actualCategory, difficulty);
        }
        if (q) {
          addRecentQuestion(actualCategory, q.question);
          setQuestion(q);
          setLoading(false);
          return;
        }
      }

      // 2. バンクにない(使い切った)場合はAPIで生成
      if (!apiKey) {
        setError(
          "APIキーが未設定です。内蔵問題を使うには設定で「内蔵問題を優先」をONにするか、APIキーを設定してください。"
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = await generateQuestion({
          provider,
          apiKey,
          model,
          category: actualCategory,
          difficulty,
          recentQuestions: getRecentQuestions(actualCategory),
        });
        q.category = actualCategory;
        q.difficulty = difficulty;
        q.source = "ai";
        addRecentQuestion(actualCategory, q.question);
        setQuestion(q);
      } catch (e) {
        setError(e.message ?? "問題の生成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleAnswer = (index) => {
    if (selectedIndex !== null || !question) return;
    setSelectedIndex(index);
    const isCorrect = index === question.answerIndex;
    setStats(recordAnswer(question.category, isCorrect));
    setScreen("explanation");
  };

  const handleNext = () => {
    if (session) loadQuestion(session);
  };

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 bg-slate-800 text-white shadow">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setScreen("home")}
            className="text-lg font-bold tracking-wide"
          >
            G検定 問題集
          </button>
          <nav className="flex gap-2 text-sm">
            <button
              onClick={() => setScreen("glossary")}
              className={`rounded-lg px-3 py-1.5 transition ${
                screen === "glossary" ? "bg-slate-600" : "hover:bg-slate-700"
              }`}
            >
              用語集
            </button>
            <button
              onClick={() => setScreen("dashboard")}
              className={`rounded-lg px-3 py-1.5 transition ${
                screen === "dashboard" ? "bg-slate-600" : "hover:bg-slate-700"
              }`}
            >
              成績
            </button>
            <button
              onClick={() => setScreen("settings")}
              className={`rounded-lg px-3 py-1.5 transition ${
                screen === "settings" ? "bg-slate-600" : "hover:bg-slate-700"
              }`}
            >
              設定
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6 pb-12">
        {screen === "home" && <Home stats={stats} onStart={loadQuestion} />}
        {screen === "quiz" && (
          <Quiz
            question={question}
            loading={loading}
            error={error}
            onAnswer={handleAnswer}
            onRetry={handleNext}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "explanation" && question && (
          <Explanation
            question={question}
            selectedIndex={selectedIndex}
            onNext={handleNext}
            onHome={() => setScreen("home")}
            onDashboard={() => setScreen("dashboard")}
          />
        )}
        {screen === "dashboard" && (
          <Dashboard
            stats={stats}
            onStatsChange={setStats}
            onHome={() => setScreen("home")}
          />
        )}
        {screen === "settings" && (
          <Settings onDone={() => setScreen("home")} />
        )}
        {screen === "glossary" && (
          <Glossary onBack={() => setScreen("home")} />
        )}
      </main>
    </div>
  );
}
