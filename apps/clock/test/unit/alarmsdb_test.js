suite('AlarmsDB Test Suite', function() {

  this.slow(2000);

  var alarmPrefix = 'alarmsdb_test';
  var Alarm, AlarmsDB, Utils, rawQuery;

  suiteSetup(function(done) {
    testRequire([
        'alarm',
        'alarmsdb',
        'utils'
      ], function(alarm, alarmsDB, utils) {
        AlarmsDB = alarmsDB;
        rawQuery = AlarmsDB.query.bind(AlarmsDB,
          AlarmsDB.DBNAME, AlarmsDB.STORENAME);
        Utils = utils;
        done();
      }
    );
    loadBodyHTML('/index.html');
  });


  teardown(function(teardownComplete) {
    var gen = Utils.async.generator(teardownComplete);
    var done = gen();
    rawQuery(AlarmsDB.load, function(err, list) {
      if (err) {
        done(err);
      }
      for (var i = 0; i < list.length; i++) {
        if (list[i].label.substring(0, alarmPrefix.length) === alarmPrefix) {
          rawQuery(AlarmsDB.delete, gen(), list[i].id);
        }
      }
      done();
    });
  });

  var staticrepeat = [
    [
      '1010011',
      {
        monday: true,
        wednesday: true,
        saturday: true,
        sunday: true
      }
    ],
    [
      '0101100',
      {
        tuesday: true,
        thursday: true,
        friday: true
      }
    ],
    [
      '1111111',
      {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      }
    ],
    [
      '0000000', { }
    ]
  ];

  function oldAlarm() {
    return {
      id: '',
      normalAlarmId: 7,
      snoozeAlarmId: 42,
      label: alarmPrefix,
      hour: 15,
      minute: 43,
      enabled: true,
      repeat: '1010011',
      sound: 'ac_classic_clock_alarm.opus',
      snooze: 5,
      color: 'Darkorange'
    };
  }

  function newAlarm() {
    return {
      registeredAlarms: {normal: 7, snooze: 42},
      repeat: {},
      label: alarmPrefix,
      hour: 15,
      minute: 43,
      sound: 'ac_classic_clock_alarm.opus',
      snooze: 5,
      color: 'Darkorange'
    };
  }

  function label(num) {
    return alarmPrefix + '_' + num;
  }
  function getnum(label) {
    return parseInt(label.substring(alarmPrefix.length + 1));
  }

  test('convert old alarms to new alarms', function(done) {
    var aset = new Set();

    function insertAlarms(cb) {
      var insert = Utils.async.generator(cb);
      var done = insert();
      for (var i = 0; i < staticrepeat.length; i++) {
        var alarm = oldAlarm();
        delete alarm.id;
        alarm.label = label(i);
        alarm.repeat = staticrepeat[i][0];
        // Asychronously store the alarm, and save the object in aset.
        (function(alarm, asyncDone) {
          rawQuery(AlarmsDB.put, function(err, palarm) {
            if (!err) {
              aset.add(palarm.id);
            }
            asyncDone(err);
          }, alarm);
        })(alarm, insert());
        done();
      }
    }

    function runConversion(cb, err) {
      if (err) {
        cb(err);
      }
      AlarmsDB.convertAlarms(cb);
    }

    function testConversion(cb, err) {
      if (err) {
        cb(err);
      }
      rawQuery(AlarmsDB.load, function(err, list) {
        if (err) {
          cb(err);
        }
        var count = 0;
        for (var i = 0; i < list.length; i++) {
          var alarm = list[i];
          if (aset.has(alarm.id)) {
            count++;
            var newC = newAlarm();
            newC.label = alarm.label;
            newC.id = alarm.id;
            newC.repeat = staticrepeat[getnum(alarm.label)][1];
            assert.deepEqual(alarm, newC);
          }
        }
        assert.ok(count === staticrepeat.length, 'found alarms ' + count);
        cb();
      });
    }
    // run the test
    insertAlarms(runConversion.bind(null, testConversion.bind(null, done)));
  });

  test('new alarms are unmodified', function(done) {
    var amap = new Map();

    function insertAlarms(cb) {
      var insert = Utils.async.generator(cb);
      var done = insert();
      for (var i = 0; i < staticrepeat.length; i++) {
        var alarm = newAlarm();
        delete alarm.id;
        alarm.label = label(i);
        alarm.repeat = staticrepeat[i][1];
        // Asychronously store the alarm, and save the object in amap.
        (function(alarm, asyncDone) {
          rawQuery(AlarmsDB.put, function(err, palarm) {
            if (!err) {
              amap.set(palarm.id, palarm);
            }
            asyncDone(err);
          }, alarm);
        })(alarm, insert());
        done();
      }
    }

    function runConversion(cb, err) {
      if (err) {
        cb(err);
      }
      AlarmsDB.convertAlarms(cb);
    }

    function testConversion(cb, err) {
      if (err) {
        cb(err);
      }
      rawQuery(AlarmsDB.load, function(err, list) {
        if (err) {
          cb(err);
        }
        var count = 0;
        for (var i = 0; i < list.length; i++) {
          var alarm = list[i];
          if (amap.has(alarm.id)) {
            count++;
            assert.deepEqual(alarm, amap.get(alarm.id));
          }
        }
        assert.ok(count === staticrepeat.length, 'found alarms ' + count);
        cb();
      });
    }
    // run the test
    insertAlarms(runConversion.bind(null, testConversion.bind(null, done)));
  });
});
