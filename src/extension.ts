'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

import { promptBundle, fileBundleSelection, repoBundleSelection, BundleSelection, parseNameOnly, bundleManifest } from './utils/bundleselection';
import { RepoBundle, RepoBundleRef, BundleManifest } from './duffle/duffle.objectmodel';
import { downloadZip, downloadTar } from './utils/download';
import { failed, Errorable } from './utils/errorable';
import { fs } from './utils/fs';
import { Cancellable, cancelled, accepted } from './utils/cancellable';
import { longRunning } from './utils/host';

// TODO: We won't be able to use this for real - I had to rework the zip file structure
// to not include a top-level directory called duffle-bag-pathfinding.  And fs.rename
// was refusing to let me unzip to a temp location and move that directory to the desired
// location.  So a bit more digging needed.
// const DUFFLE_BAG_ZIP_LOCATION = "https://github.com/itowlson/duffle-bag/archive/pathfinding.zip";
const DUFFLE_BAG_ZIP_LOCATION = "https://itowlsonmsbatest.blob.core.windows.net/dbag/duffle-bag-edb.zip";

export function activate(context: vscode.ExtensionContext) {
    const disposables = [
        vscode.commands.registerCommand('dufflecoat.generate', generate)
    ];

    context.subscriptions.push(...disposables);
}

type Platform = 'windows' | 'darwin' | 'linux';
const PLATFORMS: Platform[] = ['windows', 'darwin', 'linux'];

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

    const bundleInfo = await bundleManifest(bundlePick);
    if (failed(bundleInfo)) {
        vscode.window.showErrorMessage(bundleInfo.error[0]);
        return;
    }

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
    const suggestedFolder = path.join(parentFolder, name);

    const g = await getGenerationOption(suggestedFolder);
    if (g.cancelled) {
        return;
    }

    const { action, folder } = g.value;

    if (action === FolderAction.Overwrite) {
        try {
            await longRunning("Removing existing files...", () =>
                fs.remove(folder)
            );
        } catch (e) {
            await vscode.window.showErrorMessage(`Can't overwrite folder ${folder}: ${e}`);
            return;
        }
    }

    if (action === FolderAction.Overwrite || action === FolderAction.New) {
        const dl = await longRunning("Downloading self-installer template...", () =>
            downloadZip(DUFFLE_BAG_ZIP_LOCATION, folder)
        );
        if (failed(dl)) {
            vscode.window.showErrorMessage(`Downloading self-installer template failed: ${dl.error[0]}`);
            return;
        }
    }

    const sb = await setBundle(g.value.folder, bundleInfo.result);
    if (failed(sb)) {
        vscode.window.showErrorMessage(sb.error[0]);
        return;
    }

    const dlbin = await longRunning("Downloading Duffle binaries...", () =>
        downloadDuffleBinaries(g.value.folder)
    );
    if (failed(dlbin)) {
        vscode.window.showErrorMessage(`Downloading Duffle binaries failed: ${dlbin.error[0]}`);
        return;
    }

    const commands = [
        {
            title: "Open in Code",
            onSelected: () => vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folder), true)
        }, {
            title: "Open in Terminal",
            onSelected: () => vscode.window.createTerminal({ cwd: folder }).show()
        }
    ];
    const openAction = await vscode.window.showInformationMessage(`Your self-installer has been generated into ${folder}. Run 'npm install' followed by 'npm run dev' to test.`, ...commands);
    if (openAction) {
        openAction.onSelected();
    }
}

