#!/usr/bin/env node

// src/hooks/autopilot/state.ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
var DFH_AUTOPILOT_DIR = ".dfh/autopilot";
var STATE_FILE_NAME = "state.json";
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function getDefaultArtifacts() {
  return {
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    unresolvedIssues: [],
    risks: []
  };
}
function resolveAutopilotPaths(directory, config) {
  const baseDir = resolve(directory, DFH_AUTOPILOT_DIR);
  return {
    rootDir: baseDir,
    stateFile: resolve(baseDir, STATE_FILE_NAME),
    specFile: resolve(baseDir, config?.paths?.specFile ?? "spec.md"),
    planFile: resolve(baseDir, config?.paths?.planFile ?? "plan.md"),
    openQuestionsFile: resolve(
      baseDir,
      config?.paths?.openQuestionsFile ?? "open-questions.md"
    ),
    summaryFile: resolve(baseDir, config?.paths?.summaryFile ?? "summary.md")
  };
}
function ensureAutopilotDir(directory, config) {
  const paths = resolveAutopilotPaths(directory, config);
  mkdirSync(paths.rootDir, { recursive: true });
  return paths;
}
function readAutopilotState(directory) {
  const paths = resolveAutopilotPaths(directory);
  if (!existsSync(paths.stateFile)) {
    return null;
  }
  try {
    const raw = readFileSync(paths.stateFile, "utf-8");
    const parsed = JSON.parse(raw);
    const mergedPaths = {
      ...paths,
      ...parsed.paths,
      summaryFile: parsed.paths?.summaryFile ?? paths.summaryFile
    };
    return {
      ...parsed,
      paths: mergedPaths,
      artifacts: {
        ...getDefaultArtifacts(),
        ...parsed.artifacts
      }
    };
  } catch {
    return null;
  }
}
function writeAutopilotState(directory, state) {
  const paths = ensureAutopilotDir(directory, {
    paths: {
      specFile: state.paths.specFile,
      planFile: state.paths.planFile,
      openQuestionsFile: state.paths.openQuestionsFile,
      summaryFile: state.paths.summaryFile
    }
  });
  const nextState = {
    ...state,
    updatedAt: nowIso(),
    paths
  };
  writeFileSync(paths.stateFile, JSON.stringify(nextState, null, 2), "utf-8");
  return true;
}
function getCurrentStage(state) {
  const stage = state.pipeline.stages[state.pipeline.currentStageIndex];
  return stage ?? null;
}
function incrementAutopilotIteration(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }
  state.iteration += 1;
  const currentStage = getCurrentStage(state);
  if (currentStage) {
    currentStage.iterations += 1;
  }
  writeAutopilotState(directory, state);
  return state;
}
function markAutopilotFailed(directory, reason) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }
  state.active = false;
  state.phase = "failed";
  state.completedAt = nowIso();
  state.failureReason = reason;
  const currentStage = getCurrentStage(state);
  if (currentStage) {
    currentStage.status = "failed";
    currentStage.notes = reason;
  }
  writeAutopilotState(directory, state);
  return state;
}
function completeAutopilot(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }
  state.active = false;
  state.phase = "complete";
  state.completedAt = nowIso();
  writeAutopilotState(directory, state);
  return state;
}
function advanceAutopilotStage(directory) {
  const state = readAutopilotState(directory);
  if (!state) {
    return { advanced: false, state: null };
  }
  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return { advanced: false, state };
  }
  currentStage.status = "complete";
  currentStage.completedAt = nowIso();
  let nextIndex = state.pipeline.currentStageIndex + 1;
  while (nextIndex < state.pipeline.stages.length && state.pipeline.stages[nextIndex].status === "skipped") {
    nextIndex += 1;
  }
  if (nextIndex >= state.pipeline.stages.length) {
    const completedState = completeAutopilot(directory);
    return {
      advanced: true,
      state: completedState,
      previousStage: currentStage,
      currentStage: null
    };
  }
  const nextStage = state.pipeline.stages[nextIndex];
  nextStage.status = "active";
  nextStage.startedAt = nextStage.startedAt ?? nowIso();
  state.pipeline.currentStageIndex = nextIndex;
  state.phase = nextStage.phase;
  writeAutopilotState(directory, state);
  return {
    advanced: true,
    state,
    previousStage: currentStage,
    currentStage: nextStage
  };
}
function getStageDisplayName(stageId) {
  switch (stageId) {
    case "analyst":
      return "Expansion";
    case "plan":
      return "Planning";
    case "execute":
      return "Execution";
    case "qa":
      return "Quality Assurance";
    case "verify":
      return "Validation";
  }
}

