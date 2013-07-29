'use strict';

var _ = navigator.mozL10n.get;

var AlarmList = {

  alarmList: [],
  refreshingAlarms: [],
  _previousAlarmCount: 0,

  get alarms() {
    delete this.alarms;
    return this.alarms = document.getElementById('alarms');
  },

  get title() {
    delete this.title;
    return this.title = document.getElementById('alarms-title');
  },

  get newAlarmButton() {
    delete this.newAlarmButton;
    return this.newAlarmButton = document.getElementById('alarm-new');
  },

  handleEvent: function al_handleEvent(evt) {

    var link = evt.target;
    if (!link)
      return;

    if (link === this.newAlarmButton) {
      ClockView.hide();
      this.alarmEditView();
    } else if (link.classList.contains('input-enable')) {
      this.toggleAlarmEnableState(link.checked,
        this.getAlarmFromList(parseInt(link.dataset.id, 10)));
    } else if (link.classList.contains('alarm-item')) {
      ClockView.hide();
      this.alarmEditView(this.getAlarmFromList(
        parseInt(link.dataset.id, 10)));
    }
  },

  alarmEditView: function(alarm) {
    LazyLoader.load(
      [
        document.getElementById('alarm'),
        'js/alarm_edit.js',
        'shared/style/input_areas.css',
        'shared/style/buttons.css',
        'shared/style/edit_mode.css'
      ],
      function() {
        AlarmEdit.load(alarm);
    });
  },

  init: function al_init() {
    this.newAlarmButton.addEventListener('click', this);
    this.alarms.addEventListener('click', this);
    this.refresh();
    AlarmManager.regUpdateAlarmEnableState(this.refreshItem.bind(this));
  },

  refresh: function al_refresh() {
    AlarmsDB.getAlarmList(function al_gotAlarmList(err, list) {
      if (!err) {
        this.fillList(list);
      }
    }.bind(this));
  },

  buildAlarmContent: function al_buildAlarmContent(alarm) {
    var repeat = alarm.getRepeat();
    var summaryRepeat = (Object.keys(repeat).length === 0) ?
      '' : alarm.summarizeDaysOfWeek();
    var isChecked = alarm.enabled ? ' checked="true"' : '';
    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);
    var time = Utils.getLocaleTime(d);
    var label = (alarm.label === '') ?
      _('alarm') : Utils.escapeHTML(alarm.label);
    return '<label class="alarmList alarmEnable">' +
           '  <input class="input-enable"' +
                 '" data-id="' + alarm.id +
                 '" type="checkbox"' + isChecked + '>' +
           '  <span></span>' +
           '</label>' +
           '<a href="#alarm" class="alarm-item" data-id="' + alarm.id + '">' +
           '  <span class="time">' +
                time.t + '<span class="period">' + time.p + '</span>' +
           '  </span>' +
           '  <span class="label">' + label + '</span>' +
           '  <span class="repeat">' + summaryRepeat + '</span>' +
           '</a>';
  },

  createItem: function al_createItem(alarm, appendTarget) {
    var li = document.createElement('li');
    li.className = 'alarm-cell';
    li.innerHTML = this.buildAlarmContent(alarm);
    if (appendTarget) {
      appendTarget.appendChild(li);
      if (this._previousAlarmCount !== this.getAlarmCount()) {
        this._previousAlarmCount = this.getAlarmCount();
        ClockView.resizeAnalogClock();
      }
    }
    return li;
  },

  refreshItem: function al_refreshItem(alarm) {
    if (!this.getAlarmFromList(alarm.id)) {
      this.alarmList.push(alarm);
      this.createItem(alarm, this.alarms);
    } else {
      this.setAlarmFromList(alarm.id, alarm);
      var id = 'a[data-id="' + alarm.id + '"]';
      var alarmItem = this.alarms.querySelector(id);
      alarmItem.parentNode.innerHTML = this.buildAlarmContent(alarm);
      // clear the refreshing alarm's flag
      var index = this.refreshingAlarms.indexOf(alarm.id);
      this.refreshingAlarms.splice(index, 1);
    }
  },

  fillList: function al_fillList(alarmDataList) {
    this.alarmList = alarmDataList;
    var content = '';
    this.alarms.innerHTML = '';
    alarmDataList.forEach(function al_fillEachList(alarm) {
      this.createItem(alarm, this.alarms);
    }.bind(this));
  },

  getAlarmFromList: function al_getAlarmFromList(id) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id === id)
        return this.alarmList[i];
    }
    return null;
  },

  setAlarmFromList: function al_setAlarmFromList(id, alarm) {
    for (var i = 0; i < this.alarmList.length; i++) {
      if (this.alarmList[i].id === id) {
        this.alarmList[i] = alarm;
        return;
      }
    }
  },

  getAlarmCount: function al_getAlarmCount() {
    return this.alarmList.length;
  },

  toggleAlarmEnableState: function al_toggleAlarmEnableState(enabled, alarm) {
    // Todo: queue actions instead of dropping them
    if (this.refreshingAlarms.indexOf(alarm.id) !== -1) {
      return;
    }
    if (alarm.enabled !== enabled) {
      this.refreshingAlarms.push(alarm.id);
      alarm.setEnabled(!alarm.enabled, function al_putAlarm(err, alarm) {
        if (alarm.enabled) {
          AlarmManager.renderBannerBar(alarm.getNextAlarmFireTime());
        }
        this.refreshItem(alarm);
        AlarmManager.updateAlarmStatusBar();
      }.bind(this));
    } else {
      AlarmManager.updateAlarmStatusBar();
    }
  }

};
