(function(exports) {
'use strict';

/**
 * Creates a calendar namespace.
 *
 *    // Export a view
 *    Calendar.ns('Views').Month = Month;
 *
 * @param {String} namespace like "Views".
 * @param {Boolean} checkOnly will not create new namespaces when true.
 * @return {Object} namespace ref.
 */
exports.ns = function(path, checkOnly) {
  var parent = exports;
  var scopes = path.split('.');

  if (checkOnly) {
    return scopes.every((scope) => {
      if (!(scope in parent)) {
        return false;
      }

      parent = parent[scope];
      return true;
    });
  }

  scopes.forEach((scope) => {
    if (!(scope in parent)) {
      parent[scope] = {};
    }

    parent = parent[scope];
  });

  return parent;
};

}(Calendar));
