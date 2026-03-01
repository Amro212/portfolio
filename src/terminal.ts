import { projects } from './projects';

// ───────────────────────────────────────────────────
//  Virtual File System & Interactive Terminal
//  Builds a Linux-style directory tree from projects
// ───────────────────────────────────────────────────

/** Represents a node in the virtual file system */
interface FSNode {
    name: string;
    type: 'dir' | 'file';
    children?: Map<string, FSNode>;
    content?: string;
}

/** Slugify a project title for use as a directory name */
function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Build the complete virtual file system from project data */
function buildFileSystem(): FSNode {
    const root: FSNode = {
        name: '/',
        type: 'dir',
        children: new Map(),
    };

    // ~/about.txt
    const aboutFile: FSNode = {
        name: 'about.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  About Me',
            '═══════════════════════════════════════════',
            '',
            'Graduate computer engineering student with a',
            'passion for bridging hardware and software.',
            '',
            'Focus areas:',
            '  • Embedded Systems & FPGA Design',
            '  • Digital Signal Processing',
            '  • Computer Architecture',
            '  • Machine Learning at the Edge',
            '  • Full-Stack Development',
            '',
            'Currently pursuing an M.S. in Computer',
            'Engineering.',
        ].join('\n'),
    };

    // ~/contact.txt
    const contactFile: FSNode = {
        name: 'contact.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  Contact Info',
            '═══════════════════════════════════════════',
            '',
            'Email:    you@example.com',
            'LinkedIn: linkedin.com/in/yourprofile',
            'GitHub:   github.com/yourhandle',
        ].join('\n'),
    };

    // ~/skills.txt
    const skillsFile: FSNode = {
        name: 'skills.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  Technical Skills',
            '═══════════════════════════════════════════',
            '',
            'Languages:    C/C++, Python, Rust, TypeScript',
            'HDL:          Verilog, SystemVerilog, VHDL',
            'Hardware:     FPGA, ARM Cortex-M, STM32, PCB',
            'Frameworks:   React, Node.js, TensorFlow Lite',
            'Tools:        KiCad, Vivado, Git, Docker',
            'Protocols:    MQTT, SPI, UART, AXI-Stream',
        ].join('\n'),
    };

    root.children!.set('about.txt', aboutFile);
    root.children!.set('contact.txt', contactFile);
    root.children!.set('skills.txt', skillsFile);

    // ~/projects/ directory
    const projectsDir: FSNode = {
        name: 'projects',
        type: 'dir',
        children: new Map(),
    };

    // Populate each project as a subdirectory with files
    for (const project of projects) {
        const slug = slugify(project.title);
        const projDir: FSNode = {
            name: slug,
            type: 'dir',
            children: new Map(),
        };

        // README.md for each project
        const readme: FSNode = {
            name: 'README.md',
            type: 'file',
            content: [
                `# ${project.title}`,
                `> ${project.year} | ${project.category}`,
                '',
                project.description,
                '',
                `Tags: ${project.tags.join(', ')}`,
                ...(project.link ? ['', `Link: ${project.link}`] : []),
            ].join('\n'),
        };

        // tech-stack.txt
        const techStack: FSNode = {
            name: 'tech-stack.txt',
            type: 'file',
            content: project.tags.map((t) => `  • ${t}`).join('\n'),
        };

        projDir.children!.set('README.md', readme);
        projDir.children!.set('tech-stack.txt', techStack);

        projectsDir.children!.set(slug, projDir);
    }

    root.children!.set('projects', projectsDir);

    return root;
}

/** Resolve a path relative to the current working directory */
function resolvePath(root: FSNode, cwd: string[], pathStr: string): { node: FSNode | null; absPath: string[] } {
    let parts: string[];

    if (pathStr === '/') {
        return { node: root, absPath: [] };
    }

    if (pathStr.startsWith('/')) {
        // Absolute path
        parts = pathStr.split('/').filter(Boolean);
    } else if (pathStr.startsWith('~/')) {
        parts = pathStr.slice(2).split('/').filter(Boolean);
    } else {
        // Relative path
        parts = [...cwd, ...pathStr.split('/').filter(Boolean)];
    }

    // Resolve . and ..
    const resolved: string[] = [];
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            resolved.pop();
        } else {
            resolved.push(part);
        }
    }

    // Walk the tree
    let current = root;
    for (const part of resolved) {
        if (current.type !== 'dir' || !current.children?.has(part)) {
            return { node: null, absPath: resolved };
        }
        current = current.children.get(part)!;
    }

    return { node: current, absPath: resolved };
}

