define(function(require) {
var Alarm = require('alarm');
var AlarmList = require('panels/alarm/alarm_list');
var AlarmManager = require('alarm_manager');
var ClockView = require('panels/alarm/clock_view');
var Utils = require('utils');
var constants = require('constants');
var mozL10n = require('l10n');
var Panel = require('panel');
var _ = mozL10n.get;
var html = require('text!panels/alarm_edit/panel.html');

var AlarmEdit = function() {
  Panel.apply(this, arguments);
  this.element.innerHTML = html;
  mozL10n.translate(this.element);
  var handleDomEvent = this.handleDomEvent.bind(this);
  this.on('visibilitychange', this.handleVisibilityChange.bind(this));
  this.backButton.addEventListener('click', handleDomEvent);
  this.doneButton.addEventListener('click', handleDomEvent);
  this.timeMenu.addEventListener('click', handleDomEvent);
  this.timeSelect.addEventListener('blur', handleDomEvent);
  this.repeatMenu.addEventListener('click', handleDomEvent);
  this.repeatSelect.addEventListener('blur', handleDomEvent);
  this.soundMenu.addEventListener('click', handleDomEvent);
  this.soundSelect.addEventListener('change', handleDomEvent);
  this.soundSelect.addEventListener('blur', handleDomEvent);
  this.vibrateMenu.addEventListener('click', handleDomEvent);
  this.vibrateSelect.addEventListener('blur', handleDomEvent);
  this.snoozeMenu.addEventListener('click', handleDomEvent);
  this.snoozeSelect.addEventListener('blur', handleDomEvent);
  this.deleteButton.addEventListener('click', handleDomEvent);
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
  soundMenu: '#sound-menu',
  soundSelect: '#sound-select',
  vibrateMenu: '#vibrate-menu',
  vibrateSelect: '#vibrate-select',
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

  // The name `handleEvent` is already defined by the Panel class, so this
  // method must be named uniquely to avoid overriding that functionality.
  handleDomEvent: function aev_handleDomEvent(evt) {
    evt.preventDefault();
    var input = evt.target;
    if (!input)
      return;

    switch (input) {
      case this.backButton:
        ClockView.show();
        break;
      case this.doneButton:
        ClockView.show();
        this.save(function aev_saveCallback(err, alarm) {
          if (err) {
            return;
          }
          AlarmList.refreshItem(alarm);
        });
        break;
      case this.timeMenu:
        this.focusMenu(this.timeSelect);
        break;
      case this.timeSelect:
        this.refreshTimeMenu(this.getTimeSelect());
        break;
      case this.repeatMenu:
        this.focusMenu(this.repeatSelect);
        break;
      case this.repeatSelect:
        this.refreshRepeatMenu(this.getRepeatSelect());
        break;
      case this.soundMenu:
        this.focusMenu(this.soundSelect);
        break;
      case this.soundSelect:
        switch (evt.type) {
          case 'change':
            this.refreshSoundMenu(this.getSoundSelect());
            this.previewSound();
            break;
          case 'blur':
            this.stopPreviewSound();
            break;
        }
        break;
      case this.vibrateMenu:
        this.focusMenu(this.vibrateSelect);
        break;
      case this.vibrateSelect:
        this.refreshVibrateMenu(this.getVibrateSelect());
        break;
      case this.snoozeMenu:
        this.focusMenu(this.snoozeSelect);
        break;
      case this.snoozeSelect:
        this.refreshSnoozeMenu(this.getSnoozeSelect());
        break;
      case this.deleteButton:
        ClockView.show();
        this.delete();
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
    this.labelInput.value = alarm.label;

    // Init time, repeat, sound, snooze selection menu.
    this.initTimeSelect();
    this.refreshTimeMenu();
    this.initRepeatSelect();
    this.refreshRepeatMenu();
    this.initSoundSelect();
    this.refreshSoundMenu();
    this.initVibrateSelect();
    this.refreshVibrateMenu();
    this.initSnoozeSelect();
    this.refreshSnoozeMenu();
    location.hash = '#alarm-edit-panel';
  },

  initTimeSelect: function aev_initTimeSelect() {
    // The format of input type="time" should be in HH:MM
    this.timeSelect.value = (this.alarm.hour < 10 ? '0' : '') +
                            this.alarm.hour + ':' +
                            (this.alarm.minute < 10 ? '0' : '') +
                            this.alarm.minute;
  },

  getTimeSelect: function aev_getTimeSelect() {
    return Utils.parseTime(this.timeSelect.value);
  },

  refreshTimeMenu: function aev_refreshTimeMenu(time) {
    if (!time) {
      time = this.alarm;
    }
    this.timeMenu.textContent = Utils.format.time(time.hour, time.minute);
  },

  initRepeatSelect: function aev_initRepeatSelect() {
    var daysOfWeek = this.alarm.repeat;
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      options[i].selected = daysOfWeek[constants.DAYS[i]] === true;
    }
    this.refreshRepeatMenu(null);
  },

  getRepeatSelect: function aev_getRepeatSelect() {
    var daysOfWeek = {};
    var options = this.repeatSelect.options;
    for (var i = 0; i < options.length; i++) {
      if (options[i].selected) {
        daysOfWeek[constants.DAYS[i]] = true;
      }
    }
    return daysOfWeek;
  },

  refreshRepeatMenu: function aev_refreshRepeatMenu(repeatOpts) {
    var daysOfWeek;
    if (repeatOpts) {
      this.alarm.repeat = this.getRepeatSelect();
    }
    daysOfWeek = this.alarm.repeat;
    this.repeatMenu.textContent = this.alarm.summarizeDaysOfWeek(daysOfWeek);
  },

  initSoundSelect: function aev_initSoundSelect() {
    Utils.changeSelectByValue(this.soundSelect, this.alarm.sound);
  },

  getSoundSelect: function aev_getSoundSelect() {
    return Utils.getSelectedValue(this.soundSelect);
  },

  refreshSoundMenu: function aev_refreshSoundMenu(sound) {
    // Refresh and parse the name of sound file for sound menu.
    sound = (sound !== undefined) ? sound : this.alarm.sound;
    // sound could either be string or int, so test for both
    this.soundMenu.textContent = (sound === 0 || sound === '0') ?
                               _('noSound') :
                               _(sound.replace('.', '_'));
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
    Utils.changeSelectByValue(this.vibrateSelect, this.alarm.vibrate);
  },

  getVibrateSelect: function aev_getVibrateSelect() {
    return Utils.getSelectedValue(this.vibrateSelect);
  },

  refreshVibrateMenu: function aev_refreshVibrateMenu(vibrate) {
    vibrate = (vibrate !== undefined) ? vibrate : this.alarm.vibrate;
    // vibrate could be either string or int, so test for both
    this.vibrateMenu.textContent = (vibrate === 0 || vibrate === '0') ?
                                 _('vibrateOff') :
                                 _('vibrateOn');
  },

  initSnoozeSelect: function aev_initSnoozeSelect() {
    Utils.changeSelectByValue(this.snoozeSelect, this.alarm.snooze);
  },

  getSnoozeSelect: function aev_getSnoozeSelect() {
    return Utils.getSelectedValue(this.snoozeSelect);
  },

  refreshSnoozeMenu: function aev_refreshSnoozeMenu(snooze) {
    snooze = (snooze) ? this.getSnoozeSelect() : this.alarm.snooze;
    this.snoozeMenu.textContent = _('nMinutes', {n: snooze});
  },

  save: function aev_save(callback) {
    if (this.element.dataset.id !== '') {
      this.alarm.id = parseInt(this.element.dataset.id, 10);
    } else {
      delete this.alarm.id;
    }
    var error = false;

    this.alarm.label = this.labelInput.value;

    var time = this.getTimeSelect();
    this.alarm.time = [time.hour, time.minute];
    this.alarm.repeat = this.getRepeatSelect();
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

});

return AlarmEdit;
});
