import { TwitterAuth } from './auth';
import { updateCookieJar } from './requests';
import { Headers } from 'headers-polyfill';
import { ApiError } from './errors';

// GraphQL endpoints
const GRAPHQL_CREATE_TWEET =
  'https://x.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet';
const GRAPHQL_CREATE_RETWEET =
  'https://x.com/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet';
const GRAPHQL_DELETE_RETWEET =
  'https://x.com/i/api/graphql/iQtK4dl5hBmXewYZuEOKVw/DeleteRetweet';
const GRAPHQL_FAVORITE_TWEET =
  'https://x.com/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet';
const GRAPHQL_UNFAVORITE_TWEET =
  'https://x.com/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet';
// Use upload.x.com (same domain as cookies) - matches browser behavior
const MEDIA_UPLOAD_URL = 'https://upload.x.com/i/media/upload.json';

/**
 * Media data for uploading
 */
export interface MediaData {
  data: Buffer;
  mediaType: string;
}

/**
 * Options for creating a tweet
 */
export interface CreateTweetOptions {
  /** Media IDs to attach to the tweet */
  mediaIds?: string[];
  /** Tweet ID to reply to */
  replyToTweetId?: string;
  /** Tweet URL or ID for quote tweet */
  quoteTweetId?: string;
}

/**
 * Response from media upload
 */
export interface MediaUploadResponse {
  media_id: number;
  media_id_string: string;
  size?: number;
  expires_after_secs?: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
  processing_info?: {
    state: string;
    check_after_secs?: number;
  };
}

/**
 * Features for GraphQL requests
 */
const tweetFeatures = {
  interactive_text_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_text_conversations_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
    false,
  vibe_api_enabled: false,
  rweb_lists_timeline_redesign_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  longform_notetweets_rich_text_read_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  subscriptions_verification_info_enabled: true,
  subscriptions_verification_info_reason_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  super_follow_badge_privacy_enabled: false,
  super_follow_exclusive_tweet_notifications_enabled: false,
  super_follow_tweet_api_enabled: false,
  super_follow_user_api_enabled: false,
  android_graphql_skip_api_media_color_palette: false,
  creator_subscriptions_subscription_count_enabled: false,
  blue_business_profile_image_shape_enabled: false,
  unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false,
  rweb_video_timestamps_enabled: false,
  c9s_tweet_anatomy_moderator_badge_enabled: false,
  responsive_web_twitter_article_tweet_consumption_enabled: false,
};

/**
 * Get auth headers for Twitter API requests (GraphQL endpoints)
 */
async function getAuthHeaders(
  auth: TwitterAuth,
  url: string,
): Promise<Headers> {
  const cookies = await auth.cookieJar().getCookies(url);
  const xCsrfToken = cookies.find((cookie) => cookie.key === 'ct0');

  const headers = new Headers({
    authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
    cookie: await auth.cookieJar().getCookieString(url),
    'content-type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'x-csrf-token': xCsrfToken?.value ?? '',
  });

  return headers;
}

/**
 * Get auth headers for media upload API (upload.x.com)
 * Based on real Network requests from Twitter web interface
 */
async function getMediaUploadHeaders(
  auth: TwitterAuth,
  url: string,
): Promise<Headers> {
  const uploadUrl = 'https://upload.x.com';
  const cookies = await auth.cookieJar().getCookies(uploadUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === 'ct0');

  // Get bearer token from auth (using private property access)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bearerToken =
    (auth as any).bearerToken ||
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

  const cookieString = await auth.cookieJar().getCookieString(uploadUrl);

  const headers = new Headers({
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    authorization: `Bearer ${bearerToken}`,
    cookie: cookieString,
    origin: 'https://x.com',
    referer: 'https://x.com/',
    'sec-ch-ua':
      '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'x-csrf-token': xCsrfToken?.value ?? '',
    'x-twitter-auth-type': 'OAuth2Session',
  });

  return headers;
}

/**
 * Simple media upload using FormData (for small images < 5MB)
 * Uses upload.x.com with cookies from x.com (same domain, no copying needed)
 * Headers match exactly what browser sends
 */
async function uploadMediaSimple(
  auth: TwitterAuth,
  data: Buffer,
  mediaType: string,
): Promise<string> {
  const uploadUrl = 'https://upload.x.com';
  const cookies = await auth.cookieJar().getCookies(uploadUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === 'ct0');

  const cookieString = await auth.cookieJar().getCookieString(uploadUrl);

  // Get bearer token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bearerToken =
    (auth as any).bearerToken ||
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

  // Headers matching browser request exactly
  const headers = new Headers({
    accept: '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    authorization: `Bearer ${bearerToken}`,
    cookie: cookieString,
    origin: 'https://x.com',
    referer: 'https://x.com/',
    'sec-ch-ua':
      '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'x-csrf-token': xCsrfToken?.value ?? '',
    'x-twitter-auth-type': 'OAuth2Session',
  });

  // Create FormData with media blob
  const form = new FormData();
  const uint8Array = new Uint8Array(data);
  const blob = new Blob([uint8Array], { type: mediaType });
  form.append('media', blob);

  const response = await auth.fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers,
    body: form,
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const apiError = await ApiError.fromResponse(response);
    throw apiError;
  }

  const result: MediaUploadResponse = await response.json();

  return result.media_id_string;
}

