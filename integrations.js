// ============================================================
// integrations.js — 外部系统接入桩函数
// ------------------------------------------------------------
// 这是面试讲稿之一。本文件展示团队知识库与外部系统的所有接入点。
// 当前所有函数都是 mock 实现；接真实 API 时只需填充函数体。
// 设计原则：
//   1. 抽象成 connector 模式，便于切换厂商（飞书↔钉钉↔企微）
//   2. 所有 LLM 调用走统一 LLM 网关，便于切模型 / 加缓存 / 审计
//   3. 敏感数据（PII / 银行账号）在调 LLM 前必须过 sanitize 中间层
//   4. 所有函数都是 async，方便加 retry / circuit breaker
// ============================================================


// ============================================================
// 飞书集成（Lark / Feishu Open Platform）
// ============================================================
const Feishu = {

  /**
   * 同步飞书 Wiki 文档到本地 Markdown 仓库（定时任务用）
   * 真实实现：
   *   1. tenant_access_token = await getTenantAccessToken(appId, appSecret)
   *   2. nodes = GET /open-apis/wiki/v2/spaces/{spaceId}/nodes
   *   3. for each node: content = GET /open-apis/docx/v1/documents/{docId}/raw_content
   *   4. 写入 Markdown 文件 + frontmatter
   * 文档：https://open.feishu.cn/document/server-docs/docs/wiki-v2
   */
  async syncWiki({ spaceId }) {
    // TODO: 实现真实同步
    console.log('[Feishu.syncWiki] mock', { spaceId });
    return { synced: Object.keys(window.mockData.docs).length, lastSync: new Date().toISOString() };
  },

  /**
   * 推送富文本卡片到群机器人（用于推送月报、周报、告警）
   * 真实实现：POST /open-apis/im/v1/messages
   *   - msg_type: 'interactive'
   *   - card: 飞书 card schema
   * 文档：https://open.feishu.cn/document/server-docs/im-v1/message/create
   */
  async pushMessage({ chatId, card }) {
    // TODO: 调真实接口
    console.log('[Feishu.pushMessage] mock', { chatId, cardTitle: card?.header?.title?.content });
    return { ok: true, messageId: 'om_mock_' + Date.now() };
  },

  /**
   * 飞书 SSO（用户单点登录）
   * 真实实现：
   *   1. 前端拿到 code（飞书登录回调）
   *   2. 后端用 code 换 user_access_token
   *   3. 用 user_access_token 拉 user_info
   * 文档：https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/access_token/create
   */
  async sso({ code }) {
    // TODO: 实现真实 SSO
    console.log('[Feishu.sso] mock', { code });
    return { userId: 'ou_mock', name: '当前用户', dept: '财务部' };
  },

  /**
   * 读取飞书多维表格（Bitable）— 用作结构化数据源
   * 我们的"数据中心 KPI"在 MVP 阶段会先用多维表格承接
   * 文档：https://open.feishu.cn/document/server-docs/docs/bitable-v1
   */
  async fetchBitable({ appToken, tableId }) {
    // TODO: GET /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records
    console.log('[Feishu.fetchBitable] mock', { appToken, tableId });
    return window.mockData.kpis;
  },
};


// ============================================================
// 钉钉集成（备选 / 多 IM 共存场景）
// ============================================================
const Dingtalk = {

  /**
   * 推送 Markdown 消息到群机器人
   * 真实实现：POST https://oapi.dingtalk.com/robot/send?access_token=xxx
   * 文档：https://open.dingtalk.com/document/orgapp/custom-robot-access
   */
  async pushMessage({ webhookUrl, markdown }) {
    // TODO: 实现真实推送
    console.log('[Dingtalk.pushMessage] mock', { markdownTitle: markdown?.title });
    return { ok: true };
  },

  /**
   * 钉钉智能填表（OA 审批流）— 报销单同步
   */
  async submitForm({ processCode, formValues }) {
    // TODO: POST /topapi/processinstance/create
    console.log('[Dingtalk.submitForm] mock', { processCode });
    return { instanceId: 'di_mock_' + Date.now() };
  },
};


