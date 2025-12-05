# Following and Followers Example

This example demonstrates how to retrieve lists of users that a specific Twitter user follows (following) and users that follow them (followers).

## Prerequisites

- Node.js v16.0.0 or higher
- Valid Twitter account credentials
- The account must be logged in to access following/followers data

## Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Set environment variables:
```bash
export TWITTER_USERNAME="your_username"
export TWITTER_PASSWORD="your_password"
export TWITTER_EMAIL="your_email@example.com"  # Optional, for email verification
```

## Running the Example

```bash
npx ts-node examples/following-followers/index.ts
```

## Features Demonstrated

### 1. Get Following (Users they follow)
```typescript
const scraper = new Scraper();
await scraper.login(username, password);

// Get users that target user follows
const followingGenerator = scraper.getFollowing(userId, maxProfiles);

for await (const user of followingGenerator) {
  console.log(`@${user.username} - ${user.name}`);
}
```

### 2. Get Followers (Users who follow them)
```typescript
// Get users that follow the target user
const followersGenerator = scraper.getFollowers(userId, maxProfiles);

for await (const user of followersGenerator) {
  console.log(`@${user.username} - ${user.name}`);
}
```

### 3. Using Pagination with Cursor
```typescript
// Manual pagination for more control
let cursor: string | undefined = undefined;

while (true) {
  const response = await scraper.fetchProfileFollowing(userId, pageSize, cursor);
  
  // Process profiles
  for (const user of response.profiles) {
    console.log(`@${user.username}`);
  }
  
  // Get next cursor
  cursor = response.next;
  if (!cursor) break;
}
```

### 4. Filtering Results
```typescript
// Filter by criteria (e.g., verified users)
const verifiedFollowing = followingList.filter(user => user.isBlueVerified);
```

## API Reference

### `scraper.getFollowing(userId, maxProfiles)`
Returns an `AsyncGenerator` of profiles that the specified user follows.

**Parameters:**
- `userId` (string): The ID of the user
- `maxProfiles` (number): Maximum number of profiles to retrieve

**Returns:** `AsyncGenerator<Profile, void>`

### `scraper.getFollowers(userId, maxProfiles)`
Returns an `AsyncGenerator` of profiles that follow the specified user.

**Parameters:**
- `userId` (string): The ID of the user
- `maxProfiles` (number): Maximum number of profiles to retrieve

**Returns:** `AsyncGenerator<Profile, void>`

### `scraper.fetchProfileFollowing(userId, maxProfiles, cursor?)`
Fetches a single page of following profiles with pagination support.

**Parameters:**
- `userId` (string): The ID of the user
- `maxProfiles` (number): Maximum number of profiles per page (max 50)
- `cursor` (string, optional): Pagination cursor from previous request

**Returns:** `Promise<QueryProfilesResponse>`

Response structure:
```typescript
{
  profiles: Profile[],     // Array of user profiles
  next?: string,           // Cursor for next page
  previous?: string        // Cursor for previous page
}
```

### `scraper.fetchProfileFollowers(userId, maxProfiles, cursor?)`
Fetches a single page of follower profiles with pagination support.

**Parameters:**
- `userId` (string): The ID of the user
- `maxProfiles` (number): Maximum number of profiles per page (max 50)
- `cursor` (string, optional): Pagination cursor from previous request

**Returns:** `Promise<QueryProfilesResponse>`

## Profile Object

Each profile contains the following information:

```typescript
interface Profile {
  userId?: string;
  username?: string;
  name?: string;
  biography?: string;
  avatar?: string;
  banner?: string;
  followersCount?: number;
  followingCount?: number;
  tweetsCount?: number;
  isBlueVerified?: boolean;
  isVerified?: boolean;
  joined?: Date;
  location?: string;
  website?: string;
  // ... and more
}
```

## Rate Limits

- Twitter has rate limits on these endpoints
- The scraper automatically handles rate limiting
- For best results, don't request too many profiles at once
- Maximum 50 profiles per request

## Notes

- **Login Required**: Both following and followers endpoints require authentication
- **User ID Required**: You need the numeric user ID, not just the username
  - Use `scraper.getProfile(username)` to get the user ID first
- **Pagination**: Results are paginated, use cursors for navigating pages
- **Private Accounts**: You cannot retrieve followers/following for private accounts unless you follow them

## Troubleshooting

### "Scraper is not logged-in"
Make sure to call `await scraper.login()` before using these methods.

### "Could not find user"
The username might be incorrect, or the account might be suspended/deleted.

### Rate Limit Errors
Wait a few minutes before making more requests. Consider implementing delays between requests.

## Related Examples

- [Profile Example](../profile) - Getting user profiles
- [Search Example](../search) - Searching for users
- [Node Integration](../node-integration) - Basic setup

## License

This example is part of the `@the-convocation/twitter-scraper` package.