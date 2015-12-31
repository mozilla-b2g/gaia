'use strict';

suite('Date & Time > ', function() {
  var realSettings, realTime;
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
      'modules/date_time'
    ];
    var maps = {
      '*': {}
    };

    testRequire(modules, maps, function(
      MockNavigatorSettings, module) {
      // mock settings
      realSettings = window.navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;
      // mock time
      var MockTime = {
        set: function() {}
      };
      realTime = window.navigator.mozTime;
      window.navigator.mozTime = MockTime;

      DateTime = module;
      done();
    });
  });

  suiteTeardown(function() {
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
      this.sinon.spy(window.navigator.mozSettings, 'addObserver');
      DateTime._attachListeners();
    });

    test('settings value observed', function() {
      assert.ok(window.navigator.mozSettings.addObserver.calledWith(
        _kClockAutoEnabled));
      assert.ok(window.navigator.mozSettings.addObserver.calledWith(
        _kClockAutoAvailable));
      assert.ok(window.navigator.mozSettings.addObserver.calledWith(
        _kTimezoneAutoAvailable));
      assert.ok(window.navigator.mozSettings.addObserver.calledWith(
        _kTimezone));
      assert.ok(window.navigator.mozSettings.addObserver.calledWith(
        _kUserSelected));
    });
  });

  suite('Change system time', function() {
    setup(function() {
      this.sinon.stub(DateTime._mozTime, 'set');
    });

    test('Set Date', function() {
      DateTime.setTime('date', '2013-05-21');
      var d = new Date();
      var pDate = DateTime._formatDate('2013-05-21');
      var pTime = DateTime._formatTime(d, true);
      var newDate = new Date(pDate + 'T' + pTime);
      assert.ok(DateTime._mozTime.set.calledWith(newDate));
    });

    test('Set clock', function() {
      DateTime.setTime('time', '9:12');
      var d = new Date();
      var pDate = DateTime._formatDate(d, true);
      var pTime = DateTime._formatTime('9:12');
      var newDate = new Date(pDate + 'T' + pTime);
      assert.ok(DateTime._mozTime.set.calledWith(newDate));
    });
  });

  suite('Date and time autoUpdate', function() {
    setup(function() {
      this.sinon.stub(DateTime, '_autoUpdateDate');
      this.sinon.stub(DateTime, '_autoUpdateTime');
    });

    test('Auto Update Date and time', function() {
      DateTime._autoUpdateDateTime();
      assert.ok(DateTime._autoUpdateDate.called);
      assert.ok(DateTime._autoUpdateTime.called);
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

  suite('Time autoUpdate', function() {
    setup(function() {
      this.sinon.spy(DateTime, '_autoUpdateTime');
      this.sinon.stub(window, 'setTimeout');
    });

    test('Auto Update Date and time', function() {
      DateTime._autoUpdateTime();
      assert.ok(window.setTimeout.called);
      assert.ok(DateTime._autoUpdateTime.called);
    });
  });
});
