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
    try {
      const keyPath = join(homedir(), '.lace', 'api-keys', 'anthropic');
      return readFileSync(keyPath, 'utf8').trim();
    } catch (error) {
      console.error('Failed to read API key from ~/.lace/api-keys/anthropic');
      process.exit(1);
    }
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

    const systemPrompt = `You are a coding assistant with access to bash commands. 
You can help with any programming task by executing bash commands.

When you need to run a command, format it like this:
BASH: command_here

I will execute the command and return the result. You can then respond based on the output.
You can run multiple commands by including multiple BASH: lines in your response.

Be concise and practical. Focus on solving the user's problem efficiently.`;

    return await this.processClaudeResponse(systemPrompt);
  }

  private async processClaudeResponse(systemPrompt: string): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: this.conversation,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      let responseText = content.text;
      
      // Check if Claude wants to run a bash command
      const bashMatch = responseText.match(/BASH:\s*(.+)$/m);
      if (bashMatch) {
        const command = bashMatch[1].trim();
        console.log(`\n🔧 Running: ${command}`);
        
        const output = await this.executeBash(command);
        console.log(output);
        
        // Add this response and command output to conversation
        this.conversation.push({ role: 'assistant', content: responseText });
        this.conversation.push({ role: 'user', content: `Command output:\n${output}` });
        
        // Recursively process Claude's response to the command output
        return await this.processClaudeResponse(systemPrompt);
      }

      // No more bash commands, return final response
      this.conversation.push({ role: 'assistant', content: responseText });
      return responseText;
    } catch (error: any) {
      return `Error calling Claude: ${error.message}`;
    }
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