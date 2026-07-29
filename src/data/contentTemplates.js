import { generateId } from '../utils/helpers.js';

export const contentTemplateFormats = {
  WORD: 'word',
  TABLE: 'table',
  EMAIL: 'email',
  LIST: 'list',
  STEPS: 'steps',
};

export const formatLabels = {
  word: { label: '文档', icon: 'fa-file-lines', color: '#334155' },
  table: { label: '表格', icon: 'fa-table-cells', color: '#059669' },
  email: { label: '邮件', icon: 'fa-envelope', color: '#2563eb' },
  list: { label: '清单', icon: 'fa-list-check', color: '#0ea5e9' },
  steps: { label: '流程', icon: 'fa-list-ol', color: '#ea580c' },
};

export const sceneCategories = [
  { id: 'all', name: '全部', icon: 'fa-layer-group' },
  { id: 'featured', name: '精选', icon: 'fa-star' },
  { id: 'project', name: '项目管理', icon: 'fa-briefcase' },
  { id: 'sales', name: '销售运营', icon: 'fa-chart-line' },
  { id: 'marketing', name: '市场营销', icon: 'fa-bullhorn' },
  { id: 'hr', name: '人力资源', icon: 'fa-users' },
  { id: 'product', name: '产品研发', icon: 'fa-lightbulb' },
  { id: 'office', name: '日常办公', icon: 'fa-clipboard-list' },
  { id: 'strategy', name: '战略规划', icon: 'fa-chess' },
  { id: 'personal', name: '个人效率', icon: 'fa-user-gear' },
];

export const sceneCategoryColors = {
  featured: '#f59e0b',
  project: '#3b82f6',
  sales: '#10b981',
  marketing: '#14b8a6',
  hr: '#f43f5e',
  product: '#f97316',
  office: '#06b6d4',
  strategy: '#0ea5e9',
  personal: '#84cc16',
};

function makeSections(titles) {
  return titles.map((t, i) => ({
    title: typeof t === 'string' ? t : t.title,
    level: 1,
    guide: typeof t === 'string' ? '' : t.guide || '',
  }));
}

