'use strict';

mocha.globals(['OrientationManager']);
requireApp('system/js/layout_manager.js');
requireApp('system/test/unit/mock_keyboard_manager.js');
requireApp('system/test/unit/mock_software_button_manager.js');
requireApp('system/test/unit/mock_statusbar.js');

var mocksForLayoutManager = new MocksHelper([
  'KeyboardManager', 'SoftwareButtonManager', 'StatusBar'
]).init();

suite('system/LayoutManager >', function() {
  mocksForLayoutManager.attachTestHelpers();

  suite('handle events', function() {
    test('resize', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'resize'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('status-active', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'status-active'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('status-inactive', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'status-inactive'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('keyboardchange', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
      assert.isTrue(LayoutManager.keyboardEnabled);
    });

    test('keyboardhide', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'keyboardhide'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
      assert.isFalse(LayoutManager.keyboardEnabled);
    });

    test('mozfullscreenchange', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'mozfullscreenchange'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('software-button-enabled', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
        type: 'software-button-enabled'
      });
      assert.isTrue(stubPublish.calledWith('system-resize'));
    });

    test('software-button-disabled', function() {
      var stubPublish = this.sinon.stub(LayoutManager, 'publish');
      LayoutManager.handleEvent({
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
    LayoutManager.keyboardEnabled = true;
    assert.equal(LayoutManager.usualHeight, H - 100 - 30 - 50);
    assert.equal(LayoutManager.fullscreenHeight, H - 100 - 50);
    assert.equal(LayoutManager.width, W);
    assert.equal(LayoutManager.clientWidth, _w);

    assert.isTrue(LayoutManager.match(W, H - 100 - 30 - 50, false));
    assert.isTrue(LayoutManager.match(W, H - 100 - 50, true));
  });
});
