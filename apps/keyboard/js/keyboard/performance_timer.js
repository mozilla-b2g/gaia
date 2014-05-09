'use strict';

/* global dump, performance */

(function(exports) {

var PerformanceTimer = function PerformanceTimer() {
  this._startTimer = {};
};

PerformanceTimer.prototype.start = function() {
  this._startTime = Date.now();
};

PerformanceTimer.prototype.PRINT_LOG = false;

PerformanceTimer.prototype.TAG = 'kbdTime';

PerformanceTimer.prototype.startTimer = function(key) {
  this._startTimer[key] = Date.now();
};

PerformanceTimer.prototype.printTime = function(text, timers) {
  if (!this.PRINT_LOG) {
    return;
  }

  var t = Date.now();
  var textToPrint = [text];
  textToPrint.push(t - this._startTime);
  textToPrint.push(t - performance.timing.domLoading);

  if (Array.isArray(timers)) {
    timers.forEach(function(key) {
      if (key in this._startTimer) {
        textToPrint.push(t - this._startTimer[key]);
      }
    });
  } else if (typeof timers === 'string' && timers in this._startTimer) {
    textToPrint.push(t - this._startTimer[timers]);
  }

  dump('[' + this.TAG + '] ' + textToPrint.join(', ') + '\n');
};

exports.PerformanceTimer = PerformanceTimer;

})(window);
