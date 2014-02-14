'use strict';
var Clock = require('./clock');

function Stopwatch(client) {
  Clock.apply(this, arguments);
}

module.exports = Stopwatch;

Stopwatch.prototype = Object.create(Clock.prototype);

Stopwatch.prototype.launch = function() {
  Clock.prototype.launch.call(this);
  this.navigate('stopwatch');
};

Stopwatch.prototype.start = function() {
  var stoppedTime = this.read();
  this.el.stopwatch.startBtn.tap();

  // Do not consider the "start" operation complete until the stopwatch time
  // has been modified.
  this.client.waitFor(function() {
    return this.read() !== stoppedTime;
  }.bind(this));
};

Stopwatch.prototype.lap = function() {
  var preLapTime = this.read();
  var initialLapCount = this.readLaps().length;
  this.el.stopwatch.lapBtn.tap();

  // Do not consider the "lap" operation complete until a new lap entry has
  // been created and the stopwatch has been modified.
  this.client.waitFor(function() {
    var lapCount = this.readLaps().length;
    return lapCount > initialLapCount && this.read() !== preLapTime;
  }.bind(this));
};

Stopwatch.prototype.reset = function() {
  this.el.stopwatch.resetBtn.tap();
};

Stopwatch.prototype.pause = function() {
  this.el.stopwatch.pauseBtn.tap();
};

Stopwatch.prototype.read = function() {
  return this.el.stopwatch.timeDisplay.text();
};

Stopwatch.prototype.readLaps = function() {
  return this.els.stopwatch.lap.map(function(lapEl) {
    return lapEl.text();
  });
};

Stopwatch.prototype.isButtonUsable = function(name) {
  var button = this.el.stopwatch[name + 'Btn'];
  return button.displayed() && button.getAttribute('disabled') === 'false';
};
