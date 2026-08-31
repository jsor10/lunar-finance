import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, setToken, clearToken, getToken } from "@/src/api/client";
import { Lang, LOCALES, translations } from "@/src/i18n";
import {
  buildTheme,
  Theme,
  Mode,
  Accent,
  CurrencyCode,
  CURRENCIES,
  formatMoney,
} from "@/src/theme/colors";

WebBrowser.maybeCompleteAuthSession();

const AUTH_BASE = "https://auth.emergentagent.com";

export type CustomCategory = {
  id: string;
  name: string;
  type: "expense" | "income";
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  created_at: string;
};

export type SalaryEntry = { month: string; salary: number }; // month: "YYYY-MM"

export type HiddenCategory = { name: string; type: "expense" | "income" };

export type Template = {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  category?: string;
};

export type Frequency = "none" | "weekly" | "monthly";

export type RecurringRule = {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  category: string;
  frequency: "weekly" | "monthly";
  next_due: string;
  active: boolean;
  created_at: string;
};

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  salary: number;
  theme: Mode;
  accent: Accent;
  currency: CurrencyCode;
  delete_lock_until: string | null;
  custom_categories: CustomCategory[];
  hidden_categories: HiddenCategory[];
  language: Lang;
  salary_history: SalaryEntry[];
};

export type Transaction = {
  id: string;
  type: "expense" | "income";
  amount: number;
  description: string;
  category?: string;
  created_at: string;
};

export type TransactionPayload = {
  type: "expense" | "income";
  amount: number;
  description: string;
  category?: string;
};

type Stats = {
  salary: number;
  totalExpenses: number;
  totalIncome: number;
  availableBalance: number;
  thisMonthExpenses: number;
  avgExpense: number;
};

