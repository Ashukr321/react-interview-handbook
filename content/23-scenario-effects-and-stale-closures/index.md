---
title: "Scenarios: Effects & Stale Closures"
order: 23
part: "Scenario-Based"
description: "Debugging scenarios around useEffect dependencies, cleanup, stale closures, timers, listeners and connections."
---

Most real React bugs come from effects: infinite loops, stale values in timers, requests that outlive the page and connections that never close. These scenarios walk through the root cause of each, the fix, and how to prove it is gone.
