import * as vscode from 'vscode';
import * as path from 'path';
import mkdirp = require('mkdirp');

import { fs } from './fs';
import { shell } from './shell';
import { Errorable, failed } from './errorable';

export interface ExtensionFileCache {
    contains(key: string): Promise<boolean>;
    copyFromCache(key: string, destinationFile: string): Promise<Errorable<null>>;
    copyToCache(key: string, sourceFile: string): Promise<Errorable<null>>;
}

export namespace ExtensionFileCache {
    export function create(context: vscode.ExtensionContext, cacheName: string): ExtensionFileCache {
        return {
            contains: (key) => contains(context, cacheName, key),
            copyFromCache: (key, destinationFile) => copyFromCache(context, cacheName, key, destinationFile),
            copyToCache: (key, sourceFile) => copyToCache(context, cacheName, key, sourceFile),
        };
    }
}

async function contains(context: vscode.ExtensionContext, cacheName: string, key: string): Promise<boolean> {
    const filePath = cacheFileName(context, cacheName, key);
    return await fs.exists(filePath);
}

async function copyFromCache(context: vscode.ExtensionContext, cacheName: string, key: string, destinationFile: string): Promise<Errorable<null>> {
    const filePath = cacheFileName(context, cacheName, key);
    if (await fs.exists(filePath)) {
        try {
            await fs.copyFile(filePath, destinationFile);
            return { succeeded: true, result: null };
        } catch (err) {
            return { succeeded: false, error: [`${err}`] };
        }
    }
    return { succeeded: false, error: ['File not present in cache'] };
}

async function copyToCache(context: vscode.ExtensionContext, cacheName: string, key: string, sourceFile: string): Promise<Errorable<null>> {
    const cachePathResult = await ensureCachePath(context, cacheName);
    if (failed(cachePathResult)) {
        return cachePathResult;
    }
    const fileName = cacheFileName(context, cacheName, key);
    try {
        await fs.copyFile(sourceFile, fileName);
        return { succeeded: true, result: null };
    } catch (err) {
        return { succeeded: false, error: [`${err}`] };
    }
}

function cacheFileName(context: vscode.ExtensionContext, cacheName: string, fileName: string): string {
    return path.join(cacheDirectoryName(context, cacheName), fileName);
}

function cacheDirectoryName(context: vscode.ExtensionContext, cacheName: string): string {
    const baseStoragePath = context.storagePath || path.join(shell.home(), '.duffle-vscode');
    return path.join(baseStoragePath, `cache-${cacheName}`);
}

async function ensureCachePath(context: vscode.ExtensionContext, cacheName: string): Promise<Errorable<string>> {
    const cachePath = cacheDirectoryName(context, cacheName);
    if (await fs.exists(cachePath)) {
        return { succeeded: true, result: cachePath };
    }

    try {
        const result = mkdirp.sync(cachePath);
        if (result) {
            return { succeeded: true, result };
        }
        return { succeeded: false, error: [`Failed to create cache directory ${cachePath}`] };
    } catch (err) {
        return { succeeded: false, error: [`Failed to create cache directory ${cachePath}: ${err}`] };
    }
}
