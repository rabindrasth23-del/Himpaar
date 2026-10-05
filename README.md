# Himpaar MVP: project folder

**Status:** nothing is built yet. This is a sandbox MVP with fake money. Nepal only.

## Folder map

```
himpaar/
  README.md             this file
  AGENTS.md             standing rules for Antigravity and Claude (read first)
  docs/
    WORKFLOW.md         core concept, app layout, end-to-end workflow, 2-minute demo script
    PRD.md              product requirements, scope, metrics, open questions
    TRD.md              technical design: data model, API, security, tests, hosting
    OPEN_SOURCE.md      approved open-source projects, licences, selection rules
    SETUP_PROMPTS.md    copy-paste prompts to set up backend, frontend, SDK and packages
```

Code folders (`apps/api`, `apps/web`, `packages/sdk`, `packages/shared`) do not exist yet. Prompt 1 in `docs/SETUP_PROMPTS.md` creates them.

## How to start

1. Open the `himpaar` folder as the workspace in Antigravity.
2. Check in Antigravity's own documentation how project rules are loaded. We have not verified that it reads `AGENTS.md` automatically. Prompt 0 tells it to read the file explicitly, so this is covered either way.
3. Paste Prompt 0, then Prompts 1 to 6 from `docs/SETUP_PROMPTS.md`, one at a time. Review each answer before the next.
4. After each prompt, you and Prince run the commands yourselves and read the changes.

## Two different "sandboxes"

- **Our MVP sandbox:** a demo with fake money. We build it now, for YC and the bank.
- **NRB Regulatory Sandbox:** NRB's supervised program for testing with real merchants. Phase two. It requires a written bank partner and has its own criteria (see `docs/PRD.md`, section 9).

## Before relying on any number or rule

Every figure about tax, fees, licences, rates or NRB rules is **unverified** until an accountant, the bank, or an official NRB/IRD document confirms it. See `docs/PRD.md`, section 11.
