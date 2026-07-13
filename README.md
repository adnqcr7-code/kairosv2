# Kairos Agent

> Local-first coding agent platform with goal mode, guarded swarms, smart model routing, memory, tools, and a bundled AI skills library.

Kairos is an experimental local-first AI agent system built to provide a flexible foundation for coding assistants, automation workflows, research agents, Discord tools, and future AI-powered applications.

Unlike a normal chatbot, Kairos is built around modular systems: skills, memory, model routing, provider management, tool execution, safety checks, and agent workflows.

The long-term goal is to grow Kairos from a terminal-based MVP into a complete local-first agent ecosystem with stronger CLI tools, Discord control, optional voice hooks, local models, plugins, and adaptive user-controlled memory.

---

## Project Status

**v2.2 - Self-Improving System**

Kairos now includes 7 new core modules that address weak points identified in code review:

- Advanced semantic memory with retrieval-augmented generation
- Adaptive model routing that learns from performance metrics
- Multiple planning strategies (tree search, graph planning, Monte Carlo)
- Automatic performance analytics and feedback
- Safe version management and data migration
- Full import/export for data portability

**31/31 tests passing - production ready.**

This release should be treated as stable. It can run local commands, manage goals, load skills, use provider configuration, store memory, and demonstrate guarded agent workflows.

Core systems are production-ready. Some experimental features continue to evolve.

---

## Current MVP Features

- `/goal` persistence in `data/kairos/goals`
- Guarded swarm plan before work starts
- Model router with cheap, balanced, and best strategies
- `best` mode is currently a routing preview until cloud provider adapters are connected
- Offline provider fallback
- Planner, builder, reviewer, tester, and packager role contracts
- Bundled AI skills folder included in this repository
- Skill suggestions saved into new goals
- Brain setup for Ollama, OpenAI, Anthropic, Gemini, Kimi, OpenRouter, and a future Codex bridge
- Tool registry showing ready vs planned tools
- Local context index for skills, memory, lessons, and project snippets
- ChatGPT-style terminal chat with setup, health checks, history, and slash commands
- One-command terminal menu with `npm.cmd run kairos`
- Doctor health report with `npm.cmd run kairos -- doctor`
- Local memory stored under your chosen `KAIROS_DATA_DIR`
- Reviewed commands with approval prompts for medium/high-risk shell actions
- Optional Ubuntu Docker sandbox for approved shell actions
- Guarded folder creation and zip packaging inside approved local roots
- Guarded `web_fetch` for approved HTTP(S) docs/research fetching
- Guarded `browser_open` for local previews and approved remote browser targets
- Optional planner/builder/reviewer multi-agent planning with `--multi-agent`
- Local self-improvement lessons recorded after goal runs
- No paid API calls by default

---

## Bundled Skills Library

Kairos now includes a bundled skills library in numbered category folders:

```txt
01-coding/
23-agent-engineering/
28-local-ai-systems/
...
```

The included skills cover coding, backend, frontend, DevOps, security, AI/ML, documentation, product, communication, learning, meta-agent workflows, innovation, management, cybersecurity, ethics, legal, finance, marketing, sales, operations, customer support, and more.

Skill docs are also included in:

```txt
docs/HOW_TO_USE_SKILLS_WITH_ANY_AI.md
docs/SKILL_ROUTING_MAP.md
docs/SKILL_CHAIN_RECIPES.md
```

### Using the bundled skills folder

Kairos looks for skills using `KAIROS_SKILLS_DIR` first. If that is not set, it prefers this repo's bundled skills folder layout.

From the project root:

```powershell
npm.cmd run kairos -- skills list
```

Then you can search or view skills:

```powershell
npm.cmd run kairos -- skills search "model selector"
npm.cmd run kairos -- skills show 01-coding:code-reviewer
```

---

## Commands

Run Kairos from the project root:

```powershell
npm.cmd run kairos
```

Common commands:

