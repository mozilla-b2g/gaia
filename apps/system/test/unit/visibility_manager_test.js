/* globals MocksHelper, VisibilityManager,
           MockAttentionScreen */
'use strict';

mocha.globals(['VisibilityManager', 'System']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_attention_screen.js');

var mocksForVisibilityManager = new MocksHelper([
  'AttentionScreen'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  var visibilityManager;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/visibility_manager.js', function() {
      visibilityManager = new VisibilityManager().start();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('handle events', function() {
    test('lock', function() {
      visibilityManager._normalAudioChannelActive = false;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.equal(stubPublish.getCall(0).args[0], 'hidewindow');

      visibilityManager._normalAudioChannelActive = true;
      visibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledOnce);

      visibilityManager._normalAudioChannelActive = false;
    });

    test('will-unlock', function() {
      MockAttentionScreen.mFullyVisible = false;
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'will-unlock'
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindow');

      MockAttentionScreen.mFullyVisible = true;
      visibilityManager.handleEvent({
        type: 'will-unlock'
      });

      assert.isTrue(stubPublish.calledOnce);
    });

    test('attentionscreenshow', function() {
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'attentionscreenshow',
        detail: {
          origin: 'fake-dialer'
        }
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'overlaystart');
      this.sinon.clock.tick(3000);
      assert.isTrue(stubPublish.getCall(1).args[0] === 'hidewindow');
      assert.isTrue(stubPublish.getCall(1).args[1].origin === 'fake-dialer');
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
