#!/usr/bin/env node
/**
 * mvc2springboot - Spring MVC to Spring Boot Migration Script
 *
 * Harness Engineering Feedback Loop:
 * Execute (Maven) -> Verify -> Pass/Fail -> Loop if fail -> Continue if pass
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const STEPS = [
    {
        id: 'pom',
        name: 'pom.xml Validation',
        verify: (ctx) => runMaven(ctx, 'validate', 'pom.xml'),
        description: 'Maven validate phase - checks pom.xml structure'
    },
    {
        id: 'compile',
        name: 'Java Compilation',
        verify: (ctx) => runMaven(ctx, 'compile', 'Java sources'),
        description: 'Maven compile phase - compiles Java sources'
    },
    {
        id: 'startup',
        name: 'SpringBootApplication Check',
        verify: (ctx) => checkStartupClass(ctx),
        description: 'Verify startup class has required annotations'
    },
    {
        id: 'resources',
        name: 'Resources Processing',
        verify: (ctx) => runMaven(ctx, 'process-resources', 'resources'),
        description: 'Maven process-resources - validates resource files'
    },
    {
        id: 'test-compile',
        name: 'Test Compilation',
        verify: (ctx) => runMaven(ctx, 'test-compile', 'test sources'),
        description: 'Maven test-compile - compiles test sources'
    },
    {
        id: 'package',
        name: 'Package Build',
        verify: (ctx) => runMaven(ctx, 'package -DskipTests', 'JAR package'),
        description: 'Maven package - builds JAR (skip tests for speed)'
    }
];

function parseArgs() {
    const args = process.argv.slice(2);
    const ctx = {
        projectDir: process.cwd(),
        moduleName: 'App',
        packagePath: 'com.example',
        mvn: 'mvn',
        maxRetries: 3,
        verbose: false
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dir' && args[i + 1]) ctx.projectDir = path.resolve(args[++i]);
        if (args[i] === '--module' && args[i + 1]) ctx.moduleName = args[++i];
        if (args[i] === '--package' && args[i + 1]) ctx.packagePath = args[++i];
        if (args[i] === '--mvn' && args[i + 1]) ctx.mvn = args[++i];
        if (args[i] === '--retries') ctx.maxRetries = parseInt(args[++i]) || 3;
        if (args[i] === '-v' || args[i] === '--verbose') ctx.verbose = true;
    }
    return ctx;
}

function runMaven(ctx, goal, desc) {
    const start = Date.now();
    try {
        if (ctx.verbose) {
            console.log(`    > mvn ${goal}`);
        }
        execSync(`${ctx.mvn} ${goal}`, {
            cwd: ctx.projectDir,
            stdio: ctx.verbose ? 'inherit' : 'pipe',
            encoding: 'utf8',
            timeout: 300000 // 5 min timeout
        });
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        return { pass: true, msg: `${desc} OK (${elapsed}s)` };
    } catch (error) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        let msg = `${desc} failed`;
        if (error.stdout) {
            // Extract key error message
            const lines = error.stdout.split('\n');
            const errorLine = lines.find(l => l.includes('[ERROR]') && !l.includes('Build failure'));
            if (errorLine) msg = errorLine.replace('[ERROR]', '').trim();
        }
        return { pass: false, msg: `${msg} (${elapsed}s)` };
    }
}

function checkStartupClass(ctx) {
    const className = `${ctx.moduleName}SpringBootApplication.java`;
    const srcDir = path.join(ctx.projectDir, 'src/main/java');
    const pkgDir = ctx.packagePath.replace(/\./g, '/');

    // Recursively find the startup class
    function findFile(dir, name) {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        for (const f of files) {
            const fullPath = path.join(dir, f);
            if (fs.statSync(fullPath).isDirectory()) {
                const result = findFile(fullPath, name);
                if (result) return result;
            } else if (f === name) {
                return fullPath;
            }
        }
        return null;
    }

    const filePath = findFile(srcDir, className);
    if (!filePath) {
        return { pass: false, msg: `${className} not found in src/main/java` };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const checks = [
        { test: /@SpringBootApplication/, msg: '@SpringBootApplication' },
        { test: /@ImportResource/, msg: '@ImportResource' },
        { test: /SpringApplication\.run/, msg: 'SpringApplication.run()' },
        { test: /LoggerFactory\.getLogger/, msg: 'Logger configured' }
    ];

    for (const c of checks) {
        if (!c.test.test(content)) {
            return { pass: false, msg: `${c.msg} missing in ${className}` };
        }
    }

    return { pass: true, msg: `${className} validated` };
}

function runStep(step, ctx) {
    console.log(`\n[STEP ${step.id}] ${step.name}`);
    console.log('─'.repeat(60));
    console.log(`  ${step.description}`);

    let attempt = 0;
    while (attempt < ctx.maxRetries) {
        attempt++;
        const result = step.verify(ctx);
        const status = result.pass ? '✓' : '✗';
        console.log(`  ${status} Attempt ${attempt}/${ctx.maxRetries}: ${result.msg}`);

        if (result.pass) {
            return { success: true, attempts: attempt };
        }

        if (attempt < ctx.maxRetries) {
            console.log(`  ↻ Retrying after brief pause...`);
            sleep(1000); // Brief pause before retry
        }
    }

    return { success: false, attempts: attempt };
}

function sleep(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy wait */ }
}

function printSummary(results, totalTime) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                      SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    results.forEach((r, i) => {
        const status = r.success ? '✓ PASS' : '✗ FAIL';
        const icon = r.success ? '●' : '○';
        console.log(`  ${icon} ${i + 1}. ${r.step}: ${status} (${r.attempts} attempt${r.attempts > 1 ? 's' : ''})`);
    });

    console.log(`\n  Total: ${passed} passed, ${failed} failed, ${totalTime}s`);
    console.log('─'.repeat(60));

    return failed === 0;
}

function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Spring MVC to Spring Boot Migration - Harness Script    ║');
    console.log('║  Execute → Verify → Pass/Fail → Loop → Continue           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const ctx = parseArgs();
    console.log(`\n📁 Project: ${ctx.projectDir}`);
    console.log(`📦 Module:  ${ctx.moduleName}`);
    console.log(`📂 Package: ${ctx.packagePath}`);
    console.log(`🔄 Max retries: ${ctx.maxRetries}`);

    // Pre-flight check
    const pomPath = path.join(ctx.projectDir, 'pom.xml');
    if (!fs.existsSync(pomPath)) {
        console.error('\n❌ pom.xml not found in project directory');
        process.exit(1);
    }

    const startTime = Date.now();
    const results = [];
    let allPassed = true;

    for (const step of STEPS) {
        const result = runStep(step, ctx);
        results.push({ step: step.name, ...result });

        if (!result.success) {
            allPassed = false;
            console.log(`\n⚠️  Migration BLOCKED at: ${step.name}`);
            console.log('   Fix the issue and re-run the script');
            break;
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const success = printSummary(results, totalTime);

    if (success) {
        console.log('\n✅ Migration complete - all verifications passed!');
        console.log('   Run: mvn spring-boot:run');
        process.exit(0);
    } else {
        console.log('\n❌ Migration incomplete - fix errors above and re-run');
        process.exit(1);
    }
}

main();