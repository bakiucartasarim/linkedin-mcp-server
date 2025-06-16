#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const server = new Server(
  {
    name: 'mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the input text',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to echo back',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'get_time',
        description: 'Get the current time',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'linkedin_post',
        description: 'Share a post on LinkedIn',
        inputSchema: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'LinkedIn access token for authentication',
            },
            content: {
              type: 'string',
              description: 'Content of the post to share',
            },
            visibility: {
              type: 'string',
              description: 'Post visibility (PUBLIC, CONNECTIONS, LOGGED_IN_MEMBERS)',
              enum: ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN_MEMBERS'],
              default: 'PUBLIC',
            },
          },
          required: ['accessToken', 'content'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'echo':
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.text}`,
          },
        ],
      };

    case 'get_time':
      return {
        content: [
          {
            type: 'text',
            text: `Current time: ${new Date().toISOString()}`,
          },
        ],
      };

    case 'linkedin_post':
      try {
        const { accessToken, content, visibility = 'PUBLIC' } = args;
        
        // First, get the user's profile to get the person URN
        const profileResponse = await axios.get('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const personUrn = profileResponse.data.id;
        
        // Create the post
        const postData = {
          author: `urn:li:person:${personUrn}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility,
          },
        };

        const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `LinkedIn post shared successfully! Post ID: ${response.data.id}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to share LinkedIn post: ${errorMessage}`
        );
      }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});