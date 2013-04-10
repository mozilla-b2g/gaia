FFOS_RUNTIME = {

  /**
   * This is so we have a single entry-point for the APP window
   * This is needed as the interface to window may be changing soon
   */
  getAppWindow: function(callback) {
    callback(window);
  },

  /**
   * Proxies console.log statements to the app window
   */
  debug: function() {
    var args = Array.slice(arguments);

    this.getAppWindow(function(win) {
      win.console.log.apply(win.console, args);
    });
  },

  /**
   * Creates a navigator shim on the window
   * @param {String} property name.
   * @param {Object} property definition.
   * @param {Boolean} if true, makes a navigator setter for this object. Useful for testing.
   */
  makeNavigatorShim: function(property, definition, makeSetter) {
    try {
      window.navigator.__defineGetter__(property, function() {
        return definition;
      });

      if (makeSetter) {
        window.navigator.__defineSetter__(property, function(prop) {
          definition = prop;
        });
      }

    } catch (e) {
      alert('Error intializing shim (' + property + '): ' + e);
    }
  },

  /**
   * Sends an event to the system frame
   * This is frame independent, and can be triggered from the system app itself
   * @param {Object} The e.detail object passed to the event.
   */
  sendFrameEvent: function(data) {

    var eventDetail = {
      detail: data
    };

    var targetFrame;
    if (/system.gaiamobile.org/.test(location.href)) {
      targetFrame = window;
      var evtObject = new CustomEvent('mozChromeEvent', eventDetail);
      window.dispatchEvent(evtObject);

      return;
    }

    targetFrame = parent;

    targetFrame.postMessage({
      action: 'dispatchMessage',
      payload: eventDetail
    }, 'http://system.gaiamobile.org:8080');

  }
};
var debug = FFOS_RUNTIME.debug;

/**
 * Special System App message behavior
 */
 if (/system.gaiamobile.org/.test(location.href)) {

   /**
    * Handle messages for mozChromeEvent from iframes
    */
  window.addEventListener('message', function(e) {

    if (e.data.action == 'dispatchMessage') {
      FFOS_RUNTIME.getAppWindow(function(win) {
        var evtObject = new CustomEvent('mozChromeEvent', e.data.payload);
        win.dispatchEvent(evtObject);
      });
    }
  });
}

FFOS_RUNTIME.getAppWindow(function(win) {
  /**
   * Adds a nextPaintListener
   * Proxies to setTimeout
   **/
  win.HTMLIFrameElement.prototype.addNextPaintListener = function(callback) {
    setTimeout(callback, 100);
  };

  /**
   * Remove the nextPaintListener
   **/
  win.HTMLIFrameElement.prototype.removeNextPaintListener = function(callback) {

  };
});
