import { Cookie, CookieJar } from 'tough-cookie';
import setCookie from 'set-cookie-parser';
import type { Headers as HeadersPolyfill } from 'headers-polyfill';

/**
 * Updates a cookie jar with the Set-Cookie headers from the provided Headers instance.
 * @param cookieJar The cookie jar to update.
 * @param headers The response headers to populate the cookie jar with.
 */
export async function updateCookieJar(
  cookieJar: CookieJar,
  headers: Headers | HeadersPolyfill,
) {
  // Try to use getSetCookie() if available (proper way to get all set-cookie headers)
  let setCookieHeaders: string[] = [];

  if (typeof headers.getSetCookie === 'function') {
    setCookieHeaders = headers.getSetCookie();
  } else {
    // Fallback: get the single set-cookie header
    const setCookieHeader = headers.get('set-cookie');
    if (setCookieHeader) {
      // Split combined set-cookie headers
      setCookieHeaders = setCookie.splitCookiesString(setCookieHeader);
    }
  }

  if (setCookieHeaders.length > 0) {
    for (const cookieStr of setCookieHeaders) {
      const cookie = Cookie.parse(cookieStr);
      if (!cookie) {
        continue;
      }

      // Skip cookies that are being explicitly deleted (Max-Age=0 or expired)
      // This prevents twitter from clearing important cookies like ct0
      if (
        cookie.maxAge === 0 ||
        (cookie.expires && cookie.expires < new Date())
      ) {
        continue;
      }

      try {
        const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${
          cookie.path
        }`;
        await cookieJar.setCookie(cookie, url);
      } catch (err) {
        // Cookie setting errors are silently ignored
      }
    }
  } else if (typeof document !== 'undefined') {
    for (const cookie of document.cookie.split(';')) {
      const hardCookie = Cookie.parse(cookie);
      if (hardCookie) {
        await cookieJar.setCookie(hardCookie, document.location.toString());
      }
    }
  }
}