/** Format the current working directory as a string */
function formatCwd(cwd: string[]): string {
    return cwd.length === 0 ? '~' : `~/${cwd.join('/')}`;
}

// ───────────────────────────────────────────────────
//  Terminal State & Commands
// ───────────────────────────────────────────────────

type TerminalOutput = { text: string; className?: string };

const HELP_TEXT: TerminalOutput[] = [
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: '  CE-Linux 1.0 — Available Commands', className: 'term-bright' },
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: '' },
    { text: '  ls  [path]       List directory contents' },
    { text: '  cd  <path>       Change directory' },
    { text: '  cat <file>       Display file contents' },
    { text: '  pwd              Print working directory' },
    { text: '  whoami           Show current user' },
    { text: '  clear            Clear the terminal' },
    { text: '  open <project>   Jump to project section' },
    { text: '  tree [path]      Show directory tree' },
    { text: '  help             Show this help message' },
    { text: '' },
    { text: '  Tip: Navigate with cd projects/', className: 'term-dim' },
    { text: '  then cat <project>/README.md', className: 'term-dim' },
];

const WELCOME_LINES: TerminalOutput[] = [
    { text: 'CE-Linux 1.0 LTS (CE-Kernel 6.8.0-ce)', className: 'term-dim' },
    { text: '' },
    { text: ' * Documentation:  type "help"', className: 'term-dim' },
    { text: ' * Projects:       cd projects/ && ls', className: 'term-dim' },
    { text: '' },
];

export class Terminal {
    private root: FSNode;
    private cwd: string[] = [];
    private history: string[] = [];
    private historyIndex = -1;
    private outputEl: HTMLElement;
    private inputEl: HTMLInputElement;
    private promptEl: HTMLElement;
    private terminalAreaEl: HTMLElement;

    constructor(containerSelector: string) {
        this.root = buildFileSystem();

        const container = document.querySelector(containerSelector);
        if (!container) throw new Error(`Terminal container not found: ${containerSelector}`);

        // Build the terminal DOM
        this.terminalAreaEl = container as HTMLElement;
        this.terminalAreaEl.innerHTML = '';

        // Output area (scrollable)
        this.outputEl = document.createElement('div');
        this.outputEl.className = 'term__output';
        this.terminalAreaEl.appendChild(this.outputEl);

        // Input line
        const inputLine = document.createElement('div');
        inputLine.className = 'term__input-line';

        this.promptEl = document.createElement('span');
        this.promptEl.className = 'term__prompt';
        this.updatePrompt();
        inputLine.appendChild(this.promptEl);

        this.inputEl = document.createElement('input');
        this.inputEl.className = 'term__input';
        this.inputEl.type = 'text';
        this.inputEl.autocomplete = 'off';
        this.inputEl.spellcheck = false;
        this.inputEl.autofocus = false; // Don't steal focus on load
        inputLine.appendChild(this.inputEl);

        this.terminalAreaEl.appendChild(inputLine);

        // Event listeners
        this.inputEl.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Click anywhere on terminal to focus input
        this.terminalAreaEl.addEventListener('click', () => {
            this.inputEl.focus();
        });

        // Print welcome message
        this.printLines(WELCOME_LINES);
    }

