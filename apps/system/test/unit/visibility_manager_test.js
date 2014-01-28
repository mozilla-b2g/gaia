'use strict';

mocha.globals(['VisibilityManager', 'System', 'lockScreen']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_attention_screen.js');
requireApp('system/test/unit/mock_lock_screen.js');

var mocksForVisibilityManager = new MocksHelper([
  'AttentionScreen'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
    window.lockScreen = MockLockScreen;
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/visibility_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('handle events', function() {
    test('lock', function() {
      VisibilityManager._normalAudioChannelActive = false;
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledTwice);
      assert.equal(stubPublish.getCall(0).args[0], 'hidewindows');
      assert.equal(stubPublish.getCall(1).args[0], 'hidewindow');

      VisibilityManager._normalAudioChannelActive = true;
      VisibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledThrice);
      assert.equal(stubPublish.getCall(2).args[0], 'hidewindows');

      VisibilityManager._normalAudioChannelActive = false;
    });

    test('will-unlock', function() {
      MockAttentionScreen.mFullyVisible = false;
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');

      VisibilityManager.handleEvent({
        type: 'will-unlock'
      });

      assert.isTrue(stubPublish.calledTwice);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindows');
      assert.isTrue(stubPublish.getCall(1).args[0] === 'showwindow');

      MockAttentionScreen.mFullyVisible = true;
      VisibilityManager.handleEvent({
        type: 'will-unlock'
      });

      assert.isTrue(stubPublish.calledThrice);
      assert.isTrue(stubPublish.getCall(2).args[0] === 'showwindows');
    });

    test('attentionscreenshow', function() {
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
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

    test('attentionscreenhide', function() {
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
        type: 'attentionscreenhide'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindows');
    });

    test('Normal audio channel is on.', function() {
      VisibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'normal'
        }
      });

      assert.isTrue(VisibilityManager._normalAudioChannelActive);
    });

    test('Normal audio channel is off.', function() {
      VisibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'none'
        }
      });

      assert.isFalse(VisibilityManager._normalAudioChannelActive);
    });
  });
});
