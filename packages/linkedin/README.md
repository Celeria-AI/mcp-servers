# LinkedIn MCP Server

A Model Context Protocol (MCP) server for interacting with LinkedIn's content through their internal Voyager API.

## Features

- **Search Posts**: Search LinkedIn posts by keywords
- **Get Feed**: Retrieve posts from your LinkedIn feed
- **Pagination**: Support for paginated results
- **Cookie-based Authentication**: Uses browser cookies for authentication

## Installation

```bash
npm install @celeria-ai/linkedin-mcp
```

## Configuration

Set your LinkedIn cookies as an environment variable:

```bash
export LINKEDIN_COOKIES="your_linkedin_cookies_here"
```

### Getting LinkedIn Cookies

1. Log into LinkedIn in your browser
2. Open Developer Tools (F12)
3. Go to the Network tab and refresh the page
4. Find any request to linkedin.com
5. Copy the entire `Cookie` header value

## Usage

### Available Tools

#### `search-posts`
Search for LinkedIn posts by keywords.

**Parameters:**
- `query` (string): Search query for LinkedIn posts
- `limit` (number, optional): Maximum number of posts to return (default: 10)
- `start` (number, optional): Starting position for pagination (default: 0)

**Example:**
```json
{
  "query": "AI agents",
  "limit": 5
}
```

#### `get-feed`
Retrieve posts from your LinkedIn feed.

**Parameters:**
- `limit` (number, optional): Maximum number of posts to return (default: 10)
- `start` (number, optional): Starting position for pagination (default: 0)

**Example:**
```json
{
  "limit": 10
}
```


## Response Format

All tools return posts in the following format:

```json
{
  "author": "Author Name",
  "content": "Post content (truncated to 500 characters)",
  "time": "Post timestamp",
  "urn": "LinkedIn URN identifier"
}
```

## Environment Variables

- `LINKEDIN_COOKIES` (required): Your LinkedIn session cookies

## Cookie Lifespan

LinkedIn cookies typically last 1-2 years for main session cookies like `li_at`. You'll need to refresh them when they expire.

## Notes

- This server uses LinkedIn's internal Voyager API
- Rate limiting may apply based on LinkedIn's policies
- Cookie-based authentication is required for access
- Different search limits may return different result sets due to LinkedIn's search algorithm

## Development

```bash
# Install dependencies
pnpm install

# Build the server
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT