requireApp('clock/js/constants.js');
requireApp('clock/js/utils.js');
requireApp('clock/js/alarm.js');
requireApp('clock/js/alarmsdb.js');
requireApp('clock/js/alarm_manager.js');
requireApp('clock/js/alarm_edit.js');
requireApp('clock/js/alarm_list.js');
requireApp('clock/js/active_alarm.js');

requireApp('clock/test/unit/mocks/mock_alarmsDB.js');
requireApp('clock/test/unit/mocks/mock_alarm_manager.js');
requireApp('clock/test/unit/mocks/mock_asyncstorage.js');
requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');
requireApp('clock/test/unit/mocks/mock_mozAlarm.js');

suite('AlarmList', function() {
  var am, nml, nma, fixture, dom;

  suiteSetup(function() {
    am = AlarmManager;
    nml = navigator.mozL10n;
    nma = navigator.mozAlarms;

    AlarmManager = MockAlarmManager;
    navigator.mozL10n = MockL10n;
    navigator.mozAlarms = MockMozAlarms;

    loadBodyHTML('/index.html');

    AlarmList.init();
  });

  suiteTeardown(function() {
    AlarmManager = am;
    navigator.mozL10n = nml;
    navigator.mozAlarms = nma;
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
    });
  });
});