// src/hooks/autopilot/prompts.ts
function fence(content) {
  return ["```markdown", content.trim(), "```"].join("\n");
}
function getCurrentStageSignal(state) {
  return getCurrentStage(state)?.signal ?? "DFH_AUTOPILOT_COMPLETE";
}
function getExpansionPrompt(context) {
  return `## DFH AUTOPILOT STAGE 0: REQUIREMENT EXPANSION

Target request:
"${context.request}"

Goal:
- Expand the raw request into an implementation-ready requirement package.
- Identify missing assumptions, guardrails, edge cases, and acceptance criteria.
- Save the consolidated result to \`${context.paths.specFile}\`.
- Save unresolved questions to \`${context.paths.openQuestionsFile}\`.

Suggested workflow:
1. Use the DFH analyst lane first.
2. Produce:
   - problem statement
   - explicit requirements
   - implicit requirements
   - out-of-scope
   - acceptance criteria
   - risks / open questions
3. Persist the spec before moving on.

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}
function getPlanningPrompt(context) {
  return `## DFH AUTOPILOT STAGE 1: IMPLEMENTATION PLANNING

Read the requirement spec from \`${context.paths.specFile}\`.

Goal:
- Convert the spec into an executable implementation plan.
- Save the plan to \`${context.paths.planFile}\`.

Plan requirements:
1. Break the work into atomic tasks.
2. Mark dependencies between tasks.
3. Identify which tasks can run in parallel.
4. Add measurable acceptance criteria for each task.
5. Record likely failure points and mitigations.

Recommended output structure:
${fence(`
# Implementation Plan

## Task List
1. Task name
   - files:
   - dependencies:
   - acceptance criteria:

## Parallel Workstreams

## Risks
`)}

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}
function getExecutionPrompt(context) {
  const executionMode = context.state.pipeline.config.executionMode;
  return `## DFH AUTOPILOT STAGE 2: EXECUTION

Read the implementation plan from \`${context.paths.planFile}\`.

Execution mode: \`${executionMode}\`

Goal:
- Implement the whole request end-to-end.
- Prefer parallel execution for independent tasks.
- Keep the todo list aligned with the plan.
- Track files created and modified in your summary.

Execution rules:
1. Start from the highest-leverage unfinished task.
2. Parallelize only independent work.
3. Verify each task before marking it done.
4. Update docs or config if the implementation needs it.

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}
function getQaPrompt(context) {
  return `## DFH AUTOPILOT STAGE 3: QA

Run the local quality gate for this repository.

Minimum checks:
1. Build / typecheck
2. Unit tests
3. Lint, if available

If something fails:
- diagnose
- fix
- rerun the failing command
- repeat until green or until you can explain the blocker precisely

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}
function getValidationPrompt(context) {
  return `## DFH AUTOPILOT STAGE 4: VALIDATION

Validate implementation against:
- spec: \`${context.paths.specFile}\`
- plan: \`${context.paths.planFile}\`

Review checklist:
1. Functional completeness
2. Regression risk
3. Code quality
4. Remaining gaps or deferred items

Output a concise validation summary, then emit the completion signal.

Required completion signal:
\`${getCurrentStageSignal(context.state)}\`
`;
}
function getStagePrompt(state) {
  const context = {
    request: state.originalRequest,
    paths: state.paths,
    state
  };
  switch (state.phase) {
    case "expansion":
      return getExpansionPrompt(context);
    case "planning":
      return getPlanningPrompt(context);
    case "execution":
      return getExecutionPrompt(context);
    case "qa":
      return getQaPrompt(context);
    case "validation":
      return getValidationPrompt(context);
    case "complete":
      return "DFH autopilot is already complete.";
    case "failed":
      return `DFH autopilot failed: ${state.failureReason ?? "unknown error"}`;
  }
}
function formatPipelineHud(state) {
  const parts = state.pipeline.stages.map((stage) => {
    const icon = stage.status === "complete" ? "[OK]" : stage.status === "active" ? "[>>]" : stage.status === "skipped" ? "[--]" : stage.status === "failed" ? "[!!]" : "[..]";
    return `${icon} ${getStageDisplayName(stage.id)}`;
  });
  return `DFH Pipeline ${state.pipeline.currentStageIndex + 1}/${state.pipeline.stages.length}: ${parts.join(" | ")}`;
}
function buildContinuationPrompt(state) {
  const currentStage = getCurrentStage(state);
  const stageLabel = currentStage ? getStageDisplayName(currentStage.id) : state.phase;
  return `<dfh-autopilot-continuation>
${formatPipelineHud(state)}

[DFH AUTOPILOT CONTINUE]
Current stage: ${stageLabel}
Iteration: ${state.iteration}/${state.maxIterations}

${getStagePrompt(state)}
</dfh-autopilot-continuation>`;
}
function buildCompletionPrompt(state) {
  return `<dfh-autopilot-complete>
[DFH AUTOPILOT COMPLETE]

Request:
${state.originalRequest}

Artifacts:
- Spec: \`${state.paths.specFile}\`
- Plan: \`${state.paths.planFile}\`
- Open Questions: \`${state.paths.openQuestionsFile}\`
- Summary: \`${state.paths.summaryFile}\`

Files created: ${state.artifacts.filesCreated.length}
Files modified: ${state.artifacts.filesModified.length}
Files deleted: ${state.artifacts.filesDeleted?.length ?? 0}
</dfh-autopilot-complete>`;
}

