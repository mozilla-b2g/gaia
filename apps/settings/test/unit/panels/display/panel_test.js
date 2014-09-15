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
      'panels/display/wallpaper': 'MockWallpaper',
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

    // Define MockWallpaper
    this.mockWallpaperSrc = 'mockSrc';
    this.mockWallpaper = {
      wallpaperSrc: this.mockWallpaperSrc,
      selectWallpaper: function() {},
      observe: function() {},
      unobserve: function() {}
    };
    define('MockWallpaper', function() {
      return function() {
        return that.mockWallpaper;
      };
    });

    // Define mock loadJSON
    this.mockSensorData = {};

    requireCtx(modules, function(DisplayPanel, MockLazyLoader) {
      that.panel = DisplayPanel();
      that.mockLazyLoader = MockLazyLoader;
      MockLazyLoader.mockResponse(that.mockSensorData);
      done();
    });
  });

  teardown(function() {
    this.mockLazyLoader.mTeardown();
  });

  test('init display module with correct data', function() {
    this.sinon.stub(this.mockDisplay, 'init');
    this.sinon.spy(this.mockLazyLoader, 'getJSON');

    this.panel.init(document.body);

    // Can't run other checks till promise is done
    this.mockLazyLoader.getJSON.returnValues[0].then(function() {
      assert.ok(
        this.mockDisplay.init.calledWith(sinon.match.any, this.mockSensorData));
    });
  });

  test('observe wallpaperSrc when onBeforeShow', function() {
    this.panel.init(document.body);
    this.sinon.stub(this.mockWallpaper, 'observe');
    this.panel.beforeShow(document.body);
    assert.ok(this.mockWallpaper.observe.calledWith('wallpaperSrc'));

    var location = document.location;
    assert.equal(
      document.querySelector('.wallpaper-preview').src,
        location.protocol + '//' + location.host +
        location.pathname.replace('_sandbox.html', this.mockWallpaperSrc));
  });

  test('unobserve appStorage when onHide', function() {
    this.panel.init(document.body);
    this.sinon.stub(this.mockWallpaper, 'unobserve');
    this.panel.beforeHide();
    assert.ok(this.mockWallpaper.unobserve.calledWith('wallpaperSrc'));
  });
});
