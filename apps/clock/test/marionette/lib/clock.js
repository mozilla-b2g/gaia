'use strict';
var selectors = require('./selectors');
var utils = require('./utils');

function isLeaf(value) {
  return typeof value === 'string' || (value.query && value.method);
}

function Clock(client) {
  this.client = client;

  this.el = utils.deepMap(selectors, function(key, value) {
      var method = value.method || 'css selector';
      var query = value.query || value;
      Object.defineProperty(this, key, {
        get: function() {
          return client.findElement(query, method);
        }
      });
    }, { isLeaf: isLeaf });

  this.els = utils.deepMap(selectors, function(key, value) {
      var method = value.method || 'css selector';
      var query = value.query || value;
      Object.defineProperty(this, key, {
        get: function() {
          return client.findElements(query, method);
        }
      });
    }, { isLeaf: isLeaf });
}

module.exports = Clock;

Clock.ORIGIN = 'app://clock.gaiamobile.org';

/**
 * Create a Date object whose value is the supplied number of milliseconds from
 * the current system time.
 *
 * @param {Number} ms - The number of milliseconds from the current time to
 *                      create the Date. Optional (defaults to 0). May be
 *                      negative.
 * @return {Date}
 */
Clock.prototype.fromNow = function(ms) {
  ms = ms || 0;
  ms += this.client.executeScript(function() {
    return Date.now();
  });
  return new Date(ms);
};

var ready = function() {
  return this.el.alarm.analogClock.displayed() ||
    this.el.alarm.digitalClock.displayed();
};

Clock.prototype.launch = function() {
  this.client.apps.launch(Clock.ORIGIN);
  this.client.apps.switchToApp(Clock.ORIGIN);

  this.client.waitFor(ready.bind(this));
};

Clock.prototype.navigate = function(panelName) {
  var button, panel;
  if (panelName === 'alarmForm') {
    button = this.el.alarmFormBtn;
    panel = this.el.alarmForm;
  } else {
    button = this.el.tabs[panelName];
    panel = this.el.panels[panelName];
  }

  button.tap();
  this.waitForSlideEnd(panel);
};

Clock.prototype.waitForSlideEnd = function(element) {
  this.client.waitFor(function() {
    return element.displayed();
  });

  this.client.waitFor(function() {
    return element.scriptWith(function(element) {
      return !element.className.match(/\bslide-(in|out)-(right|left)\b/);
    });
  });
};

/**
 * Execute an action on an unstable DOM element.
 * In some cases, UI may be implemented by clearing some container DOM node and
 * re-rendering its contents completely. Because interaction cannot be modeled
 * as an atomic operation with Marionette (elements are always retrieved with
 * one command and acted upon with another), Marionette scripts that interact
 * with such UIs are prone to intermittent "Stale element reference" errors (an
 * element may be re-rendered while an interaction is taking place).
 *
 * This function allows tests to be written as though interaction were an
 * atomic operation.
 *
 * @param {Function} getElement - A function that returns a reference to an
 *                                the element.
 * @param {Function} interactWith - A function that accepts the element as its
 *                                  first argument and uses it as a target for
 *                                  some Marionette action.
 * @return {mixed} The result of the `interactWith` function.
 */
Clock.prototype.safeInteract = function(getElement, interactWith) {
  var result;

  this.client.waitFor(function() {
    var el = getElement.call(this);

    try {
      result = interactWith(el);
      return true;
    } catch (err) {
      if (!/\bstale\b/i.test(err.message)) {
        throw err;
      }
    }
  }.bind(this));

  return result;
};
