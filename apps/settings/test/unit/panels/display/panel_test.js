/* global loadBodyHTML*/
'use strict';

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('DisplayPanel', function() {
  var modules = [
    'panels/display/panel',
    'shared_mocks/mock_lazy_loader',
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'panels/display/display': 'MockDisplay',
      'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
    }
  };

  setup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    loadBodyHTML('_display.html');

    // Define MockSettingsPanel
    define('MockSettingsPanel', function() {
      return function(options) {
        return {
          init: options.onInit,
          beforeShow: options.onBeforeShow,
          beforeHide: options.onBeforeHide,
          hide: options.onHide
        };
      };
    });

    // Define MockDisplay
    this.mockDisplay = {
      init: function() {},
      initBrightnessItems: function() {}
    };
    define('MockDisplay', function() {
      return function() {
        return that.mockDisplay;
      };
    });

    requireCtx(modules, function(DisplayPanel, MockLazyLoader) {
      that.panel = DisplayPanel();
      that.mockLazyLoader = MockLazyLoader;
      done();
    });
  });

  test('init display module with correct data', function(done) {
    this.sinon.stub(this.mockDisplay, 'init');
    var mockSensorData = {};
    this.sinon.stub(this.mockLazyLoader, 'getJSON', function() {
      return Promise.resolve(mockSensorData);
    });

    this.panel.init(document.body);

    // Can't run other checks till promise is done
    this.mockLazyLoader.getJSON.getCall(0).returnValue.then(function(data) {
      assert.ok(
        this.mockDisplay.init.calledWith(sinon.match.any, mockSensorData));
    }.bind(this)).then(done, done);
  });
});
