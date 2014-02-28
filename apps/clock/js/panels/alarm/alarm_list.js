define(function(require) {
'use strict';

var Banner = require('banner/main');
var AlarmsDB = require('alarmsdb');
var AlarmManager = require('alarm_manager');
var Utils = require('utils');
var _ = require('l10n').get;
var App = require('app');
var alarmTemplate = require('tmpl!panels/alarm/list_item.html');

/**
 * AlarmListPanel displays the list of alarms on the Clock tab.
 */
function AlarmListPanel(element) {
  this.alarms = element;

  this.newAlarmButton.addEventListener(
    'click', this.onClickNewAlarm.bind(this));
  this.alarms.addEventListener('click', this.onClickAlarmItem.bind(this));

  this.banner = new Banner('banner-countdown');

  AlarmsDB.getAlarmList((err, alarmList) => {
    if (!alarmList) { return; }
    for (var i = 0; i < alarmList.length; i++) {
      this.addOrUpdateAlarm(alarmList[i], /* skipSort = */ true);
    }
    this.sortAlarms();
  });

  window.addEventListener('alarm-changed', (evt) => {
    var alarm = evt.detail.alarm;
    this.addOrUpdateAlarm(alarm);
    if (evt.detail.showBanner) {
      this.banner.show(alarm.getNextAlarmFireTime());
    }
  });
  window.addEventListener('alarm-removed', (evt) => {
    this.removeAlarm(evt.detail.alarm);
  });
}

AlarmListPanel.prototype = {
  alarmIdMap: {},

  get count() {
    return this.alarms.querySelectorAll('.alarm-item').length;
  },

  onClickNewAlarm: function(evt) {
    evt.preventDefault();
    App.navigate({ hash: '#alarm-edit-panel', data: null });
  },

  onClickAlarmItem: function(evt) {
    var link = evt.target;
    var alarm = this.alarmIdMap[link.dataset.id];
    if (link.classList.contains('input-enable')) {
      this.toggleAlarm(alarm, link.checked);
    } else if (link.classList.contains('alarm-item')) {
      App.navigate({ hash: '#alarm-edit-panel', data: alarm });
      evt.preventDefault();
    }
  },

  /**
   * Render an alarm into a DOM node.
   *
   * @param alarm The alarm to render.
   * @param {Element} [li] Existing element to re-use, if any.
   */
  renderAlarm: function(alarm, li) {
    if (!li) {
      li = alarmTemplate.cloneNode(true);
    }

    var isActive = ('normal' in alarm.registeredAlarms ||
                    'snooze' in alarm.registeredAlarms);

    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);
    var localeTime = Utils.getLocaleTime(d);

    li.id = 'alarm-' + alarm.id;
    li.dataset.id = alarm.id;

    var enableButton = li.querySelector('.input-enable');
    enableButton.dataset.id = alarm.id;
    enableButton.checked = isActive;

    var link = li.querySelector('.alarm-item');
    link.classList.toggle('with-repeat', alarm.isRepeating());
    link.dataset.id = alarm.id;

    li.querySelector('.time-part').textContent = localeTime.time;
    li.querySelector('.period').textContent = localeTime.ampm;
    li.querySelector('.label').textContent = alarm.label || _('alarm');
    li.querySelector('.repeat').textContent =
      (alarm.isRepeating() ? alarm.summarizeDaysOfWeek() : '');

    return li;
  },

  /**
   * Sort the alarms, latest first.
   */
  sortAlarms: function() {
    var alarmNodes = Array.slice(this.alarms.childNodes);
    alarmNodes.sort((a, b) => {
      return parseInt(b.dataset.id, 10) - parseInt(a.dataset.id, 10);
    });
    alarmNodes.forEach((alarm) => this.alarms.appendChild(alarm));

    // TODO: Address this circular dependency
    require(['panels/alarm/clock_view'], function(ClockView) {
      ClockView.resizeAnalogClock();
    });
  },

  getAlarmListItem: function(alarm) {
    return this.alarms.querySelector('#alarm-' + alarm.id);
  },

  addOrUpdateAlarm: function(alarm, skipSort) {
    this.alarmIdMap[alarm.id] = alarm;
    var li = this.renderAlarm(alarm, this.getAlarmListItem(alarm));
    this.alarms.appendChild(li);

    if (!skipSort) {
      this.sortAlarms();
    }
  },

  removeAlarm: function(alarm) {
    delete this.alarmIdMap[alarm.id];
    var li = this.getAlarmListItem(alarm);
    if (li) {
      li.parentNode.removeChild(li);
    }
    this.sortAlarms();
  },

  pendingOperationQueue: [],

  /**
   * Toggle an alarm's enabled state. To ensure that the database
   * state remains consistent with the DOM, perform operations
   * serially in a queue.
   *
   * @param {Alarm} alarm
   * @param {boolean} enabled
   * @param {function} callback Optional callback.
   */
  toggleAlarm: function(alarm, enabled, done) {
    // If the alarm was scheduled to snooze, cancel the snooze.
    if (alarm.registeredAlarms.snooze !== undefined) {
      if (!enabled) {
        alarm.cancel('snooze');
      }
    }

    var toggleAlarmState = () => {
      alarm.setEnabled(enabled, (err, alarm) => {
        this.addOrUpdateAlarm(alarm);
        if (alarm.enabled) {
          this.banner.show(alarm.getNextAlarmFireTime());
        }
        alarm.save();
        AlarmManager.updateAlarmStatusBar();

        done && done();

        var nextOperation = this.pendingOperationQueue.shift();
        nextOperation && nextOperation();
      });
    };

    if (!this.pendingOperationQueue.length) {
      toggleAlarmState();
    } else {
      this.pendingOperationQueue.push(toggleAlarmState);
    }
  }
};

Utils.extendWithDomGetters(AlarmListPanel.prototype, {
  title: '#alarms-title',
  newAlarmButton: '#alarm-new'
});


return AlarmListPanel;

});