// ============================================================
// LLM / Claude 集成
// ============================================================
const LLM = {

  /**
   * RAG 问答：基于知识库回答
   * 真实实现：
   *   1. sanitized = sanitize(question)        ← 脱敏（去 PII / 银行账号）
   *   2. embedding = await this.embed({ text: sanitized })
   *   3. chunks = pgvector.search(embedding, topK)
   *   4. context = assemble(chunks)
   *   5. response = await Claude.messages.create({
   *        model: 'claude-opus-4-7',
   *        system: '你是财务团队助手。仅基于 <context> 回答。引用来源用 [doc_id]。',
   *        messages: [{ role: 'user', content: question }],
   *        // 用 prompt caching 缓存 system prompt
   *      })
   *   6. citations = extractCitations(response, chunks)
   *   7. logAudit({ user, question, answer, citations })
   *   8. return { answer, citations }
   */
  async chat({ question, topK = 5 }) {
    // TODO: 接 Claude API + pgvector
    console.log('[LLM.chat] mock', { question, topK });
    await sleep(700); // 模拟网络延迟
    return window.mockData.qa[question] || window.mockData.qa['__default__'];
  },

  /**
   * 文档向量化（建索引时用）
   * 真实实现：调 voyage-3-large / bge-m3 / openai text-embedding-3
   * 设计：每篇文档按 H2 章节切片，每片 ~500 token，重叠 50 token
   */
  async embed({ text }) {
    // TODO: 调 embedding 接口
    console.log('[LLM.embed] mock', { textLen: text?.length });
    return new Array(1536).fill(0); // mock 向量
  },

  /**
   * 调用一个 Skill（如生成月报、校验发票）
   * 真实实现：
   *   1. 加载 SKILL.md
   *   2. 解析 frontmatter（inputs / outputs / domain）
   *   3. 把 SKILL.md 作为 system prompt + inputs 作为 user message
   *   4. Claude API + tool_use（如果 skill 需要调外部工具）
   *   5. 验证输出 schema
   *   6. 记录调用日志（更新 calls 计数）
   */
  async runSkill({ name, inputs }) {
    // TODO: 实现真实 skill runtime
    console.log('[LLM.runSkill] mock', { name });

    // 月报 skill 走一段假进度，更直观
    if (name === 'monthly-report') {
      return window.mockData.reportApril;
    }
    return { ok: true, output: `[mock] skill "${name}" executed.` };
  },

  /**
   * 在线生成 Skill — 用户填表 → LLM 起草 SKILL.md
   * 真实实现：
   *   prompt: "你是一个 Skill 设计专家。根据下面的需求，生成一份符合标准的 SKILL.md..."
   *   inputs: { scenario, inputs, outputs, trigger }
   */
  async draftSkill({ scenario, inputs, outputs, trigger }) {
    // TODO: 接 Claude
    console.log('[LLM.draftSkill] mock', { scenario });
    await sleep(800);
    return window.mockData.draftedSkill
      .replace('<skill-name>', toSlug(scenario))
      .replace('<一句话描述>', scenario);
  },

  /**
   * 用户写文档时，LLM 帮助起草初稿（团队贡献入口的"AI 起草"按钮）
   * 真实实现：
   *   prompt: "你是财务团队的资深同事。根据 <type>（SOP/知识/项目/模板）的标准结构，
   *           围绕 <title> 起草一份初稿。结构要符合 Karpathy LLM Wiki 规范..."
   *   附带：相关已有文档（同 tag）作为风格参考
   */
  async draftDoc({ title, type }) {
    // TODO: 接 Claude
    console.log('[LLM.draftDoc] mock', { title, type });
    await sleep(900);
    const samples = {
      sop: `## 适用范围\n_本流程适用于 ${title} 涉及的所有场景_\n\n## 责任人\n- **提交人**：员工本人\n- **复核**：（待定）\n- **审批**：（待定）\n\n## 流程步骤\n\n| # | 步骤 | 负责人 | 输入 | 输出 |\n|---|------|--------|------|------|\n| 1 | （步骤 1） | | | |\n| 2 | （步骤 2） | | | |\n\n## SLA\n- 提交后 X 个工作日内完成\n\n## 异常处理\n- _LLM 起草占位：请贡献者完善_\n\n## 常见误区\n1. _LLM 起草占位_`,
      knowledge: `## 政策依据\n_关于 ${title} 的政策依据：（请补充法规文号、生效时间）_\n\n## 我们的实务处理\n（结合公司情况展开）\n\n## 操作流程\n\n| 阶段 | 工作 | 责任人 |\n|------|------|--------|\n| 立项 | | |\n| 执行 | | |\n| 复核 | | |\n\n## 关键风险点\n1. \n2. \n\n## 历史案例\n_LLM 起草占位：请补充曾经踩过的坑或税局问询案例_`,
      project: `## 概览\n- **项目名**：${title}\n- **金额/规模**：\n- **时间窗口**：\n- **关键干系人**：\n\n## 时间线\n\n| 日期 | 里程碑 |\n|------|--------|\n| | 启动 |\n| | 关键节点 |\n| | 收尾 |\n\n## 关键文件清单\n1. \n2. \n\n## 财务工作要点\n- [ ] \n- [ ] \n\n## 复盘\n- **做得好的**：\n- **可改进**：\n- **数据**：`,
      template: `## 适用场景\n_${title} 适用于以下场景：_\n\n## 关键填写指引\n1. \n2. \n\n## 模板内容\n\n\`\`\`\n（粘贴模板正文）\n\`\`\`\n\n## 注意事项\n- `,
    };
    return samples[type] || samples.knowledge;
  },

  /**
   * 把 AI 助手对话保存为知识——双向流转
   * 真实实现：把 question + answer + citations 整理成一篇 markdown 知识文档
   */
  async dialogToKnowledge({ question, answer }) {
    console.log('[LLM.dialogToKnowledge] mock');
    await sleep(400);
    return `## 来自团队 AI 对话的整理\n\n_由对话自动生成，请贡献者审阅后发布_\n\n### 原问题\n> ${question}\n\n### 回答\n${answer}\n\n### 待补充\n- [ ] 补充政策依据 / 文号\n- [ ] 补充案例\n- [ ] 关联到现有文档`;
  },
};

