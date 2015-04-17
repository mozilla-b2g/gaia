/* global MocksHelper, LayoutManager, MockService, MockAppWindow */
'use strict';

require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/js/layout_manager.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_attention_window.js');

var mocksForLayoutManager = new MocksHelper([
  'Service',
  'AttentionWindow'
]).init();

suite('system/LayoutManager >', function() {
  mocksForLayoutManager.attachTestHelpers();

  var layoutManager;
  setup(function() {
    MockService.mTopMostWindow = new MockAppWindow();
    this.sinon.stub(MockService.mTopMostWindow, 'isFullScreenLayout')
        .returns(false);
    layoutManager = new LayoutManager();
    layoutManager.start();
  });

  suite('handle events', function() {
    suite('resize', function() {
      var oldMozOrientation;
      var stubPublish;

      setup(function() {
        oldMozOrientation = screen.mozOrientation;
        stubPublish = this.sinon.stub(layoutManager, 'publish');
      });

      teardown(function() {
        Object.defineProperty(screen, 'mozOrientation', {
          get: function(){
            return oldMozOrientation;
          }
        });
      });

      var setMozOrientation = function (orientation) {
        Object.defineProperty(screen, 'mozOrientation', {
          get: function(){
            return orientation;
          },
          configurable: true
        });
      };

      test('Do not publish system-resize if keyboard is showing and' +
           'orientation has changed', function() {
        layoutManager.keyboardEnabled = true;
        layoutManager._lastOrientation = 'portrait-secondary';

        setMozOrientation('landscape-secondary');

        layoutManager.handleEvent({
          type: 'resize'
        });
        assert.isFalse(stubPublish.calledWith('system-resize'));
        assert.isTrue(stubPublish.calledWith('orientationchange'));
      });

      test('Publish system-resize if keyboard is showing and' +
           'orientation has not changed', function() {
        layoutManager.keyboardEnabled = true;
        layoutManager._lastOrientation = 'portrait-secondary';

        setMozOrientation('portrait-secondary');

        layoutManager.handleEvent({
          type: 'resize'
        });
        assert.isTrue(stubPublish.calledWith('system-resize'));
        assert.isTrue(stubPublish.calledWith('orientationchange'));
      });

      test('Publish system-resize if keyboard is not showing', function() {
        layoutManager.keyboardEnabled = false;
        layoutManager._lastOrientation = 'portrait-secondary';

        setMozOrientation('landscape-secondary');

        layoutManager.handleEvent({
          type: 'resize'
        });
        assert.isTrue(stubPublish.calledWith('system-resize'));
        assert.isTrue(stubPublish.calledWith('orientationchange'));

        stubPublish.reset();

        // this time orientation isn't changed; we send system-resize too.
        layoutManager.handleEvent({
          type: 'resize'
        });
        assert.isTrue(stubPublish.calledWith('system-resize'));
        assert.isTrue(stubPublish.calledWith('orientationchange'));
      });

      test('_lastOrientation is correctly remembered', function() {
        layoutManager.keyboardEnabled = false;
        layoutManager._lastOrientation = 'portrait-secondary';

        setMozOrientation('landscape-secondary');

        layoutManager.handleEvent({
          type: 'resize'
        });

        assert.equal(layoutManager._lastOrientation, 'landscape-secondary');
      });
    });

    test('attentionwindowmanager-deactivated', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'attentionwindowmanager-deactivated'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('keyboardchange', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
      assert.isTrue(layoutManager.keyboardEnabled);
    });

    test('keyboardhide', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'keyboardhide'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
      assert.isFalse(layoutManager.keyboardEnabled);
    });

    test('mozfullscreenchange', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'mozfullscreenchange'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('software-button-enabled', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'software-button-enabled'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('software-button-disabled', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'software-button-disabled'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });
  });

  suite('height calculation', function() {
    var realDPX, stubDPX;
    var realIH, stubIH;
    var H, W;
    setup(function() {
      stubDPX = 1;
      realDPX = window.devicePixelRatio;

      stubIH = 545;
      realIH = window.innerHeight;

      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: function() { return stubDPX; }
      });

      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        get: function() { return stubIH; }
      });

      H = window.innerHeight;
      W = window.innerWidth;
    });

    teardown(function() {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        get: function() { return realDPX; }
      });

      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        get: function() { return realIH; }
      });

      MockService.locked = false;
    });

    test('should take into account keyboard and home button',
    function() {
      var _w = document.documentElement.clientWidth;
      MockService.mInputWindowManager_getHeight = 100;
      MockService.mSoftwareButtonManager_height = 50;
      layoutManager.keyboardEnabled = true;
      assert.equal(layoutManager.height(), H - 100 - 50);
      assert.equal(layoutManager.width(), W);
      assert.equal(layoutManager.clientWidth, _w);
      assert.isTrue(layoutManager.match(W, H - 100 - 50));
    });

    test('should take into account keyboard and home button with' +
         'full screen layout',
      function() {
        MockService.mTopMostWindow = new MockAppWindow();
        this.sinon.stub(MockService.mTopMostWindow, 'isFullScreenLayout')
          .returns(true);
        var _w = document.documentElement.clientWidth;
        MockService.mInputWindowManager_getHeight = 100;
        MockService.mSoftwareButtonManager_height = 50;
        layoutManager.keyboardEnabled = true;
        assert.equal(layoutManager.height(), H - 100);
        assert.equal(layoutManager.width(), W);
        assert.equal(layoutManager.clientWidth, _w);
        assert.isTrue(layoutManager.match(W, H - 100));
      });

    test('should take into account keyboard and home button with' +
         'full screen layout',
      function() {
        MockService.mTopMostWindow = new MockAppWindow();
        this.sinon.stub(MockService.mTopMostWindow, 'isFullScreenLayout')
          .returns(true);
        var _w = document.documentElement.clientWidth;
        MockService.mInputWindowManager_getHeight = 100;
        MockService.mSoftwareButtonManager_height = 50;
        layoutManager.keyboardEnabled = true;
        assert.equal(layoutManager.height(), H - 100);
        assert.equal(layoutManager.width(), W);
        assert.equal(layoutManager.clientWidth, _w);
        assert.isTrue(layoutManager.match(W, H - 100));
      });

    test('should take into account keyboard and home button with' +
         'full screen layout, but screen is locked',
      function() {
        MockService.locked = true;
        MockService.mTopMostWindow = new MockAppWindow();
        this.sinon.stub(MockService.mTopMostWindow, 'isFullScreenLayout')
          .returns(true);
        MockService.mInputWindowManager_getHeight = 100;
        MockService.mSoftwareButtonManager_height = 50;
        layoutManager.keyboardEnabled = true;
        // Even though the software home button is enabled and reports a height
        // its height should not affect the lockscreen
        assert.equal(layoutManager.height(), H - 100);
      });

    test('should return integral values in device pixels', function() {
      stubDPX = 1.5;
      assert.equal((layoutManager.height() * stubDPX) % 1, 0);
    });
  });

  suite('dimensions >', () => {
    var H, W, _w;
    setup(() => {
      H = window.innerHeight;
      W = window.innerWidth;
      _w = document.documentElement.clientWidth;
      MockService.mInputWindowManager_getHeight = 100;
      MockService.mSoftwareButtonManager_height = 50;
      MockService.mSoftwareButtonManager_width = 50;
    });

    test('height calculation with keyboard enabled', () => {
      layoutManager.keyboardEnabled = true;
      assert.equal(layoutManager.height(), H - 100 - 50);
      assert.isTrue(layoutManager.match(W - 50, H - 100 - 50));
    });

    test('height calculation with keyboard disabled', () => {
      layoutManager.keyboardEnabled = false;
      assert.equal(layoutManager.height(), H - 50);
      assert.isTrue(layoutManager.match(W - 50, H - 50));
    });

    test('width calculation', () => {
      assert.equal(layoutManager.width(), W - 50);
      assert.equal(layoutManager.clientWidth, _w);
    });
  });

  suite('getHeightFor()', function() {
    setup(function() {
      MockService.mSoftwareButtonManager_height = 50;
      MockService.locked = false;
      MockService.mInputWindowManager_getHeight = 100;
      layoutManager.keyboardEnabled = true;
    });

    test('should return the height for regular windows', function() {
      assert.equal(layoutManager.height(), layoutManager.getHeightFor({}));
    });

    test('should return the height for regular windows on lockscreen',
      function() {
        MockService.locked = true;
        assert.equal(layoutManager.height(), layoutManager.getHeightFor({}));
      });

    test('should consider SHB on attention windows and lockscreen', function() {
      MockService.locked = true;
      var attentionWindow = new window.AttentionWindow();
      assert.operator(layoutManager.getHeightFor({}), '>',
        layoutManager.getHeightFor(attentionWindow));
    });

    test('should not consider keyboard when ignoreKeyboard', function() {
      var attentionWindow = new window.AttentionWindow();
      assert.equal(layoutManager.height() + 100,
        layoutManager.getHeightFor(attentionWindow, true));
    });

    test('should not consider keyboard when ignoreKeyboard', function() {
      assert.equal(layoutManager.height() + 100,
        layoutManager.getHeightFor({}, true));
    });
  });
});
