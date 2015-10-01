'use strict';
/* global KeyEvent */
define(function(require) {
var Alarm = require('alarm');
var ClockView = require('panels/alarm/clock_view');
var AudioManager = require('audio_manager');
var FormButton = require('form_button');
var Sounds = require('sounds');
var Utils = require('utils');
var mozL10n = require('l10n');
var Panel = require('panel');
var _ = mozL10n.get;
var html = require('text!panels/alarm_edit/panel.html');
var constants = require('constants');

var AlarmEdit = function() {
  Panel.apply(this, arguments);
  this.element.innerHTML = html;

  var handleDomEvent = this.handleDomEvent.bind(this);

  this.element.addEventListener('panel-visibilitychange',
                                this.handleVisibilityChange.bind(this));

  this.selects = {};
  [
    'time', 'repeat', 'sound', 'snooze'
  ].forEach(function(id) {
    this.selects[id] = this.element.querySelector('#' + id + '-select');
  }, this);

  this.inputs = {
    name: this.element.querySelector('#alarm-name'),
    volume: this.element.querySelector('#alarm-volume-input')
  };

  this.headers = {
    header: this.element.querySelector('#alarm-header')
  };

  this.buttons = {};
  [
    'delete', 'done'
  ].forEach(function(id) {
    this.buttons[id] = this.element.querySelector('#alarm-' + id);
  }, this);

  this.checkboxes = {
    vibrate: this.element.querySelector('#vibrate-checkbox')
  };

  this.buttons.time = new FormButton(this.selects.time, {
    formatLabel: function(value) {
      var date = new Date();
      // This split(':') is locale-independent per HTML5 <input type=time>
      var splitValue = value.split(':');
      date.setHours(splitValue[0]);
      date.setMinutes(splitValue[1]);
      return Utils.getLocalizedTimeText(date);
    }.bind(this)
  });
  this.buttons.repeat = new FormButton(this.selects.repeat, {
    selectOptions: constants.DAYS_STARTING_MONDAY,
    id: 'repeat-menu',
    formatLabel: function(daysOfWeek) {
      return Utils.summarizeDaysOfWeek(daysOfWeek);
    }.bind(this)
  });
  this.buttons.sound = new FormButton(this.selects.sound, {
    id: 'sound-menu',
    formatLabel: Sounds.formatLabel
  });
  this.buttons.snooze = new FormButton(this.selects.snooze, {
    id: 'snooze-menu',
    formatLabel: function(snooze) {
      return _('nMinutes', {n: snooze});
    }
  });

  this.scrollList = this.element.querySelector('#edit-alarm');
  this.sundayListItem = this.element.querySelector('#repeat-select-sunday');

  // When the system pops up the ValueSelector, it inadvertently
  // messes with the scrollTop of the current panel. This is a
  // workaround for bug 981255 until the Edit panel becomes a new
  // window per bug 922651.
  this.element.addEventListener('scroll', function() {
    this.element.scrollTop = 0;
  }.bind(this));

  // When the language changes, the value of 'weekStartsOnMonday'
  // might change.
  mozL10n.ready(this.updateL10n.bind(this));

  this.headers.header.addEventListener('action', handleDomEvent);
  this.buttons.done.addEventListener('click', handleDomEvent);
  this.selects.sound.addEventListener('change', handleDomEvent);
  this.selects.sound.addEventListener('blur', handleDomEvent);
  this.selects.repeat.addEventListener('change', handleDomEvent);
  this.buttons.delete.addEventListener('click', handleDomEvent);
  this.inputs.name.addEventListener('keypress', this.handleNameInput);
  this.inputs.volume.addEventListener('change', handleDomEvent);

  this.isSaving = false;

  // If the phone locks during preview, or an alarm fires, pause the sound.
  // TODO: When this is no longer a singleton, unbind the listener.
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      this.stopPreviewSound();
      // Ensure the keyboard goes away.
      document.activeElement.blur();
    }
  }.bind(this));
};

AlarmEdit.prototype = Object.create(Panel.prototype);

