# PunkRecordz

Paperback 0.9 source repository for the PunkRecordz extension, organized to match the Inkdex template-style structure.

## Structure

- `src/PunkRecordz/`: TypeScript source for the extension
- `src/PunkRecordz/pbconfig.ts`: extension metadata used by the toolchain
- `src/PunkRecordz/main.ts`: main extension implementation
- `src/PunkRecordz/static/icon.png`: source icon asset
- `0.9/stable/`: previously bundled registry output kept as a reference artifact

## Development

```bash
npm install
npm test
npm run serve
```

## Notes

The new source tree was reconstructed from the currently bundled `0.9/stable/PunkRecordz/index.js` so the repo can be migrated toward the standard Inkdex contribution workflow.
