suite('AlarmList', function() {
  'use strict';
  var nma, fixture, dom;
  var AccessibilityHelper, AlarmList, Alarm, panel;

  suiteSetup(function(done) {
    // Account for potentially-slow file loading operations
    this.timeout(60000);

    testRequire([
        'panels/alarm/main',
        'panels/alarm/alarm_list',
        'alarm',
        'mocks/mock_shared/js/accessibility_helper',
        'mocks/mock_moz_alarm'
      ], {
        mocks: [
          'alarm_manager',
          'alarmsdb',
          'banner/main',
          'panels/alarm/active_alarm',
          'shared/js/accessibility_helper'
        ]
      },
      function(AlarmPanel, alarmList, alarm, mockAccessibilityHelper,
        mockMozAlarms) {
        // Instantiate an Alarm Panel to ensure that elements are initialized
        // properly
        var div = document.createElement('div');
        document.body.appendChild(div);
        panel = new AlarmPanel(div);

        AccessibilityHelper = mockAccessibilityHelper;
        AlarmList = alarmList;
        Alarm = alarm;
        nma = navigator.mozAlarms;
        navigator.mozAlarms = mockMozAlarms;
        done();
      }
    );
  });

  suiteTeardown(function() {
    navigator.mozAlarms = nma;
  });

  setup(function() {
    fixture = new Alarm({
      id: 42,
      hour: 14,
      minute: 32,
      label: 'FIXTURE',
      registeredAlarms: {
        normal: 37
      }
    });
  });

  suite('render()', function() {
    setup(function() {
      dom = document.createElement('div');
    });

    suite('markup contains correct information', function() {

      test('id ', function() {
        dom.innerHTML = AlarmList.render(fixture);
        assert.ok(dom.querySelector('[data-id="42"]'));
      });

      test('enabled ', function() {
        dom.innerHTML = AlarmList.render(fixture);
        assert.ok(dom.querySelector('input[checked=true]'));
      });

      test('disabled ', function() {

        fixture = new Alarm({
          hour: 14,
          minute: 32
        });

        dom.innerHTML = AlarmList.render(fixture);
        assert.isNull(dom.querySelector('input[checked=true]'));
      });

      test('labeled ', function() {
        dom.innerHTML = AlarmList.render(fixture);
        assert.equal(dom.querySelector('.label').textContent, 'FIXTURE');
      });

      test('unlabeled ', function() {
        fixture.label = '';
        dom.innerHTML = AlarmList.render(fixture);
        assert.equal(dom.querySelector('.label').textContent, 'alarm');
      });

      test('repeat ', function() {
        fixture.repeat = { monday: true };
        dom.innerHTML = AlarmList.render(fixture);
        assert.equal(
          dom.querySelector('.repeat').textContent, 'weekday-1-short'
        );
      });

      test('no repeat ', function() {
        fixture.label = '';
        dom.innerHTML = AlarmList.render(fixture);
        assert.equal(dom.querySelector('.repeat').textContent, '');
      });

      test('repeat, with-repeat class', function() {
        fixture.repeat = { monday: true };
        dom.innerHTML = AlarmList.render(fixture);
        assert.isTrue(
          dom.querySelector('.alarm-item').classList.contains('with-repeat')
        );
      });

      test('no repeat, without with-repeat class', function() {
        fixture.label = '';
        dom.innerHTML = AlarmList.render(fixture);
        assert.isFalse(
          dom.querySelector('.alarm-item').classList.contains('with-repeat')
        );
      });
    });
  });

  suite('toggleAlarmEnableState', function() {

    setup(function() {
      this.sinon.stub(fixture, 'setEnabled');
      this.sinon.spy(AlarmList, 'refreshItem');
    });

    test('invokes `refreshItem` if alarm state changes', function() {
      fixture.setEnabled.callsArgWith(1, null, fixture);
      AlarmList.toggleAlarmEnableState(false, fixture);
      sinon.assert.calledWith(AlarmList.refreshItem, fixture);
    });

    test('does not invoke `refreshItem` if alarm state is static', function() {
      fixture.setEnabled.callsArgWith(1, null, fixture);
      AlarmList.toggleAlarmEnableState(true, fixture);
      sinon.assert.neverCalledWith(AlarmList.refreshItem, fixture);
    });

    test('does not invoke `refreshItem` while other toggle operations are ' +
      'pending', function() {
      AlarmList.toggleAlarmEnableState(false, fixture);
      AlarmList.toggleAlarmEnableState(false, fixture);
      sinon.assert.calledTwice(fixture.setEnabled);

      fixture.setEnabled.args[0][1](null, fixture);

      sinon.assert.notCalled(AlarmList.refreshItem);

      fixture.setEnabled.args[1][1](null, fixture);

      sinon.assert.calledOnce(AlarmList.refreshItem);
    });
  });
});
