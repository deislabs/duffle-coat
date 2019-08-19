import * as request from 'request-promise-native';
import * as extract from 'extract-zip';
import * as tmp from 'tmp';
import { promisify } from 'util';
import mkdirp = require('mkdirp');
import * as tar from 'tar';

import { fs } from './fs';
import { Errorable, failed, succeeded } from './errorable';
import { ExtensionFileCache } from './cache';

const extractAsync = promisify(extract);

export async function download(source: string, destination: string, progressFunc?: (bytes: number) => void): Promise<Errorable<null>> {
    try {
        const r = request.get(source, { encoding: null });
        if (progressFunc) {
            r.on('data', (data: Buffer | string) => progressFunc(data.length));
        }
        await fs.writeFile(destination, await r);
        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`${e}`] };
    }
}

export async function downloadWithCache(cache: ExtensionFileCache, key: string, source: string, destination: string, progressFunc?: (bytes: number) => void): Promise<Errorable<null>> {
    if (await cache.contains(key)) {
        const err = await cache.copyFromCache(key, destination);
        if (succeeded(err)) {
            return err;
        }
        // If fetching from cache failed, fall through to the download-from-origin path
    }

    const err = await download(source, destination, progressFunc);
    if (succeeded(err)) {
        await cache.copyToCache(key, destination);  // ignore errors
    }
    return err;
}

export async function downloadZip(source: string, destinationFolder: string): Promise<Errorable<null>> {
    try {
        const tempFileObj = tmp.fileSync({ prefix: "duffle-coat-" });
        const dl = await download(source, tempFileObj.name);
        if (failed(dl)) {
            return dl;
        }
        await extractAsync(tempFileObj.name, { dir: destinationFolder });
        tempFileObj.removeCallback();
        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`${e}`] };
    }
}

export async function downloadTar(sourceUrl: string, destinationFolder: string): Promise<Errorable<null>> {
    try {
        const tempFileObj = tmp.fileSync({ prefix: "duffle-coat-" });
        const downloadResult = await download(sourceUrl, tempFileObj.name);

        if (failed(downloadResult)) {
            return { succeeded: false, error: [`Failed to download ${sourceUrl}: error was ${downloadResult.error[0]}`] };
        }

        const tarfile = tempFileObj.name;

        // untar it
        const untarResult = await untar(tarfile, destinationFolder);
        if (failed(untarResult)) {
            return { succeeded: false, error: [`Failed to unpack ${sourceUrl}: error was ${untarResult.error[0]}`] };
        }

        tempFileObj.removeCallback();

        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`${e}`] };
    }
}

async function untar(sourceFile: string, destinationFolder: string): Promise<Errorable<null>> {
    try {
        if (!(await fs.exists(destinationFolder))) {
            mkdirp.sync(destinationFolder);
        }
        await tar.x({
            cwd: destinationFolder,
            file: sourceFile
        });
        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`tar extract failed: ${e}`] };
    }
}

export function downloadProgressTracker(reporter: (msg: string) => void): (bytes: number) => void {
    let done = 0;
    let lastms = new Date().valueOf();  // We need to throttle or VS Code progress reporting stalls
    const progressFunc = (bytes: number) => {
        done += bytes;
        const nowms = new Date().valueOf();
        if (nowms - lastms >= 1000) {
            const mb = Math.floor(done / 1000000);
            reporter(`${mb}MB complete`);
            lastms = nowms;
        }
    };
    return progressFunc;
}