Utils.extend(AlarmEdit.prototype, {

  alarm: null,
  ringtonePlayer: AudioManager.createAudioPlayer(),

  handleNameInput: function(evt) {
    // If the user presses enter on the name label, dismiss the
    // keyboard to allow them to continue filling out the other
    // fields. This is not in the `handleEvent` function because we
    // only want to call `.preventDefault` sometimes.
    if (evt.keyCode === KeyEvent.DOM_VK_RETURN) {
      evt.preventDefault();
      evt.target.blur();
    }
  },

  updateL10n: function() {
    // Move the weekdays around to properly account for whether the
    // week starts on Sunday or Monday.
    var weekStartsOnMonday = parseInt(_('weekStartsOnMonday'), 10);
    var parent = this.sundayListItem.parentElement;
    if (weekStartsOnMonday) {
      // Sunday gets moved to the end.
      parent.appendChild(this.sundayListItem);
    } else {
      // Sunday goes first.
      parent.insertBefore(this.sundayListItem, parent.firstChild);
    }
  },

  // The name `handleEvent` is already defined by the Panel class, so this
  // method must be named uniquely to avoid overriding that functionality.
  handleDomEvent: function aev_handleDomEvent(evt) {
    evt.preventDefault();
    var input = evt.target;
    if (!input) {
      return;
    }

    switch (input) {
      case this.headers.header:
        ClockView.show();
        break;
      case this.buttons.done:
        ClockView.show();
        this.save();
        break;
      case this.selects.sound:
        switch (evt.type) {
          case 'change':
            this.previewSound();
            break;
          case 'blur':
            this.stopPreviewSound();
            break;
        }
        break;
      case this.buttons.delete:
        ClockView.show();
        this.delete();
        break;
      case this.selects.repeat:
        this.alarm.repeat = this.buttons.repeat.value;
        break;
      case this.inputs.volume:
        // Alarm Volume is applied to all alarms.
        AudioManager.setAlarmVolume(this.getAlarmVolumeValue());
        break;
    }
  },

  focusMenu: function aev_focusMenu(menu) {
    setTimeout(function() { menu.focus(); }, 10);
  },

  handleVisibilityChange: function aev_show(evt) {
    var isVisible = evt.detail.isVisible;
    var alarm;
    if (!isVisible) {
      return;
    }
    // `navData` is set by the App module in `navigate`.
    alarm = this.navData;
    // scroll to top of form list
    this.scrollList.scrollTop = 0;

    this.element.classList.toggle('new', !alarm);
    this.alarm = new Alarm(alarm); // alarm may be null

    // Set to empty string if the Alarm doesn't have an ID,
    // otherwise dataset will automatically stringify it
    // to be "undefined" rather than "".
    this.element.dataset.id = this.alarm.id || '';
    this.inputs.name.value = this.alarm.label;

    AudioManager.requestAlarmVolume().then(function(volume) {
      this.inputs.volume.value = AudioManager.getAlarmVolume();
    }.bind(this));

    // Init time, repeat, sound, snooze selection menu.
    this.initTimeSelect();
    this.initRepeatSelect();
    this.initSoundSelect();
    this.initSnoozeSelect();
    this.checkboxes.vibrate.checked = this.alarm.vibrate;

    // Update the labels for any FormButton dropdowns that have
    // changed, because setting <select>.value does not fire a change
    // event.
    for (var key in this.buttons) {
      var button = this.buttons[key];
      if (button instanceof FormButton) {
        button.refresh();
      }
    }

    location.hash = '#alarm-edit-panel';
  },

  initTimeSelect: function aev_initTimeSelect() {
    // HTML5 <input type=time> expects 24-hour HH:MM format.
    var hour = parseInt(this.alarm.hour, 10);
    var minute = parseInt(this.alarm.minute, 10);
    this.selects.time.value = (hour < 10 ? '0' : '') + hour +
      ':' + (minute < 10 ? '0' : '') + minute;
  },

  getTimeSelect: function aev_getTimeSelect() {
    // HTML5 <input type=time> returns data in 24-hour HH:MM format.
    var splitTime = this.selects.time.value.split(':');
    return { hour: splitTime[0], minute: splitTime[1] };
  },

  initRepeatSelect: function aev_initRepeatSelect() {
    this.buttons.repeat.value = this.alarm.repeat;
  },

  initSoundSelect: function aev_initSoundSelect() {
    this.buttons.sound.value = this.alarm.sound;
  },

  getSoundSelect: function aev_getSoundSelect() {
    return this.buttons.sound.value !== '0' && this.buttons.sound.value;
  },

  previewSound: function aev_previewSound() {
    var ringtoneName = this.getSoundSelect();
    this.ringtonePlayer.playRingtone(ringtoneName);
  },

  stopPreviewSound: function aev_stopPreviewSound() {
    this.ringtonePlayer.pause();
  },

  initSnoozeSelect: function aev_initSnoozeSelect() {
    this.buttons.snooze.value = this.alarm.snooze;
  },

  getSnoozeSelect: function aev_getSnoozeSelect() {
    return this.buttons.snooze.value;
  },

  getRepeatSelect: function aev_getRepeatSelect() {
    return this.buttons.repeat.value;
  },

  getAlarmVolumeValue: function() {
    return parseFloat(this.inputs.volume.value);
  },

  save: function aev_save(callback) {
    if (this.isSaving) {
      // Ignore double-taps on the "Save" button. When this view gets
      // refactored, we should opt for a more coherent way of managing
      // UI state to avoid glitches like this.
      return;
    }
    var alarm = this.alarm;

    if (this.element.dataset.id && this.element.dataset.id !== '') {
      alarm.id = parseInt(this.element.dataset.id, 10);
    } else {
      delete alarm.id;
    }

    alarm.label = this.inputs.name.value;

    var time = this.getTimeSelect();
    alarm.hour = time.hour;
    alarm.minute = time.minute;
    alarm.repeat = this.buttons.repeat.value;
    alarm.sound = this.getSoundSelect();
    alarm.vibrate = this.checkboxes.vibrate.checked;
    alarm.snooze = parseInt(this.getSnoozeSelect(), 10);
    AudioManager.setAlarmVolume(this.getAlarmVolumeValue());

    this.isSaving = true;

    alarm.schedule('normal').then(() => {
      this.isSaving = false;
      window.dispatchEvent(new CustomEvent('alarm-changed', {
        detail: { alarm: alarm, showBanner: true }
      }));
      callback && callback(null, alarm);
    });
  },

  delete: function aev_delete(callback) {
    if (!this.alarm.id) {
      setTimeout(callback.bind(null, new Error('no alarm id')), 0);
      return;
    }

    this.alarm.delete().then(callback);
  }

});

return AlarmEdit;
});
