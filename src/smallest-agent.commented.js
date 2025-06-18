// ABOUTME: Ultra-minimal AI agent that connects Claude to bash commands  
// ABOUTME: Provides interactive CLI for AI-assisted coding (exit with Ctrl+C)

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import * as readline from "readline";

// Main loop: get user input and process with Claude
for (
  let userInput,
    // Initialize Claude client and conversation state
    anthropic = new Anthropic({ apiKey: process.env.API_KEY }),
    conversation = [], // Chat history for context
    log = console.log, // Alias for shorter code
    addMessage = (role, content) => conversation.push({ role, content }), // Helper for adding messages
    rl = readline.createInterface({ input: process.stdin, output: process.stdout }); // CLI interface
  (userInput = await new Promise((resolve) => rl.question("> ", resolve))); // Get user input

)
  // Inner loop: process Claude's response and handle tool calls
  for (addMessage("user", userInput); ; ) {
    // Get response from Claude with bash tool capability
    let { content: responseContent } = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4e3,
        messages: conversation,
        system: "Coder w/ bash", // Brief system prompt
        tools: [
          {
            name: "bash",
            description: "sh", // Minimal description
            input_schema: {
              type: "object",
              properties: { cmd: { type: "string" } },
            },
          },
        ],
      }),
      // Check if Claude wants to use the bash tool
      tool = responseContent.find((item) => "tool_use" == item.type);
    
    // Add Claude's response to conversation and check if we need to run a command
    if ((addMessage("assistant", responseContent), !tool)) {
      // No tool use - just display Claude's text response and get next input
      log(responseContent.find((item) => "text" == item.type)?.text);
      break;
    }
    
    // Execute the bash command Claude requested
    log("🔧", tool.input.cmd); // Show command being executed
    try {
      var output = execSync(tool.input.cmd) + ""; // Execute synchronously and convert to string
    } catch (error) {
      output = "❌" + error.message; // Capture execution errors
    }
    
    // Log the command output and send result back to Claude
    log(output),
      addMessage("user", [{ type: "tool_result", tool_use_id: tool.id, content: output }]);
  }
