import { KeywordDetector } from './dist/index.js';

// 基本用法示例
console.log('=== 基本检测示例 ===');
const detector = new KeywordDetector(['help', 'start', 'stop']);

// 测试关键词包含检测
const hasHelp = detector.containsKeyword('Please help me');
console.log('检测 "Please help me" 是否包含关键词:', hasHelp, '(期望: true)');

const matched = detector.getMatchedKeywords('Help me start the process');
console.log('获取匹配的关键词:', matched, '(期望: ["help", "start"])');

// 测试大小写不敏感
const hasStop = detector.containsKeyword('STOP the process');
console.log('检测 "STOP the process" 是否包含关键词:', hasStop, '(期望: true)');

// 测试精确单词边界
const hasPartial = detector.containsKeyword('helper function');
console.log('检测 "helper function" 是否包含 "help":', hasPartial, '(期望: false)');
console.log();

// 高级功能示例
console.log('=== 高级功能示例 ===');
const result = detector.getMatchResult('Start helping with the process');
console.log('详细匹配结果:', result);
console.log('匹配位置:', result.positions);
console.log();

// 动态关键词管理
console.log('=== 动态关键词管理 ===');
detector.addKeyword('pause');
console.log('添加 "pause" 后的关键词:', detector.getKeywords());

detector.removeKeyword('help');
console.log('移除 "help" 后的关键词:', detector.getKeywords());
console.log('是否包含 "help":', detector.hasKeyword('help'));
console.log();

// 统计信息
console.log('=== 统计信息 ===');
const stats = detector.getStats();
console.log('关键词总数:', stats.totalKeywords);
console.log('总匹配次数:', stats.totalMatches);
console.log('单个关键词匹配次数:', Object.fromEntries(stats.keywordCounts));
console.log();

// 配置选项示例
console.log('=== 配置选项示例 ===');
const caseSensitiveDetector = new KeywordDetector({
  keywords: ['Help'],
  caseSensitive: true
});
console.log('大小写敏感检测 "help me":', caseSensitiveDetector.containsKeyword('help me'), '(期望: false)');
console.log('大小写敏感检测 "Help me":', caseSensitiveDetector.containsKeyword('Help me'), '(期望: true)');

const noWordBoundary = new KeywordDetector({
  keywords: ['help'],
  wordBoundary: false
});
console.log('无单词边界检测 "helper":', noWordBoundary.containsKeyword('helper function'), '(期望: true)');

console.log('=== 所有测试完成 ===');
