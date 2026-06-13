import { useState, useEffect, useCallback } from "react";
import Home from "./components/Home.jsx";
import Quiz from "./components/Quiz.jsx";
import Explanation from "./components/Explanation.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Settings from "./components/Settings.jsx";
import Glossary from "./components/Glossary.jsx";
import Bookmarks from "./components/Bookmarks.jsx";
import Exam from "./components/Exam.jsx";
import Review from "./components/Review.jsx";
import Flashcards from "./components/Flashcards.jsx";
import CribSheet from "./components/CribSheet.jsx";
import { generateQuestion } from "./lib/api.js";
import { pickBankQuestion, resetBankForCategory } from "./lib/bank.js";
import { takeFromStock, refillStock } from "./lib/aiStock.js";
import { shuffleChoices } from "./lib/shuffleChoices.js";
import {
  getActiveConfig,
  getStats,
  recordAnswer,
  pickWeakCategory,
  getRecentQuestions,
  addRecentQuestion,
  isBankFirst,
  getTheme,
  setTheme,
  addToReview,
  recordReviewResult,
  getDueReviewItems,
} from "./lib/storage.js";

// 画面: home | quiz | explanation | dashboard | settings | glossary | bookmarks | exam | review | flashcards
export default function App() {
  const [screen, setScreen] = useState("home");
  const [stats, setStats] = useState(getStats);
  const [session, setSession] = useState(null); // { mode, category, difficulty }
  const [question, setQuestion] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setThemeState] = useState(getTheme);
  const [examRunning, setExamRunning] = useState(false);

  // 模擬試験の受験中に画面を離れる場合は確認する
  const navigate = useCallback(
    (next) => {
      if (
        examRunning &&
        !window.confirm("模擬試験を中断しますか？進捗は失われます。")
      ) {
        return;
      }
      setScreen(next);
    },
    [examRunning]
  );

  // 初回起動時にAPIキー未設定でも内蔵問題で使えるため、設定画面への強制遷移は
  // 「内蔵問題優先がOFFかつキー未設定」のときのみ行う
  useEffect(() => {
    if (!getActiveConfig().apiKey && !isBankFirst()) setScreen("settings");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

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
      // 問題データは動的importで読み込むため、その間はローディングを表示する
      setLoading(true);

      // 1. 内蔵問題バンクから出題(APIクレジット消費なし)
      if (isBankFirst()) {
        let q = await pickBankQuestion(actualCategory, difficulty);
        // バンクを使い切っていてAPIキーもない場合は、出題記録をリセットして再利用
        if (!q && !apiKey) {
          await resetBankForCategory(actualCategory);
          q = await pickBankQuestion(actualCategory, difficulty);
        }
        if (q) {
          addRecentQuestion(actualCategory, q.question);
          setQuestion(q);
          setLoading(false);
          return;
        }
      }

      // 2. バンクにない(使い切った)場合はAIで出題
      if (!apiKey) {
        setError(
          "APIキーが未設定です。内蔵問題を使うには設定で「内蔵問題を優先」をONにするか、APIキーを設定してください。"
        );
        setLoading(false);
        return;
      }

      // 2a. 事前ストックがあれば待ち時間なしで出題し、減った分を裏で補充する
      const stocked = takeFromStock(actualCategory, difficulty);
      if (stocked) {
        addRecentQuestion(actualCategory, stocked.question);
        setQuestion(shuffleChoices(stocked));
        setLoading(false);
        refillStock({ provider, apiKey, model, category: actualCategory, difficulty });
        return;
      }

      // 2b. ストックが空ならその場で1問生成し、表示後に裏でストックを作る
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
        setQuestion(shuffleChoices(q));
        refillStock({ provider, apiKey, model, category: actualCategory, difficulty });
      } catch (e) {
        setError(e.message ?? "問題の生成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ブックマークした問題を解き直す(成績には通常どおり記録される)
  const startBookmarkQuestion = (q) => {
    setSession({ mode: "bookmark", category: q.category, difficulty: q.difficulty });
    setError(null);
    setQuestion(q);
    setSelectedIndex(null);
    setLoading(false);
    setScreen("quiz");
  };

  // 今日が期日の復習問題をランダムに1問選ぶ(なければ null)
  const pickDueReviewQuestion = () => {
    const due = getDueReviewItems();
    if (due.length === 0) return null;
    const item = due[Math.floor(Math.random() * due.length)];
    return shuffleChoices(item.question);
  };

  const startReviewSession = () => {
    const q = pickDueReviewQuestion();
    if (!q) return;
    setSession({ mode: "review", category: q.category, difficulty: q.difficulty });
    setError(null);
    setQuestion(q);
    setSelectedIndex(null);
    setLoading(false);
    setScreen("quiz");
  };

  const handleAnswer = (index) => {
    if (selectedIndex !== null || !question) return;
    setSelectedIndex(index);
    const isCorrect = index === question.answerIndex;
    setStats(recordAnswer(question.category, question.difficulty, isCorrect));
    if (session?.mode === "review") {
      // 復習中: 間隔反復の段階を進める/戻す
      recordReviewResult(question, isCorrect);
    } else if (!isCorrect) {
      // 通常出題・ブックマークで間違えたら復習リストへ自動登録
      addToReview(question);
    }
    setScreen("explanation");
  };

  const handleNext = () => {
    if (session?.mode === "bookmark") {
      setScreen("bookmarks");
      return;
    }
    if (session?.mode === "review") {
      const q = pickDueReviewQuestion();
      if (q) {
        setQuestion(q);
        setSelectedIndex(null);
        setScreen("quiz");
      } else {
        setScreen("review"); // 今日の復習が終わったら一覧へ
      }
      return;
    }
    if (session) loadQuestion(session);
  };

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 bg-slate-800 text-white shadow dark:bg-slate-900 print:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate("home")}
            className="text-lg font-bold tracking-wide"
          >
            G検定 問題集
          </button>
          <button
            onClick={toggleTheme}
            aria-label="テーマ切り替え"
            className="rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-700"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main
        className={`mx-auto px-4 py-6 pb-28 print:max-w-none print:px-0 print:py-0 ${
          screen === "cribsheet" ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        {screen === "home" && (
          <Home
            stats={stats}
            onStart={loadQuestion}
            onBookmarks={() => setScreen("bookmarks")}
            onExam={() => setScreen("exam")}
            onReview={() => setScreen("review")}
            onFlashcards={() => setScreen("flashcards")}
            onCribSheet={() => setScreen("cribsheet")}
          />
        )}
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
          <Glossary onBack={() => setScreen("home")} onStart={loadQuestion} />
        )}
        {screen === "bookmarks" && (
          <Bookmarks
            onRetry={startBookmarkQuestion}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "exam" && (
          <Exam
            onRunningChange={setExamRunning}
            onStatsChange={setStats}
            onHome={() => setScreen("home")}
          />
        )}
        {screen === "review" && (
          <Review
            onStart={startReviewSession}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "flashcards" && (
          <Flashcards onBack={() => setScreen("home")} />
        )}
        {screen === "cribsheet" && (
          <CribSheet stats={stats} onBack={() => setScreen("home")} />
        )}
      </main>

      {/* 下部タブバー: 主要画面へどこからでも片手で移動できる */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-xl">
          {[
            { key: "home", label: "ホーム", icon: "🏠" },
            { key: "dashboard", label: "成績", icon: "📊" },
            { key: "glossary", label: "用語集", icon: "📖" },
            { key: "settings", label: "設定", icon: "⚙️" },
          ].map((tab) => {
            const active = screen === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.key)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                  active
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
