'use strict';
mocha.setup({ globals: ['GestureDetector'] });

suite('AlarmEditView', function() {
  var nativeMozAlarms = navigator.mozAlarms;
  var Alarm, AlarmEdit, ActiveAlarm, AlarmsDB, AlarmList, AlarmManager,
      mozL10n, alarmEdit;

  suiteSetup(function(done) {
    this.slow(25000);
    testRequire([
        'alarm',
        'panels/alarm/active_alarm',
        'panels/alarm_edit/main',
        'mocks/mock_alarmsdb',
        'mocks/mock_panels/alarm/alarm_list',
        'mocks/mock_alarm_manager',
        'mocks/mock_moz_alarm',
        'mocks/mock_shared/js/l10n'
      ], {
        mocks: ['alarmsdb', 'panels/alarm/alarm_list', 'alarm_manager']
      }, function(alarm, activeAlarm, alarmEdit, mockAlarmsDB, mockAlarmList,
        mockAlarmManager, mockMozAlarms, mockMozL10n) {
        Alarm = alarm;
        ActiveAlarm = activeAlarm;
        AlarmEdit = alarmEdit;
        AlarmsDB = mockAlarmsDB;
        AlarmList = mockAlarmList;
        AlarmManager = mockAlarmManager;
        mozL10n = mockMozL10n;
        navigator.mozAlarms = new mockMozAlarms.MockMozAlarms(
          ActiveAlarm.handler
        );

        done();
      }
    );
  });

  setup(function() {
    this.sinon.stub(ActiveAlarm.singleton(), 'handler');
    alarmEdit = new AlarmEdit(document.createElement('div'));
  });

  suiteTeardown(function() {
    navigator.mozAlarms = nativeMozAlarms;
  });

  suite('Alarm persistence', function() {

    setup(function() {
      // Create an Alarm
      var alarm = alarmEdit.alarm = new Alarm({
        id: 42,
        hour: 6,
        minute: 34
      });
      alarm.repeat = {
        monday: true, wednesday: true, friday: true
      };
      alarmEdit.element.dataset.id = alarm.id;

      // Store to alarmsdb
      AlarmsDB.alarms.clear();
      AlarmsDB.alarms.set(alarm.id, alarm);
      AlarmsDB.idCount = 43;

      // shim the edit alarm view
      alarmEdit.buttons.time.input = alarmEdit.selects.time;
      alarmEdit.initTimeSelect();

      this.sinon.stub(alarmEdit, 'getTimeSelect');
      this.sinon.stub(alarmEdit, 'getSoundSelect');
      this.sinon.stub(alarmEdit, 'getVibrateSelect');
      this.sinon.stub(alarmEdit, 'getSnoozeSelect');
      this.sinon.stub(alarmEdit, 'getRepeatSelect');

      this.sinon.stub(AlarmManager, 'toggleAlarm');
      this.sinon.stub(AlarmManager, 'updateAlarmStatusBar');

      // Define the stubs to return the same values set in the
      // default alarm object.
      alarmEdit.getTimeSelect.returns({
        hour: alarm.hour,
        minute: alarm.minute
      });
      alarmEdit.getSoundSelect.returns(alarmEdit.alarm.sound);
      alarmEdit.getVibrateSelect.returns(alarmEdit.alarm.vibrate);
      alarmEdit.getSnoozeSelect.returns(alarmEdit.alarm.snooze);
      alarmEdit.getRepeatSelect.returns(alarmEdit.alarm.repeat);

      this.sinon.useFakeTimers();
    });

    test('should save an alarm, no id', function(done) {
      this.sinon.stub(AlarmList, 'refreshItem');
      this.sinon.stub(AlarmList.banner, 'show');
      alarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = null;

      this.sinon.stub(alarmEdit.alarm, 'setEnabled', function(val, callback) {
        callback(null, alarmEdit.alarm);
      });

      alarmEdit.save(function(err, alarm) {
        assert.ok(!err);
        // Refreshed AlarmList
        assert.ok(AlarmList.refreshItem.calledOnce);
        assert.ok(AlarmList.refreshItem.calledWithExactly(alarm));

        // Rendered BannerBar
        assert.ok(AlarmList.banner.show.calledOnce);
        assert.ok(AlarmManager.updateAlarmStatusBar.calledOnce);
        done();
      });
      this.sinon.clock.tick(100);
    });

    test('should save an alarm, existing id', function(done) {
      this.sinon.stub(AlarmList, 'refreshItem');
      this.sinon.stub(AlarmList.banner, 'show');
      var curid = AlarmsDB.idCount++;
      alarmEdit.alarm = new Alarm({
        id: curid,
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = alarmEdit.alarm.id;

      this.sinon.stub(alarmEdit.alarm, 'setEnabled', function(val, callback) {
        callback(null, alarmEdit.alarm);
      });

      alarmEdit.save(function(err, alarm) {
        assert.ok(!err);
        // Refreshed AlarmList
        assert.ok(AlarmList.refreshItem.calledOnce);
        assert.ok(AlarmList.refreshItem.calledWithExactly(alarm));

        // Rendered BannerBar
        assert.ok(AlarmList.banner.show.calledOnce);
        assert.ok(AlarmManager.updateAlarmStatusBar.calledOnce);
        done();
      });
      this.sinon.clock.tick(100);
    });

    test('should delete an alarm', function(done) {
      var called = false;
      this.sinon.stub(AlarmList, 'refresh');

      this.sinon.stub(alarmEdit.alarm, 'delete', function(callback) {
        callback(null, alarmEdit.alarm);
      });

      alarmEdit.delete(function(err, alarm) {
        assert.ok(!err, 'delete reported error');
        assert.ok(AlarmList.refresh.calledOnce);
        assert.ok(AlarmManager.updateAlarmStatusBar.calledOnce);
        called = true;
        done();
      });
      this.sinon.clock.tick(10);
      if (!called) {
        done('was not called');
      }
    });

    test('should add an alarm with sound, no vibrate', function(done) {
      this.sinon.stub(AlarmList, 'refreshItem');

      // mock the view to turn off vibrate
      alarmEdit.getVibrateSelect.returns('0');

      alarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = null;

      this.sinon.stub(alarmEdit.alarm, 'setEnabled', function(val, callback) {
        callback(null, alarmEdit.alarm);
      });

      alarmEdit.save(function(err, alarm) {
        assert.ok(AlarmList.refreshItem.calledOnce);
        done();
      });
      this.sinon.clock.tick(10);
    });

    test('should update existing alarm with no sound, vibrate', function(done) {
      this.sinon.stub(AlarmList, 'refresh');
      this.sinon.stub(AlarmList, 'refreshItem');
      // mock the view to turn sound on and vibrate off
      alarmEdit.getVibrateSelect.returns('0');

      this.sinon.stub(alarmEdit.alarm, 'setEnabled', function(val, callback) {
        callback(null, alarmEdit.alarm);
      });

      alarmEdit.getVibrateSelect.returns('1');
      alarmEdit.getSoundSelect.returns('0');
      alarmEdit.save(function(err, alarm) {
        assert.ok(alarm.id);
        assert.ok(AlarmList.refreshItem.calledOnce);
        AlarmsDB.getAlarm(alarm.id, function(err, alarm) {
          assert.equal(alarm.vibrate, 1);
          assert.equal(alarm.sound, 0);
          done();
        });
      });

      this.sinon.clock.tick(10);
    });

    test('should update start of week for l10n, Monday first', function() {
      var sunday = alarmEdit.element.querySelector('#repeat-select-sunday');
      var parent = sunday.parentElement;
      // Sunday gets moved to the end.
      parent.appendChild(sunday);

      mozL10n.setForTest('weekStartsOnMonday', '0');
      window.dispatchEvent(new Event('localized'));

      assert.ok(!sunday.previousSibling, 'Sunday should be first (prev)');
      assert.ok(sunday.nextSibling, 'Sunday should be first (next)');
    });

    test('should update start of week for l10n, Sunday first', function() {
      var sunday = alarmEdit.element.querySelector('#repeat-select-sunday');
      var parent = sunday.parentElement;
      // Sunday goes first.
      parent.insertBefore(sunday, parent.firstChild);

      mozL10n.setForTest('weekStartsOnMonday', '1');
      window.dispatchEvent(new Event('localized'));

      assert.ok(sunday.previousSibling, 'Sunday should be last (prev)');
      assert.ok(!sunday.nextSibling, 'Sunday should be last (next)');
    });

  });

  suite('initTimeSelect', function() {
    var alarm;

    setup(function() {
      alarm = alarmEdit.alarm = new Alarm();
    });

    suiteTeardown(function() {
      alarmEdit.alarm = alarm;
    });

    test('0:0, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '0';
      alarmEdit.alarm.minute = '0';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '00:00');
    });

    test('3:5, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '3';
      alarmEdit.alarm.minute = '5';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '03:05');
    });

    test('9:25, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '9';
      alarmEdit.alarm.minute = '25';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '09:25');
    });

    test('12:55, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '12';
      alarmEdit.alarm.minute = '55';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '12:55');
    });

    test('15:5, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '15';
      alarmEdit.alarm.minute = '5';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '15:05');
    });

    test('23:0, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '23';
      alarmEdit.alarm.minute = '0';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.timeSelect.value, '23:00');
    });
  });

});
