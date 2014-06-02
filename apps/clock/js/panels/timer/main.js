define(function(require) {
'use strict';

var Panel = require('panel');
var Picker = require('picker/picker');
var View = require('view');

var mozL10n = require('l10n');
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

  mozL10n.translate(this.element);

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

  Timer.singleton(function(err, timer) {
    this.timer = timer;
    timer.onend = this.dialog.bind(this);
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
  var nodes = this.nodes;
  var timer = this.timer;

  if (isVisible) {
    // No active timer, or timer has expired...
    //  - Show the new timer dialog
    if (timer === null || timer.state === Timer.INITIAL) {
      this.dialog();
    } else {

      if (timer.state !== Timer.INITIAL) {
        // Active timer exists...

        if (timer.state === Timer.STARTED) {
          // Reviving to started state,
          // show the pause button, hide the start button
          this.toggle(nodes.pause, nodes.start);
        } else if (timer.state === Timer.PAUSED) {
          // Reviving to paused state,
          // show the start button, hide the pause button
          this.toggle(nodes.start, nodes.pause);
        }

        this.dialog({ isVisible: false });
        this.tick();
      }
    }
  } else {
    this.pauseAlarm();
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
  if (opts.isVisible) {
    window.cancelAnimationFrame(this.tickTimeout);
  }
  View.instance(this.nodes.dialog).visible = opts.isVisible;
  return this;
};

Timer.Panel.prototype.tick = function() {
  if (!this.timer || this.timer.remaining <= 0) {
    return;
  }
  this.update(this.timer.remaining);
  this.tickTimeout = window.requestAnimationFrame(this.tick.bind(this));
};

/**
 * Given milliseconds, render the time as a rounded-to-seconds
 * countdown.
 */
Timer.Panel.prototype.update = function(remaining = 0) {
  var newText = Utils.format.hms(Math.round(remaining / 1000), 'hh:mm:ss');
  // Use localized caching here to prevent unnecessary DOM repaints.
  if (this._cachedTimerText !== newText) {
    this.nodes.time.textContent = this._cachedTimerText = newText;
  }
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
  var value = event.target.dataset.value;
  var panel = meta.panel;
  var nodes = panel.nodes;
  var time;

  if (panel.timer && panel.timer[meta.action]) {
    if (typeof value !== 'undefined') {
      // meta.action === 'plus' => panel.timer.plus(+value);

      panel.timer[meta.action](+value);
      panel.update(panel.timer.remaining);
    } else {
      // meta.action => panel.timer[meta.action]()
      //
      // ie.
      //
      // if start => panel.timer.start()
      // if pause => panel.timer.pause()
      // if cancel => panel.timer.cancel()
      //
      panel.timer[meta.action]();
    }

    if (meta.action === 'cancel' || meta.action === 'new') {
      // Restore the panel to configured duration
      panel.update(panel.timer.configuredDuration);

      // Show new timer dialog
      panel.dialog();
      window.cancelAnimationFrame(this.tickTimeout);
    }

    if (meta.action === 'start') {
      panel.toggle(nodes.pause, nodes.start);
      panel.tick();
    }

    if (meta.action === 'pause') {
      panel.toggle(nodes.start, nodes.pause);
      window.cancelAnimationFrame(this.tickTimeout);
    }
  } else {

    if (meta.action === 'create') {
      time = timeFromPicker(panel.picker.value);

      if (!time) {
        return;
      } else {
        panel.timer.duration = time;
      }

      panel.timer.sound = nodes.sound.value;
      panel.timer.vibrate = nodes.vibrate.checked;
      panel.timer.start();
      panel.tick();

      // Update the UI
      panel.toggle(nodes.pause, nodes.start);

      // Hide the new timer dialog
      panel.dialog({ isVisible: false });

    }
  }
  panel.timer.commit(function(err, timer) {
    // NOOP: run after register/save
  });
};

return Timer.Panel;
});
