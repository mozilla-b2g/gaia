/* globals loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Date & Time panel > ', function() {
  var realL10n;
  var modules = [
    'shared_mocks/mock_l10n',
    'panels/date_time/panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'modules/date_time': 'MockDateTime'
    }
  };

  suiteSetup(function(done) {
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
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide,
          // mock expose following functions for test
          _datePickerChange: function() {},
          _timePickerChange: function() {},
          _renderTimeZone: function() {},
          _renderTimeFormat: function() {},
          _updateUI: function() {}
        };
      };
    });

    requireCtx(modules, function(MockL10n, module) {
      // mock l10n
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      that.panel = module();
      that.panel.init(document.body);
      done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  suite('Handle lifecycle', function() {
    test('observe DateTime when onBeforeShow', function() {
      this.sinon.stub(this.MockDateTime, 'observe');
      this.sinon.stub(this.MockDateTime, 'setTimezoneAutoEnabled');
      this.panel.beforeShow();
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('date')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('clock')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('clockAutoEnabled')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('clockAutoAvailable')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('timezoneAutoAvailable')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('timezone')));
      assert.ok(this.MockDateTime.observe.calledWith(
        sinon.match('userSelectedTimezone')));
    });

    test('unobserve DateTime when onHide', function() {
      this.sinon.stub(this.MockDateTime, 'unobserve');
      this.panel.hide();
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('date')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('clock')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('clockAutoEnabled')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('clockAutoAvailable')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('timezoneAutoAvailable')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('timezone')));
      assert.ok(this.MockDateTime.unobserve.calledWith(
        sinon.match('userSelectedTimezone')));
    });
  });
});
