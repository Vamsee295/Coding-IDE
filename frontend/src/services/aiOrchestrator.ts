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

            // Extract delete_file
            const deleteFileRegex = /<delete_file\s+path="([^"]+)"\s*\/>/g;
            let deleteMatch;
            while ((deleteMatch = deleteFileRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "delete_file",
                    path: deleteMatch[1]
                });
            }

            // Extract rename_file
            const renameFileRegex = /<rename_file\s+from="([^"]+)"\s+to="([^"]+)"\s*\/>/g;
            let renameMatch;
            while ((renameMatch = renameFileRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "rename_file",
                    path: renameMatch[1],
                    newPath: renameMatch[2]
                });
            }

            // Extract insert_at_line
            const insertAtLineRegex = /<insert_at_line\s+path="([^"]+)"\s+line="(\d+)">([\s\S]*?)<\/insert_at_line>/g;
            let insertMatch;
            while ((insertMatch = insertAtLineRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "insert_at_line",
                    path: insertMatch[1],
                    line: parseInt(insertMatch[2], 10),
                    content: insertMatch[3].trim()
                });
            }

            // Extract replace_range
            const replaceRangeRegex = /<replace_range\s+path="([^"]+)"\s+from="(\d+)"\s+to="(\d+)">([\s\S]*?)<\/replace_range>/g;
            let rangeMatch;
            while ((rangeMatch = replaceRangeRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "replace_range",
                    path: rangeMatch[1],
                    fromLine: parseInt(rangeMatch[2], 10),
                    toLine: parseInt(rangeMatch[3], 10),
                    content: rangeMatch[4].trim()
                });
            }

            // Extract read_file (injects file content as context)
            const readFileRegex = /<read_file\s+path="([^"]+)"\s*\/>/g;
            let readMatch;
            while ((readMatch = readFileRegex.exec(blockContent)) !== null) {
                actions.push({
                    type: "read_file",
                    path: readMatch[1]
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
        // First, remove action blocks (potentially wrapped in code fences)
        const stripped = text
            .replace(/```[a-z]*\n\s*<ai_action>[\s\S]*?<\/ai_action>\s*\n```/g, "")
            .replace(/<ai_action>[\s\S]*?<\/ai_action>/g, "")
            .trim();
            
        // Final cleanup for common AI response boilerplate if it's the only thing left
        if (stripped === "undefined" || !stripped) return "I've processed your request.";
        return stripped;
    },

    /**
     * The Master System Prompt that tells the AI how to use the Action Protocol.
     */
    getSystemPrompt(): string {
        return `You are an AI Coding Assistant deeply integrated into the OLLAMA AI IDE.
You can modify files and run commands by wrapping your actions in special XML-like tags.
Always provide a brief explanation of what you are doing before or after the action block.

PROTOCOL:
To create or overwrite a file entirely:
<ai_action>
  <write_file path="relative/path/to/file.ts">
  // Entire file content here
  </write_file>
</ai_action>

To insert lines at a specific line number:
<ai_action>
  <insert_at_line path="src/index.ts" line="10">
  // Content to insert
  </insert_at_line>
</ai_action>

To replace a range of lines (from inclusive, to inclusive):
<ai_action>
  <replace_range path="src/index.ts" from="5" to="10">
  // Replacement content
  </replace_range>
</ai_action>

To delete a file:
<ai_action>
  <delete_file path="src/old-file.ts" />
</ai_action>

To rename or move a file:
<ai_action>
  <rename_file from="src/old.ts" to="src/new.ts" />
</ai_action>

To read a file into context:
<ai_action>
  <read_file path="src/config.ts" />
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
