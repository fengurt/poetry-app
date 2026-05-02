#!/usr/bin/env node
/**
 * 诗词自动分类脚本
 * 使用关键词权重算法对1142首诗词进行12分类
 */

const Database = require('better-sqlite3');
const path = require('path');

// 12种诗词分类
const CATEGORIES = [
  '不忘初心', '咏物寄情', '情系河山', '老龄心声',
  '感事抒怀', '诗社撷英', '曲赋雅韵', '时代风云',
  '刺玫瑰', '七彩人生', '诗词文苑', '心香一瓣'
];

// 分类关键词权重表
const CATEGORY_KEYWORDS = {
  '不忘初心': [
    { kw: '党', w: 1.0 }, { kw: '祖国', w: 1.0 }, { kw: '使命', w: 0.9 },
    { kw: '信仰', w: 0.9 }, { kw: '忠诚', w: 0.8 }, { kw: '奋斗', w: 0.8 },
    { kw: '初心', w: 0.9 }, { kw: '追梦', w: 0.7 }, { kw: '复兴', w: 0.8 },
    { kw: '强国', w: 0.8 }, { kw: '中国梦', w: 0.9 }, { kw: '红旗', w: 0.7 },
    { kw: '革命', w: 0.7 }, { kw: '共产党', w: 0.9 }, { kw: '烈士', w: 0.8 },
    { kw: '英雄', w: 0.7 }, { kw: '民族', w: 0.6 }, { kw: '人民', w: 0.5 },
    { kw: '万岁', w: 0.8 }, { kw: '解放', w: 0.7 }
  ],
  '咏物寄情': [
    { kw: '梅', w: 0.9 }, { kw: '兰', w: 0.8 }, { kw: '竹', w: 0.8 },
    { kw: '菊', w: 0.8 }, { kw: '花', w: 0.6 }, { kw: '月', w: 0.7 },
    { kw: '鸟', w: 0.7 }, { kw: '风', w: 0.5 }, { kw: '雨', w: 0.5 },
    { kw: '雪', w: 0.7 }, { kw: '荷', w: 0.8 }, { kw: '松', w: 0.7 },
    { kw: '柳', w: 0.6 }, { kw: '桃', w: 0.6 }, { kw: '桂', w: 0.6 },
    { kw: '牡丹', w: 0.8 }, { kw: '海棠', w: 0.7 }, { kw: '石榴', w: 0.7 },
    { kw: '兰', w: 0.9 }, { kw: '郁金香', w: 0.8 }, { kw: '玉簪', w: 0.8 },
    { kw: '芙蓉', w: 0.8 }, { kw: '山茶', w: 0.8 }, { kw: '水仙', w: 0.8 },
    { kw: '茉莉', w: 0.7 }, { kw: '桂花', w: 0.8 }
  ],
  '情系河山': [
    { kw: '山', w: 0.8 }, { kw: '水', w: 0.7 }, { kw: '江', w: 0.7 },
    { kw: '河', w: 0.7 }, { kw: '海', w: 0.8 }, { kw: '湖', w: 0.7 },
    { kw: '峰', w: 0.8 }, { kw: '峡', w: 0.8 }, { kw: '草原', w: 0.9 },
    { kw: '大地', w: 0.6 }, { kw: '天涯', w: 0.7 }, { kw: '远方', w: 0.6 },
    { kw: '长城', w: 1.0 }, { kw: '黄河', w: 0.9 }, { kw: '长江', w: 0.9 },
    { kw: '珠峰', w: 0.9 }, { kw: '江南', w: 0.7 }, { kw: '塞北', w: 0.8 },
    { kw: '山河', w: 1.0 }, { kw: '大地', w: 0.7 }, { kw: '江山', w: 0.8 },
    { kw: '山川', w: 0.9 }, { kw: '风景', w: 0.6 }, { kw: '景观', w: 0.5 },
    { kw: '景色', w: 0.5 }, { kw: '壮丽', w: 0.7 }, { kw: '雄伟', w: 0.7 }
  ],
  '老龄心声': [
    { kw: '老', w: 1.0 }, { kw: '退休', w: 1.0 }, { kw: '养生', w: 0.9 },
    { kw: '健康', w: 0.8 }, { kw: '长寿', w: 0.9 }, { kw: '子孙', w: 0.8 },
    { kw: '夕阳', w: 1.0 }, { kw: '暮年', w: 0.9 }, { kw: '古稀', w: 1.0 },
    { kw: '耄耋', w: 1.0 }, { kw: '颐养', w: 0.9 }, { kw: '天年', w: 0.8 },
    { kw: '桑榆', w: 0.9 }, { kw: '白首', w: 0.8 }, { kw: '鹤发', w: 0.8 },
    { kw: '老龄', w: 1.0 }, { kw: '老年', w: 0.9 }, { kw: '银龄', w: 1.0 },
    { kw: '余生', w: 0.8 }, { kw: '暮色', w: 0.7 }, { kw: '晚晴', w: 0.8 },
    { kw: '余年', w: 0.8 }, { kw: '桑榆晚', w: 1.0 }, { kw: '老龄', w: 1.0 }
  ],
  '感事抒怀': [
    { kw: '感', w: 0.9 }, { kw: '怀', w: 0.8 }, { kw: '叹', w: 0.7 },
    { kw: '思', w: 0.6 }, { kw: '悟', w: 0.8 }, { kw: '情', w: 0.7 },
    { kw: '愁', w: 0.8 }, { kw: '忧', w: 0.8 }, { kw: '思乡', w: 0.9 },
    { kw: '离别', w: 0.9 }, { kw: '感怀', w: 1.0 }, { kw: '感事', w: 1.0 },
    { kw: '抒怀', w: 1.0 }, { kw: '追忆', w: 0.8 }, { kw: '回首', w: 0.7 },
    { kw: '感怀', w: 1.0 }, { kw: '咏怀', w: 1.0 }, { kw: '遣怀', w: 0.9 },
    { kw: '幽怀', w: 0.9 }, { kw: '幽思', w: 0.9 }, { kw: '情思', w: 0.8 },
    { kw: '情愫', w: 0.8 }, { kw: '心语', w: 0.8 }, { kw: '心声', w: 0.8 }
  ],
  '诗社撷英': [
    { kw: '诗社', w: 1.0 }, { kw: '雅聚', w: 1.0 }, { kw: '唱和', w: 1.0 },
    { kw: '酬唱', w: 1.0 }, { kw: '笔会', w: 1.0 }, { kw: '文友', w: 0.9 },
    { kw: '吟诵', w: 0.9 }, { kw: '雅集', w: 0.9 }, { kw: '诗会', w: 0.9 },
    { kw: '联吟', w: 0.9 }, { kw: '切磋', w: 0.8 }, { kw: '诗缘', w: 0.8 },
    { kw: '韵友', w: 0.8 }, { kw: '诗朋', w: 0.9 }, { kw: '文朋', w: 0.9 },
    { kw: '雅友', w: 0.9 }, { kw: '吟友', w: 0.9 }, { kw: '墨客', w: 0.8 },
    { kw: '骚人', w: 0.9 }, { kw: '唱酬', w: 1.0 }, { kw: '雅会', w: 0.9 }
  ],
  '曲赋雅韵': [
    { kw: '曲', w: 1.0 }, { kw: '赋', w: 0.9 }, { kw: '词', w: 0.7 },
    { kw: '令', w: 0.8 }, { kw: '慢', w: 0.8 }, { kw: '引', w: 0.7 },
    { kw: '近', w: 0.6 }, { kw: '蝶恋花', w: 1.0 }, { kw: '清平乐', w: 1.0 },
    { kw: '满江红', w: 1.0 }, { kw: '沁园春', w: 1.0 }, { kw: '水调歌头', w: 1.0 },
    { kw: '念奴娇', w: 1.0 }, { kw: '西江月', w: 1.0 }, { kw: '鹧鸪天', w: 1.0 },
    { kw: '临江仙', w: 1.0 }, { kw: '采桑子', w: 1.0 }, { kw: '如梦令', w: 1.0 },
    { kw: '天净沙', w: 1.0 }, { kw: '山坡羊', w: 1.0 }, { kw: '水仙子', w: 1.0 },
    { kw: '金缕曲', w: 1.0 }, { kw: '贺新郎', w: 1.0 }, { kw: '木兰花', w: 1.0 },
    { kw: '玉楼春', w: 1.0 }, { kw: '浣溪沙', w: 1.0 }, { kw: '醉花阴', w: 1.0 }
  ],
  '时代风云': [
    { kw: '抗疫', w: 1.0 }, { kw: '航天', w: 1.0 }, { kw: '奥运', w: 1.0 },
    { kw: '一带一路', w: 1.0 }, { kw: '峰会', w: 0.9 }, { kw: '改革开放', w: 0.9 },
    { kw: '亚运会', w: 1.0 }, { kw: '冬奥会', w: 1.0 }, { kw: '航母', w: 0.9 },
    { kw: '阅兵', w: 0.9 }, { kw: '峰会', w: 0.9 }, { kw: '博鳌', w: 1.0 },
    { kw: '上合', w: 1.0 }, { kw: 'G20', w: 0.9 }, { kw: '进博会', w: 1.0 },
    { kw: '数字化', w: 0.8 }, { kw: '人工智能', w: 0.8 }, { kw: '互联网', w: 0.7 },
    { kw: '高铁', w: 0.9 }, { kw: '5G', w: 0.8 }, { kw: '芯片', w: 0.8 },
    { kw: '大国', w: 0.7 }, { kw: '崛起', w: 0.8 }, { kw: '盛世', w: 0.8 },
    { kw: '新时代', w: 0.9 }, { kw: '新征程', w: 0.9 }
  ],
  '刺玫瑰': [
    { kw: '讽刺', w: 1.0 }, { kw: '批判', w: 0.9 }, { kw: '揭露', w: 0.9 },
    { kw: '时弊', w: 1.0 }, { kw: '官场', w: 0.9 }, { kw: '腐败', w: 0.9 },
    { kw: '贪婪', w: 0.8 }, { kw: '虚伪', w: 0.8 }, { kw: '丑恶', w: 0.8 },
    { kw: '趋炎', w: 0.7 }, { kw: '附势', w: 0.7 }, { kw: '讽刺', w: 1.0 },
    { kw: '嘲弄', w: 0.9 }, { kw: '讥讽', w: 0.9 }, { kw: '讥刺', w: 0.9 },
    { kw: '辛辣', w: 0.9 }, { kw: '锋利', w: 0.7 }, { kw: '深刻', w: 0.6 },
    { kw: '犀利', w: 0.8 }, { kw: '鞭挞', w: 0.9 }, { kw: '针砭', w: 0.9 }
  ],
  '七彩人生': [
    { kw: '生活', w: 0.7 }, { kw: '情趣', w: 0.8 }, { kw: '闲适', w: 0.9 },
    { kw: '逸趣', w: 0.9 }, { kw: '雅兴', w: 0.9 }, { kw: '漫步', w: 0.8 },
    { kw: '游历', w: 0.8 }, { kw: '游览', w: 0.8 }, { kw: '品茶', w: 0.9 },
    { kw: '饮酒', w: 0.8 }, { kw: '弈棋', w: 1.0 }, { kw: '书法', w: 0.9 },
    { kw: '丹青', w: 0.9 }, { kw: '垂钓', w: 0.9 }, { kw: '田园', w: 0.8 },
    { kw: '闲情', w: 0.9 }, { kw: '雅趣', w: 0.9 }, { kw: '闲适', w: 1.0 },
    { kw: '悠然', w: 0.8 }, { kw: '自在', w: 0.7 }, { kw: '休闲', w: 0.8 },
    { kw: '怡情', w: 0.9 }, { kw: '养性', w: 0.8 }, { kw: '陶情', w: 0.8 }
  ],
  '诗词文苑': [
    { kw: '论诗', w: 1.0 }, { kw: '品诗', w: 1.0 }, { kw: '诗论', w: 1.0 },
    { kw: '诗法', w: 1.0 }, { kw: '艺术', w: 0.7 }, { kw: '意境', w: 0.9 },
    { kw: '韵律', w: 0.9 }, { kw: '平仄', w: 1.0 }, { kw: '对仗', w: 0.9 },
    { kw: '推敲', w: 1.0 }, { kw: '诗话', w: 1.0 }, { kw: '词话', w: 1.0 },
    { kw: '诗评', w: 1.0 }, { kw: '格律', w: 1.0 }, { kw: '用韵', w: 0.9 },
    { kw: '诗道', w: 1.0 }, { kw: '诗艺', w: 1.0 }, { kw: '词章', w: 0.9 },
    { kw: '文采', w: 0.8 }, { kw: '风骚', w: 0.8 }, { kw: '典雅', w: 0.7 }
  ],
  '心香一瓣': [
    { kw: '祭', w: 1.0 }, { kw: '悼', w: 1.0 }, { kw: '缅怀', w: 1.0 },
    { kw: '追思', w: 1.0 }, { kw: '纪念', w: 0.9 }, { kw: '千古', w: 0.8 },
    { kw: '哀思', w: 1.0 }, { kw: '伤逝', w: 1.0 }, { kw: '英灵', w: 1.0 },
    { kw: '忠魂', w: 1.0 }, { kw: '不朽', w: 0.8 }, { kw: '缅想', w: 0.9 },
    { kw: '追悼', w: 1.0 }, { kw: '奠', w: 0.9 }, { kw: '祭奠', w: 1.0 },
    { kw: '缅想', w: 0.9 }, { kw: '追忆', w: 0.8 }, { kw: '追怀', w: 0.9 },
    { kw: '思念', w: 0.7 }, { kw: '缅邈', w: 0.9 }, { kw: '幽明', w: 0.8 }
  ]
};

