---
name: dfh-autopilot
description: Dolphin Flow Harness Autopilot - Full autonomous execution from idea to working code
---

# Dolphin Flow Harness Autopilot

[DFH AUTOPILOT ACTIVATED]

## Overview

Dolphin Flow Harness Autopilot 是一个端到端的自主执行管道，将产品想法转换为工作代码。它采用5阶段架构，每个阶段都有明确的质量门控。

**Pipeline:** Expansion → Planning → Execution (Ralph+Ultrawork) → QA Cycling → Multi-perspective Validation

## Supported Triggers

- User says "dfh autopilot", "dolphin autopilot", "dfh-auto", or uses the skill
- Task requires multiple phases: planning, coding, testing, and validation
- User wants full autonomous execution from a brief description

## Execution Steps

1. **Phase 0 - Expansion**: Convert idea to detailed technical spec
   - Check for existing deep-interview spec or ralplan consensus plan (skip if found)
   - Analyst extracts requirements, Architect creates technical specification
   - Output: `.omc/autopilot/spec.md`

2. **Phase 1 - Planning**: Create an implementation plan
   - Architect creates user stories with acceptance criteria
   - Critic validates plan quality (max 5 rounds)
   - Output: `.omc/plans/dfh-autopilot-impl.md`

3. **Phase 2 - Execution**: Implement using Ralph + Ultrawork
   - Ralph: PRD-driven persistence loop until completion
   - Ultrawork: Parallel execution engine with tiered model routing
   - Output: All code files

4. **Phase 3 - QA**: Cycle until all tests pass (UltraQA mode)
   - Test, build, lint, type, fix failures
   - Max 5 cycles, same error 3x = fail early
   - Output: All tests passing

5. **Phase 4 - Validation**: Multi-perspective review
   - Architect: Functional completeness
   - Security-reviewer: Vulnerability check
   - Code-reviewer: Quality review
   - Validation rounds (max 3)
   - Output: All approved

6. **Phase 5 - Cleanup**: Delete all state files
   - Delete `.omc/state/autopilot-state.json`
   - Delete `ralph-state.json`, `ultrawork-state.json`, `ultraqa-state.json`
   - Clean exit

## Configuration

User can configure in `.claude/settings.json`:

```json
{
  "dfh": {
    "autopilot": {
      "maxIterations": 10,
      "maxQaCycles": 5,
      "maxValidationRounds": 3,
      "pauseAfterExpansion": false,
      "pauseAfterPlanning": false,
      "skipQa": false,
      "skipValidation": false
    }
  }
}
```

## Usage

Basic usage:
```typescript
import { AutopilotOrchestrator } from 'dolphin-flow-harness/src/autopilot/index.js';

const orchestrator = new AutopilotOrchestrator('/path/to/project');
await orchestrator.execute('build me a REST API', {
  maxQaCycles: 3
});
```

## Resume

If autopilot was cancelled or failed, run execute with the same prompt to resume:
```typescript
await orchestrator.resume();
```

## Examples

### Good
```
User: "dfh autopilot create a CLI tool that tracks daily habits with streak counting"
Why good: Clear domain (CLI tool), clear features (habit tracking), technology target not over-complicated
Output: Working CLI with habit tracking fully implemented
```

### Bad
```
User: "fix the bug in login page"
Why bad: Single focused fix, should delegate directly to executor instead
```

## Technical Architecture

