'use strict';
var switchToApp = require('./switchtoapp').switchToApp;

/**
 * Small search timeout for faster polling.
 * @const {number}
 */
var SEARCH_TIMEOUT = 100;

/**
 * Close a currently running application.
 *
 * @param {Apps} apps state.
 * @param {String} origin of the application.
 * @param {String} [entrypoint] of the application.
 * @param {Function} callback [Error err].
 */
function close(apps, origin, entrypoint, callback) {
  if (typeof entrypoint === 'function') {
    callback = entrypoint;
    entrypoint = null;
  }

  // populated during the app switch contains the "App" instance.
  var appInstance;

  var client = apps._client.scope({
    searchTimeout: SEARCH_TIMEOUT
  });

  /**
   * Go back to root frame now that app is closed.
   */
  function switchToRoot(app, err) {
    if (err) return callback(err);
    client.switchToFrame(waitUntilClosed);
  }

  /**
   * Wait until the iframe with the origin is no longer in the dom tree.
   */
  function waitUntilClosed(err) {
    if (err) return callback(err);

    var query = 'iframe[src*="' + appInstance.source + '"]';
    // wait until the element has been removed.
    client.waitFor(function(done) {
      // poll until it's gone
      client.findElement(query, function(err) {
        // no element is found is the success condition.
        if (err && err.type === 'NoSuchElement') {
          return done(null, true);
        }

        // error or element still exists...
        done(err, false);
      });
    }, callback);
  }


  // switch to root context
  client.switchToFrame();

  // find the app we are looking for
  return switchToApp(apps, origin, entrypoint, function(err, el, app) {
    if (err) {
      return callback(err);
    }

    // used in the following callbacks to ensure the right frame is closed.
    appInstance = app;

    return client.executeScript(function() { window.close(); }, switchToRoot);
  });
}

module.exports.close = close;
