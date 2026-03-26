#!/usr/bin/env node

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
function getPatternByType(type) {
  return KEYWORD_PATTERNS.find((p) => p.type === type);
}
function getPatternPriority(type) {
  const pattern = getPatternByType(type);
  return pattern?.priority ?? 999;
}

// src/hooks/keyword-detector/utils.ts
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
  const argsSection = args ? `
Arguments: ${args}` : "";
  return `[MAGIC KEYWORD: ${skillName.toUpperCase()}]

You MUST invoke the skill using the Skill tool:

Skill: dolphin-flow-harness:${skillName}${argsSection}

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
      const argsSection = s.args ? `
Arguments: ${s.args}` : "";
      return `### Skill ${i + 1}: ${s.name.toUpperCase()}
Skill: dolphin-flow-harness:${s.name}${argsSection}`;
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
  try {
    if (typeof __dirname !== "undefined" && __dirname) {
      return __dirname;
    }
  } catch {
  }
  return input.cwd || input.directory || process.cwd();
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
function detectKeywordsWithType(text) {
  const detected = [];
  const cleanText = sanitizeForKeywordDetection(text);
  for (const pattern of KEYWORD_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    const match = cleanText.match(regex);
    if (match && match.index !== void 0) {
      detected.push({
        type: pattern.type,
        keyword: match[0],
        position: match.index
      });
    }
  }
  return detected;
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
function hasKeyword(text) {
  return detectKeywords(text).length > 0;
}
function getPrimaryKeyword(text) {
  const allKeywords = getAllKeywords(text);
  if (allKeywords.length === 0) {
    return null;
  }
  const primaryType = allKeywords[0].name;
  const detected = detectKeywordsWithType(text);
  const match = detected.find((d) => d.type === primaryType);
  return match || null;
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
export {
  KEYWORD_PATTERNS,
  KEYWORD_PRIORITY,
  createHookOutput,
  createMultiSkillInvocation,
  createSkillInvocation,
  detectKeywords,
  detectKeywordsWithType,
  extractDirectory,
  extractPrompt,
  getAllKeywords,
  getPatternByType,
  getPatternPriority,
  getPrimaryKeyword,
  hasKeyword,
  main,
  processHookInput,
  resolveConflicts,
  sanitizeForKeywordDetection
};
//# sourceMappingURL=keyword-detector.mjs.map
