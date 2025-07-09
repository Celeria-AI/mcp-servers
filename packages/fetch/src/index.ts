#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const server = new McpServer({
  name: "fetch",
  version: "1.0.0",
});

const DEFAULT_USER_AGENT_AUTONOMOUS = "ModelContextProtocol/1.0 (Autonomous; +https://github.com/modelcontextprotocol/servers)";
const DEFAULT_USER_AGENT_MANUAL = "ModelContextProtocol/1.0 (User-Specified; +https://github.com/modelcontextprotocol/servers)";

// Extract and convert HTML content to Markdown format
function extractContentFromHtml(html: string): string {
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Use Readability to extract main content
    const reader = new Readability(doc, {
      debug: false,
      maxElemsToParse: 0, // no limit
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: [],
      keepClasses: false,
    });
    
    const article = reader.parse();
    
    if (!article || !article.content) {
      return "<error>Page failed to be simplified from HTML</error>";
    }
    
    // Convert to markdown using Turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full'
    });
    
    const markdown = turndownService.turndown(article.content);
    return markdown;
  } catch (error) {
    console.error("Error extracting content:", error);
    return "<error>Failed to extract content from HTML</error>";
  }
}



// Fetch URL and return content
async function fetchUrl(url: string, userAgent: string, forceRaw: boolean = false): Promise<[string, string]> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} - status code ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    const pageRaw = await response.text();
    
    // Check if it's HTML content
    const isPageHtml = pageRaw.substring(0, 100).includes('<html') || 
                       contentType.includes('text/html') || 
                       !contentType;
    
    if (isPageHtml && !forceRaw) {
      const content = extractContentFromHtml(pageRaw);
      return [content, ""];
    }
    
    return [
      pageRaw,
      `Content type ${contentType} cannot be simplified to markdown, but here is the raw content:\n`
    ];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
    throw new Error(`Failed to fetch ${url}: ${error}`);
  }
}

// Tool to fetch web content
server.registerTool(
  "fetch",
  {
    title: "Fetch URL",
    description: "Fetches a URL from the internet and extracts its contents as markdown. Can handle HTML pages, JSON APIs, and other web content.",
    inputSchema: {
      url: z.string().url().describe("The URL to fetch content from"),
      max_length: z.number().min(1).max(1000000).optional().default(5000).describe("Maximum number of characters to return"),
      start_index: z.number().min(0).optional().default(0).describe("Starting character index for content extraction, useful for pagination"),
      raw: z.boolean().optional().default(false).describe("If true, returns raw HTML instead of converted markdown"),
    }
  },
  async ({ url, max_length, start_index, raw }) => {
    try {
      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }


      // Fetch the content
      const [content, prefix] = await fetchUrl(url, DEFAULT_USER_AGENT_AUTONOMOUS, raw);
      
      const originalLength = content.length;
      let finalContent: string;
      
      if (start_index >= originalLength) {
        finalContent = "<error>No more content available.</error>";
      } else {
        const truncatedContent = content.slice(start_index, start_index + max_length);
        if (!truncatedContent) {
          finalContent = "<error>No more content available.</error>";
        } else {
          finalContent = truncatedContent;
          const actualContentLength = truncatedContent.length;
          const remainingContent = originalLength - (start_index + actualContentLength);
          
          // Only add continuation prompt if there's more content
          if (actualContentLength === max_length && remainingContent > 0) {
            const nextStart = start_index + actualContentLength;
            finalContent += `\n\n<error>Content truncated. Call the fetch tool with a start_index of ${nextStart} to get more content.</error>`;
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: `${prefix}Contents of ${url}:\n${finalContent}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Failed to fetch content: ${(error as Error).message}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Fetch MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});