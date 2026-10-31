import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { isLocale, type Locale } from "./locales";

export { locales, type Locale } from "./locales";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("locale")?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
