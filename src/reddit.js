// In reddit.js

const subreddits = [
  'https://www.reddit.com/r/aww/hot.json',
  'https://www.reddit.com/r/rarepuppers/hot.json',
  // Add more subreddit URLs here if needed
];

export async function getCuteUrl() {
  const randomSubredditIndex = Math.floor(Math.random() * subreddits.length);
  const randomSubredditUrl = subreddits[randomSubredditIndex];

  const response = await fetch(randomSubredditUrl, {
    headers: {
      'User-Agent': 'justinbeckwith:awwbot:v1.0.0 (by /u/justinblat)',
    },
  });

  if (!response.ok) {
    let errorText = `Error fetching ${response.url}: ${response.status} ${response.statusText}`;
    try {
      const error = await response.text();
      if (error) {
        errorText = `${errorText} \n\n ${error}`;
      }
    } catch {
      // ignore
    }
    throw new Error(errorText);
  }

  const data = await response.json();
  const posts = data.data.children
  .map((post) => {
      if (post.is_gallery) {
        return '';
      }
      return (
        post.data?.media?.reddit_video?.fallback_url ||
        post.data?.secure_media?.reddit_video?.fallback_url ||
        post.data?.url
      );
    })
  .filter((post) =>!!post);

  const randomPostIndex = Math.floor(Math.random() * posts.length);
  const randomPost = posts[randomPostIndex];
  return randomPost;
}