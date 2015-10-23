'use strict';
/**
 * @const {number}
 */
var SEARCH_TIMEOUT = 10000;

function assertDriverIsSync(client) {
  if (!client.isSync) {
    throw new Error('No longer support async driver. Please use sync driver.');
  }
}

/**
 * Wait until the app is visible.
 * @param {Apps} apps state.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForApp(apps, source, callback) {
  var client = apps._client.scope({ searchTimeout: SEARCH_TIMEOUT });
  callback = callback || client.defaultCallback;

  assertDriverIsSync(client);
  waitForAppSync(
    client, '#windows iframe[src*="' + source + '"]', callback
  );
}

/**
 * Waits until the app that is run as inline activity becomes visible.
 * @param {Apps} apps state.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForActivity(apps, source, callback) {
  var client = apps._client.scope({ searchTimeout: SEARCH_TIMEOUT });
  callback = callback || client.defaultCallback;

  assertDriverIsSync(client);
  waitForAppSync(
    client, '#windows iframe[src*="' + source + '"][parentapp]', callback
  );
}


/**
 * Wait until the app is visible using a sync driver.
 * @param {Marionette.Client} client with sync driver.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForAppSync(client, sourceSelector, callback) {
  var el = client.findElement(sourceSelector);

  // Wait for the iframe is rendered.
  client.waitFor(function() {
    var frameClass = el.scriptWith(function(el) {
      return el.parentNode.parentNode.getAttribute('class');
    });

    if (frameClass !== null) {
      return frameClass.indexOf('render') !== -1;
    } else {
      return true;
    }
  });

  // Wait for the iframe is displayed on screen.
  client.waitFor(function() {
    var transitionState = el.scriptWith(function(el) {
      return el.parentNode.parentNode.getAttribute('transition-state');
    });

    if (transitionState !== null) {
      return transitionState === 'opened';
    } else {
      return el.displayed();
    }
  });

  callback && callback(null, el);
}

module.exports.waitForApp = waitForApp;
module.exports.waitForActivity = waitForActivity;