type Ctx = {
  loading: boolean;
  authenticating: boolean;
  user: User | null;
  theme: Theme;
  currencySymbol: string;
  transactions: Transaction[];
  templates: Template[];
  goals: Goal[];
  stats: Stats;
  fmt: (n: number) => string;
  salaryFor: (year: number, month0: number) => number;
  t: (key: string) => string;
  lang: Lang;
  locale: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  processSessionId: (sid: string) => Promise<void>;
  setSalary: (v: number) => Promise<void>;
  addTransaction: (t: TransactionPayload) => Promise<void>;
  addRecurring: (t: TransactionPayload & { frequency: "weekly" | "monthly" }) => Promise<void>;
  updateTransaction: (id: string, t: TransactionPayload) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteMonth: (year: number, month: number) => Promise<void>;
  resetAllData: () => Promise<void>;
  addCategory: (name: string, type: "expense" | "income") => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  hideCategory: (name: string, type: "expense" | "income") => Promise<void>;
  addTemplate: (t: TransactionPayload) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  createGoal: (name: string, target: number) => Promise<void>;
  updateGoal: (id: string, name: string, target: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
  setLanguage: (l: Lang) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  setMode: (m: Mode) => Promise<void>;
  setAccent: (a: Accent) => Promise<void>;
  setCurrency: (c: CurrencyCode) => Promise<void>;
  setDeleteLock: (iso: string | null) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const theme = useMemo(
    () => buildTheme(user?.theme ?? "light", user?.accent ?? "navy"),
    [user?.theme, user?.accent],
  );

  const loadTransactions = useCallback(async () => {
    const [tx, tpl, gls] = await Promise.all([
      api<Transaction[]>("/transactions"),
      api<Template[]>("/templates"),
      api<Goal[]>("/goals"),
    ]);
    setTransactions(tx);
    setTemplates(tpl);
    setGoals(gls);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await api<User>("/auth/me");
      setUser(me);
      try { await api("/recurring/process", { method: "POST" }); } catch {}
      await loadTransactions();
    } catch (e) {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadTransactions]);

  const processSessionId = useCallback(
    async (sid: string) => {
      setAuthenticating(true);
      try {
        const res = await api<{ session_token: string; user: User }>("/auth/session", {
          method: "POST",
          body: { session_id: sid },
          auth: false,
        });
        await setToken(res.session_token);
        setUser(res.user);
        await loadTransactions();
      } finally {
        setAuthenticating(false);
      }
    },
    [loadTransactions],
  );

  const login = useCallback(async () => {
    setAuthenticating(true);
    try {
      if (Platform.OS === "web") {
        const redirectUrl = window.location.origin + "/";
        window.location.href = `${AUTH_BASE}/?redirect=${encodeURIComponent(redirectUrl)}`;
        return;
      }
      const redirectUrl = Linking.createURL("auth");
      const authUrl = `${AUTH_BASE}/?redirect=${encodeURIComponent(redirectUrl)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const sid =
          (parsed.queryParams?.session_id as string) ||
          extractHashParam(result.url, "session_id");
        if (sid) {
          await processSessionId(sid);
        }
      }
    } finally {
      setAuthenticating(false);
    }
  }, [processSessionId]);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    await clearToken();
    setUser(null);
    setTransactions([]);
    setTemplates([]);
    setGoals([]);
  }, []);

  const setSalary = useCallback(async (v: number) => {
    const u = await api<User>("/finance/salary", { method: "PUT", body: { salary: v } });
    setUser(u);
  }, []);

  const addTransaction = useCallback(async (t: any) => {
    const tx = await api<Transaction>("/transactions", { method: "POST", body: t });
    setTransactions((prev) => [tx, ...prev]);
  }, []);

  const addRecurring = useCallback(async (t: any) => {
    const res = await api<{ transaction: Transaction; recurring: RecurringRule }>(
      "/recurring",
      { method: "POST", body: t },
    );
    setTransactions((prev) => [res.transaction, ...prev]);
  }, []);

  const updateTransaction = useCallback(async (id: string, t: any) => {
    const tx = await api<Transaction>(`/transactions/${id}`, { method: "PUT", body: t });
    setTransactions((prev) => prev.map((x) => (x.id === id ? tx : x)));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await api(`/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const deleteMonth = useCallback(async (year: number, month: number) => {
    await api(`/transactions/month/${year}/${month}`, { method: "DELETE" });
    const prefix = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    setTransactions((prev) => prev.filter((x) => !x.created_at.startsWith(prefix)));
  }, []);

  const resetAllData = useCallback(async () => {
    await api("/transactions", { method: "DELETE" });
    const u = await api<User>("/finance/salary", { method: "PUT", body: { salary: 0 } });
    setUser(u);
    setTransactions([]);
  }, []);

  const addCategory = useCallback(async (name: string, type: "expense" | "income") => {
    const u = await api<User>("/categories", { method: "POST", body: { name, type } });
    setUser(u);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const u = await api<User>(`/categories/${id}`, { method: "DELETE" });
    setUser(u);
  }, []);

  const addTemplate = useCallback(async (t: TransactionPayload) => {
    const tpl = await api<Template>("/templates", { method: "POST", body: t });
    setTemplates((prev) => [...prev, tpl]);
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await api(`/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setGoalState = (g: Goal) =>
    setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)));

  const createGoal = useCallback(async (name: string, target: number) => {
    const g = await api<Goal>("/goals", { method: "POST", body: { name, target } });
    setGoals((prev) => [...prev, g]);
  }, []);

  const updateGoal = useCallback(async (id: string, name: string, target: number) => {
    const g = await api<Goal>(`/goals/${id}`, { method: "PUT", body: { name, target } });
    setGoalState(g);
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await api(`/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const contributeToGoal = useCallback(async (id: string, amount: number) => {
    const res = await api<{ goal: Goal; transaction: Transaction; user: User }>(
      `/goals/${id}/contribute`,
      { method: "POST", body: { amount } },
    );
    setGoalState(res.goal);
    setTransactions((prev) => [res.transaction, ...prev]);
    setUser(res.user);
  }, []);

  const hideCategory = useCallback(async (name: string, type: "expense" | "income") => {
    const u = await api<User>("/categories/hide", { method: "POST", body: { name, type } });
    setUser(u);
  }, []);

  const salaryFor = useCallback(
    (year: number, month0: number) => {
      const hist = user?.salary_history || [];
      if (!hist.length) return user?.salary || 0;
      const key = `${year}-${String(month0 + 1).padStart(2, "0")}`;
      let best: SalaryEntry | null = null;
      for (const h of hist) {
        if (h.month <= key) best = h; // history is sorted ascending
      }
      return best ? best.salary : hist[0].salary;
    },
    [user?.salary_history, user?.salary],
  );

  const updateName = useCallback(async (name: string) => {
    const u = await api<User>("/user/profile", { method: "PUT", body: { name } });
    setUser(u);
  }, []);

  const patchSettings = useCallback(async (patch: Partial<{ theme: Mode; accent: Accent; currency: CurrencyCode; language: Lang }>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    const u = await api<User>("/user/settings", { method: "PUT", body: patch });
    setUser(u);
  }, []);

  const setMode = useCallback((m: Mode) => patchSettings({ theme: m }), [patchSettings]);
  const setAccent = useCallback((a: Accent) => patchSettings({ accent: a }), [patchSettings]);
  const setCurrency = useCallback((c: CurrencyCode) => patchSettings({ currency: c }), [patchSettings]);
  const setLanguage = useCallback((l: Lang) => patchSettings({ language: l }), [patchSettings]);

  const setDeleteLock = useCallback(async (iso: string | null) => {
    const u = await api<User>("/user/delete-lock", { method: "PUT", body: { lock_until: iso } });
    setUser(u);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api("/user/account", { method: "DELETE" });
    await clearToken();
    setUser(null);
    setTransactions([]);
    setTemplates([]);
    setGoals([]);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Mobile cold-start deep link fallback
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", ({ url }) => {
      const parsed = Linking.parse(url);
      const sid =
        (parsed.queryParams?.session_id as string) || extractHashParam(url, "session_id");
      if (sid && !user) processSessionId(sid);
    });
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const sid =
        (parsed.queryParams?.session_id as string) || extractHashParam(url, "session_id");
      if (sid && !user) processSessionId(sid);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Web: parse session_id from URL on mount
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const hash = window.location.hash;
    const search = window.location.search;
    let sid: string | null = null;
    if (hash.includes("session_id=")) sid = extractHashParam(hash, "session_id");
    else if (search.includes("session_id=")) sid = new URLSearchParams(search).get("session_id");
    if (sid) {
      processSessionId(sid).finally(() => {
        window.history.replaceState(null, "", window.location.pathname);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo<Stats>(() => {
    const salary = user?.salary ?? 0;
    let totalExpenses = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let thisMonthExpenses = 0;
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    for (const t of transactions) {
      if (t.type === "expense") {
        totalExpenses += t.amount;
        expenseCount += 1;
        const d = new Date(t.created_at);
        if (d.getMonth() === cm && d.getFullYear() === cy) thisMonthExpenses += t.amount;
      } else {
        totalIncome += t.amount;
      }
    }
    return {
      salary,
      totalExpenses,
      totalIncome,
      availableBalance: salary + totalIncome - totalExpenses,
      thisMonthExpenses,
      avgExpense: expenseCount ? totalExpenses / expenseCount : 0,
    };
  }, [user?.salary, transactions]);

  const currency = user?.currency ?? "EUR";
  const currencySymbol = CURRENCIES[currency]?.symbol ?? "€";
  const fmt = useCallback((n: number) => formatMoney(n, currency), [currency]);

  const lang: Lang = user?.language ?? "en";
  const locale = LOCALES[lang];
  const t = useCallback(
    (key: string) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang],
  );

  const value: Ctx = {
    loading,
    authenticating,
    user,
    theme,
    currencySymbol,
    transactions,
    templates,
    goals,
    stats,
    fmt,
    salaryFor,
    t,
    lang,
    locale,
    login,
    logout,
    processSessionId,
    setSalary,
    addTransaction,
    addRecurring,
    updateTransaction,
    deleteTransaction,
    deleteMonth,
    resetAllData,
    addCategory,
    deleteCategory,
    hideCategory,
    addTemplate,
    deleteTemplate,
    createGoal,
    updateGoal,
    removeGoal,
    contributeToGoal,
    setLanguage,
    updateName,
    setMode,
    setAccent,
    setCurrency,
    setDeleteLock,
    deleteAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function extractHashParam(url: string, key: string): string | null {
  const idx = url.indexOf("#");
  if (idx === -1) return null;
  const frag = url.substring(idx + 1);
  const params = new URLSearchParams(frag);
  return params.get(key);
}
