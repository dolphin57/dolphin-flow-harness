/**
 * Dolphin Flow Harness Autopilot Summary
 *
 * Generates completion summaries with artifact paths, modified files,
 * risks, and unresolved issues.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

import type { DfhAutopilotState } from './types.js';
import { readAutopilotState, writeAutopilotState } from './state.js';

interface WorkspaceChanges {
  created: string[];
  modified: string[];
  deleted: string[];
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function parseStatusPath(rawPath: string): string {
  if (rawPath.includes(' -> ')) {
    return rawPath.split(' -> ').at(-1)?.trim() ?? rawPath.trim();
  }
  return rawPath.trim();
}

function collectWorkspaceChanges(projectPath: string): WorkspaceChanges {
  try {
    const output = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!output) {
      return { created: [], modified: [], deleted: [] };
    }

    const created: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const line of output.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }

      if (line.startsWith('?? ')) {
        created.push(parseStatusPath(line.slice(3)));
        continue;
      }

      const status = line.slice(0, 2);
      const filePath = parseStatusPath(line.slice(3));

      if (status.includes('A')) {
        created.push(filePath);
        continue;
      }

      if (status.includes('D')) {
        deleted.push(filePath);
      } else {
        modified.push(filePath);
      }
    }

    return {
      created: uniqueSorted(created),
      modified: uniqueSorted(modified),
      deleted: uniqueSorted(deleted),
    };
  } catch {
    return { created: [], modified: [], deleted: [] };
  }
}

function collectUnresolvedIssues(state: DfhAutopilotState): string[] {
  const unresolved: string[] = [];
  if (!existsSync(state.paths.openQuestionsFile)) {
    return unresolved;
  }

  const content = readFileSync(state.paths.openQuestionsFile, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*\[\s\]\s*(.+)$/);
    if (match) {
      unresolved.push(match[1].trim());
    }
  }

  return uniqueSorted(unresolved);
}

function collectRisks(state: DfhAutopilotState): string[] {
  const risks: string[] = [];

  if (existsSync(state.paths.planFile)) {
    const content = readFileSync(state.paths.planFile, 'utf-8');
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

function formatList(lines: string[]): string {
  if (lines.length === 0) {
    return '- (none)';
  }
  return lines.map(line => `- ${line}`).join('\n');
}

function buildSummaryMarkdown(
  state: DfhAutopilotState,
  changes: WorkspaceChanges,
  risks: string[],
  unresolvedIssues: string[]
): string {
  return `# DFH Autopilot Summary

Generated: ${new Date().toISOString()}

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

export function ensureAutopilotSummary(directory: string): DfhAutopilotState | null {
  const state = readAutopilotState(directory);
  if (!state || state.phase !== 'complete') {
    return state;
  }

  const changes = collectWorkspaceChanges(state.projectPath);
  const risks = collectRisks(state);
  const unresolvedIssues = collectUnresolvedIssues(state);

  const summary = buildSummaryMarkdown(state, changes, risks, unresolvedIssues);
  writeFileSync(state.paths.summaryFile, summary, 'utf-8');

  state.artifacts.filesCreated = changes.created;
  state.artifacts.filesModified = changes.modified;
  state.artifacts.filesDeleted = changes.deleted;
  state.artifacts.risks = risks;
  state.artifacts.unresolvedIssues = unresolvedIssues;

  writeAutopilotState(directory, state);
  return state;
}
