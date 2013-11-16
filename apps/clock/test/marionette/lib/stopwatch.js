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
  this.el.stopwatch.startBtn.tap();
};

Stopwatch.prototype.lap = function() {
  this.el.stopwatch.lapBtn.tap();
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
  return button.displayed() && !button.getAttribute('disabled');
};
