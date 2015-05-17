'use strict';
/**
 * Find all apps.
 *
 *    apps.list(apps, function(err, list) {
 *      // list is an array of "Apps"
 *      list[0].origin; // origin of a given app
 *    });
 *
 * @param {Apps} apps state.
 * @param {Function} callback [Err err, Array<App> apps].
 * @return {Array}
 */
function list(apps, callback) {
  return apps.mgmt.getAll(callback);
}

module.exports.list = list;
