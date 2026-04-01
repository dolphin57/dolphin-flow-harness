# Analyst 关键字触发流程详解

## 🎯 完整的触发流程

### 流程图

```
用户输入 (包含关键字)
    ↓
Claude Code 捕获 UserPromptSubmit 事件
    ↓
触发 hooks.json 中定义的 hook
    ↓
执行 scripts/keyword-detector.mjs
    ↓
keyword-detector.mjs 夣测关键字
    ↓
生成 skill 调用消息
    ↓
返回给 Claude Code
    ↓
Claude Code 调用 Skill 工具
    ↓
加载 skills/dfh-analyst/SKILL.md
    ↓
执行 Analyst Agent 分析
    ↓
输出分析报告
```

## 📋 详细步骤

### 1. 用户输入触发

**用户输入示例：**
```
dfh-analyst 分析用户认证功能
```

**或者：**
```
requirements analysis for the payment system
```

### 2. Claude Code Hook 系统激活

**hooks.json 配置：**
```json
{
  "description": "dfh 带异步能力的编排钩子",
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/scripts/keyword-detector.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**关键点：**
- `UserPromptSubmit` 事件在用户每次提交消息时触发
- `matcher: "*"` 表示匹配所有输入
- `timeout: 5` 表示超时时间为 5 秒

### 3. keyword-detector.mjs 执行

**脚本位置：**
```
dolphin-flow-harness/scripts/keyword-detector.mjs
```

**执行流程：**
```javascript
async function main() {
  // 1. 读取 stdin 输入
  const input = await readStdin();
  
  // 2. 解析 JSON
  const data = JSON.parse(input);
  
  // 3. 提取 prompt
  const prompt = extractPrompt(data);
  
  // 4. 清理文本（移除代码块、XML标签等）
  const cleanPrompt = sanitizeForKeywordDetection(prompt);
  
  // 5. 检测关键字
  const keywords = detectKeywords(cleanPrompt);
  
  // 6. 解决冲突
  const resolved = resolveConflicts(keywords);
  
  // 7. 生成 skill 调用消息
  const skillMessage = createSkillInvocation('dfh-analyst', prompt);
  
  // 8. 输出 JSON 结果
  console.log(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: skillMessage
    }
  }));
}
```

### 4. 关键字检测逻辑

**支持的关键字模式：**
```javascript
const KEYWORD_PATTERNS = [
  {
    type: 'dfh-analyst',
    pattern: /\b(dfh-analyst|dfh analyst|dolphin analyst|requirements analysis|analyze requirements)\b/i,
    priority: 11,
    description: 'Requirements analysis and gap detection'
  },
  // ... 其他关键字
];
```

**检测函数：**
```javascript
function detectKeywords(text) {
  const matches = [];
  
  for (const pattern of KEYWORD_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const match = text.match(regex);
    
    if (match) {
      matches.push({
        name: pattern.type,
        args: ''
      });
    }
  }
  
  return matches;
}
```

### 5. Skill 调用消息生成

**生成的消息格式：**
```
[MAGIC KEYWORD: DFH-ANALYST]

You MUST invoke the skill using the Skill tool:

Skill: dolphin-flow-harness:dfh-analyst

User request:
dfh-analyst 分析用户认证功能

IMPORTANT: Invoke the skill IMMEDIATELY. Do not proceed without loading the skill instructions.
```

### 6. Claude Code 调用 Skill

**Skill 工具调用：**
```typescript
Skill({
  name: "dfh-analyst"
})
```

### 7. 加载 SKILL.md

**Skill 文件位置：**
```
dolphin-flow-harness/skills/dfh-analyst/SKILL.md
```

**SKILL.md 内容：**
- Agent 的角色定义
- 执行步骤
- 输出格式
- 成功标准

### 8. 执行 Analyst Agent

**Agent 执行流程：**
1. 解析需求
2. 识别缺失的问题
3. 发现未定义的边界
4. 枚举边缘情况
5. 生成分析报告

**输出示例：**
```markdown
## Analyst Review: 用户认证功能

