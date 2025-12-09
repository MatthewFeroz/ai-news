This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Twitter API Setup

This project supports collecting news from Twitter/X using the Twitter API v2. To enable Twitter sources:

1. **Get a Twitter API Bearer Token:**
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Create a new project/app or use an existing one
   - Navigate to "Keys and tokens" and generate a Bearer Token
   - Copy the Bearer Token

2. **Add the Bearer Token to your environment variables:**
   ```bash
   # .env.local
   TWITTER_BEARER_TOKEN=your_bearer_token_here
   ```

3. **Configure Twitter sources in `lib/config.ts`:**
   ```typescript
   export const TWITTER_SOURCES: Source[] = [
     {
       id: 'openai-twitter',
       name: 'OpenAI',
       type: 'twitter',
       url: '@openai', // or 'openai' (both work)
       icon: '🤖',
     },
     {
       id: 'ai-hashtag',
       name: 'AI Hashtag',
       type: 'twitter',
       url: '#AI -is:retweet', // Search query (excludes retweets)
       icon: '💬',
     },
   ];
   ```

**Twitter Source URL Formats:**
- **Username**: `@username` or `username` - Fetches tweets from that user
- **Hashtag**: `#hashtag` - Fetches tweets with that hashtag
- **Search Query**: Any Twitter search query (e.g., `AI news -is:retweet lang:en`)

**Twitter API Rate Limits:**
- Free tier: 1,500 tweets/month for search endpoints
- Paid tiers: Higher limits available

**Note:** Twitter API requires authentication and has rate limits. Make sure to monitor your usage to avoid hitting limits.

## Redis Database Setup

This project uses **Redis** for data storage. Here's what you need to know:

### What is Redis?

Redis is a fast, in-memory database that stores your data as key-value pairs. In this app, Redis stores:
- **Processed news content** - The AI summaries generated from tweets
- **Model comparison data** - Which AI model performed better in head-to-head comparisons  
- **Metadata** - When content was last fetched, email sent, etc.

### Why Redis?

1. **Speed** - Data is stored in memory, so reads/writes are instant
2. **Simple** - No complex schemas, just store and retrieve JSON data
3. **Cheap** - Free tiers available that are more than enough for this app
4. **Works with Vercel** - Integrates seamlessly with serverless deployment

### How to Set Up (Upstash - Recommended)

[Upstash](https://upstash.com) provides a free Redis instance that works perfectly with Vercel:

1. **Create an account** at [upstash.com](https://upstash.com)
2. **Create a new Redis database**:
   - Click "Create Database"
   - Choose a region close to your Vercel deployment (e.g., US-East-1)
   - Select the free tier
3. **Copy your connection URL**:
   - Go to your database details
   - Copy the `UPSTASH_REDIS_REST_URL` or connection string
   - It looks like: `rediss://default:xxxx@xxx.upstash.io:6379`
4. **Add to your environment**:
   ```bash
   # .env.local (for local development)
   STORAGE_REDIS_URL=rediss://default:your-password@your-db.upstash.io:6379
   ```

### How Data Flows

```
User clicks "Fetch News"
        ↓
Twitter API → Fetches tweets from @karpathy, @OpenAI, etc.
        ↓
OpenRouter API → AI summarizes the content
        ↓
Redis → Stores the processed summaries
        ↓
Frontend → Displays stored content from Redis
```

### Redis Data Structure

The app stores three keys in Redis:
- `news:contents` - Array of processed articles with AI summaries
- `news:comparisons` - Array of model comparison votes
- `news:metadata` - Last fetch time, last email time, etc.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
