export const kbTemplates = [
  {
    id: 'template_customer_service',
    name: '智能客服知识库',
    description: '整合产品文档、常见问题、帮助中心的综合客服知识库',
    category: '业务场景',
    subCategory: '客服',
    icon: 'message',
    preset: {
      kbName: '智能客服知识库',
      kbDescription: '整合产品文档、常见问题、业务指南的客服知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '产品文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx', 'txt'],
          maxFileSize: 50
        }
      },
      {
        type: 'qa',
        name: '常见问题',
        config: {
          matchThreshold: 0.8,
          enableFuzzyMatch: true,
          maxQACount: 1000
        }
      },
      {
        type: 'web',
        name: '帮助中心',
        config: {
          baseUrl: '',
          crawlDepth: 2,
          interval: 3,
          enableRecursive: true
        }
      }
    ]
  },
  {
    id: 'template_product_manual',
    name: '产品手册知识库',
    description: '产品文档与在线帮助的整合知识库',
    category: '业务场景',
    subCategory: '产品',
    icon: 'book-open',
    preset: {
      kbName: '产品手册知识库',
      kbDescription: '产品文档与在线帮助的整合知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '产品文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx'],
          maxFileSize: 100
        }
      },
      {
        type: 'web',
        name: '在线帮助',
        config: {
          baseUrl: '',
          crawlDepth: 3,
          interval: 5,
          enableRecursive: true
        }
      }
    ]
  },
  {
    id: 'template_data_analysis',
    name: '数据分析知识库',
    description: '整合数据库数据与分析文档的知识库',
    category: '业务场景',
    subCategory: '数据',
    icon: 'chart-bar',
    preset: {
      kbName: '数据分析知识库',
      kbDescription: '整合数据库数据与分析文档的知识库'
    },
    dataSources: [
      {
        type: 'database',
        name: '业务数据库',
        config: {
          host: '',
          port: 3306,
          database: '',
          username: '',
          password: '',
          tableName: '',
          query: ''
        }
      },
      {
        type: 'document',
        name: '分析报告',
        config: {
          supportedFormats: ['pdf', 'xlsx', 'csv'],
          maxFileSize: 200
        }
      }
    ]
  },
  {
    id: 'template_employee_training',
    name: '员工培训知识库',
    description: '包含培训文档和常见问题的员工知识库',
    category: '业务场景',
    subCategory: '培训',
    icon: 'graduation-cap',
    preset: {
      kbName: '员工培训知识库',
      kbDescription: '包含培训文档和常见问题的员工知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '培训文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
          maxFileSize: 100
        }
      },
      {
        type: 'qa',
        name: '入职问答',
        config: {
          matchThreshold: 0.7,
          enableFuzzyMatch: true,
          maxQACount: 500
        }
      }
    ]
  },
  {
    id: 'template_marketing_faq',
    name: '营销FAQ知识库',
    description: '整合营销文档和常见问题的知识库',
    category: '业务场景',
    subCategory: '营销',
    icon: 'bullhorn',
    preset: {
      kbName: '营销FAQ知识库',
      kbDescription: '整合营销文档和常见问题的知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '营销文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx'],
          maxFileSize: 50
        }
      },
      {
        type: 'qa',
        name: '营销FAQ',
        config: {
          matchThreshold: 0.75,
          enableFuzzyMatch: true,
          maxQACount: 300
        }
      }
    ]
  },
  {
    id: 'template_finance_regulations',
    name: '金融合规知识库',
    description: '包含金融法规文档和合规问答的知识库',
    category: '行业解决方案',
    subCategory: '金融',
    icon: 'building-columns',
    preset: {
      kbName: '金融合规知识库',
      kbDescription: '包含金融法规文档和合规问答的知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '法规文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx'],
          maxFileSize: 100
        }
      },
      {
        type: 'qa',
        name: '合规问答',
        config: {
          matchThreshold: 0.85,
          enableFuzzyMatch: false,
          maxQACount: 200
        }
      },
      {
        type: 'web',
        name: '监管公告',
        config: {
          baseUrl: '',
          crawlDepth: 1,
          interval: 24,
          enableRecursive: false
        }
      }
    ]
  },
  {
    id: 'template_medical_guide',
    name: '医疗指南知识库',
    description: '整合医疗文档和健康问答的知识库',
    category: '行业解决方案',
    subCategory: '医疗',
    icon: 'hospitals',
    preset: {
      kbName: '医疗指南知识库',
      kbDescription: '整合医疗文档和健康问答的知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '医疗文档',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx'],
          maxFileSize: 100
        }
      },
      {
        type: 'qa',
        name: '健康问答',
        config: {
          matchThreshold: 0.8,
          enableFuzzyMatch: true,
          maxQACount: 500
        }
      }
    ]
  },
  {
    id: 'template_ecommerce_faq',
    name: '电商客服知识库',
    description: '整合产品信息、订单问题、售后政策的知识库',
    category: '行业解决方案',
    subCategory: '电商',
    icon: 'cart',
    preset: {
      kbName: '电商客服知识库',
      kbDescription: '整合产品信息、订单问题、售后政策的知识库'
    },
    dataSources: [
      {
        type: 'document',
        name: '产品手册',
        config: {
          supportedFormats: ['pdf', 'doc', 'docx'],
          maxFileSize: 50
        }
      },
      {
        type: 'qa',
        name: '常见问题',
        config: {
          matchThreshold: 0.75,
          enableFuzzyMatch: true,
          maxQACount: 800
        }
      },
      {
        type: 'database',
        name: '产品数据库',
        config: {
          host: '',
          port: 3306,
          database: '',
          username: '',
          password: '',
          tableName: 'products',
          query: 'SELECT id, name, description FROM products'
        }
      }
    ]
  }
];