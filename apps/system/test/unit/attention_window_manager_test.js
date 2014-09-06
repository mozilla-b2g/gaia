/* globals attentionWindowManager, AttentionWindowManager,
            MockAttentionWindow, MocksHelper, MockHomescreenWindow,
            MockHomescreenLauncher, MockAppWindowManager,
            MockAppWindow, homescreenLauncher */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_attention_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_attention_indicator.js');
requireApp('system/shared/test/unit/mocks/mock_system.js');

var mocksForAttentionWindowManager = new MocksHelper([
  'AttentionWindow', 'System', 'HomescreenLauncher',
  'HomescreenWindow', 'AppWindowManager', 'AttentionIndicator'
]).init();

suite('system/AttentionWindowManager', function() {
  mocksForAttentionWindowManager.attachTestHelpers();
  var realHomescreenLauncher;
  var stubById;
  var att1, att2, att3;
  setup(function(done) {
    realHomescreenLauncher = window.homescreenLauncher;
    window.homescreenLauncher = new MockHomescreenLauncher();
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    att1 = new MockAttentionWindow(fakeAttentionConfig);
    att2 = new MockAttentionWindow(fakeAttentionConfig);
    att3 = new MockAttentionWindow(fakeAttentionConfig);

    requireApp('system/js/attention_window_manager.js', done);
  });

  teardown(function() {
    window.homescreenLauncher = realHomescreenLauncher;
    stubById.restore();
  });

  var fakeAttentionConfig = {
    url: 'app://www.fakef/index.html',
    manifest: {},
    manifestURL: 'app://www.fakef/ManifestURL',
    origin: 'app://www.fakef'
  };

  suite('Maintain attention indicator', function() {
    setup(function() {
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
    });
    teardown(function() {
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });
    test('When there is an attention window closed', function() {
      var ai = attentionWindowManager.attentionIndicator;
      var stubShow = this.sinon.stub(ai, 'show');

      attentionWindowManager._openedInstances = new Map([[att1, att1]]);
      attentionWindowManager._instances = [att1];
      window.dispatchEvent(new CustomEvent('attentionclosed', {
        detail: att1
      }));
      assert.isTrue(stubShow.called);
    });

    test('When there is an attention window requests to open', function() {
      var ai = attentionWindowManager.attentionIndicator;
      var stubHide = this.sinon.stub(ai, 'hide');

      attentionWindowManager._openedInstances = new Map();
      attentionWindowManager._instances = [att1];
      window.dispatchEvent(new CustomEvent('attentionopened', {
        detail: att1
      }));
      assert.isTrue(stubHide.called);
    });
  });

  suite('Handle events', function() {
    setup(function() {
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
    });
    teardown(function() {
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });

    test('broadcast lockscreen app opened event', function() {
      attentionWindowManager._instances =
        new Map([[att3, att3], [att2, att2], [att1, att1]]);
      var stubBroadcast = [
        this.sinon.stub(att1, 'broadcast'),
        this.sinon.stub(att2, 'broadcast'),
        this.sinon.stub(att3, 'broadcast')
      ];
      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubBroadcast[0].calledWith('lockscreen-appopened'));
      assert.isTrue(stubBroadcast[1].calledWith('lockscreen-appopened'));
      assert.isTrue(stubBroadcast[2].calledWith('lockscreen-appopened'));
    });

    test('broadcast lockscreen app closed event', function() {
      attentionWindowManager._instances =
        new Map([[att3, att3], [att2, att2], [att1, att1]]);
      var stubBroadcast = [
        this.sinon.stub(att1, 'broadcast'),
        this.sinon.stub(att2, 'broadcast'),
        this.sinon.stub(att3, 'broadcast')
      ];
      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubBroadcast[0].calledWith('lockscreen-appclosed'));
      assert.isTrue(stubBroadcast[1].calledWith('lockscreen-appclosed'));
      assert.isTrue(stubBroadcast[2].calledWith('lockscreen-appclosed'));
    });

    test('System resize request', function() {
      attentionWindowManager._topMostWindow = att1;
      var stubResize = this.sinon.stub(att1, 'resize');
      attentionWindowManager.handleEvent(
        new CustomEvent('system-resize')
      );
      assert.isTrue(stubResize.called);
    });

    test('Home button', function() {
      this.sinon.stub(homescreenLauncher, 'getHomescreen')
        .returns(new MockHomescreenWindow());
      var spyReady =
        this.sinon.stub(homescreenLauncher.getHomescreen(), 'ready');
      attentionWindowManager._openedInstances =
        new Map([[att3, att3], [att2, att2]]);
      var stubCloseForAtt3 = this.sinon.stub(att3, 'close');
      var stubCloseForAtt2 = this.sinon.stub(att2, 'close');
      attentionWindowManager.handleEvent(new CustomEvent('home'));
      spyReady.getCall(0).args[0]();
      assert.isTrue(stubCloseForAtt2.called);
      assert.isTrue(stubCloseForAtt3.called);
    });

    test('Home button, but no active window', function() {
      var stubGetHomescreen =
        this.sinon.stub(homescreenLauncher, 'getHomescreen');
      attentionWindowManager._openedInstances = new Map();
      attentionWindowManager.handleEvent(new CustomEvent('home'));
      assert.isFalse(stubGetHomescreen.called);
    });

    test('HoldHome event', function() {
      attentionWindowManager._openedInstances =
        new Map([[att3, att3], [att2, att2]]);
      var stubCloseForAtt3 = this.sinon.stub(att3, 'close');
      var stubCloseForAtt2 = this.sinon.stub(att2, 'close');
      attentionWindowManager.handleEvent(new CustomEvent('holdhome'));
      assert.isTrue(stubCloseForAtt2.called);
      assert.isTrue(stubCloseForAtt3.called);
    });

    test('Emergency alert is shown', function() {
      attentionWindowManager._openedInstances = new Map([[att1, att1]]);
      var stubClose = this.sinon.stub(att1, 'close');
      attentionWindowManager.handleEvent(
        new CustomEvent('emergencyalert')
      );
      assert.isTrue(stubClose.called);
    });

    test('If an app is launching due to request we should close.',
      function() {
        attentionWindowManager._openedInstances =
          new Map([[att1, att1], [att2, att2]]);
        var stubCloseForAtt1 = this.sinon.stub(att1, 'close');
        var stubCloseForAtt2 = this.sinon.stub(att2, 'close');
        attentionWindowManager.handleEvent(
          new CustomEvent('launchapp')
        );
        assert.isTrue(stubCloseForAtt1.called);
        assert.isTrue(stubCloseForAtt2.called);
      });


    test('If an app is launching by system message we should not close.',
      function() {
        attentionWindowManager._openedInstances =
          new Map([[att1, att1], [att2, att2]]);
        var stubCloseForAtt1 = this.sinon.stub(att1, 'close');
        var stubCloseForAtt2 = this.sinon.stub(att2, 'close');
        attentionWindowManager.handleEvent(
          new CustomEvent('launchapp', { detail: { stayBackground: true }})
        );
        assert.isFalse(stubCloseForAtt1.called);
        assert.isFalse(stubCloseForAtt2.called);
      });

    test('AttentionWindow is terminated', function() {
      attentionWindowManager._openedInstances = new Map([[att1, att1]]);
      assert.isTrue(attentionWindowManager._openedInstances.has(att1));
      attentionWindowManager.handleEvent(
        new CustomEvent('attentionterminated', {
          detail: att1
        }));
      assert.isFalse(attentionWindowManager._openedInstances.has(att1));
    });

    test('AttentionWindow is requesting to open', function() {
      attentionWindowManager._openedInstances = new Map([[att1, att1]]);
      var stubSetVisibleForAtt1 = this.sinon.stub(att1, 'setVisible');
      var stubSetVisibleForAtt2 = this.sinon.stub(att2, 'setVisible');
      var stubOpenForAtt2 = this.sinon.stub(att2, 'open');
      var stubPromoteForAtt2 = this.sinon.stub(att2, 'promote');
      var stubDemoteForAtt1 = this.sinon.stub(att1, 'demote');
      var spy = this.sinon.spy(att2, 'ready');

      attentionWindowManager.handleEvent(
        new CustomEvent('attentionrequestopen', {
          detail: att2
        })
      );
      spy.getCall(0).args[0]();
      assert.isTrue(stubSetVisibleForAtt1.calledWith(false));
      assert.isTrue(stubSetVisibleForAtt2.calledWith(true));
      assert.isTrue(stubOpenForAtt2.called);
      assert.isTrue(stubPromoteForAtt2.called);
      assert.isTrue(stubDemoteForAtt1.called);
      assert.deepEqual(att2, attentionWindowManager._topMostWindow);
    });

    suite('AttentionWindow is closed', function() {
      test('choose the next opened instance to bring to foreground',
        function() {
          var stubDemoteForAtt1 = this.sinon.stub(att1, 'demote');
          attentionWindowManager._openedInstances =
            new Map([[att1, att1], [att2, att2], [att3, att3]]);
          window.dispatchEvent(new CustomEvent('attentionclosed', {
            detail: att1
          }));
          assert.isTrue(stubDemoteForAtt1.called);
        });

      test('should publish attention-inactive if no opened instances',
        function() {
          var caught = false;
          window.addEventListener('attention-inactive', function inactive() {
            window.removeEventListener('attention-inactive', inactive);
            caught = true;
          });
          attentionWindowManager._openedInstances =
            new Map([[att1, att1], [att2, att2]]);
          window.dispatchEvent(new CustomEvent('attentionclosed', {
            detail: att1
          }));
          assert.isFalse(caught);
          window.dispatchEvent(new CustomEvent('attentionclosed', {
            detail: att2
          }));
          assert.isTrue(caught);
        });
    });

    suite('AttentionWindow is requesting to close', function() {
      test('No other opened instances and no active app window', function() {
        attentionWindowManager._openedInstances = new Map([[att1, att1]]);
        var stubClose = this.sinon.stub(att1, 'close');
        this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(null);
        window.dispatchEvent(new CustomEvent('attentionrequestclose', {
          detail: att1
        }));
        assert.isTrue(stubClose.called);
      });

      test('No other opened instances and no active app window', function() {
        var app = new MockAppWindow();
        attentionWindowManager._openedInstances = new Map([[att1, att1]]);
        attentionWindowManager._topMostWindow = att1;
        var stubClose = this.sinon.stub(att1, 'close');
        var spyReadyForApp = this.sinon.stub(app, 'ready');
        this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
        window.dispatchEvent(new CustomEvent('attentionrequestclose', {
          detail: att1
        }));
        assert.isFalse(stubClose.called);
        spyReadyForApp.getCall(0).args[0]();
        assert.isTrue(stubClose.called);
      });

      test('Having opened instances', function() {
        attentionWindowManager._openedInstances =
          new Map([[att1, att1], [att2, att2]]);
        attentionWindowManager._topMostWindow = att1;
        var stubClose = this.sinon.stub(att1, 'close');
        var spyReadyForAtt2 = this.sinon.stub(att2, 'ready');
        window.dispatchEvent(new CustomEvent('attentionrequestclose', {
          detail: att1
        }));
        assert.isFalse(stubClose.called);
        spyReadyForAtt2.getCall(0).args[0]();
        assert.isTrue(stubClose.called);
      });

      test('Having opened instances but the closing one is not top most',
        function() {
          attentionWindowManager._openedInstances =
            new Map([[att1, att1], [att2, att2]]);
          attentionWindowManager._topMostWindow = att2;
          var stubClose = this.sinon.stub(att1, 'close');
          window.dispatchEvent(new CustomEvent('attentionrequestclose', {
            detail: att1
          }));
          assert.isTrue(stubClose.called);
        });
    });
  });
});
