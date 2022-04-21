exports._asyncNullishCoalesce = async function _asyncNullishCoalesce(lhs, rhsFn) {
  if (lhs != null) {
    return lhs;
  } else {
    return await rhsFn();
  }
};
