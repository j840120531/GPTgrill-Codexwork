# Goal Loop release guide

[中文](RELEASE.zh-CN.md)

Goal Loop ships two kinds of artifacts because the product itself has two layers: ChatGPT Web Skills and the local Goal Loop Runner.

## Release assets

Every release should contain all of the following:

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

Using the Codex App for normal interactive work is compatible with Goal Loop. However, the Goal Loop Runner still requires the Codex CLI command to be available because the runner does not currently drive the Codex App GUI.

Check:

```bash
which codex
codex --version
```

If both work, nothing else is required. You can keep using Codex App manually while Goal Loop uses the CLI for autonomous runs.

If you only have the Codex App and `codex` is not available in the terminal, install the official Codex CLI as well before using Goal Loop.

A future version may add an App Server / app-native execution adapter, but that is not a requirement for the current release.

## Recommended: one-click release from GitHub

You do not need to create a tag locally and you do not need Codex App for releasing.

Go to:

```text
GitHub repository
→ Actions
→ Release
→ Run workflow
```

Enter a version such as:

```text
0.2.0
```

or:

```text
v0.2.0
```

The workflow will automatically:

1. release from the current `main` HEAD;
2. verify that `package.json` and `package-lock.json` versions match;
3. verify that the requested version matches the package version;
4. refuse to overwrite an existing tag or Release;
5. run `npm ci`;
6. run `npm run check`;
7. package both ChatGPT Web Skills;
8. package the local Runner as `.tgz` and `.zip`;
9. generate `SHA256SUMS.txt`;
10. create an annotated Git tag;
11. push the tag;
12. create the GitHub Release;
13. attach all release assets.

This makes GitHub Actions the normal release control plane instead of your Mac.

## Tag-triggered release is still supported

For advanced cases, you may still create and push a tag yourself:

```bash
git tag -a v0.2.0 -m "Goal Loop v0.2.0"
git push origin v0.2.0
```

A pushed `v*` tag triggers the same validation, packaging, and release process.

For normal use, prefer the manual GitHub Actions `Run workflow` path.

## Versioning rules

Before a release, `package.json` and `package-lock.json` must contain the same semantic version.

For example, to publish:

```text
v0.3.0
```

both package files must report:

```text
0.3.0
```

Otherwise the release workflow fails deliberately.

A manual one-click release also enforces:

- release source must be the current `main` HEAD;
- the tag must not already exist;
- the Release must not already exist;
- old tags are never force-updated.

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

The source ZIP includes `test/`, so `npm run check` works directly from the extracted release bundle.

Then bootstrap each target workspace:

```bash
goal-loop bootstrap --workspace /path/to/project
goal-loop doctor --workspace /path/to/project
goal-loop install-service --workspace /path/to/project
```

## Workflow source

The implementation lives at:

```text
.github/workflows/release.yml
```

It supports both:

```text
workflow_dispatch
push tags: v*
```

Treat GitHub Actions as the normal release entry point. Local Git tag commands remain available only as an advanced/compatibility path.
