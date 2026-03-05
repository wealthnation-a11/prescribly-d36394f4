

# Fix: jspdf Peer Dependency Conflict on Vercel

## Problem

Vercel's `npm install` runs with strict peer dependency checking (npm v7+). Even though `jspdf@3.0.4` satisfies `jspdf-autotable@5.0.2`'s peer requirement of `"^2 || ^3"`, npm's resolver is hitting a conflict — likely because it tries to resolve a newer jspdf version from the registry first, then encounters the peer constraint.

## Solution

Add an `overrides` field to `package.json` to explicitly tell npm to use `jspdf@3.0.4` everywhere in the dependency tree. This is the proper npm-native way to resolve peer conflicts without `--force` or `--legacy-peer-deps`.

### Changes

**`package.json`** — Add an `overrides` block:

```json
"overrides": {
  "jspdf": "3.0.4"
}
```

This tells npm: "Wherever any package needs jspdf, use exactly 3.0.4." Since 3.0.4 satisfies `^2 || ^3`, the resolution becomes clean.

Also pin `jspdf-autotable` to exact version (remove `^`):

```json
"jspdf-autotable": "5.0.2"
```

One file changed, two small edits. This will resolve the Vercel deployment error.

