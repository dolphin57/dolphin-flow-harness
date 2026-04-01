# 架构对比分析：参考项目 vs dolphin-flow-harness

## 📊 目录结构对比

### 参考项目的关键字检测位置

```
参考项目/
├── src/
│   └── hooks/
│       └── keyword-detector/
│           ├── index.ts              # TypeScript 源码
│           └── __tests__/
│               └── index.test.ts     # 单元测试
├── scripts/
│   └── keyword-detector.mjs          # 运行时脚本（独立）
└── templates/
    └── hooks/
        └── keyword-detector.mjs      # 安装模板
```

### dolphin-flow-harness 的关键字检测位置

```
dolphin-flow-harness/
├── src/
│   └── agents/                       # Agent 系统
│       ├── analyst.ts
│       ├── types.ts
│       └── utils.ts
└── scripts/
    └── keyword-detector.mjs          # 直接的运行时脚本
```

## 🎯 核心差异分析

### 1. 项目定位和复杂度

#### 参考项目
- **定位**：完整的 npm 包，多代理编排系统
- **复杂度**：高
- **发布方式**：npm 包 + CLI 工具
- **目标用户**：需要完整编排能力的开发者

**特点：**
```json
{
  "name": "参考项目",
  "version": "4.9.1",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "cli": "bridge/cli.cjs"
  }
}
```

#### dolphin-flow-harness
- **定位**：轻量级 Claude Code 插件
- **复杂度**：低
- **发布方式**：Claude Code 插件
- **目标用户**：需要快速集成的开发者

**特点：**
```json
{
  "name": "dolphin-flow-harness",
  "version": "1.0.0",
  "description": "Minimal Claude Code enhancement plugin"
}
```

### 2. 开发模式差异

#### 参考项目：TypeScript → 编译 → 运行时

**开发流程：**
```
TypeScript 源码 (src/hooks/keyword-detector/index.ts)
    ↓
编译 (tsc)
    ↓
JavaScript 输出 (dist/hooks/keyword-detector/index.js)
    ↓
打包/桥接 (bridge/)
    ↓
运行时脚本 (scripts/keyword-detector.mjs)
```

**优势：**
- ✅ 类型安全
- ✅ 完整的 IDE 支持
- ✅ 可重用的模块
- ✅ 单元测试友好
- ✅ 代码质量高

**劣势：**
- ❌ 构建流程复杂
- ❌ 开发环境要求高
- ❌ 调试路径长

#### dolphin-flow-harness：直接 JavaScript 脚本

**开发流程：**
```
JavaScript 脚本 (scripts/keyword-detector.mjs)
    ↓
直接执行
```

**优势：**
- ✅ 开发简单直接
- ✅ 无需构建
- ✅ 快速迭代
- ✅ 易于理解和修改

**劣势：**
- ❌ 无类型检查
- ❌ IDE 支持有限
- ❌ 代码重用性低
- ❌ 测试困难

### 3. Hooks 系统架构

#### 参考项目的 Hooks 模块化

```
src/hooks/
├── keyword-detector/          # 关键字检测
│   ├── index.ts
│   └── __tests__/
├── autopilot/                 # 自动驾驶
│   ├── index.ts
│   ├── pipeline.ts
│   └── state.ts
├── ralph/                     # 持久模式
│   ├── index.ts
│   └── loop.ts
├── task-size-detector/        # 任务大小检测
│   └── index.ts
├── factcheck/                 # 事实检查
│   ├── index.ts
│   └── sentinel.ts
└── ... (30+ hook 模块)
```

**特点：**
- 每个功能都是独立的模块
- 有完整的类型定义
- 包含单元测试
- 支持依赖注入
- 可独立开发和测试

#### dolphin-flow-harness 的简化结构

```
scripts/
├── keyword-detector.mjs       # 关键字检测
├── skill-injector.mjs         # Skill 注入
└── run.cjs                    # 运行器

src/
└── agents/                    # Agent 系统
    ├── analyst.ts
    ├── types.ts
    └── utils.ts
```

**特点：**
- 脚本直接可执行
- 功能相对简单
- 依赖少
- 易于部署

### 4. 关键字检测实现对比

#### 参考项目的实现

**TypeScript 源码 (src/hooks/keyword-detector/index.ts)：**
```typescript
export type KeywordType =
  | 'cancel'
  | 'ralph'
  | 'autopilot'
  | 'team'
  | 'ultrawork'
  | 'ralplan'
  | 'tdd'
  | 'code-review'
  | 'security-review'
  | 'ultrathink'
  | 'deepsearch'
  | 'analyze'
  | 'codex'
  | 'gemini'
  | 'ccg';

const KEYWORD_PATTERNS: Record<KeywordType, RegExp> = {
  cancel: /\b(cancelomc|stopomc)\b/i,
  ralph: /\b(ralph)\b(?!-)/i,
  // ... 更多模式
};

export function detectKeywordsWithType(
  text: string,
  _agentName?: string
): DetectedKeyword[] {
  // 复杂的检测逻辑
  // 包含任务大小检测
  // 包含 ralplan 门控
  // 包含信息意图过滤
}
```

