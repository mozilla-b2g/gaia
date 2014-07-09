/* globals MocksHelper, VisibilityManager,
           MockAttentionWindowManager */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_attention_window_manager.js');
requireApp('system/test/unit/mock_system.js');

var mocksForVisibilityManager = new MocksHelper([
  'AttentionWindowManager', 'System'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  var visibilityManager;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
    window.attentionWindowManager = MockAttentionWindowManager;
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/visibility_manager.js', function() {
      visibilityManager = new VisibilityManager().start();
      done();
    });
  });

  teardown(function() {
    window.attentionWindowManager = null;
    stubById.restore();
  });

  suite('handle events', function() {
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


    test('lockscreen-request-unlock should be ignore if' +
          ' it is launching camera', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'lockscreen-request-unlock',
        detail: {
          activity: true
        }
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
        type: 'attentionclosing'
      });

      assert.isTrue(stubPublish.calledWith('showlockscreenwindow'));
    });

    test('rocketbar-overlayopened', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'rocketbar-overlayopened'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('hidewindowforscreenreader'));
    });

    test('rocketbar-overlayclosed', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'rocketbar-overlayclosed'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.calledWith('showwindowforscreenreader'));
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
  });
});
