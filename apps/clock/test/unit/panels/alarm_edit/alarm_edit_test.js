'use strict';

/** TEST TEMPORARILY DISABLED, SEE BUG 1033213 ****************************


suite('AlarmEditView', function() {
  var Alarm, AlarmEdit, activeAlarm, alarmDatabase,
      alarmListPanel, alarmEdit, panel;

  suiteSetup(function(done) {
    this.slow(25000);
    require([
      'alarm',
      'panels/alarm/active_alarm',
      'panels/alarm_edit/main',
      'alarm_database',
      'panels/alarm/main',
      'panels/alarm/alarm_list',
    ], function(alarm, ActiveAlarm, alarmEdit, alarm_database, AlarmPanel,
                AlarmListPanel) {
      // Instantiate an Alarm Panel to ensure that elements are initialized
      // properly
      var div = document.createElement('div');
      document.body.appendChild(div);
      panel = new AlarmPanel(div);

      Alarm = alarm;
      activeAlarm = new ActiveAlarm();
      AlarmEdit = alarmEdit;
      alarmDatabase = alarm_database;
      alarmListPanel = new AlarmListPanel(document.createElement('div'));

      done();
    });
  });

  setup(function() {
    alarmEdit = new AlarmEdit(document.createElement('div'));
  });

  suite('Alarm persistence', function() {

    setup(function(done) {
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

      // shim the edit alarm view
      alarmEdit.buttons.time.input = alarmEdit.selects.time;
      alarmEdit.initTimeSelect();

      this.sinon.stub(alarmEdit, 'getTimeSelect');
      this.sinon.stub(alarmEdit, 'getSoundSelect');
      this.sinon.stub(alarmEdit, 'getSnoozeSelect');
      this.sinon.stub(alarmEdit, 'getRepeatSelect');

      // Define the stubs to return the same values set in the
      // default alarm object.
      alarmEdit.getTimeSelect.returns({
        hour: alarm.hour,
        minute: alarm.minute
      });
      alarmEdit.getSoundSelect.returns(alarmEdit.alarm.sound);
      alarmEdit.checkboxes.vibrate.checked = alarmEdit.alarm.vibrate;
      alarmEdit.getSnoozeSelect.returns(alarmEdit.alarm.snooze);
      alarmEdit.getRepeatSelect.returns(alarmEdit.alarm.repeat);

      // Store to alarmsdb
      alarmDatabase.put(alarm).then(done);
    });

    test('should save an alarm, no id', function(done) {
      this.sinon.spy(alarmListPanel, 'addOrUpdateAlarm');
      this.sinon.stub(alarmListPanel.banner, 'show');

      alarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = '';

      alarmEdit.save(function(err, alarm) {
        assert.ok(!err);

        // Refreshed AlarmList
        assert.ok(alarmListPanel.addOrUpdateAlarm.called, 'addCalledOnce');
        assert.ok(alarmListPanel.addOrUpdateAlarm.calledWithExactly(alarm));

        // Rendered BannerBar
        assert.ok(alarmListPanel.banner.show.called);
        done();
      });
    });

    test('should save an alarm, existing id', function(done) {

      this.sinon.stub(alarmListPanel, 'addOrUpdateAlarm');
      this.sinon.stub(alarmListPanel.banner, 'show');
      alarmEdit.alarm = new Alarm({
        id: 1,
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = alarmEdit.alarm.id;

      alarmEdit.save(function(err, alarm) {
        assert.ok(!err);
        // Refreshed AlarmList
        assert.ok(alarmListPanel.addOrUpdateAlarm.called);
        assert.ok(alarmListPanel.addOrUpdateAlarm.calledWithExactly(alarm));

        // Rendered BannerBar
        assert.ok(alarmListPanel.banner.show.called);
        done();
      });

    });

    test('should delete an alarm', function(done) {
      this.sinon.stub(alarmListPanel, 'removeAlarm');

      alarmEdit.delete(function(err, alarm) {
        assert.ok(!err, 'delete reported error');
        assert.ok(alarmListPanel.removeAlarm.calledOnce);
        done();
      });
    });

    test('should add an alarm with sound, no vibrate', function(done) {
      this.sinon.stub(alarmListPanel, 'addOrUpdateAlarm');

      alarmEdit.checkboxes.vibrate.checked = false;

      alarmEdit.alarm = new Alarm({
        hour: 5,
        minute: 17,
        repeat: {
          monday: true, wednesday: true, friday: true
        }
      });
      alarmEdit.element.dataset.id = '';

      alarmEdit.save(function(err, alarm) {
        assert.ok(alarmListPanel.addOrUpdateAlarm.called);
        done();
      });

    });

    test('should update existing alarm with no sound, vibrate', function(done) {
      this.sinon.stub(alarmListPanel, 'addOrUpdateAlarm');
      // mock the view to turn sound on and vibrate off
      alarmEdit.checkboxes.vibrate.checked = true;
      alarmEdit.getSoundSelect.returns(null);
      alarmEdit.save(function(err, alarm) {
        assert.ok(alarm.id);
        assert.ok(alarmListPanel.addOrUpdateAlarm.called);
        alarmDatabase.get(alarm.id).then(function(alarm) {
          assert.equal(alarm.vibrate, true);
          assert.equal(alarm.sound, null);
          done();
        }).catch(done);
      });
    });

    test('should update start of week for l10n, Monday first', function(done) {
      var sunday = alarmEdit.element.querySelector('#repeat-select-sunday');
      var parent = sunday.parentElement;
      // Sunday gets moved to the end.
      parent.appendChild(sunday);

      mozL10n.language.code = 'en-US';
      document.l10n.requestLanguages(['en-US']).then(() => {
        assert.ok(!sunday.previousSibling, 'Sunday should be first (prev)');
        assert.ok(sunday.nextSibling, 'Sunday should be first (next)');
        done();
      });
    });

    test('should update start of week for l10n, Sunday first', function(done) {
      var sunday = alarmEdit.element.querySelector('#repeat-select-sunday');
      var parent = sunday.parentElement;
      // Sunday goes first.
      parent.insertBefore(sunday, parent.firstChild);

      document.l10n.requestLanguages(['fr']).then(() => {
        assert.ok(sunday.previousSibling, 'Sunday should be last (prev)');
        assert.ok(!sunday.nextSibling, 'Sunday should be last (next)');
        done();
      });
    });

  });

  suite('initTimeSelect', function() {
    var alarm;

    setup(function() {
      alarm = alarmEdit.alarm = new Alarm({});
    });

    suiteTeardown(function() {
      alarmEdit.alarm = alarm;
    });

    test('0:0, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '0';
      alarmEdit.alarm.minute = '0';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '00:00');
    });

    test('3:5, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '3';
      alarmEdit.alarm.minute = '5';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '03:05');
    });

    test('9:25, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '9';
      alarmEdit.alarm.minute = '25';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '09:25');
    });

    test('12:55, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '12';
      alarmEdit.alarm.minute = '55';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '12:55');
    });

    test('15:5, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '15';
      alarmEdit.alarm.minute = '5';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '15:05');
    });

    test('23:0, should init time select with format of system time picker',
      function() {
      alarmEdit.alarm.hour = '23';
      alarmEdit.alarm.minute = '0';
      alarmEdit.initTimeSelect();
      assert.equal(alarmEdit.selects.time.value, '23:00');
    });
  });

});

*/
