'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

import { promptBundle, fileBundleSelection, repoBundleSelection, BundleSelection, parseNameOnly } from './utils/bundleselection';
import { RepoBundle, RepoBundleRef } from './duffle/duffle.objectmodel';

export function activate(context: vscode.ExtensionContext) {
    const disposables = [
        vscode.commands.registerCommand('dufflecoat.generate', generate)
    ];

    context.subscriptions.push(...disposables);
}

async function generate(target?: any): Promise<void> {
    if (!target) {
        return await generatePrompted();
    }
    if (target.scheme) {
        return await generateFile(target as vscode.Uri);
    }
    if (target.bundle) {
        return await generateRepoBundle((target as RepoBundleRef).bundle);
    }
    await vscode.window.showErrorMessage("Internal error: unexpected command target");
}

async function generatePrompted(): Promise<void> {
    const bundlePick = await promptBundle("Select the bundle to install");

    if (!bundlePick) {
        return;
    }

    return await generateCore(bundlePick);
}

async function generateFile(file: vscode.Uri): Promise<void> {
    if (file.scheme !== 'file') {
        vscode.window.showErrorMessage("This command requires a filesystem bundle");
        return;
    }
    return await generateCore(fileBundleSelection(file));
}

async function generateRepoBundle(bundle: RepoBundle): Promise<void> {
    return await generateCore(repoBundleSelection(bundle));
}

async function generateCore(bundlePick: BundleSelection): Promise<void> {
    const name = safeName(bundlePick.label);

    const parentFolders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Generate"
    });

    if (!parentFolders || parentFolders.length === 0) {
        return;
    }

    const parentFolder = parentFolders[0].fsPath;
    const folder = path.join(parentFolder, name);

    // create the self-installer framework under the parent folder
    // copy the bundle JSON into ${folder}/data/bundle.json
    // fix up the package.json and other places where the bundle name is hardwired
    await vscode.window.showInformationMessage(folder);

    // const manifest = await bundleManifest(bundlePick);
    // if (failed(manifest)) {
    //     vscode.window.showErrorMessage(`Unable to load bundle: ${manifest.error[0]}`);
    //     return;
    // }

    // const credentialSet = await promptForCredentials(manifest.result, shell.shell, 'Credential set to install bundle with');
    // if (credentialSet.cancelled) {
    //     return;
    // }

    // const parameterValues = await promptForParameters(bundlePick, manifest.result, 'Install', 'Enter installation parameters');
    // if (parameterValues.cancelled) {
    //     return;
    // }

    // const installResult = await installTo(bundlePick, name, parameterValues.value, credentialSet.value);

    // if (succeeded(installResult)) {
    //     await refreshBundleExplorer();
    // }

    // await showDuffleResult('install', (bundleId) => bundleId, installResult);
}

const GENERATE_NAME_ILLEGAL_CHARACTERS = /[^A-Za-z0-9_-]/g;

function safeName(bundleName: string): string {
    const baseName = parseNameOnly(bundleName);
    return baseName.replace(GENERATE_NAME_ILLEGAL_CHARACTERS, '-');
}
