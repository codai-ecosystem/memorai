import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger.js';

export interface GitHubIntegrationConfig {
    token: string;
    owner: string;
    repo: string;
    branches?: string[];
    fileExtensions?: string[];
    includePaths?: string[];
    excludePaths?: string[];
}

export interface CodeContext {
    filePath: string;
    content: string;
    language: string;
    lastModified: Date;
    author: string;
    commitHash: string;
    commitMessage: string;
    functions: string[];
    classes: string[];
    imports: string[];
}

export interface IssueContext {
    number: number;
    title: string;
    body: string;
    state: string;
    labels: string[];
    assignees: string[];
    createdAt: Date;
    updatedAt: Date;
    comments: Array<{
        author: string;
        body: string;
        createdAt: Date;
    }>;
}

export interface PullRequestContext {
    number: number;
    title: string;
    body: string;
    state: string;
    head: string;
    base: string;
    author: string;
    reviewers: string[];
    changedFiles: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

export class GitHubIntegration {
    private octokit: Octokit;
    private config: GitHubIntegrationConfig;

    constructor(config: GitHubIntegrationConfig) {
        this.config = config;
        this.octokit = new Octokit({
            auth: config.token,
        });
    }

    /**
     * Extract code context from repository files
     */
    async extractCodeContext(): Promise<CodeContext[]> {
        logger.info('Extracting code context from GitHub repository', {
            owner: this.config.owner,
            repo: this.config.repo,
        });

        const contexts: CodeContext[] = [];
        const branches = this.config.branches || ['main', 'master'];

        for (const branch of branches) {
            try {
                const { data: tree } = await this.octokit.rest.git.getTree({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    tree_sha: branch,
                    recursive: 'true',
                }); const files = tree.tree.filter((item: any) =>
                    item.type === 'blob' &&
                    this.shouldProcessFile(item.path || '')
                );

                for (const file of files.slice(0, 50)) { // Limit to prevent rate limits
                    try {
                        const context = await this.extractFileContext(file.path!, branch);
                        if (context) {
                            contexts.push(context);
                        }
                    } catch (error) {
                        logger.warn('Failed to extract context from file', {
                            file: file.path,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                    }
                }
            } catch (error) {
                logger.warn('Failed to process branch', {
                    branch,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        logger.info('Code context extraction completed', {
            filesProcessed: contexts.length,
        });

        return contexts;
    }

    /**
     * Extract context from repository issues
     */
    async extractIssueContext(): Promise<IssueContext[]> {
        logger.info('Extracting issue context from GitHub repository');

        const contexts: IssueContext[] = [];

        try {
            const { data: issues } = await this.octokit.rest.issues.listForRepo({
                owner: this.config.owner,
                repo: this.config.repo,
                state: 'all',
                per_page: 100,
            });

            for (const issue of issues) {
                if (!issue.pull_request) { // Skip pull requests
                    const context = await this.extractSingleIssueContext(issue.number);
                    contexts.push(context);
                }
            }
        } catch (error) {
            logger.error('Failed to extract issue context', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        logger.info('Issue context extraction completed', {
            issuesProcessed: contexts.length,
        });

        return contexts;
    }

    /**
     * Extract context from pull requests
     */
    async extractPullRequestContext(): Promise<PullRequestContext[]> {
        logger.info('Extracting pull request context from GitHub repository');

        const contexts: PullRequestContext[] = [];

        try {
            const { data: pulls } = await this.octokit.rest.pulls.list({
                owner: this.config.owner,
                repo: this.config.repo,
                state: 'all',
                per_page: 100,
            });

            for (const pull of pulls) {
                try {
                    const context = await this.extractSinglePullRequestContext(pull.number);
                    contexts.push(context);
                } catch (error) {
                    logger.warn('Failed to extract PR context', {
                        prNumber: pull.number,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        } catch (error) {
            logger.error('Failed to extract pull request context', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        logger.info('Pull request context extraction completed', {
            pullRequestsProcessed: contexts.length,
        });

        return contexts;
    }

    private async extractFileContext(filePath: string, branch: string): Promise<CodeContext | null> {
        try {
            const { data: fileData } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: filePath,
                ref: branch,
            });

            if ('content' in fileData && fileData.content) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf8');

                // Get commit info for the file
                const { data: commits } = await this.octokit.rest.repos.listCommits({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: filePath,
                    per_page: 1,
                });

                const lastCommit = commits[0];

                return {
                    filePath,
                    content,
                    language: this.detectLanguage(filePath),
                    lastModified: new Date(lastCommit?.commit.committer?.date || Date.now()),
                    author: lastCommit?.commit.author?.name || 'Unknown',
                    commitHash: lastCommit?.sha || '',
                    commitMessage: lastCommit?.commit.message || '',
                    functions: this.extractFunctions(content, this.detectLanguage(filePath)),
                    classes: this.extractClasses(content, this.detectLanguage(filePath)),
                    imports: this.extractImports(content, this.detectLanguage(filePath)),
                };
            }
        } catch (error) {
            logger.warn('Failed to extract file context', {
                filePath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        return null;
    }

    private async extractSingleIssueContext(issueNumber: number): Promise<IssueContext> {
        const { data: issue } = await this.octokit.rest.issues.get({
            owner: this.config.owner,
            repo: this.config.repo,
            issue_number: issueNumber,
        });

        const { data: comments } = await this.octokit.rest.issues.listComments({
            owner: this.config.owner,
            repo: this.config.repo,
            issue_number: issueNumber,
        });

        return {
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            state: issue.state, labels: issue.labels.map((label: any) => typeof label === 'string' ? label : label.name || ''),
            assignees: issue.assignees?.map((assignee: any) => assignee.login) || [],
            createdAt: new Date(issue.created_at),
            updatedAt: new Date(issue.updated_at), comments: comments.map((comment: any) => ({
                author: comment.user?.login || 'Unknown',
                body: comment.body,
                createdAt: new Date(comment.created_at),
            })),
        };
    }

    private async extractSinglePullRequestContext(prNumber: number): Promise<PullRequestContext> {
        const { data: pr } = await this.octokit.rest.pulls.get({
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: prNumber,
        });

        const { data: files } = await this.octokit.rest.pulls.listFiles({
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: prNumber,
        });

        const { data: reviews } = await this.octokit.rest.pulls.listReviews({
            owner: this.config.owner,
            repo: this.config.repo,
            pull_number: prNumber,
        });

        return {
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            state: pr.state,
            head: pr.head.ref,
            base: pr.base.ref,
            author: pr.user?.login || 'Unknown', reviewers: reviews.map((review: any) => review.user?.login || 'Unknown'),
            changedFiles: files.map((file: any) => ({
                filename: file.filename,
                status: file.status,
                additions: file.additions,
                deletions: file.deletions,
            })),
            createdAt: new Date(pr.created_at),
            updatedAt: new Date(pr.updated_at),
        };
    }

    private shouldProcessFile(filePath: string): boolean {
        // Check file extensions
        if (this.config.fileExtensions) {
            const ext = filePath.split('.').pop()?.toLowerCase();
            if (!ext || !this.config.fileExtensions.includes(ext)) {
                return false;
            }
        }

        // Check include paths
        if (this.config.includePaths) {
            const included = this.config.includePaths.some(path =>
                filePath.startsWith(path)
            );
            if (!included) return false;
        }

        // Check exclude paths
        if (this.config.excludePaths) {
            const excluded = this.config.excludePaths.some(path =>
                filePath.startsWith(path)
            );
            if (excluded) return false;
        }

        return true;
    }

    private detectLanguage(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            js: 'javascript',
            ts: 'typescript',
            jsx: 'javascript',
            tsx: 'typescript',
            py: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            php: 'php',
            rb: 'ruby',
            swift: 'swift',
            kt: 'kotlin',
            scala: 'scala',
            sh: 'bash',
            sql: 'sql',
            md: 'markdown',
            json: 'json',
            yaml: 'yaml',
            yml: 'yaml',
            xml: 'xml',
            html: 'html',
            css: 'css',
            scss: 'scss',
            sass: 'sass',
        };

        return languageMap[ext || ''] || 'text';
    }

    private extractFunctions(content: string, language: string): string[] {
        const functions: string[] = [];

        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                    // Match function declarations and arrow functions
                    const jsPattern = /(?:function\s+(\w+)|(\w+)\s*(?::\s*\w+)?\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{)|(\w+)\s*\([^)]*\)\s*{)/g;
                    let jsMatch;
                    while ((jsMatch = jsPattern.exec(content)) !== null) {
                        functions.push(jsMatch[1] || jsMatch[2] || jsMatch[3]);
                    }
                    break;

                case 'python':
                    const pyPattern = /def\s+(\w+)\s*\(/g;
                    let pyMatch;
                    while ((pyMatch = pyPattern.exec(content)) !== null) {
                        functions.push(pyMatch[1]);
                    }
                    break;

                // Add more language patterns as needed
            }
        } catch (error) {
            logger.warn('Failed to extract functions', { language, error });
        }

        return functions;
    }

    private extractClasses(content: string, language: string): string[] {
        const classes: string[] = [];

        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                    const jsPattern = /class\s+(\w+)/g;
                    let jsMatch;
                    while ((jsMatch = jsPattern.exec(content)) !== null) {
                        classes.push(jsMatch[1]);
                    }
                    break;

                case 'python':
                    const pyPattern = /class\s+(\w+)/g;
                    let pyMatch;
                    while ((pyMatch = pyPattern.exec(content)) !== null) {
                        classes.push(pyMatch[1]);
                    }
                    break;

                // Add more language patterns as needed
            }
        } catch (error) {
            logger.warn('Failed to extract classes', { language, error });
        }

        return classes;
    }

    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];

        try {
            switch (language) {
                case 'javascript':
                case 'typescript':
                    const jsPattern = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                    let jsMatch;
                    while ((jsMatch = jsPattern.exec(content)) !== null) {
                        imports.push(jsMatch[1]);
                    }
                    break;

                case 'python':
                    const pyPattern = /(?:from\s+(\S+)\s+)?import\s+([^#\n]+)/g;
                    let pyMatch;
                    while ((pyMatch = pyPattern.exec(content)) !== null) {
                        imports.push(pyMatch[1] || pyMatch[2]);
                    }
                    break;

                // Add more language patterns as needed
            }
        } catch (error) {
            logger.warn('Failed to extract imports', { language, error });
        }

        return imports;
    }

    /**
     * Generate memory entries from extracted contexts
     */
    generateCodeMemories(contexts: CodeContext[]): Array<{
        content: string;
        type: string;
        metadata: Record<string, unknown>;
    }> {
        return contexts.map(context => ({
            content: `File: ${context.filePath}\n\nLanguage: ${context.language}\n\nFunctions: ${context.functions.join(', ')}\n\nClasses: ${context.classes.join(', ')}\n\nImports: ${context.imports.join(', ')}\n\nRecent changes by ${context.author}: ${context.commitMessage}`,
            type: 'fact',
            metadata: {
                sourceType: 'github',
                filePath: context.filePath,
                language: context.language,
                author: context.author,
                commitHash: context.commitHash,
                lastModified: context.lastModified,
                functions: context.functions,
                classes: context.classes,
                imports: context.imports,
            },
        }));
    }

    generateIssueMemories(contexts: IssueContext[]): Array<{
        content: string;
        type: string;
        metadata: Record<string, unknown>;
    }> {
        return contexts.map(context => ({
            content: `Issue #${context.number}: ${context.title}\n\n${context.body}\n\nLabels: ${context.labels.join(', ')}\nState: ${context.state}\nAssignees: ${context.assignees.join(', ')}\n\nComments:\n${context.comments.map(c => `${c.author}: ${c.body}`).join('\n\n')}`,
            type: 'task',
            metadata: {
                sourceType: 'github',
                issueNumber: context.number,
                state: context.state,
                labels: context.labels,
                assignees: context.assignees,
                createdAt: context.createdAt,
                updatedAt: context.updatedAt,
            },
        }));
    }

    generatePullRequestMemories(contexts: PullRequestContext[]): Array<{
        content: string;
        type: string;
        metadata: Record<string, unknown>;
    }> {
        return contexts.map(context => ({
            content: `PR #${context.number}: ${context.title}\n\n${context.body}\n\nBranch: ${context.head} → ${context.base}\nAuthor: ${context.author}\nReviewers: ${context.reviewers.join(', ')}\n\nChanged files:\n${context.changedFiles.map(f => `${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`).join('\n')}`,
            type: 'procedure',
            metadata: {
                sourceType: 'github',
                prNumber: context.number,
                state: context.state,
                head: context.head,
                base: context.base,
                author: context.author,
                reviewers: context.reviewers,
                changedFiles: context.changedFiles,
                createdAt: context.createdAt,
                updatedAt: context.updatedAt,
            },
        }));
    }
}
