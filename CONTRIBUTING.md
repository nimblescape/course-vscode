<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Contributing

This guide explains the files, the development, the tests and the release of
the course module. The [README](README.md) describes the use in short, and
[docs/format.md](docs/format.md) is the specification of the format of the
files of a course, the source of `cs instructions`. The requirements of
the course module, each with an ID (`R-COURSE-001` to `R-COURSE-012`,
`R-FEED-001` to `R-FEED-004`), are in
[docs/course.md of nimblescape/markdown](https://github.com/nimblescape/markdown/blob/main/docs/course.md)
until the document moves into this repository.

## Files

| Path | Content |
| --- | --- |
| `src/course/` | The library of the course module, without an API of VS Code: the comment of the format (`comment.ts`), the names of the sections of each language (`languages.ts`), the blocks of a Markdown file with markdown-it (`markdown.ts`), the readers of a chapter, an assignment and a feedback file, the reader and the checks of a course (`course.ts`), the checks of the files for people (`pages.ts`), the comments of a course (`format.ts`), the instructions with the own rules of a course (`instructions.ts`) and the files of a new course (`create.ts`). |
| `src/cli/` | The command `cs` (`cli.ts`, started by `main.ts`) and the library of the npm package (`index.ts`). |
| `src/vscode/`, `src/extension.ts` | The course extension of VS Code: the courses of the workspace, the view "Course", the warnings and the comment on save. |
| `docs/format.md` | The specification of the format, printed by `cs instructions <topic>`. |
| `cli/` | The npm package `@nimblescape/course`: its manifest, its README and its types `index.d.ts`. |
| `test/fixtures/course-de/` | A small German course for the tests, with a `FEEDBACK.md` that the feedback program `majikmate/course-feedback` wrote. |
| `test/cli/`, `test/vscode/` | The tests of the built command and the tests in a real VS Code. |

## Development

The development tools are TypeScript, esbuild, vitest,
[`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) for the
tests in VS Code, and [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce),
the Microsoft tool that packages and publishes extensions. Everything runs on
Node.js 24: the release in `.node-version` for the tools and CI, and the
runtime of VS Code 1.125 and later (`engines.vscode`) for the extension. The
command `cs` of the npm package runs on the Node.js of the `PATH`,
Node.js 22 or later (`engines` of `cli/package.json`).

| Command | Effect |
| --- | --- |
| `npm ci --ignore-scripts` | Installs the locked development tools and runs no install script of a dependency. |
| `npm run typecheck` | Checks the types with `tsc`. esbuild does not check them. |
| `npm run lint` | Checks the sources with ESLint, with the recommended rules of ESLint and of typescript-eslint (`eslint.config.mjs`). |
| `npm test` | Runs the unit tests with vitest. |
| `npm run test:cli` | Builds the bundles and runs the tests of the built `cs`. |
| `npm run test:vscode` | Builds the bundle and the tests in VS Code, downloads VS Code to `.vscode-test/` and runs the tests in it, with a copy of the test course as the workspace. On Linux without a display, run it as `xvfb-run -a npm run test:vscode`. `VSCODE_TEST_VERSION=insiders` or a version such as `1.125.0` selects another VS Code. |
| `npm run build` | Bundles `dist/extension.js`, `cli/dist/cs.js` and `cli/dist/index.js` with source maps. `node cli/dist/cs.js check <folder>` then runs the built `cs`. |
| `npm run package` | Builds `nimblescape-course-<version>.vsix` with vsce, which first runs the production build (`vscode:prepublish`). vsce also validates the manifest and the README. |
| `npm pack ./cli` | Builds the npm package `nimblescape-course-<version>.tgz` from `cli/`, after a production build (`node esbuild.mjs --production`). |
| `npm run install-local` | Builds the package and installs it into every profile of the VS Code of this computer; `-- --profile <name>` installs into one profile. |
| `npm run uninstall-local` | Removes `nimblescape.nimblescape-course` from every profile of the VS Code of this computer. |

The launch configuration "Run the extension" builds the bundle and starts a
second VS Code window that loads the extension from this folder. Open the
folder of a course in that window.

## Reviewing the packages

The VSIX holds the bundle `dist/extension.js`, and the npm package the
bundles `cli/dist/course.js` and `cli/dist/index.js`, as readable
JavaScript: not minified, with the names of the source. To compare a package
with the sources, unpack it, run `npm ci --ignore-scripts` and
`npm run vscode:prepublish` at the tag of its version, and compare the
bundles. With the same sources and the locked versions of the tools, the
build gives the same files.

## npm package

`cli/` is the npm package `@nimblescape/course`, in the scope of the
organization `nimblescape` on npmjs.com, in the same form as the npm packages
of Markdown Notes and Markdown Paper:

- The command `cs` (`bin`): `instructions [topic]`, `check [folder]`, `format [folder]`, `read [path]`, `create <folder>` and `feedback <assignment> <answer>`.
- The library: `main` and `exports` name the bundle `dist/index.js` of [src/cli/index.ts](src/cli/index.ts), which exports `readCourse`, `readAssignment`, `readFeedback`, `checkCourse` and `topicText` and runs nothing on its load; `types` names `index.d.ts`, which is written by hand and names no type of another package. The adapter of the reflection tool loads it on the command line and on a server.
- `files` keeps the bundles of `dist/`, `index.d.ts` and `THIRD-PARTY-NOTICES.md`, which the build copies into `cli/`, because the bundles hold markdown-it and yaml. `engines.node` is `>=22`, and the package has no dependency.

The release publishes the package on npmjs.com (see [Release](#release)). A
version that is not released yet is built from a clone of this repository at a
fixed commit, and the file that `npm pack` writes is installed:

```sh
git clone https://github.com/nimblescape/course-vscode.git
cd course-vscode
git checkout <commit>
npm ci --ignore-scripts && node esbuild.mjs --production && npm pack ./cli
npm install --global "$PWD/nimblescape-course-<version>.tgz"
```

A program in another language, for example the feedback program in Python,
runs `cs read <path>` and reads the JSON that it prints.

## Tests in VS Code

`npm run test:vscode` runs the tests of `test/vscode/` in a real VS Code with
the extension of the development build. `.vscode-test.mjs` copies the test
course into a temporary folder and opens it as the workspace. The tests check
that the extension reads the course, shows the checks as warnings, also of a
text that is not saved yet, and writes the comment of the format with the
save of a README. CI runs them under `xvfb-run` with the stable VS Code, and
the workflow "VS Code versions" once per week with VS Code Insiders and with
the lowest supported version.

## Naming

Every extension of the publisher `nimblescape` uses one name,
`nimblescape-<name>`, for the package and the extension, and the repository
`<name>-vscode`:

| What | Form | This extension |
| --- | --- | --- |
| Repository | `nimblescape/<name>-vscode` | `nimblescape/course-vscode` |
| `name` in `package.json` | `nimblescape-<name>` | `nimblescape-course` |
| Extension ID | `nimblescape.nimblescape-<name>` | `nimblescape.nimblescape-course` |
| Package file | `nimblescape-<name>-<version>.vsix` | `nimblescape-course-<version>.vsix` |
| Display name | `nimblescape <Title>` | `nimblescape Course` |
| npm package | `@nimblescape/<name>` | `@nimblescape/course` |
| Folder in a repository | `.<name>/` | `.course/` |

The repository moved from `majikmate/course-vscode` to
`nimblescape/course-vscode`; GitHub forwards the old address. The
[Marketplace setup](#setup-of-a-repository) and the
[npmjs.com setup](#npmjscom-setup) name the repository
`nimblescape/course-vscode`.

## Release

A released version is a tag `v<version>` whose `<version>` equals the version
in `package.json` and in `cli/package.json`. The workflow "Release" creates
the version, its tag, its GitHub release, its Marketplace version and its
version on npmjs.com in one run. To release a version,
follow these steps:

1. Optional: add a section `## <version>` to `CHANGELOG.md` on `main`. The section describes the changes for the users (see [Release rules](#release-rules)).
2. In the tab "Actions", choose the workflow "Release", then "Run workflow" on the branch `main`. Enter the version, for example `0.1.7`. When `CHANGELOG.md` has no section for the version, enter its notes too: they become the section. The GitHub website starts a workflow also in the browser of a phone.

The run has five jobs:

1. "Version commit" checks that the run starts from `main`, that the version has the form `<major>.<minor>.<patch>`, that it is not lower than the version in `package.json` and that its tag does not exist, and, in a release, that a dry run tested the files of the release process with `scripts/release-checks.mjs dry-run` (rule 4 of the [release rules](#release-rules)). It sets the version in `package.json`, `package-lock.json`, `cli/package.json` and `cli/package-lock.json`, adds the section of the notes to `CHANGELOG.md` when the file has none, commits the change as "Release `<version>`" and pushes it to the temporary branch `release/run-<run ID>`, not to `main`. When `main` holds the version and its section already, it commits nothing. It also deletes the temporary branches of earlier runs that failed.
2. "CI" runs the workflow `ci.yml` for the commit of the version, because a push with the token of a workflow starts no other workflow. The VSIX and the npm package that this job tests and builds are the files of the release, so the release repeats no test and no build.
3. "Main, tag and GitHub release" runs only when CI passed. It moves `main` to the commit of the version as a fast-forward and deletes the temporary branch. When `main` changed during the run, it stops before the tag. Then it creates the tag `v<version>` on the commit and the release of the tag with the GitHub CLI `gh`. The section of the version in `CHANGELOG.md` becomes the notes, and the VSIX and the npm package (`nimblescape-course-<version>.tgz`) become the files of the release. A release that exists keeps its notes and receives only a file that it does not hold.
4. "Publish to the Visual Studio Marketplace" downloads the VSIX of the GitHub release, signs in to Microsoft Entra ID with the official [`azure/login`](https://github.com/Azure/login) action and publishes the VSIX with `vsce publish --azure-credential`.
5. "Publish to npmjs.com" downloads the npm package of the GitHub release and publishes it with `npm publish --access public`, with [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm exchanges the OpenID Connect token of the job for a token of npmjs.com that can publish only this package, and adds the provenance of the build. It skips a version that npmjs.com holds already, and it stops with a message when the package does not exist yet (see [npmjs.com setup](#npmjscom-setup)).

`main` receives the version commit only after CI passed. When CI fails,
`main`, the tags, the releases and the Marketplace stay unchanged, and the
version can still be released: fix the cause on `main` and start the release
of the same version again. The jobs move and push with the token of the
workflow, so a rule of `main` that blocks direct pushes stops the release.

A dry run tests a release without a change: choose "Dry run" when you start
the workflow. The run makes the version commit on its temporary branch, runs
CI for it and deletes the branch; it changes neither `main`, a tag, a release
nor the Marketplace. Its run name ends with "(dry run)". A dry run may start
from another branch than `main`, so it also tests a change of `release.yml` on
that branch before the change reaches `main`.

When a job fails, remove the cause and choose "Re-run failed jobs" on the
run. A re-run keeps the tag and the files that the GitHub release already
holds, and the Marketplace and the publish job of npm skip a version that
they already hold, so a re-run never publishes a version twice. When the publish job fails, for example
because the Marketplace refuses the package, the tag and the GitHub release
stay, and the re-run publishes the VSIX of the GitHub release. GitHub allows a
re-run only within 30 days of the run; after that, only a new version can
reach the Marketplace. A new run deletes the temporary branch of a failed run,
so a failed run can no longer be re-run after a new run started.

The Marketplace refuses a package with more than 30 tags, with the error "You
exceeded the number of allowed tags of 30", which the Microsoft publishing
guide names. The tags are the keywords of `package.json` and the tags that
vsce adds, for example the language of each `onLanguage` event in
`activationEvents`; the element `<Tags>` of `extension.vsixmanifest` in the
VSIX lists them. No job counts them before the tag.

The workflows `release.yml`, `release-dry-run.yml` and
`marketplace-identity.yml`, the script `scripts/release-checks.mjs` with its
test `scripts/release-checks.test.mjs`, and this section are the same in every
extension repository of nimblescape. A change to them goes into every
repository.

### Release rules

Every extension of nimblescape follows these rules. Only rule 4 has a check
in the workflows, `scripts/release-checks.mjs dry-run`; everyone follows the
other rules without a check.

1. **The ID never changes.** An extension keeps its ID `nimblescape.nimblescape-<name>` (see [Naming](#naming)), and nimblescape never publishes an extension under a new ID.
2. **No deletion.** nimblescape never deletes an extension or a version of the npm package. No workflow, npm script or file of `scripts/` runs `npm unpublish`, after which npmjs.com never accepts the number of that version again, or `vsce unpublish`, which deletes the extension on the Marketplace, or `vsce delete-publisher`, which deletes the publisher with all its extensions. On the publisher management page, nobody uses More Actions > Remove, which deletes the extension and keeps its name reserved permanently, or "Delete this version" (More Actions > Reports, tab Manage), after which the number of the version can never be used again. An extension that is no longer wanted is unpublished on the publisher management page, as [Naming](#naming) describes.
3. **Only changes for the users, at most one version in 7 days.** A version is published only when it changes something for the users, its section in `CHANGELOG.md` describes that change, and at least 7 days passed since the newest release; an urgent fix may come earlier. A change for the users changes the extension that VS Code runs: its code (`src/`, which the build bundles into `dist/`), another file of the package that is not a document, for example the icon of a view, or a field of `package.json` that changes how the extension works, for example `contributes`. A change only of the documents (for example the README), the Marketplace icon, the tests or the build tools (for example `esbuild.mjs`, `tsconfig.json` or a file of `scripts/`) does not count: it reaches the users with the next version that changes the extension. Images that only the README shows do not belong in the package: the README links them with full `https://github.com/…` links. The section of the version in `CHANGELOG.md` does not say "maintenance release", "behaves as in" followed by a version, or a phrase of that kind.
4. **Dry run first.** A change of the release process is tested with a dry run before it reaches `main`. The files of the release process are `release.yml`, `ci.yml`, whose VSIX the release publishes, and `scripts/release-checks.mjs`. The workflow "Release dry run" runs on every pull request. When the pull request changes one of these files, also in an update by Dependabot, the check `dry-run` fails until a successful dry run, or the newest release, had these files as they are at the head of the pull request. Start the workflow "Release" on the branch of the pull request with "Dry run" and a version without a tag (with notes when `CHANGELOG.md` has no section for the version), then re-run the job "release dry run" of the pull request. A pull request from a fork cannot meet the rule, because the dry run needs a branch of this repository. A pull request whose base branch has no `release.yml` yet, such as the first pull request of the release process, passes the check with a notice, because GitHub starts the workflow "Release" only from the default branch; the job "Version commit" of the first release runs the check on `main`. The job "Version commit" of a release runs the check `dry-run` again, so a change that reached `main` without a dry run stops the release until a dry run tested it. Do not make "release dry run" a required check of `main`: the release moves `main` to its version commit, which has no result of the check.
5. **Only GitHub Actions with Microsoft Entra ID.** Only the job "Publish to the Visual Studio Marketplace" publishes, signed in with the app registration of [Marketplace setup](#marketplace-setup). No personal access token exists for the publisher. No other workflow, npm script or file of `scripts/` runs `vsce publish` or `vsce login`. Nobody uploads a VSIX on the publisher management page or runs `vsce publish`, `unpublish`, `delete-publisher` or `login` on a computer. In this repository, the job "Publish to npmjs.com" publishes the npm package in the same way, with trusted publishing and no token; only the first version of the package is published once by hand, with `scripts/npm-setup.sh`, because npmjs.com sets up a trusted publisher only for a package that exists.

## Marketplace setup

The workflow publishes with a Microsoft Entra ID token, as the
[Microsoft publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)
recommends. It uses no personal access token, because Azure DevOps retires
the global personal access tokens that the Marketplace needs on
1 December 2026. The publishing identity is an app registration with a
federated credential for each repository: GitHub Actions proves the identity
of the job with an OpenID Connect token, so no secret is stored. An app
registration needs no Azure subscription. One app registration publishes
every extension of the publisher `nimblescape`, because the Marketplace
grants the role of a member for the whole publisher.

### What exists

| Part | Where | Value |
| --- | --- | --- |
| Publisher | [Marketplace publisher management](https://marketplace.visualstudio.com/manage) | `nimblescape`, the `publisher` in `package.json` |
| App registration | [Microsoft Entra admin center](https://entra.microsoft.com), "App registrations" | `vscode-marketplace-publisher`, a member of the publisher `nimblescape` with the role "Contributor" |
| Organization variables | GitHub organization `nimblescape`, "Secrets and variables", "Actions", "Variables" | `AZURE_CLIENT_ID` (the application ID of the app) and `AZURE_TENANT_ID` (its directory ID); identifiers, not secrets |
| Federated credential | the app, "Certificates & secrets", "Federated credentials" | one for each repository, named after it |
| Environment | the settings of each repository, "Environments" | `marketplace`, reachable from the tags `v*` and the branch `main` only |

### Setup of a repository

A new extension repository needs its federated credential and its
environment. The script `scripts/marketplace-setup.sh` sets both up for the
GitHub repository of the remote `origin` of the clone, whose name must be the
`name` of `package.json`; it needs the Azure CLI, the GitHub CLI and Node.js,
the two CLIs signed in with an account that may change the app registration
and the settings of the repository. It shows what it sets up and
asks before it changes anything. It changes nothing that already exists, so it
can run again:

```sh
az login --allow-no-subscriptions
gh auth login
scripts/marketplace-setup.sh
```

Then run the workflow "Marketplace identity" in the tab "Actions" of the
repository: it signs in like the publish job and prints the member ID of the
app, which shows that the setup works.

The script gives the credential these values. For this repository:

| Field of the federated credential | Value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject | `repo:nimblescape@<owner ID>/course-vscode@<repository ID>:environment:marketplace`; the script prints the IDs |
| Audience | `api://AzureADTokenExchange` |

GitHub puts the owner ID and the repository ID into the subject of every
repository created after 15 July 2026, so a new owner of a reused name gets no
token. The subject also holds the name of the repository: after a rename of
the repository, run the script again and delete the credential of the old
name. One app accepts at most 20 federated credentials.

### Setup from scratch

Only when the publisher, the app or the variables are lost:

1. Create the publisher `nimblescape` on the publisher management page, signed in with the Microsoft account of nimblescape e.U.
2. Register the app `vscode-marketplace-publisher` in the Entra admin center: "New registration", "Single tenant", no API permission, no secret.
3. Set the organization variables `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to the application ID and the directory ID of the app. Organization variables reach private repositories only on a paid GitHub plan.
4. Set up a repository with the script, and run its workflow "Marketplace identity".
5. On the publisher management page, open the publisher `nimblescape`, then "Members", and add the member ID that the workflow printed with the role "Contributor".

## npmjs.com setup

The job "Publish to npmjs.com" publishes with
[trusted publishing](https://docs.npmjs.com/trusted-publishers): npmjs.com
trusts the workflow `release.yml` of this repository in the environment
`npm`, and accepts the OpenID Connect token of its job instead of a token.
No npm token is stored in GitHub.

### What exists

| Part | Where | Value |
| --- | --- | --- |
| Organization | [npmjs.com](https://www.npmjs.com/org/nimblescape) | `nimblescape`, the scope of the package |
| Package | npmjs.com | `@nimblescape/course`, public |
| Trusted publisher | the settings of the package on npmjs.com, "Trusted Publisher" | GitHub Actions, the repository `nimblescape/course-vscode`, the workflow `release.yml`, the environment `npm` |
| Environment | the settings of the repository, "Environments" | `npm`, reachable from the tags `v*` and the branch `main` only |

### Setup

The trusted publisher names the repository, and `npm publish` with
provenance fails when `repository.url` of `cli/package.json` names another
repository than `nimblescape/course-vscode`. The setup scripts read the
current name of the repository from GitHub.

npmjs.com sets up a trusted publisher only for a package that exists, so
the first version is published once by hand, from the GitHub release of
that version. The script `scripts/npm-setup.sh` does all steps. It needs the
GitHub CLI and npm 11.15.0 or newer, both signed in: npm with an account
that may publish in the organization `nimblescape` and has two-factor
authentication, because `npm trust` and the first `npm publish` ask for the
second factor. It shows what it sets up and asks before it changes
anything. It changes nothing that already exists, so it can run again. It
shows the trusted publishers of the package and asks whether to add the
trusted publisher: npm lists them only after the second factor, in the
terminal, so the script cannot check them itself:

```sh
gh auth login
npm login
scripts/npm-setup.sh          # before the first release: the environment npm
scripts/npm-setup.sh 0.2.0    # after the release 0.2.0: its first version and the trusted publisher
```

The order for the first version of the package:

1. Run `scripts/npm-setup.sh` without a version, so the environment `npm` exists.
2. Release the version with the workflow "Release". The job "Publish to npmjs.com" fails, because the package does not exist yet; the Marketplace and the GitHub release are not affected.
3. Run `scripts/npm-setup.sh <version>`. It downloads the npm package of the GitHub release, publishes it, and adds the trusted publisher.
4. Re-run the failed job "Publish to npmjs.com". It finds the version on npmjs.com and ends without a change.

From the next version on, the release publishes to npmjs.com without a step
by hand. Optionally, set "Publishing access" of the package on npmjs.com to
"Require two-factor authentication and disallow tokens" after the setup:
trusted publishing still works, and no token can publish.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](LICENSE).
