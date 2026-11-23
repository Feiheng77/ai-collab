const contextSamples = {
  tools: "27 个通用工具的定义:名字、参数、用法说明。\n例:搜索(关键词、范围)· 读取(路径、起止行)· ……\n这个场景里一个都用不上,每次调用还是整份带着。",
  base: "一份通用的默认系统提示:怎么回复、怎么保持简洁、怎么使用工具。\n每次调用都带着,这次没有动它。"
};

export const DEMO = {
  directives: [
    {
      id: "options",
      tab: "选项",
      user: "周末有点累,不知道干嘛。",
      raw: "那就别排太满,挑一个:\n[选项:去公园走一圈|在家整理相册|早点睡]",
      note: "点一个选项,等于替你把这句话发出去。后端不用为它单开接口。"
    },
    {
      id: "timer",
      tab: "计时",
      user: "我要开始写周报了,别让我摸鱼。",
      raw: "好,先写 25 分钟,我看着表。\n[指令:专注写周报|25分钟]",
      note: "一行指令变成一张倒计时卡。演示里 1 秒当 1 分钟走。"
    },
    {
      id: "print",
      tab: "打印",
      user: "把明天要带的东西打出来,我贴门上。",
      raw: "给你打一张。\n[打印:明天带:身份证、充电器、雨伞]",
      note: "接的是一台蓝牙标签打印机。规矩两条:一天最多 7 张;夜里不出纸,先揣着,早上再打。",
      limitPerDay: 7
    },
    {
      id: "not",
      tab: "这不算",
      user: "打印的指令怎么写?",
      raw: "写法是 [打印:正文],把「正文」换成你要打的字就行。",
      note: "只写了示例词的不算指令,不会真打一张「正文」出来。"
    }
  ],
  context: {
    illustrative: false,
    note: "两个总数是 2026-06-27 实测的。「工具定义」这一块是两个总数之差,不是逐块量的。这是当时的数,不是现在的值。",
    before: {
      total: 17385,
      blocks: [
        { id: "tools", name: "用不上的工具定义", tokens: 11540, sample: contextSamples.tools },
        { id: "base", name: "默认系统提示等", tokens: 5845, sample: contextSamples.base }
      ]
    },
    after: {
      total: 5845,
      blocks: [
        { id: "base", name: "默认系统提示等", tokens: 5845, sample: contextSamples.base }
      ]
    }
  },
  memoryChat: [
    { who: "用户", text: "周五要去杭州,票我已经订好了,08:12 那班。" },
    { who: "助手", text: "好,记下了。要我周四晚上提醒你收拾东西吗?" },
    { who: "用户", text: "要。对了,我想换台显示器,在看 27 寸的。" }
  ],
  memories: [
    { id: "m1", type: "事实", weight: "高", date: "2026-06-02", text: "用户对花生过敏" },
    { id: "m2", type: "习惯", weight: "中", date: "2026-07-15", text: "用户每周三晚上有羽毛球课" },
    { id: "m3", type: "事实", weight: "中", date: "2026-05-20", text: "用户的猫叫年糕" },
    { id: "m4", type: "近况", weight: "中", date: "2026-11-18", text: "用户想换一台显示器,在看 27 寸的" },
    { id: "m5", type: "近况", weight: "高", date: "2026-11-18", text: "用户已经订好周五 08:12 去杭州的高铁票" },
    { id: "m6", type: "近况", weight: "低", date: "2026-11-17", text: "用户说最近睡得晚" },
    { id: "m7", type: "碎片", weight: "低", date: "2026-11-19", text: "用户问过周五的天气" },
    { id: "m8", type: "碎片", weight: "低", date: "2026-11-19", text: "用户提到周五要早起" }
  ],
  recall: {
    question: "周五我要干嘛来着?",
    before: { picked: ["m8", "m7", "m6", "m2", "m1"], answer: "周五要早起。票订了吗?没订的话现在订一下。" },
    after: { picked: ["m5", "m8", "m7", "m2", "m1"], answer: "周五 08:12 的高铁去杭州,票你周三已经订好了。" },
    buckets: [
      { name: "事实", ids: ["m1"] },
      { name: "近况", ids: ["m5", "m8", "m7"] },
      { name: "习惯", ids: ["m2"] }
    ]
  },
  hubCards: [
    {
      id: "c1",
      mode: "read_only",
      modeLabel: "只读巡查",
      title: "巡查:昨晚的备份做完了吗",
      scope: "只许看,不许改任何文件",
      changes: ["(无)"],
      tests: "(不涉及)",
      verify: "最新一份备份是今天凌晨的,大小正常",
      step: 4,
      messages: [
        { who: "巡查的 AI", text: "备份在,日期和大小都对。顺手看了磁盘,还剩一半。" },
        { who: "负责人", text: "好。" }
      ]
    },
    {
      id: "c2",
      mode: "proposal_only",
      modeLabel: "只出方案",
      title: "方案:聊天页的长图加载慢",
      scope: "只写方案,不动代码",
      changes: ["(无)"],
      tests: "(不涉及)",
      verify: "负责人采纳了第一条,否了第二条",
      step: 4,
      messages: [
        { who: "出方案的 AI", text: "两条:① 图片懒加载 + 缩略图;② 把长图切片。" },
        { who: "负责人", text: "先做 ①。② 不做,切片会让保存图片变麻烦。" }
      ]
    },
    {
      id: "c3",
      mode: "small_fix",
      modeLabel: "小修",
      title: "修:跨天的日历事件显示错一天",
      scope: "只许改日历页的两个文件",
      changes: ["日历页脚本 +14 −6;新增测试 +22"],
      tests: "3 个通过",
      verify: "负责人在手机上走了一遍真实路径",
      step: 4,
      messages: [
        { who: "修的 AI", text: "原因是把结束时间当成了当天零点。改了比较方式,补了三个测试。" },
        { who: "负责人", text: "手机上看过了,对了。" }
      ]
    }
  ],
  pipeline: [
    { name: "在副本里跑测试", hint: "把代码拷到临时目录再跑,线上的设置和数据够不着。" },
    { name: "预发环境", hint: "先在一份不对外的环境里跑起来看。" },
    { name: "上线", hint: "留底、换文件、语法检查、提交。换文件前后各核一次哈希,对不上就原样退回。重启要等空档:有人在聊、后台有活,都不重启。" },
    { name: "走一遍真实路径", hint: "上线后用真地址、真手机走一遍。只在本机测通过不算。" },
    { name: "每天备份", hint: "每天凌晨自动备份,巡检时看最新一份的日期。" }
  ]
};
