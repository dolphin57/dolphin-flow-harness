# 构建流程完整说明

## 📊 文件关系图

```
开发时（源码）                          构建过程                      运行时（产物）
─────────────────                     ─────────────                ────────────────
src/hooks/keyword-detector/           
├── index.ts          ──┐
├── patterns.ts       ──┤
├── types.ts          ──┼──→ npm run build ──→ scripts/keyword-detector.mjs ──→ hooks.json 引用
├── utils.ts          ──┤         │
└── __tests__/        ──┘         │
                                     │
                                     ├─ tsc (TypeScript 编译)
                                     └─ esbuild (打包)
```

## 🔧 构建命令详解

### package.json 中的构建命令

```json
{
  "scripts": {
    "build": "tsc && npm run build:scripts",
    "build:scripts": "node scripts/build-keyword-detector.mjs"
  }
}
```

### 构建流程

**步骤 1: TypeScript 编译 (tsc)**
```bash
tsc
```
- 检查类型错误
- 生成 `.d.ts` 类型声明文件
- 输出到 `dist/` 目录

**步骤 2: 打包脚本 (build:scripts)**
```bash
node scripts/build-keyword-detector.mjs
```
- 使用 esbuild 打包
- 将 `src/hooks/keyword-detector/index.ts` 及其依赖打包
- 输出到 `scripts/keyword-detector.mjs`

## 📝 关键文件说明

### 1. package.json
**位置**: `dolphin-flow-harness/package.json`

**作用**: 定义构建命令和依赖

**关键内容**:
```json
{
  "scripts": {
    "build": "tsc && npm run build:scripts",
    "build:scripts": "node scripts/build-keyword-detector.mjs"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "typescript": "^5.7.0"
  }
}
```

### 2. build-keyword-detector.mjs
**位置**: `dolphin-flow-harness/scripts/build-keyword-detector.mjs`

**作用**: 使用 esbuild 打包 TypeScript 代码

**关键内容**:
```javascript
await build({
  entryPoints: [join(rootDir, 'src/hooks/keyword-detector/index.ts')],
  bundle: true,                    // 打包所有依赖
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: join(rootDir, 'scripts/keyword-detector.mjs'),
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: true,
});
```

### 3. hooks.json
**位置**: `dolphin-flow-harness/hooks/hooks.json`

**作用**: 定义 Claude Code hook 配置

**关键内容**:
```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/keyword-detector.mjs\"",
        "timeout": 5
      }]
    }]
  }
}
```

### 4. keyword-detector.mjs
**位置**: `dolphin-flow-harness/scripts/keyword-detector.mjs`

**作用**: 运行时脚本，检测关键字并生成 skill 调用

**生成方式**: 由 `build-keyword-detector.mjs` 自动生成

**注意**: 不要手动修改此文件，修改会在下次构建时丢失

## 🔄 完整工作流程

### 开发流程

```
1. 修改源码
   └─ 编辑 src/hooks/keyword-detector/ 下的 TypeScript 文件

2. 运行构建
   └─ npm run build
      ├─ tsc (类型检查)
      └─ node scripts/build-keyword-detector.mjs (打包)

3. 测试验证
   └─ node scripts/test-analyst-keyword.mjs

4. 使用
   └─ hooks.json 自动引用 scripts/keyword-detector.mjs
```

### 文件依赖关系

```
src/hooks/keyword-detector/
├── index.ts
│   ├─ 导入 patterns.ts
│   ├─ 导入 types.ts
│   └─ 导入 utils.ts
├── patterns.ts
│   └─ 导入 types.ts
├── types.ts
│   └─ 独立类型定义
└── utils.ts
    └─ 导入 types.ts

构建后：
scripts/keyword-detector.mjs
└─ 包含所有上述文件的内容（打包）
```

## 🎯 修改指南

### 场景 1: 添加新关键字

**步骤**:
1. 编辑 `src/hooks/keyword-detector/patterns.ts`
2. 运行 `npm run build`
3. 测试验证

**示例**:
```typescript
// src/hooks/keyword-detector/patterns.ts
export const KEYWORD_PATTERNS: KeywordPattern[] = [
  // ... 现有关键字
  {
    type: 'dfh-architect',
    pattern: /\b(dfh-architect|dfh architect|dolphin architect)\b/i,
    priority: 13,
    description: 'Architecture design'
  }
];
```

### 场景 2: 修改检测逻辑

**步骤**:
1. 编辑 `src/hooks/keyword-detector/index.ts` 或 `utils.ts`
2. 运行 `npm run build`
3. 测试验证

### 场景 3: 添加新的工具函数

**步骤**:
1. 在 `src/hooks/keyword-detector/utils.ts` 中添加函数
2. 在 `index.ts` 中导入并使用
3. 运行 `npm run build`

## ✅ 测试结果

**运行测试**:
```bash
node scripts/test-analyst-keyword.mjs
```

**测试结果**:
```
✅ dfh-analyst keyword
✅ dfh analyst (space)
✅ dolphin analyst
✅ requirements analysis
✅ analyze requirements
✅ requirements gap
✅ scope validation
✅ hidden requirements
✅ no keyword

Results: 9/9 tests passed
```

## 🚀 最佳实践

1. **永远不要手动修改** `scripts/keyword-detector.mjs`
   - 它是自动生成的
   - 修改会在下次构建时丢失

2. **修改源码后立即构建**
   ```bash
   npm run build
   ```

3. **使用开发模式自动构建**
   ```bash
   npm run build:watch
   ```

4. **运行测试验证**
   ```bash
   npm test
   # 或
   node scripts/test-analyst-keyword.mjs
   ```

5. **类型检查**
   ```bash
   npm run typecheck
   ```

## 📚 相关文档

- [Analyst 关键字触发流程](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/docs/ANALYST-KEYWORD-TRIGGER-FLOW.md)
- [架构对比分析](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/docs/ARCHITECTURE-COMPARISON.md)
- [DFH Analyst 使用指南](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/docs/DFH-ANALYST-GUIDE.md)
