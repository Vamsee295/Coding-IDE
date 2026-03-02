import { AIAction } from "../react-app/types/ide";

export const aiOrchestrator = {
    /**
     * Scans a text response for <ai_action> blocks and returns an array of actions.
     */
    parseActions(text: string): AIAction[] {
        const actions: AIAction[] = [];

        // Regex to find <ai_action>...</ai_action> blocks
        const actionBlockRegex = /<ai_action>([\s\S]*?)<\/ai_action>/g;
        let match;

        while ((match = actionBlockRegex.exec(text)) !== null) {
            const blockContent = match[1];

            // Extract write_file
            const writeFileRegex = /<write_file\s+path="([^"]+)">([\s\S]*?)<\/write_file>/g;
            let fileMatch;
            while ((fileMatch = writeFileRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "write_file",
                    path: fileMatch[1],
                    content: fileMatch[2].trim()
                });
            }

            // Extract create_file
            const createFileRegex = /<create_file\s+path="([^"]+)">([\s\S]*?)<\/create_file>/g;
            let createMatch;
            while ((createMatch = createFileRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "create_file",
                    path: createMatch[1],
                    content: createMatch[2].trim()
                });
            }

            // Extract run_command
            const runCommandRegex = /<run_command>([\s\S]*?)<\/run_command>/g;
            let commandMatch;
            while ((commandMatch = runCommandRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "run_command",
                    command: commandMatch[1].trim()
                });
            }
        }

        return actions;
    },

    /**
     * Removes all <ai_action> blocks from the text to provide a clean chat response.
     */
    stripActions(text: string): string {
        return text.replace(/<ai_action>[\s\S]*?<\/ai_action>/g, "").trim();
    },

    /**
     * The Master System Prompt that tells the AI how to use the Action Protocol.
     */
    getSystemPrompt(): string {
        return `You are an AI Coding Assistant deeply integrated into the StackFlow IDE.
You can modify files and run commands by wrapping your actions in special XML-like tags.
Always provide a brief explanation of what you are doing before or after the action block.

PROTOCOL:
To modify or create a file:
<ai_action>
  <write_file path="relative/path/to/file.ts">
  // Entire file content here
  </write_file>
</ai_action>

To run a terminal command:
<ai_action>
  <run_command>
  npm install axios
  </run_command>
</ai_action>

You can combine multiple actions in one <ai_action> block.
Only use these tags when you actually want to perform an action.
If you are just explaining code, use standard markdown.`;
    }
};
