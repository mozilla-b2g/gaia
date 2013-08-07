requireApp('clock/js/utils.js');
requireApp('clock/js/alarmsdb.js');
requireApp('clock/js/alarm_edit.js');
requireApp('clock/js/alarm_manager.js');
requireApp('clock/js/alarm_list.js');

suite('AlarmEditView', function() {
  var subject;

  before(function() {
    subject = AlarmEdit;

    // shim the edit alarm view
    delete subject.element;
    subject.element = document.createElement('div');
    subject.element.dataset.id = '';
    delete subject.labelInput;
    subject.labelInput = document.createElement('input');
    delete subject.timeSelect;
    subject.timeSelect = document.createElement('input');
    subject.initTimeSelect();

    sinon.stub(subject, 'getSoundSelect');
    sinon.stub(subject, 'getVibrateSelect');
    sinon.stub(subject, 'getSnoozeSelect');
    sinon.stub(subject, 'getRepeatSelect');
  });

  beforeEach(function() {
    subject.alarm = subject.getDefaultAlarm();
    subject.getSoundSelect.returns(subject.alarm.sound);
    subject.getVibrateSelect.returns(subject.alarm.vibrate);
    subject.getSnoozeSelect.returns(subject.alarm.snooze);
    subject.getRepeatSelect.returns(subject.alarm.repeat);
  });

  after(function() {
    subject.getSoundSelect.restore();
    subject.getVibrateSelect.restore();
    subject.getSnoozeSelect.restore();
    subject.getRepeatSelect.restore();
  });

  test('should save and delete an alarm', function(done) {
    var spyRefresh = sinon.stub(AlarmList, 'refresh');
    subject.save(function(alarm) {
      assert.ok(alarm.id);
      sinon.assert.calledOnce(spyRefresh);
      subject.alarm = alarm;
      subject.element.dataset.id = alarm.id;
      subject.delete(function() {
        sinon.assert.calledTwice(spyRefresh);
        AlarmList.refresh.restore();
        done();
      });
    });
  });

  test('should add an alarm with sound, no vibrate', function(done) {
    var spyRefresh = sinon.stub(AlarmList, 'refresh');

    // mock the view to turn off vibrate
    subject.getVibrateSelect.returns('0');
    subject.save(function(alarm) {
      assert.ok(alarm.id);
      sinon.assert.calledOnce(spyRefresh);
      AlarmList.refresh.restore();
      AlarmManager.getAlarmById(alarm.id, function(alarm) {
        assert.equal(alarm.vibrate, 0);
        assert.notEqual(alarm.sound, 0);
        done();
      });
    });
  });

  test('should update existing alarm with no sound, vibrate', function(done) {
    var spyRefresh = sinon.stub(AlarmList, 'refresh');

    // mock the view to turn sound on and vibrate off
    subject.getVibrateSelect.returns('0');
    subject.save(function(alarm) {
      assert.ok(alarm.id);
      sinon.assert.calledOnce(spyRefresh);
      subject.getVibrateSelect.returns('1');
      subject.getSoundSelect.returns('0');
      subject.alarm = alarm;
      subject.element.dataset.id = alarm.id;
      subject.save(function(alarm) {
        assert.ok(alarm.id);
        sinon.assert.calledTwice(spyRefresh);
        AlarmList.refresh.restore();
        AlarmManager.getAlarmById(alarm.id, function(alarm) {
          assert.equal(alarm.vibrate, 1);
          assert.equal(alarm.sound, 0);
          done();
        });
      });
    });
  });

});
