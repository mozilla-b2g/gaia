'use strict';
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
    // Add a small value to the scriptTimeout used for this
    // `executeAsyncScript` invocation in order to account for the lack of
    // millisecond precision in `setTimeout`.
    var schedulerTolerance = 1000;
    // Ensure that the asynchronous script will not raise a timeout error, even
    // when the requested duration exceeds the client's current `scriptTimeout`
    // value.
    var scope = this.client.scope({
      scriptTimeout: millis + schedulerTolerance
    });

    scope.executeAsyncScript(function(millis) {
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

    client.waitFor(function() {
      try {
        return el.displayed.call(el);
      } catch (err) {
        if (err && err.type === 'ElementNotAccessibleError') {
          // the element is not yet accessible
          return false;
        }
        // the client threw an unexpected error, rethrow it
        throw err;
      }
    });
    return el;
  },

  /**
   * Wait for a child element of some parent to be added to the DOM
   * and displayed.
   *
   * @param {Marionette.Element|string} parent element or css selector.
   * @param {Marionette.Element|string} el element or css selector.
   * @return {Marionette.Element} Element we find with css selector.
   */
  waitForChild: function(parent, el) {
    parent = this.waitForElement(parent);
    if (!isElement(el)) {
      el = parent.findElement(el);
    }

    return this.waitForElement(el);
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
  },

  /**
   * Tap input element and fill the value.
   * To do: Support the time, date, datetime, and datetime-local input
   * correctly.
   * Please refer to http://bugzil.la/976453.
   *
   * @param {Marionette.Element|String} el marionette element object or
   *                                    css selector.
   * @param {String|Object} input text or datetime object for the input.
   */
  fillInputField: function(el, input) {
    if (!isElement(el)) {
      el = this.client.findElement(el);
    }
    var inputText;
    if (input instanceof Date) {
      // XXX: bug 978685
      // We cannot get type through element.getAttribute('type') if the type is
      // datetime or datetime-local, so we use below workaround.
      var eleType = this.client.executeScript(function(el) {
        return el.getAttribute('type');
      }, [el]);

      switch (eleType) {
        case 'date':
          inputText = input.getFullYear() + '-' +
                      addLeadZero(input.getMonth()) +
                      '-' + addLeadZero(input.getDate());
          break;
        case 'time':
          inputText = addLeadZero(input.getHours()) + ':' +
                      addLeadZero(input.getMinutes());
          break;
        case 'datetime':
          inputText = input.toISOString();
          break;
        case 'datetime-local':
          inputText = input.getFullYear() + '-' +
                      addLeadZero(input.getMonth()) +
                      '-' + addLeadZero(input.getDate()) + 'T' +
                      addLeadZero(input.getHours()) + ':' +
                      addLeadZero(input.getMinutes()) + ':' +
                      addLeadZero(input.getSeconds()) + '.' +
                      input.getMilliseconds();
          break;
        default:
          throw new Error('The ' + eleType + ' type element is not supported' +
                          ' when the input param is a Date object.');
      }
    } else {
      inputText = input;
    }

    // Below script is to trigger input event on the input correctly and fill
    // the data.
    this.client.executeScript(function(el, value) {
      el.value = value;
      var evt = new Event('input', {
        'view': window,
        'bubbles': true,
        'cancelable': true
      });
      el.dispatchEvent(evt);
    }, [el, inputText]);

    // We add lead zero on single digit. ex: 1 -> 01, 9 -> 09.
    function addLeadZero(num) {
      return num >= 10 ? num : ('0' + num);
    }
  },

  /**
   * Select specific option from target select element.
   *
   * @param {Marionette.Element|String} el element or some css selector.
   * @param {String} optionText text for the option.
   */
  tapSelectOption: function(el, optionText) {
    var selectedOption = null;

    if (!isElement(el)) {
      el = this.client.findElement(el);
    }

    el.findElements('option').some(function(optionEl) {
      if (optionEl.text() === optionText) {
        selectedOption = optionEl;
        return true;
      }
      return false;
    });

    selectedOption.scriptWith(function(selectedOptionEl) {
      selectedOptionEl.selected = true;
    });

    el.scriptWith(function(selectEl) {
      var evt = new Event('change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
      });
      selectEl.dispatchEvent(evt);
    });
  },

  /**
   * Get the first element that matches the selector by testing the element
   * itself and traversing up through its ancestors in the DOM tree.
   *
   * @param {Marionette.Element|String} el element or some css selector where
   *                                    the search should start.
   * @param {String} selector A string containing a selector expression to
   *                          match elements against.
   * @return {Marionette.Element|undefined} Element found by selector
   */
  closest: function(el, selector) {
    if (!isElement(el)) {
      el = this.client.findElement(el);
    }

    var result = this.client.executeScript(function(el, selector) {
      // HTMLDocument doesn't have mozMatchesSelector and can't be matched
      while (el && el !== document.documentElement) {
        // XXX: firefox 30 still needs prefix
        if (el.mozMatchesSelector(selector)) {
          return el;
        }
        el = el.parentNode;
      }
    }, [el, selector]);

    // executeScript returns "null" by default
    return result || undefined;
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