export const defaultContentTemplates = [
  {
    id: 'ct_project_retro',
    name: '项目复盘报告',
    description: '标准项目复盘结构，目标回顾、成果展示、问题分析、经验总结',
    format: 'word',
    category: ['project'],
    tags: ['复盘', '总结', '项目'],
    level: 'official',
    featured: true,
    themeColor: '#3b82f6',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        '一、项目背景与目标',
        '二、项目成果回顾',
        '三、关键里程碑',
        '四、问题与挑战分析',
        '五、经验与方法论',
        '六、后续改进计划',
      ]),
    },
    usedCount: 1256,
    createdAt: '2026-05-01',
  },
  {
    id: 'ct_weekly_report',
    name: '工作周报',
    description: '通用周报模板，本周完成、下周计划、问题与协助',
    format: 'word',
    category: ['office', 'personal'],
    tags: ['周报', '汇报', '个人'],
    level: 'official',
    featured: true,
    themeColor: '#06b6d4',
    style: { tone: 'concise', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '一、本周工作完成', guide: '列出本周完成的主要工作事项和成果' },
        { title: '二、进行中事项', guide: '正在推进中的工作进展' },
        { title: '三、下周工作计划', guide: '下周重点工作和目标' },
        { title: '四、问题与需协助事项', guide: '遇到的问题及需要的支持' },
        { title: '五、心得与思考', guide: '本周工作心得和思考' },
      ]),
    },
    usedCount: 3428,
    createdAt: '2026-04-15',
  },
  {
    id: 'ct_meeting_minutes',
    name: '会议纪要',
    description: '标准会议纪要，议题、讨论要点、行动项清晰记录',
    format: 'word',
    category: ['office'],
    tags: ['会议', '纪要', '行动项'],
    level: 'official',
    featured: true,
    themeColor: '#06b6d4',
    style: { tone: 'concise', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '会议基本信息', guide: '时间、地点、参会人员' },
        { title: '会议议题', guide: '本次会议的主要议题' },
        { title: '讨论要点', guide: '会议讨论的核心内容和结论' },
        { title: '行动项', guide: '责任人、截止时间、具体任务' },
        { title: '下次会议安排', guide: '下次会议时间和议题预告' },
      ]),
    },
    usedCount: 2876,
    createdAt: '2026-04-10',
  },
  {
    id: 'ct_sales_proposal',
    name: '销售解决方案',
    description: '专业解决方案模板，背景-痛点-方案-价值四段式',
    format: 'word',
    category: ['sales'],
    tags: ['方案', '销售', '客户'],
    level: 'official',
    featured: true,
    themeColor: '#10b981',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        { title: '一、客户背景分析', guide: '客户行业、规模、业务现状' },
        { title: '二、痛点与挑战', guide: '客户面临的核心问题和痛点' },
        { title: '三、解决方案', guide: '我们的解决方案和核心能力' },
        { title: '四、产品功能亮点', guide: '重点功能和差异化优势' },
        { title: '五、客户价值', guide: '为客户带来的业务价值' },
        { title: '六、实施与服务', guide: '实施方案和服务保障' },
        { title: '七、成功案例', guide: '类似客户的成功案例' },
      ]),
    },
    usedCount: 892,
    createdAt: '2026-05-10',
  },
  {
    id: 'ct_okr_template',
    name: 'OKR 目标管理',
    description: 'OKR 目标与关键结果设定模板',
    format: 'word',
    category: ['strategy', 'personal'],
    tags: ['OKR', '目标', '管理'],
    level: 'official',
    featured: true,
    themeColor: '#f59e0b',
    style: { tone: 'professional', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '周期目标（Objective）', guide: '本周期的核心目标，要有挑战性' },
        { title: '关键结果 1（KR1）', guide: '衡量目标达成的关键结果' },
        { title: '关键结果 2（KR2）', guide: '衡量目标达成的关键结果' },
        { title: '关键结果 3（KR3）', guide: '衡量目标达成的关键结果' },
        { title: '执行计划', guide: '实现 OKR 的具体行动计划' },
        { title: '资源与支持', guide: '需要的资源和支持' },
      ]),
    },
    usedCount: 678,
    createdAt: '2026-05-20',
  },
  {
    id: 'ct_swot_analysis',
    name: 'SWOT 分析',
    description: '经典战略分析工具，优势、劣势、机会、威胁',
    format: 'word',
    category: ['strategy'],
    tags: ['SWOT', '分析', '战略'],
    level: 'official',
    themeColor: '#0ea5e9',
    style: { tone: 'professional', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '一、分析背景', guide: '本次 SWOT 分析的背景和目的' },
        { title: '二、优势 (Strengths)', guide: '内部优势和核心竞争力' },
        { title: '三、劣势 (Weaknesses)', guide: '内部劣势和待改进之处' },
        { title: '四、机会 (Opportunities)', guide: '外部机会和发展空间' },
        { title: '五、威胁 (Threats)', guide: '外部威胁和风险因素' },
        { title: '六、战略建议', guide: '基于分析的战略行动建议' },
      ]),
    },
    usedCount: 543,
    createdAt: '2026-04-25',
  },
  {
    id: 'ct_kickoff_meeting',
    name: '项目启动会材料',
    description: '项目启动会完整材料，背景、目标、计划、分工',
    format: 'word',
    category: ['project'],
    tags: ['启动会', '项目', 'kickoff'],
    level: 'official',
    themeColor: '#3b82f6',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        { title: '一、项目背景', guide: '为什么做这个项目' },
        { title: '二、项目目标', guide: '项目要达成的目标和衡量标准' },
        { title: '三、项目范围', guide: '包含什么、不包含什么' },
        { title: '四、实施计划', guide: '整体里程碑和时间节点' },
        { title: '五、团队分工', guide: '各角色职责和分工' },
        { title: '六、沟通机制', guide: '例会、汇报、决策机制' },
        { title: '七、风险与应对', guide: '主要风险和应对措施' },
      ]),
    },
    usedCount: 421,
    createdAt: '2026-05-05',
  },
  {
    id: 'ct_product_prd',
    name: '产品需求文档 (PRD)',
    description: '标准产品需求文档，背景、目标、功能、交互',
    format: 'word',
    category: ['product'],
    tags: ['PRD', '需求', '产品'],
    level: 'official',
    themeColor: '#f97316',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        { title: '一、需求背景', guide: '为什么做这个需求' },
        { title: '二、需求目标', guide: '要达成什么目标和衡量指标' },
        { title: '三、用户故事', guide: '用户角色、使用场景、用户价值' },
        { title: '四、功能需求', guide: '具体功能点和业务规则' },
        { title: '五、交互与原型', guide: '交互流程和页面说明' },
        { title: '六、非功能需求', guide: '性能、安全、兼容性等' },
        { title: '七、数据埋点', guide: '需要采集的数据指标' },
        { title: '八、排期与资源', guide: '开发排期和人力投入' },
      ]),
    },
    usedCount: 756,
    createdAt: '2026-05-15',
  },
  {
    id: 'ct_marketing_plan',
    name: '营销活动方案',
    description: '完整营销活动策划方案模板',
    format: 'word',
    category: ['marketing'],
    tags: ['营销', '活动', '策划'],
    level: 'official',
    themeColor: '#14b8a6',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        { title: '一、活动背景', guide: '活动背景和目标' },
        { title: '二、活动目标', guide: '量化目标和衡量指标' },
        { title: '三、活动主题', guide: '活动主题和核心创意' },
        { title: '四、目标用户', guide: '目标人群画像' },
        { title: '五、活动时间', guide: '活动时间安排和节奏' },
        { title: '六、活动玩法', guide: '具体活动规则和玩法' },
        { title: '七、推广渠道', guide: '推广渠道和投放计划' },
        { title: '八、预算分配', guide: '预算明细和ROI预估' },
        { title: '九、风险预案', guide: '潜在风险和应对方案' },
      ]),
    },
    usedCount: 389,
    createdAt: '2026-05-25',
  },
  {
    id: 'ct_recruitment_jd',
    name: '招聘JD',
    description: '标准职位描述模板，吸引优秀候选人',
    format: 'word',
    category: ['hr'],
    tags: ['招聘', 'JD', '职位'],
    level: 'official',
    themeColor: '#f43f5e',
    style: { tone: 'professional', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '职位名称', guide: '具体职位名称' },
        { title: '一、岗位职责', guide: '主要工作内容和职责' },
        { title: '二、任职要求', guide: '学历、经验、技能要求' },
        { title: '三、加分项', guide: '额外加分的技能或经验' },
        { title: '四、薪资福利', guide: '薪资范围和福利待遇' },
        { title: '五、团队介绍', guide: '团队情况和工作氛围' },
        { title: '六、公司介绍', guide: '公司简介和发展前景' },
      ]),
    },
    usedCount: 298,
    createdAt: '2026-05-30',
  },
  {
    id: 'ct_performance_review',
    name: '绩效评估表',
    description: '员工绩效评估，工作成果、能力评估、发展建议',
    format: 'word',
    category: ['hr'],
    tags: ['绩效', '评估', '人才'],
    level: 'official',
    themeColor: '#f43f5e',
    style: { tone: 'professional', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '一、工作目标回顾', guide: '期初设定的目标和完成情况' },
        { title: '二、主要工作成果', guide: '本周期核心成果和亮点' },
        { title: '三、能力评估', guide: '专业能力、软技能评估' },
        { title: '四、待提升点', guide: '需要改进和提升的方面' },
        { title: '五、职业发展建议', guide: '下一阶段发展方向和建议' },
        { title: '六、下周期目标', guide: '下一个周期的工作目标' },
      ]),
    },
    usedCount: 256,
    createdAt: '2026-06-01',
  },
  {
    id: 'ct_competitor_analysis',
    name: '竞品分析报告',
    description: '系统化竞品分析框架，多维度对比',
    format: 'word',
    category: ['product', 'strategy'],
    tags: ['竞品', '分析', '市场'],
    level: 'official',
    themeColor: '#f97316',
    style: { tone: 'professional', length: 'long' },
    content: {
      sections: makeSections([
        { title: '一、分析目的与范围', guide: '为什么做竞品分析，分析哪些竞品' },
        { title: '二、市场概览', guide: '行业现状和市场格局' },
        { title: '三、竞品介绍', guide: '各竞品基本情况' },
        { title: '四、功能对比', guide: '核心功能对比矩阵' },
        { title: '五、用户体验对比', guide: '交互、视觉、体验对比' },
        { title: '六、商业模式对比', guide: '定价、盈利模式对比' },
        { title: '七、优劣势分析', guide: '各竞品优势与不足' },
        { title: '八、启示与建议', guide: '对我们的启发和行动建议' },
      ]),
    },
    usedCount: 445,
    createdAt: '2026-04-20',
  },
  {
    id: 'ct_sales_weekly_table',
    name: '销售周报表',
    description: '销售团队每周工作数据汇报表格',
    format: 'table',
    category: ['sales'],
    tags: ['周报', '销售', '数据'],
    level: 'official',
    featured: true,
    themeColor: '#10b981',
    style: { tone: 'concise', length: 'medium' },
    content: {
      columns: ['指标类别', '本周数据', '上周数据', '环比变化', '目标完成率', '备注'],
      rows: [
        ['新增客户数', '', '', '', '', ''],
        ['有效商机数', '', '', '', '', ''],
        ['跟进客户数', '', '', '', '', ''],
        ['销售额', '', '', '', '', ''],
        ['回款金额', '', '', '', '', ''],
        ['拜访客户数', '', '', '', '', ''],
        ['新签合同数', '', '', '', '', ''],
      ],
    },
    usedCount: 1876,
    createdAt: '2026-04-12',
  },
  {
    id: 'ct_budget_table',
    name: '项目预算表',
    description: '项目预算规划和执行跟踪表',
    format: 'table',
    category: ['project', 'strategy'],
    tags: ['预算', '财务', '项目'],
    level: 'official',
    themeColor: '#3b82f6',
    style: { tone: 'concise', length: 'medium' },
    content: {
      columns: ['费用类别', '预算金额', '已使用', '剩余预算', '占比', '备注'],
      rows: [
        ['人力成本', '', '', '', '', ''],
        ['外包费用', '', '', '', '', ''],
        ['软件采购', '', '', '', '', ''],
        ['硬件设备', '', '', '', '', ''],
        ['差旅费用', '', '', '', '', ''],
        ['市场推广', '', '', '', '', ''],
        ['培训费用', '', '', '', '', ''],
        ['其他费用', '', '', '', '', ''],
        ['合计', '', '', '', '', ''],
      ],
    },
    usedCount: 634,
    createdAt: '2026-05-08',
  },
  {
    id: 'ct_customer_email',
    name: '客户跟进邮件',
    description: '商务客户跟进沟通邮件模板',
    format: 'email',
    category: ['sales'],
    tags: ['客户', '跟进', '商务'],
    level: 'official',
    featured: true,
    themeColor: '#2563eb',
    style: { tone: 'professional', length: 'short' },
    content: {
      subject: '关于{{topic}}的跟进汇报',
      greeting: '尊敬的{{customer}}：',
      body: [
        '您好！',
        '感谢您一直以来对我们的关注与支持。',
        '关于{{topic}}，现将相关进展和方案整理如下：',
        '一、{{point1_title}}',
        '   {{point1_content}}',
        '二、{{point2_title}}',
        '   {{point2_content}}',
        '三、{{point3_title}}',
        '   {{point3_content}}',
        '如有任何问题，欢迎随时联系。期待与您进一步沟通！',
      ],
      closing: '此致',
      signature: '{{sender}}\n{{company}}',
    },
    usedCount: 2134,
    createdAt: '2026-04-08',
  },
  {
    id: 'ct_thanks_email',
    name: '会议后感谢邮件',
    description: '会议后发送的感谢与纪要邮件',
    format: 'email',
    category: ['office', 'sales'],
    tags: ['会议', '感谢', '跟进'],
    level: 'official',
    themeColor: '#2563eb',
    style: { tone: 'professional', length: 'short' },
    content: {
      subject: '感谢参加{{meeting_topic}}会议 - 会议纪要',
      greeting: '尊敬的{{recipient}}：',
      body: [
        '您好！',
        '感谢您今天抽出宝贵时间参加{{meeting_topic}}会议。',
        '现将会议纪要整理如下，供您参考：',
        '【会议要点】',
        '• {{point1}}',
        '• {{point2}}',
        '• {{point3}}',
        '【行动项】',
        '1. {{action1}} - 负责人：{{owner1}} - 截止：{{due1}}',
        '2. {{action2}} - 负责人：{{owner2}} - 截止：{{due2}}',
        '如有任何问题或补充，欢迎随时沟通。',
      ],
      closing: '顺祝商祺！',
      signature: '{{sender}}',
    },
    usedCount: 987,
    createdAt: '2026-05-02',
  },
  {
    id: 'ct_project_task_list',
    name: '项目任务清单',
    description: '项目任务拆解与跟踪清单',
    format: 'list',
    category: ['project'],
    tags: ['任务', '项目', '跟踪'],
    level: 'official',
    themeColor: '#0ea5e9',
    style: { tone: 'concise', length: 'medium' },
    content: {
      items: [
        '📋 第一阶段：需求调研',
        '  □ 业务方需求访谈',
        '  □ 用户调研分析',
        '  □ 竞品分析',
        '  □ 需求文档输出',
        '',
        '🎨 第二阶段：设计阶段',
        '  □ 交互原型设计',
        '  □ 视觉设计',
        '  □ 设计评审',
        '  □ 设计稿定稿',
        '',
        '💻 第三阶段：开发阶段',
        '  □ 前端开发',
        '  □ 后端开发',
        '  □ 联调测试',
        '  □ Bug修复',
        '',
        '🚀 第四阶段：上线准备',
        '  □ 测试验收',
        '  □ 上线培训',
        '  □ 正式发布',
        '  □ 数据验证',
      ],
    },
    usedCount: 1567,
    createdAt: '2026-04-18',
  },
  {
    id: 'ct_daily_checklist',
    name: '每日工作清单',
    description: '每日待办事项与优先级管理',
    format: 'list',
    category: ['personal', 'office'],
    tags: ['每日', '待办', '效率'],
    level: 'official',
    themeColor: '#84cc16',
    style: { tone: 'concise', length: 'short' },
    content: {
      items: [
        '🌟 今日重要（P0）',
        '  □ 任务1',
        '  □ 任务2',
        '',
        '📝 今日完成（P1）',
        '  □ 任务3',
        '  □ 任务4',
        '  □ 任务5',
        '',
        '💡 可延后（P2）',
        '  □ 任务6',
        '  □ 任务7',
        '',
        '📅 明日计划',
        '  • 计划事项1',
        '  • 计划事项2',
      ],
    },
    usedCount: 2890,
    createdAt: '2026-04-05',
  },
  {
    id: 'ct_onboarding_steps',
    name: '新员工入职流程',
    description: '标准入职步骤指引',
    format: 'steps',
    category: ['hr'],
    tags: ['入职', '新员工', '流程'],
    level: 'official',
    themeColor: '#f43f5e',
    style: { tone: 'professional', length: 'medium' },
    content: {
      steps: [
        { title: '第1步：入职准备', desc: '提前准备工位、设备、账号、入职资料包' },
        { title: '第2步：报到登记', desc: '填写入职资料、领取工牌设备、HR介绍' },
        { title: '第3步：系统培训', desc: '公司制度、业务系统、信息安全培训' },
        { title: '第4步：团队融入', desc: '团队介绍、导师带教、首周目标设定' },
        { title: '第5步：试用期跟进', desc: '双周1v1、月度回顾、转正评估' },
      ],
    },
    usedCount: 567,
    createdAt: '2026-05-12',
  },
  {
    id: 'ct_issue_triage',
    name: '问题排查流程',
    description: '技术问题排查与解决标准流程',
    format: 'steps',
    category: ['product'],
    tags: ['问题', '排查', '技术'],
    level: 'official',
    themeColor: '#f97316',
    style: { tone: 'professional', length: 'medium' },
    content: {
      steps: [
        { title: '第1步：问题确认', desc: '确认问题现象、复现步骤、影响范围' },
        { title: '第2步：信息收集', desc: '收集日志、截图、环境信息、用户反馈' },
        { title: '第3步：原因分析', desc: '定位根本原因、分析触发条件' },
        { title: '第4步：制定方案', desc: '制定修复方案、评估影响和排期' },
        { title: '第5步：实施修复', desc: '开发修复、测试验证、上线发布' },
        { title: '第6步：效果验证', desc: '验证修复效果、同步用户、复盘总结' },
      ],
    },
    usedCount: 345,
    createdAt: '2026-05-28',
  },
  {
    id: 'ct_monthly_report',
    name: '月度工作总结',
    description: '月度工作复盘与下月规划',
    format: 'word',
    category: ['personal', 'office'],
    tags: ['月报', '总结', '规划'],
    level: 'official',
    themeColor: '#06b6d4',
    style: { tone: 'professional', length: 'medium' },
    content: {
      sections: makeSections([
        { title: '一、本月工作概述', guide: '本月重点工作和整体情况' },
        { title: '二、核心成果', guide: '本月完成的核心成果和亮点' },
        { title: '三、数据表现', guide: '关键指标和数据情况' },
        { title: '四、问题与反思', guide: '遇到的问题和不足之处' },
        { title: '五、下月工作计划', guide: '下月重点工作和目标' },
        { title: '六、需要的支持', guide: '需要的资源和协助' },
      ]),
    },
    usedCount: 1456,
    createdAt: '2026-04-22',
  },
  {
    id: 'ct_brainstorm',
    name: '头脑风暴记录',
    description: '创意发散与收敛的头脑风暴模板',
    format: 'list',
    category: ['product', 'marketing'],
    tags: ['创意', '头脑风暴', '讨论'],
    level: 'official',
    themeColor: '#f59e0b',
    style: { tone: 'creative', length: 'medium' },
    content: {
      items: [
        '🎯 讨论主题：{{topic}}',
        '⏰ 时间：{{time}}',
        '👥 参与人：{{attendees}}',
        '',
        '【背景说明】',
        '{{background}}',
        '',
        '【发散阶段 - 创意收集】',
        '💡 想法1：',
        '💡 想法2：',
        '💡 想法3：',
        '💡 想法4：',
        '💡 想法5：',
        '',
        '【收敛阶段 - 筛选评估】',
        '✅ 有价值可落地：',
        '🤔 需要进一步讨论：',
        '❌ 暂不考虑：',
        '',
        '【后续行动】',
        '1. ',
        '2. ',
        '3. ',
      ],
    },
    usedCount: 234,
    createdAt: '2026-06-05',
  },
];

