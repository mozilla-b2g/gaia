marionette('Hour format', function() {
  'use strict';

  var assert = require('assert');
  var $ = require('./lib/mquery');
  var actions = new (require('./lib/actions'))();
  var alarm = actions.alarm;

  setup(function() {
    actions.launch('alarm');
  });

  suite('12 hour format', function() {
    test('Fire an alarm', function() {
      alarm.create();
      alarm.fire(0, function() {
        var expectedDatetime = format12Datetime(new Date());
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
      alarm.create();
      alarm.fire(0, function() {
        var expectedDatetime = format24Datetime(new Date());
        assert.equal($('#ring-clock-time').text(), expectedDatetime);
      });
    });
  });

  function format12Datetime(date) {
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
    var hours = date.getHours();
    var AmPm = hours > 12 ? 'PM' : 'AM';
    hours = hours === 0 ? 12 : hours;
    hours = hours > 12 ? hours - 12 : hours;
    return hours + ':' + minutes + ' ' + AmPm;
  }

  function format24Datetime(date) {
    var minutes = date.getMinutes();
    minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
    var hours = date.getHours();
    hours = hours < 10 ? '0' + String(hours) :hours;
    return hours + ':' + minutes;
  }
});
