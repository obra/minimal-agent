import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import * as readline from "readline";
for (
  let userInput,
    anthropic = new Anthropic({ apiKey: process.env.API_KEY }),
    conversation = [],
    log = console.log,
    addMessage = (role, content) => conversation.push({ role, content }),
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  (userInput = await new Promise((resolve) => rl.question("> ", resolve)));

)
  for (addMessage("user", userInput); ; ) {
    let { content: responseContent } = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4e3,
        messages: conversation,
        system: "Coder w/ bash",
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
      }),
      tool = responseContent.find((item) => "tool_use" == item.type);
    if ((addMessage("assistant", responseContent), !tool)) {
      log(responseContent.find((item) => "text" == item.type)?.text);
      break;
    }
    log("🔧", tool.input.cmd);
    try {
      var output = execSync(tool.input.cmd) + "";
    } catch (error) {
      output = "❌" + error.message;
    }
    log(output),
      addMessage("user", [{ type: "tool_result", tool_use_id: tool.id, content: output }]);
  }
