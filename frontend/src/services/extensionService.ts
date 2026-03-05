import { apiClient, terminalClient } from '@/services/api';
import { Extension } from '@/types/extension';

// Registry of dynamically injected extension commands
const extensionCommandRegistry = new Map<string, { title: string; extensionId: string }>();

export function getExtensionCommands() {
    return Array.from(extensionCommandRegistry.entries()).map(([id, meta]) => ({
        id,
        title: meta.title,
        extensionId: meta.extensionId,
    }));
}

export const extensionService = {
    /** Fetch all registered native extensions */
    async getAll(): Promise<Extension[]> {
        const response = await apiClient.get<Extension[]>('/extensions');
        return response.data;
    },

    /** Fetch all imported VS Code extensions */
    async getImported(): Promise<Extension[]> {
        try {
            const response = await terminalClient.get<Extension[]>('/vscode-extensions/imported');
            return response.data;
        } catch (e) {
            console.error('[ExtensionService] Failed to fetch imported extensions:', e);
            return [];
        }
    },

    /** Fetch detailed info for a VS Code extension */
    async getVSCodeDetails(id: string): Promise<any> {
        const response = await terminalClient.get(`/vscode-extensions/${id}/details`);
        return response.data;
    },

    /** Extract command contributions from an extension's package.json */
    getContributes(packageJson: any): Array<{ command: string; title: string; category?: string }> {
        const contributes = packageJson?.contributes;
        if (!contributes?.commands) return [];
        return Array.isArray(contributes.commands) ? contributes.commands : [];
    },

    /**
     * Activate an extension — reads its contributed commands and registers them
     * into the extensionCommandRegistry so they appear in the Command Palette.
     */
    async activateExtension(extensionId: string): Promise<string[]> {
        const registeredIds: string[] = [];
        try {
            const details = await this.getVSCodeDetails(extensionId);
            const commands = this.getContributes(details.packageJson);

            commands.forEach((cmd: { command: string; title: string; category?: string }) => {
                const commandId = cmd.command || `ext.${extensionId}.${cmd.title}`;
                const title = cmd.category ? `${cmd.category}: ${cmd.title}` : cmd.title;
                extensionCommandRegistry.set(commandId, { title, extensionId });
                registeredIds.push(commandId);
                console.log(`[ExtensionService] Registered command: ${commandId}`);
            });
        } catch (e) {
            console.error(`[ExtensionService] Failed to activate ${extensionId}:`, e);
        }
        return registeredIds;
    },

    /** Enable an extension by ID */
    async enable(id: string): Promise<Extension> {
        const response = await apiClient.post<Extension>(`/extensions/${id}/enable`);
        return response.data;
    },

    /** Disable an extension by ID */
    async disable(id: string): Promise<Extension> {
        const response = await apiClient.post<Extension>(`/extensions/${id}/disable`);
        return response.data;
    },

    /** Delete/Uninstall an imported extension */
    async uninstall(id: string): Promise<void> {
        await terminalClient.delete('/vscode-extensions/import', { data: { ids: [id] } });
    }
};

