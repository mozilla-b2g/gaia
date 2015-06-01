/* globals attentionWindowManager, AttentionWindowManager, MockService,
            MockAttentionWindow, MocksHelper, MockHomescreenWindow,
            MockHomescreenLauncher, MockAppWindow, homescreenLauncher */
'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_attention_window.js');
requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_attention_indicator.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForAttentionWindowManager = new MocksHelper([
  'AttentionWindow', 'Service', 'HomescreenLauncher',
  'HomescreenWindow'
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
    MockService.currentApp = null;
    stubById.restore();
  });

  var fakeAttentionConfig = {
    url: 'app://www.fakef/index.html',
    manifest: {},
    manifestURL: 'app://www.fakef/ManifestURL',
    origin: 'app://www.fakef'
  };

  suite('Hierarchy functions', function() {
    setup(function() {
      this.sinon.stub(MockService, 'request');
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
    });
    teardown(function() {
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });
    test('Should be active if there is an opened window', function() {
      window.dispatchEvent(new CustomEvent('attentionopened', {
        detail: att1
      }));
      assert.isTrue(attentionWindowManager.isActive());
    });
    test('Should not be active if there is no opened window', function() {
      assert.isFalse(attentionWindowManager.isActive());
    });
    test('start should register hierarchy', function() {
      assert.isTrue(
        MockService.request.calledWith('registerHierarchy',
          attentionWindowManager));
    });
    test('stop should unregister hierarchy', function() {
      attentionWindowManager.stop();
      assert.isTrue(
        MockService.request.calledWith('unregisterHierarchy',
          attentionWindowManager));
    });
  });

  suite('Maintain attention indicator', function() {
    var sytemStub;
    setup(function() {
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
      sytemStub = this.sinon.stub(MockService, 'request');
    });
    teardown(function() {
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });
    test('When there is an attention window closed', function() {
      attentionWindowManager._openedInstances = new Map([[att1, att1]]);
      attentionWindowManager._instances = [att1];
      window.dispatchEvent(new CustomEvent('attentionclosed', {
        detail: att1
      }));
      assert.isTrue(sytemStub.calledWith('makeAmbientIndicatorActive'));
    });

    test('When there is an attention window requests to open', function() {
      attentionWindowManager._openedInstances = new Map();
      attentionWindowManager._instances = [att1];
      window.dispatchEvent(new CustomEvent('attentionopened', {
        detail: att1
      }));
      assert.isTrue(sytemStub.calledWith('makeAmbientIndicatorInactive'));
    });
  });

  suite('get shown window count', function() {
    setup(function() {
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
    });
    teardown(function() {
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });
    test('should not take hidden window into account when updating indicator',
      function() {
        window.dispatchEvent(new CustomEvent('attentioncreated', {
          detail: att1
        }));
        this.sinon.stub(att1, 'isHidden').returns(true);
        window.dispatchEvent(new CustomEvent('attentioncreated', {
          detail: att2
        }));
        this.sinon.stub(MockService, 'request');
        window.dispatchEvent(new CustomEvent('attentionopened', {
          detail: att2
        }));
        assert.isTrue(MockService.request
                      .calledWith('makeAmbientIndicatorInactive'));
      });
  });

  suite('fullscreen mode', function() {
    var realFullScreen;

    setup(function() {
      realFullScreen = document.mozFullScreen;
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return true; }
      });
      window.attentionWindowManager = new AttentionWindowManager();
      window.attentionWindowManager.start();
    });

    teardown(function() {
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return realFullScreen; }
      });
      window.attentionWindowManager.stop();
      window.attentionWindowManager = null;
    });

    test('should exit fullscreen when opening attention',
    function() {
      var cancelSpy = this.sinon.spy(document, 'mozCancelFullScreen');
      attentionWindowManager._openedInstances =
        new Map();
      attentionWindowManager._topMostWindow = null;
      var spyReadyForAtt1 = this.sinon.stub(att1, 'ready');
      window.dispatchEvent(new CustomEvent('attentionrequestopen', {
        detail: att1
      }));
      spyReadyForAtt1.getCall(0).args[0]();
      sinon.assert.calledOnce(cancelSpy);
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

    test('broadcast secure app opened event', function() {
      attentionWindowManager._instances =
        new Map([[att3, att3], [att2, att2], [att1, att1]]);
      var stubBroadcast = [
        this.sinon.stub(att1, 'broadcast'),
        this.sinon.stub(att2, 'broadcast'),
        this.sinon.stub(att3, 'broadcast')
      ];
      window.dispatchEvent(new CustomEvent('secure-appopened'));
      assert.isTrue(stubBroadcast[0].calledWith('secure-appopened'));
      assert.isTrue(stubBroadcast[1].calledWith('secure-appopened'));
      assert.isTrue(stubBroadcast[2].calledWith('secure-appopened'));
    });

    test('broadcast secure app closed event', function() {
      attentionWindowManager._instances =
        new Map([[att3, att3], [att2, att2], [att1, att1]]);
      var stubBroadcast = [
        this.sinon.stub(att1, 'broadcast'),
        this.sinon.stub(att2, 'broadcast'),
        this.sinon.stub(att3, 'broadcast')
      ];
      window.dispatchEvent(new CustomEvent('secure-appclosed'));
      assert.isTrue(stubBroadcast[0].calledWith('secure-appclosed'));
      assert.isTrue(stubBroadcast[1].calledWith('secure-appclosed'));
      assert.isTrue(stubBroadcast[2].calledWith('secure-appclosed'));
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

    test('broadcast languagechange event', function() {
      attentionWindowManager._instances =
        new Map([[att3, att3], [att2, att2], [att1, att1]]);
      var stubBroadcast = [
        this.sinon.stub(att1, 'broadcast'),
        this.sinon.stub(att2, 'broadcast'),
        this.sinon.stub(att3, 'broadcast')
      ];
      window.dispatchEvent(new CustomEvent('languagechange'));
      assert.isTrue(stubBroadcast[0].calledWith('languagechange'));
      assert.isTrue(stubBroadcast[1].calledWith('languagechange'));
      assert.isTrue(stubBroadcast[2].calledWith('languagechange'));
    });

    test('System resize request', function() {
      attentionWindowManager._topMostWindow = att1;
      var stubResize = this.sinon.stub(att1, 'resize');
      attentionWindowManager.respondToHierarchyEvent({
        type: 'system-resize',
        detail: {
        }
      });
      assert.isTrue(stubResize.called);
    });

    test('System resize request (w/ waitUntil)', function() {
      attentionWindowManager._topMostWindow = att1;
      var p = Promise.resolve();
      var stubResize =
        this.sinon.stub(att1, 'resize').returns(p);
      var stubWaitUntil = this.sinon.stub();
      attentionWindowManager.respondToHierarchyEvent({
        type: 'system-resize',
        detail: {
          waitUntil: stubWaitUntil
        }
      });
      assert.isTrue(stubResize.called);
      assert.isTrue(stubWaitUntil.calledWith(p));
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
      attentionWindowManager.respondToHierarchyEvent(new CustomEvent('home'));
      spyReady.getCall(0).args[0]();
      assert.isTrue(stubCloseForAtt2.called);
      assert.isTrue(stubCloseForAtt3.called);
    });

    test('Home button, but no active window', function() {
      var stubGetHomescreen =
        this.sinon.stub(homescreenLauncher, 'getHomescreen');
      attentionWindowManager._openedInstances = new Map();
      attentionWindowManager.respondToHierarchyEvent(new CustomEvent('home'));
      assert.isFalse(stubGetHomescreen.called);
    });

    test('HoldHome event', function() {
      attentionWindowManager._openedInstances =
        new Map([[att3, att3], [att2, att2]]);
      var stubCloseForAtt3 = this.sinon.stub(att3, 'close');
      var stubCloseForAtt2 = this.sinon.stub(att2, 'close');
      attentionWindowManager.respondToHierarchyEvent(
        new CustomEvent('holdhome'));
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
          new CustomEvent('launchapp', {detail: {stayBackground: true}})
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

      test('should publish deactivated if no opened instances',
        function() {
          var caught = false;
          window.addEventListener('attentionwindowmanager-deactivated',
            function inactive() {
              window.removeEventListener('attentionwindowmanager-deactivated',
                inactive);
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
        MockService.currentApp = app;
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

    suite('updateClassState()', function() {
      test('should add a global class when there are attention windows',
        function() {
          attentionWindowManager._openedInstances = new Map([[att1, att1]]);
          attentionWindowManager.updateClassState();
          assert.isTrue(attentionWindowManager.screen.classList
            .contains('attention'));
        });

      test('should not add a global class when there are no attention windows',
        function() {
          attentionWindowManager._openedInstances = new Map();
          attentionWindowManager.updateClassState();
          assert.isFalse(attentionWindowManager.screen.classList
            .contains('attention'));
        });
    });
  });
});