// src/hooks/autopilot/pipeline.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { join } from "path";
import { homedir } from "os";
function getClaudeConfigDir() {
  return process.env.DFH_CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
}
function getTranscriptCandidates(sessionId, claudeDir = getClaudeConfigDir()) {
  return [
    join(claudeDir, "sessions", sessionId, "transcript.md"),
    join(claudeDir, "sessions", sessionId, "messages.json"),
    join(claudeDir, "transcripts", `${sessionId}.md`)
  ];
}
function detectSignalInTranscript(sessionId, signal, claudeDir = getClaudeConfigDir()) {
  const pattern = new RegExp(signal, "i");
  for (const candidate of getTranscriptCandidates(sessionId, claudeDir)) {
    if (!existsSync2(candidate)) {
      continue;
    }
    try {
      const content = readFileSync2(candidate, "utf-8");
      if (pattern.test(content)) {
        return {
          detected: true,
          signal,
          transcriptPath: candidate
        };
      }
    } catch {
      continue;
    }
  }
  return { detected: false };
}
function getRequiredArtifactsForStage(state, stageId) {
  switch (stageId) {
    case "analyst":
      return [state.paths.specFile, state.paths.openQuestionsFile];
    case "plan":
      return [state.paths.planFile];
    default:
      return [];
  }
}
function getMissingArtifactsForCurrentStage(state) {
  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return [];
  }
  const required = getRequiredArtifactsForStage(state, currentStage.id);
  return required.filter((path) => !existsSync2(path));
}
function advanceAutopilotFromTranscript(directory, sessionId) {
  if (!sessionId) {
    return readAutopilotState(directory);
  }
  const state = readAutopilotState(directory);
  if (!state || !state.active) {
    return state;
  }
  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return completeAutopilot(directory);
  }
  const detection = detectSignalInTranscript(sessionId, currentStage.signal);
  if (!detection.detected) {
    return state;
  }
  const missingArtifacts = getMissingArtifactsForCurrentStage(state);
  if (missingArtifacts.length > 0) {
    currentStage.notes = `Signal ${currentStage.signal} detected but missing artifacts: ${missingArtifacts.join(", ")}`;
    writeAutopilotState(directory, state);
    return state;
  }
  const transition = advanceAutopilotStage(directory);
  return transition.state;
}
function syncAutopilotProgress(directory, sessionId) {
  const state = advanceAutopilotFromTranscript(directory, sessionId);
  if (!state) {
    return null;
  }
  if (state.iteration > state.maxIterations) {
    return markAutopilotFailed(
      directory,
      `max iterations reached (${state.iteration}/${state.maxIterations})`
    );
  }
  return state;
}

