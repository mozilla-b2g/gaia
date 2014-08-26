define(function(require) {
'use strict';

var Banner = require('banner/main');
var alarmDatabase = require('alarm_database');
var Utils = require('utils');
var _ = require('l10n').get;
var App = require('app');
var alarmTemplate = require('tmpl!panels/alarm/list_item.html');
var AsyncQueue = require('async_queue');

/**
 * AlarmListPanel displays the list of alarms on the Clock tab.
 */
function AlarmListPanel(element) {
  this.alarms = element;

  this.newAlarmButton.addEventListener(
    'click', this.onClickNewAlarm.bind(this));
  this.alarms.addEventListener('click', this.onClickAlarmItem.bind(this));

  this.banner = new Banner('banner-countdown');

  alarmDatabase.getAll().then((alarms) => {
    for (var i = 0; alarms && i < alarms.length; i++) {
      this.addOrUpdateAlarm(alarms[i]);
    }
    this.updateAlarmStatusBar();
    App.alarmListLoaded();
  });

  window.addEventListener('alarm-changed', (evt) => {
    var alarm = evt.detail.alarm;
    this.addOrUpdateAlarm(alarm);
    if (evt.detail.showBanner) {
      this.banner.show(alarm.getNextAlarmFireTime());
    }
    this.updateAlarmStatusBar();
  });
  window.addEventListener('alarm-removed', (evt) => {
    this.removeAlarm(evt.detail.alarm);
    this.updateAlarmStatusBar();
  });
  window.addEventListener('localized', () => {
    var elems = this.alarms.querySelectorAll("[id^='alarm-']");
    Array.prototype.forEach.call(elems,(elem) => {
      var alarmId = parseInt(elem.dataset.id);
      AlarmsDB.getAlarm(alarmId,function (err, alarm) {
        console.log("ID is -- "+alarm.minute);
        var d = new Date();
        d.setHours(alarm.hour);
        d.setMinutes(alarm.minute);
        var atime = elem.querySelector('.time');
        atime.innerHTML = Utils.getLocalizedTimeHtml(d);
		var alabel = elem.querySelector('.label');
		alabel.textContent = alarm.label || _('alarm');
		var asummarizeday = elem.querySelector('.repeat');
		asummarizeday.textContent = (alarm.isRepeating() ? alarm.summarizeDaysOfWeek() : '');
      });
    });
  });
}

AlarmListPanel.prototype = {
  alarmIdMap: {},

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
  renderAlarm: function(alarm) {
    var li = (this.alarms.querySelector('#alarm-' + alarm.id) ||
              alarmTemplate.cloneNode(true));

    var isActive = ('normal' in alarm.registeredAlarms ||
                    'snooze' in alarm.registeredAlarms);

    var d = new Date();
    d.setHours(alarm.hour);
    d.setMinutes(alarm.minute);

    li.id = 'alarm-' + alarm.id;
    li.dataset.id = alarm.id;

    var enableButton = li.querySelector('.input-enable');
    enableButton.dataset.id = alarm.id;
    enableButton.checked = isActive;

    var link = li.querySelector('.alarm-item');
    link.classList.toggle('with-repeat', alarm.isRepeating());
    link.dataset.id = alarm.id;

    li.querySelector('.time').innerHTML = Utils.getLocalizedTimeHtml(d);
    li.querySelector('.label').textContent = alarm.label || _('alarm');
    li.querySelector('.repeat').textContent =
      (alarm.isRepeating() ? Utils.summarizeDaysOfWeek(alarm.repeat) : '');

    return li;
  },

  refreshClockView: function() {
    window.dispatchEvent(new CustomEvent('alarm-list-changed'));
  },

  addOrUpdateAlarm: function(alarm) {
    this.alarmIdMap[alarm.id] = alarm;
    var li = this.renderAlarm(alarm);
    var liId = parseInt(li.dataset.id, 10) || null;

    // Go through the list of existing alarms, inserting this alarm
    // before the first alarm that has a lower ID than this one.
    var node = this.alarms.firstChild;
    while (true) {
      var nodeId = (node ? parseInt(node.dataset.id, 10) : -1);
      if (nodeId < liId) {
        this.alarms.insertBefore(li, node);
        break;
      }
      node = node.nextSibling;
    }
    this.refreshClockView();
  },

  removeAlarm: function(alarm) {
    delete this.alarmIdMap[alarm.id];
    var li = this.alarms.querySelector('#alarm-' + alarm.id);
    if (li) {
      li.parentNode.removeChild(li);
    }
    this.refreshClockView();
  },

  toggleAlarmQueue: new AsyncQueue(),

  /**
   * Toggle an alarm's enabled state. To ensure that the database
   * state remains consistent with the DOM, perform operations
   * serially in a queue.
   *
   * @param {Alarm} alarm
   * @param {boolean} enabled
   * @param {function} callback Optional callback.
   */
  toggleAlarm: function(alarm, enabled) {
    this.toggleAlarmQueue.push((done) => {
      if (enabled) {
        alarm.schedule('normal').then(() => {
          this.addOrUpdateAlarm(alarm);
          this.updateAlarmStatusBar();

          if (alarm.isEnabled()) {
            this.banner.show(alarm.getNextAlarmFireTime());
          }
        }).then(done, done);
      } else {
        alarm.cancel().then(done);
      }
    });
  },

  updateAlarmStatusBar: function() {
    if (navigator.mozSettings) {
      var anyAlarmEnabled = false;
      for (var id in this.alarmIdMap) {
        if (this.alarmIdMap[id].isEnabled()) {
          anyAlarmEnabled = true;
          break;
        }
      }
      navigator.mozSettings.createLock().set({
        'alarm.enabled': anyAlarmEnabled
      });
    }
  }

};

Utils.extendWithDomGetters(AlarmListPanel.prototype, {
  title: '#alarms-title',
  newAlarmButton: '#alarm-new'
});


return AlarmListPanel;

});
