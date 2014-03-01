'use strict';
var Clock = require('./clock');
var Actions = require('marionette-client').Actions;
var MAXFLICK = 1200;

function Timer(client) {
  Clock.apply(this, arguments);
  this._actions = new Actions(client);
}

module.exports = Timer;

Timer.prototype = Object.create(Clock.prototype);

Timer.prototype.launch = function() {
  Clock.prototype.launch.call(this);
  this.navigate('timer');
};

// Each spinner contains a set of vertically-stacked "value elements" which
// communicate possible values of the spinner. As the value changes, the stack
// is offset so the current value is in the center of the spinner. Find this
// center element as a means of determining the current value of the spinner.
var getCenterEl = function(name) {
  var containerEl = this.el.timer.spinner[name];
  var valEls = this.els.timer.spinner[name + 's'];
  var size = containerEl.size();
  var location = containerEl.location();
  var center = location.y + 0.5 * size.height;
  var closestOffset = Infinity;
  var closest;

  valEls.forEach(function(valEl) {
    var valCenter = valEl.location().y + 0.5 * valEl.size().height;
    var dist = Math.abs(valCenter - center);
    if (dist < closestOffset) {
      closest = valEl;
      closestOffset = dist;
    }
  });

  return closest;
};

var getSpinnerValue = function(name) {
  return parseInt(getCenterEl.call(this, name).text(), 10);
};

// Used to sort array of numbers in setSpinnerValue
var compareNumbers = function(a, b) {
  return a - b;
};

// Wait until the spinner's inertial motion has dissipated before continuing.
var waitForSpinStop = function(target) {
  var currentY, lastY;

  this.client.waitFor(function() {
    lastY = currentY;
    currentY = target.location().y;
    return currentY === lastY;
  }, { interval: 200 });
};

// Set the given spinner to the given value according to the following
// heuristic:
//
// 1. Spin with a given direction and force
// 2. Read the value at this position, and:
//    - If the current value is the requested value: return
//    - If the value is less than the requested value: repeat from step #1
//    - If the value is greater than the requested value: decrease the spinning
//      force, invert the spinning direction, and repeat from step #1
var setSpinnerValue = function(name, val) {
  var flickAmt = MAXFLICK;
  var dir = -1;
  var current = -Infinity;
  var target, size, prev, center;

  if (getSpinnerValue.call(this, name) === val) {
    return;
  }

  do {
    target = getCenterEl.call(this, name);
    size = target.size();
    center = {
      x: size.width / 2,
      y: size.height / 2
    };

    this._actions
      .flick(target, center.x, center.y, center.x, center.y + dir * flickAmt)
      .perform();

    waitForSpinStop.call(this, target);

    prev = current;
    current = getSpinnerValue.call(this, name);

    // If the most recent flick has passed over the target value, reverse
    // direction and decrease the flick strength.
    if ([prev, val, current].sort(compareNumbers)[1] === val) {
      flickAmt /= 1.5;
      dir *= -1;
    }
  } while (current !== val);
};

Timer.prototype.getDuration = function() {
  var hourMs = getSpinnerValue.call(this, 'hour') * 60 * 1000 * 1000;
  var minuteMs = getSpinnerValue.call(this, 'minute') * 1000 * 1000;

  return hourMs + minuteMs;
};

Timer.prototype.setDuration = function(hours, minutes, seconds) {
  setSpinnerValue.call(this, 'hour', hours);
  setSpinnerValue.call(this, 'minute', minutes);
};

Timer.prototype.readCountdown = function() {
  return this.el.timer.countdown.text();
};

Timer.prototype.start = function() {
  var createBtn = this.el.timer.createBtn;
  var countdown = this.el.timer.countdown;

  // This operation is not complete until the countdown element is displayed
  // and its text has been updated from the default state of `00:00`.
  this.client.waitFor(function() {
    createBtn.tap();
    return countdown.displayed() && /[1-9]/.test(countdown.text());
  });
};

Timer.prototype.pause = function() {
  this.el.timer.pauseBtn.tap();
};

Timer.prototype.resume = function() {
  this.el.timer.resumeBtn.tap();
};

Timer.prototype.cancel = function() {
  this.el.timer.cancelBtn.tap();
};
