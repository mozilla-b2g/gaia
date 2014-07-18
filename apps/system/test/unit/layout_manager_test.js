/* global MocksHelper, LayoutManager, MockKeyboardManager,
          MockAttentionScreen, MocksoftwareButtonManager, MockLockScreen */
'use strict';

requireApp('system/js/layout_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_attention_screen.js');

var mocksForLayoutManager = new MocksHelper([
  'AttentionScreen',
  'KeyboardManager',
  'softwareButtonManager',
  'LockScreen'
]).init();

suite('system/LayoutManager >', function() {
  mocksForLayoutManager.attachTestHelpers();

  var layoutManager;
  setup(function() {
    window.lockScreen = MockLockScreen;
    layoutManager = new LayoutManager();
    layoutManager.start();
  });

  suite('handle events', function() {
    test('resize', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'resize'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
      assert.isTrue(stubPublish.calledWith('orientationchange'));
    });

    test('status-active', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'status-active'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('status-inactive', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'status-inactive'
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
      MockAttentionScreen.statusHeight = 30;
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
    });

    test('should take into account statusbar, keyboard and home button',
    function() {
      var _w = document.documentElement.clientWidth;
      MockKeyboardManager.mHeight = 100;
      MocksoftwareButtonManager.height = 50;
      layoutManager.keyboardEnabled = true;
      assert.equal(layoutManager.height, H - 100 - 30 - 50);
      assert.equal(layoutManager.width, W);
      assert.equal(layoutManager.clientWidth, _w);
      assert.isTrue(layoutManager.match(W, H - 100 - 30 - 50));
    });

    test('should return integral values in device pixels', function() {
      stubDPX = 1.5;
      assert.equal((layoutManager.height * stubDPX) % 1, 0);
    });
  });
});
