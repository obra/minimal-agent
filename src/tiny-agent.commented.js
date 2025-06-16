// ABOUTME: Ultra-minimal AI agent that connects Claude to bash commands
// ABOUTME: Provides interactive CLI interface for AI-assisted coding tasks

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import * as readline from "readline";

// Initialize Claude client and conversation state
const anthropic = new Anthropic({ apiKey: process.env.API_KEY }),
  conversation = [], // Chat history for context
  user_interface = readline.createInterface({ input: process.stdin, output: process.stdout }),
  log = console.log,

// Main agent function - handles user input and tool execution
agent = async userInput => {
  // Add user message to conversation if provided
  userInput && conversation.push({ role: "user", content: userInput });
  
  // Get response from Claude with bash tool capability
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4e3,
    messages: conversation,
    system: "Coder w/ bash", // Brief system prompt
    tools: [
      {
        name: "bash",
        description: "sh",
        input_schema: {
          type: "object",
          properties: { cmd: { type: "string" } },
        },
      },
    ],
  });
  
  // Add Claude's response to conversation
  conversation.push({ role: "assistant", content: response.content });
  
  // Process any tool calls in the response
  for (let tool of response.content)
    if (tool.type == "tool_use") {
      log("🔧", tool.input.cmd); // Show command being executed
      try {
        var output = execSync(tool.input.cmd).toString(); // Execute synchronously
      } catch (x) {
        output = "❌" + x.message; // Capture errors
      }
      log(output);
      
      // Send tool result back to Claude
      conversation.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: tool.id, content: output }],
      });
      
      return agent(); // Recursively continue conversation
    }
   
   // Return text response if no tools were used
   return response.content.find(tool => tool.type == "text")?.text;
}

// Main loop - get user input and process with agent (exit with Ctrl+C)
let input;
while (input = await new Promise(resolve => user_interface.question("> ", resolve))) {
  log(await agent(input));
}
