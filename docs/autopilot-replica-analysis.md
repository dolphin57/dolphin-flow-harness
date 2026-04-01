# DFH 复刻 oh-my-claude autopilot 分析

## 1. 上游 autopilot 真正包含什么

参考 `oh-my-claudecode` 本地实现后，可以把 autopilot 拆成 5 个核心层：

1. 触发层
- 通过 `autopilot` 关键词把普通用户请求切换成流程模式。

2. 状态层
- 把当前阶段、阶段产物、迭代次数、会话 ID 持久化到磁盘。
- 这样即使模型分多轮工作，也知道“现在做到了哪一步”。

3. 编排层
- 把整个大任务拆成 `Expansion -> Planning -> Execution -> QA -> Validation`。
- 每个阶段都有独立目标、独立提示、独立完成信号。

4. 续跑层
- 在 Claude 会话准备停下时，检查阶段是否真的完成。
- 如果没有，就重新注入“继续当前阶段”的提示。

5. 验证层
- 不只实现，还要跑 build/test/lint，再做最终验证。

## 2. dolphin-flow-harness 当前缺什么

当前仓库已有：
- 关键词检测器
- `dfh-analyst` skill
- 基础 agent prompt 装载能力

当前明显缺失：
- `autopilot` 的真实状态机
- 阶段化 prompt 生成
- autopilot 状态持久化
- transcript / signal 驱动的阶段推进
- `skill-injector` 实体文件
- 本地 `autopilot` 与 skill 名称的对齐

## 3. 这次补上的最小可用骨架

本次实现新增了：

1. `src/hooks/autopilot/`
- `types.ts`
- `state.ts`
- `prompts.ts`
- `pipeline.ts`
- `index.ts`

2. `src/hooks/skill-injector/`
- 根据用户输入初始化 DFH autopilot
- 如果 autopilot 已经激活，则自动注入当前阶段 prompt
- 支持 `cancelomc` 清理本地 autopilot 状态

3. `.dfh/autopilot/` 约定
- `state.json`
- `spec.md`
- `plan.md`
- `open-questions.md`

4. 测试
- 状态初始化
- transcript signal 检测
- 阶段推进
- hook 注入与取消

## 4. DFH 与 OMC 的映射关系

| OMC 概念 | DFH 当前实现 |
| --- | --- |
| `expansion` | `analyst` 阶段，输出 `spec.md` |
| `planning` | `plan` 阶段，输出 `plan.md` |
| `execution` | `execute` 阶段 |
| `qa` | `qa` 阶段 |
| `validation` | `verify` 阶段 |
| transcript signal | `DFH_STAGE_*_COMPLETE` |
| mode state | `.dfh/autopilot/state.json` |

## 5. 你接下来应该继续怎么迭代

建议按下面顺序继续：

1. 先把 `dfh-autopilot` skill 内容升级
- 现在 skill 文案还是描述性为主。
- 下一步要把它改成“严格按 state/pipeline 工作”的执行说明。

2. 增加更多本地 agent prompt
- planner
- architect
- executor
- verifier
- critic

3. 增加真正的 stop hook / assistant-finish hook
- 这样就不需要等下一次用户输入再推进阶段。
- 这是从“半自动多轮”进化到“强自动续跑”的关键。

4. 把 QA 命令做成仓库感知
- 自动探测 `package.json` 的 scripts
- 自动降级：没有 lint / test 时只跑可用命令

5. 做结果摘要
- 完成后自动汇总：
  - 产物路径
  - 修改文件
  - 风险
  - 未解决问题

## 6. 最终目标架构

理想中的 DFH autopilot 应该是：

`关键词触发 -> 初始化 state -> 生成阶段 prompt -> 执行 -> transcript 检测 signal -> 推进阶段 -> QA -> Validation -> 汇总`

这次提交做的是第一版骨架，已经把“流程”的骨头搭起来了。后面补 agent、补 stop hook、补仓库感知执行器，就可以逐步逼近 oh-my-claude 的完整 autopilot 体验。
