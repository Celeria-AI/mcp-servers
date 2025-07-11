#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "linkedin",
  version: "1.0.0",
});

/**
 * Makes authenticated requests to LinkedIn's Voyager API
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Promise<any> - JSON response from API
 */
async function makeLinkedInVoyagerRequest(endpoint: string, options: RequestInit = {}) {
  const cookies = process.env.LINKEDIN_COOKIES;

  if (!cookies) {
    throw new Error("LINKEDIN_COOKIES environment variable is required");
  }

  // Extract CSRF token from cookies using multiple patterns
  let csrfToken = '';
  const patterns = [
    /JSESSIONID="([^"]+)"/,
    /JSESSIONID=([^;]+)/,
    /csrf-token=([^;]+)/,
    /csrf_token=([^;]+)/,
    /ajax:(\w+)/
  ];
  
  for (const pattern of patterns) {
    const match = cookies.match(pattern);
    if (match) {
      csrfToken = match[1];
      break;
    }
  }
  
  // Fallback CSRF token generation if none found
  if (!csrfToken) {
    const ajaxMatch = cookies.match(/ajax:(\w+)/);
    csrfToken = ajaxMatch ? ajaxMatch[1] : 'ajax:' + Math.random().toString(36).substring(2);
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cookie': cookies,
    'csrf-token': csrfToken,
    'x-restli-protocol-version': '2.0.0',
    'x-li-lang': 'en_US',
    'x-li-track': JSON.stringify({
      'clientVersion': '1.0.0',
      'mpVersion': '1.0.0',
      'osName': 'web',
      'timezoneOffset': -480,
      'timezone': 'America/Los_Angeles',
      'deviceFormFactor': 'DESKTOP',
      'mpName': 'voyager-web'
    }),
    ...options.headers
  };

  const url = `https://www.linkedin.com/voyager/api${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voyager API error! status: ${response.status}, response: ${errorText}`);
  }

  return response.json();
}

/**
 * Extracts post data from LinkedIn's GraphQL included array
 * @param included - Array of included data from GraphQL response
 * @param limit - Maximum number of posts to extract
 * @returns Array of formatted post objects
 */
function extractPostsFromIncluded(included: any[], limit: number) {
  const posts = [];
  
  for (const item of included) {
    if (item.$type?.includes('FeedUpdate') || item.commentary?.text?.text) {
      const author = item.actor?.name?.text || item.header?.actor?.name?.text || 'Unknown';
      const content = item.commentary?.text?.text || item.content?.text?.text || 'No content';
      const time = item.actor?.subDescription?.text || item.header?.timestamp?.text || 'Unknown time';
      
      if (content && content !== 'No content' && content.length > 10) {
        posts.push({
          author,
          content: content.substring(0, 500),
          time,
          urn: item.entityUrn || ''
        });
      }
    }
  }
  
  return posts.slice(0, limit);
}



server.tool(
  "search-posts",
  {
    query: z.string().describe("Search query for LinkedIn posts"),
    limit: z.number().default(10).optional().describe("Maximum number of posts to return"),
    start: z.number().default(0).optional().describe("Starting position for pagination")
  },
  async ({ query, limit = 10, start = 0 }) => {
    try {
      const variables = `(start:${start},origin:GLOBAL_SEARCH_HEADER,query:(keywords:${query},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(CONTENT))),includeFiltersInResponse:false),count:${limit})`;
      const queryId = 'voyagerSearchDashClusters.8db4d301d47caa05a9156f4c7bb19cc4';
      
      const data = await makeLinkedInVoyagerRequest(`/graphql?variables=${variables}&queryId=${queryId}`);
      const posts = extractPostsFromIncluded(data.included || [], limit);
      
      return {
        content: [{
          type: "text",
          text: `Found ${posts.length} posts for "${query}":\n\n${JSON.stringify(posts, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to search posts: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "get-feed",
  {
    limit: z.number().default(10).optional().describe("Maximum number of posts to return"),
    start: z.number().default(0).optional().describe("Starting position for pagination")
  },
  async ({ limit = 10, start = 0 }) => {
    try {
      const variables = `(start:${start},count:${limit},sortOrder:RELEVANCE)`;
      const queryId = 'voyagerFeedDashMainFeed.7a50ef8ba5a7865c23ad5df46f735709';
      
      const data = await makeLinkedInVoyagerRequest(`/graphql?variables=${variables}&queryId=${queryId}`);
      const posts = extractPostsFromIncluded(data.included || [], limit);
      
      return {
        content: [{
          type: "text",
          text: `Retrieved ${posts.length} posts from LinkedIn feed:\n\n${JSON.stringify(posts, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to get feed: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});