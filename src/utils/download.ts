import * as request from 'request-promise-native';
import * as extract from 'extract-zip';
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
        const tempFile = "d:\\temp\\tempywempy.zip";
        const dl = await download(source, tempFile);
        if (failed(dl)) {
            return dl;
        }
        await extractAsync(tempFile, { dir: destinationFolder });
        return { succeeded: true, result: null };
    } catch (e) {
        return { succeeded: false, error: [`${e}`] };
    }
}
