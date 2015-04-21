marionette('Hour format', function() {
  'use strict';

  var assert = require('assert');
  var $ = require('../lib/mquery');
  var actions = new (require('../lib/actions'))();
  var alarm = actions.alarm;

  setup(function() {
    actions.launch('alarm');
    // Make sure navigator.mozHour12 is initialized.
    $.client.waitFor(function() {
      return $.client.executeScript(function() {
        return window.wrappedJSObject.navigator.mozHour12 != null;
      });
    });
  });

  suite('12 hour format', function() {
    test('Fire an alarm', function() {
      var alarmInfo = alarm.create();
      alarm.fire(0, alarmInfo.time, function() {
        var expectedDatetime = format12Datetime(alarmInfo.time);
        assert.equal($('#ring-clock-time').text(), expectedDatetime);
      });
    });
  });

  suite('24 hour format', function() {
    setup(function() {
      // Set as 24 hour format.
      $.client.settings.set('locale.hour12', false);
    });

    test('Fire an alarm', function() {
      var alarmInfo = alarm.create();
      alarm.fire(0, alarmInfo.time, function() {
        var expectedDatetime = format24Datetime(alarmInfo.time);
        assert.equal($('#ring-clock-time').text(), expectedDatetime);
      });
    });
  });

  function format12Datetime(date) {
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
    var hours = date.getHours();
    var amPm = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours = hours - 12;
    }
    return hours + ':' + minutes + ' ' + amPm;
  }

  function format24Datetime(date) {
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
    var hours = date.getHours();
    hours = hours < 10 ? '0' + String(hours) :hours;
    return hours + ':' + minutes;
  }
});
