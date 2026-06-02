# How To Use These Skills With Any AI

These skills are modular expert prompts. They help an AI produce better, more practical outputs by giving it a role, process, standards, examples, and failure modes.

## The Main Prompt Template

```text
You are using the following AI skill as your operating mode.
Follow the role, workflow, checklist, and output format.
Do not give vague advice. Produce practical work.
Ask clarifying questions only if required.

[PASTE SKILL FILE]

My task:
[DESCRIBE TASK]

My constraints:
[TIME / BUDGET / PLATFORM / FILES / SKILL LEVEL / SAFETY LIMITS]

Output format wanted:
[CODE / PLAN / CHECKLIST / REVIEW / DOC / PROMPT / REPORT]
```

## How To Pick The Right Skill

1. **Coding problem?** Start with Code Architect, Debugger, Test Engineer, or the matching web/backend/frontend skill.
2. **AI agent problem?** Start with Agent Architect, Tool Calling Designer, Memory System Designer, or Model Routing Engineer.
3. **Prompt problem?** Start with Prompt Architect, Prompt Debugger, or System Prompt Hardener.
4. **Discord problem?** Start with Discord Bot Architect or Role Permission Designer.
5. **Business/money problem?** Start with Offer Builder, Pricing Experimenter, or Monetization Strategist.
6. **Research problem?** Start with Web Research Planner, Source Verification Analyst, or Evidence Mapper.
7. **Design problem?** Start with UX Designer, Visual Style Guide Maker, or Logo Brief Writer.

## Skill Chaining Method

Use skills in order, not all at once.

Example for a coding project:

```text
Step 1: Use Code Architect to design the system.
Step 2: Use Fullstack App Planner to break it into files and tasks.
Step 3: Use Unit Test Generator to create tests.
Step 4: Use Security Auditor to review risks.
Step 5: Use Documentation Writer to create README/setup docs.
```

## Quality Rules For Any AI

A good answer should include:

- Clear assumptions.
- Ordered steps.
- Examples.
- Risks or edge cases.
- A verification checklist.
- A next action.

A bad answer usually includes:

- Generic motivational paragraphs.
- Fake certainty.
- Huge architecture before MVP.
- No testing plan.
- No awareness of constraints.
- Fancy words doing the job of actual thinking. Tragic, but common.

## Copy-Paste Mini Prompt

```text
Use the best skill from this skill library for my task. First identify the skill you are using, then solve the task using its workflow.
Task: [your task]
Constraints: [constraints]
Output wanted: [format]
```
