# AI Content Pipeline 🚀

> Multi-Agent AI Content Generation System — Built for Hackathon 2026

## 🎯 What It Does

Enter a topic → **4 AI Agents** work sequentially to produce a full content package:

| Agent | Role |
|-------|------|
| 🔍 **Research Agent** | Analyzes topic, gathers key insights, trends & data points |
| ✍️ **Blog Writer Agent** | Crafts an engaging, structured blog post from research |
| 📱 **Social Media Agent** | Creates Twitter thread, LinkedIn post & Instagram caption |
| 📊 **SEO Optimizer Agent** | Generates meta tags, keywords & readability analysis |

## ✅ Hackathon Skills Covered

| Skill | How It's Applied |
|-------|-----------------|
| **Generative AI** | Each agent uses Gemini API to generate content |
| **AI Workflows** | Sequential pipeline: Topic → Research → Blog → Social → SEO |
| **Multi-Agent Systems** | 4 distinct AI agents with specialized roles and prompts |
| **Business Process Automation** | Automates the entire content marketing workflow |

## 🛠️ Tech Stack

- **Frontend**: HTML5 + Vanilla CSS + JavaScript (no frameworks)
- **AI**: Google Gemini API (gemini-2.0-flash)
- **Design**: Glassmorphism + Dark Theme + Micro-animations
- **Deployment**: Static site — deploy anywhere (Netlify, Vercel, GitHub Pages)

## 🚀 How to Run

1. Open `index.html` in your browser
2. Enter your Gemini API key (get one free at [Google AI Studio](https://aistudio.google.com/apikey))
3. Type a topic
4. Click **Generate Content** and watch the agents work!

## 📁 Project Structure

```
ai-content-pipeline/
├── index.html          → Main app page
├── css/
│   └── style.css       → Premium dark theme
├── js/
│   ├── gemini.js       → Gemini API wrapper
│   ├── agents.js       → 4 AI agent definitions + pipeline
│   └── app.js          → UI controller & rendering
└── README.md           → This file
```

## 🌐 Deployment

This is a static site — just upload the folder to any hosting:

- **Netlify**: Drag & drop the folder
- **Vercel**: Import from GitHub
- **GitHub Pages**: Push to repo → enable Pages

No build step needed! No npm, no Node.js, no server.

---

Built with ⚡ by Hackathon Team | 2026
