import chalk from 'chalk';

export interface LoggerOptions {
    verbose?: boolean;
}

export class Logger {
    private verbose: boolean;

    constructor(options: LoggerOptions = {}) {
        this.verbose = options.verbose ?? false;
    }

    // Success messages
    success(message: string): void {
        console.log(chalk.green('✓'), message);
    }

    // Info messages
    info(message: string): void {
        console.log(chalk.blue('ℹ'), message);
    }

    // Warning messages
    warn(message: string): void {
        console.log(chalk.yellow('⚠'), message);
    }

    // Error messages
    error(message: string, details?: string): void {
        console.error(chalk.red('✗'), message);
        if (details) {
            console.error(chalk.red('  '), details);
        }
    }

    // Progress messages
    progress(current: number, total: number, label?: string): void {
        const percentage = Math.round((current / total) * 100);
        const filled = Math.round(percentage / 5);
        const empty = 20 - filled;
        const bar = chalk.cyan('█').repeat(filled) + chalk.gray('░').repeat(empty);
        const progressText = label ? `${bar} ${percentage}% - ${label}` : `${bar} ${percentage}% (${current}/${total})`;

        // Use carriage return to update the same line
        process.stdout.write(`\r${progressText}`);

        // Add newline when complete
        if (current === total) {
            console.log();
        }
    }

    // Step messages (for multi-step processes)
    step(stepNumber: number, totalSteps: number, message: string): void {
        const stepText = chalk.dim(`[${stepNumber}/${totalSteps}]`);
        console.log(chalk.blue('→'), stepText, message);
    }

    // Debug messages (only shown in verbose mode)
    debug(message: string): void {
        if (this.verbose) {
            console.log(chalk.gray('[DEBUG]'), message);
        }
    }

    // Section headers
    section(title: string): void {
        console.log();
        console.log(chalk.bold.underline(title));
        console.log();
    }

    // File analysis
    file(filename: string, status: 'analyzing' | 'done' | 'error' = 'analyzing'): void {
        const icon = status === 'error' ? chalk.red('✗') : status === 'done' ? chalk.green('✓') : chalk.blue('→');

        if (this.verbose) {
            console.log(`${icon} ${chalk.dim(filename)}`);
        }
    }

    // Summary
    summary(
        title: string,
        items: Array<{ label: string; value: string | number; color?: 'green' | 'yellow' | 'red' | 'blue' }>
    ): void {
        console.log();
        console.log(chalk.bold(title));
        console.log(chalk.gray('─'.repeat(40)));

        items.forEach((item) => {
            const colorFn = item.color ? chalk[item.color] : chalk.white;
            console.log(`  ${item.label}: ${colorFn(item.value)}`);
        });

        console.log(chalk.gray('─'.repeat(40)));
    }

    // LSP server status
    serverStatus(language: string, status: 'checking' | 'installing' | 'ready' | 'error', details?: string): void {
        const icons = {
            checking: chalk.blue('⟳'),
            installing: chalk.yellow('⬇'),
            ready: chalk.green('✓'),
            error: chalk.red('✗')
        };

        const messages = {
            checking: `Checking LSP server for ${language}...`,
            installing: `Installing ${language} LSP server...`,
            ready: `LSP server ready for ${language}`,
            error: `LSP server error for ${language}`
        };

        console.log(`${icons[status]} ${messages[status]}`);
        if (details) {
            console.log(`  ${chalk.dim(details)}`);
        }
    }

    // Clear current line (useful for progress updates)
    clearLine(): void {
        process.stdout.write(`\r${' '.repeat(80)}\r`);
    }
}

// Default logger instance
export const logger = new Logger();
