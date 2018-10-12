import * as sysfs from 'fs';
import * as fse from 'fs-extra';
import { promisify } from 'util';

export const fs = {
    copyFile: promisify(sysfs.copyFile),
    exists: promisify(sysfs.exists),
    mkdir: promisify(sysfs.mkdir),
    readFile: promisify(sysfs.readFile),
    remove: fse.remove,
    writeFile: promisify(sysfs.writeFile),
};
