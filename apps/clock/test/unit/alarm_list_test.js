suite('AlarmList', function() {
  var nml, nma, fixture, dom;
  var AlarmList, Alarm;

  suiteSetup(function(done) {
    testRequire([
        'alarm_list',
        'alarm',
        'mocks/mock_moz_alarm',
        'mocks/mock_navigator_mozl10n'
      ], {
        mocks: ['alarm_manager', 'alarmsdb', 'banner']
      },
      function(alarmList, alarm, mockMozAlarms, mockL10n) {
        AlarmList = alarmList;
        loadBodyHTML('/index.html');
        AlarmList.init();
        Alarm = alarm;
        nma = navigator.mozAlarms;
        nml = navigator.mozL10n;
        navigator.mozAlarms = mockMozAlarms;
        navigator.mozL10n = mockL10n;
        done();
      }
    );
  });

  suiteTeardown(function() {
    navigator.mozAlarms = nma;
    navigator.mozL10n = nml;
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
