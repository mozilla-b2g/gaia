'use strict';
suite('AlarmDatabase Test Suite', function() {

  var alarmDatabase;

  suiteSetup(function(done) {
    require(['alarm', 'alarm_database'], function(alarm, alarm_database) {
      alarmDatabase = alarm_database;
      done();
    });
  });

  suite('from the string version', function() {
    var alarmConversions = [
      [{ normalAlarmId: 7,
         snoozeAlarmId: 42,
         label: 'TEST 1',
         hour: 5,
         minute: 3,
         enabled: true,
         repeat: '1010011',
         sound: 'ac_awake.opus',
         vibrate: '1',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '0': true,
           '2': true,
           '5': true,
           '6': true
         },
         label: 'TEST 1',
         hour: 5,
         minute: 3,
         vibrate: true,
         sound: 'ac_awake.opus',
         snooze: 5 } ],

      [{ normalAlarmId: 7,
         snoozeAlarmId: 42,
         label: 'TEST 2',
         hour: 15,
         minute: 43,
         enabled: true,
         repeat: '1111111',
         vibrate: '0',
         sound: '0',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '0': true,
           '1': true,
           '2': true,
           '3': true,
           '4': true,
           '5': true,
           '6': true
         },
         label: 'TEST 2',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: null,
         snooze: 5 } ],

      [{ normalAlarmId: 7,
         snoozeAlarmId: 42,
         label: 'TEST 3',
         hour: 15,
         minute: 43,
         enabled: true,
         repeat: '0000000',
         sound: 'OUTDATED_SOUND_FILE.opus',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: { },
         label: 'TEST 3',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: 'ac_awake.opus',
         snooze: 5 } ],

      [{ normalAlarmId: 7,
         snoozeAlarmId: 42,
         label: 'TEST 4',
         hour: 15,
         minute: 43,
         enabled: true,
         repeat: '0101100',
         sound: 'ac_cycle.opus',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '1': true,
           '3': true,
           '4': true
         },
         label: 'TEST 4',
         hour: 15,
         vibrate: false,
         minute: 43,
         sound: 'ac_cycle.opus',
         snooze: 5 } ]
    ];

    test('convert old alarms to new alarms', function() {
      alarmConversions.forEach(function(item) {
        var [oldAlarm, newAlarm] = item;
        assert.deepEqual(
          alarmDatabase.normalizeAlarmRecord(oldAlarm), newAlarm);
      });
    });
  });

  suite('from the hardcoded days version', function() {
    var alarmConversions = [
      [{ registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           'sunday': true,
           'tuesday': true,
           'friday': true,
           'saturday': true
         },
         label: 'TEST 1',
         hour: 5,
         minute: 3,
         vibrate: true,
         sound: 'ac_awake.opus',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '0': true,
           '2': true,
           '5': true,
           '6': true
         },
         label: 'TEST 1',
         hour: 5,
         minute: 3,
         vibrate: true,
         sound: 'ac_awake.opus',
         snooze: 5 } ],

      [{ registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           'sunday': true,
           'monday': true,
           'tuesday': true,
           'wednesday': true,
           'thursday': true,
           'friday': true,
           'saturday': true
         },
         label: 'TEST 2',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: null,
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '0': true,
           '1': true,
           '2': true,
           '3': true,
           '4': true,
           '5': true,
           '6': true
         },
         label: 'TEST 2',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: null,
         snooze: 5 } ],

      [{ registeredAlarms: { normal: 7, snooze: 42 },
         repeat: { },
         label: 'TEST 3',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: 'ac_awake.opus',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: { },
         label: 'TEST 3',
         hour: 15,
         minute: 43,
         vibrate: false,
         sound: 'ac_awake.opus',
         snooze: 5 } ],

      [{ registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           'monday': true,
           'wednesday': true,
           'thursday': true
         },
         label: 'TEST 4',
         hour: 15,
         vibrate: false,
         minute: 43,
         sound: 'ac_cycle.opus',
         snooze: 5 },
       { registeredAlarms: { normal: 7, snooze: 42 },
         repeat: {
           '1': true,
           '3': true,
           '4': true
         },
         label: 'TEST 4',
         hour: 15,
         vibrate: false,
         minute: 43,
         sound: 'ac_cycle.opus',
         snooze: 5 } ]
    ];

    test('convert old alarms to new alarms', function() {
      alarmConversions.forEach(function(item) {
        var [oldAlarm, newAlarm] = item;
        assert.deepEqual(
          alarmDatabase.normalizeAlarmRecord(oldAlarm), newAlarm);
      });
    });
  });
});