/**
 * Upload media to Twitter (supports images)
 * Uses simple FormData for images, chunked upload for videos/large files
 * @param auth Twitter authentication
 * @param mediaData The media data to upload
 * @returns The media ID string
 */
export async function uploadMedia(
  auth: TwitterAuth,
  mediaData: MediaData,
): Promise<string> {
  const { data, mediaType } = mediaData;
  const totalBytes = data.length;

  // Always use chunked upload (INIT → APPEND → FINALIZE) - this is what the browser does
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks

  // Step 1: INIT
  // Based on real Twitter Network request:
  // upload.x.com/i/media/upload.json?command=INIT&total_bytes=289140&media_type=image%2Fjpeg&enable_1080p_variant=true&media_category=tweet_image
  const initParams = new URLSearchParams({
    command: 'INIT',
    total_bytes: totalBytes.toString(),
    media_type: mediaType,
    enable_1080p_variant: 'true',
    media_category: 'tweet_image',
  });

  const headers = await getMediaUploadHeaders(auth, MEDIA_UPLOAD_URL);

  const initUrl = `${MEDIA_UPLOAD_URL}?${initParams.toString()}`;

  const initResponse = await auth.fetch(initUrl, {
    method: 'POST',
    headers,
  });

  await updateCookieJar(auth.cookieJar(), initResponse.headers);

  if (!initResponse.ok) {
    const apiError = await ApiError.fromResponse(initResponse);
    throw apiError;
  }

  // Media ID can be in response headers (x-mediaid) or in JSON body
  const mediaIdFromHeader = initResponse.headers.get('x-mediaid');
  let mediaId: string;

  if (mediaIdFromHeader) {
    mediaId = mediaIdFromHeader;
  } else {
    const initResult: MediaUploadResponse = await initResponse.json();
    mediaId = initResult.media_id_string;
  }

  // Step 2: APPEND (upload in chunks)
  let segmentIndex = 0;
  let offset = 0;

  while (offset < totalBytes) {
    const chunk = data.slice(offset, offset + chunkSize);
    const chunkBase64 = chunk.toString('base64');

    const appendParams = new URLSearchParams({
      command: 'APPEND',
      media_id: mediaId,
      segment_index: segmentIndex.toString(),
    });

    const appendHeaders = await getMediaUploadHeaders(auth, MEDIA_UPLOAD_URL);
    appendHeaders.set('content-type', 'application/x-www-form-urlencoded');

    const appendBody = new URLSearchParams({
      media_data: chunkBase64,
    });

    const fullUrl = `${MEDIA_UPLOAD_URL}?${appendParams.toString()}`;

    const appendResponse = await auth.fetch(fullUrl, {
      method: 'POST',
      headers: appendHeaders,
      body: appendBody.toString(),
    });

    await updateCookieJar(auth.cookieJar(), appendResponse.headers);

    if (!appendResponse.ok) {
      const apiError = await ApiError.fromResponse(appendResponse);
      throw apiError;
    }

    segmentIndex++;
    offset += chunkSize;
  }

  // Step 3: FINALIZE
  const finalizeParams = new URLSearchParams({
    command: 'FINALIZE',
    media_id: mediaId,
  });

  const finalizeHeaders = await getMediaUploadHeaders(auth, MEDIA_UPLOAD_URL);

  const finalizeUrl = `${MEDIA_UPLOAD_URL}?${finalizeParams.toString()}`;

  const finalizeResponse = await auth.fetch(finalizeUrl, {
    method: 'POST',
    headers: finalizeHeaders,
  });

  await updateCookieJar(auth.cookieJar(), finalizeResponse.headers);

  if (!finalizeResponse.ok) {
    const apiError = await ApiError.fromResponse(finalizeResponse);
    throw apiError;
  }

  const finalizeResult: MediaUploadResponse = await finalizeResponse.json();

  // Check if processing is needed (for videos/gifs)
  if (finalizeResult.processing_info) {
    await waitForMediaProcessing(auth, mediaId);
  }

  return finalizeResult.media_id_string;
}

/**
 * Wait for media processing to complete
 */
