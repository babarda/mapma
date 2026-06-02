import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Loads the message catalog for the active request locale (server-side), so the
// browser only ever receives the strings for the language being viewed.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? requested
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
