'use strict';
var getApp = require('./getapp').getApp;
var url = require('url');
var waitForApp = require('./waitforapp').waitForApp;

var homescreenURL;
function getHomescreen(client) {
  var chrome = client.scope({ context: 'chrome' });
  if (!homescreenURL) {
    var app = chrome.executeAsyncScript(function() {
      var lock = window.navigator.mozSettings.createLock();
      var req = lock.get('homescreen.manifestURL');
      req.onsuccess = function() {
        marionetteScriptFinished(req.result['homescreen.manifestURL']);
      };
      req.onerror = function() {
        console.error('Error while fetching setting: ' + req.error.name);
        marionetteScriptFinished({ error: req.error.name });
      };
    });
    homescreenURL = url.parse(app).hostname;
  }
  return homescreenURL;
}

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

  // Wait for Homescreen app is rendered.
  var client = apps._client.scope({ searchTimeout: 10000,
                                    scriptTimeout: 10000 });
  var homescreenApp = getHomescreen(client);

  client.waitFor(function() {
    var el;
    try {
      el = client.findElement('iframe[src*="' + homescreenApp + '"]');
    } catch (e) {
      return false;
    }

    var frameClass = el.scriptWith(function(el) {
      return el.parentNode.getAttribute('class');
    });

    if (frameClass !== null) {
      return frameClass.indexOf('render') !== -1;
    } else {
      return el.displayed();
    }
  });

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
