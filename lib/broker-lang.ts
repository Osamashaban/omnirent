// The viewer's language for broker screens, from the same cookie as Ops.
import { getLang } from "./lang";
import { BROKER_DICTS } from "./broker-i18n";

export async function getBrokerDict() {
  const lang = await getLang();
  return { lang, b: BROKER_DICTS[lang] };
}