**运行时脚本 (scripts/keyword-detector.mjs)：**
```javascript
// 独立的 Node.js 脚本
// 直接从 stdin 读取，处理，输出到 stdout
async function main() {
  const input = await readStdin();
  const prompt = extractPrompt(input);
  const cleanPrompt = sanitizeForKeywordDetection(prompt);
  
  // 检测关键字
  // 创建状态文件
  // 输出 skill 调用消息
}
```

#### dolphin-flow-harness 的实现

**直接脚本 (scripts/keyword-detector.mjs)：**
```javascript
// 简化的实现
if (/\b(dfh-analyst|dfh analyst)\b/i.test(cleanPrompt)) {
  matches.push({ name: 'dfh-analyst', args: '' });
}

// 直接输出
console.log(JSON.stringify(createHookOutput(
  createSkillInvocation('dfh-analyst', prompt)
)));
```

## 🔍 为什么位置不同？

### 参考项目的设计理念

1. **模块化开发**
   - hooks 作为 TypeScript 模块开发
   - 每个功能独立模块
   - 便于团队协作

2. **类型安全**
   - 完整的类型定义
   - 编译时错误检查
   - 更好的 IDE 支持

3. **可测试性**
   - 每个模块都有单元测试
   - 集成测试框架
   - CI/CD 友好

4. **可重用性**
   - hooks 可以被其他模块导入
   - 共享工具函数
   - 插件生态系统

5. **企业级需求**
   - 需要支持多种环境
   - 需要完整的文档
   - 需要长期维护

### dolphin-flow-harness 的设计理念

1. **简单直接**
   - 最小化依赖
   - 快速实现
   - 易于理解

2. **轻量级**
   - 只包含必要功能
   - 小文件体积
   - 快速加载

3. **插件优先**
   - 作为 Claude Code 插件
   - 不需要独立发布
   - 用户直接使用

4. **快速迭代**
   - 无需构建步骤
   - 修改立即生效
   - 开发效率高

## 📈 架构演进建议

### 对于 dolphin-flow-harness

#### 当前阶段（轻量级插件）
```
✅ 保持 scripts/ 目录的简单结构
✅ 直接使用 JavaScript 脚本
✅ 快速迭代和测试
```

#### 中期阶段（功能扩展）
```
考虑引入：
1. TypeScript 类型定义（可选）
2. 简单的构建脚本
3. 基本的单元测试
```

#### 长期阶段（企业级）
```
如果需要：
1. 完整的 TypeScript 迁移
2. 模块化的 hooks 系统
3. 完善的测试框架
```

### 具体建议

#### 1. 保持当前结构的优势

**优点：**
- 开发速度快
- 易于理解
- 部署简单

**适用场景：**
- 快速原型开发
- 小型团队
- 功能相对简单

#### 2. 渐进式改进

**阶段 1：添加类型定义**
```
src/
├── agents/
│   ├── analyst.ts
│   └── types.ts
└── hooks/                    # 新增
    └── types.ts              # 类型定义
```

**阶段 2：提取共享逻辑**
```
src/
├── agents/
├── hooks/
│   ├── keyword-detector.ts   # TypeScript 版本
│   └── types.ts
└── utils/
    └── keyword-helpers.ts    # 共享工具
```

**阶段 3：完整迁移**
```
scripts/
└── keyword-detector.mjs      # 编译输出

src/
└── hooks/
    └── keyword-detector/
        ├── index.ts
        ├── patterns.ts
        └── __tests__/
```

#### 3. 混合方案（推荐）

**保留 scripts/ 用于运行时，添加 src/hooks 用于开发：**

```
dolphin-flow-harness/
├── src/
│   ├── agents/
│   │   ├── analyst.ts
│   │   └── types.ts
│   └── hooks/                # 开发时使用
│       ├── keyword-detector.ts
│       └── types.ts
├── scripts/
│   └── keyword-detector.mjs  # 从 src/hooks 编译
└── package.json
    "scripts": {
      "build": "tsc && npm run build:scripts",
      "build:scripts": "node scripts/build-from-src.mjs"
    }
```

## 🎯 最佳实践总结

### 选择 scripts/ 目录的场景

1. **快速原型**：需要快速验证想法
2. **简单功能**：功能相对简单，不需要复杂逻辑
3. **小团队**：团队成员少，协作需求低
4. **插件开发**：作为 Claude Code 插件发布

### 选择 src/hooks 目录的场景

1. **企业级应用**：需要长期维护和扩展
2. **复杂功能**：功能复杂，需要模块化
3. **大团队**：需要团队协作和代码审查
4. **npm 包**：需要作为独立包发布

### 混合方案的优势

1. **灵活性**：开发时用 TypeScript，运行时用 JavaScript
2. **渐进式**：可以逐步迁移，不影响现有功能
3. **兼容性**：保持向后兼容，同时享受类型安全
4. **可维护性**：代码质量高，易于维护

## 📚 参考资源

- [参考项目 hooks 模块](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/oh-my-claudecode/src/hooks)
- [dolphin-flow-harness scripts](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/scripts)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/templates.html)
- [Claude Code 插件开发](https://docs.anthropic.com/claude-code)
