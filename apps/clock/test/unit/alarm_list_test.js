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

  suite('render()', function() {
    setup(function() {
      dom = document.createElement('div');

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
});
