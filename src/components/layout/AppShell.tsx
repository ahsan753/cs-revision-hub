import {
  BookOpen,
  Flame,
  Gauge,
  Home,
  LogIn,
  ShieldCheck,
  Settings,
  Trophy,
  UserCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { CelebrationLayer } from "../feedback/CelebrationLayer";
import { Onboarding } from "../feedback/Onboarding";
import { XpFloatProvider } from "../feedback/XpFloatProvider";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useProgressStore } from "../../store/progressStore";
import { getRankForLevel } from "../../store/rankSystem";
import { RankEmblem } from "../ui/RankEmblem";
import { chooseDisplayProgress } from "./displayProgress";

const baseNavItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/progress", label: "Progress", icon: Gauge },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

const teacherNavItems = [
  { to: "/teacher", label: "Teacher", icon: ShieldCheck },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { xp, level, streak } = useProgressStore();
  const { user, profile, rankedProgress } = useAuth();
  const settings = useProgressStore((state) => state.settings);
  const reducedMotion = useReducedMotion();
  const [pulseStreak, setPulseStreak] = useState(false);
  const displayedProgress = chooseDisplayProgress({
    local: { xp, level, streak },
    ranked: rankedProgress,
  });
  const displayedXp = displayedProgress.xp;
  const displayedLevel = displayedProgress.level;
  const displayedStreak = displayedProgress.streak;
  const rank = getRankForLevel(displayedLevel);
  const isTeacher = profile?.role === "teacher";
  const navItems = isTeacher ? teacherNavItems : baseNavItems;
  const logoTarget = isTeacher ? "/teacher" : "/";
  const mobileColumns = isTeacher ? "grid-cols-3" : "grid-cols-4";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.reducedMotion,
    );
  }, [settings.darkMode, settings.reducedMotion]);

  useEffect(() => {
    const pulse = () => {
      setPulseStreak(true);
      window.setTimeout(() => setPulseStreak(false), 900);
    };
    window.addEventListener("csrh:streak-pulse", pulse);
    return () => window.removeEventListener("csrh:streak-pulse", pulse);
  }, []);

  return (
    <XpFloatProvider>
      <div className="min-h-screen pb-20 text-ink md:pb-0">
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
            <NavLink to={logoTarget} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white">
                <BookOpen size={21} />
              </span>
              <span className="text-xl font-extrabold tracking-normal">
                CS Revision Hub
              </span>
            </NavLink>

            <nav
              className="hidden items-center gap-1 md:flex"
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                      isActive
                        ? "bg-indigo-50 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3 text-sm font-bold">
              {isTeacher ? (
                <span className="hidden items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-primary sm:inline-flex">
                  <ShieldCheck size={18} />
                  Teacher
                </span>
              ) : (
                <>
                  <span
                    className="hidden items-center gap-1 sm:inline-flex"
                    data-xp-counter
                  >
                    <Trophy className="text-amber-500" size={18} /> XP{" "}
                    {displayedXp}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-ink">
                    <RankEmblem rank={rank} size="xs" />
                    <span className="whitespace-nowrap">
                      Level {displayedLevel}
                    </span>
                    <span className="hidden max-w-[9rem] truncate text-muted lg:inline">
                      {rank.name}
                    </span>
                  </span>
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <motion.span
                      animate={
                        pulseStreak && !reducedMotion
                          ? { scale: [1, 1.24, 1], rotate: [0, -7, 5, 0] }
                          : { scale: 1, rotate: 0 }
                      }
                      transition={{ duration: 0.65 }}
                      className="inline-flex"
                    >
                      <Flame className="text-orange-500" size={18} />
                    </motion.span>{" "}
                    {displayedStreak} day streak
                  </span>
                </>
              )}
              <NavLink
                to={user ? "/account" : "/login"}
                className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-primary"
                aria-label={user ? "Account" : "Sign in"}
                title={profile?.display_name ?? user?.email ?? "Sign in"}
              >
                {user ? <UserCircle size={20} /> : <LogIn size={20} />}
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>

        <nav
          className={`fixed inset-x-0 bottom-0 z-30 grid ${mobileColumns} border-t border-line bg-white md:hidden`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
                  isActive ? "text-primary" : "text-slate-500"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <CelebrationLayer />
        <Onboarding />
      </div>
    </XpFloatProvider>
  );
}
