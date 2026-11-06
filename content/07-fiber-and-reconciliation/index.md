---
title: "Internals: Fiber & Reconciliation"
order: 7
part: "Question Bank"
description: "How React's Fiber architecture represents work, diffs trees, uses keys, and splits updates into render and commit phases."
---

Senior React interviews almost always probe what happens between `setState` and the screen changing. This section covers Fiber nodes, the current/workInProgress trees, the reconciliation heuristics, keys, and how the render and commit phases let React pause, prioritize and resume work.
