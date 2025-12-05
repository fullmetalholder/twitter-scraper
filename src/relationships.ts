import { bearerToken2, requestApi, requestApiPostForm } from './api';
import { TwitterAuth } from './auth';
import { Profile, getUserIdByScreenName } from './profile';
import { QueryProfilesResponse } from './timeline-v1';
import { getUserTimeline } from './timeline-async';
import {
  RelationshipTimeline,
  parseRelationshipTimeline,
} from './timeline-relationship';
import { AuthenticationError } from './errors';
import { apiRequestFactory } from './api-data';

const FRIENDSHIPS_CREATE_URL =
  'https://x.com/i/api/1.1/friendships/create.json';

export function getFollowing(
  userId: string,
  maxProfiles: number,
  auth: TwitterAuth,
): AsyncGenerator<Profile, void> {
  return getUserTimeline(userId, maxProfiles, (q, mt, c) => {
    return fetchProfileFollowing(q, mt, auth, c);
  });
}

export function getFollowers(
  userId: string,
  maxProfiles: number,
  auth: TwitterAuth,
): AsyncGenerator<Profile, void> {
  return getUserTimeline(userId, maxProfiles, (q, mt, c) => {
    return fetchProfileFollowers(q, mt, auth, c);
  });
}

export async function fetchProfileFollowing(
  userId: string,
  maxProfiles: number,
  auth: TwitterAuth,
  cursor?: string,
): Promise<QueryProfilesResponse> {
  if (!(await auth.isLoggedIn())) {
    throw new AuthenticationError(
      'Scraper is not logged-in for profile following.',
    );
  }

  const timeline = await getFollowingTimeline(
    userId,
    maxProfiles,
    auth,
    cursor,
  );

  return parseRelationshipTimeline(timeline);
}

export async function fetchProfileFollowers(
  userId: string,
  maxProfiles: number,
  auth: TwitterAuth,
  cursor?: string,
): Promise<QueryProfilesResponse> {
  if (!(await auth.isLoggedIn())) {
    throw new AuthenticationError(
      'Scraper is not logged-in for profile followers.',
    );
  }

  const timeline = await getFollowersTimeline(
    userId,
    maxProfiles,
    auth,
    cursor,
  );

  return parseRelationshipTimeline(timeline);
}

async function getFollowingTimeline(
  userId: string,
  maxItems: number,
  auth: TwitterAuth,
  cursor?: string,
): Promise<RelationshipTimeline> {
  if (!auth.isLoggedIn()) {
    throw new AuthenticationError(
      'Scraper is not logged-in for profile following.',
    );
  }

  if (maxItems > 50) {
    maxItems = 50;
  }

  const followingRequest = apiRequestFactory.createFollowingRequest();
  followingRequest.variables.userId = userId;
  followingRequest.variables.count = maxItems;
  followingRequest.variables.includePromotedContent = false;

  if (cursor != null && cursor != '') {
    followingRequest.variables.cursor = cursor;
  }

  const res = await requestApi<RelationshipTimeline>(
    followingRequest.toRequestUrl(),
    auth,
    'GET',
    undefined,
    undefined,
    bearerToken2,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

async function getFollowersTimeline(
  userId: string,
  maxItems: number,
  auth: TwitterAuth,
  cursor?: string,
): Promise<RelationshipTimeline> {
  if (!auth.isLoggedIn()) {
    throw new AuthenticationError(
      'Scraper is not logged-in for profile followers.',
    );
  }

  if (maxItems > 50) {
    maxItems = 50;
  }

  const followersRequest = apiRequestFactory.createFollowersRequest();
  followersRequest.variables.userId = userId;
  followersRequest.variables.count = maxItems;
  followersRequest.variables.includePromotedContent = false;

  if (cursor != null && cursor != '') {
    followersRequest.variables.cursor = cursor;
  }

  const res = await requestApi<RelationshipTimeline>(
    followersRequest.toRequestUrl(),
    auth,
    'GET',
    undefined,
    undefined,
    bearerToken2,
  );

  if (!res.success) {
    throw res.err;
  }

  return res.value;
}

/**
 * Follow a user by username.
 * Uses the same infrastructure as getTrends for consistency.
 * @param auth Twitter authentication
 * @param username The username of the user to follow (without @)
 * @returns The response from Twitter
 */
export async function followUser(
  auth: TwitterAuth,
  username: string,
): Promise<Response> {
  if (!(await auth.isLoggedIn())) {
    throw new AuthenticationError('Must be logged in to follow users');
  }

  const userIdResult = await getUserIdByScreenName(username, auth);
  if (!userIdResult.success) {
    throw new Error(`Failed to get user ID: ${userIdResult.err.message}`);
  }

  const userId = userIdResult.value;

  // Minimal body with only required fields
  const body = new URLSearchParams({
    user_id: userId,
    skip_status: 'true',
    include_profile_interstitial_type: '1',
  });

  // Use requestApiPostForm similar to how getTrends uses requestApi
  // This automatically handles auth, cookies, rate limits, and errors
  const res = await requestApiPostForm<unknown>(
    FRIENDSHIPS_CREATE_URL,
    auth,
    body,
    undefined,
    bearerToken2,
  );

  if (!res.success) {
    throw res.err;
  }

  // Return Response object for compatibility with existing API
  // The actual response data is in res.value
  return new Response(JSON.stringify(res.value), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
