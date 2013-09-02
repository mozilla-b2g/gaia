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

Clock.prototype.launch = function() {
  this.client.apps.launch(Clock.ORIGIN);
  this.client.apps.switchToApp(Clock.ORIGIN);

  this.client.waitFor(ready.bind(this));
};

function ready() {
  return this.el.alarm.analogClock.displayed() ||
    this.el.alarm.digitalClock.displayed();
}

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
    return element.scriptWith(function(element) {
      return !!element.className.match(/\bslide-(in|out)-(right|left)\b/);
    });
  });

  this.client.waitFor(function() {
    return element.scriptWith(function(element) {
      return !element.className.match(/\bslide-(in|out)-(right|left)\b/);
    });
  });
};
