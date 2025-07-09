#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const MIXPANEL_API_BASE = "https://data.mixpanel.com/api/2.0/export";

interface MixpanelConfig {
  username: string;
  secret: string;
  projectId?: string;
}

class MixpanelServer {
  private server: McpServer;
  private config: MixpanelConfig;

  constructor(config: MixpanelConfig) {
    this.config = config;
    this.server = new McpServer({
      name: "mixpanel-mcp",
      version: "1.0.0",
    });

    this.initializeTools();
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.secret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async fetchMixpanelData(params: Record<string, string>): Promise<any[]> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) searchParams.append(key, value);
    }
    if (this.config.projectId) {
      searchParams.append('project_id', this.config.projectId);
    }

    const url = `${MIXPANEL_API_BASE}?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'text/plain',
        'authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Mixpanel API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text.trim().split('\n').map(line => JSON.parse(line));
  }

  private initializeTools() {
    // Tool for exporting event data with filters
    this.server.tool(
      "export-events",
      "Export Mixpanel event data with optional filters",
      {
        fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
        toDate: z.string().describe("End date in YYYY-MM-DD format"),
        event: z.string().optional().describe("Specific event name to filter by"),
        where: z.string().optional().describe("Filter expression for events"),
        limit: z.number().optional().describe("Maximum number of events to return"),
        timeInMs: z.boolean().optional().describe("Return timestamps in milliseconds")
      },
      async ({ fromDate, toDate, event, where, limit, timeInMs }) => {
        try {
          const params: Record<string, string> = {
            from_date: fromDate,
            to_date: toDate,
          };
          
          if (event) params.event = JSON.stringify([event]);
          if (where) params.where = where;
          if (limit) params.limit = limit.toString();
          if (timeInMs) params.time_in_ms = timeInMs.toString();

          const data = await this.fetchMixpanelData(params);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(data, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    );
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Check for required environment variables
const username = process.env.MIXPANEL_USERNAME;
const secret = process.env.MIXPANEL_SECRET;
const projectId = process.env.MIXPANEL_PROJECT_ID;

if (!username || !secret) {
  console.error("Error: MIXPANEL_USERNAME and MIXPANEL_SECRET environment variables are required");
  process.exit(1);
}

// Start the server
const server = new MixpanelServer({
  username,
  secret,
  projectId
});

server.start().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});