```
┌─────────────────┐
│  Autopilot       │
└────────┬─────────┘
     ↓
┌─────────┼────────────┼──────┐
│ Phase0: Expansion  │
├─────────┼────────────┼──────┤
│ .omc/ │  Spec  │ .omc/ │┌──────────┐
│ autopilot/ │  .md  │  .omc/ │ │  Deep │
└─────────┴────────────┤ └───────┘ → Interview
                            .omc/   │
                            specs/   │
             Deep-Interview (Optional)          │
                            .md  │
                                ↓
┌─────────┼────────────┴──────────────┐
│ Phase1: Planning  │
├─────────┼────────────┴──────────────┤
│ .omc/ │  Plan  │ .omc/ │  │
│ plans/   │  .md  │ │  │
│ dfh-   │ .md  │  │  -> Autopilot Skip
└─────────┴──────────────┘ └──────────┘
                            │
                            ↓
┌─────────┼────────────┴──────────────┐
│ Phase2: Execution  │
├─────────┼────────────┴──────────────┤
│ Ralph           │  │  Code  │  │  │
│ (Persistence) │  │  .md   │  │  │
│       │  │  .omc/ │  │ │
│   ↓   │  │  state │  │  │
│   │  ↓  │  │  │  │
│ Ultrawork        │  │       │  │  │
│ (Parallel)        │  │       │  │  │
└─────────┴────────────┼──────────────┘
                            │
                            ↓
┌─────────┼────────────┴──────────────┐
│ Phase3: QA           │
├─────────┼────────────┴──────────────┤
│ UltraQA           │  │  Tests │  │
│ (Cycling)         │  │  ↓    │  │ │
│       │  → PASS     │  │ → Exit│  Phase 4
│       │  → FAIL     │  │     │   ↓    │
│       │  → Diagnose  │  │ Fix  →  │
│       │  ↓        │  │  │
└─────────┴────────────┘ └──────────┘
                            │
                            ↓
┌─────────┼─────────────┐
│ Phase4: Validation │
├─────────┼─────────────┐
│         │         │         │         │   ↓
│  Architect    │  Security    │         │
│  ↓              │  ↓      │         │
│  Code Review │  └─┴─────────┐
│  ↓                                          │   Y
│  └──────────────┴──────────────┐
│  All Approve? → YES          NO            ↓   NO  │   Y
└────────────────────────┴──────────────┐
│ Fix issues → Re-validate (max 3 rounds)         │ Y
└────────────────────────────────────────────┘│
                            ↓
┌──────────────────────────────────────────┐
│              Phase 5: Cleanup
├──────────────────────────────────────────┤
│    ✅ Working code with verified quality
│    ✅ Documentation preserved
│    ✅ State files cleaned
└──────────────────────────────────────────┘
```

## Key Differences from OMC Autopilot

1. **Implementation**: Written in TypeScript instead of using skill-based execution
2. **State Management**: Built-in state manager class with type safety
3. **Agent Integration**: Simplified structure - TODO: integrate actual Claude Code agents
4. **Configuration**: Supports both direct config and programmatic setup
5. **Extensibility**: Designed to be standalone library and Claude Code plugin

## Dependencies

Required packages:
- @anthropic-ai/claude-agent-sdk: Agent SDK
- modelcontextprotocol/sdk: Model context API

## Development Status

This is the initial skeleton. Full agent integration, error handling, and resilience features will be implemented iteratively.

## Future Enhancements

1. Full agent integration (analyst, architect, planner, critic, executor, etc.)
2. Dynamic model routing based on task complexity
3. Better error recovery and retry logic
4. Enhanced logging and observability
5. Progress tracking dashboard
6. CLI interface for standalone use

---

## File Structure

```
dolphin-flow-harness/
├── src/
│   ├── types.ts                      # 核心类型定义 (AutopilotState, phases, etc.)
│   ├── state/
│   │   ├── state-manager.ts          # 状态持久化管理
│   │   └── (future: session-manager.ts) # 会话隔离状态
│   ├── autopilot/
│   │   ├── index.ts                     # 主协调器
│   │   ├── phase0-expansion.ts            # 需求扩展
│   │   ├── phase1-planning.ts             # 计划制定
│   │   ├── phase2-execution.ts             # 代码执行
│   │   ├── phase3-qa.ts                   # QA循环
│   │   └── phase4-validation.ts            # 多视角验证
│   ├── utils/
│   │   └── logger.ts                     # 日志工具
│   └── skills/
│       └── dfh-autopilot/
│           └── SKILL.md                      # Claude Code skill 定义
├── .omc/
│   ├── autopilot/
│   │   └── spec.md                         # Phase 0 输出
└── plans/
│   └── dfh-autopilot-impl.md                 # Phase 1 输出
```

## Progress Tracking

Work in progress is tracked in:
- `.omc/state/autopilot-state.json` - Overall autopilot state
- `.omc/progress.txt` - Development progress (phase-specific)

To resume an interrupted session, provide the session ID.