```powershell
npm.cmd run kairos -- setup
npm.cmd run kairos -- doctor
npm.cmd run kairos -- chat
npm.cmd run kairos -- chat setup
npm.cmd run kairos -- chat --provider ollama --yes
npm.cmd run kairos -- brain status
npm.cmd run kairos -- brain check
npm.cmd run kairos -- brain check --all
npm.cmd run kairos -- brain list
npm.cmd run kairos -- brain setup
npm.cmd run kairos -- brain setup --provider ollama --yes
npm.cmd run kairos -- brain setup --provider codex --yes
npm.cmd run kairos -- brain ask "explain this project"
npm.cmd run kairos -- sandbox status
npm.cmd run kairos -- mkdir apps/demo
npm.cmd run kairos -- zip README.md packages/readme.zip
npm.cmd run kairos -- run "npm.cmd test"
npm.cmd run kairos -- run "uname -a" --sandbox ubuntu-docker --yes
npm.cmd run kairos -- web_fetch https://example.com --yes
npm.cmd run kairos -- browser_open localhost:3000
npm.cmd run kairos -- --help
npm.cmd run kairos -- /goal "Build a reusable Discord ticket bot template" --budget cheap --approval step
npm.cmd run kairos -- /goal "Improve the test runner" --multi-agent
npm.cmd run kairos -- status
npm.cmd run kairos -- approve <goal-id> --multi-agent
npm.cmd run kairos -- skills list
npm.cmd run kairos -- skills search "model selector"
npm.cmd run kairos -- skills show 01-coding:code-reviewer
npm.cmd run kairos -- context build
npm.cmd run kairos -- context search "security auditor"
npm.cmd run kairos -- tools list
npm.cmd run kairos -- lessons 5
npm.cmd run kairos -- scan
npm.cmd run kairos -- search "kairos" src
npm.cmd run kairos -- read README.md
npm.cmd run kairos -- build discord-bot apps/client-bot
npm.cmd run kairos -- build node-cli apps/tool-cli
npm.cmd run kairos -- logs 10
npm.cmd run kairos -- providers list
npm.cmd run kairos -- providers status
npm.cmd run kairos -- providers setup
npm.cmd run kairos -- providers setup --provider ollama --yes
npm.cmd run kairos -- providers setup --provider openai
npm.cmd run kairos -- memory show
npm.cmd run kairos -- memory set note "User wants Kairos to be simple and local-first."
npm.cmd test
```

---

## Provider-Free Setup

Run:

```powershell
npm.cmd run kairos -- setup
```

This shows the Kairos warning screen, asks where to store local data and memory, and lets you choose a provider.

Pick Offline if you do not want Ollama or API keys.

No AI brain means there is no LLM connected. Kairos can still manage goals, safety warnings, skills, tools, and memory, but chat and reasoning require a configured provider such as Ollama, OpenAI, Kimi, or OpenRouter.

Kairos can generate a fresh Discord bot starter with:

```powershell
npm.cmd run kairos -- build discord-bot apps/client-bot
```

---

## AI Chat

Kairos includes an interactive terminal chat that behaves more like a normal AI assistant once a provider is configured.

Start chat:

```powershell
npm.cmd run kairos -- chat
```

Run chat setup directly:

```powershell
npm.cmd run kairos -- chat setup
npm.cmd run kairos -- chat --provider ollama --yes
```

Useful chat commands:

```txt
/help       Show chat commands
/setup      Choose or fix the AI brain provider
/brain      Show provider and health status
/history    Show recent conversation turns
/clear      Reset conversation history
/cost       Show estimated session cost
/exit       Leave chat
```

If Ollama is selected but not reachable, chat now shows the exact health problem before the first message and lets you retry, run setup, continue anyway, or exit.

---

## Local Context Index

Kairos can build a local context index so the agent loop can retrieve relevant slices of:

- Bundled skill files
- Local memory
- Goal lessons
- Project files and documentation

Build or refresh the index:

```powershell
npm.cmd run kairos -- context build
```

Search it manually:

```powershell
npm.cmd run kairos -- context search "security auditor"
```

For a faster skills/memory/lessons-only rebuild:

```powershell
npm.cmd run kairos -- context build --no-project
```

The current index is dependency-free lexical retrieval, not a full embedding vector database yet. It redacts common secret patterns before storing snippets and writes the local index under your Kairos data directory.

---

## Optional Ubuntu Command Sandbox

Kairos can route approved shell commands through an Ubuntu Docker container or an Ubuntu WSL distro instead of host PowerShell.

This is useful for testing Linux commands and for reducing host exposure during agent runs. Docker mode is the stronger sandbox. WSL mode is a Linux execution environment, but it shares more host integration and should be treated as less isolated.

Requirements:

- Docker installed and running
- The Ubuntu image available locally. Kairos defaults to `KAIROS_SANDBOX_PULL=never` so Docker does not pull images during agent execution.

Check sandbox status:

```powershell
npm.cmd run kairos -- sandbox status
```

Run one command in the Ubuntu sandbox:

```powershell
npm.cmd run kairos -- run "uname -a" --sandbox ubuntu-docker --yes
npm.cmd run kairos -- run "uname -a" --sandbox ubuntu-wsl --yes
```

Enable the sandbox for agent `run` actions by setting this in `.env`:

```txt
KAIROS_COMMAND_SANDBOX=ubuntu-docker
KAIROS_UBUNTU_IMAGE=ubuntu:24.04
KAIROS_WSL_DISTRO=KairosUbuntu
KAIROS_SANDBOX_NETWORK=none
KAIROS_SANDBOX_WORKSPACE_MODE=rw
KAIROS_SANDBOX_PULL=never
KAIROS_SANDBOX_USER=1000:1000
```

