'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposables = [
        vscode.commands.registerCommand('dufflecoat.generate', generate)
    ];

    context.subscriptions.push(...disposables);
}

function generate(target?: any) {
    vscode.window.showInformationMessage(`${target}`);
}
