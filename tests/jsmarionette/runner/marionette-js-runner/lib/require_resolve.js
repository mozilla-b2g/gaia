'use strict';
var fsPath = require('path');

module.exports = function requireResolve(path) {
  try {
    return require(path);
  } catch (e) {
    // require + resolve to current cwd if relative path.
    return require(fsPath.resolve(path));
  }
};
