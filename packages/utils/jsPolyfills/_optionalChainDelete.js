const { _optionalChain } = require('./_optionalChain.js');

exports._optionalChainDelete = function _optionalChainDelete(ops) {
  const result = _optionalChain(ops);
  return result == null ? true : result;
};
