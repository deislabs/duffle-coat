# duffle-coat

A Visual Studio Code extension for generating CNAB self-installers.

This extension adds a `Generate Self-Installer` command to the following items:

* `bundle.json` or `bundle.cnab` files
* Bundles in the [Duffle extension's](https://marketplace.visualstudio.com/items?itemName=ms-kubernetes-tools.duffle-vscode) Bundles explorer

The command generates an Electron application, which you can then run using `npm run dev` or package for distribution using `npm run package`.  Your bundle is embedded in the application.  If you choose the **Full bundle** option during generation, then all Docker images are also embedded in the application, allowing it to run entirely offline.

Note that once generated, the Electron app code is entirely decoupled from your source bundle.  If you make changes to the bundle, you'll need to regenerate the Electron app (you can choose just to update the bundle rather than overwriting the entire app).

## How to use

The `Generate Self-Installer` command prompts for either a `Manifest only` or `Full` bundle. `Manifest only` (or _thin_) bundles can only be installed in a connected environment. `Full` (or _thick_) bundles can be deployed in disconnected environments, because they contain not only the bundle description but also contains any invocation images and any images to be deployed.

> NOTE: At the moment, Full bundles are not supported; and the extension presupposes that you have `npm` installed.

To create the installer:
1. Build a bundle and locate the `bundle.json` file.
2. Right-click the bundle.json file, and near the bottom of the list, select the `Generate Self-Installer` command.
3. Select `Manifest only` bundle (in the current version).
4. At the next prompt, choose the directory in which the Electron generator template will be created. If you use the project directory, you might want to add `-cnab` to both the `.dockerignore` and `.gitignore` files.
5. Once the `-cnab` directory is created, open it in a console, and type `npm install` to bring in all the necessary modules.
6. Type `npm run dev` to test the installer.
7. Type `npm run package` to build the installer for the local OS. (You can run `npm run package-all`, but the current template brings in libraries for all platforms it can, several of which do not work.) The results of your work will be in the `-cnab/release` directory.



## Known issues

- The **Full bundle** generation options currently requires you to _push_ all depended-on Docker images to a network repository before running it.  (It is not sufficient for them to be present only in the local regsitry.)  This is a known issue with the `docker export` command.

- The installer uses duffle to install the bundle. This means that another tool will not necessarily be able to see the installation or interact with it. Use duffle to see the claim.

- The installer creates a credential set from your values on installation and then destroys them afterward. If you want to use duffle to interact with the installed application, you will need to create a credential set for the bundle.

## Unknown issues

I'm sure there are lots - please [report any you find](https://github.com/deislabs/duffle-coat/issues)!

## Application template

The application template lives in the `deislabs/duffle-bag` repo.  You are welcome to clone this and use it as the basis for an installer application without using this extension.  This extension just aims to make the job easier!

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.