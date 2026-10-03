/**
 * Main Application Controller
 * Handles UI interactions, pipeline execution, and output rendering
 */

(function () {
    'use strict';

    /* ────────── DOM REFERENCES ────────── */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        topicInput:    $('#topicInput'),
        generateBtn:   $('#generateBtn'),
        statusHint:    $('#statusHint'),
        progressBar:   $('#progressBar'),
        outputSection: $('#outputSection'),
        copyAllBtn:    $('#copyAllBtn'),
        downloadBtn:   $('#downloadBtn'),
        resetBtn:      $('#resetBtn'),
        toast:         $('#toast'),
    };

    /* ────────── STATE ────────── */
    let isRunning = false;
    let pipelineResults = {};

    /* ────────── INIT ────────── */
    function init() {
        // Event listeners
        dom.topicInput.addEventListener('input', onInputChange);
        dom.topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !dom.generateBtn.disabled) startPipeline();
        });
        dom.generateBtn.addEventListener('click', startPipeline);
        dom.copyAllBtn.addEventListener('click', copyAllContent);
        dom.downloadBtn.addEventListener('click', downloadContent);
        dom.resetBtn.addEventListener('click', resetPipeline);

        // Tab navigation
        $$('.tab').forEach((tab) => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        onInputChange();
    }

    /* ────────── INPUT HANDLING ────────── */
    function onInputChange() {
        const hasTopic = dom.topicInput.value.trim().length > 2;

        dom.generateBtn.disabled = !hasTopic || isRunning;

        if (!hasTopic) {
            setHint('Enter a topic to generate content. 🚀', '');
        } else {
            setHint('Ready! Click "Generate Content" to start the pipeline. 🚀', 'success');
        }
    }

    /* ────────── PIPELINE EXECUTION ────────── */
    async function startPipeline() {
        if (isRunning) return;

        const topic = dom.topicInput.value.trim();
        if (!topic) return;

        isRunning = true;
        pipelineResults = {};
        dom.generateBtn.disabled = true;
        dom.generateBtn.classList.add('loading');
        dom.progressBar.style.width = '0%';

        // Reset all agents
        resetAgentCards();
        hideOutput();

        setHint('🚀 Pipeline started! Agents are processing your content...', 'success');

        try {
            setHint('🚀 Pipeline started! Agents are processing your content... (auto-retries on high demand)', 'success');
            const results = await Agents.runPipeline(
                topic,
                onAgentStart,
                onAgentDone,
                onAgentError
            );

            pipelineResults = results;
            dom.progressBar.style.width = '100%';
            setHint('✅ Pipeline complete! All 4 agents finished successfully.', 'success');
            showToast('🎉 Content pipeline complete!');
            showOutput();
        } catch (err) {
            setHint(`❌ ${err.message}`, 'error');
            showToast(err.message, true);
            // Still show any partial results
            if (Object.keys(pipelineResults).length > 0) {
                showOutput();
            }
        } finally {
            isRunning = false;
            dom.generateBtn.disabled = false;
            dom.generateBtn.classList.remove('loading');
        }
    }

    /* ────────── AGENT CALLBACKS ────────── */
    const agentTimers = {};

    function onAgentStart(agentId) {
        const card = $(`#agent-${agentId}`);
        if (!card) return;

        card.dataset.status = 'running';
        card.querySelector('.agent-status-label').textContent = 'Processing...';

        // Start timer
        const startTime = Date.now();
        agentTimers[agentId] = setInterval(() => {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const timerEl = $(`#timer-${agentId}`);
            if (timerEl) timerEl.textContent = `${elapsed}s`;
        }, 100);

        // Update progress bar
        const agentIds = Agents.getAllAgentIds();
        const idx = agentIds.indexOf(agentId);
        dom.progressBar.style.width = `${((idx) / agentIds.length) * 100}%`;

        // Activate connector before this agent
        activateConnector(idx);

        setHint(`🔄 ${Agents.getAgent(agentId).name} is working...`, 'success');
    }

    function onAgentDone(agentId, result, elapsedMs) {
        clearInterval(agentTimers[agentId]);

        const card = $(`#agent-${agentId}`);
        if (!card) return;

        card.dataset.status = 'done';
        card.querySelector('.agent-status-label').textContent = '✓ Complete';
        const timerEl = $(`#timer-${agentId}`);
        if (timerEl) timerEl.textContent = `${(elapsedMs / 1000).toFixed(1)}s`;

        // Store result
        pipelineResults[agentId] = result;

        // Render output
        const outputEl = $(`#output-${agentId}`);
        if (outputEl) {
            outputEl.innerHTML = markdownToHTML(result);
        }

        // Mark tab as having content
        const tab = $(`.tab[data-tab="${agentId}"]`);
        if (tab) tab.classList.add('has-content');

        // Update progress
        const agentIds = Agents.getAllAgentIds();
        const idx = agentIds.indexOf(agentId);
        dom.progressBar.style.width = `${((idx + 1) / agentIds.length) * 100}%`;
    }

    function onAgentError(agentId, error) {
        clearInterval(agentTimers[agentId]);

        const card = $(`#agent-${agentId}`);
        if (!card) return;

        card.dataset.status = 'error';
        card.querySelector('.agent-status-label').textContent = '✗ Error';

        const outputEl = $(`#output-${agentId}`);
        if (outputEl) {
            outputEl.innerHTML = `<div class="placeholder-msg" style="color: var(--accent-pink);">❌ Error: ${escapeHTML(error.message)}</div>`;
        }
    }

    /* ────────── CONNECTOR ANIMATION ────────── */
    function activateConnector(agentIndex) {
        const connectors = $$('.pipeline-connector');
        if (agentIndex > 0 && connectors[agentIndex - 1]) {
            const fill = connectors[agentIndex - 1].querySelector('.connector-fill');
            if (fill) fill.classList.add('active');
        }
    }

    /* ────────── UI HELPERS ────────── */
    function resetAgentCards() {
        Agents.getAllAgentIds().forEach((id) => {
            const card = $(`#agent-${id}`);
            if (card) {
                card.dataset.status = 'idle';
                card.querySelector('.agent-status-label').textContent = 'Waiting...';
                const timerEl = $(`#timer-${id}`);
                if (timerEl) timerEl.textContent = '';
            }

            const outputEl = $(`#output-${id}`);
            if (outputEl) {
                outputEl.innerHTML = '<div class="placeholder-msg">Waiting for agent...</div>';
            }

            const tab = $(`.tab[data-tab="${id}"]`);
            if (tab) tab.classList.remove('has-content');
        });

        // Reset connectors
        $$('.connector-fill').forEach((f) => f.classList.remove('active'));
    }

    function showOutput() {
        dom.outputSection.classList.add('visible');
        // Switch to the first tab that has content
        const firstDone = Agents.getAllAgentIds().find((id) => pipelineResults[id]);
        if (firstDone) switchTab(firstDone);

        // Scroll into view smoothly
        setTimeout(() => {
            dom.outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    function hideOutput() {
        dom.outputSection.classList.remove('visible');
    }

    function switchTab(tabId) {
        $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
        $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${tabId}`));
    }

    function setHint(text, type) {
        dom.statusHint.textContent = text;
        dom.statusHint.className = 'hint' + (type ? ` ${type}` : '');
    }

    function showToast(message, isError = false) {
        dom.toast.textContent = message;
        dom.toast.className = 'toast visible' + (isError ? ' error' : '');
        setTimeout(() => {
            dom.toast.classList.remove('visible');
        }, 3500);
    }

    function resetPipeline() {
        pipelineResults = {};
        dom.topicInput.value = '';
        dom.progressBar.style.width = '0%';
        resetAgentCards();
        hideOutput();
        onInputChange();
        showToast('🔄 Reset! Enter a new topic.');
    }

    /* ────────── COPY & DOWNLOAD ────────── */
    function copyAllContent() {
        const allText = buildAllText();
        navigator.clipboard.writeText(allText).then(() => {
            showToast('📋 All content copied to clipboard!');
        }).catch(() => {
            showToast('❌ Failed to copy. Try downloading instead.', true);
        });
    }

    function downloadContent() {
        const allText = buildAllText();
        const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const topicSlug = dom.topicInput.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        a.download = `content-pipeline-${topicSlug || 'output'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('⬇️ Content downloaded!');
    }

    function buildAllText() {
        const sections = [];
        const topic = dom.topicInput.value.trim();

        sections.push(`AI CONTENT PIPELINE — Generated Output`);
        sections.push(`Topic: ${topic}`);
        sections.push(`Date: ${new Date().toLocaleString()}`);
        sections.push('='.repeat(60));

        Agents.getAllAgentIds().forEach((id) => {
            const agent = Agents.getAgent(id);
            sections.push('');
            sections.push(`${'─'.repeat(50)}`);
            sections.push(`${agent.icon} ${agent.name.toUpperCase()}`);
            sections.push(`${'─'.repeat(50)}`);
            sections.push(pipelineResults[id] || '(No output)');
        });

        return sections.join('\n');
    }

    /* ────────── MARKDOWN → HTML ────────── */
    function markdownToHTML(md) {
        if (!md) return '';

        let html = escapeHTML(md);

        // Code blocks (``` ... ```)
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headings
        html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Bold & italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Blockquote
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // Horizontal rule
        html = html.replace(/^---+$/gm, '<hr>');

        // Unordered lists
        html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');

        // Ordered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Wrap consecutive <li> in <ul>
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Paragraphs: wrap non-tag lines
        html = html.split('\n').map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<')) return line;
            return `<p>${line}</p>`;
        }).join('\n');

        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');

        return html;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ────────── BOOT ────────── */
    document.addEventListener('DOMContentLoaded', init);
})();
