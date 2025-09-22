#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { join } from "path";
import { homedir } from "os";

dotenv.config({ path: join(homedir(), "mcp-final", ".env") });

const server = new Server(
  { name: "mcp-integration-hub", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: "weather_get",
    description: "Get weather information",
    inputSchema: {
      type: "object",
      properties: { location: { type: "string" } },
      required: ["location"]
    }
  },
  {
    name: "github_create_repo",
    description: "Create a new GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        private: { type: "boolean", default: false }
      },
      required: ["name"]
    }
  },
  {
    name: "github_list_repos",
    description: "List GitHub repositories",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", description: "GitHub username (optional)" }
      }
    }
  },
  {
    name: "github_push_file",
    description: "Push a file to a GitHub repository",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name" },
        path: { type: "string", description: "File path in repository" },
        content: { type: "string", description: "File content" },
        message: { type: "string", description: "Commit message" }
      },
      required: ["repo", "path", "content", "message"]
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const token = process.env.GITHUB_TOKEN;
  
  if (name === "github_push_file") {
    if (!token) return { content: [{ type: "text", text: "No GitHub token configured" }] };
    
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `token ${token}` }
      });
      const user = await userResponse.json();
      
      const content = Buffer.from(args.content).toString('base64');
      
      const response = await fetch(
        `https://api.github.com/repos/${user.login}/${args.repo}/contents/${args.path}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: args.message,
            content: content,
            branch: 'main'
          })
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message || response.statusText}`
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `✅ File pushed: https://github.com/${user.login}/${args.repo}/blob/main/${args.path}`
        }]
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }] };
    }
  }
  
  if (name === "github_list_repos") {
    if (!token) return { content: [{ type: "text", text: "No GitHub token configured" }] };
    
    const url = args.username 
      ? `https://api.github.com/users/${args.username}/repos`
      : "https://api.github.com/user/repos";
      
    const response = await fetch(url, {
      headers: { "Authorization": `token ${token}` }
    });
    
    const repos = await response.json();
    const repoList = repos.slice(0, 10).map(r => `- ${r.name}: ${r.html_url}`).join("\n");
    
    return { content: [{ type: "text", text: `Repositories:\n${repoList}` }] };
  }
  
  if (name === "weather_get") {
    const response = await fetch(`https://wttr.in/${args.location}?format=j1`);
    const data = await response.json();
    const current = data.current_condition[0];
    return {
      content: [{
        type: "text",
        text: `Weather in ${args.location}: ${current.temp_C}°C, ${current.weatherDesc[0].value}`
      }]
    };
  }
  
  if (name === "github_create_repo") {
    if (!token) return { content: [{ type: "text", text: "No GitHub token configured" }] };
    
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        name: args.name, 
        description: args.description || "", 
        private: args.private || false 
      })
    });
    const data = await response.json();
    return { content: [{ type: "text", text: `Repository created: ${data.html_url}` }] };
  }
  
  return { content: [{ type: "text", text: "Tool not implemented" }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Integration Hub server started - All tools unified");
}

main().catch(console.error);
