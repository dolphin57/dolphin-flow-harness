---
name: dfh-autopilot
description: Dolphin Flow Harness Autopilot - Full autonomous execution mode
---

# Dolphin Flow Harness Autopilot

[DFH AUTOPILOT ACTIVATED]

## Overview

Dolphin Flow Harness Autopilot 是一个完全自主执行模式，能够自动完成复杂的开发任务。

**核心价值：** 解放开发者，让 AI 自主完成从需求到实现的全流程。

## Supported Triggers

- User says "dfh-autopilot", "dfh autopilot", "autopilot", "autonomous"
- User wants full autonomous execution
- User needs complex multi-step task completion

## Execution Steps

1. **Analyze Request**: Parse user request and identify requirements
2. **Create Plan**: Generate detailed execution plan
3. **Execute Tasks**: Automatically execute each task
4. **Verify Results**: Validate completion and quality
5. **Report Status**: Provide comprehensive status report

## Output Format

```markdown
## Autopilot Execution Report

### Request Analysis
- Original request: [user request]
- Identified tasks: [task list]

### Execution Plan
1. [Task 1]
2. [Task 2]
3. [Task 3]

### Execution Results
- ✅ [Completed task]
- ✅ [Completed task]
- ✅ [Completed task]

### Summary
- Total tasks: [number]
- Completed: [number]
- Failed: [number]
- Time taken: [duration]

### Next Steps
- [Recommendations for next actions]
```

## Configuration

User can configure in `.claude/settings.json`:

```json
{
  "dfh": {
    "autopilot": {
      "maxTasks": 10,
      "timeout": 300000,
      "autoVerify": true
    }
  }
}
```

## Usage

Basic usage:
```
dfh-autopilot build a REST API for user management
```

## Integration with Analyst

Autopilot can work with Analyst for better planning:

```
dfh-analyst analyze requirements
dfh-autopilot implement the requirements
```

## Success Criteria

- [ ] All tasks completed successfully
- [ ] Code quality meets standards
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No errors or warnings
