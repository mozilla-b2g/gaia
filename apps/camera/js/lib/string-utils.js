define(function(require) {
  'use strict';

  var StringUtils = {};

  StringUtils.toCamelCase = function(str) {

    // Convert SNAKE_CASE strings to hyphenated
    str = str.toLowerCase().replace(/_/g, '-');
    return str.replace(/-([a-z])/g, function(g) {
      return g[1].toUpperCase();
    });
  };

  StringUtils.toHyphenate = function(str) {
    return str.replace(/([a-z][A-Z])/g, function(g) {
      return g[0] + '-' + g[1].toLowerCase();
    });
  };

  StringUtils.lastPathComponent = function(path) {
    var pathComponents = path.split('/');
    return pathComponents[pathComponents.length - 1];
  };

  return StringUtils;
});
