# Kairos AI Agent Full Technical Report

Generated: Tuesday, June 2, 2026  
Repository: `C:\Users\devsk\Downloads\kairos-main\kairos-main`  
Project version: `kairos-agent@0.1.0`  
Runtime target: Node.js `>=20`  
Primary package manager command on this PC: `npm.cmd`  
Report scope: Entire Kairos repository, local data folder, current agent code, skills library, CLI, setup, chat, memory, tools, sandbox, providers, tests, and current development status.

---

## 1. Executive Summary

Kairos is a local-first AI agent platform built as a Node.js command-line application. It is not only a chatbot. It is a modular agent harness with:

- A terminal chat interface.
- Provider setup for local and cloud AI models.
- Goal creation and approval.
- A guarded agent loop.
- Local memory.
- Local conversation history.
- A large markdown skills library.
- Context indexing and retrieval.
- Tool registry.
- Safety review for commands and actions.
- Optional Ubuntu execution through Docker or WSL.
- Project scanning, file search, file reading, file writing, zipping, web fetch, browser open, and starter project generation.

The system is currently an early MVP. The core CLI is functional, smoke tested, and readable. The strongest implemented systems are CLI routing, provider configuration, skills, memory, safety gates, local context retrieval, and the agent loop. The weakest areas are lack of a real web dashboard, partial Discord/voice/plugin implementations, limited automated testing, no real patch/diff workflow yet, and reliance on local environment readiness for model calls.

The current local machine state shows:

- Active provider: `ollama`
- Configured model: `gemma4`
- Provider health: not ready because Ollama is not reachable at `http://localhost:11434`
- Docker: not found
- WSL normal-user distro: not found
- Sandbox mode: host, disabled
- Context index: built, about 4.51 MB
- Goals stored: 10
- Lessons stored: 3
- Logs stored: 2 daily log files

