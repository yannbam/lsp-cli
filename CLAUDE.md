Note: the biome checks are currently failing because old code. DONT fix those OLD code issues - use --no-verify. But watch out if code that You wrote in your session fails checks and fix them.

**ONBOARDING:**
1. Check git status, make sure your on the right branch and there are no uncommitted changes - if there are or you're unsure of the right branch for you use the AskHuman tool and ask for clarification
2. Read the README.md
3. Use LSTool to get an repo structure overview
4. Use the following command for sequentially for EACH file in src/

```bash
lsp-cli-jq typescript '.symbols[] | select(.file == "/ABSOLUTE/PATH/TO/FILENAME") | "\(.name) (\(.kind)):\n    \(.range.start.line + 1)-\(.range.end.line + 1): \"\(.preview // .name)\"" + (if .documentation then "\n      doc: " + (.documentation | gsub("\n"; " | ")) else "" end) + (if .comments then "\n      # " + (.comments | join(" | ")) else "" end) + (if .kind == "class" then "\n" + ([(.children[]? | select(.kind == "constructor") | "    \(.range.start.line + 1)-\(.range.end.line + 1): \"\(.preview // "constructor()")\""), (.children[]? | select(.kind == "method") | "    \(.range.start.line + 1)-\(.range.end.line + 1): \"\(.preview)\"" + (if .documentation then "\n      doc: " + (.documentation | gsub("\n"; " | ")) else "" end) + (if .comments then "\n      # " + (.comments | join(" | ")) else "" end))] | sort_by(split(":")[0] | ltrimstr("    ") | split("-")[0] | tonumber) | join("\n")) else "" end)' | jq -r | sed 's/\\n/\n/g'
```

5. Read the dev_docs/ for dev materials, todos, status, bug reports, handoff notes etc.

---
**RULES**:
1. BEFORE modifying or adding any code you MUST a FULL understanding of the architecture it is in and be aware of any code in different places that will get affected by your code changes!
2. DONT fix out-of-scope issues that are not relevant to YOUR CURRENT TASK!
3. Follow the e/code protocol and also add a docstring with full argument and return object/value descriptions!
4. Write elegant solutions with minimal code
5. Don't feature-creep. Only write features that were asked for!
6. Only mark tasks and features as completed after they have been TESTED successfully!
7. Have fun coding :) 


**OFFBOARDING:**
Make sure to come to a clean ending point of your work before hitting the context limit (~150k tokens)!
At the end of a session, make sure you leave the repo in a clean state, and update any documents in dev_docs/ (but only with the ACTUAL changes from the CURRENT session)
If you started but didn't fully complete a task, make sure that it is marked as WIP and write a detailed self-contained dev_docs/HANDOVER.md with a detailed description of still needs to be done, what currently doesn't work and any crucial information that another Claude instance needs to seamlessly resume your work in the next session.