'use strict';
/**
 * Returns information about the current app.
 *
 *    apps.getSelf(apps, function(err, app) {
 *      app.origin; // origin of a given app
 *    });
 *
 * @param {Apps} apps state.
 * @param {Function} callback [Err err, <App> app].
 */
function getSelf(apps, callback) {
  return apps.getSelf(callback);
}

module.exports.getSelf = getSelf;