Validation completed for this report:

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run kairos -- doctor
npm.cmd run kairos -- sandbox status
npm.cmd run kairos -- tools list
npm.cmd run kairos -- brain status
```

Both `check` and `test` passed.

---

## 2. Creator and User Context From `Adn.q Dev.pdf`

The referenced PDF `C:\Users\devsk\Downloads\Adn.q Dev.pdf` is a 3-page developer profile for ADN.Q. Relevant context:

- ADN.Q is a self-directed developer and builder interested in AI systems, automation, Discord development, cybersecurity, operating systems, and entrepreneurship.
- Projects listed include Kairos AI Assistant, OpenClaw Integrations, BrainAI Research, Hermes-based AI Development, Discord Scam Shield, Link Detection Systems, Security-focused Browser Extensions, AETHER-KERNEL, Linux OS experiments, AutoShorts Engine, POSEIDON STUDIOS, BrainAI, HYPERION AI Fitness System, service websites, and community automation systems.
- Technical skills include JavaScript/Node.js, TypeScript, HTML/CSS, basic Kotlin/Java, PowerShell, Git/GitHub, CLI tools, AI agent development, LLM integration, prompt engineering, memory systems, local AI, browser security extensions, Discord tools, threat analysis, Linux/Ubuntu, GRUB, QEMU, virtual machines, Next.js, TailwindCSS, SaaS MVP development, and Discord bot development.
- The profile rates strengths highly in persistence, creativity, problem solving, and growth potential.

Interpretation for Kairos:

Kairos appears to be a central "builder platform" for the creator's larger vision: an AI assistant that can help create products, automate workflows, manage Discord/security projects, learn from local context, and eventually act as an operating layer for personal software work.

---

## 3. Project Purpose

Kairos is aiming to become a local-first AI agent ecosystem. Its near-term purpose is:

- Let the user configure a brain provider.
- Chat with that provider through a friendlier CLI.
- Create goals.
- Let a guarded agent loop plan and execute actions.
- Keep local memory and lessons.
- Search skills and project context.
- Execute approved file, shell, web, and browser operations.

Its long-term purpose appears broader:

- Become a full AI operating environment.
- Support local models through Ollama and other providers.
- Support multi-agent planning.
- Use a large skill library for domain expertise.
- Add Discord, voice, dashboard, plugins, automation, and safer remote control.
- Help the creator build real projects and services.

---

## 4. Current Capabilities

### Fully Usable Now

- CLI command routing through `src/kairos/cli.js`.
- Interactive menu through `src/kairos/core/menu.js`.
- Chat startup and slash commands through `src/kairos/core/chat.js`.
- Brain provider setup/status/check for multiple providers.
- Ollama API calls when Ollama is running and model exists.
- OpenAI-compatible cloud API calls when keys exist.
- Anthropic and Gemini calls when keys exist.
- Goal creation, approval, persistence, and completion.
- Action normalization for model outputs.
- Regression coverage for the failed `goal_20260601221016_rluw` case.
- Local context index build and search.
- Skills list/search/show.
- Local memory profile and conversation history.
- Self-improvement lessons.
- Tool registry.
- Safety review for risky commands/actions.
- Optional sandbox command construction.
- Project scan, search, read, mkdir, zip, run, web fetch, browser open.
- Starter template generation for Node CLI and Discord bot.
- Smoke tests.
- Syntax checks for every core module.

### Partially Working

- AI chat depends on provider health. The interface works, but Ollama is currently not reachable on this machine.
- Agent loop depends on provider health for real LLM planning. It can fall back to `think` messages when the provider fails.
- Ubuntu sandbox support exists in code, but Docker and normal-user WSL are not available in the current environment.
- Multi-agent planning exists as prompt orchestration, but it is still early and not a separate worker runtime.
- Test runner exists, but the tool registry still marks `tests.run` as planned.
- Git helper code exists, but the tool registry marks git actions as planned and CLI does not expose full git commands yet.
- Plugin vision exists, but repository plugin runtime is not built.
- Discord skills/templates exist, but live Discord bot integration/control is not implemented.
- Voice skills exist in the library, but runtime speech-to-text/text-to-speech integration is not implemented.

### Not Implemented Yet

- Web UI/dashboard.
- Persistent web server.
- Real plugin marketplace/runtime.
- Full diff/patch approval UI.
- Real distributed multi-agent worker system.
- Real vector embeddings database.
- Native Discord control surface.
- Native voice control surface.
- Browser automation beyond guarded `browser_open`.
- Production auth, user accounts, or remote API.
- Full CI/CD.

---

## 5. Technical Stack

### Languages

- JavaScript: core implementation.
- Markdown: skills library and documentation.
- JSON/JSONL: local state, goals, memory, logs, context index.
- PowerShell: expected Windows shell commands.

### Runtime

- Node.js >=20.
- Current local Node used by tests appears to be Node 24.15.0.

### External APIs and Providers

- Ollama local API:
  - `/api/chat`
  - `/api/tags`
- OpenAI Chat Completions API.
- OpenRouter Chat Completions API.
- Kimi/Moonshot OpenAI-compatible API.
- Anthropic Messages API.
- Gemini GenerateContent API.
- Codex bridge through a local `codex` command.

### Data Storage

No database server is used. Kairos stores local files:

- `.env` for configuration.
- `data/kairos/goals/*.json` for goals.
- `data/kairos/memory/profile.json` for memory.
- `data/kairos/memory/conversation.json` for chat history when present.
- `data/kairos/logs/YYYY-MM-DD.jsonl` for tool logs.
- `data/kairos/lessons.jsonl` for self-improvement lessons.
- `data/kairos/context-index.json` for local retrieval.
- `data/kairos/checkpoints/*.json` for resumable goal checkpoints when active.

### Libraries

The runtime uses only Node standard modules in the application code:

- `fs`
- `path`
- `os`
- `http`
- `https`
- `net`
- `child_process`
- `readline/promises`
- `url`

There are no third-party npm dependencies in `package.json`.

---

## 6. Repository Statistics

Measured on June 2, 2026.

### File and LOC Summary

| Type | Files | Approx Lines |
|---|---:|---:|
| JavaScript `.js` | 35 | 5,993 |
| Markdown `.md` | 299 | 49,735 |
| JSON `.json` | 13 | 141,559 |
| JSONL `.jsonl` | 3 | 61 |
| Text `.txt` | 2 | 15 |
| No extension | 1 | 53 |

Important note: JSON line count is huge mainly because `data/kairos/context-index.json` is pretty-printed and large.

### Core JavaScript Modules

| File | Lines | Purpose |
|---|---:|---|
| `src/kairos/core/agent-loop.js` | 797 | Main LLM-driven action planning and execution loop. |
| `src/kairos/cli.js` | 552 | Top-level CLI command router. |
| `src/kairos/core/web-tools.js` | 358 | Guarded web fetch and browser open helpers. |
| `src/kairos/core/context-index.js` | 316 | Local context indexing and retrieval. |
| `src/kairos/core/brain.js` | 314 | Provider calls and chat message normalization. |
| `src/kairos/core/chat.js` | 254 | Interactive ChatGPT-style terminal chat. |
| `src/kairos/core/provider-health.js` | 252 | Provider health checks. |
| `src/kairos/core/sandbox.js` | 248 | Docker/WSL/host sandbox command routing. |
| `src/kairos/core/providers.js` | 238 | Provider definitions and setup. |
| `src/kairos/core/workspace-tools.js` | 220 | File/project/shell workspace tools. |
| `src/kairos/core/model-router.js` | 199 | Budget mode to model-role routing. |
| `src/kairos/core/skills.js` | 187 | Markdown skill discovery/search. |
| `src/kairos/core/tools.js` | 186 | Tool registry. |
| `src/kairos/core/menu.js` | 185 | Interactive terminal menu. |
| `src/kairos/core/memory.js` | 172 | User/project memory and chat history. |
| `src/kairos/core/safety.js` | 155 | Command/action risk review and approvals. |
| `src/kairos/core/setup.js` | 148 | First-run setup flow. |
| `src/kairos/core/builder.js` | 132 | Starter project template generator. |
| `src/kairos/test/smoke.js` | 121 | Regression and smoke tests. |
| `src/kairos/core/goal-manager.js` | 116 | Goal creation, approval, execution. |
| `src/kairos/core/self-improvement.js` | 112 | Goal lessons. |
| `src/kairos/core/agents.js` | 106 | Offline planner/builder/reviewer/tester/packager swarm. |
| `src/kairos/core/governor.js` | 83 | Goal warning and approval metadata. |
| `src/kairos/core/storage.js` | 78 | Goal/data path storage helpers. |
| `src/kairos/core/git.js` | 65 | Early git helper functions. |
| `src/kairos/core/doctor.js` | 64 | Health report. |
| `src/kairos/core/env.js` | 62 | `.env` read/write/masking. |
| `src/kairos/core/format.js` | 61 | CLI output formatting. |
| `src/kairos/core/test-runner.js` | 55 | Runs tests through reviewed command path. |
| `src/kairos/core/tool-log.js` | 55 | Tool event logging. |
| `src/kairos/core/checkpoint.js` | 43 | Goal checkpoint save/load/delete. |
| `src/kairos/core/cost.js` | 42 | Token and cost estimation. |
| `src/kairos/core/paths.js` | 10 | Root/data default paths. |

### Skill Library

The repository includes 289 markdown skill files across 39 numbered skill categories, plus 3 docs markdown files and README/LICENSE/report docs.

Skill categories:

| Category | Skill Count |
|---|---:|
| `01-coding` | 10 |
| `02-backend` | 6 |
| `03-frontend` | 6 |
| `04-devops` | 6 |
| `05-data` | 6 |
| `06-ai-ml` | 6 |
| `08-research` | 5 |
| `09-product` | 5 |
| `10-communication` | 5 |
| `11-learning` | 5 |
| `12-meta` | 5 |
| `13-innovation` | 5 |
| `14-management` | 5 |
| `15-cybersecurity` | 5 |
| `16-ethics` | 5 |
| `17-legal` | 5 |
| `18-finance` | 5 |
| `19-marketing` | 5 |
| `20-sales` | 5 |
| `21-operations` | 5 |
| `22-customer-support` | 5 |
| `23-agent-engineering` | 11 |
| `24-prompt-systems` | 10 |
| `25-business-and-product-growth` | 10 |
| `26-discord-community` | 12 |
| `27-web-apps-fullstack` | 12 |
| `28-local-ai-systems` | 12 |
| `29-security-and-trust` | 12 |
| `30-research-and-evidence` | 10 |
| `31-creator-and-branding` | 10 |
| `32-learning-and-school` | 10 |
| `33-systems-and-os` | 9 |
| `34-roblox-game-dev` | 8 |
| `35-quality-and-evals` | 10 |
| `36-life-operations` | 10 |
| `37-advanced-data` | 8 |
| `38-automation-and-integrations` | 10 |
| `39-mobile-and-design-systems` | 8 |
| `40-deployment-and-hosting` | 8 |

---

## 7. High-Level Architecture

```txt
User
 |
 | npm.cmd run kairos -- <command>
 v
src/kairos/cli.js
 |
 +-- chat ----------------------> core/chat.js
 |                                |
 |                                +-- core/brain.js
 |                                +-- core/providers.js
 |                                +-- core/provider-health.js
 |                                +-- core/memory.js
 |
 +-- setup ---------------------> core/setup.js
 |
 +-- brain/providers -----------> core/providers.js
 |                                core/provider-health.js
 |                                core/brain.js
 |
 +-- /goal ---------------------> core/goal-manager.js
 |                                |
 |                                +-- core/governor.js
 |                                +-- core/model-router.js
 |                                +-- core/skills.js
 |                                +-- core/storage.js
 |
 +-- approve -------------------> core/goal-manager.js
                                  |
                                  +-- core/agent-loop.js
                                       |
                                       +-- core/brain.js
                                       +-- core/context-index.js
                                       +-- core/memory.js
                                       +-- core/self-improvement.js
                                       +-- core/checkpoint.js
                                       +-- core/safety.js
                                       +-- core/workspace-tools.js
                                       +-- core/web-tools.js
                                       +-- core/test-runner.js
```

Data flow:

```txt
.env
 |
 v
Provider config + data directory
 |
 v
data/kairos/
 |
 +-- goals/*.json           goal records
 +-- memory/profile.json    user/project memory
 +-- memory/conversation    chat history when created
 +-- logs/*.jsonl           tool events
 +-- lessons.jsonl          goal lessons
 +-- context-index.json     searchable local context
 +-- checkpoints/*.json     resumable goal state
```

Agent loop flow:

```txt
Goal approved
 |
 v
Load checkpoint/history/memory/lessons/context
 |
 v
Prompt brain for JSON action plan
 |
 v
Normalize Ollama/model output
 |
 v
Validate schema + quality + risk
 |
 v
Execute allowed actions
 |
 +-- read file
 +-- write file after review
 +-- run command after review/sandbox routing
 +-- run test command
 +-- web_fetch
 +-- browser_open
 +-- think
 |
 v
Save steps/logs/checkpoint
 |
 v
Record lesson and update goal
```

---

## 8. CLI Command Surface

Top-level command handling lives in `src/kairos/cli.js`.

Major commands:

- `start` or no args: opens menu.
- `chat`: opens AI chat.
- `chat setup`: opens chat-specific provider setup.
- `setup`: first-run setup.
- `doctor`: health report.
- `/goal "<goal>"`: creates a guarded goal.
- `approve <goal-id>`: runs an approved goal.
- `status [goal-id]`: lists goals or shows one goal.
- `skills list/search/show`: skill management.
- `context build/search`: local context retrieval.
- `tools list`: tool registry.
- `logs`: recent tool events.
- `lessons`: self-improvement lessons.
- `providers list/status/setup`: provider management.
- `brain setup/status/list/check/ask`: brain management and one-shot prompting.
- `sandbox status`: sandbox health.
- `ollama models`: list local Ollama models.
- `run`: reviewed shell command.
- `web_fetch`: guarded web fetch.
- `browser_open`: guarded browser open.
- `scan`: project scan.
- `search`: project text search.
- `read`: read file.
- `mkdir`: make directory.
- `zip`: package path.
- `build`: generate starter project.
- `memory show/set`: memory inspection and writes.

The CLI currently uses straightforward `if (command === ...)` routing instead of a command framework. This is simple and readable, but it will become harder to maintain as commands grow.

---

## 9. Core Module Deep Dive

### 9.1 `src/kairos/cli.js`

Role: Main entry point.

Important functions:

- `parseArgs(argv)`: converts CLI argv into positional args and `--flags`.
- `printHelp()`: prints command reference.
- `printGoal(goal)`: JSON output wrapper.
- `main()`: command dispatcher.

What it does well:

- Centralizes the user-facing command surface.
- Supports both command mode and menu mode.
- Exposes nearly all implemented core systems.
- Uses `printJson`, `printScan`, `printSearch`, and `printToolResult` for nicer output where possible.

Weaknesses:

- Very large function.
- Command parsing is custom and limited.
- No subcommand registry.
- Some implemented helpers, like git helpers, are not yet exposed.

Recommended improvement:

Move commands into a table:

```txt
commands = {
  chat: { help, run },
  brain: { subcommands },
  context: { subcommands }
}
```

This would make help generation and testing easier.

### 9.2 `src/kairos/core/chat.js`

Role: ChatGPT-style interactive terminal chat.

Important functions:

- `chatHelpText()`: slash command reference.
- `runChatSetup(flags)`: provider setup inside chat.
- `ensureChatReady(flags)`: provider config and health flow.
- `buildChatIntro(provider, health)`: startup banner.
- `rememberExchange(history, message, reply)`: writes conversation history and trims it.
- `runChat(flags)`: main interactive loop.

Current chat commands:

- `/help`
- `/setup`
- `/brain`
- `/history`
- `/clear`
- `/cost`
- `/exit`

What it does well:

- Checks provider status before chat.
- Gives fix instructions when Ollama is unreachable.
- Supports setup from inside chat.
- Keeps local conversation history.
- Tracks estimated session cost.
- Uses friendly `You:` and `Kairos:` formatting.

Current weakness:

- Terminal only.
- No streaming output.
- No multiline paste mode.
- No markdown rendering beyond plain terminal text.
- No tool use from chat yet. Chat answers only through the brain provider.

Recommended improvements:

- Add streaming for Ollama and OpenAI-compatible providers.
- Add `/mode normal|agent|research|code`.
- Add `/attach <file>` for context.
- Add `/save <name>` transcripts.
- Add tool-aware chat where Kairos can ask for permission to read files or run commands.

### 9.3 `src/kairos/core/brain.js`

Role: Provider calling layer.

Important functions:

- `postJson(url, payload, options)`: HTTP POST helper.
- `formatHttpFailure(result)`: readable provider error.
- `askCodex(prompt)`: local Codex bridge.
- `kairosSystemPrompt()`: assistant personality and safety rules.
- `normalizeChatMessages(prompt, history)`: builds chat message arrays.
- `askOllama(prompt, history)`: Ollama `/api/chat`.
- `askOpenAiCompatible(...)`: OpenAI/OpenRouter/Kimi shared path.
- `askAnthropic(prompt, history)`: Anthropic Messages API.
- `askGemini(prompt, history)`: Gemini API.
- `askBrain(prompt, history)`: provider switch.

Current provider support:

- `offline`
- `ollama`
- `openai`
- `openrouter`
- `kimi`
- `anthropic`
- `gemini`
- `codex`

What it does well:

- Keeps provider differences mostly hidden.
- Counts approximate token cost.
- Uses a system prompt for consistent assistant behavior.
- Gives useful Ollama failure instructions.

Weaknesses:

- No streaming.
- No retries/backoff.
- No structured provider error type.
- No tool-call support.
- No model capability metadata.
- OpenAI-compatible payload does not set `temperature`, `max_tokens`, or response format.

Recommended improvements:

- Add provider abstraction objects with `chat()`, `health()`, `models()`, `stream()`.
- Add retry with timeout configuration.
- Add JSON-mode support for agent loop planning where supported.
- Add provider capability table.

### 9.4 `src/kairos/core/providers.js`

Role: Provider definitions and setup.

Important constants/functions:

- `PROVIDER_DEFINITIONS`
- `PROVIDER_MENU`
- `activeProviderId()`
- `providerStatus(providerId)`
- `listProviders()`
- `chooseProvider(defaultProvider)`
- `setupProvider(providerId, flags)`

Provider defaults:

- Ollama: `http://localhost:11434`, model `llama3.1`
- OpenAI: `gpt-4.1-mini`
- Anthropic: `claude-3-5-sonnet-latest`
- Gemini: `gemini-1.5-flash`
- Kimi: `kimi-latest`
- OpenRouter: `openai/gpt-4.1-mini`
- Codex: command `codex`, args `exec`

Current active provider on this machine:

```json
{
  "id": "ollama",
  "label": "Ollama",
  "kind": "local-model",
  "configured": true,
  "KAIROS_OLLAMA_BASE_URL": "http://localhost:11434",
  "KAIROS_OLLAMA_MODEL": "gemma4"
}
```

Weakness:

Provider `configured` means required environment variables exist. It does not mean the provider is reachable. Health check is separate.

### 9.5 `src/kairos/core/provider-health.js`

Role: Health checks.

Important functions:

- `requestJson(url, options)`
- `detectCodex()`
- `checkOllama()`
- `listOllamaModels()`
- `checkBearerProvider(...)`
- `checkGemini()`
- `checkCodex()`
- `checkProvider(providerId)`

Current result:

```txt
Brain: ollama - not ready
Ollama is not reachable at http://localhost:11434
```

Likely fix:

```powershell
ollama serve
ollama pull gemma4
npm.cmd run kairos -- brain check ollama
```

Weakness:

Cloud provider checks use model-list endpoints, which confirm key validity but not necessarily that a configured chat model can complete a prompt.

### 9.6 `src/kairos/core/agent-loop.js`

Role: The heart of the AI agent execution system.

Supported actions:

- `read`
- `write`
- `run`
- `test`
- `web_fetch`
- `browser_open`
- `think`

Important functions:

- `executeAction(action, goal, flags)`: executes normalized action.
- `getRelevantSkillsContent(goalTitle)`: loads relevant skills.
- `actionSchemaText()`: tells LLM required JSON shape.
- `actionRulesText()`: rules for safe planning.
- `sandboxInstructionText(flags)`: tells LLM about sandbox mode.
- `ethicsAndQualityText()`: safety/quality prompt rules.
- `buildAgentContextSection(...)`: adds memory, history, prior steps, sandbox, and retrieved context.
- `validateActionQuality(actions, goalTitle)`: quality gate.
- `normalizeActionPlan(actions)`: canonicalizes action names and parameter keys.
- `parseActionsFromResponse(response)`: extracts JSON arrays from messy LLM output.
- `validateActionPlan(actions, goalTitle, options)`: schema and quality validation.
- `generateMultiAgentPlan(...)`: planner/builder/reviewer prompt chain.
- `generatePlan(...)`: direct or multi-agent planning.
- `runAgentLoop(goal, flags)`: full execution loop.

Recent hardening:

- Handles Ollama outputs like `Read` and `Path`.
- Extracts valid JSON arrays from extra wrapper text.
- Rejects placeholder writes like `content: "..."`.
- Rejects high-risk shell commands.
- Rejects overly large action plans.
- Reduces non-coding goals accidentally writing code.
- Uses context index retrieval before planning.

Strength:

The normalization layer is practical and important. Local LLMs often produce slightly malformed plans. This code now tolerates casing and wrapper text while still rejecting unsafe or low-quality actions.

Weaknesses:

- Main file is large and does many things.
- No formal JSON schema validation library.
- Prompt retry strategy is simple.
- Multi-agent mode is prompt-based, not separate worker agents.
- No patch/diff apply tool yet, only write whole file.
- Execution is mostly sequential.

Recommended split:

```txt
agent-loop.js
agent-actions.js
agent-prompts.js
agent-normalize.js
agent-validate.js
agent-execute.js
```

### 9.7 `src/kairos/core/agents.js`

Role: Offline swarm role contracts.

Important functions:

- `plannerAgent(goal)`
- `builderAgent(plan)`
- `reviewerAgent(goal, build)`
- `testerAgent()`
- `packagerAgent(goal)`
- `runOfflineSwarm(goal)`

This gives goal creation a structured safety warning and role breakdown even without live model execution.

Weakness:

The offline swarm is mostly static/rule-based. It is useful for MVP warnings, not true autonomous collaboration.

### 9.8 `src/kairos/core/goal-manager.js`

Role: Goal lifecycle.

Important functions:

- `nextGoalId()`
- `createGoal(...)`
- `runApprovedGoal(goalId, flags)`

Goal creation records:

- Title.
- Status.
- Budget mode.
- Approval mode.
- Model plan.
- Suggested skills.
- Success criteria.
- Active provider.
- Warning text.

Approval:

- Marks goal approved.
- Runs `runAgentLoop`.
- Stores output.
- Marks completed or failed.
- Removes checkpoint if completed.

Weakness:

Goal success criteria are generic. Future versions should derive criteria from the actual goal.

### 9.9 `src/kairos/core/governor.js`

Role: Warning and approval metadata.

Important functions:

- `buildWarning(goal, modelPlan)`
- `approveGoal(goal)`

The warning makes safety rules visible before the user runs a goal.

Strength:

Good MVP safety posture: file edits, shell, web, and provider calls are explicitly explained.

### 9.10 `src/kairos/core/model-router.js`

Role: Budget mode and model role routing.

Budget modes:

- `cheap`
- `balanced`
- `best`

Roles:

- planner
- builder
- reviewer
- tester
- packager

The router maps roles to providers such as `offline-rules`, `ollama-local`, active configured providers, or future cloud adapters.

Weakness:

This is currently routing metadata more than actual per-role provider dispatch. The agent loop still primarily calls `askBrain`.

### 9.11 `src/kairos/core/memory.js`

Role: Local memory and conversation history.

Memory fields:

- `user.name`
- `user.style`
- `user.goals`
- `preferences.shell`
- `preferences.stack`
- `preferences.safety`
- `preferences.budget`
- `preferences.defaultBrain`
- `projects`
- `builds`
- `notes`

Important functions:

- `ensureMemory()`
- `loadMemory()`
- `saveMemory(memory)`
- `setMemoryValue(key, value)`
- `addProject(project)`
- `addBuild(build)`
- `loadConversationHistory()`
- `saveConversationHistory(history)`
- `addToConversationHistory(role, content, metadata)`
- `clearConversationHistory()`

Strength:

Local-first and transparent. Easy to inspect and edit.

Weakness:

Memory is not semantically ranked except through the context index. No memory decay, tagging, or user approval workflow for learned facts.

### 9.12 `src/kairos/core/context-index.js`

Role: Local retrieval.

Indexed sources:

- Skills.
- Memory.
- Lessons.
- Project files.

Important functions:

- `redact(text)`: removes common secret values.
- `tokenize(text)`: lowercases and splits.
- `chunkText(text)`: splits documents.
- `indexSkills()`
- `indexMemory()`
- `indexLessons()`
- `indexProjectFiles()`
- `createContextIndex(options)`
- `buildContextIndex(options)`
- `loadContextIndex(options)`
- `searchContextDocuments(query, documents, options)`
- `searchContextIndex(query, options)`
- `formatContextResultsForPrompt(results)`

Current index:

- Path: `data/kairos/context-index.json`
- Size: about 4.51 MB
- Documents after latest build: about 1,304
- Sources: 1,180 skill chunks, 1 memory chunk, 3 lesson chunks, 120 project chunks

Strength:

This is a strong MVP RAG-style feature without external dependencies.

Weakness:

It is lexical search, not embeddings. It may miss semantic matches and produce duplicate-ish chunks.

Recommended future:

- Add embeddings with local model support.
- Store compact index instead of pretty huge JSON.
- Add source freshness checks.
- Add per-source weights.
- Add context budget control.

### 9.13 `src/kairos/core/skills.js`

Role: Markdown skills discovery/search/show.

Important functions:

- `skillsRoot()`
- `walkMarkdownFiles(dirPath)`
- `parseSkill(filePath, rootDir)`
- `listSkills()`
- `getSkill(skillId)`
- `getSkillContent(skillId)`
- `searchSkills(query, limit)`
- `suggestSkillsForGoal(title, limit)`

Search strategy:

- Parses title/role/when-to-activate sections.
- Uses keyword overlap scoring.
- Returns ranked skills.

Strength:

Works with a plain folder of markdown files, no database.

Weakness:

No skill validation schema.
No skill versioning.
No install/update workflow inside Kairos yet.

### 9.14 `src/kairos/core/tools.js`

Role: Static tool registry.

Ready tools:

- goal create/approve
- skills list/search/show
- brain setup/status
- provider setup/status
- files read/search/write
- shell safe-run
- shell ubuntu-sandbox
- shell approve
- project scan/build/index
- context index/search
- web fetch
- browser open
- memory read/write
- agents swarm
- self lessons
- package export

Planned tools:

- files patch
- diff view
- git status/diff/branch
- npm install
- tests run
- security scan

Weakness:

Registry is descriptive only. Tools are not objects with schemas/handlers.

Future:

Turn tools into executable definitions:

```txt
id
description
params schema
risk level
handler
permission requirements
```

### 9.15 `src/kairos/core/safety.js`

Role: Risk review and approval.

High-risk command patterns include examples such as:

- `rm -rf`
- `del /s`
- disk format commands
- destructive `find -delete`
- curl/wget piped to shell
- sudo/su
- docker/podman run
- mount/umount
- recursive chmod/chown

Medium-risk patterns include:

- package installs
- git push
- npm publish
- pip install
- PowerShell execution policy changes

Important functions:

- `reviewCommand(command)`
- `reviewAction(action)`
- `requireApproval(review, flags)`

Strength:

Useful guardrails for a local coding agent.

Weakness:

Regex safety checks are necessary but not sufficient. They can miss obfuscated or indirect destructive behavior.

Future:

- Add command AST parsing where possible.
- Add deny-by-default modes.
- Add path-level write permissions.
- Add command allowlists for unattended mode.

### 9.16 `src/kairos/core/sandbox.js`

Role: Optional command sandbox routing.

Modes:

- `host`
- `ubuntu-docker`
- `ubuntu-wsl`

Docker hardening:

- `--cap-drop ALL`
- `--security-opt no-new-privileges`
- `--network none` by default
- `--read-only`
- tmpfs mounts
- pids limit
- memory limit
- CPU limit
- `--user 1000:1000`
- Ubuntu image allowlist
- Docker pull disabled by default

Current machine status:

- Sandbox mode: host
- Docker: not found
- WSL normal-user distro: not found
- WSL distro desired: `KairosUbuntu`

Important caveat:

WSL is a Linux execution environment, not a hardened sandbox. Docker is stronger.

### 9.17 `src/kairos/core/workspace-tools.js`

Role: Project file and command operations.

Important functions:

- `safeResolve(targetPath)`: prevents escaping workspace.
- `scanProject(targetPath)`
- `searchFiles(query, targetPath)`
- `readTextFile(targetPath, options)`
- `makeDir(targetPath, flags)`
- `zipPath(sourcePath, outPath, flags)`
- `runReviewedCommand(command, flags)`

Strength:

Most risky operations pass through safety review and logs.

Weakness:

File writing is whole-file oriented. Patch-based edits are planned but not implemented here.

### 9.18 `src/kairos/core/web-tools.js`

Role: Guarded HTTP fetch and browser open.

Important functions:

- `normalizeHttpUrl(rawUrl)`
- `bodyToOutput(body, contentType)`
- `requestText(parsedUrl, options, redirectsRemaining)`
- `webFetch(rawUrl, flags, options)`
- `normalizeBrowserTarget(rawTarget, options)`
- `browserOpen(rawTarget, flags, options)`

Features:

- HTTP/HTTPS only.
- Max byte limits.
- Redirect limits.
- Basic HTML to text conversion.
- Remote browser targets require approval.
- Localhost/workspace browser opens are easier.

Weakness:

Not a full crawler. No robots handling. No browser automation. No JavaScript rendering.

### 9.19 `src/kairos/core/builder.js`

Role: Starter project generator.

Templates:

- `node-cli`
- `discord-bot`

Features:

- Writes starter files.
- Prevents overwriting unless `--force`.
- Logs tool event.
- Adds project/build memory.

Weakness:

Templates are embedded strings in code. Better future design would use template folders.

### 9.20 `src/kairos/core/setup.js`

Role: First-run setup.

Features:

- Prints banner and security warning.
- Chooses data directory.
- Chooses provider.
- Writes `.env`.
- Ensures memory file exists.
- Runs health check.

Current setup warning correctly emphasizes:

- Review plans before approval.
- Do not paste tokens into output.
- Keep secrets in `.env`.
- Do not approve unknown commands.
- Treat remote control as high risk.

### 9.21 `src/kairos/core/menu.js`

Role: Interactive terminal menu.

Menu options:

1. First-run setup
2. AI Brain Chat
3. Doctor health check
4. New goal
5. Show goals
6. Search skills
7. Show tools
8. Scan project
9. Search files
10. Read file
11. Package zip
12. Run reviewed command
13. Build starter project
14. Show logs
15. Show memory
16. Add memory note
17. Exit

Weakness:

Single-action menu only. It exits after completing an option instead of looping.

### 9.22 `src/kairos/core/doctor.js`

Role: Health summary.

Reports:

- Brain/provider readiness.
- Memory path and counts.
- Project file count.
- Scripts.
- Recent tool events.

Current doctor result:

- Brain `ollama` not ready.
- Memory exists.
- Project files: 339.
- Scripts: `kairos`, `check`, `test`.
- Recent events include project scans, agent loop, and lessons.

### 9.23 `src/kairos/core/self-improvement.js`

Role: Lessons from prior goals.

Features:

- Reads/writes `lessons.jsonl`.
- Redacts secrets.
- Summarizes action counts.
- Adds recent lessons to future agent prompts.

Weakness:

Lessons are generic. Future versions should capture error cause, fix, and reusable pattern more specifically.

### 9.24 `src/kairos/core/checkpoint.js`

Role: Resume support.

Stores:

- goal id
- next step index
- planned actions
- completed steps
- context

Useful for long-running goals.

### 9.25 `src/kairos/core/storage.js`

Role: Local data paths and goal persistence.

Important:

- `kairosDataDir()` reads `KAIROS_DATA_DIR`.
- Fallback is repo-local data directory.
- `saveGoal`, `loadGoal`, `listGoals` are JSON file based.

### 9.26 `src/kairos/core/env.js`

Role: `.env` parser and writer.

Strength:

- Simple and dependency-free.
- Masks secrets for status output.

Weakness:

- Not a full dotenv parser.
- Comments/order may be partially preserved but advanced dotenv syntax is not supported.

### 9.27 `src/kairos/core/cost.js`

Role: Rough token/cost estimation.

Weakness:

Token estimation is approximate. Local Ollama cost is effectively zero but still tracks rough usage.

### 9.28 `src/kairos/core/test-runner.js`

Role: Test command wrapper.

Uses `runReviewedCommand`, then parses failure hints.

Weakness:

No structured test framework integration beyond stdout/stderr parsing.

### 9.29 `src/kairos/core/tool-log.js`

Role: Append-only JSONL tool log.

Good for:

- Auditing commands.
- Seeing recent tool usage.
- Doctor report.

### 9.30 `src/kairos/core/git.js`

Role: Early git helper.

Functions:

- `gitStatus`
- `gitDiff`
- `gitCommit`
- `gitBranch`

Status:

Partially implemented, not fully wired into CLI/tool registry.

### 9.31 `src/kairos/core/format.js`

Role: Human-readable CLI output helpers.

### 9.32 `src/kairos/core/paths.js`

Role: Root path and default data directory constants.

---

## 10. Data Folder Analysis

Current `data/kairos` contents:

- `context-index.json`: about 4.51 MB.
- `goals`: 10 goal JSON files.
- `lessons.jsonl`: 3 lessons.
- `logs`: 2 daily log files.
- `memory/profile.json`: 1,008 bytes.

Goal data shows Kairos has been used for:

- Agent improvement.
- Sandbox work.
- Ollama normalization regression.
- Chat/report/testing work.

Important current failure evidence:

The pasted log for `goal_20260602200815_jld2` shows the agent completed with a `think` action because Ollama failed:

```txt
Ollama call failed.
No HTTP response received.
```

This is not a code crash. It is an environment readiness issue.

---

## 11. Memory System

Current memory design:

```txt
memory/profile.json
 |
 +-- version
 +-- user
 |   +-- name
 |   +-- style
 |   +-- goals
 |
 +-- preferences
 |   +-- shell
 |   +-- stack
 |   +-- safety
 |   +-- budget
 |   +-- defaultBrain
 |
 +-- projects
 +-- builds
 +-- notes
```

Current default memory says the user prefers:

- Direct, practical style.
- Cheap/free tools.
- MVP first.
- PowerShell.
- Node.js, Discord.js, Chrome extensions.
- Safety boundaries around token stealers, spam/raid tools, and risky actions.

Memory strengths:

- Easy to inspect.
- Local-only.
- Used by agent prompt context.
- Can be updated from CLI.

Memory weaknesses:

- No schema migration system.
- No memory confidence level.
- No explicit "approve learned memory" flow.
- Conversation history may grow unless trimmed by chat.

---

## 12. Agent Loop and Planning System

The current agent loop is the most important part of Kairos.

Prompt context includes:

- Goal title.
- Relevant skills.
- Recent lessons.
- Memory snapshot.
- Recent conversation.
- Previous steps.
- Sandbox instructions.
- Retrieved local context.
- Ethics and quality rules.
- JSON action schema.

Accepted action schema:

```json
[
  {"action":"read","params":{"path":"README.md"}},
  {"action":"write","params":{"path":"file.js","content":"..."}},
  {"action":"run","params":{"command":"npm.cmd test"}},
  {"action":"test","params":{"command":"npm.cmd test"}},
  {"action":"web_fetch","params":{"url":"https://example.com"}},
  {"action":"browser_open","params":{"target":"localhost:3000"}},
  {"action":"think","params":{"reasoning":"..."}}
]
```

Model output hardening:

- Normalizes action names:
  - `Read` -> `read`
  - `RUN` -> `run`
- Normalizes parameter names:
  - `Path` -> `path`
  - `Command` -> `command`
- Extracts JSON arrays from wrapper text.
- Parses command blocks when possible.
- Retries planning when validation fails.

Quality gate rejects:

- Unknown actions.
- Missing params.
- Placeholder write content.
- High-risk shell commands.
- Too many actions.
- Suspicious writes for non-coding goals.

This is a major improvement over naive local-agent execution.

---

## 13. Tools System

Kairos tool registry is descriptive but useful. It currently reports 34 tools:

Ready:

- `goal.create`
- `goal.approve`
- `skills.list`
- `skills.search`
- `skills.show`
- `brain.setup`
- `brain.status`
- `providers.setup`
- `providers.status`
- `files.read`
- `files.search`
- `files.write`
- `shell.safe-run`
- `shell.ubuntu-sandbox`
- `shell.approve`
- `project.scan`
- `project.build`
- `project.index`
- `context.index`
- `context.search`
- `web.fetch`
- `browser.open`
- `memory.read`
- `memory.write`
- `agents.swarm`
- `self.lessons`
- `package.export`

Planned:

- `files.patch`
- `diff.view`
- `git.status`
- `git.diff`
- `git.branch`
- `npm.install`
- `tests.run`
- `security.scan`

Recommendation:

Make the registry executable. Each tool should include:

```txt
id
description
status
input schema
output schema
risk classification
approval policy
handler
tests
```

---

## 14. Skills System

Kairos includes a large local skill library. These skills act like expert personas and workflows for the agent.

Major domains:

- Coding
- Backend
- Frontend
- DevOps
- Data
- AI/ML
- Research
- Product
- Communication
- Learning
- Meta-agent workflows
- Innovation
- Management
- Cybersecurity
- Ethics
- Legal
- Finance
- Marketing
- Sales
- Operations
- Customer support
- Agent engineering
- Prompt systems
- Business growth
- Discord community
- Full-stack web apps
- Local AI systems
- Security and trust
- Research evidence
- Branding
- School/learning
- Systems/OS
- Roblox
- Quality/evals
- Life operations
- Advanced data
- Automation integrations
- Mobile/design systems
- Deployment/hosting

Strong skills for Kairos itself:

- `12-meta/agent-orchestrator.md`
- `12-meta/context-manager.md`
- `12-meta/output-formatter.md`
- `12-meta/prompt-optimizer.md`
- `12-meta/quality-assurance.md`
- `23-agent-engineering/agent-architect.md`
- `23-agent-engineering/agent-debugger.md`
- `23-agent-engineering/context-window-manager.md`
- `23-agent-engineering/memory-system-designer.md`
- `23-agent-engineering/model-routing-engineer.md`
- `28-local-ai-systems/ollama-integration-specialist.md`
- `28-local-ai-systems/rag-pipeline-builder.md`
- `29-security-and-trust/secrets-manager.md`

Current weakness:

Skills are searchable and injected into prompts, but they are not yet executable workflows with state, validation, or automated toolchains.

---

## 15. Models and Provider System

Kairos supports multiple provider categories:

```txt
offline       no model
ollama        local model server
openai        cloud API
anthropic     cloud API
gemini        cloud API
kimi          cloud API
openrouter    cloud router
codex         local worker bridge
```

Current active provider:

```txt
ollama
model: gemma4
base URL: http://localhost:11434
configured: yes
health: not ready
```

Most important current fix:

```powershell
ollama serve
ollama pull gemma4
npm.cmd run kairos -- brain check ollama
```

Better default suggestion:

If `gemma4` is unavailable, switch to a common installed model:

```powershell
npm.cmd run kairos -- brain setup --provider ollama --model llama3.1 --yes
ollama pull llama3.1
```

---

## 16. Search, Retrieval, and Crawling

### Search

Implemented:

- File search through workspace text files.
- Skill search.
- Context index search.

Commands:

```powershell
npm.cmd run kairos -- search "query" src
npm.cmd run kairos -- skills search "security auditor"
npm.cmd run kairos -- context search "agent orchestrator"
```

### Retrieval

Implemented:

- Local lexical context index.
- Skills/memory/lessons/project snippets.
- Redaction before indexing.
- Prompt injection into agent loop.

### Crawling

Not fully implemented.

Implemented:

- `web_fetch` can fetch one approved HTTP(S) URL.
- Redirects and byte limits exist.
- Basic HTML-to-text exists.

Not implemented:

- Multi-page crawling.
- Sitemap crawling.
- Browser-rendered crawling.
- Robots.txt handling.
- Rate-limit scheduling.
- Crawl cache.

---

## 17. Plugins

Kairos has a plugin vision but no full plugin runtime in the repository.

Current plugin-adjacent systems:

- Skills library.
- Tool registry.
- Provider definitions.
- Builder templates.

Missing plugin runtime pieces:

- Plugin manifest schema.
- Plugin loader.
- Permission system.
- Tool registration API.
- Plugin install/update/remove commands.
- Plugin sandbox policy.
- Plugin tests.

Recommended plugin shape:

```txt
plugins/
  plugin-name/
    plugin.json
    tools/
    skills/
    templates/
    README.md
```

---

## 18. UI and Dashboard

Current UI:

- Terminal CLI.
- Interactive menu.
- Chat loop.

Current dashboard:

- No web dashboard implemented.

Existing UI-like entry points:

- `npm.cmd run kairos`
- `npm.cmd run kairos -- chat`
- `npm.cmd run kairos -- doctor`
- `npm.cmd run kairos -- tools list`
- `npm.cmd run kairos -- status`

Recommended dashboard:

```txt
Kairos Dashboard
 |
 +-- Chat
 +-- Goals
 +-- Memory
 +-- Tools
 +-- Skills
 +-- Providers
 +-- Logs
 +-- Sandbox
 +-- Project scan
 +-- Settings
```

Suggested stack:

- Vite + React or Next.js.
- Local-only server.
- No auth for local-only MVP, but bind to localhost.
- Later add auth before remote access.

---

## 19. Discord Integration

Implemented:

- Discord-related skills.
- Discord bot starter template.
- Memory references to POSEIDON Discord Bot.

Not implemented:

- Running Discord bot inside Kairos.
- Discord command control of Kairos.
- Token management flow.
- Discord dashboard.
- Permissions and role mapping.
- Audit logs for Discord-triggered actions.

Security warning:

Discord remote control is high risk. If implemented, it must require:

- Strict allowlist of users.
- Server/guild allowlist.
- Command-level permissions.
- Human approval for destructive actions.
- No tokens in chat output.
- Rate limiting.
- Audit logs.

---

## 20. Voice Integration

Implemented:

- Voice/local AI skills in library:
  - `tts-voice-integrator`
  - `speech-to-text-pipeline`

Not implemented:

- Runtime microphone capture.
- Speech-to-text.
- Text-to-speech.
- Wake word.
- Voice command permissions.

Recommended future:

- Start with push-to-talk.
- Local STT first if possible.
- Read-only voice commands first.
- No shell/file actions by voice until approval model exists.

---

## 21. Sandbox Status

Code support:

- Host mode.
- Ubuntu Docker mode.
- Ubuntu WSL mode.

Current machine status:

```json
{
  "mode": "host",
  "enabled": false,
  "docker": {
    "found": false
  },
  "wsl": {
    "found": false,
    "distro": "KairosUbuntu"
  }
}
```

Interpretation:

Sandbox code exists, but this specific normal-user environment does not currently have Docker or a visible WSL distro. The agent will run reviewed commands on host PowerShell unless `KAIROS_COMMAND_SANDBOX` is set and the sandbox backend exists.

Security recommendation:

Docker should be preferred over WSL for sandboxing. WSL is useful for Linux compatibility but not strong isolation.

---

## 22. Security Assessment

### Strengths

- Local-first by design.
- No paid API calls by default.
- Explicit provider setup.
- `.env` secret masking in provider status.
- Command risk regexes.
- Human approval prompts.
- Workspace path resolution.
- Remote web/browser approval.
- Tool logs.
- Docker hardening design.
- Context index redacts common secrets.
- Safety prompt rules.

### Key Risks

1. `.env` exists in repo root.
   - Must never be committed or shared.
   - `.gitignore` should protect it, but users can still leak it manually.

2. Regex command review can be bypassed.
   - Complex shell tricks can hide dangerous behavior.

3. Whole-file writes are risky.
   - Agent can overwrite an entire file if approved.

4. Context index can store project snippets.
   - Redaction helps but is not perfect.
   - Secret scanning before indexing should be stronger.

5. WSL is not a strong sandbox.
   - Treat it as compatibility, not isolation.

6. Provider health and config are separate.
   - The system can say provider is configured while the model is unreachable.
   - Chat now handles this better.

7. Future Discord/voice control would be high risk.
   - Needs strong auth and permissions.

### Priority Security Improvements

1. Add `security.scan` implementation for secrets and dangerous code.
2. Add `.env` detection to reports and warnings without printing contents.
3. Add patch/diff approval before file writes.
4. Add command allowlists for unattended runs.
5. Add stronger sandbox setup docs and checks.
6. Add permission profiles for tools.
7. Add audit log viewer.

---

## 23. Performance Assessment

### Current Performance Strengths

- No dependency install overhead.
- Plain file storage is fast for MVP scale.
- Skill search is simple.
- Context build works locally.
- CLI starts quickly.

### Bottlenecks

1. `context-index.json` is large and pretty-printed.
   - About 4.51 MB now.
   - It will grow as project files and skills grow.

2. Context index rebuild scans many markdown files.
   - Acceptable now, but will slow with larger projects.

3. Agent loop uses full prompt sections.
   - Can become too much context for small local models.

4. No streaming chat.
   - User waits silently except "thinking" message.

5. File scanning uses synchronous filesystem APIs.
   - Fine for CLI MVP, less ideal for dashboard/server.

6. Large `agent-loop.js` has growing complexity.
   - Maintenance performance will degrade before runtime performance does.

### Performance Improvements

- Minify or compact context index.
- Add incremental indexing by file mtime.
- Add max context budget per source.
- Add streaming output.
- Cache skill parse results.
- Split large modules.

---

## 24. Testing Status

Test files:

- `src/kairos/test/smoke.js`
- `math.test.js`

NPM scripts:

```json
{
  "kairos": "node src/kairos/cli.js",
  "check": "node --check ...",
  "test": "node src/kairos/test/smoke.js"
}
```

Smoke coverage includes:

- Provider status exists.
- Chat help includes setup.
- Tool registry entries.
- Skill search.
- Context index search.
- Secret tokenization/redaction behavior.
- Web URL normalization.
- Browser target normalization.
- Sandbox command construction.
- Ubuntu Docker/WSL argument generation.
- Ubuntu image allowlist.
- Safety command review.
- Action plan normalization.
- Failed goal regression for `goal_20260601221016_rluw`.
- Placeholder write rejection.
- High-risk command rejection.
- Memory and lessons.
- Project scan.
- Tool logs.

Validation result:

```txt
npm.cmd run check: passed
npm.cmd test: passed
```

Weakness:

There is no test framework like Jest/Vitest. No coverage report. No mock provider tests. No integration tests for CLI stdin flows except manual smoke.

Recommended:

- Add Node test runner or Vitest.
- Add mock HTTP provider.
- Add CLI integration tests.
- Add fixture-based tests for action parser.
- Add sandbox status tests independent of installed Docker/WSL.

---

## 25. Development Status Matrix

| Area | Status | Notes |
|---|---|---|
| CLI | Working | Broad command surface exists. |
| Menu | Working | Single-action menu. |
| Chat | Working interface, provider dependent | Improved setup and health handling. |
| Provider setup | Working | Multiple providers supported. |
| Provider health | Working | Ollama currently not reachable. |
| Brain calls | Working when provider works | No streaming. |
| Goal creation | Working | Saves local goal JSON. |
| Goal approval | Working | Runs agent loop. |
| Agent loop | Working MVP | Needs module split and stronger schema validation. |
| Action normalization | Working | Regression covered. |
| File tools | Working | Whole-file write, no patch yet. |
| Shell tools | Working with review | Sandbox backend unavailable locally. |
| Web fetch | Working | Single URL fetch, not crawler. |
| Browser open | Working | Opens local/approved targets. |
| Skills | Working | Large library. |
| Context index | Working | Lexical retrieval, no embeddings yet. |
| Memory | Working | Basic local JSON. |
| Lessons | Working | Simple JSONL records. |
| Tool logs | Working | JSONL logs. |
| Sandbox code | Partially working | Code exists, backend not installed/visible. |
| Discord | Placeholder/skills/templates | No live integration. |
| Voice | Placeholder/skills | No runtime. |
| Dashboard | Missing | CLI only. |
| Plugin runtime | Missing | Skills are plugin-like but not actual plugins. |
| Git tools | Partial | Code exists, registry planned. |
| Security scan | Planned | Registry only. |
| Patch/diff workflow | Planned | Registry only. |

---

## 26. Placeholder and Experimental Code

Placeholder/planned indicators:

- `files.patch` is planned.
- `diff.view` is planned.
- `git.status`, `git.diff`, `git.branch` are planned despite `git.js`.
- `npm.install` is planned.
- `tests.run` is planned despite `test-runner.js`.
- `security.scan` is planned.
- Discord runtime is not built.
- Voice runtime is not built.
- Dashboard is not built.
- Plugin runtime is not built.
- "best" model routing is more of a routing preview than a complete cloud orchestration layer.

Small root files:

- `hello.txt`
- `math.js`
- `math.test.js`
- `approval-output.txt`

These look like smoke/demo/test artifacts rather than core product files.

---

## 27. Architecture Strengths

1. Local-first design.
2. No third-party npm dependency risk.
3. Clear separation of provider, memory, tools, and agent loop.
4. Skills library is large and useful.
5. Safety is considered from the start.
6. Goal approval model is a good foundation.
7. Context index is a practical improvement.
8. Provider health checks make failures understandable.
9. Data is inspectable.
10. The system matches the creator's interests: AI agents, Discord, security, local AI, OS experimentation, and entrepreneurship.

---

## 28. Architecture Weaknesses

1. `agent-loop.js` and `cli.js` are becoming too large.
2. Tool registry is not executable.
3. No structured schema validation.
4. No streaming provider support.
5. No real dashboard.
6. No plugin runtime.
7. Sandbox requires external setup.
8. Local model failure causes degraded goal behavior.
9. Memory system is simple.
10. Context retrieval is lexical only.
11. Tests are smoke-level.
12. Whole-file writes are riskier than patch workflows.

---

## 29. Similar Existing Projects

Kairos is conceptually similar to:

- Open Interpreter: local command/file assistant.
- Aider: coding agent with repo context.
- Continue: coding assistant integrations.
- AutoGPT: goal-oriented agent concept.
- CrewAI: multi-agent workflows.
- LangGraph/LangChain agents: tool and graph-driven agents.
- OpenWebUI + Ollama: local AI interface.
- AnythingLLM: local RAG/chat system.
- Dify: workflow/chat app builder.
- Cursor/Codex-style coding agents: coding with tool access.

Kairos differs by being:

- Very local-first.
- Simple Node CLI.
- Heavily skill-library driven.
- Built around the creator's personal AI/Discord/security/business workflow.

---

## 30. Vision Assessment

Kairos appears to be aiming to become:

```txt
A personal local AI operating layer
for coding, automation, learning, business building,
Discord/community management, security tools,
and eventually voice/dashboard/remote control.
```

The strongest vision is not just "chatbot." It is:

- A memory-backed AI assistant.
- A local automation shell.
- A coding copilot.
- A skills-driven expert system.
- A project builder.
- A safe local agent runner.
- A future Discord/voice controlled assistant.

This matches ADN.Q's profile: ambitious, experimental, interested in agents, Discord, cybersecurity, operating systems, local AI, and entrepreneurship.

Best strategic direction:

Focus Kairos into a reliable "local builder agent" before expanding into every possible feature.

---

## 31. Recommended Roadmap

### Priority 0: Make the Brain Actually Work

Fix Ollama readiness:

```powershell
ollama serve
ollama pull gemma4
npm.cmd run kairos -- brain check ollama
```

Or switch model:

```powershell
npm.cmd run kairos -- brain setup --provider ollama --model llama3.1 --yes
ollama pull llama3.1
```

Why this matters:

Most advanced Kairos features depend on working model calls.

### Priority 1: Patch/Diff Workflow

Implement:

- `files.patch`
- `diff.view`
- Preview before write.
- Approval for exact changes.

This is the biggest safety and coding-quality improvement.

### Priority 2: Tool Schema Runtime

Turn `tools.js` into real tool definitions with schemas and handlers.

### Priority 3: Split the Agent Loop

Refactor into:

- prompts
- parsing
- validation
- execution
- loop orchestration

### Priority 4: Streaming Chat

Add streaming to Ollama and OpenAI-compatible providers so chat feels alive.

### Priority 5: Context Index v2

Add:

- incremental rebuild
- compact storage
- source freshness
- local embeddings
- stronger secret scanning

### Priority 6: Real Test Framework

Add:

- Node test runner or Vitest.
- Mock provider server.
- CLI integration tests.
- Parser fixture tests.

### Priority 7: Local Dashboard

Create a localhost-only dashboard:

- Chat
- Goals
- Memory
- Tools
- Skills
- Logs
- Settings

### Priority 8: Discord Integration

Only after permissions and audit logs exist.

### Priority 9: Voice

Start with read-only push-to-talk.

---

## 32. Suggested Next 10 Engineering Tasks

1. Fix Ollama/model readiness.
2. Implement `files.patch`.
3. Add `diff.view`.
4. Add provider streaming for Ollama.
5. Add `toolDefinitions` with input schemas.
6. Add mock-provider tests for `brain.js`.
7. Split `agent-loop.js`.
8. Add context index incremental rebuild.
9. Build a simple local dashboard.
10. Implement `security.scan`.

---

## 33. Current Commands To Know

Chat:

```powershell
npm.cmd run kairos -- chat
npm.cmd run kairos -- chat setup
npm.cmd run kairos -- chat --provider ollama --yes
```

Brain:

```powershell
npm.cmd run kairos -- brain status
npm.cmd run kairos -- brain check
npm.cmd run kairos -- brain setup
npm.cmd run kairos -- ollama models
```

Goals:

```powershell
npm.cmd run kairos -- /goal "Improve Kairos safely" --approval step
npm.cmd run kairos -- approve <goal-id>
npm.cmd run kairos -- status
```

Context:

```powershell
npm.cmd run kairos -- context build
npm.cmd run kairos -- context search "security auditor"
```

Skills:

```powershell
npm.cmd run kairos -- skills list
npm.cmd run kairos -- skills search "agent orchestrator"
npm.cmd run kairos -- skills show 12-meta:context-manager
```

Health:

```powershell
npm.cmd run kairos -- doctor
npm.cmd run kairos -- sandbox status
npm.cmd run check
npm.cmd test
```

---

## 34. Final Assessment

Kairos is a strong early-stage local AI agent foundation. It already has more structure than a simple chatbot:

- Provider system.
- Memory.
- Goals.
- Agent loop.
- Skills.
- Safety.
- Context retrieval.
- Tools.
- Local data.
- Tests.

The project is still MVP quality, but the direction is coherent. The next big leap is not adding more features. The next big leap is making the existing features feel reliable:

1. Working model setup.
2. Streaming chat.
3. Safer patch-based file edits.
4. Real tool schemas.
5. Better tests.
6. Cleaner agent-loop architecture.

If Kairos focuses on those, it can become a genuinely useful local builder agent for ADN.Q's broader goals: AI systems, Discord tools, security utilities, automation, and service/product creation.

---

## 35. Verification Appendix

Commands run for this report:

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run kairos -- doctor
npm.cmd run kairos -- sandbox status
npm.cmd run kairos -- tools list
npm.cmd run kairos -- brain status
npm.cmd run kairos -- context search "chat setup agent orchestrator context manager" --limit 5
```

Results:

- Syntax check: passed.
- Smoke tests: passed.
- Doctor: provider configured but not reachable.
- Sandbox status: code present, backend unavailable in current normal-user environment.
- Context search: working.
- Tool list: working.

