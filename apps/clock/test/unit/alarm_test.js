'use strict';
suite('Alarm Test', function() {

  var Alarm;
  var activeAlarm;
  var alarmDatabase;

  suiteSetup(function(done) {
    require(['alarm', 'alarm_database', 'panels/alarm/active_alarm'],
      function(alarm, alarm_database, ActiveAlarm) {
        Alarm = alarm;
        activeAlarm = new ActiveAlarm();
        alarmDatabase = alarm_database;
        done();
      }
    );
  });

  suite('Date handling', function() {

    //var now = new Date(1398387324081); // thursday
    var now = new Date(Date.UTC(2014, 3, 24)); // thursday

    setup(function() {
      this.alarm = new Alarm({
        hour: 4,
        minute: 20,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
    });

    test('basic properties and serialization', function() {
      assert.deepEqual(this.alarm.toJSON(), {
        id: null,
        registeredAlarms: {},
        repeat: { monday: true, wednesday: true, friday: true },
        hour: 4,
        minute: 20,
        label: '',
        sound: 'ac_awake.opus',
        vibrate: true,
        snooze: 10,
        duration: 0
      });
    });

    // Bug 1146263
    test.skip('alarm is enabled when snoozed', function(done) {
      this.alarm.schedule('snooze').then(function() {
        assert.ok(this.alarm.isEnabled());
        done();
      }.bind(this));
    });

    // Bug 1146263
    test.skip('schedule saves alarm', function(done) {
      var spy = sinon.spy(alarmDatabase, 'put');
      this.alarm.schedule('normal').then(function() {
        spy.restore();
        assert.ok(spy.called);
        done();
      });
    });

    // Bug 1146263
    test.skip('cancel saves alarm', function(done) {
      var spy = sinon.spy(alarmDatabase, 'put');
      this.alarm.cancel().then(function() {
        spy.restore();
        assert.ok(spy.called);
        done();
      });
    });

    test('getNextAlarmFireTime', function() {
      // Today is thursday; the alarm fires first on Friday:
      var when = this.alarm.getNextAlarmFireTime(now);
      assert.equal(when.getDay(), 5); // Friday

      // After Friday, it should fire on Monday at the same time:
      var secondAlarm = this.alarm.getNextAlarmFireTime(when);
      assert.equal(secondAlarm.getHours(), when.getHours()); // at the same time
      assert.equal(secondAlarm.getMinutes(), when.getMinutes());
      assert.equal(secondAlarm.getDay(), 1); // on Monday
      // And again on Wednesday
      var thirdAlarm = this.alarm.getNextAlarmFireTime(secondAlarm);
      assert.equal(thirdAlarm.getHours(), secondAlarm.getHours());
      assert.equal(thirdAlarm.getMinutes(), secondAlarm.getMinutes());
      assert.equal(thirdAlarm.getDay(), 3); // on Wednesday
    });

    test('getNextSnoozeFireTime', function() {
      assert.equal(this.alarm.getNextSnoozeFireTime(now).getTime(),
                   now.getTime() + (10 * 60 * 1000));
    });
  });
});
