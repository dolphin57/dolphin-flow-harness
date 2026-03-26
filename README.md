# 🐬 Dolphin-Flow-Harness

[!\[License: MIT\](https://img.shields.io/badge/License-MIT-blue.svg null)](https://opensource.org/licenses/MIT)
[!\[Version\](https://img.shields.io/badge/version-v1.0.0-green.svg null)]()
[!\[PRs Welcome\](https://img.shields.io/badge/PRs-welcome-brightgreen.svg null)]()

> **Dolphin-Flow-Harness** 是一个基于 **Harness Engineering治理工程** 理念打造的高效工作流引擎。专为 **AI 驱动的需求开发** 与 **遗留代码重构** 场景设计，致力于消除开发过程中的摩擦力，实现人机协同研发效能的最大化。

## 💡 为什么需要 Dolphin-Flow-Harness？

在引入大模型（LLM）进行辅助开发与重构时，团队常面临提示词管理混乱、上下文易丢失、重构缺乏安全网（Safety Net）等痛点。
**Dolphin-Flow-Harness** 像海豚一样灵动且精准，通过标准化的工作流（Flow）和驾驭者工程治理（Harness），将非结构化的 AI 需求转化为可执行、可测试、可追溯的标准工程链路。

## ✨ 核心特性 (Core Features)

- 🌊 **AI 需求治理 (Requirement Harness)：**
  - 自动将模糊的业务语言转化为结构化的 AI 提示词与开发任务拆解。
  - 内置需求边界约束，防止大模型产生幻觉或偏离开发目标。
- 🔄 **安全重构流 (Refactoring Flow)：**
  - 针对遗留代码，提供 "分析 -> 补全测试用例 -> AI 自动化重构 -> 验证" 的闭环工作流。
  - 保障重构过程中的业务逻辑一致性（Semantic Equivalence）。
- 🚀 **提效工具链集成 (Efficiency Toolchain)：**
  - 开箱即用的脚本和 CLI 工具，一键接入常用代码仓库、CI/CD 流程及主流 LLM API。
- 📊 **效能度量 (Metrics Tracker)：**
  - 记录 AI 辅助生成代码的采用率、重构耗时对比，直观展示提效成果。

## 🏗️ 架构与工作流 (Workflow Architecture)

Dolphin-Flow-Harness 采用模块化的 Agent 系统和关键字触发机制，将复杂的 AI 研发拆解为标准化的工作流：

### 关键字系统

| 关键字             | 功能        | Skill                         |
| --------------- | --------- | ----------------------------- |
| `dfh-analyst`   | 需求分析和差距检测 | skills/dfh-analyst/SKILL.md   |
| `dfh-autopilot` | 全自动执行模式   | skills/dfh-autopilot/SKILL.md |
| `dfh-refactor`  | 代码重构和优化   | skills/dfh-refactor/SKILL.md  |

### 技术栈

- **TypeScript** - 类型安全的源码开发
- **esbuild** - 快速打包和构建
- **Vitest** - 单元测试框架
- **Claude Code Hooks** - 事件触发机制

## 📦 快速开始 (Quick Start)

### 1. 安装 (Installation)

```bash
# 克隆仓库
git clone https://github.com/your-username/dolphin-flow-harness.git
cd dolphin-flow-harness

# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 配置 Claude Code 插件

将项目配置为 Claude Code 插件：

```bash
# 插件配置已在 .claude-plugin/plugin.json 中定义
# 确保 hooks.json 配置正确
```

**插件配置示例** (`.claude-plugin/plugin.json`):

```json
{
  "name": "dolphin-flow-harness",
  "version": "1.0.0",
  "description": "Claude Code harness enhancement plugin",
  "skills": "./skills/"
}
```

### 3. 使用关键字触发功能

**需求分析示例：**

```
dfh-analyst 分析用户认证功能的需求
```

**自动驾驶示例：**

```
dfh-autopilot 实现用户管理 REST API
```

**代码重构示例：**

```
dfh-refactor 优化 src/utils/helper.ts 的代码质量
```

### 4. 开发和测试

```bash
# 运行测试
npm test

# 类型检查
npm run typecheck

# 开发模式（自动构建）
npm run build:watch
```

### 5. 添加新的关键字

编辑 `src/hooks/keyword-detector/patterns.ts`：

```typescript
export const KEYWORD_PATTERNS: KeywordPattern[] = [
  // ... 现有关键字
  {
    type: 'my-new-keyword',
    pattern: /\b(my-keyword|mk)\b/i,
    priority: 13,
    description: 'My new keyword description'
  }
];
```

然后重新构建：

```bash
npm run build
```

## 📂 目录结构 (Directory Structure)

### 核心模块说明

| 模块           | 路径            | 说明                |
| ------------ | ------------- | ----------------- |
| **Agent 系统** | `src/agents/` | 定义各种 Agent 的行为和能力 |
| **Hook 系统**  | `src/hooks/`  | 处理关键字检测和触发逻辑      |
| **Skills**   | `skills/`     | 定义每个关键字的执行流程      |
| **构建脚本**     | `scripts/`    | 构建和运行时脚本          |
| **文档**       | `docs/`       | 详细的使用指南和架构说明      |

## 🛠️ 应用场景 (Use Cases)

1. **研发团队接入 AI 编程工具：** 作为前置的流程规范，确保全员使用统一的最佳实践。
2. **大型技术债务清理：** 为缺乏文档和测试的老旧系统建立 "Harness"，安全过渡到现代架构。
3. **外包/跨团队协同：** 通过标准化输入输出，降低 AI 辅助开发的沟通成本。

## 🤝 参与贡献 (Contributing)

我们非常欢迎社区的贡献！无论是提交 Bug、改进工作流逻辑，还是增加新的 Prompt 模板。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

详情请查阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证 (License)

本项目采用 [MIT 许可证](LICENSE) - 详情请查看 LICENSE 文件。

***

**Dolphin-Flow-Harness** 🌊
*Let AI flow through your harness engineering.*
