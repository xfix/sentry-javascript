// by checking for loose equality to `null`, we catch both `null` and `undefined`
module.exports._nullishCoalesce = (lhs, rhsFn) => (lhs != null ? lhs : rhsFn());
