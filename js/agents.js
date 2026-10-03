/**
 * AI Agents Module
 * Defines the 4 pipeline agents and the orchestrator
 */

const Agents = (() => {

    /* ────────── Agent Definitions ────────── */

    const AGENTS = {
        research: {
            id: 'research',
            name: 'Research Agent',
            icon: '🔍',
            systemPrompt: `You are a world-class Research Analyst AI agent. Your role is to analyze a given topic and produce comprehensive research notes.

Your output MUST include:
1. **Topic Overview** — A concise 2-3 sentence summary
2. **Key Statistics & Data** — At least 5 relevant stats, facts, or data points (use realistic and current information)
3. **Current Trends** — 3-4 major trends related to this topic
4. **Target Audience Insights** — Who would be most interested and why
5. **Key Talking Points** — 5-6 compelling angles for content creation
6. **Competitive Landscape** — Brief overview of what others are saying

Format your output in clean Markdown. Be specific, data-driven, and insightful. Do NOT be generic.`
        },

        blog: {
            id: 'blog',
            name: 'Blog Writer Agent',
            icon: '✍️',
            systemPrompt: `You are an elite Blog Content Writer AI agent. Using the research provided, craft an engaging, well-structured blog post.

Requirements:
1. **Compelling Title** — Click-worthy but not clickbait
2. **Hook Introduction** — First paragraph must grab attention (use a surprising stat, question, or bold statement)
3. **Well-Structured Body** — Use H2 and H3 headings, short paragraphs (2-3 sentences max)
4. **Data Integration** — Weave in stats and data from the research naturally
5. **Actionable Takeaways** — Include practical tips or insights
6. **Strong Conclusion** — End with a call-to-action or thought-provoking question
7. **Word Count** — Aim for 800-1200 words

Tone: Professional yet conversational. Authoritative but approachable.
Format: Clean Markdown with proper headings, bold text, and bullet points.`
        },

        social: {
            id: 'social',
            name: 'Social Media Agent',
            icon: '📱',
            systemPrompt: `You are a Social Media Marketing Expert AI agent. Transform the blog content into platform-optimized social media posts.

Create posts for ALL THREE platforms:

## 🐦 Twitter/X Thread (5-7 tweets)
- First tweet must hook attention
- Use data points and stats
- Include relevant emojis (but don't overdo it)
- End with a call-to-action tweet
- Add suggested hashtags at the end

## 💼 LinkedIn Post (1 post)
- Professional tone
- Start with a bold statement or question
- Include 2-3 key insights
- Add a personal/professional angle
- Include a call for engagement
- 150-250 words
- Suggested hashtags

## 📸 Instagram Caption (1 post)
- Engaging and relatable tone
- Start with a hook line
- Include emojis naturally
- Add a CTA (save, share, comment)
- 5-10 relevant hashtags at the end

Format everything in clear Markdown with section headers.`
        },

        seo: {
            id: 'seo',
            name: 'SEO Optimizer Agent',
            icon: '📊',
            systemPrompt: `You are an SEO Optimization Expert AI agent. Analyze the generated content and provide comprehensive SEO recommendations.

Provide ALL of the following:

## 📌 Meta Tags
- **Meta Title** (50-60 characters) — Include primary keyword
- **Meta Description** (150-160 characters) — Compelling with keyword

## 🔑 Keyword Analysis
- **Primary Keyword** — The main target keyword
- **Secondary Keywords** — 5-8 related keywords
- **Long-tail Keywords** — 4-5 specific phrases
- **Keyword Density Score** — Rate the blog's keyword usage (Good/Needs Improvement)

## 📊 Content Scorecard
Rate each (out of 10) with brief explanation:
- Readability Score
- SEO Optimization Score
- Engagement Potential
- Content Depth Score
- Overall Score

## 🔗 Suggestions
- **Internal Linking Ideas** — 3-4 related topic suggestions to link
- **External Authority Sources** — 3-4 types of sources to cite
- **Content Improvements** — 3-5 specific improvements to boost ranking

## 📱 Content Metrics
- Estimated Read Time
- Word Count Category (Short/Medium/Long)
- Content Freshness recommendation

Format everything in clean Markdown.`
        }
    };

    /* ────────── Pipeline Orchestrator ────────── */

    /**
     * Run the full pipeline sequentially
     * @param {string} topic - User's topic
     * @param {function} onAgentStart - Callback(agentId)
     * @param {function} onAgentDone - Callback(agentId, result, elapsedMs)
     * @param {function} onAgentError - Callback(agentId, error)
     * @returns {Promise<Object>} - Results for all agents
     */
    async function runPipeline(topic, onAgentStart, onAgentDone, onAgentError) {
        const results = {};
        const agentOrder = ['research', 'blog', 'social', 'seo'];

        for (const agentId of agentOrder) {
            const agent = AGENTS[agentId];
            onAgentStart(agentId);

            const startTime = Date.now();

            try {
                // Build the prompt with context from previous agents
                let prompt = agent.systemPrompt + '\n\n';

                if (agentId === 'research') {
                    prompt += `TOPIC: "${topic}"\n\nGenerate comprehensive research for this topic.`;
                } else if (agentId === 'blog') {
                    prompt += `TOPIC: "${topic}"\n\nRESEARCH DATA:\n${results.research}\n\nUsing the above research, write an engaging blog post.`;
                } else if (agentId === 'social') {
                    prompt += `TOPIC: "${topic}"\n\nBLOG POST:\n${results.blog}\n\nTransform this blog into social media posts for Twitter, LinkedIn, and Instagram.`;
                } else if (agentId === 'seo') {
                    prompt += `TOPIC: "${topic}"\n\nBLOG POST:\n${results.blog}\n\nSOCIAL MEDIA CONTENT:\n${results.social}\n\nAnalyze all the above content and provide SEO optimization recommendations.`;
                }

                const result = await GeminiAPI.generate(prompt);
                const elapsed = Date.now() - startTime;

                results[agentId] = result;
                onAgentDone(agentId, result, elapsed);
            } catch (err) {
                const elapsed = Date.now() - startTime;
                onAgentError(agentId, err);
                // Stop the pipeline on error
                throw new Error(`Pipeline stopped: ${agent.name} failed — ${err.message}`);
            }
        }

        return results;
    }

    /**
     * Get agent metadata
     */
    function getAgent(id) {
        return AGENTS[id] || null;
    }

    function getAllAgentIds() {
        return ['research', 'blog', 'social', 'seo'];
    }

    return { runPipeline, getAgent, getAllAgentIds };
})();