async function setBundle(folder: string, bundle: BundleManifest): Promise<Errorable<null>> {
    const siBundleFile = path.join(folder, "data", "bundle.json");
    // const siRootPackageJSON = path.join(folder, "package.json");  // TODO: do we need to mangle this
    const siAppPackageJSON = path.join(folder, "app", "package.json");
    const siAppHTML = path.join(folder, "app", "app.html");

    try {
        await fs.writeFile(siBundleFile, JSON.stringify(bundle, undefined, 2));
    } catch (e) {
        return { succeeded: false, error: [`Can't write bundle.json to self-installer: ${e}`] };
    }

    try {
        const appPackageJSON = await fs.readFile(siAppPackageJSON, { encoding: 'utf8' });
        const appPackage = JSON.parse(appPackageJSON);
        appPackage.name = `${safeName(bundle.name)}-duffle-self-installer`;
        appPackage.productName = appPackage.name;
        appPackage.description = `Self-installer for the ${bundle.name} CNAB bundle`;
        appPackage.author.name = process.env['USERNAME'] || process.env['USER'] || 'unknown';
        appPackage.author.email = `${appPackage.author.name}@example.com`;
        await fs.writeFile(siAppPackageJSON, JSON.stringify(appPackage, undefined, 2));
    } catch (e) {
        return { succeeded: false, error: [`Can't update self-installer's package.json: ${e}`] };
    }

    try {
        const html = await fs.readFile(siAppHTML, { encoding: 'utf8' });
        const fixedHTML = html.replace('<title>Duffle Bag</title>', `<title>Install ${bundle.name}</title>`);
        await fs.writeFile(siAppHTML, fixedHTML);
    } catch (e) {
        return { succeeded: false, error: [`Can't update self-installer's window title: ${e}`] };
    }

    return { succeeded: true, result: null };
}

async function downloadDuffleBinaries(targetFolder: string): Promise<Errorable<null>> {
    const dufflebinPath = path.join(targetFolder, 'dufflebin');
    const dltasks = PLATFORMS.map((p) => downloadDuffleBinary(dufflebinPath, p));
    const dlresults = await Promise.all(dltasks);
    const firstFail = dlresults.find((r) => failed(r));
    if (firstFail) {
        return firstFail;
    }
    return { succeeded: true, result: null };
}

async function downloadDuffleBinary(dufflebinPath: string, platform: Platform): Promise<Errorable<null>> {
    // TODO: for testing purposes, this is the Draft download location.  It needs to be replaced
    // with the Duffle download location.
    // TODO: make sure this doesn't conflict with having the directories .gitkeep-ed in the template.
    const source = `https://azuredraft.blob.core.windows.net/draft/draft-v0.15.0-${platform}-amd64.tar.gz`;
    return await downloadTar(source, dufflebinPath);
}

enum FolderAction { New, Overwrite, Update }

interface GenerateInto {
    readonly action: FolderAction;
    readonly folder: string;
}

async function getGenerationOption(targetFolder: string): Promise<Cancellable<GenerateInto>> {
    if (!await fs.exists(targetFolder)) {
        return accepted({ action: FolderAction.New, folder: targetFolder });
    }

    const alreadyExistsCommands = [
        {
            title: "Update Bundle Only",
            onSelected: async () => accepted({ action: FolderAction.Update, folder: targetFolder })
        },
        {
            title: "Overwrite Folder",
            onSelected: async () => accepted({ action: FolderAction.Overwrite, folder: targetFolder })
        },
        {
            title: "Use Different Folder",
            onSelected: async () => {
                const parentFolder = path.dirname(targetFolder);
                const subfolder = await vscode.window.showInputBox({ prompt: `Generate into folder (under ${parentFolder})...` });
                if (!subfolder) {
                    return cancelled;
                }
                return await getGenerationOption(path.join(parentFolder, subfolder));
            }
        }
    ];

    const selection = await vscode.window.showWarningMessage(`Folder ${targetFolder} already exists`, ...alreadyExistsCommands);
    if (!selection) {
        return { cancelled: true };
    }
    return await selection.onSelected();
}

const GENERATE_NAME_ILLEGAL_CHARACTERS = /[^A-Za-z0-9_-]/g;

function safeName(bundleName: string): string {
    const baseName = parseNameOnly(bundleName);
    return baseName.replace(GENERATE_NAME_ILLEGAL_CHARACTERS, '-');
}
