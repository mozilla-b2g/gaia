/* global Components, XPCOMUtils, Services */
'use strict';
/**
 * This is a very blunt instrument designed to load some JS (encoded in dataURI)
 * before each and every content page load (apps, browser tabs, etc...)
 *
 * Its critical to remember this will _not_ run in the node process.
 *
 * @param {String} dataURI encoded javascript.
 */
function xpcomLoadFrameScript(dataURI) {
  (function() {
    var Cu = Components.utils;
    var Ci = Components.interfaces;

    Cu.import('resource://gre/modules/Services.jsm');
    Cu.import('resource://gre/modules/XPCOMUtils.jsm');

    XPCOMUtils.defineLazyServiceGetter(this, 'ppmm',
      '@mozilla.org/parentprocessmessagemanager;1', 'nsIMessageBroadcaster');

    // TODO: Remove `legacyLoader`.
    // See "Bug 952177 - [marionette-content-script] Remove listeners for
    // deprecated Service notifications"
    var legacyLoader = {
      init: function() {
        Services.obs.addObserver(
          this, 'remote-browser-frame-show', false
        );

        Services.obs.addObserver(
          this, 'in-process-browser-or-app-frame-shown', false
        );
      },

      observe: function(subject, topic, data) {
        var frameLoader = subject.QueryInterface(Ci.nsIFrameLoader);
        var mm = frameLoader.messageManager;

        mm.loadFrameScript(
          dataURI,
          true
        );
      }
    };

    legacyLoader.init();

    var Loader = function() {};
    Loader.prototype.attach = function(service) {
      service.addObserver(this, 'remote-browser-shown', false);
      service.addObserver(this, 'inprocess-browser-shown', false);
    };
    Loader.prototype.observe = function(subject, topic, data) {
      var frameLoader = subject.QueryInterface(Ci.nsIFrameLoader);

      // The 'remote-browser-shown' and 'inprocess-browser-shown' notifications
      // are sent from all frames. Ignore all but those originating from a
      // "browser or app" frame.
      if (!frameLoader.ownerIsBrowserOrAppFrame) {
        return;
      }

      legacyLoader.observe.apply(null, arguments);
    };

    var loader = new Loader();
    loader.attach(Services.obs);
  }());
}

var fs = require('fs');

/**
 * @param {String} file to encode.
 * @return {String} base64 encoded javascript data:uri.
 */
function loadEncodedJS(file) {
  // sync read just like `require` (it needs to a datauri so gecko will loads it
  // as javascript).
  return 'data:text/javascript;base64,' + fs.readFileSync(file, 'base64');

}

/**
 * Node wrapper around load frame script.
 *
 * @param {Marionette.Client} client to use.
 * @param {String} path of file to load.
 * @param {Function} callback optional callback.
 */
function loadFrameScript(client, path, callback) {
  client.executeScript(xpcomLoadFrameScript, [loadEncodedJS(path)], callback);
}

function plugin(client, options) {
  var chrome = client.scope({ context: 'chrome' });
  var inject = loadFrameScript.bind(this, chrome);
  return { inject: inject };
}

module.exports = plugin;
