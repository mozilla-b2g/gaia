'use strict';
var getApp = require('./getapp').getApp;
var waitForApp = require('./waitforapp').waitForApp;

/**
 * Launch an application based on its origin and optionally entrypoint.
 * Will wait until app's iframe is visible before firing callback.
 *
 *    launch(apps, 'app://calendar.gaiamobile.org', function(err, app) {
 *      // yey
 *    });
 *
 * @param {Apps} apps instance.
 * @param {String} origin of the app.
 * @param {String} [entrypoint] for the app.
 * @param {Function} callback [Error err, App app].
 */
function launch(apps, origin, entrypoint, callback) {
  if (typeof entrypoint === 'function') {
    callback = entrypoint;
    entrypoint = null;
  }

  callback = callback || apps._client.defaultCallback;

  // Wait for the system to be fully loaded.
  var client = apps._client;
  var body = client.findElement('body');
  client.waitFor(function() {
    return body.getAttribute('ready-state') == 'fullyLoaded';
  }, { timeout: 60000 });

  // launch the given app
  return getApp(apps, origin, entrypoint, function(err, app) {
    if (err) {
      return callback(err);
    }

    // if a null entrypoint is given it is safely ignored.
    app.launch(entrypoint);

    // wait for this app to be visible
    return waitForApp(apps, app.source, function(err, element) {
      return callback(err, app, element);
    });
  });
}

module.exports.launch = launch;
