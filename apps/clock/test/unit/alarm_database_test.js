'use strict';
suite('AlarmDatabase Test Suite', function() {

  var alarmDatabase;

  suiteSetup(function(done) {
    require(['alarm', 'alarm_database'], function(alarm, alarm_database) {
      alarmDatabase = alarm_database;
      done();
    });
  });

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
         monday: true,
         wednesday: true,
         saturday: true,
         sunday: true
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
         monday: true,
         tuesday: true,
         wednesday: true,
         thursday: true,
         friday: true,
         saturday: true,
         sunday: true
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
         tuesday: true,
         thursday: true,
         friday: true
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
      assert.deepEqual(alarmDatabase.normalizeAlarmRecord(oldAlarm), newAlarm);
    });
  });
});
