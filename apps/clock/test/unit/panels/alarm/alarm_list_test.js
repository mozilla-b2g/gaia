suite('AlarmList', function() {
  'use strict';

  /** Disabled due to intermittent, see bug 1089543

  var alarm, dom;
  var alarmListPanel, Alarm, panel;

  suiteSetup(function(done) {
    // Account for potentially-slow file loading operations
    this.timeout(60000);

    require([
      'panels/alarm/main',
      'panels/alarm/alarm_list',
      'alarm'
    ], function(AlarmPanel, AlarmListPanel, alarm) {
      var div = document.createElement('div');
      document.body.appendChild(div);
      panel = new AlarmPanel(div);

      alarmListPanel = new AlarmListPanel(document.createElement('div'));
      Alarm = alarm;
      done();
    });
  });

  setup(function() {
    alarm = new Alarm({
      id: 42,
      hour: 14,
      minute: 32,
      label: 'ALARM',
      registeredAlarms: {
        normal: 37
      }
    });
  });

  suite('render()', function() {
    setup(function() {
      dom = alarmListPanel.renderAlarm(alarm);
    });

    suite('markup contains correct information', function() {

      test('id', function() {
        assert.ok(dom.querySelector('[data-id="42"]'));
      });

      test('enabled', function() {
        assert.ok(dom.querySelector('input').checked);
      });

      test('disabled', function() {
        alarm = new Alarm({
          hour: 14,
          minute: 32
        });
        dom = alarmListPanel.renderAlarm(alarm);
        assert.ok(!dom.querySelector('input').checked);
      });

      test('labeled', function() {
        assert.equal(dom.querySelector('.label').textContent, 'ALARM');
      });

      test('unlabeled', function() {
        alarm.label = '';
        dom = alarmListPanel.renderAlarm(alarm);
        assert.equal(dom.querySelector('.label').textContent, 'alarm');
      });

      test('repeat', function() {
        alarm.repeat = { monday: true };
        dom = alarmListPanel.renderAlarm(alarm);
        assert.equal(
          dom.querySelector('.repeat').textContent, 'weekday-1-short'
        );
      });

      test('no repeat', function() {
        alarm.label = '';
        dom = alarmListPanel.renderAlarm(alarm);
        assert.equal(dom.querySelector('.repeat').textContent, '');
      });

      test('repeat, with-repeat class', function() {
        alarm.repeat = { monday: true };
        dom = alarmListPanel.renderAlarm(alarm);
        assert.isTrue(
          dom.querySelector('.alarm-item').classList.contains('with-repeat')
        );
      });

      test('no repeat, without with-repeat class', function() {
        alarm.label = '';
        dom = alarmListPanel.renderAlarm(alarm);
        assert.isFalse(
          dom.querySelector('.alarm-item').classList.contains('with-repeat')
        );
      });
    });
  });

  suite('toggleAlarmEnableState', function() {

    var origSetEnabled = Alarm.prototype.setEnabled;
    setup(function() {
      Alarm.prototype.setEnabled = sinon.spy(function(enabled) {
        if (enabled) {
          this.registeredAlarms.normal = 1;
        } else {
          delete this.registeredAlarms.normal;
        }
        return Promise.resolve();
      });
      this.sinon.spy(alarmListPanel, 'addOrUpdateAlarm');
    });

    teardown(function() {
      Alarm.prototype.setEnabled = origSetEnabled;
    });

    test('refreshes the list when enabled changes to false', function(done) {
      alarmListPanel.toggleAlarm(alarm, false, () => {
        sinon.assert.calledWith(alarmListPanel.addOrUpdateAlarm, alarm);
        assert.isFalse(alarm.isEnabled());
        dom = alarmListPanel.renderAlarm(alarm);
        assert.isFalse(dom.querySelector('input').checked);
        done();
      });
    });

    test('refreshes the list when enabled changes to true', function(done) {
      alarmListPanel.toggleAlarm(alarm, true, () => {
        sinon.assert.calledWith(alarmListPanel.addOrUpdateAlarm, alarm);
        assert.isTrue(alarm.isEnabled());
        dom = alarmListPanel.renderAlarm(alarm);
        assert.isTrue(dom.querySelector('input').checked);
        done();
      });
    });

    test('toggling multiple times works correctly', function(done) {
      alarmListPanel.toggleAlarm(alarm, true);
      alarmListPanel.toggleAlarm(alarm, false);
      alarmListPanel.toggleAlarm(alarm, true);
      alarmListPanel.toggleAlarm(alarm, false);
      alarmListPanel.toggleAlarm(alarm, true, () => {
        sinon.assert.calledWith(alarmListPanel.addOrUpdateAlarm, alarm);
        assert.isTrue(alarm.isEnabled());
        dom = alarmListPanel.renderAlarm(alarm);
        assert.isTrue(dom.querySelector('input').checked);
        done();
      });
    });

  });

  */
});
