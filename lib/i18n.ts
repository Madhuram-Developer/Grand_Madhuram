import en from "@/dictionaries/en.json";
import hi from "@/dictionaries/hi.json";

export const langs = ["en", "hi"] as const;
export type Lang = (typeof langs)[number];
export type L = { en: string; hi?: string | null };
export type Dict = typeof en;

export const hasLang = (v: string): v is Lang => (langs as readonly string[]).includes(v);

/** Admin-entered bilingual text → string, falls back to en. */
export const t = (v: L | null | undefined, lang: Lang) => (lang === "hi" && v?.hi) || v?.en || "";

// ponytail: both dicts are tiny, static import beats lazy loading
const dicts: Record<Lang, Dict> = { en, hi };
export const getDictionary = (lang: Lang) => dicts[lang];
