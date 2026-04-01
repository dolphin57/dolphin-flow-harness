# DFH Analyst - 关键字触发需求分析功能

## 🎯 功能概述

Dolphin Flow Harness Analyst 是一个预规划顾问，通过关键字触发自动执行需求分析和差距检测。

## 🔑 触发关键字

以下关键字会自动触发 analyst 需求分析：

### 主要关键字
- `dfh-analyst` - 直接触发
- `dfh analyst` - 空格分隔
- `dolphin analyst` - 完整名称

### 语义关键字
- `requirements analysis` - 需求分析
- `analyze requirements` - 分析需求
- `requirements gap` - 需求差距
- `requirements review` - 需求审查
- `requirements check` - 需求检查
- `scope validation` - 范围验证
- `scope analysis` - 范围分析
- `hidden requirements` - 隐藏需求
- `hidden assumptions` - 隐藏假设
- `hidden constraints` - 隐藏约束

## 📋 使用示例

### 示例 1: 直接关键字触发
```
用户: dfh-analyst 分析用户认证功能
```

**Analyst 输出:**
```markdown
## Analyst Review: 用户认证功能

### Missing Questions
1. 是否支持多因素认证(MFA)? - 安全性要求的关键决策
2. 密码重置流程如何处理? - 用户体验的重要环节
3. 会话超时时间是多少? - 安全与便利的平衡

### Undefined Guardrails
1. 密码复杂度要求 - 建议: 至少8位，包含大小写字母和数字
2. 登录失败次数限制 - 建议: 5次失败后锁定15分钟
3. 会话并发限制 - 建议: 每个用户最多3个活跃会话

### Scope Risks
1. 第三方登录集成 - 建议: 明确支持哪些OAuth提供商
2. 用户数据迁移 - 建议: 定义迁移策略和数据映射

### Unvalidated Assumptions
1. 假设使用JWT令牌 - 验证: 确认技术栈选择
2. 假设单点登录不需要 - 验证: 确认业务需求

### Missing Acceptance Criteria
1. 登录响应时间 < 500ms - 可测试的性能指标
2. 支持每秒1000次登录请求 - 可测试的负载指标

### Edge Cases
1. 用户账号被删除后尝试登录 - 应返回"账号不存在"
2. 网络中断时的登录状态 - 应优雅降级到离线模式

### Open Questions
- [ ] 是否需要支持手机号登录? — 影响用户体验和系统复杂度
- [ ] 密码是否需要定期更新? — 安全合规要求

### Recommendations
1. 优先确认MFA需求和安全级别
2. 定义密码策略和会话管理规则
3. 明确第三方登录的范围
4. 制定性能和可用性SLA
```

### 示例 2: 语义关键字触发
```
用户: requirements gap analysis for the payment system
```

**Analyst 会自动:**
1. 解析支付系统的需求
2. 识别缺失的问题和边界
3. 发现未验证的假设
4. 枚举边缘情况
5. 生成结构化分析报告

### 示例 3: 范围验证
```
用户: scope validation for the migration project
```

**Analyst 会检查:**
- 项目范围是否明确
- 包含和排除的内容
- 依赖关系和前置条件
- 潜在的范围蔓延风险

## 🔧 技术实现

### 1. 关键字检测 ([keyword-detector.mjs](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/scripts/keyword-detector.mjs))

```javascript
// DFH Analyst keyword detection
if (/\b(dfh-analyst|dfh analyst|dolphin analyst|requirements analysis|analyze requirements)\b/i.test(cleanPrompt) ||
    /\b(requirements?\s+(gap|analysis|review|check))\b/i.test(cleanPrompt) ||
    /\b(scope\s+(validation|analysis|check))\b/i.test(cleanPrompt) ||
    /\b(hidden\s+(requirements?|assumptions?|constraints?))\b/i.test(cleanPrompt)) {
  matches.push({ name: 'dfh-analyst', args: '' });
}
```

### 2. Skill 定义 ([SKILL.md](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/skills/dfh-analyst/SKILL.md))

- 完整的分析流程定义
- 输出格式规范
- 成功标准和失败模式
- 与 Autopilot 的集成

### 3. Agent 配置 ([analyst.ts](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/src/agents/analyst.ts))

```typescript
export const analystAgent: AgentConfig = {
  name: 'analyst',
  description: `Pre-planning consultant that analyzes requests before implementation...`,
  prompt: loadAgentPrompt('analyst'),
  model: 'opus',
  defaultModel: 'opus',
  metadata: ANALYST_PROMPT_METADATA,
};
```

## 🎨 工作流程

```
┌─────────────────┐
│  用户输入请求    │
│  (包含关键字)    │
└────────┬─────────┘
         ↓
┌─────────────────┐
│ Keyword Detector│
│  检测关键字      │
└────────┬─────────┘
         ↓
┌─────────────────┐
│  Skill Invoker  │
│  加载 SKILL.md  │
└────────┬─────────┘
         ↓
┌─────────────────┐
│  Analyst Agent  │
│  执行需求分析    │
└────────┬─────────┘
         ↓
┌─────────────────┐
│  输出分析报告    │
│  .dfh/autopilot/│
│  spec.md        │
└─────────────────┘
```

## 📊 测试结果

运行测试脚本:
```bash
node scripts/test-analyst-keyword.mjs
```

**测试结果:**
```
✅ dfh-analyst keyword
✅ dfh analyst (space)
✅ dolphin analyst
✅ requirements analysis
✅ analyze requirements
✅ requirements gap
✅ scope validation
✅ hidden requirements
✅ no keyword (正确识别为无关键字)

Results: 9/9 tests passed
```

## 🚀 与 Autopilot 集成

Analyst 通常在 DFH Autopilot 的 **Phase 0 - Expansion** 阶段使用:

```
Phase 0: Expansion
├── Analyst: 需求分析
├── Architect: 技术规格
└── Output: .dfh/autopilot/spec.md
```

## 💡 最佳实践

1. **在规划前使用**: 在创建实施计划之前调用 analyst
2. **提供上下文**: 包含足够的背景信息以获得更准确的分析
3. **关注关键差距**: 优先处理 critical 级别的发现
4. **验证假设**: 使用 analyst 提供的验证方法
5. **迭代分析**: 随着需求明确，可以多次调用 analyst

## 🔍 故障排除

### 关键字未被识别
- 确保关键字拼写正确
- 检查是否在代码块或引用中（会被过滤）
- 验证 hooks 配置正确

### 分析结果不完整
- 提供更详细的需求描述
- 包含相关的文档引用
- 使用更具体的关键字组合

## 📚 相关文档

- [Analyst Agent 定义](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/src/agents/analyst.ts)
- [Analyst 提示词](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/agents/analyst.md)
- [DFH Autopilot](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/skills/dfh-autopilot/SKILL.md)
- [关键字检测器](file:///e:/AIGC/VibeCoding/ClaudeCode/harness-eng/dolphin-flow-harness/scripts/keyword-detector.mjs)
