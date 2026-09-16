# Prebuilt development downloads

This `dist/` folder contains convenience copies of the two ChatGPT Web Skill ZIPs for the current development branch.

For normal installation, prefer a tagged GitHub Release. Tagged releases are designed to contain both the Web Skills **and** the local GPTgrill-Codexwork Runner.

See:

- [`docs/RELEASE.md`](../docs/RELEASE.md)
- [`docs/RELEASE.zh-CN.md`](../docs/RELEASE.zh-CN.md)

## Web Skill packages in this folder

- [`grill-me-web-skill.zip`](grill-me-web-skill.zip) — requirements interrogation / `/grill`
- [`gptgrill-codexwork-web-skill.zip`](gptgrill-codexwork-web-skill.zip) — spec/phase/task dispatch / `/goal phase`, `/goal full`, `/loop`

Download each ZIP separately, then upload/install each as its own Skill in ChatGPT.

Do **not** upload the entire GPTgrill-Codexwork repository ZIP as a single Skill.

The source files live at:

- `skills/grill-me/SKILL.md`
- `skills/gptgrill-codexwork/SKILL.md`

If the ChatGPT uploader accepts a plain `SKILL.md`, you can also upload those source files directly.

## What a tagged Release contains

The automated release workflow packages:

```text
grill-me-web-skill-vX.Y.Z.zip
gptgrill-codexwork-web-skill-vX.Y.Z.zip
gptgrill-codexwork-local-vX.Y.Z.tgz
gptgrill-codexwork-local-vX.Y.Z.zip
SHA256SUMS.txt
```

The local `.tgz` can be installed with:

```bash
npm install -g ./gptgrill-codexwork-local-vX.Y.Z.tgz
```

The local `.zip` is for users who prefer a source checkout style installation (`npm install`, `npm run check`, `npm link`).
