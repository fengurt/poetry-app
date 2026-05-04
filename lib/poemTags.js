/**
 * 诗词 tags JSON 列：解析与展示（API / 页面 / Excel 共用同一套规则）
 */

const YEAR_TAG_RE = /^\d{4}$/;

function parseTags(json) {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/** 发布年份：tags 中四位数字，去重后以顿号连接 */
function publishYearDisplayFromTagList(tagList) {
  const list = (tagList || []).map((t) => String(t).trim()).filter(Boolean);
  const years = [...new Set(list.filter((t) => YEAR_TAG_RE.test(t)))];
  return years.join('、');
}

function nonYearTagsFromList(tagList) {
  return (tagList || [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .filter((t) => !YEAR_TAG_RE.test(t));
}

module.exports = {
  YEAR_TAG_RE,
  parseTags,
  publishYearDisplayFromTagList,
  nonYearTagsFromList,
};
