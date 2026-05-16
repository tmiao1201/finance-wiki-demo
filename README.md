# 财务团队共享知识库 · 概念展示 Demo

> 一个为初创企业财务团队设计的"知识库 + 自动化中枢 + Skills 工坊"产品概念。本仓库是面试展示用的可点击 demo，**不是生产系统**。

## 怎么打开

**方式一（推荐）**：在 Finder 双击 `index.html`，浏览器自动打开。

**方式二**：终端里：
```bash
open /Users/tedmiao/finance-wiki-demo/index.html
```

零依赖、零构建。所有 CDN 资源浏览器联网即可加载。

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 单页应用主体（三栏布局 + Alpine.js） |
| `data.js` | 所有 mock 数据（文档、Skills、问答、报告） |
| `integrations.js` | 飞书 / 钉钉 / Claude / ERP 接入桩函数（**面试讲稿之一**） |
| `ARCHITECTURE.md` | 中文设计思路文档（**面试讲稿之二**） |

## 技术栈

- HTML 单文件（`file://` 协议双击可开）
- Tailwind CSS（CDN）
- Alpine.js（CDN，单文件 SPA 利器）
- marked.js（CDN，渲染 Markdown 文档）
- ECharts（CDN，数据中心仪表盘）

## 看点导览（建议演示顺序）

1. **首屏**：团队主页，整体定调
2. **左侧目录**：八大模块信息架构（参考飞书 Wiki + Karpathy LLM Wiki）
3. **02 知识沉淀**：点开任一文档 → 看 frontmatter（标题/作者/标签/关联文档）→ 右侧 AI 问答试试预置问题
4. **06 报告中心**：点"生成 4 月经营月报" → 看进度条 → 出完整月报 → 点"推送到飞书"
5. **07 Skills 工坊**：浏览 skill 卡片 → 点击查看 SKILL.md → 试试"在线生成 Skill"
6. **integrations.js**：编辑器打开此文件，给面试官看接入层设计

## 演进路线（详见 ARCHITECTURE.md）

- **M1（2 周）**：搭骨架 + 文档模板 + frontmatter 规范
- **M2（1 月）**：飞书 → Git 同步 + 向量库 + RAG 问答
- **M3（2 月）**：周报 / 月报自动生成 + 飞书推送
- **M4（3 月）**：Skills 工坊上线 + 团队贡献流程
- **M5（按需）**：自建 Web，深度定制
