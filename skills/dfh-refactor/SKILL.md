---
name: dfh-refactor
description: Refactor code using Dolphin Flow Harness coordination
triggers:
  - "dfh-refactor"
  - "dfh refactor"
agent: executor
model: sonnet
---

# DFH Refactor Skill

## Purpose

Refactor code with intelligent coordination using Dolphin Flow Harness. Like a dolphin pod working together, this skill coordinates multiple agents to clean up, optimize, and improve code structure while preserving functionality.

## Workflow

1. **Analyze**: Examine the current code structure and identify refactoring opportunities
2. **Plan**: Create a refactoring plan with clear steps and priorities
3. **Execute**: Apply refactoring changes systematically
4. **Verify**: Run tests to ensure functionality is preserved
5. **Review**: Validate that code quality has improved

## Usage

Invoke with:
- `dfh-refactor this file`
- `dfh-refactor the function X`
- `dfh-refactor improve the architecture`

## Principles

- Preserve existing functionality
- Improve readability and maintainability
- Apply consistent coding patterns
- Minimize risk by working incrementally
- Run tests after each significant change

## Configuration

Configure via `.omc/settings.json`:
```json
{
  "dfh-refactor": {
    "testThreshold": 100,
    "incremental": true,
    "backup": true
  }
}
```
