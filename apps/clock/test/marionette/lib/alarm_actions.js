'use strict';
/* global marionetteScriptFinished */

var utils = require('./utils');
var $ = require('./mquery');

function AlarmActions(client, actions) {
  this._client = client;
  this.actions = actions;
}

module.exports = AlarmActions;

AlarmActions.prototype = {

  openNewForm: function() {
    if ($('#banner-countdown').displayed()) {
      this.waitForBanner();
    }
    this.actions.tapAndTransition('#alarm-new');
  },

  openEditForm: function(idx) {
    if ($('#banner-countdown').displayed()) {
      this.waitForBanner();
    }
    this.actions.tapAndTransition(
      '.alarm-cell:nth-child(' + (idx + 1) + ') .alarm-item');
  },

  toggle: function(idx) {
    var alarmWasEnabled = this.list[idx].enabled;

    $('.alarm-cell:nth-child(' + (idx + 1) + ') .alarmEnable span')
      .tap();
    this._client.waitFor(function() {
      return this.list[idx].enabled !== alarmWasEnabled;
    }.bind(this));

    if (!alarmWasEnabled) {
      this.waitForBanner();
    }

    var numAlarmsEnabled = this.list.filter(function(alarm) {
      return alarm.enabled;
    }).length;

    // If the number of alarms transitioned from 0 <=> 1, ensure the
    // system status bar updates before continuing.
    if (numAlarmsEnabled === 1) {
      this._client.waitFor(function() {
        return this.statusIcon;
      }.bind(this));
    } else if (numAlarmsEnabled === 0) {
      this._client.waitFor(function() {
        return !this.statusIcon;
      }.bind(this));
    }
  },

  cancelForm: function() {
    this.actions.tapAndTransition('#alarm-close');
  },

  delete: function() {
    this.actions.tapAndTransition('#alarm-delete');
  },

  saveForm: function() {
    this.actions.tapAndTransition('#alarm-done');
  },

  get nameField() {
    return $('#edit-alarm [name="alarm.label"]');
  },

  get timeField() {
    return $('#time-select');
  },

  get volumeInput() {
    return $('#alarm-volume-input');
  },

  fire: function(idx, date, attentionHandler, type) {
    // Trigger a fake 'alarm' event:
    this._client.executeScript(function(idx, date, type) {
      // String to Date object.
      date = new Date(date);
      var id = document.querySelector(
        '.alarm-cell:nth-child(' + (idx + 1) + ') .alarm-item').dataset.id;
      var alarm = new CustomEvent('test-alarm', {
        detail: {
          id: parseInt(id, 10),
          type: type || 'normal',
          date: date
        }
      });
      window.dispatchEvent(alarm);
    }, [idx, date, type]);

    if (attentionHandler) {
      // Switch to the Attention Screen
      this._client.switchToFrame();
      this._client.switchToFrame($('iframe[name="_blank"]').el);
      // Wait for the onring page is ready.
      this._client.waitFor(function() {
        if (this._client.findElement('html')
              .getAttribute('class')
              .indexOf('ready') !== -1) {
          return true;
        }
      }.bind(this));
      attentionHandler();
      // Now switch back to the system, then to the clock.
      this._client.switchToFrame();
      this._client.apps.switchToApp(this.actions.origin);
    }
  },

  remove: function(idx) {
    var count = this.list.length;
    this.openEditForm(idx);
    this.actions.tapAndTransition('#alarm-delete');
    this._client.waitFor(function() {
      return this.list.length === count - 1;
    }.bind(this));
  },

  create: function(name, minutesFromNow) {
    name = name || 'Alarm';
    if (!minutesFromNow) {
      minutesFromNow = 20;
    }

    var originalAlarmCount = this.list.length;

    var now = Date.now();
    this.openNewForm();

    this.nameField.val(name);
    this.timeField.val(new Date(now + minutesFromNow));

    var time = new Date();
    time.setHours.apply(time, this.timeField.val().split(':'));

    this.saveForm();

    var alarmData = null;
    this._client.waitFor(function() {
      // Verify that the alarm created is in the list of alarms.
      this.list.forEach(function(alarm) {
        if (alarm.name === name && alarm.enabled &&
            utils.stringContainsTime(alarm.timeString, time)) {
          alarmData = alarm;
        }
      });
      return !!alarmData;
    }.bind(this));

    this._client.waitFor(function() {
      return this.list.length === originalAlarmCount + 1;
    }.bind(this));

    $('[data-panel-id="alarm"]').waitToAppear();
    this.waitForBanner();
    return {
      name: alarmData.name,
      time: time,
      timeString: alarmData.timeString,
      enabled: alarmData.enabled
    };
  },

  get list() {
    // For now, do this all in one executeScript() call, because the
    // rendering logic for alarms wipes out all elements at once. It
    // could cause us to read inconsistent state from the DOM.
    return this._client.executeScript(function() {
      var domItems = document.querySelectorAll('.alarm-cell');
      var alarms = [];
      for (var i = 0; i < domItems.length; i++) {
        var item = domItems[i];
        alarms.push({
          name: item.querySelector('.label').textContent,
          timeString: item.querySelector('.time').textContent,
          enabled: item.querySelector('.input-enable').checked
        });
      }
      return alarms;
    });
  },

  // Status Checks

  get statusIcon() {
    this._client.setScriptTimeout(2000);
    return this._client.executeAsyncScript(function() {
      var req = navigator.mozSettings.createLock().get('alarm.enabled');
      req.onsuccess = function() {
        marionetteScriptFinished(req.result['alarm.enabled']);
      };
    });
  },

  waitForBanner: function() {
    $('#banner-countdown')
      .tap()
      .waitToDisappear();
  }


};