### Missing Questions
1. 是否支持多因素认证(MFA)? - 安全性要求的关键决策
2. 密码重置流程如何处理? - 用户体验的重要环节

### Undefined Guardrails
1. 密码复杂度要求 - 建议: 至少8位，包含大小写字母和数字
2. 登录失败次数限制 - 建议: 5次失败后锁定15分钟

### Recommendations
- 优先确认MFA需求和安全级别
- 定义密码策略和会话管理规则
```

## 🔧 配置文件详解

### hooks.json

**位置：** `dolphin-flow-harness/hooks/hooks.json`

**作用：** 定义 Claude Code 触发的钩子

**关键字：**
- `UserPromptSubmit` - 用户提交消息时触发
- `matcher: "*"` - 匹配所有输入
- `command` - 要执行的命令
- `timeout` - 超时时间（秒）

### .claude-plugin/plugin.json

**位置：** `dolphin-flow-harness/.claude-plugin/plugin.json`

**作用：** 插件元数据

**关键字段：**
```json
{
  "name": "dolphin-flow-harness",
  "version": "1.0.0",
  "skills": "./skills/"
}
```

### skills/dfh-analyst/SKILL.md

**位置：** `dolphin-flow-harness/skills/dfh-analyst/SKILL.md`

**作用：** 定义 Analyst skill 的行为

**关键部分：**
- `name` - Skill 名称
- `description` - Skill 描述
- 执行步骤
- 输出格式

## 🧪 测试方法

### 方法 1: 直接测试脚本

```bash
# 创建测试输入
echo '{"prompt":"dfh-analyst analyze user authentication"}' | node scripts/keyword-detector.mjs

# 预期输出
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[MAGIC KEYWORD: DFH-ANALYST]..."
  }
}
```

### 方法 2: 使用测试脚本

```bash
# 运行测试
node scripts/test-analyst-keyword.mjs

# 预期输出
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

### 方法 3: 在 Claude Code 中实际测试

1. 安装插件到 Claude Code
2. 在对话中输入: "dfh-analyst 分析用户认证功能"
3. 观察 Claude Code 是否自动加载 dfh-analyst skill
4. 检查输出的分析报告

## 📊 关键文件清单

| 文件 | 路径 | 作用 |
|------|------|------|
| hooks.json | hooks/hooks.json | 定义 Claude Code 钩子 |
| keyword-detector.mjs | scripts/keyword-detector.mjs | 检测关键字并生成 skill 调用 |
| SKILL.md | skills/dfh-analyst/SKILL.md | 定义 Analyst skill 行为 |
| plugin.json | .claude-plugin/plugin.json | 插件元数据 |
| analyst.md | agents/analyst.md | Agent 提示词 |
| analyst.ts | src/agents/analyst.ts | Agent TypeScript 定义 |

## 🎯 关键配置

### 环境变量

```bash
# 跳过关键字检测
DFH_SKIP_HOOKS=keyword-detector

# 禁用 DFH
DISABLE_DFH=1
```

### 调试模式

```bash
# 启用调试日志
DEBUG_KEYWORD_DETECTOR=1
```

## 🔄 与参考项目的对比

### 相同点

1. **Hook 机制** - 都使用 UserPromptSubmit hook
2. **关键字检测** - 都使用正则表达式匹配
3. **Skill 调用** - 都生成 skill 调用消息
4. **冲突解决** - 都有 cancel 优先级机制

### 不同点

| 特性 | 参考项目 | dolphin-flow-harness |
|------|------------------|---------------------|
| **代码位置** | src/hooks/keyword-detector/ | src/hooks/keyword-detector/ |
| **运行时** | scripts/keyword-detector.mjs | scripts/keyword-detector.mjs |
| **构建方式** | TypeScript → esbuild | TypeScript → esbuild |
| **测试框架** | Vitest | Vitest |
| **复杂度** | 高（30+ hooks） | 低（核心功能） |

## 📚 参考资源

- [Claude Code Hooks 文档](https://docs.anthropic.com/claude-code/hooks)
