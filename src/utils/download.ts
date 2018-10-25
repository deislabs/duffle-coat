import * as request from 'request-promise-native';
import * as extract from 'extract-zip';
import * as tmp from 'tmp';
import { promisify } from 'util';

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