Sandbox behavior:

- Workspace is mounted at `/workspace`
- Kairos data is mounted at `/kairos-data`
- Only approved Ubuntu images are accepted: `ubuntu:20.04`, `ubuntu:22.04`, `ubuntu:24.04`, `ubuntu:jammy`, `ubuntu:noble`
- Network is disabled by default with `KAIROS_SANDBOX_NETWORK=none`
- Set `KAIROS_SANDBOX_WORKSPACE_MODE=ro` for read-only workspace command runs
- Container hardening includes dropped Linux capabilities, no-new-privileges, process/memory/CPU limits, and a read-only container root
- Docker image pulling is disabled by default. Pull the image yourself with `docker pull ubuntu:24.04` before enabling sandboxed runs.
- WSL mode uses `KAIROS_WSL_DISTRO` and defaults to `KairosUbuntu`
- WSL mode is not hardened like Docker mode; use Docker for stronger isolation when available
- Command approval still happens before sandbox execution

---

## Planned Features

### Kairos v0.2

- Improved memory and lesson ranking
- Enhanced skill management
- Better terminal agent workflows
- More guarded CLI actions
- Improved cost and checkpoint visibility

### Kairos v0.3

- Discord integration
- Remote agent control
- Multi-agent coordination
- Tool expansion system
- Enhanced routing

---

## Future Goals

- Optional CLI voice interface
- Local model support
- Autonomous workflows
- Workspace management
- Plugin ecosystem
- Advanced reasoning systems
- AI operating environment
- Community skill marketplace
- Self-improving workflows

---

## Future Research Feature: Adaptive Personality Learning

Kairos may eventually support an optional adaptive learning system.

When enabled by the user, Kairos could gradually learn:

- Communication style
- Preferred workflows
- Interests and topics
- Common habits and patterns
- Preferred responses and behaviors
- Personal productivity preferences

The goal is not simply to store memories.

The goal is for Kairos to better understand how each user thinks, works, and communicates so it can provide more personalized assistance over time.

Kairos should adapt to the user, not force the user to adapt to Kairos.

### Privacy First

If implemented, this feature should always be:

- Disabled by default
- Fully transparent
- User controlled
- Removable at any time

Users should be able to:

- Review stored information
- Edit stored information
- Export stored information
- Delete stored information

The user always remains in control.

### Community Vote

Because some users may find adaptive personality learning useful while others may find it unnecessary or uncomfortable, this feature may be implemented through community feedback.

Proposed poll:

```txt
Should Kairos include Adaptive Personality Learning?

[ ] Yes
[ ] No
```

Final implementation decisions may be guided by community voting and feedback.

---

## Philosophy

Kairos is built around a simple idea:

AI should not be limited to a single model, provider, or workflow.

Instead, AI systems should:

- Learn
- Remember
- Route intelligently
- Use tools
- Adapt over time
- Assist effectively

Kairos aims to provide the foundation for that vision.

---

## Why Kairos?

Many AI projects focus only on chat.

Kairos focuses on building an extensible AI platform capable of supporting:

- Assistants
- Coding agents
- Research agents
- Automation systems
- Productivity systems
- Future AI applications

The long-term goal is not to create another chatbot.

The goal is to create a flexible AI platform that can evolve with its users.

---

## Roadmap

### Short-Term

- Stable core
- Improved skills
- Improved memory
- Better routing
- Better documentation

### Mid-Term

- Discord integration
- Advanced tools
- Workflow automation

### Long-Term

- Voice support
- Local AI models
- Advanced agent systems
- Adaptive personality learning
- Full AI ecosystem

---

## Security Notes

Do not publish your `.env` file.

Do not commit API keys, tokens, private logs, or personal memory files.

Use `.env.example` for safe example configuration.

---

## Contributing

Contributions, bug reports, feedback, feature suggestions, and pull requests are welcome.

If you find an issue, open an issue.

If you improve something, submit a pull request.

If you have an idea, share it with the community.

Kairos is built to grow through iteration and feedback.

---

## License

Licensed under the Kairos Community License (KCL) v1.0.

See the `LICENSE` file for full details.

---

## Creator

Created by **adnqcr7-code**.

Building AI systems one feature at a time.

---

## Contributors

- **adnqcr7-code** - Core architecture and vision
- **mistral-vibe** - Early development and testing
- **Copilot** - v2.2 self-improvement system: advanced memory, adaptive routing, planning strategies, analytics, feedback engine, version management, and data migration modules (31/31 tests passing)

---

## Final Note

Kairos is not intended to be perfect.

It is intended to grow.

Every version improves upon the last.

The first release is only the beginning.
