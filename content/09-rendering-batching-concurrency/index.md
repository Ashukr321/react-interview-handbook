---
title: "Internals: Rendering, Batching & Concurrency"
order: 9
part: "Question Bank"
description: "Automatic batching, concurrent rendering, lanes and priorities, and how React's Scheduler keeps the main thread free."
---

React 18 changed how and when updates are processed: `createRoot` enabled automatic batching and concurrent features like transitions. Interviewers use these questions to check whether you understand urgent vs non-urgent updates, the Scheduler, and why concurrency does not mean multithreading.
