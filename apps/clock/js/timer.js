(function(exports) {
'use strict';

var priv = new WeakMap();
var timer = null;
var panel = null;

function duration(value) {
  var hm = value.split(':');
  var duration = 0;
  var unit;

  for (var i = 0; i < hm.length; i++) {
    unit = Math.pow(60, hm.length - 1 - i);
    duration += unit * 1000 * hm[i];
  }

  return duration;
}


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
  var sec = Math.floor(now / 1000);
  var end = Math.floor(this.endAt / 1000);

  if (this.state === Timer.STARTED) {
    if (sec <= end) {
      this.lapsed = now - this.startAt;
      this.emit('tick', end - sec);

      asyncStorage.setItem('active_timer', JSON.stringify(this));
    }

    if (sec === end + 1) {
      this.notify().cancel();
    }
  }

  setTimeout(this.tick.bind(this), 1000 - date.getMilliseconds());
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
  // TODO: Add sound playback notification
  //
  if (navigator.vibrate) {
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

/**
 * Timer.Panel
 *
 * Construct a UI panel for the Timer panel.
 *
 * @return {Timer.Panel} Timer.Panel object.
 *
 */
Timer.Panel = function(element) {
  Panel.apply(this, arguments);

  this.timer = null;
  this.nodes = {};

  this.picker = new Picker({
    element: this.element.querySelector('#time-picker'),
    pickers: {
      hours: {
        range: [0, 23]
      },
      minutes: {
        range: [0, 59],
        isPadded: true
      },
      seconds: {
        range: [0, 59],
        isPadded: true
      }
    }
  });

  asyncStorage.getItem('active_timer', function(result) {
    if (result !== null) {
      this.timer = new Timer(JSON.parse(result));
    }
  }.bind(this));

  // Gather elements
  [
    'create', 'cancel', 'dialog',
    'pause', 'start', 'sound', 'time'
  ].forEach(function(id) {
    this.nodes[id] = this.element.querySelector('#timer-' + id);
  }, this);

  // Bind click events
  [
    'create', 'cancel', 'pause', 'start'
  ].forEach(function(action) {
    var element = this.nodes[action];

    if (priv.has(element)) {
      priv.delete(element);
    }

    priv.set(element, {
      action: action,
      panel: this
    });

    element.addEventListener('click', this.onclick.bind(this), false);
  }, this);

  View.instance(element).on(
    'visibilitychange', this.onvisibilitychange.bind(this)
  );
};

Timer.Panel.prototype = Object.create(Panel.prototype);

Timer.Panel.prototype.onvisibilitychange = function(isVisible) {
  var nodes = this.nodes;
  var dialog = View.instance(this.nodes.dialog);
  var timer = this.timer;

  if (isVisible) {
    // No active timer, or timer has expired...
    //
    //  - Cancel the expired timer
    //  - Show the new timer dialog
    //
    if (timer === null || timer.endAt < Date.now()) {
      if (timer) {
        timer.cancel();
      }
      this.dialog();
    } else {

      if (timer.state !== Timer.STARTED) {
        // Active timer exists...
        timer.on('tick', this.update.bind(this));
        timer.on('end', this.dialog.bind(this));

        if (timer.state === Timer.REACTIVATING) {
          this.toggle(nodes.pause, nodes.start);
          timer.start();
        } else {
          this.toggle(nodes.start, nodes.pause);
        }
      }
    }
  }
};

/**
 * dialog Show or hide the Timer creation dialog.
 *
 * @param {Object} opts Optional parameters to show/hide dialog.
 *                      - isVisible, true|false (show|hide).
 *                        Defaults to true.
 *
 * @return {Object} Timer.Panel.
 */
Timer.Panel.prototype.dialog = function(opts = { isVisible: true }) {
  View.instance(this.nodes.dialog).visible = opts.isVisible;

  setTimeout(this.picker.reset.bind(this.picker), 0);
  return this;
};

Timer.Panel.prototype.elapsed = function() {
  // display the "elapsed time since notification" screen
  return this;
};

/**
 * update Update the Timer UI's time display
 * @param  {Number} remaining Seconds remaining in timer countdown.
 *                            Defaults to 0.
 *
 * @return {Object} Timer.Panel.
 */
Timer.Panel.prototype.update = function(remaining = 0) {
  // this should localize
  // console.log(this);
  this.nodes.time.textContent = Utils.format.hms(remaining, 'hh:mm:ss');
  return this;
};

/**
 * toggle Toggle any two UI elements with each other.
 *
 * @param  {Node} show The node to show.
 * @param  {Node} hide The node to hide.
 *
 * @return {Object} Timer.Panel.
 */
Timer.Panel.prototype.toggle = function(show, hide) {
  show.classList.remove('hide');
  hide.classList.add('hide');
  return this;
};

/**
 * handleEvent Handler for all panel bound UI events.
 *             (`this` context object is not Timer.Panel)
 *
 * @param  {Event} event The Event object.
 */
Timer.Panel.prototype.onclick = function(event) {
  var meta = priv.get(event.target);
  var panel = meta.panel;
  var nodes = panel.nodes;
  var time;

  if (panel.timer && panel.timer[meta.action]) {
    // meta.action => panel.timer[meta.action]()
    //
    // ie.
    //
    // if start => panel.timer.start()
    // if pause => panel.timer.pause()
    // if cancel => panel.timer.cancel()
    //
    panel.timer[meta.action]();

    if (meta.action === 'cancel' || meta.action === 'new') {
      // Reset shared timer object
      panel.timer = null;

      // Restore the panel to 00:00
      panel.update(0);

      // Show new timer dialog
      panel.dialog();
    }

    if (meta.action === 'start') {
      panel.toggle(nodes.pause, nodes.start);
    }

    if (meta.action === 'pause') {
      panel.toggle(nodes.start, nodes.pause);
    }
  } else {

    if (meta.action === 'create') {

      time = duration(panel.picker.value);

      if (!time) {
        return;
      }

      // Create a new Timer with the
      // selected duration time.
      panel.timer = new Timer({
        sound: nodes.sound.value,
        duration: duration(panel.picker.value)
      });

      // Bind the tick and end events to the
      // newly created timer object.
      panel.timer.on('tick', panel.update.bind(panel)).start();
      panel.timer.on('end', panel.dialog.bind(panel));

      // Update the UI
      panel.toggle(nodes.pause, nodes.start);

      // Hide the new timer dialog
      panel.dialog({ isVisible: false });
    }
  }
};

exports.Timer = Timer;

}(this));
