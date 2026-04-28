import ar from "@/i18n/messages/ar";
import en from "@/i18n/messages/en";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

interface MessageTree {
  [key: string]: string | MessageTree;
}

const messages: Record<Locale, MessageTree> = {
  en: en as unknown as MessageTree,
  ar: ar as unknown as MessageTree,
};

function getByPath(tree: MessageTree, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, tree);
  return typeof value === "string" ? value : undefined;
}

export function getTranslator(locale: Locale) {
  const active = messages[locale] ?? messages[DEFAULT_LOCALE];
  return (key: string) => getByPath(active, key) ?? getByPath(messages[DEFAULT_LOCALE], key) ?? key;
}
