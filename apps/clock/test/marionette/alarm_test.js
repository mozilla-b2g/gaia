marionette('Alarm', function() {
  'use strict';

  var assert = require('assert');
  var $ = require('./lib/mquery');
  var utils = require('./lib/utils');
  var actions = new (require('./lib/actions'))();
  var alarm = actions.alarm;

  setup(function() {
    actions.launch('alarm');
  });

  // PythonTests: functional/test_clock_switch_clock_type
  test('Tapping the clock toggles between analog and digital', function() {
    $('#analog-clock').tap();
    assert.ok($('#digital-clock').displayed());
    assert.ok($('#clock-day-date').displayed());
    $('#digital-clock').tap();
    assert.ok($('#analog-clock').displayed());
    assert.ok($('#clock-day-date').displayed());
  });

  // PythonTests: functional/test_clock_set_alarm
  test('Blank "New Alarm" form mutates properly', function() {
    alarm.openNewForm();
    assert.equal($('#repeat-menu').text(), 'Never');

    [
      { repeat: ['Monday'],
        label: 'Mon' },
      { repeat: [],
        label: 'Never' },
      { repeat: ['Monday', 'Tuesday'],
        label: 'Mon, Tue' },
      { repeat: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
                 'Friday', 'Saturday'],
        label: 'Every day' },
      { repeat: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        label: 'Weekdays' }
    ].forEach(function(item) {
      $('#repeat-select').val(item.repeat);
      assert.equal($('#repeat-menu').text(), item.label);
    });

    var selectedOptions = {
      snooze: '15 minutes',
      sound: 'Gem Echoes',
      repeat: 'Weekdays'
    };

    assert.equal($('#sound-menu').text(), 'Classic Buzz');
    $('#sound-select').val(selectedOptions.sound);
    assert.equal($('#sound-menu').text(), selectedOptions.sound);

    assert.equal($('#snooze-menu').text(), '5 minutes');
    $('#snooze-select').val(selectedOptions.snooze);
    assert.equal($('#snooze-menu').text(), selectedOptions.snooze);

    alarm.saveForm();

    alarm.openEditForm(0);
    assert.equal($('#sound-menu').text(), selectedOptions.sound);
    assert.equal($('#snooze-menu').text(), selectedOptions.snooze);
    assert.equal($('#repeat-menu').text(), selectedOptions.repeat);
  });

  // PythonTests: functional/test_clock_add_alarm_multiple_times
  // PythonTests: functional/test_clock_create_new_alarm
  test('Multiple saved alarms show the proper data', function() {
    var i;
    var numAlarms = 3;
    var createdAlarms = [];

    // Create these alarms in descending order (latest first)
    for (i = 0; i < numAlarms; i++) {
      createdAlarms.push(alarm.create('Alarm ' + i, i + 20));
    }

    var alarms = alarm.list;
    assert.equal(alarms.length, numAlarms);
    alarms.reverse();

    for (i = 0; i < numAlarms; i++) {
      assert.ok(alarms[i].name === 'Alarm ' + i, 'Alarm name matches');
      utils.assertStringContainsTime(
        alarms[i].timeString, createdAlarms[i].time);
    }
  });

  test('System statusbar shows an icon when an alarm is active', function() {
    assert.equal(alarm.statusIcon, false);
    alarm.create();
    assert.equal(alarm.statusIcon, true);

    alarm.toggle(0); // turn it off
    assert.equal(alarm.statusIcon, false);

    alarm.toggle(0); // turn it on
    assert.equal(alarm.statusIcon, true);

    alarm.remove(0); // delete the alarm
    assert.equal(alarm.statusIcon, false);
    assert.equal(alarm.list.length, 0);
  });

  // PythonTests: functional/test_clock_delete_alarm
  test('New alarm form shows "New Alarm" title after deletion', function() {
    alarm.create();
    alarm.remove(0);
    alarm.openNewForm();
    assert.ok($('.new-alarm-title').displayed());
  });

  test('Update alarm name and time', function() {
    var originalName = 'coffee break';
    var originalTime = alarm.create(originalName).time;
    var changedName = 'quitting time';
    var changedTime = new Date(originalTime + 1000 * 60);

    alarm.openEditForm(0);

    assert.equal(alarm.nameField.val(), originalName);
    utils.assertStringContainsTime(alarm.timeField.val(), originalTime);

    alarm.nameField.val(changedName);
    alarm.timeField.val(new Date(changedTime));

    alarm.saveForm();

    assert.equal(alarm.list[0].name, changedName);
    utils.assertStringContainsTime(alarm.list[0].timeString, changedTime);

    // Assert that the banner has been displayed.
    alarm.waitForBanner();
  });

  // PythonTests: functional/test_clock_create_new_alarm
  test('Toggle alarm state', function() {
    alarm.create();
    alarm.toggle(0);
    assert(!alarm.list[0].enabled, 'Alarm is disabled after toggling');
    assert(!$('#banner-countdown').displayed(),
           'Banner is not displayed after disabling an alarm');

    alarm.toggle(0);
    assert(alarm.list[0].enabled, 'Alarm is re-enabled after toggling');
  });

  test('Fire an alarm', function() {
    alarm.create();
    alarm.fire(0, function() {
      // Click the "stop" button
      var el = $('#ring-button-stop');
      try {
        el.click();
      } catch(e) {
        // Marionette throws an error because the frame closes while
        // handling the click event. This is expected.
      }
    });

    // Make sure we can see the analog clock again.
    $('#analog-clock').waitToAppear();
  });

});
