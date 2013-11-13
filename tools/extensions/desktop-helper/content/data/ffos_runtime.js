FFOS_RUNTIME = {

  /**
   * Emulates a dom request
   * Returns an object and calls it's onsuccess handler.
   */
  domRequest: function(result, timeout) {
    timeout = timeout || 1000;

    return function() {
      var request = { result: result };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, timeout);

      return request;
    }
  },

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
  }
};
var debug = FFOS_RUNTIME.debug;
