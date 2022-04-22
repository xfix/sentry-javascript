module.exports._createNamedExportFrom = (obj, localName, importedName) => {
  exports[localName] = obj[importedName];
};
