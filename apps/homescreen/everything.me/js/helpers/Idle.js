/*
 * Idle class
 * Triggers a callback after a specified amout of time gone idle
 */
Evme.Idle = function Evme_Idle() {
  var self = this,
      timer, delay, callback;

  this.isIdle = true;

  // init
  this.init = function init(options) {
    // set params
    delay = options.delay;
    callback = options.callback;

    // start timer
    self.reset();
  };

  // reset timer
  this.reset = function reset(_delay) {
    // set timeout delay value
    if (_delay === undefined) {
      _delay = delay;
    }

    self.isIdle = false;

    // stop previous timer
    clearTimeout(timer);

    // start a new timer
    timer = setTimeout(onIdle, _delay);
  };

  this.advanceBy = function advanceBy(ms) {
    self.reset(delay - ms);
  };

  this.flush = function flush() {
    self.reset(0);
  };

  function onIdle() {
    self.isIdle = true;

    // call callback
    callback();
  }
};
