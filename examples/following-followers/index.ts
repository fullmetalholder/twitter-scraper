import { Scraper } from '../../src/scraper';
import { Profile } from '../../src/profile';

/**
 * Example: Get Following and Followers
 *
 * This example demonstrates how to retrieve:
 * 1. Users that a specific user follows (following)
 * 2. Users that follow a specific user (followers)
 */

async function main() {
  const scraper = new Scraper();

  // Login is required for these operations
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (!username || !password) {
    throw new Error('Please set TWITTER_USERNAME and TWITTER_PASSWORD environment variables');
  }

  console.log('Logging in...');
  await scraper.login(username, password, email);
  console.log('✓ Logged in successfully\n');

  // Target user to analyze (you can change this)
  const targetUsername = 'elonmusk';

  // Get user profile first to get userId
  console.log(`Fetching profile for @${targetUsername}...`);
  const profile = await scraper.getProfile(targetUsername);

  if (!profile || !profile.userId) {
    throw new Error(`Could not find user @${targetUsername}`);
  }

  const userId = profile.userId;
  console.log(`✓ Found user: ${profile.name} (@${profile.username})`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Followers: ${profile.followersCount?.toLocaleString() || 'N/A'}`);
  console.log(`  Following: ${profile.followingCount?.toLocaleString() || 'N/A'}\n`);

  // Example 1: Get users that target user follows (following)
  console.log('=== Getting Following (users they follow) ===');
  const maxFollowing = 20; // Limit to first 20 for demo
  const followingGenerator = scraper.getFollowing(userId, maxFollowing);

  let followingCount = 0;
  const followingList: Profile[] = [];

  for await (const user of followingGenerator) {
    followingCount++;
    followingList.push(user);
    console.log(`${followingCount}. @${user.username} - ${user.name}`);

    if (followingCount >= 10) {
      console.log('... (showing first 10)');
      break;
    }
  }

  console.log(`\n✓ Retrieved ${followingCount} following\n`);

  // Example 2: Get users that follow the target user (followers)
  console.log('=== Getting Followers (users who follow them) ===');
  const maxFollowers = 20; // Limit to first 20 for demo
  const followersGenerator = scraper.getFollowers(userId, maxFollowers);

  let followersCount = 0;
  const followersList: Profile[] = [];

  for await (const user of followersGenerator) {
    followersCount++;
    followersList.push(user);
    console.log(`${followersCount}. @${user.username} - ${user.name}`);

    if (followersCount >= 10) {
      console.log('... (showing first 10)');
      break;
    }
  }

  console.log(`\n✓ Retrieved ${followersCount} followers\n`);

  // Example 3: Using pagination with cursor for more control
  console.log('=== Using Pagination (with cursor) ===');

  const pageSize = 5;
  let cursor: string | undefined = undefined;
  let pageNum = 1;

  while (pageNum <= 2) { // Get 2 pages for demo
    console.log(`\nPage ${pageNum}:`);

    const response = await scraper.fetchProfileFollowing(userId, pageSize, cursor);

    for (const user of response.profiles) {
      console.log(`  - @${user.username} - ${user.name}`);
    }

    cursor = response.next;

    if (!cursor) {
      console.log('No more pages available');
      break;
    }

    pageNum++;
  }

  // Example 4: Filter following by criteria
  console.log('\n=== Filtering Following (verified users only) ===');
  const verifiedFollowing = followingList.filter(user => user.isBlueVerified);

  if (verifiedFollowing.length > 0) {
    verifiedFollowing.forEach((user, index) => {
      console.log(`${index + 1}. @${user.username} - ${user.name} ✓`);
    });
  } else {
    console.log('No verified users found in the sample');
  }

  // Cleanup
  await scraper.logout();
  console.log('\n✓ Logged out');
}

// Run the example
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
