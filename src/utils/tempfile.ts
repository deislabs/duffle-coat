import * as tmp from 'tmp';

import { fs } from './fs';

export async function withOptionalTempFile<T>(content: string | undefined, fileType: string, fn: (filename: string | undefined) => Promise<T>): Promise<T> {
    if (!content) {
        return fn(undefined);
    }

    const tempFile = tmp.fileSync({ prefix: "vsduffle-", postfix: `.${fileType}` });
    await fs.writeFile(tempFile.name, content);

    try {
        return await fn(tempFile.name);
    } finally {
        tempFile.removeCallback();
    }
}

export async function withTempDirectory<T>(fn: (dirpath: string) => Promise<T>): Promise<T> {
    const tempDir = tmp.dirSync({ prefix: "vsduffle-", unsafeCleanup: true });
    try {
        return await fn(tempDir.name);
    } finally {
        tempDir.removeCallback();
    }
}
