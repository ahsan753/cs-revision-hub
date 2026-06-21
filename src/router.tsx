import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RequireAuth, RequireTeacher } from "./auth/authGuard";
import { FlashcardsPage } from "./activities/Flashcards/FlashcardsPage";
import { CodeLabPage } from "./activities/CodeLab/CodeLabPage";
import { ConversionTrainerPage } from "./activities/ConversionTrainer/ConversionTrainerPage";
import { MatchGamePage } from "./activities/MatchGame/MatchGamePage";
import { MemoryGamePage } from "./activities/MemoryGame/MemoryGamePage";
import { QuizPage } from "./activities/Quiz/QuizPage";
import { SmartSessionPage } from "./activities/SmartSession/SmartSessionPage";
import { HomePage } from "./pages/HomePage";
import { AccountPage } from "./pages/AccountPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LoginPage, SignupPage } from "./pages/LoginPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubtopicPage } from "./pages/SubtopicPage";
import { TeacherClassPage, TeacherPage } from "./pages/TeacherPage";
import { UnitPage } from "./pages/UnitPage";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "unit/:unitId", element: <UnitPage /> },
        { path: "unit/:unitId/:subtopicId", element: <SubtopicPage /> },
        { path: "play/flashcards/:scope", element: <FlashcardsPage /> },
        { path: "play/match/:scope", element: <MatchGamePage /> },
        { path: "play/memory/:scope", element: <MemoryGamePage /> },
        { path: "play/session", element: <SmartSessionPage /> },
        { path: "play/quiz/:scope", element: <QuizPage /> },
        { path: "play/code/:scope", element: <CodeLabPage /> },
        { path: "play/convert", element: <ConversionTrainerPage /> },
        { path: "progress", element: <ProgressPage /> },
        {
          path: "leaderboard",
          element: (
            <RequireAuth>
              <LeaderboardPage />
            </RequireAuth>
          ),
        },
        { path: "login", element: <LoginPage /> },
        { path: "signup", element: <SignupPage /> },
        {
          path: "account",
          element: (
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          ),
        },
        {
          path: "teacher",
          element: (
            <RequireTeacher>
              <TeacherPage />
            </RequireTeacher>
          ),
        },
        {
          path: "teacher/classes/:classId",
          element: (
            <RequireTeacher>
              <TeacherClassPage />
            </RequireTeacher>
          ),
        },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ],
  {
    basename,
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