// src/hooks/autopilot/summary.ts
import { existsSync as existsSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { execSync } from "child_process";
function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
function parseStatusPath(rawPath) {
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").at(-1)?.trim() ?? rawPath.trim();
  }
  return rawPath.trim();
}
function collectWorkspaceChanges(projectPath) {
  try {
    const output = execSync("git status --porcelain", {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    if (!output) {
      return { created: [], modified: [], deleted: [] };
    }
    const created = [];
    const modified = [];
    const deleted = [];
    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }
      if (line.startsWith("?? ")) {
        created.push(parseStatusPath(line.slice(3)));
        continue;
      }
      const status = line.slice(0, 2);
      const filePath = parseStatusPath(line.slice(3));
      if (status.includes("A")) {
        created.push(filePath);
        continue;
      }
      if (status.includes("D")) {
        deleted.push(filePath);
      } else {
        modified.push(filePath);
      }
    }
    return {
      created: uniqueSorted(created),
      modified: uniqueSorted(modified),
      deleted: uniqueSorted(deleted)
    };
  } catch {
    return { created: [], modified: [], deleted: [] };
  }
}
function collectUnresolvedIssues(state) {
  const unresolved = [];
  if (!existsSync3(state.paths.openQuestionsFile)) {
    return unresolved;
  }
  const content = readFileSync3(state.paths.openQuestionsFile, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*\[\s\]\s*(.+)$/);
    if (match) {
      unresolved.push(match[1].trim());
    }
  }
  return uniqueSorted(unresolved);
}
function collectRisks(state) {
  const risks = [];
  if (existsSync3(state.paths.planFile)) {
    const content = readFileSync3(state.paths.planFile, "utf-8");
    let inRiskSection = false;
    for (const line of content.split(/\r?\n/)) {
      if (/^#{1,6}\s+.*risk/i.test(line)) {
        inRiskSection = true;
        continue;
      }
      if (inRiskSection && /^#{1,6}\s+/.test(line)) {
        inRiskSection = false;
      }
      if (!inRiskSection) {
        continue;
      }
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        risks.push(bullet[1].trim());
      }
    }
  }
  for (const stage of state.pipeline.stages) {
    if (stage.notes) {
      risks.push(`${stage.id}: ${stage.notes}`);
    }
  }
  if (state.failureReason) {
    risks.push(`failure: ${state.failureReason}`);
  }
  return uniqueSorted(risks);
}
function formatList(lines) {
  if (lines.length === 0) {
    return "- (none)";
  }
  return lines.map((line) => `- ${line}`).join("\n");
}
function buildSummaryMarkdown(state, changes, risks, unresolvedIssues) {
  return `# DFH Autopilot Summary

Generated: ${(/* @__PURE__ */ new Date()).toISOString()}

## Request
- ${state.originalRequest}

## Artifact Paths
- State: \`${state.paths.stateFile}\`
- Spec: \`${state.paths.specFile}\`
- Plan: \`${state.paths.planFile}\`
- Open Questions: \`${state.paths.openQuestionsFile}\`
- Summary: \`${state.paths.summaryFile}\`

## Modified Files
### Created
${formatList(changes.created)}

### Modified
${formatList(changes.modified)}

### Deleted
${formatList(changes.deleted)}

## Risks
${formatList(risks)}

## Unresolved Issues
${formatList(unresolvedIssues)}
`;
}
function ensureAutopilotSummary(directory) {
  const state = readAutopilotState(directory);
  if (!state || state.phase !== "complete") {
    return state;
  }
  const changes = collectWorkspaceChanges(state.projectPath);
  const risks = collectRisks(state);
  const unresolvedIssues = collectUnresolvedIssues(state);
  const summary = buildSummaryMarkdown(state, changes, risks, unresolvedIssues);
  writeFileSync2(state.paths.summaryFile, summary, "utf-8");
  state.artifacts.filesCreated = changes.created;
  state.artifacts.filesModified = changes.modified;
  state.artifacts.filesDeleted = changes.deleted;
  state.artifacts.risks = risks;
  state.artifacts.unresolvedIssues = unresolvedIssues;
  writeAutopilotState(directory, state);
  return state;
}

