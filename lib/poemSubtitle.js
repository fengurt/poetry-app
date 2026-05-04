/**
 * 副标题：优先数据库 subtitle；为空时从正文首行识别「题记」式副题（常见以 —— 等开头）
 */

/**
 * 从正文推断题记式副题（首行以两个及以上破折号类字符开头）
 * @param {string} [content]
 * @returns {string}
 */
function inferSubtitleFromContent(content) {
  const lines = String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return '';
  const first = lines[0];
  // —— … 、–– … 、－－ … 及半角连字符等（与 poetry_data 中「——庆祝…」一致）
  if (/^[—–－\-]{2,}/.test(first)) return first;
  return '';
}

/**
 * @param {{ subtitle?: string, content?: string }} row SQLite 行或同类对象
 * @returns {string}
 */
function resolveSubtitleDisplay(row) {
  const explicit = String(row.subtitle ?? '').trim();
  if (explicit) return explicit;
  return inferSubtitleFromContent(row.content);
}

module.exports = {
  inferSubtitleFromContent,
  resolveSubtitleDisplay,
};
