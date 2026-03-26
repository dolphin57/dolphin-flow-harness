---
name: dfh-refactor
description: Dolphin Flow Harness Refactor - Code refactoring and optimization
---

# Dolphin Flow Harness Refactor

[DFH REFACTOR ACTIVATED]

## Overview

Dolphin Flow Harness Refactor 是一个代码重构和优化工具，能够自动识别代码问题并提供改进建议。

**核心价值：** 提高代码质量，减少技术债务，优化性能。

## Supported Triggers

- User says "dfh-refactor", "dfh refactor", "refactor"
- User wants to improve code quality
- User needs to reduce technical debt

## Execution Steps

1. **Analyze Code**: Parse codebase and identify issues
2. **Identify Patterns**: Find code smells and anti-patterns
3. **Generate Suggestions**: Create refactoring recommendations
4. **Apply Changes**: Implement refactoring (with approval)
5. **Verify Improvements**: Validate refactoring results

## Output Format

```markdown
## Refactoring Report

### Code Analysis
- Files analyzed: [number]
- Issues found: [number]
- Severity: [critical/major/minor]

### Identified Issues
1. **[Issue Type]**: [Description]
   - Location: [file:line]
   - Impact: [description]
   - Suggestion: [recommendation]

### Refactoring Plan
1. [Refactoring task 1]
2. [Refactoring task 2]
3. [Refactoring task 3]

### Expected Improvements
- Code quality: [+X%]
- Performance: [+X%]
- Maintainability: [+X%]
- Technical debt: [-X%]

### Applied Changes
- ✅ [Change 1]
- ✅ [Change 2]
- ✅ [Change 3]
```

## Configuration

User can configure in `.claude/settings.json`:

```json
{
  "dfh": {
    "refactor": {
      "autoApply": false,
      "severity": "major",
      "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
    }
  }
}
```

## Usage

Basic usage:
```
dfh-refactor optimize the authentication module
```

Analyze specific file:
```
dfh-refactor src/utils/helper.ts
```

## Refactoring Categories

### 1. Code Quality
- Remove duplicate code
- Simplify complex logic
- Improve naming
- Add missing documentation

### 2. Performance
- Optimize loops
- Reduce memory usage
- Improve algorithm efficiency
- Cache frequently used data

### 3. Maintainability
- Extract methods
- Reduce coupling
- Improve cohesion
- Apply design patterns

### 4. Security
- Fix vulnerabilities
- Improve input validation
- Enhance error handling
- Secure data handling

## Success Criteria

- [ ] Code quality improved
- [ ] No regressions
- [ ] Tests pass
- [ ] Performance maintained or improved
- [ ] Documentation updated
