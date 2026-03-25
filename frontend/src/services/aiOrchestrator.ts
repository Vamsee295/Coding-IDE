export interface AIAction {
  type: "write_file" | "writeFile" | "create_file" | "createFile" | "run_command" | "runCommand" | "delete_file" | "deleteFile" | "rename_file" | "read_file" | "readFile" | "applyDiff";
  path?: string;
  content?: string;
  command?: string;
  newPath?: string;      // for rename_file
  diff?: string;         // for applyDiff
}

export type AgentMode = 'default' | 'explain' | 'debug' | 'refactor' | 'autonomous';

export const aiOrchestrator = {
    /**
     * Scans a text response for JSON action blocks.
     */
    parseActions(text: string): AIAction[] {
        const actions: AIAction[] = [];
        const blockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
        let match;
        let foundJson = false;

        while ((match = blockRegex.exec(text)) !== null) {
            foundJson = true;
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && Array.isArray(parsed.actions)) {
                    actions.push(...parsed.actions);
                }
            } catch (e) {
                console.error("Failed to parse AI action JSON block:", e);
            }
        }

        if (!foundJson && text.trim().startsWith('{') && text.trim().endsWith('}')) {
             try {
                const parsed = JSON.parse(text.trim());
                if (parsed && Array.isArray(parsed.actions)) {
                     actions.push(...parsed.actions);
                }
             } catch (e) {}
        }
        
        // Map camelCase to snake_case for legacy compatibility if needed, 
        // though agentService now handles both.
        return actions.map(a => ({
          ...a,
          type: (a.type as string).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() as any
        }));
    },



    /**
     * Removes all <ai_action> blocks from the text to provide a clean chat response.
     */
    stripActions(text: string): string {
        // Remove markdown JSON blocks that hold actions, or purely JSON output
        const stripped = text
            .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
            .replace(/^\{[\s\S]*?\}$/g, "")
            .trim();
            
        // Final cleanup for common AI response boilerplate if it's the only thing left
        if (stripped === "undefined" || !stripped) return "I've processed your request.";
        return stripped;
    },

    /**
     * The Master System Prompt that tells the AI how to use the Action Protocol.
     * Customized based on the selected Agent Mode.
     */
    getSystemPrompt(mode: AgentMode = 'default'): string {
        let basePrompt = `You are a Cursor-like AI Assistant deeply integrated into the OLLAMA AI IDE.\n`;

        switch (mode) {
            case 'explain':
                basePrompt += `You are a specialized CODE EXPLAINER AGENT. Your primary job is to break down complex code logic into easy-to-understand explanations. Be highly educational and clear. DO NOT output JSON action blocks unless requested.`;
                break;
            case 'debug':
                basePrompt += `You are a specialized DEBUGGER AGENT. Your primary job is to find bugs, fix errors, and ensure stability. Focus on edge cases and correctness. Use the JSON action protocol to fix code via applyDiff.`;
                break;
            case 'refactor':
                basePrompt += `You are a specialized REFACTORER AGENT. Your primary job is to clean, optimize, and modernize code. Focus on performance, aesthetics, and architectural best practices. Use the JSON action protocol.`;
                break;
            default:
                basePrompt += `You can modify files and run commands by outputting a strict JSON action block.`;
                break;
        }

        return `${basePrompt}

PROTOCOL:
You MUST respond with a single JSON block wrapped in \`\`\`json. Do NOT include any text outside this block if you are taking actions.

Tools:
- readFile (path)
- applyDiff (path, diff) -> diff must be a standard Unified Diff format! ALWAYS PREFER THIS over writeFile.
- createFile (path, content)
- writeFile (path, content) -> completely overrides a file. Rarely use this.
- runCommand (command)

\`\`\`json
{
  "mode": "agent",
  "plan": "short explanation of what you will do in this step",
  "actions": [
    {
      "type": "readFile",
      "path": "src/App.tsx"
    },
    {
      "type": "applyDiff",
      "path": "src/App.tsx",
      "diff": "--- a/src/App.tsx\\n+++ b/src/App.tsx\\n@@ -1,3 +1,4 @@\\n+import { NewComponent } from './NewComponent';\\n..."
    }
  ],
  "finalMessage": "Optional user-facing message. Leave empty if you need another iteration."
}
\`\`\`
Only use these JSON blocks when you actually want to perform an action. If you are just explaining code in chat, use standard markdown without the JSON block.`;
    },

    /**
     * Smart Context Gatherer (Cursor-like behavior)
     * Auto-selects active files, recent errors, and surrounding context.
     */
    gatherContext(activeTab: any, recentFiles: any[], terminalErrors: string[]): string {
        let ctx = "--- SMART CONTEXT ---\n";
        
        if (activeTab) {
            ctx += `\n[Active File: ${activeTab.path || activeTab.name}]\n`;
            ctx += `\`\`\`${activeTab.language || 'text'}\n${activeTab.content}\n\`\`\`\n`;
        }
        
        if (recentFiles && recentFiles.length > 0) {
            ctx += `\n[Recently Edited Files]\n`;
            recentFiles.slice(0, 3).forEach(f => {
               if (f.id !== activeTab?.id) {
                 ctx += `- ${f.path || f.name}\n`;
               }
            });
        }
        
        if (terminalErrors && terminalErrors.length > 0) {
            ctx += `\n[Recent Terminal Errors]\n`;
            ctx += terminalErrors.slice(-3).join('\n') + '\n';
        }
        
        return ctx + "----------------------\n";
    }
};