// src/hooks/keyword-detector/patterns.ts
var KEYWORD_PATTERNS = [
  {
    type: "cancel",
    pattern: /\b(cancelomc|stopomc)\b/i,
    priority: 1,
    description: "Stop active modes"
  },
  {
    type: "ralph",
    pattern: /\b(ralph|don't stop|must complete|until done)\b/i,
    priority: 2,
    description: "Persistence mode until task completion"
  },
  {
    type: "autopilot",
    pattern: /\b(autopilot|auto pilot|auto-pilot|autonomous|full auto|fullsend)\b/i,
    priority: 3,
    description: "Full autonomous execution"
  },
  {
    type: "dfh-autopilot",
    pattern: /\b(dfh-autopilot|dfh autopilot|dolphin autopilot)\b/i,
    priority: 3,
    description: "DFH local autopilot execution"
  },
  {
    type: "team",
    pattern: /(?<!\b(?:my|the|our|a|his|her|their|its)\s)\bteam\b/i,
    priority: 4,
    description: "Coordinated team execution"
  },
  {
    type: "ultrawork",
    pattern: /\b(ultrawork|ulw|uw)\b/i,
    priority: 5,
    description: "Maximum parallel execution"
  },
  {
    type: "ralplan",
    pattern: /\b(ralplan)\b/i,
    priority: 6,
    description: "Iterative planning with consensus"
  },
  {
    type: "tdd",
    pattern: /\b(tdd)\b/i,
    priority: 7,
    description: "Test-driven development"
  },
  {
    type: "ultrathink",
    pattern: /\b(ultrathink|think hard|think deeply)\b/i,
    priority: 8,
    description: "Extended reasoning"
  },
  {
    type: "deepsearch",
    pattern: /\b(deepsearch)\b/i,
    priority: 9,
    description: "Codebase search"
  },
  {
    type: "analyze",
    pattern: /\b(deep\s*analyze)\b/i,
    priority: 10,
    description: "Analysis mode"
  },
  {
    type: "dfh-analyst",
    pattern: /\b(dfh-analyst|dfh analyst|dolphin analyst|requirements analysis|analyze requirements|requirements gap|requirements review|requirements check|scope validation|scope analysis|scope check|hidden requirements|hidden assumptions|hidden constraints)\b/i,
    priority: 11,
    description: "Requirements analysis and gap detection"
  },
  {
    type: "dfh-refactor",
    pattern: /\b(dfh-refactor|dfh refactor)\b/i,
    priority: 12,
    description: "Code refactoring"
  }
];
var KEYWORD_PRIORITY = [
  "cancel",
  "ralph",
  "autopilot",
  "dfh-autopilot",
  "team",
  "ultrawork",
  "ralplan",
  "tdd",
  "ultrathink",
  "deepsearch",
  "analyze",
  "dfh-analyst",
  "dfh-refactor"
];

// src/hooks/keyword-detector/utils.ts
var KEYWORD_TO_SKILL_MAP = {
  autopilot: "dfh-autopilot",
  "dfh-autopilot": "dfh-autopilot",
  "dfh-analyst": "dfh-analyst",
  "dfh-refactor": "dfh-refactor"
};
function resolveSkillName(skillName) {
  return KEYWORD_TO_SKILL_MAP[skillName] ?? skillName;
}
function extractPrompt(input) {
  if (input.prompt)
    return input.prompt;
  if (input.message?.content)
    return input.message.content;
  if (Array.isArray(input.parts)) {
    return input.parts.filter((p) => p.type === "text").map((p) => p.text).join(" ");
  }
  return "";
}
function sanitizeForKeywordDetection(text) {
  return text.replace(/<(\w[\w-]*)[\s>][\s\S]*?<\/\1>/g, "").replace(/<\w[\w-]*(?:\s[^>]*)?\s*\/>/g, "").replace(/https?:\/\/[^\s)>\]]+/g, "").replace(/(?<=^|[\s"'`(])(?:\/)?(?:[\w.-]+\/)+[\w.-]+/gm, "").replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
}
function resolveConflicts(matches) {
  const names = matches.map((m) => m.name);
  if (names.includes("cancel")) {
    return [matches.find((m) => m.name === "cancel")];
  }
  let resolved = [...matches];
  if (names.includes("team") && names.includes("autopilot")) {
    resolved = resolved.filter((m) => m.name !== "autopilot");
  }
  return resolved;
}
function createSkillInvocation(skillName, originalPrompt, args = "") {
  const resolvedSkillName = resolveSkillName(skillName);
  const argsSection = args ? `
Arguments: ${args}` : "";
  return `[MAGIC KEYWORD: ${skillName.toUpperCase()}]

You MUST invoke the skill using the Skill tool:

Skill: dolphin-flow-harness:${resolvedSkillName}${argsSection}

User request:
${originalPrompt}

IMPORTANT: Invoke the skill IMMEDIATELY. Do not proceed without loading the skill instructions.`;
}
function createMultiSkillInvocation(skills, originalPrompt) {
  if (skills.length === 0)
    return "";
  if (skills.length === 1) {
    return createSkillInvocation(skills[0].name, originalPrompt, skills[0].args);
  }
  const skillBlocks = skills.map(
    (s, i) => {
      const resolvedSkillName = resolveSkillName(s.name);
      const argsSection = s.args ? `
Arguments: ${s.args}` : "";
      return `### Skill ${i + 1}: ${s.name.toUpperCase()}
Skill: dolphin-flow-harness:${resolvedSkillName}${argsSection}`;
    }
  ).join("\n\n");
  return `[MAGIC KEYWORDS DETECTED: ${skills.map((s) => s.name.toUpperCase()).join(", ")}]

You MUST invoke ALL of the following skills using the Skill tool, in order:

${skillBlocks}

User request:
${originalPrompt}

IMPORTANT: Invoke ALL skills listed above. Start with the first skill IMMEDIATELY. After it completes, invoke the next skill in order. Do not skip any skill.`;
}
function createHookOutput(additionalContext) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext
    }
  };
}
function extractDirectory(input) {
  if (input.cwd) {
    return input.cwd;
  }
  if (input.directory) {
    return input.directory;
  }
  try {
    if (typeof __dirname !== "undefined" && __dirname) {
      return __dirname;
    }
  } catch {
  }
  return process.cwd();
}

