/* global AppStarter, RootPanelHandler */
'use strict';

mocha.globals([
  'InitialPanelHandler',
  'RootPanelHandler',
  'LaunchContext',
  'ActivityHandler'
]);

Object.defineProperty(document, 'readyState', {
  value: 'loading',
  configurable: true
});
require('/js/startup.js');

suite('AppStarter', function() {
  var realMozL10n;
  var mockL10n = {
    once: function() {}
  };

  var appStarter;

  setup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = mockL10n;
    this.sinon.stub(mockL10n, 'once', function(callback) {
      callback();
    });

    appStarter = AppStarter();
  });

  teardown(function() {
    navigator.mozL10n = mockL10n;
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

      this.sinon.stub(window, 'RootPanelHandler', function() {
        return function() {};
      });
    });

    test('should show correct initial panel', function(done) {
      appStarter.start().then(function() {
        sinon.assert.calledWith(
          appStarter._showInitialPanel, fakeInitialPanelId);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
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
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should use RootPanelHandler if the initial panel id is root',
      function(done) {
        var fakePanel = {};

        appStarter._getInitialPanelId.restore();
        this.sinon.stub(appStarter, '_getInitialPanelId', function() {
          return Promise.resolve('root');
        });
        this.sinon.stub(document, 'getElementById', function() {
          return fakePanel;
        });

        appStarter.start().then(function() {
          sinon.assert.calledWith(
            window.InitialPanelHandler, fakePanel, RootPanelHandler);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
    });

    test('should load alameda', function(done) {
      appStarter.start().then(function() {
        sinon.assert.called(appStarter._loadAlameda);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    test('should only be executed once', function() {
      appStarter.start();
      appStarter.start();

      sinon.assert.calledOnce(mockL10n.once);
    });
  });
});
