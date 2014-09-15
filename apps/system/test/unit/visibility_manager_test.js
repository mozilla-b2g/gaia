/* globals MocksHelper, VisibilityManager, MockRocketbar,
           MockAttentionWindowManager, MockTaskManager, MockAppWindow */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_task_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_attention_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_rocketbar.js');

var mocksForVisibilityManager = new MocksHelper([
  'AttentionWindowManager', 'System', 'AppWindow'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  var visibilityManager;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
    window.attentionWindowManager = MockAttentionWindowManager;
    window.rocketbar = new MockRocketbar();
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/visibility_manager.js', function() {
      visibilityManager = new VisibilityManager();
      visibilityManager.start();
      done();
    });
  });

  teardown(function() {
    window.attentionWindowManager = null;
    stubById.restore();
  });

  suite('handle events', function() {
    test('rocketbar-overlayopened', function() {
      visibilityManager._normalAudioChannelActive = false;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'rocketbar-overlayopened'
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.equal(stubPublish.getCall(0).args[0], 'hidewindow');

      visibilityManager._normalAudioChannelActive = true;
      visibilityManager.handleEvent({
        type: 'rocketbar-overlayopened'
      });

      assert.isTrue(stubPublish.calledOnce);

      visibilityManager._normalAudioChannelActive = false;
    });

    test('searchclosed', function() {
      this.sinon.stub(MockAttentionWindowManager,
        'hasActiveWindow').returns(false);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'rocketbar-overlayclosed'
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindow');
    });

    test('searchclosed when there is active attention window', function() {
      this.sinon.stub(MockAttentionWindowManager,
        'hasActiveWindow').returns(true);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'searchclosed'
      });

      assert.isFalse(stubPublish.called);
    });

    test('lock', function() {
      visibilityManager._normalAudioChannelActive = false;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'lockscreen-appopened'
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.equal(stubPublish.getCall(0).args[0], 'hidewindow');

      visibilityManager._normalAudioChannelActive = true;
      visibilityManager.handleEvent({
        type: 'lockscreen-appopened'
      });

      assert.isTrue(stubPublish.calledOnce);

      visibilityManager._normalAudioChannelActive = false;
    });

    test('lockscreen-request-unlock on attention window inactive', function() {
      this.sinon.stub(MockAttentionWindowManager,
        'hasActiveWindow').returns(false);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'lockscreen-request-unlock',
        detail: {}
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindow');
    });


    test('lockscreen-request-unlock on attention window active', function() {
      this.sinon.stub(MockAttentionWindowManager,
        'hasActiveWindow').returns(true);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'lockscreen-request-unlock',
        detail: {}
      });

      visibilityManager.handleEvent({
        type: 'lockscreen-request-unlock',
        detail: {}
      });

      assert.isFalse(stubPublish.called);
    });

    test('attention window is opened', function() {
      window.System.locked = false;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'attentionopened'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'hidewindow');
    });

    test('show lockscreen when screen is on.', function() {
      window.System.locked = true;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'attention-inactive'
      });

      assert.isTrue(stubPublish.calledWith('showlockscreenwindow'));
    });

    test('utility-tray-overlayopened', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'utility-tray-overlayopened'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('utility-tray-overlayclosed', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'utility-tray-overlayclosed'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('showwindowforscreenreader'));
    });

    test('Normal audio channel is on.', function() {
      visibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'normal'
        }
      });

      assert.isTrue(visibilityManager._normalAudioChannelActive);
    });

    test('Discard normal audio channel if homescreen is opening', function() {
      visibilityManager.handleEvent({
        type: 'homescreenopening'
      });

      assert.isFalse(visibilityManager._normalAudioChannelActive);
    });

    test('Normal audio channel is off.', function() {
      visibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'none'
        }
      });

      assert.isFalse(visibilityManager._normalAudioChannelActive);
    });

    test('show task manager, hide windows from screen reader', function () {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'cardviewshown'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('hide task manager, unhide windows from screen reader', function () {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'cardviewclosed'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('showwindowforscreenreader'));
    });

    test('show homescreen when task manager is showing', function () {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      window.taskManager = new MockTaskManager();
      window.taskManager.show();
      visibilityManager.handleEvent({
        type: 'homescreenopened'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('show homescreen when task manager is hidden', function () {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      window.taskManager = new MockTaskManager();
      window.taskManager.hide();
      visibilityManager.handleEvent({
        type: 'homescreenopened'
      });

      assert.isFalse(stubPublish.called);
      assert.isFalse(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('move app to foreground', function () {
      window.System.locked = false;
      this.sinon.stub(MockAttentionWindowManager, 'hasActiveWindow')
          .returns(false);
      var app = new MockAppWindow();
      var setVisibleStub = this.sinon.stub(app, 'setVisible');
      var event = new CustomEvent('apprequestforeground', {
        detail: app
      });
      window.dispatchEvent(event);
      assert.isTrue(setVisibleStub.calledWith(true));
    });

    test('move homescreen to foreground', function() {
      var homescreen = new MockAppWindow();
      var setVisibleStub = this.sinon.stub(homescreen, 'setVisible');
      var event = new CustomEvent('homescreenrequestforeground', {
        detail: homescreen
      });
      window.dispatchEvent(event);
      assert.isTrue(setVisibleStub.calledWith(true));
    });

    test('dont foreground app when attentionscreen visible', function () {
      window.System.locked = false;
      this.sinon.stub(MockAttentionWindowManager, 'hasActiveWindow')
          .returns(true);
      var app = new MockAppWindow();
      this.sinon.stub(app, 'setVisible');

      var event = new CustomEvent('apprequestforeground', {
        detail: app
      });
      window.dispatchEvent(event);
      assert.isFalse(app.setVisible.called);
    });

    test('dont foreground app when locked', function () {
      window.System.locked = true;
      this.sinon.stub(MockAttentionWindowManager, 'hasActiveWindow')
          .returns(false);
      var app = new MockAppWindow();
      this.sinon.stub(app, 'setVisible');

      var event = new CustomEvent('apprequestforeground', {
        detail: app
      });
      window.dispatchEvent(event);
      assert.isFalse(app.setVisible.called);
    });

    test('system-dialog-show', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'system-dialog-show'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('system-dialog-hide', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'system-dialog-hide'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('showwindowforscreenreader'));
    });
  });
});
