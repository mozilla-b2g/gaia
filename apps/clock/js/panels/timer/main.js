define(function(require) {
'use strict';

var Panel = require('panel');
var Picker = require('picker/picker');
var View = require('view');

var Utils = require('utils');
var Timer = require('timer');
var Sounds = require('sounds');
var FormButton = require('form_button');
var html = require('text!panels/timer/panel.html');
var AudioManager = require('audio_manager');

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

  element.innerHTML = html;
  this.timer = null;
  this.nodes = {};

  this.picker = new Picker({
    element: this.element.querySelector('#time-picker'),
    pickers: {
      hours: {
        range: [0, 23],
        valueText: 'nSpinnerHours'
      },
      minutes: {
        range: [0, 59],
        isPadded: true,
        valueText: 'nSpinnerMinutes'
      }
    }
  });

  this.ringtonePlayer = AudioManager.createAudioPlayer();

  // Gather elements
  [
    'create', 'cancel', 'dialog', 'pause', 'start', 'sound', 'time', 'vibrate',
    'plus'
  ].forEach(function(id) {
    this.nodes[id] = this.element.querySelector('#timer-' + id);
  }, this);

  // Bind click events
  [
    'create', 'cancel', 'pause', 'start', 'plus'
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
    formatLabel: Sounds.formatLabel
  };
  this.soundButton = new FormButton(sound, soundMenuConfig);
  this.soundButton.refresh();

  element.addEventListener('panel-visibilitychange',
                           this.onvisibilitychange.bind(this));

  // The start button is disable by default (picker at 00:00 by default)
  this.nodes.create.setAttribute('disabled', 'true');

  var create = this.nodes.create;
  var picker = this.picker;

  var enableButton = function() {
    if(timeFromPicker(picker.value) === 0) {
      create.setAttribute('disabled', 'true');
    } else {
      create.removeAttribute('disabled');
    }
  };

  // The start button is enable if the value of the timer is not 00:00
  picker.nodes.minutes.addEventListener('transitionend', enableButton);
  picker.nodes.hours.addEventListener('transitionend', enableButton);

  Timer.singleton(function(err, timer) {
    this.timer = timer;
    var onTimerEvent = this.onTimerEvent.bind(this);
    window.addEventListener('timer-start', onTimerEvent);
    window.addEventListener('timer-pause', onTimerEvent);
    window.addEventListener('timer-tick', onTimerEvent);
    window.addEventListener('timer-end', onTimerEvent);
    if (this.visible) {
      // If the timer panel already became visible before we fetched
      // the timer, we must update the display to show the proper
      // timer status.
      this.onvisibilitychange({ detail: { isVisible: true } });
    }
  }.bind(this));
};

Timer.Panel.prototype = Object.create(Panel.prototype);

Timer.Panel.prototype.onvisibilitychange = function(evt) {
  var isVisible = evt.detail.isVisible;
  var timer = this.timer;

  if (isVisible) {
    // No active timer, or timer has expired...
    //  - Show the new timer dialog
    if (timer === null || timer.state === Timer.INITIAL) {
      this.showDialog();
    } else {
      // Active timer exists, might be started by an external app, so we need
      // to make sure dialog is hidden and buttons/time are on correct state
      this.toggleButtons();
      this.hideDialog();
      this.update();
    }
  } else {
    this.pauseAlarm();
  }
};

Timer.Panel.prototype._toggleDialog = function(isVisible = true) {
  View.instance(this.nodes.dialog).visible = isVisible;
  return this;
};

Timer.Panel.prototype.showDialog = function() {
  return this._toggleDialog(true);
};

Timer.Panel.prototype.hideDialog = function() {
  return this._toggleDialog(false);
};

Timer.Panel.prototype.onTimerEvent = function(event) {
  switch (event.type) {
    case 'timer-start':
      // new timer dialog should always be hidden during timer-start (even
      // if started from external app)
      this.hideDialog();
      /* falls through */
    case 'timer-pause':
      this.toggleButtons();
      /* falls through */
    case 'timer-tick':
      this.update();
      break;
    case 'timer-end':
      this.showDialog();
      break;
  }
};

/**
 * Given milliseconds, render the time as a rounded-to-seconds
 * countdown.
 */
Timer.Panel.prototype.update = function() {
  var remaining = this.timer.remaining;
  var newText = Utils.format.hms(Math.round(remaining / 1000), 'hh:mm:ss');
  // Use localized caching here to prevent unnecessary DOM repaints.
  if (this._cachedTimerText !== newText) {
    this.nodes.time.textContent = this._cachedTimerText = newText;
  }
  return this;
};

Timer.Panel.prototype.toggleButtons = function() {
  var nodes = this.nodes;
  var started = this.timer.state === Timer.STARTED;

  nodes.pause.classList.toggle('hidden', !started);
  nodes.start.classList.toggle('hidden', started);
};

/**
 * previewAlarm Plays the currently selected alarm value on a loop.
 */
Timer.Panel.prototype.previewAlarm = function() {
  var ringtoneName = Utils.getSelectedValueByIndex(this.nodes.sound);
  this.ringtonePlayer.playRingtone(ringtoneName);
};

/**
 * pauseAlarm stops the alarm if it is playing
 */
Timer.Panel.prototype.pauseAlarm = function() {
  this.ringtonePlayer.pause();
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
  var timer = panel.timer;
  var time;

  if (meta.action === 'create') {
    time = timeFromPicker(panel.picker.value);

    if (!time) {
      return;
    }

    timer.duration = time;
    timer.sound = nodes.sound.value;
    timer.vibrate = nodes.vibrate.checked;
    timer.start();

    // Hide the new timer dialog
    panel.hideDialog();
  } else if (meta.action === 'plus') {
    timer.plus(+event.target.dataset.value);
    // need to update immediately cause timer might be paused during click
    panel.update();
  } else {
    // meta.action => timer[meta.action]()
    //
    // ie.
    //
    // if start => timer.start()
    // if pause => timer.pause()
    // if cancel => timer.cancel()
    //
    timer[meta.action]();
  }

  timer.commit();
};

return Timer.Panel;
});