// src/hooks/keyword-detector/index.ts
function detectKeywords(text) {
  const matches = [];
  const cleanText = sanitizeForKeywordDetection(text).toLowerCase();
  for (const pattern of KEYWORD_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const match = cleanText.match(regex);
    if (match) {
      matches.push({
        name: pattern.type,
        args: ""
      });
    }
  }
  return matches;
}
function getAllKeywords(text) {
  const detected = detectKeywords(text);
  if (detected.length === 0)
    return [];
  const uniqueNames = [...new Set(detected.map((d) => d.name))];
  let matches = uniqueNames.map((name) => ({
    name,
    args: ""
  }));
  matches = resolveConflicts(matches);
  matches.sort((a, b) => {
    const priorityA = KEYWORD_PRIORITY.indexOf(a.name);
    const priorityB = KEYWORD_PRIORITY.indexOf(b.name);
    return priorityA - priorityB;
  });
  return matches;
}
function processHookInput(input) {
  const prompt = extractPrompt(input);
  if (!prompt || !prompt.trim()) {
    return {
      continue: true,
      suppressOutput: true
    };
  }
  const keywords = getAllKeywords(prompt);
  if (keywords.length === 0) {
    return {
      continue: true,
      suppressOutput: true
    };
  }
  const skillMessage = createMultiSkillInvocation(keywords, prompt);
  return createHookOutput(skillMessage);
}
async function main() {
  const skipHooks = (process.env.OMC_SKIP_HOOKS || "").split(",").map((s) => s.trim());
  if (process.env.DISABLE_OMC === "1" || skipHooks.includes("keyword-detector")) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  try {
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }
    let data = {};
    try {
      data = JSON.parse(input);
    } catch {
    }
    const output = processHookInput(data);
    console.log(JSON.stringify(output));
  } catch (error) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("keyword-detector.mjs")) {
  main();
}

