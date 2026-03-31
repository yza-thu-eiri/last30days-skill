#!/usr/bin/env node
/**
 * bird-search.mjs - Vendored Bird CLI search wrapper for /last30days.
 * Subset of @steipete/bird v0.8.0 (MIT License, Peter Steinberger).
 *
 * Usage:
 *   node bird-search.mjs <query> [--count N] [--json]
 *   node bird-search.mjs --whoami
 *   node bird-search.mjs --check
 */

import { resolveCredentials } from './lib/cookies.js';
import { TwitterClientBase } from './lib/twitter-client-base.js';
import { withSearch } from './lib/twitter-client-search.js';

// Build a search-only client (no posting, bookmarks, etc.)
const SearchClient = withSearch(TwitterClientBase);

const args = process.argv.slice(2);

function writeAndReturn(code, stdout = '', stderr = '') {
  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }
  process.exitCode = code;
  return code;
}

async function main() {
  // --check: verify that credentials can be resolved
  if (args.includes('--check')) {
    try {
      const { cookies, warnings } = await resolveCredentials({});
      if (cookies.authToken && cookies.ct0) {
        return writeAndReturn(0, JSON.stringify({ authenticated: true, source: cookies.source }));
      }
      return writeAndReturn(1, JSON.stringify({ authenticated: false, warnings }));
    } catch (err) {
      return writeAndReturn(1, JSON.stringify({ authenticated: false, error: err.message }));
    }
  }

  // --whoami: check auth and output source
  if (args.includes('--whoami')) {
    try {
      const { cookies } = await resolveCredentials({});
      if (cookies.authToken && cookies.ct0) {
        return writeAndReturn(0, cookies.source || 'authenticated');
      }
      return writeAndReturn(1, '', 'Not authenticated\n');
    } catch (err) {
      return writeAndReturn(1, '', `Auth check failed: ${err.message}\n`);
    }
  }

  // Parse search args
  let query = null;
  let count = 20;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '-n' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (!args[i].startsWith('-')) {
      query = args[i];
    }
  }

  if (!query) {
    return writeAndReturn(1, '', 'Usage: node bird-search.mjs <query> [--count N] [--json]\n');
  }

  try {
    // Resolve credentials (env vars, then browser cookies)
    const { cookies, warnings } = await resolveCredentials({});

    if (!cookies.authToken || !cookies.ct0) {
      const msg = warnings.length > 0 ? warnings.join('; ') : 'No Twitter credentials found';
      if (jsonOutput) {
        return writeAndReturn(1, JSON.stringify({ error: msg, items: [] }));
      }
      return writeAndReturn(1, '', `Error: ${msg}\n`);
    }

    // Create search client
    const client = new SearchClient({
      cookies: {
        authToken: cookies.authToken,
        ct0: cookies.ct0,
        cookieHeader: cookies.cookieHeader,
      },
      timeoutMs: 30000,
    });

    // Run search
    const result = await client.search(query, count);

    if (!result.success) {
      if (jsonOutput) {
        return writeAndReturn(1, JSON.stringify({ error: result.error, items: [] }));
      }
      return writeAndReturn(1, '', `Search failed: ${result.error}\n`);
    }

    // Output results
    const tweets = result.tweets || [];
    if (jsonOutput) {
      return writeAndReturn(0, JSON.stringify(tweets));
    }

    for (const tweet of tweets) {
      const author = tweet.author?.username || 'unknown';
      process.stdout.write(`@${author}: ${tweet.text?.slice(0, 200)}\n\n`);
    }
    return writeAndReturn(0);
  } catch (err) {
    if (jsonOutput) {
      return writeAndReturn(1, JSON.stringify({ error: err.message, items: [] }));
    }
    return writeAndReturn(1, '', `Error: ${err.message}\n`);
  }
}

await main();
