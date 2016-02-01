/* global AppStarter, MockL10n */
'use strict';
require('/shared/test/unit/mocks/mock_l20n.js');

mocha.globals([
  'InitialPanelHandler',
  'LaunchContext',
  'ActivityHandler'
]);

Object.defineProperty(document, 'readyState', {
  value: 'loading',
  configurable: true
});
require('/js/startup.js');

suite('AppStarter', function() {
  var appStarter, realL10n;

  suiteSetup(function() {
    realL10n = document.l10n;
    document.l10n = MockL10n;
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
  });

  setup(function() {
    appStarter = AppStarter();
  });

  suite('start', function() {
    var fakeInitialPanelId = 'fakePanelId';
    var fakeInitialPanelHandler = {};

    setup(function() {
      this.sinon.stub(appStarter, '_getInitialPanelId', function() {
        return Promise.resolve(fakeInitialPanelId);
      });
      this.sinon.stub(appStarter, '_showInitialPanel');
      this.sinon.stub(appStarter, '_createLaunchContext');
      this.sinon.stub(appStarter, '_loadAlameda');

      this.sinon.stub(window, 'InitialPanelHandler', function() {
        return fakeInitialPanelHandler;
      });
    });

    test('should show correct initial panel', function(done) {
      appStarter.start().then(function() {
        sinon.assert.calledWith(
          appStarter._showInitialPanel, fakeInitialPanelId);
      }, function() {
        // This function does not reject.
        assert.isTrue(false, 'panel does not called with the correct panel id');
      }).then(done, done);
    });

    test('should define launch context correctly', function(done) {
      var fakeActivityHandler = {};
      var realActivityHandler = window.ActivityHandler;
      window.ActivityHandler = fakeActivityHandler;

      appStarter.start().then(function() {
        sinon.assert.calledWith(
          appStarter._createLaunchContext, fakeInitialPanelId,
            fakeInitialPanelHandler, fakeActivityHandler);
        window.ActivityHandler = realActivityHandler;
      }, function() {
        // This function does not reject.
        assert.isTrue(false, 'launch context is not defined correctly');
      }).then(done, done);
    });

    test('should load alameda', function(done) {
      appStarter.start().then(function() {
        sinon.assert.called(appStarter._loadAlameda);
      }, function() {
        // This function does not reject.
        assert.isTrue(false, 'failed to load alameda');
      }).then(done, done);
    });

    test('should only be executed once', function() {
      this.sinon.spy(appStarter._getInitialPanelId);
      appStarter.start();
      appStarter.start();

      sinon.assert.calledOnce(appStarter._getInitialPanelId);
    });
  });
});
