/* globals MocksHelper, VisibilityManager,
           MockAppWindow, MockService */
'use strict';

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
require('/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForVisibilityManager = new MocksHelper([
  'Service', 'AppWindow'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  var visibilityManager;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
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
      MockService.mockQueryWith('AttentionWindowManager.hasActiveWindow',
        false);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');

      visibilityManager.handleEvent({
        type: 'lockscreen-request-unlock',
        detail: {}
      });

      assert.isTrue(stubPublish.calledOnce);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindow');
    });


    test('lockscreen-request-unlock on attention window active', function() {
      MockService.mockQueryWith('AttentionWindowManager.hasActiveWindow',
        true);
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
      MockService.mockQueryWith('locked', false);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'attentionopened'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'hidewindow');
    });

    test('show lockscreen when screen is on.', function() {
      MockService.mockQueryWith('locked', true);
      var stubPublish = this.sinon.stub(visibilityManager, 'publish');
      visibilityManager.handleEvent({
        type: 'attentionwindowmanager-deactivated'
      });

      assert.isTrue(stubPublish.calledWith('showlockscreenwindow'));
    });

    test('Normal audio channel is on.', function() {
      visibilityManager.handleEvent({
        type: 'visibleaudiochannelchanged',
        detail: {
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
        type: 'visibleaudiochannelchanged',
        detail: {
          channel: 'none'
        }
      });

      assert.isFalse(visibilityManager._normalAudioChannelActive);
    });

    test('move app to foreground', function () {
      MockService.mockQueryWith('locked', false);
      MockService.mockQueryWith('AttentionWindowManager.hasActiveWindow',
        false);
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

    test('move lockscreen to foreground', function () {
      var lockscreen = new MockAppWindow();
      var setVisibleStub = this.sinon.stub(lockscreen, 'setVisible');
      var event = new CustomEvent('lockscreen-apprequestforeground', {
        detail: lockscreen
      });
      window.dispatchEvent(event);
      assert.isTrue(setVisibleStub.calledWith(true));
    });

    test('move secure app to foreground', function () {
      var secureapp = new MockAppWindow();
      var setVisibleStub = this.sinon.stub(secureapp, 'setVisible');
      var event = new CustomEvent('secure-apprequestforeground', {
        detail: secureapp
      });
      window.dispatchEvent(event);
      assert.isTrue(setVisibleStub.calledWith(true));
    });

    test('dont foreground app when attentionscreen visible', function () {
      MockService.mockQueryWith('locked', false);
      MockService.mockQueryWith('AttentionWindowManager.hasActiveWindow',
        true);
      var app = new MockAppWindow();
      this.sinon.stub(app, 'setVisible');

      var event = new CustomEvent('apprequestforeground', {
        detail: app
      });
      window.dispatchEvent(event);
      assert.isFalse(app.setVisible.called);
    });

    test('dont foreground app when locked', function () {
      MockService.mockQueryWith('locked', true);
      MockService.mockQueryWith('AttentionWindowManager.hasActiveWindow',
        false);
      var app = new MockAppWindow();
      this.sinon.stub(app, 'setVisible');

      var event = new CustomEvent('apprequestforeground', {
        detail: app
      });
      window.dispatchEvent(event);
      assert.isFalse(app.setVisible.called);
    });
  });
});
