exports._createNamedExportFrom = function _createNamedExportFrom(obj, localName, importedName) {
  exports[localName] = obj[importedName];
};
