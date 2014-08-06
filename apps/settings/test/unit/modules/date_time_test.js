'use strict';

mocha.globals([
  'MockSettingsListener'
]);

suite('Date & Time > ', function() {
  var realSettings, realTime, realL10n;
  var mockSettingsCache, mockSettingsListener;
  var DateTime;

  // keys
  var _kClockAutoEnabled = 'time.clock.automatic-update.enabled';
  var _kClockAutoAvailable = 'time.clock.automatic-update.available';
  var _kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';
  var _kTimezone = 'time.timezone';
  var _kUserSelected = 'time.timezone.user-selected';

  suiteSetup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_settings',
      'unit/mock_navigator_moz_time',
      'unit/mock_l10n',
      'unit/mock_settings_cache',
      'shared_mocks/mock_settings_listener',
      'modules/date_time'
    ];
    var maps = {
      '*': {
        'module/settings_cache': 'unit/mock_settings_cache',
        'shared/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    };
    testRequire(modules, maps, function(
      MockNavigatorSettings, MockTime, MockL10n,
      MockSettingsCache, MockSettingsListener, module) {
      // mock settings
      realSettings = window.navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;
      // mock time
      realTime = window.navigator.mozTime;
      window.navigator.mozTime = MockTime;
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      mockSettingsCache = MockSettingsCache;
      mockSettingsListener = MockSettingsListener;

      DateTime = module;
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozTime = realTime;
    window.navigator.mozSettings = realSettings;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(DateTime, '_attachListeners');
      this.sinon.stub(DateTime, '_getDefaults');
      DateTime._init();
    });

    test('_attachListeners and _getDefaults are called ' +
      'while get the instance', function() {
      assert.ok(DateTime._attachListeners.called);
      assert.ok(DateTime._getDefaults.called);
    });
  });

  suite('attach listeners', function() {
    setup(function() {
      this.sinon.stub(mockSettingsListener, 'observe');
      DateTime._attachListeners();
    });

    test('settings value observed', function() {
      assert.ok(mockSettingsListener.observe.calledWith(
        _kClockAutoEnabled));
      assert.ok(mockSettingsListener.observe.calledWith(
        _kClockAutoAvailable));
      assert.ok(mockSettingsListener.observe.calledWith(
        _kTimezoneAutoAvailable));
      assert.ok(mockSettingsListener.observe.calledWith(
        _kTimezone));
      assert.ok(mockSettingsListener.observe.calledWith(
        _kUserSelected));
    });
  });

  suite('Change system time', function() {
    setup(function() {
      this.sinon.stub(DateTime, '_autoUpdateDateTime');
      this.sinon.stub(DateTime._mozTime, 'set');
    });

    test('Set Date', function() {
      DateTime.setTime('date', '2013-05-21');
      assert.ok(DateTime._autoUpdateDateTime.called);
      var d = new Date();
      var pDate = DateTime.formatDate('2013-05-21');
      var pTime = DateTime.formatTime(d);
      var newDate = new Date(pDate + 'T' + pTime);
      assert.ok(DateTime._mozTime.set.calledWith(newDate));
    });

    test('Set clock', function() {
      DateTime.setTime('time', '9:12');
      assert.ok(DateTime._autoUpdateDateTime.called);
      var d = new Date();
      var pDate = DateTime.formatDate(d);
      var pTime = DateTime.formatTime('9:12');
      var newDate = new Date(pDate + 'T' + pTime);
      assert.ok(DateTime._mozTime.set.calledWith(newDate));
    });
  });

  suite('Date and time autoUpdate', function() {
    setup(function() {
      this.sinon.stub(DateTime, '_autoUpdateDate');
      this.sinon.stub(DateTime, '_autoUpdateClock');
    });

    test('Auto Update Date and time', function() {
      DateTime._autoUpdateDateTime();
      assert.ok(DateTime._autoUpdateDate.called);
      assert.ok(DateTime._autoUpdateClock.called);
    });
  });

  suite('Date autoUpdate', function() {
    setup(function() {
      this.sinon.spy(DateTime, '_autoUpdateDate');
      this.sinon.stub(window, 'setTimeout');
    });

    test('Auto Update Date and time', function() {
      DateTime._autoUpdateDate();
      assert.ok(window.setTimeout.called);
      assert.ok(DateTime._autoUpdateDate.called);
    });
  });

  suite('Clock autoUpdate', function() {
    setup(function() {
      this.sinon.spy(DateTime, '_autoUpdateClock');
      this.sinon.stub(window, 'setTimeout');
    });

    test('Auto Update Date and time', function() {
      DateTime._autoUpdateClock();
      assert.ok(window.setTimeout.called);
      assert.ok(DateTime._autoUpdateClock.called);
    });
  });
});