/**
 * 对单首诗词进行分类
 */
function classifyPoem(title, content) {
  const text = (title || '') + ' ' + (content || '');
  const scores = {};

  // 计算每个分类的得分
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const { kw, w } of keywords) {
      // 检查关键词在标题或内容中出现的次数
      const titleMatches = (title || '').split(kw).length - 1;
      const contentMatches = (content || '').split(kw).length - 1;
      const totalMatches = titleMatches + contentMatches;

      if (totalMatches > 0) {
        // 标题中的关键词权重更高
        const titleBonus = titleMatches > 0 ? 0.5 : 0;
        score += w * (1 + titleBonus) * Math.min(totalMatches, 3); // 最多计算3次
      }
    }
    scores[category] = score;
  }

  // 找出最高分类
  let bestCategory = '';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // 如果最高分低于阈值，标记为未分类
  if (bestScore < 0.5) {
    bestCategory = '';
    bestScore = 0;
  }

  return { category: bestCategory, score: Math.round(bestScore * 100) / 100 };
}

// 主函数
function main() {
  const DB_PATH = '/Users/af/cpro01/ksaclaude01/mamapoems999/poetry-app/poetry.db';

  console.log('开始诗词分类...');
  console.log('分类类别:', CATEGORIES.join(', '));

  const db = new Database(DB_PATH);

  // 获取所有未分类的诗词
  const poems = db.prepare("SELECT id, author_name, title, content FROM poems WHERE category = '' OR category IS NULL").all();

  console.log(`\n找到 ${poems.length} 首未分类的诗词`);

  const updateStmt = db.prepare('UPDATE poems SET category = ?, category_score = ? WHERE id = ?');

  let classifiedCount = 0;
  const stats = {};

  // 初始化统计数据
  for (const cat of CATEGORIES) {
    stats[cat] = 0;
  }
  stats['未分类'] = 0;

  for (const poem of poems) {
    const result = classifyPoem(poem.title, poem.content);

    updateStmt.run(result.category, result.score, poem.id);

    if (result.category) {
      stats[result.category]++;
      classifiedCount++;
    } else {
      stats['未分类']++;
    }

    if (classifiedCount % 200 === 0) {
      console.log(`已分类 ${classifiedCount} 首...`);
    }
  }

  console.log('\n分类完成!');
  console.log('统计结果:');

  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count} 首`);
  }

  // 显示分类分布
  console.log('\n分类分布:');
  const sortedStats = Object.entries(stats)
    .filter(([k]) => k !== '未分类')
    .sort((a, b) => b[1] - a[1]);

  for (const [cat, count] of sortedStats) {
    const pct = ((count / poems.length) * 100).toFixed(1);
    console.log(`  ${cat}: ${count}首 (${pct}%)`);
  }

  db.close();
}

main();