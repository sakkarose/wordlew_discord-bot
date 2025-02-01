Based on Discord's Cloudflare Workers example with additional updates.

Additional features:
- Updated wrangler to support **Workers Logs**.
- Setup schedule to automatically fetch image and send it to **DISCORD_CHANNEL_ID** with a cron trigger.
- Support multiple subreddit sources (Will be picked randomly).

To-do:
- Fix ci/lint and ci/test.
- Change subreddit list const to an environment variable.
