# twitter-scraper

[![Documentation badge](https://img.shields.io/badge/docs-here-informational)](https://the-convocation.github.io/twitter-scraper/)

A port of [n0madic/twitter-scraper](https://github.com/n0madic/twitter-scraper)
to Node.js.

> Twitter's API is annoying to work with, and has lots of limitations — luckily
> their frontend (JavaScript) has it's own API, which I reverse-engineered. No
> API rate limits. No tokens needed. No restrictions. Extremely fast.
>
> You can use this library to get the text of any user's Tweets trivially.

Known limitations:

- Search operations require logging in with a real user account via
  `scraper.login()`.
- Twitter's frontend API does in fact have rate limits
  ([#11](https://github.com/the-convocation/twitter-scraper/issues/11))

## Installation

This package requires Node.js v16.0.0 or greater.

NPM:

```sh
npm install @the-convocation/twitter-scraper
```

Yarn:

```sh
yarn add @the-convocation/twitter-scraper
```

TypeScript types have been bundled with the distribution.

## Usage

Most use cases are exactly the same as in
[n0madic/twitter-scraper](https://github.com/n0madic/twitter-scraper). Channel
iterators have been translated into
[AsyncGenerator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator)
instances, and can be consumed with the corresponding
`for await (const x of y) { ... }` syntax.

### Quick Start Examples

#### Getting User Following and Followers

```ts
import { Scraper } from '@the-convocation/twitter-scraper';

const scraper = new Scraper();

// Login is required for following/followers endpoints
await scraper.login('username', 'password', 'email@example.com');

// Get user profile to obtain userId
const profile = await scraper.getProfile('elonmusk');
const userId = profile.userId!;

// Get users that someone follows (following)
const following = scraper.getFollowing(userId, 50);
for await (const user of following) {
  console.log(`@${user.username} - ${user.name}`);
}

// Get someone's followers
const followers = scraper.getFollowers(userId, 50);
for await (const user of followers) {
  console.log(`@${user.username} - ${user.name}`);
}

// Using pagination for more control
let cursor: string | undefined;
const response = await scraper.fetchProfileFollowing(userId, 20, cursor);
console.log(response.profiles);  // Array of profiles
cursor = response.next;          // Next page cursor
```

See [USAGE_GUIDE.md](./USAGE_GUIDE.md) for comprehensive examples and [CHEATSHEET.md](./CHEATSHEET.md) for quick API reference.

### Browser usage

This package directly invokes the Twitter API, which does not have permissive
CORS headers. With the default settings, requests will fail unless you disable
CORS checks, which is not advised. Instead, applications must provide a CORS
proxy and configure it in the `Scraper` options.

Proxies (and other request mutations) can be configured with the request
interceptor transform:

```ts
const scraper = new Scraper({
  transform: {
    request(input: RequestInfo | URL, init?: RequestInit) {
      // The arguments here are the same as the parameters to fetch(), and
      // are kept as-is for flexibility of both the library and applications.
      if (input instanceof URL) {
        const proxy = "https://corsproxy.io/?" +
          encodeURIComponent(input.toString());
        return [proxy, init];
      } else if (typeof input === "string") {
        const proxy = "https://corsproxy.io/?" + encodeURIComponent(input);
        return [proxy, init];
      } else {
        // Omitting handling for example
        throw new Error("Unexpected request input type");
      }
    },
  },
});
```

[corsproxy.io](https://corsproxy.io) is a public CORS proxy that works correctly
with this package.

The public CORS proxy [corsproxy.org](https://corsproxy.org) _does not work_ at
the time of writing (at least not using their recommended integration on the
front page).

#### Next.js 13.x example:

```tsx
"use client";

import { Scraper, Tweet } from "@the-convocation/twitter-scraper";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const scraper = useMemo(
    () =>
      new Scraper({
        transform: {
          request(input: RequestInfo | URL, init?: RequestInit) {
            if (input instanceof URL) {
              const proxy = "https://corsproxy.io/?" +
                encodeURIComponent(input.toString());
              return [proxy, init];
            } else if (typeof input === "string") {
              const proxy = "https://corsproxy.io/?" +
                encodeURIComponent(input);
              return [proxy, init];
            } else {
              throw new Error("Unexpected request input type");
            }
          },
        },
      }),
    [],
  );
  const [tweet, setTweet] = useState<Tweet | null>(null);

  useEffect(() => {
    async function getTweet() {
      const latestTweet = await scraper.getLatestTweet("twitter");
      if (latestTweet) {
        setTweet(latestTweet);
      }
    }

    getTweet();
  }, [scraper]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {tweet?.text}
    </main>
  );
}
```

### Edge runtimes

This package currently uses
[`cross-fetch`](https://www.npmjs.com/package/cross-fetch) as a portable
`fetch`. Edge runtimes such as CloudFlare Workers sometimes have `fetch`
functions that behave differently from the web standard, so you may need to
override the `fetch` function the scraper uses. If so, a custom `fetch` can be
provided in the options:

```ts
const scraper = new Scraper({
  fetch: fetch,
});
```

Note that this does not change the arguments passed to the function, or the
expected return type. If the custom `fetch` function produces runtime errors
related to incorrect types, be sure to wrap it in a shim (not currently
supported directly by interceptors):

```ts
const scraper = new Scraper({
  fetch: (input, init) => {
    // Transform input and init into your function's expected types...
    return fetch(input, init)
      .then((res) => {
        // Transform res into a web-compliant response...
        return res;
      });
  },
});
```

### Bypassing Cloudflare bot detection

In some cases, Twitter's authentication endpoints may be protected by Cloudflare's advanced bot detection, resulting in `403 Forbidden` errors during login. This typically happens because standard Node.js TLS fingerprints are detected as non-browser clients.

To bypass this protection, you can use the optional CycleTLS `fetch` integration to mimic Chrome browser TLS fingerprints:

**Installation:**

```sh
npm install cycletls
# or
yarn add cycletls
```

**Usage:**

```ts
import { Scraper } from '@the-convocation/twitter-scraper';
import { cycleTLSFetch, cycleTLSExit } from '@the-convocation/twitter-scraper/cycletls';

const scraper = new Scraper({
  fetch: cycleTLSFetch,
});

// Use the scraper normally
await scraper.login(username, password, email);

// Important: cleanup CycleTLS resources when done
cycleTLSExit();
```

**Note:** The `/cycletls` entrypoint is Node.js only and will not work in browser environments. It's provided as a separate optional entrypoint to avoid bundling binaries in environments where they cannot run.

See the [cycletls example](./examples/cycletls/) for a complete working example.

### Rate limiting
The Twitter API heavily rate-limits clients, requiring that the scraper has its own
rate-limit handling to behave predictably when rate-limiting occurs. By default, the
scraper uses a rate-limiting strategy that waits for the current rate-limiting period
to expire before resuming requests.

**This has been known to take a very long time, in some cases (up to 13 minutes).**

You may want to change how rate-limiting events are handled, potentially by pooling
scrapers logged-in to different accounts (refer to [#116](https://github.com/the-convocation/twitter-scraper/pull/116) for how to do this yourself). The rate-limit handling strategy can be configured by passing a custom
implementation to the `rateLimitStrategy` option in the scraper constructor:

```ts
import { Scraper, RateLimitStrategy } from "@the-convocation/twitter-scraper";

class CustomRateLimitStrategy implements RateLimitStrategy {
  async onRateLimit(event: RateLimitEvent): Promise<void> {
    // your own logic...
  }
}

const scraper = new Scraper({
  rateLimitStrategy: new CustomRateLimitStrategy(),
});
```

More information on this interface can be found on the [`RateLimitStrategy`](https://the-convocation.github.io/twitter-scraper/interfaces/RateLimitStrategy.html)
page in the documentation. The library provides two pre-written implementations to choose from:
- `WaitingRateLimitStrategy`: The default, which waits for the limit to expire.
- `ErrorRateLimitStrategy`: A strategy that throws if any rate-limit event occurs.

## Contributing

### Setup

This project currently requires Node 18.x for development and uses Yarn for
package management.
[Corepack](https://nodejs.org/dist/latest-v18.x/docs/api/corepack.html) is
configured for this project, so you don't need to install a particular package
manager version manually.

> The project supports Node 16.x at runtime, but requires Node 18.x to run its
> build tools.

Just run `corepack enable` to turn on the shims, then run `yarn` to install the
dependencies.

#### Basic scripts

- `yarn build`: Builds the project into the `dist` folder
- `yarn test`: Runs the package tests (see [Testing](#testing) first)

Run `yarn help` for general `yarn` usage information.

### Testing

This package includes unit tests for all major functionality. Given the speed at
which Twitter's private API changes, failing tests are to be expected.

```sh
yarn test
```

Before running tests, you should configure environment variables for
authentication.

```
TWITTER_USERNAME=    # Account username
TWITTER_PASSWORD=    # Account password
TWITTER_EMAIL=       # Account email
TWITTER_COOKIES=     # JSON-serialized array of cookies of an authenticated session
PROXY_URL=           # HTTP(s) proxy for requests (optional)
```

### Commit message format

We use [Conventional Commits](https://www.conventionalcommits.org), and enforce
this with precommit checks. Please refer to the Git history for real examples of
the commit message format.

## API Reference

### Following & Followers

- `scraper.getFollowing(userId, maxProfiles)` - Get users that someone follows
- `scraper.getFollowers(userId, maxProfiles)` - Get someone's followers  
- `scraper.fetchProfileFollowing(userId, maxProfiles, cursor?)` - Paginated following
- `scraper.fetchProfileFollowers(userId, maxProfiles, cursor?)` - Paginated followers

### Tweets

- `scraper.getTweets(username, maxTweets)` - Get user tweets
- `scraper.getTweetsByUserId(userId, maxTweets)` - Get tweets by user ID
- `scraper.getTweetsAndReplies(username, maxTweets)` - Get tweets and replies
- `scraper.getTweet(tweetId)` - Get single tweet
- `scraper.getLikedTweets(username, maxTweets)` - Get liked tweets (login required)

### Tweet Actions

- `scraper.sendTweet(text, replyToTweetId?, mediaData?)` - Send tweet
- `scraper.sendQuoteTweet(text, quotedTweetId, mediaData?)` - Quote tweet
- `scraper.retweet(tweetId)` / `scraper.unretweet(tweetId)` - Retweet actions
- `scraper.likeTweet(tweetId)` / `scraper.unlikeTweet(tweetId)` - Like actions

### Search

- `scraper.searchTweets(query, maxTweets, searchMode)` - Search tweets
- `scraper.searchProfiles(query, maxProfiles)` - Search profiles

### User Profiles

- `scraper.getProfile(username)` - Get user profile
- `scraper.getProfileByUserId(userId)` - Get profile by ID

For complete documentation, see:
- [Usage Guide](./USAGE_GUIDE.md) - Detailed examples and patterns
- [Cheat Sheet](./CHEATSHEET.md) - Quick API reference
- [API Docs](https://the-convocation.github.io/twitter-scraper/) - Full TypeScript documentation