async function waitForMediaProcessing(
  auth: TwitterAuth,
  mediaId: string,
): Promise<void> {
  while (true) {
    const statusParams = new URLSearchParams({
      command: 'STATUS',
      media_id: mediaId,
    });

    const headers = await getMediaUploadHeaders(auth, MEDIA_UPLOAD_URL);
    headers.delete('content-type');

    const statusUrl = `${MEDIA_UPLOAD_URL}?${statusParams.toString()}`;

    const statusResponse = await auth.fetch(statusUrl, {
      method: 'GET',
      headers,
    });

    if (!statusResponse.ok) {
      const clonedForLog = statusResponse.clone();
      let errorBody = '';
      try {
        const contentType = clonedForLog.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const json = await clonedForLog.json();
            errorBody = JSON.stringify(json, null, 2);
          } catch (jsonError) {
            errorBody = await clonedForLog.text();
          }
        } else {
          errorBody = await clonedForLog.text();
        }
      } catch (e) {
        errorBody = `Failed to read error body: ${e}`;
      }

      throw new Error(`Media status check failed: ${errorBody}`);
    }

    const statusResult: MediaUploadResponse = await statusResponse.json();

    if (!statusResult.processing_info) {
      return;
    }

    if (statusResult.processing_info.state === 'failed') {
      throw new Error('Media processing failed');
    }

    if (statusResult.processing_info.state === 'succeeded') {
      return;
    }

    const waitTime =
      (statusResult.processing_info.check_after_secs ?? 5) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

/**
 * Create a tweet
 * @param auth Twitter authentication
 * @param text The tweet text
 * @param options Optional settings for media, reply, quote
 * @returns The response from Twitter
 */
export async function createTweet(
  auth: TwitterAuth,
  text: string,
  options?: CreateTweetOptions,
): Promise<Response> {
  const headers = await getAuthHeaders(auth, GRAPHQL_CREATE_TWEET);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variables: Record<string, any> = {
    tweet_text: text,
    dark_request: false,
    media: {
      media_entities: [],
      possibly_sensitive: false,
    },
    semantic_annotation_ids: [],
  };

  // Add media if provided
  if (options?.mediaIds && options.mediaIds.length > 0) {
    variables.media.media_entities = options.mediaIds.map((id) => ({
      media_id: id,
      tagged_users: [],
    }));
  }

  // Add reply if provided
  if (options?.replyToTweetId) {
    variables.reply = {
      in_reply_to_tweet_id: options.replyToTweetId,
      exclude_reply_user_ids: [],
    };
  }

  // Add quote tweet if provided
  if (options?.quoteTweetId) {
    variables.attachment_url = `https://x.com/i/status/${options.quoteTweetId}`;
  }

  const response = await auth.fetch(GRAPHQL_CREATE_TWEET, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables,
      features: tweetFeatures,
      fieldToggles: {
        withArticleRichContentState: false,
      },
    }),
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create tweet failed: ${errorText}`);
  }

  return response;
}

/**
 * Retweet a tweet
 * @param auth Twitter authentication
 * @param tweetId The ID of the tweet to retweet
 * @returns The response from Twitter
 */
export async function retweet(
  auth: TwitterAuth,
  tweetId: string,
): Promise<Response> {
  const headers = await getAuthHeaders(auth, GRAPHQL_CREATE_RETWEET);

  const response = await auth.fetch(GRAPHQL_CREATE_RETWEET, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables: {
        tweet_id: tweetId,
        dark_request: false,
      },
      queryId: 'ojPdsZsimiJrUGLR1sjUtA',
    }),
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Retweet failed: ${errorText}`);
  }

  return response;
}

/**
 * Remove a retweet
 * @param auth Twitter authentication
 * @param tweetId The ID of the tweet to unretweet
 * @returns The response from Twitter
 */
export async function unretweet(
  auth: TwitterAuth,
  tweetId: string,
): Promise<Response> {
  const headers = await getAuthHeaders(auth, GRAPHQL_DELETE_RETWEET);

  const response = await auth.fetch(GRAPHQL_DELETE_RETWEET, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables: {
        source_tweet_id: tweetId,
        dark_request: false,
      },
      queryId: 'iQtK4dl5hBmXewYZuEOKVw',
    }),
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unretweet failed: ${errorText}`);
  }

  return response;
}

/**
 * Like a tweet
 * @param auth Twitter authentication
 * @param tweetId The ID of the tweet to like
 * @returns The response from Twitter
 */
export async function likeTweet(
  auth: TwitterAuth,
  tweetId: string,
): Promise<Response> {
  const headers = await getAuthHeaders(auth, GRAPHQL_FAVORITE_TWEET);

  const response = await auth.fetch(GRAPHQL_FAVORITE_TWEET, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables: {
        tweet_id: tweetId,
      },
      queryId: 'lI07N6Otwv1PhnEgXILM7A',
    }),
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Like tweet failed: ${errorText}`);
  }

  return response;
}

/**
 * Unlike a tweet
 * @param auth Twitter authentication
 * @param tweetId The ID of the tweet to unlike
 * @returns The response from Twitter
 */
export async function unlikeTweet(
  auth: TwitterAuth,
  tweetId: string,
): Promise<Response> {
  const headers = await getAuthHeaders(auth, GRAPHQL_UNFAVORITE_TWEET);

  const response = await auth.fetch(GRAPHQL_UNFAVORITE_TWEET, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      variables: {
        tweet_id: tweetId,
      },
      queryId: 'ZYKSe-w7KEslx3JhSIk5LA',
    }),
  });

  await updateCookieJar(auth.cookieJar(), response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unlike tweet failed: ${errorText}`);
  }

  return response;
}
