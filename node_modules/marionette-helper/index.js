var Marionette = require('marionette-client');


/**
 * @param {Marionette.Client} client Marionette client to use.
 * @constructor
 */
function MarionetteHelper(client) {
  this.client = client;
}
module.exports = MarionetteHelper;


/**
 * DOM id for window.alert() and window.confirm() message container.
 * @type {string}
 */
MarionetteHelper.ALERT_ID = '#modal-dialog-confirm-message';


/**
 * Make a new helper.
 * @param {Marionette.Client} client Marionette client to use.
 * @param {Object} options Optional map of attributes for Apps.
 * @return {Apps} instance.
 */
MarionetteHelper.setup = function(client, options) {
  return new MarionetteHelper(client);
};


/**
 * @const {number}
 */
MarionetteHelper.DEFAULT_TEST_INTERVAL = 100;


/**
 * @const {number}
 */
MarionetteHelper.DEFAULT_TEST_TIMEOUT = 5000;


MarionetteHelper.prototype = {
  /**
   * @type {Marionette.Client}
   */
  client: null,


  /**
   * Wait for some amount of time by blocking via a marionette call.
   * Only ever use this for debugging!
   * @param {number} millis number of seconds to sleep.
   */
  wait: function(millis) {
    this.client.executeAsyncScript(function(millis) {
      setTimeout(marionetteScriptFinished, millis);
    }, [millis]);
  },


  /**
   * ~*~*~*~*~ o_O Deprecated o_O ~*~*~*~*~
   * Use client#waitFor instead!
   *
   * @param {Function} test some function that returns a boolean.
   * @param {Function} opt_callback optional function to invoke when test
   *     passes or times out.
   * @param {Object} opt_context Optional context object for test block.
   * @param {number} opt_interval Optional test frequency in millis.
   * @param {number} opt_timeout Optional test timeout in millis.
   */
  waitFor: function(test, opt_callback, opt_context, opt_interval,
      opt_timeout) {
    this.client.waitFor(test, {
      interval: opt_interval,
      timeout: opt_timeout
    }, opt_callback);
  },


  /**
   * Wait until a window.alert() or window.confirm() message comes up.
   *
   * @param {string|RegExp} alert to look for. If passed a string, we will
   *     check whether the string is a substring of the alert. If passed a
   *     RegExp, we will check whether it matches the alert.
   * @param {Function} opt_callback optinal function to invoke when alert
   *      becomes visible.
   * @param {number} opt_timeout Optional test timeout in millis.
   */
  waitForAlert: function(alert, opt_callback, opt_timeout) {
    if (typeof opt_callback === 'number') {
      opt_timeout = opt_callback;
      opt_callback = null;
    }

    if (typeof alert === 'string') {
      // Convert the alert to a RegExp.
      alert = new RegExp('.*' + alert + '.*');
    }

    // TODO(gaye): Perhaps we should save the iframe we're in?
    this.client.switchToFrame();
    this.client.waitFor(function() {
      // TODO(gaye): Update this to do a less brittle check once we have
      //     marionette server support.
      var msg = this.client
          .findElement(MarionetteHelper.ALERT_ID)
          .text();
      return alert.test(msg);
    }.bind(this), {
      timeout: opt_timeout
    }, opt_callback);
  },


  /**
   * Wait for an element to be added to the DOM and displayed
   * @param {Marionette.Element|string} el element or some css selector.
   * @return {Marionette.Element} Element we find with css selector.
   */
  waitForElement: function(el) {
    var client = this.client;

    if (!isElement(el)) {
      el = client.findElement(el);
    }

    client.waitFor(el.displayed.bind(el));
    return el;
  },

  /**
   * Wait for an element either hidden or removed from the dom
   * @param {Marionette.Element|string} el element or some css selector.
   */
  waitForElementToDisappear: function(el) {
    if (!isElement(el)) {
      try {
        el = this.client.findElement(el);
      } catch (err) {
        if (err && err.type === 'NoSuchElement') {
          // if the element already can't be found, we are done
          return;
        }
        // something in the element search went horribly wrong
        // so rethrow the error instead of just returning false
        throw err;
      }
    }
    this.client.waitFor(function() {
      try {
        return !el.displayed();
      } catch (err) {
        if (err && err.type === 'StaleElementReference') {
          // the element was removed from the dom, we are done
          return true;
        }
        // the client threw an unexpected error, rethrow it
        throw err;
      }
    });
  }
};


/**
 * @param {Object} maybeElement something that could or could not be an el.
 * @return {boolean} Whether or not we have an element.
 * @private
 */
function isElement(maybeElement) {
  return maybeElement && (maybeElement instanceof Marionette.Element ||
                         (!!maybeElement.id && !!maybeElement.client));
}
