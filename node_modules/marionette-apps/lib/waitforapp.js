/**
 * @const {number}
 */
var SEARCH_TIMEOUT = 10000;


/**
 * @const {number}
 */
var WAIT_BETWEEN_CHECKS = 250;


/**
 * Wait until the app is visible.
 * @param {Apps} apps state.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForApp(apps, source, callback) {
  var client = apps._client.scope({ searchTimeout: SEARCH_TIMEOUT });
  callback = callback || client.defaultCallback;
  if (client.isSync) {
    waitForAppSync(client, source, callback);
  } else {
    waitForAppAsync(client, source, callback);
  }
}


/**
 * Wait until the app is visible using a sync driver.
 * @param {Marionette.Client} client with sync driver.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForAppSync(client, source, callback) {
  var selector = 'iframe[src*="' + source + '"]';

  // find iframe
  var el = client.findElement(selector);
  client.waitFor(function() {
    return el.displayed;
  });

  callback && callback(null, el);
}


/**
 * Wait until the app is visible using an async driver.
 * @param {Marionette.Client} client with async driver.
 * @param {String} source to wait for.
 * @param {Function} callback [Err error, Marionette.Element el].
 */
function waitForAppAsync(client, source, callback) {
  var selector = 'iframe[src*="' + source + '"]';

  // find iframe
  client.findElement(selector, function(err, element) {
    if (err) {
      return callback && callback(err);
    }

    function displayed(done) {
      element.displayed(done);
    }

    client.waitFor(displayed, function(err) {
      callback && callback(err, element);
    });
  });
}


module.exports.waitForApp = waitForApp;
