# Goal Loop release guide

[中文](RELEASE.zh-CN.md)

Goal Loop ships two kinds of artifacts because the product itself has two layers: ChatGPT Web Skills and the local Goal Loop Runner.

## Release assets

Every tagged release should contain all of the following:

| Asset | Used for | Install / use |
|---|---|---|
| `grill-me-web-skill-vX.Y.Z.zip` | ChatGPT Web | Upload as a ChatGPT Skill |
| `goal-loop-web-skill-vX.Y.Z.zip` | ChatGPT Web | Upload as a ChatGPT Skill |
| `goal-loop-local-vX.Y.Z.tgz` | Local Mac / terminal / Codex environment | `npm install -g ./goal-loop-local-vX.Y.Z.tgz` |
| `goal-loop-local-vX.Y.Z.zip` | Local source bundle | unzip, `npm install`, `npm run check`, `npm link` |
| `SHA256SUMS.txt` | Integrity verification | `shasum -a 256 -c SHA256SUMS.txt` |
| GitHub-generated Source code ZIP/TAR | Full repository snapshot | development / audit |

The two Web Skill ZIPs are intentionally separate. Do not upload the full repository ZIP to ChatGPT as one Skill.

## Local runner vs Codex App

Goal Loop currently launches Codex through the `codex` command-line executable:

```text
codex exec --full-auto -C <workspace> -
```

Using the Codex App for your normal interactive work is compatible with Goal Loop. However, the Goal Loop Runner still requires the Codex CLI command to be available on the machine because the runner does not currently drive the Codex App GUI.

Check:

```bash
which codex
codex --version
```

If both work, nothing else is required. You can keep using Codex App manually while Goal Loop uses the CLI for autonomous runs.

If you only have the Codex App and `codex` is not available in the terminal, install the official Codex CLI as well before using Goal Loop.

The Codex App and CLI are part of the same Codex ecosystem and can share account/configuration context, but Goal Loop's execution path is explicitly CLI-based today.

A future Goal Loop version may add an App Server / app-native control adapter. That would be an alternative execution adapter, not a requirement for the current release.

## Automated release workflow

`.github/workflows/release.yml` validates and packages all release assets.

On a tag such as:

```bash
git tag -a v0.2.0 -m "Goal Loop v0.2.0"
git push origin v0.2.0
```

GitHub Actions will:

1. run `npm ci`;
2. run `npm run check`;
3. verify that the tag version matches `package.json`;
4. package the two Web Skills;
5. package the local Runner as both `.tgz` and `.zip`;
6. generate SHA-256 checksums;
7. create the GitHub Release and attach the assets.

The workflow also supports manual `workflow_dispatch`. A manual run builds the assets as a workflow artifact but does not publish a GitHub Release because no release tag exists.

## Versioning rule

Before creating a release tag, update `package.json` and `package-lock.json` to the same semantic version.

The release workflow deliberately fails when `vX.Y.Z` does not match `package.json` version `X.Y.Z`.

## Recommended install paths

### ChatGPT Web

Upload separately:

```text
grill-me-web-skill-vX.Y.Z.zip
goal-loop-web-skill-vX.Y.Z.zip
```

### Local Runner — packaged install

```bash
npm install -g ./goal-loop-local-vX.Y.Z.tgz
goal-loop --help
```

### Local Runner — source install

```bash
unzip goal-loop-local-vX.Y.Z.zip
cd goal-loop-vX.Y.Z
npm install
npm run check
npm link
goal-loop --help
```

Then bootstrap each target workspace:

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
goal-loop install-service --workspace /path/to/project
```
