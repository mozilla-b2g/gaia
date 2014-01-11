define(function(require) {
'use strict';

var Panel = require('panel');
var Picker = require('picker/picker');
var asyncStorage = require('shared/js/async_storage');
var View = require('view');
var Utils = require('utils');
var Timer = require('timer');
var FormButton = require('form_button');
var _ = require('l10n').get;

var priv = new WeakMap();

function timeFromPicker(value) {
  var hm, ms;
  hm = value.split(':');
  ms = Utils.dateMath.toMS({
        hours: hm[0],
        minutes: hm[1]
       });
  return ms;
}

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
    'pause', 'start', 'sound', 'time', 'vibrate'
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

  var sound = this.nodes.sound;

  sound.addEventListener('blur', this.pauseAlarm.bind(this), false);
  sound.addEventListener('change', this.previewAlarm.bind(this), false);

  var soundMenuConfig = {
    id: 'timer-sound-menu',
    formatLabel: function(sound) {
      return (sound === null || sound === '0') ?
        _('noSound') :
        _(sound.replace('.', '_'));
    }
  };
  this.soundButton = new FormButton(sound, soundMenuConfig);
  this.soundButton.refresh();

  View.instance(element).on(
    'visibilitychange', this.onvisibilitychange.bind(this)
  );
};

Timer.Panel.prototype = Object.create(Panel.prototype);

Timer.Panel.prototype.onvisibilitychange = function(isVisible) {
  var nodes = this.nodes;
  var timer = this.timer;
  var isPaused = false;

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
          // Reviving to started state,
          // show the pause button, hide the start button
          this.toggle(nodes.pause, nodes.start);
        } else {
          // Reviving to paused state,
          // show the start button, hide the pause button
          this.toggle(nodes.start, nodes.pause);

          isPaused = true;
        }

        if (timer.state === Timer.INITIALIZED) {
          this.dialog();
          this.update();
        } else {
          // Calling start will "revive" and update
          // both a paused and not-paused timers.
          //  - Updates the endAt and resets the pauseAt
          //  - Sync the object.
          timer.start();

          if (isPaused) {
            // Immediately re-pause the timer.
            timer.pause();
          }
          this.dialog({ isVisible: false });
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
  show.classList.remove('hidden');
  hide.classList.add('hidden');
  return this;
};

/**
 * previewAlarm Plays the currently selected alarm value on a loop.
 */
Timer.Panel.prototype.previewAlarm = function() {
  if (!this.ringtonePlayer) {
    this.ringtonePlayer = new Audio();
    this.ringtonePlayer.mozAudioChannelType = 'alarm';
    this.ringtonePlayer.loop = true;
  }
  this.ringtonePlayer.pause();

  var ringtoneName = Utils.getSelectedValue(this.nodes.sound);
  var previewRingtone = 'shared/resources/media/alarms/' + ringtoneName;
  this.ringtonePlayer.src = previewRingtone;
  this.ringtonePlayer.play();
};

/**
 * pauseAlarm stops the alarm if it is playing
 */
Timer.Panel.prototype.pauseAlarm = function() {
  if (this.ringtonePlayer) {
    this.ringtonePlayer.pause();
  }
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

      // Restore the panel to 00:00:00
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

      time = timeFromPicker(panel.picker.value);

      if (!time) {
        return;
      }

      // Create a new Timer with the
      // selected duration time.
      panel.timer = new Timer({
        sound: nodes.sound.value,
        duration: time,
        vibrate: nodes.vibrate.checked
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

return Timer.Panel;
});
