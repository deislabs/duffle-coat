import * as vscode from 'vscode';

export async function selectQuickPick<T extends vscode.QuickPickItem>(items: T[], options?: vscode.QuickPickOptions): Promise<T | undefined> {
    if (items.length === 1) {
        return items[0];
    }
    return await vscode.window.showQuickPick(items, options);
}
