'use strict';

mocha.globals([
  'MockSettingsListener'
]);

suite('Date & Time > ', function() {
  var realL10n;
  var realTime;
  var mockSettingsCache, mockSettingsListener;
  var dateTime;

  suiteSetup(function(done) {
    var modules = [
      'unit/mock_navigator_moz_time',
      'unit/mock_l10n',
      'unit/mock_settings_cache',
      'shared_mocks/mock_settings_listener',
      'panels/date_time/date_time'
    ];
    var maps = {
      '*': {
        'module/settings_cache': 'unit/mock_settings_cache',
        'shared/settings_listener': 'shared_mocks/mock_settings_listener'
      }
    };
    testRequire(modules, maps, function(MockTime, MockL10n, MockSettingsCache,
      MockSettingsListener, module) {
      // mock time
      realTime = window.navigator.mozTime;
      window.navigator.mozTime = MockTime;
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;
      
      mockSettingsCache = MockSettingsCache;
      mockSettingsListener = MockSettingsListener;

      dateTime = module();
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.navigator.mozTime = realTime;
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.stub(dateTime, 'updateDate');
      this.sinon.stub(dateTime, 'updateClock');
      dateTime.init({});
    });

    test('we would call UI Update in init', function() {
      assert.ok(dateTime.updateDate.called);
      assert.ok(dateTime.updateClock.called);
    });
  });
});