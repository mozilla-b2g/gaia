/* globals loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Date & Time panel > ', function() {
  var modules = [
    'panels/date_time/panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'modules/date_time': 'MockDateTime'
    }
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_date_time.html');

    // Define MockDateTime
    this.MockDateTime = {
      isMock: true,
      autoUpdateDate: function() {},
      autoUpdateClock: function() {},
      moztimechange: function() {},
      setTimezoneAutoEnabled: function() {},
      setClockAutoAvailable: function() {},
      setTimezoneAutoAvailable: function() {},
      observe: function() {},
      unobserve: function() {}
    };
    define('MockDateTime', function() {
      return that.MockDateTime;
    });

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit.bind(options),
          beforeShow: options.onBeforeShow.bind(options),
          hide: options.onHide.bind(options)
        };
      };
    });

    requireCtx(modules, function(module) {
      that.panel = module();
      that.panel.init(document.body);
      done();
    });
  });

  suite('handle lifecycle', function() {
    test('observe DateTime when onBeforeShow', function() {
      this.sinon.stub(this.MockDateTime, 'observe');
      this.sinon.stub(this.MockDateTime, 'setTimezoneAutoEnabled');
      this.panel.beforeShow();
      assert.ok(this.MockDateTime.observe.calledWith('time'));
      assert.ok(this.MockDateTime.observe.calledWith('date'));
      assert.ok(this.MockDateTime.observe.calledWith('timezone'));
      assert.ok(this.MockDateTime.observe.calledWith('clockAutoEnabled'));
      assert.ok(this.MockDateTime.observe.calledWith('clockAutoAvailable'));
      assert.ok(this.MockDateTime.observe.calledWith('timezoneAutoAvailable'));
      assert.ok(this.MockDateTime.observe.calledWith('userSelectedTimezone'));
    });

    test('unobserve DateTime when onHide', function() {
      this.sinon.stub(this.MockDateTime, 'unobserve');
      this.panel.hide();
      assert.ok(this.MockDateTime.unobserve.calledWith('date'));
      assert.ok(this.MockDateTime.unobserve.calledWith('time'));
      assert.ok(this.MockDateTime.unobserve.calledWith('timezone'));
      assert.ok(this.MockDateTime.unobserve.calledWith('clockAutoEnabled'));
      assert.ok(this.MockDateTime.unobserve.calledWith('clockAutoAvailable'));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        'timezoneAutoAvailable'));
      assert.ok(this.MockDateTime.unobserve.calledWith('userSelectedTimezone'));
    });
  });

  suite.only('UI visibility', function() {
    var timezonePickers;
    var timezoneInfo;

    setup(function() {
      timezonePickers = document.querySelector('.timezone-picker');
      timezoneInfo = document.querySelector('.timezone-info');
    });

    test('auto time is enabled and auto timezone is available', function() {
      this.MockDateTime.clockAutoEnabled = true;
      this.MockDateTime.clockAutoAvailable = true;
      this.MockDateTime.timezoneAutoAvailable = true;

      this.panel.beforeShow();

      for (var i = 0; i < timezonePickers.length; i++) {
        assert.isFalse(timezonePickers[i].hidden, 'timezone picker is visible');
      }
      assert.isFalse(timezoneInfo.hidden, 'timezone info visible');
    });

    test('auto time is enabled but auto timezone is unavailable', function() {
      this.MockDateTime.clockAutoEnabled = true;
      this.MockDateTime.clockAutoAvailable = true;
      this.MockDateTime.timezoneAutoAvailable = false;

      this.panel.beforeShow();

      for (var i = 0; i < timezonePickers.length; i++) {
        assert.isFalse(timezonePickers[i].hidden, 'timezone picker is visible');
      }
      assert.isTrue(timezoneInfo.hidden, 'timezone info is invisible');
    });

    test('auto time is disabled', function() {
      this.MockDateTime.clockAutoEnabled = false;
      this.MockDateTime.clockAutoAvailable = true;
      this.MockDateTime.timezoneAutoAvailable = true;

      this.panel.beforeShow();

      for (var i = 0; i < timezonePickers.length; i++) {
        assert.isFalse(timezonePickers[i].hidden, 'timezone picker is visible');
      }
      assert.isTrue(timezoneInfo.hidden, 'timezone info is invisible');
    });
  });
});
