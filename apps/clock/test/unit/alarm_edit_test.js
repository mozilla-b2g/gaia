requireApp('clock/js/constants.js');
requireApp('clock/js/utils.js');
requireApp('clock/js/alarm.js');
requireApp('clock/js/alarmsdb.js');
requireApp('clock/js/alarm_manager.js');
requireApp('clock/js/alarm_edit.js');
requireApp('clock/js/alarm_list.js');
requireApp('clock/js/active_alarm.js');

requireApp('clock/test/unit/mocks/mock_alarmsDB.js');
requireApp('clock/test/unit/mocks/mock_alarm_list.js');
requireApp('clock/test/unit/mocks/mock_alarm_manager.js');
requireApp('clock/test/unit/mocks/mock_asyncstorage.js');
requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');
requireApp('clock/test/unit/mocks/mock_mozAlarm.js');

suite('AlarmEditView', function() {
  var _AlarmsDB;
  var al, am, nml;
  var id = 1;

  suiteSetup(function() {
    sinon.stub(ActiveAlarm, 'handler');
    navigator.mozAlarms = new MockMozAlarms(
      ActiveAlarm.handler);
    _AlarmsDB = window.AlarmsDB;
    al = AlarmList;
    am = AlarmManager;
    nml = navigator.mozL10n;

    AlarmList = MockAlarmList;
    AlarmManager = MockAlarmManager;
    AlarmsDB = new MockAlarmsDB();
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');
  });

  suiteTeardown(function() {
    AlarmList = al;
    AlarmManager = am;
    AlarmsDB = _AlarmsDB;
    navigator.mozL10n = nml;
    ActiveAlarm.handler.restore();
  });

  suite('Alarm persistence', function() {

    setup(function() {
      // Create an Alarm
      var alarm = AlarmEdit.alarm = new Alarm({
        id: 42,
        hour: 6,
        minute: 34
      });
      alarm.repeat = {
        monday: true, wednesday: true, friday: true
      };
      AlarmEdit.element.dataset.id = alarm.id;

      // Store to alarmsdb
      AlarmsDB.alarms.clear();
      AlarmsDB.alarms.set(alarm.id, alarm);
      AlarmsDB.idCount = 43;

      // shim the edit alarm view
      delete AlarmEdit.labelInput;
      AlarmEdit.labelInput = document.createElement('input');
      delete AlarmEdit.timeSelect;
      AlarmEdit.timeSelect = document.createElement('input');
      AlarmEdit.initTimeSelect();

      this.sinon.stub(AlarmEdit, 'getTimeSelect');
      this.sinon.stub(AlarmEdit, 'getSoundSelect');
      this.sinon.stub(AlarmEdit, 'getVibrateSelect');
      this.sinon.stub(AlarmEdit, 'getSnoozeSelect');
      this.sinon.stub(AlarmEdit, 'getRepeatSelect');

      this.sinon.stub(AlarmManager, 'toggleAlarm');
      this.sinon.stub(AlarmManager, 'updateAlarmStatusBar');

      // Define the stubs to return the same values set in the
      // default alarm object.
      AlarmEdit.getTimeSelect.returns({
        hour: alarm.hour,
        minute: alarm.minute
      });
      AlarmEdit.getSoundSelect.returns(AlarmEdit.alarm.sound);
      AlarmEdit.getVibrateSelect.returns(AlarmEdit.alarm.vibrate);
      AlarmEdit.getSnoozeSelect.returns(AlarmEdit.alarm.snooze);
      AlarmEdit.getRepeatSelect.returns(AlarmEdit.alarm.repeat);

      this.sinon.useFakeTimers();
    });

    test('should save an alarm, no id', function(done) {
      this.sinon.stub(AlarmList, 'refreshItem');
      this.sinon.stub(AlarmList.banner, 'show');
      AlarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      AlarmEdit.element.dataset.id = null;
      AlarmEdit.save(function(err, alarm) {
        assert.ok(!err);
        assert.ok(alarm.id);
        assert.equal(alarm.id, 43);
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
      AlarmEdit.alarm = new Alarm({
        id: curid,
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      AlarmEdit.element.dataset.id = AlarmEdit.alarm.id;

      AlarmEdit.save(function(err, alarm) {
        assert.ok(!err);
        assert.ok(alarm.id);
        assert.equal(alarm.id, curid);
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
      AlarmEdit.delete(function(err, alarm) {
        assert.ok(!err, 'delete reported error');
        assert.ok(!AlarmsDB.alarms.has(alarm.id));
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
      AlarmEdit.getVibrateSelect.returns('0');

      var curid = AlarmsDB.idCount;
      AlarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      AlarmEdit.element.dataset.id = null;

      AlarmEdit.save(function(err, alarm) {
        assert.equal(alarm.id, curid);
        assert.ok(AlarmList.refreshItem.calledOnce);
        AlarmsDB.getAlarm(alarm.id, function(err, alarm) {
          assert.equal(alarm.vibrate, 0);
          assert.notEqual(alarm.sound, 0);
          done();
        });
      });
      this.sinon.clock.tick(10);
    });

    test('should update existing alarm with no sound, vibrate', function(done) {
      this.sinon.stub(AlarmList, 'refresh');
      this.sinon.stub(AlarmList, 'refreshItem');
      // mock the view to turn sound on and vibrate off
      AlarmEdit.getVibrateSelect.returns('0');
      AlarmEdit.alarm.save(function(err, alarm) {
        assert.ok(alarm.id);

        AlarmEdit.getVibrateSelect.returns('1');
        AlarmEdit.getSoundSelect.returns('0');
        AlarmEdit.alarm = alarm;
        AlarmEdit.element.dataset.id = alarm.id;

        AlarmEdit.save(function(err, alarm) {
          assert.ok(alarm.id);
          assert.ok(AlarmList.refreshItem.calledOnce);
          AlarmsDB.getAlarm(alarm.id, function(err, alarm) {
            assert.equal(alarm.vibrate, 1);
            assert.equal(alarm.sound, 0);
            done();
          });
        });
      });
      this.sinon.clock.tick(10);
    });

  });

  suite('initTimeSelect', function() {
    var alarm;

    suiteSetup(function() {
      alarm = AlarmEdit.alarm;
    });

    suiteTeardown(function() {
      AlarmEdit.alarm = alarm;
    });

    test('0:0, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '0';
      AlarmEdit.alarm.minute = '0';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '00:00');
    });

    test('3:5, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '3';
      AlarmEdit.alarm.minute = '5';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '03:05');
    });

    test('9:25, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '9';
      AlarmEdit.alarm.minute = '25';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '09:25');
    });

    test('12:55, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '12';
      AlarmEdit.alarm.minute = '55';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '12:55');
    });

    test('15:5, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '15';
      AlarmEdit.alarm.minute = '5';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '15:05');
    });

    test('23:0, should init time select with format of system time picker',
      function() {
      AlarmEdit.alarm.hour = '23';
      AlarmEdit.alarm.minute = '0';
      AlarmEdit.initTimeSelect();
      assert.equal(AlarmEdit.timeSelect.value, '23:00');
    });
  });

});
