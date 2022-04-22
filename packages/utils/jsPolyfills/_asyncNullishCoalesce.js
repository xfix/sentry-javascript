// by checking for loose equality to `null`, we catch both `null` and `undefined`
module.exports = { _asyncNullishCoalesce: async (lhs, rhsFn) => (lhs != null ? lhs : rhsFn()) };
