export let knowledgeBases = [
  {
    id: 'kb_202405001',
    name: '产品文档中心',
    type: '文档',
    description: '存储所有产品相关的技术文档、用户手册和API文档，支持全文检索和智能问答。',
    documentCount: 128,
    lastUpdate: '2小时前',
    views: '1.2k',
    status: 'active',
    createdAt: '2024-01-15',
    creator: '管理员',
  },
  {
    id: 'kb_202405002',
    name: '客服知识库',
    type: '问答',
    description: '收集整理常见客户问题及标准答案，用于智能客服机器人训练和问答匹配。',
    documentCount: 256,
    lastUpdate: '1天前',
    views: '3.5k',
    status: 'active',
    createdAt: '2024-01-20',
    creator: '管理员',
  },
  {
    id: 'kb_202405003',
    name: '法规政策库',
    type: '网页',
    description: '汇总行业相关法规、政策文件和合规要求，定期自动更新同步。',
    documentCount: 45,
    lastUpdate: '3天前',
    views: '890',
    status: 'inactive',
    createdAt: '2024-02-01',
    creator: '合规部',
  },
  {
    id: 'kb_202405004',
    name: '技术博客汇总',
    type: '网页',
    description: '聚合技术团队博客文章，构建技术知识图谱，支持技术方案检索。',
    documentCount: 312,
    lastUpdate: '5天前',
    views: '2.1k',
    status: 'active',
    createdAt: '2024-02-15',
    creator: '技术部',
  },
  {
    id: 'kb_202405005',
    name: '内部培训资料',
    type: '文档',
    description: '新员工培训材料、产品知识培训、销售话术培训等内部文档资料。',
    documentCount: 86,
    lastUpdate: '1周前',
    views: '567',
    status: 'active',
    createdAt: '2024-03-01',
    creator: 'HR',
  },
  {
    id: 'kb_202405006',
    name: '竞品分析库',
    type: '数据库',
    description: '收集整理竞品信息、市场分析报告和竞争对手动态监控数据。',
    documentCount: 24,
    lastUpdate: '2周前',
    views: '1.8k',
    status: 'active',
    createdAt: '2024-03-15',
    creator: '产品部',
  },
];

export const documents = [
  {
    id: 'doc_001',
    name: 'API接口文档v2.0.pdf',
    type: 'PDF',
    size: '2.4 MB',
    uploadTime: '2小时前',
    status: '已索引',
    progress: 100,
  },
  {
    id: 'doc_002',
    name: '用户操作手册.docx',
    type: 'Word',
    size: '5.1 MB',
    uploadTime: '1天前',
    status: '已索引',
    progress: 100,
  },
  {
    id: 'doc_003',
    name: '产品更新日志.md',
    type: 'Markdown',
    size: '156 KB',
    uploadTime: '2天前',
    status: '处理中',
    progress: 65,
  },
  {
    id: 'doc_004',
    name: '架构设计文档.pdf',
    type: 'PDF',
    size: '8.7 MB',
    uploadTime: '3天前',
    status: '排队中',
    progress: 0,
  },
];

export const trainingLogs = [
  {
    time: '2024-05-20 14:30:25',
    text: '训练任务完成',
    tag: '成功',
  },
  {
    time: '2024-05-20 14:28:10',
    text: '开始构建索引',
    tag: '处理中',
  },
  {
    time: '2024-05-20 14:25:33',
    text: '文档解析完成，共 128 个片段',
    tag: '完成',
  },
  {
    time: '2024-05-20 14:20:00',
    text: '开始训练任务 #128',
    tag: '开始',
  },
];

export const evaluationRecords = [
  {
    id: 'eval_001',
    question: '如何重置密码？',
    answer: '进入登录页点击「忘记密码」...',
    rating: 5,
    time: '2分钟前',
  },
  {
    id: 'eval_002',
    question: '支持哪些文件格式？',
    answer: '支持 PDF、Word、TXT、Markdown...',
    rating: 4,
    time: '1小时前',
  },
  {
    id: 'eval_003',
    question: 'API限流规则是什么？',
    answer: '免费版 100次/分钟，专业版 1000次...',
    rating: 5,
    time: '3小时前',
  },
];

export const apiKeys = [
  {
    id: 'key_001',
    name: '生产环境密钥',
    value: 'kb_live_xxxxxxxxxxxx',
    createdAt: '2024-01-15',
    lastUsed: '2小时前',
    active: true,
  },
  {
    id: 'key_002',
    name: '测试环境密钥',
    value: 'kb_test_xxxxxxxxxxxx',
    createdAt: '2024-02-01',
    lastUsed: '1天前',
    active: true,
  },
];

export const chatMessages = [
  {
    id: 'msg_001',
    role: 'bot',
    content: '您好！我是产品文档助手，基于知识库「产品文档中心」训练而成。请问有什么可以帮助您的？',
    time: '10:00',
  },
  {
    id: 'msg_002',
    role: 'user',
    content: '如何调用用户认证接口？',
    time: '10:01',
  },
  {
    id: 'msg_003',
    role: 'bot',
    content: '根据文档《API接口文档v2.0.pdf》，用户认证接口的调用方式如下：\n\n1. 请求地址：POST /api/v2/auth/login\n2. 请求参数：{username, password, captcha}\n3. 返回结果：{token, expires_in, user_info}\n\n详细示例代码请参考文档第 3.2 节。',
    time: '10:01',
  },
];

export const userChatMessages = [
  {
    id: 'uc_001',
    role: 'bot',
    content: '您好！欢迎使用知识库问答服务。我可以帮助您查找产品文档中的信息。',
    time: '09:30',
  },
];

export const suggestions = [
  '如何创建知识库？',
  '支持哪些文件格式？',
  '如何提升问答准确率？',
  '训练需要多长时间？',
];

export const evalStats = {
  accuracy: '92%',
  averageRating: '4.5',
  averageResponse: '1.2s',
  totalQuestions: '856',
};
