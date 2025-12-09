/**
 * Test script to fetch Twitter content
 * Run with: bun test-twitter.ts
 */

import { fetchAllTwitterContent } from './lib/services/twitter';
import { TWITTER_SOURCES } from './lib/config';

async function testTwitterFetch() {
  console.log('🐦 Testing Twitter API v2 Integration\n');
  console.log('=' .repeat(50));
  
  // Check if TWITTER_BEARER_TOKEN is set
  if (!process.env.TWITTER_BEARER_TOKEN) {
    console.error('\n❌ ERROR: TWITTER_BEARER_TOKEN environment variable is not set!');
    console.error('\nTo fix this:');
    console.error('1. Go to https://developer.twitter.com/en/portal/dashboard');
    console.error('2. Create a project and get your Bearer Token');
    console.error('3. Add to .env.local (no quotes around the token!):');
    console.error('   TWITTER_BEARER_TOKEN=your_token_here\n');
    process.exit(1);
  }
  
  console.log('\n✅ TWITTER_BEARER_TOKEN is set');
  console.log(`📋 Configured Twitter sources: ${TWITTER_SOURCES.length}`);
  
  if (TWITTER_SOURCES.length === 0) {
    console.log('\n⚠️  No Twitter sources configured in lib/config.ts');
    console.log('Add sources to TWITTER_SOURCES array.\n');
    process.exit(0);
  }
  
  TWITTER_SOURCES.forEach(source => {
    console.log(`   • ${source.name} (${source.url})`);
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔄 Fetching tweets...\n');
  
  try {
    const startTime = Date.now();
    const contents = await fetchAllTwitterContent();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' .repeat(50));
    
    if (contents.length === 0) {
      console.log('⚠️  No tweets fetched.');
      console.log('\nPossible reasons:');
      console.log('   • Rate limit hit (wait 1-15 minutes)');
      console.log('   • User has no recent original tweets');
      console.log('   • Invalid Bearer Token');
    } else {
      console.log(`\n✅ Successfully fetched ${contents.length} tweet(s) in ${duration}s\n`);
      
      contents.forEach((content, index) => {
        console.log(`${index + 1}. ${content.author}`);
        console.log(`   📝 ${content.title.slice(0, 80)}${content.title.length > 80 ? '...' : ''}`);
        console.log(`   🔗 ${content.url}`);
        console.log(`   📅 ${new Date(content.publishedAt).toLocaleString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('\n❌ Error fetching Twitter content:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

testTwitterFetch();
