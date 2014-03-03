/* global MocksHelper, LayoutManager, MockAppWindowManager, MockKeyboardManager,
          MockStatusBar, MockSoftwareButtonManager */
'use strict';

mocha.globals(['OrientationManager']);
requireApp('system/js/layout_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_app_window_manager.js');

var mocksForLayoutManager = new MocksHelper([
  'KeyboardManager', 'SoftwareButtonManager', 'StatusBar', 'AppWindowManager'
]).init();

suite('system/LayoutManager >', function() {
  mocksForLayoutManager.attachTestHelpers();

  var layoutManager;
  setup(function() {
    layoutManager = new LayoutManager().start();
  });

  suite('handle events', function() {
    test('resize', function() {
      var stubPublish = this.sinon.stub(layoutManager, 'publish');
      layoutManager.handleEvent({
        type: 'resize'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
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

  test('height calculation', function() {
    var H = window.innerHeight;
    var W = window.innerWidth;
    var _w = document.documentElement.clientWidth;
    MockKeyboardManager.mHeight = 100;
    MockStatusBar.height = 30;
    MockSoftwareButtonManager.height = 50;
    layoutManager.keyboardEnabled = true;
    assert.equal(layoutManager.usualHeight, H - 100 - 30 - 50);
    assert.equal(layoutManager.fullscreenHeight, H - 100 - 50);
    assert.equal(layoutManager.width, W);
    assert.equal(layoutManager.clientWidth, _w);

    assert.isTrue(layoutManager.match(W, H - 100 - 30 - 50, false));
    assert.isTrue(layoutManager.match(W, H - 100 - 50, true));
  });


  test('available Height > fullscreen app', function() {
    var app = {
      isFullScreen: function() {
        return true;
      }
    };
    this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
    assert.equal(LayoutManager.availableHeight, LayoutManager.fullscreenHeight);
  });

  test('available Height > not fullscreen app', function() {
    var app = {
      isFullScreen: function() {
        return false;
      }
    };
    this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
    assert.equal(LayoutManager.availableHeight, LayoutManager.usualHeight);
  });
});