// ============================================================
// 文件上传 / OCR / 自动归档
// ============================================================
const FileIngest = {

  /**
   * 上传财务相关文件（合同 PDF、报表 Excel、凭证图片）
   * 真实实现链路：
   *   1. 文件存对象存储（OSS / S3 / MinIO）
   *   2. 调 OCR / 解析（textract / aliyun OCR / 自部署 layoutlmv3）
   *   3. 调 LLM.classifyDoc 自动归类到八大模块某一个
   *   4. 抽取 frontmatter（标题 / 标签 / 关联文档）
   *   5. 入库 + 异步建索引
   *   6. 通知贡献者审阅
   */
  async upload({ file }) {
    // TODO: 实现真实上传管道
    console.log('[FileIngest.upload] mock', { name: file?.name });
    await sleep(800);
    // mock 自动归类逻辑
    const name = (file?.name || '').toLowerCase();
    let module = 'templates';
    if (/合同|contract/.test(name)) module = 'templates';
    else if (/月报|周报|report/.test(name)) module = 'reports';
    else if (/凭证|发票|invoice/.test(name)) module = 'operations';
    else if (/融资|spa|sha|safe/.test(name)) module = 'projects';
    return {
      ok: true,
      ocrText: '[mock OCR 文本]',
      classifiedModule: module,
      suggestedTags: ['自动识别', '待审阅'],
    };
  },
};


// ============================================================
// 数据源（ERP / 数据仓库 / 银行 / 多维表格）
// ============================================================
const DataSources = {

  /**
   * 拉取关键 KPI（数据中心 + 月报用）
   * 真实实现：
   *   - 优先级 1：数据仓库（dbt + ClickHouse）的预计算表
   *   - 备选：金蝶 ERP API + 飞书多维表格
   *   - 缓存：Redis，TTL = 1 小时（月度数据 T+5 后才稳定）
   */
  async fetchKPIs({ period }) {
    // TODO: 接数据仓库
    console.log('[DataSources.fetchKPIs] mock', { period });
    return window.mockData.kpis;
  },

  /**
   * 网银流水拉取（银行对账 skill 用）
   * 真实实现：
   *   - 招行：CMB Cloud API
   *   - 浦发、中行：直连接口或网银导出文件
   *   - 通用：用 RPA 兜底
   */
  async fetchBankFlow({ bank, account, dateRange }) {
    // TODO: 接银行接口
    console.log('[DataSources.fetchBankFlow] mock', { bank, account });
    return [];
  },

  /**
   * 金蝶 ERP 凭证 / 账务数据
   */
  async fetchKingdee({ entity, period }) {
    // TODO: 调金蝶 K3 / 云星空 API
    console.log('[DataSources.fetchKingdee] mock', { entity, period });
    return [];
  },
};


// ============================================================
// 数据安全 — 调 LLM 前的脱敏中间层
// ============================================================
const Sanitizer = {

  /**
   * 把财务文本中的敏感信息打码
   * 真实实现：正则 + NER 模型双重保险
   *   - 银行账号、身份证号、手机号 → 打码
   *   - 员工真实姓名 → 替换为代号（保留映射表，回填时还原）
   *   - 客户保密协议中的金额 → 视等级打码
   */
  redact(text) {
    // TODO: 实现真实脱敏
    return text
      .replace(/\b\d{16,19}\b/g, '****-****-****-****')      // 银行卡
      .replace(/\b1[3-9]\d{9}\b/g, '1**-****-****')           // 手机号
      .replace(/\b\d{17}[\dXx]\b/g, '***-身份证-***');        // 身份证
  },
};


// ============================================================
// 审计日志 — 所有读写、LLM 调用必须留痕
// ============================================================
const Audit = {

  /**
   * 真实实现：写入独立的审计库（不与业务库混）+ append-only
   * 字段：timestamp / user / action / resource / before / after / llm_meta
   */
  log(event) {
    // TODO: 落库
    console.log('[Audit]', event);
  },
};


// ============================================================
// 工具函数
// ============================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toSlug(s) {
  return (s || 'new-skill').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'new-skill';
}


// 暴露到全局
window.Feishu = Feishu;
window.Dingtalk = Dingtalk;
window.LLM = LLM;
window.DataSources = DataSources;
window.Sanitizer = Sanitizer;
window.Audit = Audit;
window.FileIngest = FileIngest;
