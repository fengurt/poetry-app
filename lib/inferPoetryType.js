/**
 * 根据标题、正文、朝代推断体裁：词、曲、楹联、现代诗、诗。
 * category 为内容分类，不在此模块修改。
 */

const CIPAI_UNIQUE = [
  '凤凰台上忆吹箫', '八声甘州', '六州歌头', '水调歌头', '沁园春', '念奴娇', '贺新郎', '雨霖铃',
  '木兰花慢', '桂枝香', '摸鱼儿', '浪淘沙', '蝶恋花', '满江红', '水龙吟', '齐天乐', '扬州慢',
  '高阳台', '金缕曲', '蓦山溪', '烛影摇红', '瑞鹤仙', '双双燕', '东风第一枝', '法曲献仙音',
  '惜红衣', '凄凉犯', '霜叶飞', '宴清都', '花犯', '大酺', '瑞龙吟', '尉迟杯', '玲珑四犯', '曲玉管',
  '六丑', '兰陵王', '夜半乐', '宝鼎现', '莺啼序', '暗香', '疏影', '解语花', '翠楼吟', '眉妩',
  '长亭怨慢', '淡黄柳', '石湖仙', '惜秋华', '杏花天影', '湘月', '西河', '石州慢', '二郎神',
  '洞仙歌', '太常引', '庆清朝', '庆春宫', '应天长', '忆旧游', '意难忘', '渡江云', '声声慢',
  '醉蓬莱', '永遇乐', '望海潮', '江城子', '点绛唇', '浣溪沙', '菩萨蛮', '西江月', '清平乐',
  '如梦令', '虞美人', '卜算子', '鹧鸪天', '定风波', '渔家傲', '苏幕遮', '醉花阴', '鹊桥仙',
  '踏莎行', '钗头凤', '青玉案', '一剪梅', '行香子', '忆江南', '长相思', '更漏子', '谒金门',
  '相见欢', '采桑子', '眼儿媚', '唐多令', '醉翁操', '千秋岁', '少年游', '诉衷情', '南乡子',
  '临江仙', '阮郎归', '天仙子', '风流子', '女冠子', '三字令', '四和香', '归国谣', '归国遥',
];

const QUPAI_UNIQUE = [
  '沉醉东风', '脱布衫', '小梁州', '朝天子', '红绣鞋', '普天乐', '寄生草', '叨叨令', '塞鸿秋',
  '醉太平', '折桂令', '山坡羊', '天净沙',
];

const CIPAI = [...new Set(CIPAI_UNIQUE)].sort((a, b) => b.length - a.length);
const QUPAI = [...new Set(QUPAI_UNIQUE)].sort((a, b) => b.length - a.length);

function firstTitleSegment(title) {
  return String(title || '')
    .trim()
    .split(/[·•‧\u00B7\u30FB]/)[0]
    .trim();
}

function segmentStartsWith(segment, prefix) {
  if (!segment.startsWith(prefix)) return false;
  if (segment.length === prefix.length) return true;
  const next = segment[prefix.length];
  return /[·•‧\u00B7\u30FB（(\s]/.test(next) || next === undefined;
}

function matchList(segment, list) {
  for (const name of list) {
    if (segmentStartsWith(segment, name)) return true;
  }
  return false;
}

function isModernDynasty(dynasty) {
  const d = String(dynasty || '').trim();
  return d === '现代' || d === '当代' || d.includes('现代');
}

function looksLikeModernFreeVerse(content) {
  const raw = String(content || '');
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  const lens = lines.map((l) => l.replace(/\s/g, '').length).filter((n) => n > 0);
  if (lens.length < 2) return false;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance =
    lens.reduce((s, x) => s + (x - mean) * (x - mean), 0) / lens.length;
  const stdev = Math.sqrt(variance);
  if (mean >= 20) return true;
  if (mean >= 14 && stdev >= 9) return true;
  const commaLines = lines.filter((l) => /[，,]/.test(l)).length;
  if (lines.length >= 4 && commaLines / lines.length < 0.25 && mean >= 12) return true;
  return false;
}

function inferPoetryType(row) {
  const title = String(row.title || '').trim();
  const content = String(row.content || '');
  const dynasty = String(row.dynasty || '').trim();
  const segment = firstTitleSegment(title);

  if (/楹联|对联/.test(title) || (title.length <= 28 && /联$/.test(segment))) {
    return '楹联';
  }

  if (matchList(segment, QUPAI)) return '曲';
  if (matchList(segment, CIPAI)) return '词';

  const tLower = title.toLowerCase();
  if (title.includes('现代诗') || tLower.includes('free verse')) return '现代诗';

  if (isModernDynasty(dynasty) && looksLikeModernFreeVerse(content)) return '现代诗';

  return '诗';
}

module.exports = { inferPoetryType, CIPAI, QUPAI };
