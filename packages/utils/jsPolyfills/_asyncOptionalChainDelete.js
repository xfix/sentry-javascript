const { _asyncOptionalChain } = require('./_asyncOptionalChain.js');

exports._asyncOptionalChainDelete = async function _asyncOptionalChainDelete(ops) {
  const result = await _asyncOptionalChain(ops);
  return result == null ? true : result;
};