    private updatePrompt(): void {
        this.promptEl.textContent = `user@ce-linux:${formatCwd(this.cwd)}$ `;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            const cmd = this.inputEl.value.trim();
            this.inputEl.value = '';

            // Echo the command
            this.printLine({
                text: `${this.promptEl.textContent}${cmd}`,
                className: 'term-echo',
            });

            if (cmd) {
                this.history.push(cmd);
                this.historyIndex = this.history.length;
                this.executeCommand(cmd);
            }

            this.updatePrompt();
            this.scrollToBottom();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.inputEl.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputEl.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.inputEl.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.autocomplete();
        }
    }

    private executeCommand(input: string): void {
        const parts = input.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'ls':
                this.cmdLs(args[0]);
                break;
            case 'cd':
                this.cmdCd(args[0]);
                break;
            case 'cat':
                this.cmdCat(args[0]);
                break;
            case 'pwd':
                this.printLine({ text: `/${this.cwd.join('/')}` });
                break;
            case 'whoami':
                this.printLine({ text: 'user' });
                break;
            case 'help':
            case 'man':
                this.printLines(HELP_TEXT);
                break;
            case 'clear':
                this.outputEl.innerHTML = '';
                break;
            case 'open':
                this.cmdOpen(args[0]);
                break;
            case 'tree':
                this.cmdTree(args[0]);
                break;
            case 'echo':
                this.printLine({ text: args.join(' ') });
                break;
            case 'date':
                this.printLine({ text: new Date().toString() });
                break;
            case 'uname':
                this.printLine({ text: 'CE-Linux 1.0 LTS (CE-Kernel 6.8.0-ce) x86_64' });
                break;
            case 'neofetch':
                this.cmdNeofetch();
                break;
            default:
                this.printLine({
                    text: `bash: ${cmd}: command not found`,
                    className: 'term-error',
                });
                this.printLine({
                    text: 'Type "help" for available commands.',
                    className: 'term-dim',
                });
        }
    }

    // ── ls ────────────────────────────────────
    private cmdLs(path?: string): void {
        const target = path
            ? resolvePath(this.root, this.cwd, path)
            : resolvePath(this.root, this.cwd, '.');

        if (!target.node) {
            this.printLine({ text: `ls: cannot access '${path}': No such file or directory`, className: 'term-error' });
            return;
        }

        if (target.node.type === 'file') {
            this.printLine({ text: target.node.name });
            return;
        }

        const entries = Array.from(target.node.children!.entries());
        if (entries.length === 0) {
            return; // empty dir, no output
        }

        // Format like real ls with colors
        const lines: TerminalOutput[] = [];
        const items = entries.map(([name, node]) => ({
            name,
            isDir: node.type === 'dir',
        }));

        // Sort: directories first, then files
        items.sort((a, b) => {
            if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        // Render as a single line for small dirs, multi-line for big
        if (items.length <= 5) {
            const formatted = items
                .map((i) => (i.isDir ? `<span class="term-dir">${i.name}/</span>` : `<span class="term-file">${i.name}</span>`))
                .join('  ');
            lines.push({ text: formatted });
        } else {
            for (const item of items) {
                const formatted = item.isDir
                    ? `<span class="term-dir">${item.name}/</span>`
                    : `<span class="term-file">${item.name}</span>`;
                lines.push({ text: formatted });
            }
        }

        this.printLines(lines, true);
    }

    // ── cd ────────────────────────────────────
    private cmdCd(path?: string): void {
        if (!path || path === '~' || path === '~/') {
            this.cwd = [];
            return;
        }

        const target = resolvePath(this.root, this.cwd, path);

        if (!target.node) {
            this.printLine({ text: `cd: no such file or directory: ${path}`, className: 'term-error' });
            return;
        }

        if (target.node.type !== 'dir') {
            this.printLine({ text: `cd: not a directory: ${path}`, className: 'term-error' });
            return;
        }

        this.cwd = target.absPath;
    }

    // ── cat ───────────────────────────────────
    private cmdCat(path?: string): void {
        if (!path) {
            this.printLine({ text: 'cat: missing operand', className: 'term-error' });
            return;
        }

        const target = resolvePath(this.root, this.cwd, path);

        if (!target.node) {
            this.printLine({ text: `cat: ${path}: No such file or directory`, className: 'term-error' });
            return;
        }

        if (target.node.type === 'dir') {
            this.printLine({ text: `cat: ${path}: Is a directory`, className: 'term-error' });
            return;
        }

        const lines = target.node.content!.split('\n').map((line) => ({ text: line }));
        this.printLines(lines);
    }

    // ── open ──────────────────────────────────
    private cmdOpen(target?: string): void {
        if (!target) {
            this.printLine({ text: 'open: missing project name', className: 'term-error' });
            this.printLine({ text: 'Usage: open <project-slug>', className: 'term-dim' });
            this.printLine({ text: 'Try: cd projects/ && ls', className: 'term-dim' });
            return;
        }

        // Check if it's a valid project
        const slug = slugify(target);
        const project = projects.find((p) => slugify(p.title) === slug);

        if (!project) {
            // Try partial match
            const matches = projects.filter((p) => slugify(p.title).includes(slug));
            if (matches.length === 1) {
                this.scrollToProject(matches[0].title);
                return;
            } else if (matches.length > 1) {
                this.printLine({ text: `open: ambiguous match for '${target}':`, className: 'term-error' });
                matches.forEach((m) => this.printLine({ text: `  ${slugify(m.title)}`, className: 'term-dim' }));
                return;
            }

            // Special sections
            if (['about', 'contact', 'home', 'projects'].includes(slug)) {
                const el = document.getElementById(slug);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    this.printLine({ text: `Navigating to ${slug}...`, className: 'term-dim' });
                }
                return;
            }

            this.printLine({ text: `open: project '${target}' not found`, className: 'term-error' });
            return;
        }

        this.scrollToProject(project.title);
    }

    private scrollToProject(title: string): void {
        const slug = slugify(title);
        const projectCards = document.querySelectorAll('.project-card');

        for (const card of projectCards) {
            const titlebar = card.querySelector('.project-card__titlebar-text');
            if (titlebar?.textContent?.includes(slug)) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Flash highlight
                card.classList.add('project-card--highlight');
                setTimeout(() => card.classList.remove('project-card--highlight'), 2000);
                this.printLine({ text: `Opening ${title}...`, className: 'term-dim' });
                return;
            }
        }

        // Fallback: scroll to projects section
        document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
        this.printLine({ text: `Navigating to projects section...`, className: 'term-dim' });
    }

    // ── tree ──────────────────────────────────
    private cmdTree(path?: string): void {
        const target = path
            ? resolvePath(this.root, this.cwd, path)
            : resolvePath(this.root, this.cwd, '.');

        if (!target.node) {
            this.printLine({ text: `tree: '${path}': No such file or directory`, className: 'term-error' });
            return;
        }

        if (target.node.type !== 'dir') {
            this.printLine({ text: target.node.name });
            return;
        }

        const lines: TerminalOutput[] = [];
        const dirName = path || formatCwd(this.cwd);
        lines.push({ text: `<span class="term-dir">${dirName}</span>` });
        this.buildTree(target.node, '', lines, 0);

        // Count
        let dirCount = 0;
        let fileCount = 0;
        const countNodes = (node: FSNode) => {
            if (node.type === 'dir' && node.children) {
                dirCount++;
                node.children.forEach((child) => countNodes(child));
            } else {
                fileCount++;
            }
        };
        target.node.children?.forEach((child) => countNodes(child));

        lines.push({ text: '' });
        lines.push({ text: `${dirCount} directories, ${fileCount} files`, className: 'term-dim' });

        this.printLines(lines, true);
    }

    private buildTree(node: FSNode, prefix: string, lines: TerminalOutput[], depth: number): void {
        if (depth > 3) return; // cap depth

        const entries = Array.from(node.children!.entries());
        entries.forEach(([, child], i) => {
            const isLast = i === entries.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            const childPrefix = isLast ? '    ' : '│   ';

            if (child.type === 'dir') {
                lines.push({ text: `${prefix}${connector}<span class="term-dir">${child.name}/</span>` });
                if (child.children && child.children.size > 0) {
                    this.buildTree(child, prefix + childPrefix, lines, depth + 1);
                }
            } else {
                lines.push({ text: `${prefix}${connector}<span class="term-file">${child.name}</span>` });
            }
        });
    }

    // ── neofetch ──────────────────────────────
    private cmdNeofetch(): void {
        const asciiArt = [
            '       ╔══╗       ',
            '    ╔══╝  ╚══╗    ',
            '  ╔═╝  CE  ╚═╗  ',
            '  ║  LINUX  ║  ',
            '  ╚═╗      ╔═╝  ',
            '    ╚══╗  ╔══╝    ',
            '       ╚══╝       ',
        ];

        const info = [
            `<span class="term-bright">user</span>@<span class="term-bright">ce-linux</span>`,
            '─────────────────',
            `<span class="term-dim">OS:</span>     CE-Linux 1.0 LTS`,
            `<span class="term-dim">Kernel:</span> 6.8.0-ce`,
            `<span class="term-dim">Shell:</span>  ce-bash 5.2`,
            `<span class="term-dim">CPU:</span>    RISC-V RV32I @ 200MHz`,
            `<span class="term-dim">Memory:</span> 256KB / 512KB`,
            `<span class="term-dim">Uptime:</span> ${Math.floor((Date.now() % 86400000) / 3600000)}h ${Math.floor((Date.now() % 3600000) / 60000)}m`,
        ];

        const lines: TerminalOutput[] = [];
        const maxLines = Math.max(asciiArt.length, info.length);

        for (let i = 0; i < maxLines; i++) {
            const art = asciiArt[i] || '                   ';
            const infoLine = info[i] || '';
            lines.push({ text: `<span class="term-bright">${art}</span>  ${infoLine}` });
        }

        this.printLines(lines, true);
    }

    // ── Tab autocomplete ─────────────────────
    private autocomplete(): void {
        const input = this.inputEl.value;
        const parts = input.split(/\s+/);

        if (parts.length <= 1) {
            // Command autocomplete
            const commands = ['ls', 'cd', 'cat', 'pwd', 'whoami', 'help', 'clear', 'open', 'tree', 'echo', 'date', 'uname', 'neofetch'];
            const matches = commands.filter((c) => c.startsWith(parts[0]));
            if (matches.length === 1) {
                this.inputEl.value = matches[0] + ' ';
            }
            return;
        }

        // Path autocomplete
        const partial = parts[parts.length - 1];
        const lastSlash = partial.lastIndexOf('/');
        let dirPath: string;
        let prefix: string;

        if (lastSlash >= 0) {
            dirPath = partial.slice(0, lastSlash) || '.';
            prefix = partial.slice(lastSlash + 1);
        } else {
            dirPath = '.';
            prefix = partial;
        }

        const target = resolvePath(this.root, this.cwd, dirPath);
        if (!target.node || target.node.type !== 'dir') return;

        const matches = Array.from(target.node.children!.entries())
            .filter(([name]) => name.startsWith(prefix))
            .map(([name, node]) => name + (node.type === 'dir' ? '/' : ''));

        if (matches.length === 1) {
            const completed = lastSlash >= 0
                ? partial.slice(0, lastSlash + 1) + matches[0]
                : matches[0];
            parts[parts.length - 1] = completed;
            this.inputEl.value = parts.join(' ');
        } else if (matches.length > 1) {
            // Show all matches
            this.printLine({ text: `${this.promptEl.textContent}${input}`, className: 'term-echo' });
            this.printLines(matches.map((m) => ({ text: `  ${m}`, className: 'term-dim' })));
        }
    }

    // ── Output ────────────────────────────────
    private printLine(output: TerminalOutput, isHtml = false): void {
        const line = document.createElement('div');
        line.className = `term__line ${output.className || ''}`;
        if (isHtml) {
            line.innerHTML = output.text;
        } else {
            // Check if the text contains HTML tags
            if (output.text.includes('<span')) {
                line.innerHTML = output.text;
            } else {
                line.textContent = output.text;
            }
        }
        this.outputEl.appendChild(line);
    }

    private printLines(outputs: TerminalOutput[], isHtml = false): void {
        outputs.forEach((o) => this.printLine(o, isHtml));
    }

    private scrollToBottom(): void {
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
}
