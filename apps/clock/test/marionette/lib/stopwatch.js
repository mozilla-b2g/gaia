var Clock = require('./clock');

function Timer(client) {
  Clock.apply(this, arguments);
}

module.exports = Timer;

Timer.prototype = Object.create(Clock.prototype);

Timer.prototype.launch = function() {
  Clock.prototype.launch.call(this);
  this.navigate('stopwatch');
};
