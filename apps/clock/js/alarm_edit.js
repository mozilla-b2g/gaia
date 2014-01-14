define(function(require) {

var Alarm = require('alarm');
var AlarmList = require('alarm_list');
var AlarmManager = require('alarm_manager');
var ClockView = require('clock_view');
var FormButton = require('form_button');
var Utils = require('utils');
var constants = require('constants');
var mozL10n = require('l10n');
var _ = mozL10n.get;

var AlarmEdit = {

  alarm: null,
  alarmRef: null,
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },
  previewRingtonePlayer: null,

  get element() {
    delete this.element;
    return this.element = document.getElementById('alarm-edit-panel');
  },

  get scrollList() {
    delete this.scrollList;
    return this.scrollList = document.getElementById('edit-alarm');
  },

  get alarmTitle() {
    delete this.alarmTitle;
    return this.alarmTitle = document.getElementById('alarm-title');
  },

  init: function aev_init() {
    this.selects = {};
    [
      'time', 'repeat', 'sound', 'vibrate', 'snooze'
    ].forEach(function(id) {
      this.selects[id] = document.getElementById(id + '-select');
    }, this);

    this.inputs = {
      name: document.getElementById('alarm-name')
    };

    this.buttons = {};
    [
      'delete', 'close', 'done'
    ].forEach(function(id) {
      this.buttons[id] = document.getElementById('alarm-' + id);
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
      formatLabel: function(sound) {
        return (sound === null || sound === '0') ?
          _('noSound') :
          _(sound.replace('.', '_'));
      }
    });
    this.buttons.vibrate = new FormButton(this.selects.vibrate, {
      formatLabel: function(vibrate) {
        return (vibrate === null || vibrate === '0') ?
          _('vibrateOff') :
          _('vibrateOn');
      }
    });
    this.buttons.snooze = new FormButton(this.selects.snooze, {
      id: 'snooze-menu',
      formatLabel: function(snooze) {
        return _('nMinutes', {n: snooze});
      }
    });

    mozL10n.translate(this.element);
    this.buttons.close.addEventListener('click', this);
    this.buttons.done.addEventListener('click', this);
    this.selects.sound.addEventListener('change', this);
    this.selects.sound.addEventListener('blur', this);
    this.selects.repeat.addEventListener('change', this);
    this.buttons.delete.addEventListener('click', this);
    this.inputs.name.addEventListener('keypress', this.handleNameInput);
    this.init = function() {};
  },

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

  handleEvent: function aev_handleEvent(evt) {
    evt.preventDefault();
    var input = evt.target;
    if (!input)
      return;

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

  load: function aev_load(alarm) {
    this.init();
    // scroll to top of form list
    this.scrollList.scrollTop = 0;

    if (!alarm) {
      this.element.classList.add('new');
      this.alarmTitle.textContent = _('newAlarm');
      alarm = new Alarm();
    } else {
      this.element.classList.remove('new');
      this.alarmTitle.textContent = _('editAlarm');
    }
    this.alarm = new Alarm(alarm);

    this.element.dataset.id = alarm.id;
    this.inputs.name.value = alarm.label;

    // Init time, repeat, sound, snooze selection menu.
    this.initTimeSelect();
    this.initRepeatSelect();
    this.initSoundSelect();
    this.initVibrateSelect();
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
    if (this.previewRingtonePlayer)
      this.previewRingtonePlayer.pause();
  },

  initVibrateSelect: function aev_initVibrateSelect() {
    this.buttons.vibrate.value = this.alarm.vibrate;
  },

  getVibrateSelect: function aev_getVibrateSelect() {
    return this.buttons.vibrate.value;
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
    this.alarm.vibrate = this.getVibrateSelect();
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

};

return AlarmEdit;
});
