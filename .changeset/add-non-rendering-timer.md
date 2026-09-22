---
'@astryxdesign/core': patch
---

[feat] Add Timer for elapsed whole-second durations without React tick renders.

Use `Timer` for active-operation elapsed time. It starts from mount by default,
accepts an earlier Unix-millisecond `startTime`, and supports plain-text formatting
through `formatElapsedTime`.

@cixzhang