// src/hooks/autopilot-stop-hook/index.ts
function createAllowStop(message) {
  return message ? { continue: true, message } : { continue: true };
}
function createBlockStop(message) {
  return { continue: false, message };
}
function buildMissingArtifactsMessage(missingArtifacts, stageLabel) {
  return `<dfh-autopilot-artifact-guard>
[DFH AUTOPILOT CONTINUE - ARTIFACT GUARD]

Current stage: ${stageLabel}
The completion signal was detected, but required stage artifacts are missing:
${missingArtifacts.map((path) => `- ${path}`).join("\n")}

Do not transition yet. Generate the missing files, then emit the stage signal again.
</dfh-autopilot-artifact-guard>`;
}
function processAutopilotStopHook(input) {
  const directory = extractDirectory(input);
  const sessionId = input.sessionId ?? input.session_id;
  const state = syncAutopilotProgress(directory, sessionId);
  if (!state) {
    return createAllowStop();
  }
  if (state.phase === "failed") {
    return createAllowStop(
      `[DFH AUTOPILOT FAILED] ${state.failureReason ?? "unknown failure"}`
    );
  }
  if (state.phase === "complete" || !state.active) {
    const summarized = ensureAutopilotSummary(directory) ?? state;
    return createAllowStop(buildCompletionPrompt(summarized));
  }
  const missingArtifacts = getMissingArtifactsForCurrentStage(state);
  if (missingArtifacts.length > 0) {
    const currentStage = getCurrentStage(state);
    return createBlockStop(
      buildMissingArtifactsMessage(
        missingArtifacts,
        currentStage?.id ?? state.phase
      )
    );
  }
  const progressed = incrementAutopilotIteration(directory) ?? state;
  if (progressed.iteration > progressed.maxIterations) {
    const failed = markAutopilotFailed(
      directory,
      `max iterations reached (${progressed.iteration}/${progressed.maxIterations})`
    );
    return createAllowStop(
      `[DFH AUTOPILOT FAILED] ${failed?.failureReason ?? "max iterations reached"}`
    );
  }
  return createBlockStop(buildContinuationPrompt(progressed));
}
async function readStdin2() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
async function main2() {
  try {
    const raw = await readStdin2();
    if (!raw.trim()) {
      console.log(JSON.stringify(createAllowStop()));
      return;
    }
    let input = {};
    try {
      input = JSON.parse(raw);
    } catch {
      input = {};
    }
    const output = processAutopilotStopHook(input);
    console.log(JSON.stringify(output));
  } catch {
    console.log(JSON.stringify(createAllowStop()));
  }
}
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("autopilot-stop-hook.mjs")) {
  void main2();
}
export {
  main2 as main,
  processAutopilotStopHook
};
//# sourceMappingURL=autopilot-stop-hook.mjs.map
