requireApp('clock/js/utils.js');
requireApp('clock/js/alarm.js');
requireApp('clock/js/alarmsdb.js');
requireApp('clock/js/alarm_edit.js');
requireApp('clock/js/alarm_manager.js');
requireApp('clock/js/alarm_list.js');
requireApp('clock/js/active_alarm.js');

requireApp('clock/test/unit/mock_l10n.js');
requireApp('clock/test/unit/mock_mozAlarm.js');
requireApp('clock/test/unit/mock_alarmsDB.js');

suite('AlarmEditView', function() {
  var subject;
  var _AlarmsDB = window.AlarmsDB;

  suiteSetup(function() {
    sinon.stub(ActiveAlarm, 'onAlarmFiredHandler');
    navigator.mozAlarms = new MockMozAlarms(
      ActiveAlarm.onAlarmFiredHandler);
    window.AlarmsDB = new MockAlarmsDB();
  });

  suiteTeardown(function() {
    ActiveAlarm.onAlarmFiredHandler.reset();
    window.AlarmsDB = _AlarmsDB;
  });

  suite('Alarm persistence', function() {

    suiteSetup(function() {
      subject = AlarmEdit;

      // shim the edit alarm view
      delete subject.element;
      subject.element = document.createElement('div');
      subject.element.dataset.id = '';
      delete subject.labelInput;
      subject.labelInput = document.createElement('input');
      delete subject.timeSelect;
      subject.timeSelect = document.createElement('input');

      sinon.stub(subject, 'getTimeSelect');
      sinon.stub(subject, 'getSoundSelect');
      sinon.stub(subject, 'getVibrateSelect');
      sinon.stub(subject, 'getSnoozeSelect');
      sinon.stub(subject, 'getRepeatSelect');

      // stub AlarmManager
      sinon.stub(AlarmManager, 'toggleAlarm');
      sinon.stub(AlarmManager, 'renderBannerBar');
      sinon.stub(AlarmManager, 'updateAlarmStatusBar');
    });

    suiteTeardown(function() {
      subject.getTimeSelect.restore();
      subject.getSoundSelect.restore();
      subject.getVibrateSelect.restore();
      subject.getSnoozeSelect.restore();
      subject.getRepeatSelect.restore();
      // AlarmManager restores
      AlarmManager.toggleAlarm.restore();
      AlarmManager.renderBannerBar.restore();
      AlarmManager.updateAlarmStatusBar.restore();
    });

    setup(function() {
      // Create an Alarm
      subject.alarm = new Alarm({
        id: 42,
        hour: 6,
        minute: 34
      });
      subject.alarm.setRepeat({
        monday: true, wednesday: true, friday: true
      });
      AlarmsDB.alarms.set(subject.alarm.id, subject.alarm);
      subject.getTimeSelect.returns({
        hour: subject.alarm.hour,
        minute: subject.alarm.minute
      });
      subject.getSoundSelect.returns(subject.alarm.sound);
      subject.getVibrateSelect.returns(subject.alarm.vibrate);
      subject.getSnoozeSelect.returns(subject.alarm.snooze);
      subject.getRepeatSelect.returns(subject.alarm.repeat);
      // AlarmManager restores
      AlarmManager.toggleAlarm.reset();
      AlarmManager.renderBannerBar.reset();
      AlarmManager.updateAlarmStatusBar.reset();
      this.sinon.useFakeTimers();
    });

    teardown(function() {
    });

    test('should save and delete an alarm', function(done) {
      var spyRefreshItem = sinon.stub(AlarmList, 'refreshItem');
      subject.save(function(err, alarm) {
        assert.ok(!err);
        assert.ok(alarm.id);
        // Refreshed AlarmList
        sinon.assert.calledOnce(spyRefreshItem);
        sinon.assert.calledWithExactly(spyRefreshItem, alarm);

        // Rendered BannerBar
        sinon.assert.calledOnce(AlarmManager.renderBannerBar);
        sinon.assert.calledOnce(AlarmManager.updateAlarmStatusBar);

        subject.alarm = alarm;
        subject.element.dataset.id = alarm.id;
        done();
      });
      this.sinon.clock.tick(10);
    });

    test('should delete an alarm', function(done) {
      var spyRefresh = sinon.stub(AlarmList, 'refresh');
      subject.delete(function(err, alarm) {
        assert.ok(!err);
        assert.ok(!AlarmsDB.alarms.has(alarm.id));
        sinon.assert.calledOnce(spyRefresh);
        sinon.assert.calledOnce(AlarmManager.updateAlarmStatusBar);
        AlarmList.refreshItem.restore();
        done();
      });
      this.sinon.clock.tick(10);
    });

    test('should add an alarm with sound, no vibrate', function(done) {
      var spyRefreshItem = sinon.stub(AlarmList, 'refreshItem');

      // mock the view to turn off vibrate
      subject.getVibrateSelect.returns('0');
      subject.save(function(err, alarm) {
        assert.ok(alarm.id);
        sinon.assert.calledOnce(spyRefreshItem);
        AlarmList.refreshItem.restore();
        AlarmsDB.getAlarm(alarm.id, function(err, alarm) {
          assert.equal(alarm.vibrate, 0);
          assert.notEqual(alarm.sound, 0);
          done();
        });
      });
      this.sinon.clock.tick(10);
    });

    test('should update existing alarm with no sound, vibrate', function(done) {
      var spyRefreshItem = sinon.stub(AlarmList, 'refreshItem');

      // mock the view to turn sound on and vibrate off
      subject.getVibrateSelect.returns('0');
      subject.save(function(err, alarm) {
        assert.ok(alarm.id);
        sinon.assert.calledOnce(spyRefreshItem);
        subject.getVibrateSelect.returns('1');
        subject.getSoundSelect.returns('0');
        subject.alarm = alarm;
        subject.element.dataset.id = alarm.id;
        subject.save(function(err, alarm) {
          assert.ok(alarm.id);
          sinon.assert.calledTwice(spyRefreshItem);
          AlarmList.refreshItem.restore();
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

});
