# duffle-coat

A Visual Studio Code extension for generating CNAB self-installers.

This extension adds a `Generate Self-Installer` command to the following items:

* `bundle.json` or `bundle.cnab` files
* Bundles in the [Duffle extension's](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.duffle-vscode) Bundles explorer

The command generates an Electron application, which you can then run using `npm run dev` or package for distribution using `npm run package`.  Your bundle is embedded in the application.  If you choose the **Full bundle** option during generation, then all Docker images are also embedded in the application, allowing it to run entirely offline.

Note that once generated, the Electron app code is entirely decoupled from your source bundle.  If you make changes to the bundle, you'll need to regenerate the Electron app (you can choose just to update the bundle rather than overwriting the entire app).

## Known issues

The **Full bundle** generation options currently requires you to _push_ all depended-on Docker images to a network repository before running it.  (It is not sufficient for them to be present only in the local regsitry.)  This is a known issue with the `docker export` command.

## Unknown issues

I'm sure there are lots - please [report any you find](https://github.com/deislabs/duffle-coat/issues)!

## Application template

The application template lives in the `deislabs/duffle-bag` repo.  You are welcome to clone this and use it as the basis for an installer application without using this extension.  This extension just aims to make the job easier!
