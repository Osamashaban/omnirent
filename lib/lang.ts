// Reads the viewer's language on the server.
import { cookies } from "next/headers";
import { DICTS, LANG_COOKIE, langFrom, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  return langFrom((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: DICTS[lang], dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const) };
}
