function text(value, max = 200) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}
function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
function email(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
module.exports = { text, positiveNumber, email };