export function getContentTemplateById(id) {
  return defaultContentTemplates.find((t) => t.id === id);
}

export function getContentTemplatesByFormat(format) {
  return defaultContentTemplates.filter((t) => t.format === format);
}

export function getContentTemplatesByCategory(category) {
  return defaultContentTemplates.filter((t) => t.category.includes(category));
}

export function getFeaturedTemplates() {
  return defaultContentTemplates.filter((t) => t.featured);
}

export function getUniqueTags() {
  const tagSet = new Set();
  defaultContentTemplates.forEach((t) => {
    (t.tags || []).forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet);
}

export const pptSkeletonTemplates = [
  {
    id: 'ppt_sk_mckinsey',
    name: '麦肯锡式解决方案',
    description: '参考麦肯锡咨询风格，问题-分析-方案-路径四段式',
    category: ['解决方案', '咨询', '数字化'],
    storyline: [
      { title: '问题现状', guide: '描述当前面临的问题和挑战' },
      { title: '原因分析', guide: '深入分析问题产生的根本原因' },
      { title: '解决方案', guide: '提出具体的解决方案和核心思路' },
      { title: '实施路径', guide: '分阶段的落地计划和里程碑' },
      { title: '价值收益', guide: '预期效果和业务价值' },
      { title: '风险与应对', guide: '潜在风险及应对措施' },
    ],
  },
  {
    id: 'ppt_sk_project_progress',
    name: '项目进度汇报',
    description: '项目周报/月报标准结构',
    category: ['项目管理', '汇报'],
    storyline: [
      { title: '整体进展', guide: '项目整体进度概览' },
      { title: '里程碑完成', guide: '关键里程碑达成情况' },
      { title: '关键成果', guide: '本周期核心成果展示' },
      { title: '问题与风险', guide: '遇到的问题和潜在风险' },
      { title: '下一步计划', guide: '下一阶段工作计划' },
      { title: '资源需求', guide: '需要的支持和资源' },
    ],
  },
  {
    id: 'ppt_sk_weekly',
    name: '周报模板',
    description: '个人/团队周报简洁结构',
    category: ['周报', '项目管理'],
    storyline: [
      { title: '本周完成', guide: '本周完成的主要工作' },
      { title: '进行中事项', guide: '正在推进的事项' },
      { title: '下周计划', guide: '下周工作计划和目标' },
      { title: '问题与协助', guide: '遇到的问题和需要的支持' },
      { title: '亮点与心得', guide: '本周亮点和心得体会' },
    ],
  },
  {
    id: 'ppt_sk_product_launch',
    name: '产品发布会',
    description: '产品上线/新品发布标准结构',
    category: ['产品', '市场', '发布'],
    storyline: [
      { title: '市场痛点', guide: '目标用户面临的问题' },
      { title: '产品方案', guide: '我们的产品解决方案' },
      { title: '核心亮点', guide: '产品核心功能和亮点' },
      { title: '适用场景', guide: '典型应用场景和客户案例' },
      { title: '客户价值', guide: '为客户带来的价值' },
      { title: '上线计划', guide: '发布节奏和后续规划' },
    ],
  },
  {
    id: 'ppt_sk_quarterly_review',
    name: '季度复盘',
    description: '季度/年度总结复盘结构',
    category: ['复盘', '总结', '管理'],
    storyline: [
      { title: '目标回顾', guide: '回顾本季度目标' },
      { title: '成果展示', guide: '核心成果和数据表现' },
      { title: '问题分析', guide: '存在的问题和原因分析' },
      { title: '经验总结', guide: '总结经验和方法论' },
      { title: '下阶段规划', guide: '下季度目标和计划' },
      { title: '资源需求', guide: '需要的资源和支持' },
    ],
  },
  {
    id: 'ppt_sk_training',
    name: '培训课件',
    description: '内部培训/知识分享结构',
    category: ['培训', '教育', '内训'],
    storyline: [
      { title: '背景介绍', guide: '为什么学、学什么' },
      { title: '核心概念', guide: '基础概念和理论知识' },
      { title: '方法工具', guide: '具体方法和工具使用' },
      { title: '案例实战', guide: '实际案例分析和演练' },
      { title: '总结回顾', guide: '重点知识回顾总结' },
      { title: 'Q&A', guide: '提问与交流环节' },
    ],
  },
];

export function getPPTSkeletonById(id) {
  return pptSkeletonTemplates.find((t) => t.id === id);
}

export function getPPTSkeletonsByCategory(category) {
  return pptSkeletonTemplates.filter((t) => t.category.includes(category));
}

const STORAGE_KEY = 'dmtplat_content_templates';

export function getMyContentTemplates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveMyContentTemplate(template) {
  const templates = getMyContentTemplates();
  if (template.id) {
    const idx = templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      templates[idx] = { ...templates[idx], ...template };
    } else {
      templates.unshift(template);
    }
  } else {
    template.id = 'ct_' + generateId();
    template.level = 'personal';
    template.createdAt = new Date().toISOString().split('T')[0];
    template.usedCount = 0;
    template.category = template.category || ['personal'];
    templates.unshift(template);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return template;
}

export function deleteMyContentTemplate(id) {
  const templates = getMyContentTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function incrementTemplateUsage(id) {
  const templates = getMyContentTemplates();
  const t = templates.find((t) => t.id === id);
  if (t) {
    t.usedCount = (t.usedCount || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
  const official = defaultContentTemplates.find((t) => t.id === id);
  if (official) {
    official.usedCount = (official.usedCount || 0) + 1;
  }
}

export function getAllContentTemplates() {
  const myTemplates = getMyContentTemplates();
  return [...myTemplates, ...defaultContentTemplates];
}

const DOC_STORAGE_KEY = 'dmtplat_my_documents';

export function getMyDocuments() {
  try {
    const saved = localStorage.getItem(DOC_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveMyDocument(doc) {
  const docs = getMyDocuments();
  if (!doc.id) {
    doc.id = 'doc_' + generateId();
  }
  doc.updatedAt = new Date().toISOString();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = { ...docs[idx], ...doc };
  } else {
    docs.unshift(doc);
  }
  localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docs));
  return doc;
}

export function deleteMyDocument(id) {
  const docs = getMyDocuments().filter((d) => d.id !== id);
  localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docs));
}
