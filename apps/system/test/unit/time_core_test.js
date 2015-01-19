/* global BaseModule, MockService, MockFtuLauncher,
          MockL10n, Service, MockLazyLoader,
          MocksHelper, TimeIcon */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/time_icon.js');
requireApp('system/js/clock.js');
requireApp('system/js/time_core.js');

var mocksForTimeCore = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/TimeCore', function() {
  var subject, realMozL10n, realHidden;
  mocksForTimeCore.attachTestHelpers();

  setup(function() {
    MockService.mockQueryWith('getTopMostWindow', {
      CLASS_NAME: 'LockScreenWindow'
    });
    this.sinon.spy(MockLazyLoader, 'load');
    this.sinon.stub(MockL10n, 'ready');
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    this.sinon.useFakeTimers();
    this.sinon.stub(document, 'getElementById').returns(
      document.createElement('div'));
    subject = BaseModule.instantiate('TimeCore');
  });

  teardown(function() {
    navigator.mozL10n = realMozL10n;
    subject.stop();
  });

  test('Ftu step is ready', function(done) {
    subject.start();
    MockFtuLauncher.mReadyRightAway = true;
    MockLazyLoader.mLoadRightAway = true;
    Service.register('stepReady', MockFtuLauncher);
    Service.request('stepReady', 'test').then(function() {
      assert.isTrue(subject._stepReady);
      assert.isTrue(MockLazyLoader.load.called);
      Service.unregister('stepReady', MockFtuLauncher);
      done();
    });
  });

  test('Ftu step is not ready', function() {
    subject.start();
    assert.isUndefined(subject.icon);
  });

  suite('When step is ready', function() {
    setup(function() {
      subject.icon = new TimeIcon(subject);
      subject._stepReady = true;
      subject.start();
      this.sinon.stub(subject.icon, 'show');
      this.sinon.stub(subject.icon, 'hide');
      this.sinon.stub(subject.icon, 'start');
      this.sinon.stub(subject.icon, 'stop');
      this.sinon.stub(subject.icon, 'update');
    });

    suite('Visibility state', function() {
      var isDocumentHidden;
      realHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
      suiteSetup(function() {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: function() {
            return isDocumentHidden;
          }
        });
      });

      suiteTeardown(function() {
        if (realHidden) {
          Object.defineProperty(document, 'hidden', realHidden);
        } else {
          delete document.hidden;
        }
      });

      test('Screen is on', function() {
        isDocumentHidden = false;
        MockService.mockQueryWith('getTopMostWindow', {
          CLASS_NAME: 'AppWindow',
          isFullScreen: function() { return false; }
        });
        this.sinon.stub(subject, 'start');
        window.dispatchEvent(new CustomEvent('visibilitychange'));
        assert.isTrue(subject.icon.start.called);
      });

      test('Screen is off', function() {
        isDocumentHidden = true;
        MockService.mockQueryWith('getTopMostWindow', {
          CLASS_NAME: 'AppWindow',
          isFullScreen: function() { return false; }
        });
        this.sinon.stub(subject, 'stop');
        window.dispatchEvent(new CustomEvent('visibilitychange'));
        assert.isTrue(subject.icon.stop.called);
      });
    });

    test('first launch', function() {
      assert.isFalse(subject.icon.start.called);
      assert.isFalse(subject.icon.show.called);
    });

    test('Open secure window`', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'SecureWindow',
        isFullScreen: function() { return false; }
      });
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      assert.isTrue(subject.icon.start.called);
    });

    test('Close lockscreen window`', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'AppWindow',
        isFullScreen: function() { return false; }
      });
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      assert.isTrue(subject.icon.start.called);
    });

    test('Open attention window', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'AttentionWindow',
        isFullScreen: function() { return false; }
      });
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      assert.isTrue(subject.icon.start.called);
    });

    test('moztime change while lockscreen is unlocked', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'AppWindow',
        isFullScreen: function() { return false; }
      });
      var evt = new CustomEvent('timeformatchange');
      window.dispatchEvent(evt);
      MockL10n.ready.yield();
      assert.isTrue(subject.icon.start.called);
    });

    test('timeformatchange while timeformat changed', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'AppWindow',
        isFullScreen: function() { return false; }
      });
      var evt = new CustomEvent('timeformatchange');
      window.dispatchEvent(evt);
      MockL10n.ready.yield();
      assert.isTrue(subject.icon.start.called);
    });
  });
});
