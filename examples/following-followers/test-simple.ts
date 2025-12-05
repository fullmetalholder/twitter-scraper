import { Scraper } from '../../src/scraper';

/**
 * Simple test script for following/followers functionality
 *
 * Usage:
 *   export TWITTER_USERNAME="your_username"
 *   export TWITTER_PASSWORD="your_password"
 *   export TWITTER_EMAIL="your_email@example.com"  # Optional
 *   npx ts-node examples/following-followers/test-simple.ts
 */

async function testFollowingFollowers() {
  console.log('=== Twitter Following/Followers Test ===\n');

  // Check environment variables
  const username = process.env.TWITTER_USERNAME;
  const password = process.env.TWITTER_PASSWORD;
  const email = process.env.TWITTER_EMAIL;

  if (!username || !password) {
    console.error('❌ Error: Missing credentials');
    console.error('Please set TWITTER_USERNAME and TWITTER_PASSWORD environment variables');
    process.exit(1);
  }

  const scraper = new Scraper();

  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    await scraper.login(username, password, email);
    console.log('✅ Login successful\n');

    // Step 2: Get a test user profile (Twitter's official account)
    console.log('Step 2: Getting profile for @Twitter...');
    const profile = await scraper.getProfile('Twitter');

    if (!profile || !profile.userId) {
      throw new Error('Failed to get profile');
    }

    console.log(`✅ Profile retrieved:`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Username: @${profile.username}`);
    console.log(`   User ID: ${profile.userId}`);
    console.log(`   Followers: ${profile.followersCount?.toLocaleString() || 'N/A'}`);
    console.log(`   Following: ${profile.followingCount?.toLocaleString() || 'N/A'}\n`);

    const userId = profile.userId;

    // Step 3: Test getFollowing
    console.log('Step 3: Testing getFollowing() - Get 5 users they follow...');
    const following = scraper.getFollowing(userId, 5);

    let followingCount = 0;
    for await (const user of following) {
      followingCount++;
      console.log(`   ${followingCount}. @${user.username} - ${user.name}`);

      // Validate data
      if (!user.userId || !user.username) {
        throw new Error('Invalid user data received');
      }
    }

    if (followingCount > 0) {
      console.log(`✅ Successfully retrieved ${followingCount} following\n`);
    } else {
      console.log('⚠️  No following found (account might not follow anyone)\n');
    }

    // Step 4: Test getFollowers
    console.log('Step 4: Testing getFollowers() - Get 5 followers...');
    const followers = scraper.getFollowers(userId, 5);

    let followersCount = 0;
    for await (const user of followers) {
      followersCount++;
      console.log(`   ${followersCount}. @${user.username} - ${user.name}`);

      // Validate data
      if (!user.userId || !user.username) {
        throw new Error('Invalid user data received');
      }
    }

    if (followersCount > 0) {
      console.log(`✅ Successfully retrieved ${followersCount} followers\n`);
    } else {
      console.log('⚠️  No followers found\n');
    }

    // Step 5: Test pagination with fetchProfileFollowing
    console.log('Step 5: Testing pagination with fetchProfileFollowing()...');
    const response = await scraper.fetchProfileFollowing(userId, 3);

    console.log(`   Retrieved ${response.profiles.length} profiles`);
    console.log(`   Has next cursor: ${response.next ? 'Yes' : 'No'}`);

    if (response.profiles.length > 0) {
      console.log(`   First profile: @${response.profiles[0].username}`);
      console.log(`✅ Pagination test successful\n`);
    } else {
      console.log('⚠️  No profiles in pagination response\n');
    }

    // Step 6: Logout
    console.log('Step 6: Logging out...');
    await scraper.logout();
    console.log('✅ Logout successful\n');

    console.log('=== All Tests Passed! ===');
    console.log('\n✅ Summary:');
    console.log(`   - Login: Working`);
    console.log(`   - Profile retrieval: Working`);
    console.log(`   - getFollowing: Working (${followingCount} retrieved)`);
    console.log(`   - getFollowers: Working (${followersCount} retrieved)`);
    console.log(`   - Pagination: Working`);
    console.log(`   - Logout: Working`);

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testFollowingFollowers();
