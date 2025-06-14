#!/usr/bin/env node
// ABOUTME: Ultra-minimalist coding agent with Anthropic API and bash tool
// ABOUTME: Provides conversational interface for code assistance using only bash commands

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

class MiniAgent {
  private anthropic: Anthropic;
  private conversation: Anthropic.MessageParam[] = [];

  constructor() {
    const apiKey = this.getApiKey();
    this.anthropic = new Anthropic({ apiKey });
  }

  private getApiKey(): string {
    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_KEY environment variable is required');
      process.exit(1);
    }
    return apiKey;
  }

  private async executeBash(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      return stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
    } catch (error: any) {
      return `Error: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`;
    }
  }

  private async callClaude(userMessage: string): Promise<string> {
    this.conversation.push({ role: 'user', content: userMessage });

    const tools = [{
      name: 'bash',
      description: 'Execute bash commands',
      input_schema: {
        type: 'object' as const,
        properties: { command: { type: 'string' } },
        required: ['command']
      }
    }];

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a coding assistant. Use the bash tool to help with programming tasks.',
      messages: this.conversation,
      tools,
    });

    this.conversation.push({ role: 'assistant', content: response.content });

    // Execute any tool calls
    for (const content of response.content) {
      if (content.type === 'tool_use' && content.name === 'bash') {
        const input = content.input as { command: string };
        console.log(`\n🔧 Running: ${input.command}`);
        const output = await this.executeBash(input.command);
        console.log(output);
        
        this.conversation.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: content.id, content: output }]
        });
        
        // Get final response after tool execution
        return await this.callClaude('');
      }
    }

    // Return text response
    return response.content.find(c => c.type === 'text')?.text || '';
  }

  async start() {
    console.log('🤖 Mini Agent started. Type "exit" to quit.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = () => {
      rl.question('> ', async (input) => {
        if (input.toLowerCase() === 'exit') {
          rl.close();
          return;
        }

        if (input.trim()) {
          const response = await this.callClaude(input);
          console.log(`\n${response}\n`);
        }
        
        prompt();
      });
    };

    prompt();
  }
}

const agent = new MiniAgent();
agent.start().catch(console.error);