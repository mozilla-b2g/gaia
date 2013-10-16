define(function(require) {
'use strict';

var Emitter = require('emitter');
var asyncStorage = require('shared/js/async_storage');
var timer = null;

/**
 * Timer
 *
 * Create new or revive existing timer objects.
 *
 * @param {Object} opts Optional timer object to create or revive
 *                      a new or existing timer object.
 *                 - startAt, number time in ms.
 *                 - endAt, number time in ms.
 *                 - pauseAt, number time in ms.
 *                 - duration, number diff start and end in ms.
 *                 - lapsed, number diff start and now in ms.
 *                 - state, number {0, 1, 2, 3, 4}.
 *                 - sound, string sound name.
 */
function Timer(opts = {}) {
  Emitter.call(this);

  var now = Date.now();

  this.startAt = opts.startAt || now;
  this.endAt = opts.endAt || now + (opts.duration || 0);
  this.pauseAt = opts.pauseAt || 0;
  this.duration = opts.duration || (this.endAt - this.startAt);
  this.lapsed = opts.lapsed || 0;
  this.state = opts.state || Timer.INITIALIZED;
  this.sound = opts.sound || null;
  this.vibrate = opts.vibrate;

  // Existing timers need to be "reactivated"
  // to avoid the duplicate operation guard
  // when calling start()
  if (this.state === Timer.STARTED) {
    this.state = Timer.REACTIVATING;
  }
}

Timer.prototype = Object.create(Emitter.prototype);
Timer.prototype.constructor = Timer;

/**
 * tick Invoke every 1s for a timer whose state is Timer.STARTED.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.tick = function timerTick() {
  var date = new Date();
  var now = +date;
  var end = this.endAt;
  var remaining = end - now;

  if (this.state === Timer.STARTED) {
    if (remaining > 0) {
      this.lapsed = now - this.startAt;
      // if there is 1ms remaining, we show 1 second.
      // if there is 1000ms remaining, we still show 1 second
      // if there is 1001ms - 2 seconds, etc.
      this.emit('tick', Math.ceil(remaining / 1000));

      asyncStorage.setItem('active_timer', JSON.stringify(this));

      // wait for the number of ms remaining until the next second ticks
      setTimeout(this.tick.bind(this), (remaining % 1000) || 1000);
    } else {
      this.emit('tick', 0);
      this.notify().cancel();
    }
  }

};
/**
 * start Start a paused, initialized or reactivated Timer.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.start = function timerStart() {
  var now = Date.now();

  if (this.state === Timer.PAUSED) {
    // Coming back from a paused state...
    // update the Timer object's endAt time to
    // reflect the difference since the pause occurred.
    this.endAt += Date.now() - this.pauseAt;

    // Reset this timer's pauseAt
    if (this.pauseAt > 0) {
      this.pauseAt = 0;
    }
  }

  // In case any time has passed since creating the
  // Timer and starting it
  if (this.state === Timer.INITIALIZED) {
    this.startAt = now;
    this.endAt = now + this.duration;
  }

  if (this.state !== Timer.STARTED) {
    this.state = Timer.STARTED;
    this.tick();
    asyncStorage.setItem('active_timer', JSON.stringify(this));
  }
  return this;
};
/**
 * pause Pause a Timer.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.pause = function timerPause() {
  if (this.state !== Timer.PAUSED) {
    this.state = Timer.PAUSED;
    this.pauseAt = Date.now();
    asyncStorage.setItem('active_timer', JSON.stringify(this));
  }
  return this;
};
/**
 * cancel Cancel a Timer.
 *
 * This will also purge the Timer from persistant storage.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.cancel = function timerCancel() {
  if (this.state !== Timer.CANCELED) {
    this.state = Timer.CANCELED;
    asyncStorage.removeItem('active_timer');
    this.emit('end');
  }
  return this;
};
/**
 * notify Notify user of Timer completion.
 *
 * @return {Timer} Timer instance.
 */
Timer.prototype.notify = function timerNotify() {
  if (this.sound) {
    var ringtonePlayer = new Audio();
    ringtonePlayer.mozAudioChannelType = 'alarm';
    ringtonePlayer.loop = false;

    var selectedAlarmSound = 'shared/resources/media/alarms/' +
                             this.sound;
    ringtonePlayer.src = selectedAlarmSound;
    ringtonePlayer.play();
  }


  if (this.vibrate && navigator.vibrate) {
    navigator.vibrate([200, 200, 200, 200, 200]);
  }

  return this;
};

/**
 * Static "const" Timer states.
 */
Object.defineProperties(Timer, {
  INITIALIZED: { value: 0 },
  STARTED: { value: 1 },
  PAUSED: { value: 2 },
  CANCELED: { value: 3 },
  REACTIVATING: { value: 4 }
});

return Timer;
});
