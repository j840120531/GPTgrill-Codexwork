# ChatGPT Web integration

The installable web Skill lives at [`skills/goal-loop/SKILL.md`](../skills/goal-loop/SKILL.md).

Recommended flow:

```text
/grill
  -> clarify requirements and decisions
/to-spec
  -> create the authoritative SPEC.md
/to-tickets
  -> create vertical-slice task files
/goal phase
  -> create revision 1 dispatch manifest
```

When a `task` or `phase` run pauses, Goal Loop records the pause locally and keeps the pushed work branch intact. The always-on watcher will **not** silently continue the next boundary. After the user explicitly approves continuation, update the dispatch manifest on the control branch and increment `revision` by 1.

`/goal full` or `/loop` uses `mode: goal`, which does not pause at phase boundaries unless the run is blocked.
