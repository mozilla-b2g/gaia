'use strict';
/* global KeyEvent */
define(function(require) {
var Alarm = require('alarm');
var AlarmList = require('panels/alarm/alarm_list');
var AlarmManager = require('alarm_manager');
var ClockView = require('panels/alarm/clock_view');
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
  mozL10n.translate(this.element);
  var handleDomEvent = this.handleDomEvent.bind(this);
  this.on('visibilitychange', this.handleVisibilityChange.bind(this));

  this.selects = {};
  [
    'time', 'repeat', 'sound', 'snooze'
  ].forEach(function(id) {
    this.selects[id] = this.element.querySelector('#' + id + '-select');
  }, this);

  this.inputs = {
    name: this.element.querySelector('#alarm-name')
  };

  this.buttons = {};
  [
    'delete', 'close', 'done'
  ].forEach(function(id) {
    this.buttons[id] = this.element.querySelector('#alarm-' + id);
  }, this);

  this.checkboxes = {};
  [
    'vibrate'
  ].forEach(function(id) {
    this.checkboxes[id] = document.getElementById(id + '-checkbox');
  }, this);

  this.buttons.time = new FormButton(this.selects.time, {
    formatLabel: function(value) {
      var time = Utils.parseTime(value);
      return Utils.format.time(time.hour, time.minute);
    }.bind(this)
  });
  this.buttons.repeat = new FormButton(this.selects.repeat, {
    selectOptions: constants.DAYS,
    id: 'repeat-menu',
    formatLabel: function(daysOfWeek) {
      return this.alarm.summarizeDaysOfWeek(daysOfWeek);
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

  // When the system pops up the ValueSelector, it inadvertently
  // messes with the scrollTop of the current panel. This is a
  // workaround for bug 981255 until the Edit panel becomes a new
  // window per bug 922651.
  this.element.addEventListener('scroll', function() {
    this.element.scrollTop = 0;
  }.bind(this));

  mozL10n.translate(this.element);
  // When the language changes, the value of 'weekStartsOnMonday'
  // might change. Since that's more than a simple text string, we
  // can't just use mozL10n.translate().
  window.addEventListener('localized', this.updateL10n.bind(this));
  this.updateL10n();

  this.buttons.close.addEventListener('click', handleDomEvent);
  this.buttons.done.addEventListener('click', handleDomEvent);
  this.selects.sound.addEventListener('change', handleDomEvent);
  this.selects.sound.addEventListener('blur', handleDomEvent);
  this.selects.repeat.addEventListener('change', handleDomEvent);
  this.checkboxes.vibrate.addEventListener('change', handleDomEvent);
  this.buttons.delete.addEventListener('click', handleDomEvent);
  this.inputs.name.addEventListener('keypress', this.handleNameInput);

  // If the phone locks during preview, pause the sound.
  // TODO: When this is no longer a singleton, unbind the listener.
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      this.stopPreviewSound();
    }
  }.bind(this));
};

AlarmEdit.prototype = Object.create(Panel.prototype);

var selectors = {
  scrollList: '#edit-alarm',
  labelInput: 'input[name="alarm.label"]',
  timeSelect: '#time-select',
  timeMenu: '#time-menu',
  alarmTitle: '#alarm-title',
  repeatMenu: '#repeat-menu',
  repeatSelect: '#repeat-select',
  sundayListItem: '#repeat-select-sunday',
  soundMenu: '#sound-menu',
  soundSelect: '#sound-select',
  snoozeMenu: '#snooze-menu',
  snoozeSelect: '#snooze-select',
  deleteButton: '#alarm-delete',
  backButton: '#alarm-close',
  doneButton: '#alarm-done'
};
Object.keys(selectors).forEach(function(attr) {
  var selector = selectors[attr];
  Object.defineProperty(AlarmEdit.prototype, attr, {
    get: function() {
      var element = this.element.querySelector(selector);
      Object.defineProperty(this, attr, {
        value: element
      });
      return element;
    },
    configurable: true
  });
});

Utils.extend(AlarmEdit.prototype, {

  alarm: null,
  alarmRef: null,
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },
  previewRingtonePlayer: null,

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
      case this.buttons.close:
        ClockView.show();
        break;
      case this.buttons.done:
        ClockView.show();
        this.save(function aev_saveCallback(err, alarm) {
          if (err) {
            return;
          }
          AlarmList.refreshItem(alarm);
        });
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
      case this.checkboxes.vibrate:
        switch (input.checked) {
          case true:
            input.value = '1';
            break;
          case false:
            input.value = '0';
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
    }
  },

  focusMenu: function aev_focusMenu(menu) {
    setTimeout(function() { menu.focus(); }, 10);
  },

  handleVisibilityChange: function aev_show(isVisible) {
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

    // Init time, repeat, sound, snooze selection menu.
    this.initTimeSelect();
    this.initRepeatSelect();
    this.initSoundSelect();
    this.initVibrateCheckbox();
    this.initSnoozeSelect();
    location.hash = '#alarm-edit-panel';
  },

  initTimeSelect: function aev_initTimeSelect() {
    // The format of input type="time" should be in HH:MM
    var opts = { meridian: false, padHours: true };
    var time = Utils.format.time(this.alarm.hour, this.alarm.minute, opts);
    this.buttons.time.value = time;
  },

  getTimeSelect: function aev_getTimeSelect() {
    return Utils.parseTime(this.selects.time.value);
  },
  initRepeatSelect: function aev_initRepeatSelect() {
    this.buttons.repeat.value = this.alarm.repeat;
  },

  initSoundSelect: function aev_initSoundSelect() {
    this.buttons.sound.value = this.alarm.sound;
  },

  getSoundSelect: function aev_getSoundSelect() {
    return this.buttons.sound.value;
  },

  previewSound: function aev_previewSound() {
    var ringtonePlayer = this.previewRingtonePlayer;
    if (!ringtonePlayer) {
      this.previewRingtonePlayer = new Audio();
      ringtonePlayer = this.previewRingtonePlayer;
    } else {
      ringtonePlayer.pause();
    }

    var ringtoneName = this.getSoundSelect();
    var previewRingtone = 'shared/resources/media/alarms/' + ringtoneName;
    ringtonePlayer.mozAudioChannelType = 'alarm';
    ringtonePlayer.src = previewRingtone;
    ringtonePlayer.play();
  },

  stopPreviewSound: function aev_stopPreviewSound() {
    if (this.previewRingtonePlayer) {
      this.previewRingtonePlayer.pause();
    }
  },

  initVibrateCheckbox: function aev_initVibrateCheckbox() {
    this.checkboxes.vibrate.value = this.alarm.vibrate;
  },

  getVibrateCheckbox: function aev_getVibrateCheckbox() {
    return this.checkboxes.vibrate.value;
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

  save: function aev_save(callback) {
    if (this.element.dataset.id !== '') {
      this.alarm.id = parseInt(this.element.dataset.id, 10);
    } else {
      delete this.alarm.id;
    }
    var error = false;

    this.alarm.label = this.inputs.name.value;

    var time = this.getTimeSelect();
    this.alarm.time = [time.hour, time.minute];
    this.alarm.repeat = this.buttons.repeat.value;
    this.alarm.sound = this.getSoundSelect();
    this.alarm.vibrate = this.getVibrateCheckbox();
    this.alarm.snooze = parseInt(this.getSnoozeSelect(), 10);

    if (!error) {
      this.alarm.cancel();
      this.alarm.setEnabled(true, function(err, alarm) {
        if (err) {
          callback && callback(err, alarm);
          return;
        }
        AlarmList.refreshItem(alarm);
        AlarmList.banner.show(alarm.getNextAlarmFireTime());
        AlarmManager.updateAlarmStatusBar();
        callback && callback(null, alarm);
      });
    } else {
      // error
      if (callback) {
        callback(error);
      }
    }

    return !error;
  },

  delete: function aev_delete(callback) {
    if (!this.alarm.id) {
      setTimeout(callback.bind(null, new Error('no alarm id')), 0);
      return;
    }

    this.alarm.delete(function aev_delete(err, alarm) {
      AlarmList.refresh();
      AlarmManager.updateAlarmStatusBar();
      callback && callback(err, alarm);
    });
  }

});

return AlarmEdit;
});
