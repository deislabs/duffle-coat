import * as request from 'request-promise-native';
import * as extract from 'extract-zip';
import * as tmp from 'tmp';
import { promisify } from 'util';
import mkdirp = require('mkdirp');
import * as tar from 'tar';

import { fs } from './fs';
import { Errorable, failed } from './errorable';

const extractAsync = promisify(extract);

export async function download(source: string, destination: string): Promise<Errorable<null>> {
    try {
        const content = await request.get(source, { encoding: null });
        await fs.writeFile(destination, content);
        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`${e}`] };
    }
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
