'use strict';
/* global MocksHelper, HomescreenWindow, HomescreenLauncher,
          MockService, BaseModule */

require('/shared/test/unit/mocks/mock_service.js');

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/js/base_module.js');
requireApp('system/js/homescreen_window_manager.js');

var mocksForHomescreenWindowManager = new MocksHelper([
  'HomescreenWindow', 'HomescreenLauncher', 'Service'
]).init();

suite('system/HomescreenWindowManager', function() {
  var fakeHome, fakeLauncher;
  var fakeHomeManifestURL = 'app://fakehome.gaiamobile.org/manifest.webapp';
  mocksForHomescreenWindowManager.attachTestHelpers();

  suite('getHomescreen', function() {
    var homescreenWinMgr;
    var spyGetHome;
    var stubEnsureHome;
    setup(function() {
      homescreenWinMgr = BaseModule.instantiate('HomescreenWindowManager');
      homescreenWinMgr.service = MockService;
      homescreenWinMgr.start();
      fakeHome = new HomescreenWindow('fakeHome');
      fakeLauncher = new HomescreenLauncher();
      homescreenWinMgr.homescreenLauncher = fakeLauncher;
      homescreenWinMgr.homescreenLauncher.mFeedFixtures({
        mHomescreenWindow: fakeHome,
        manifestURL: fakeHomeManifestURL,
        ready: true
      });
      homescreenWinMgr.homescreenLauncher.start();
      spyGetHome = this.sinon.spy(fakeLauncher, 'getHomescreen');
      stubEnsureHome = this.sinon.stub(fakeHome, 'ensure');
    });

    teardown(function() {
      homescreenWinMgr.stop();
      stubEnsureHome.restore();
      // MocksHelper doesn't call mTeardown() on instantiable object for us.
      homescreenWinMgr.homescreenLauncher.mTeardown();
    });

    test('with ensure = false', function() {
      assert.deepEqual(homescreenWinMgr.getHomescreen(), fakeHome);
      assert.isTrue(spyGetHome.calledWith(undefined));
      assert.isFalse(stubEnsureHome.called,
        'we donot ensure home while not called with home event');
    });

    test('with ensure = true', function() {
      assert.deepEqual(homescreenWinMgr.getHomescreen(true), fakeHome);
      assert.isTrue(spyGetHome.calledWith(undefined));
      assert.isTrue(stubEnsureHome.called,
        'we should ensure home with home event');
      assert.isTrue(stubEnsureHome.calledWith(true),
        'ensure should called with true');
    });
  });

  suite('handleEvent', function() {
    var homescreenWinMgr;

    setup(function() {
      homescreenWinMgr = BaseModule.instantiate('HomescreenWindowManager');
      homescreenWinMgr.service = MockService;
      homescreenWinMgr.start();
      fakeHome = new HomescreenWindow('fakeHome');
      fakeLauncher = new HomescreenLauncher();
      homescreenWinMgr.homescreenLauncher = fakeLauncher;
      homescreenWinMgr.homescreenLauncher.mFeedFixtures({
        mHomescreenWindow: fakeHome,
        manifestURL: fakeHomeManifestURL,
        ready: true
      });
      homescreenWinMgr.homescreenLauncher.start();
    });

    teardown(function() {
      homescreenWinMgr.stop();
      // MocksHelper doesn't call mTeardown() on instantiable object for us.
      homescreenWinMgr.homescreenLauncher.mTeardown();
    });

    test('appswitching event', function() {
      var stubFadeOut = this.sinon.stub(fakeHome, 'fadeOut');
      homescreenWinMgr.handleEvent({type: 'appswitching'});
      assert.isTrue(stubFadeOut.calledOnce,
        'We must fadeOut the home when appswitching is received.');
      stubFadeOut.restore();
    });

    suite('open-app/webapps-launch', function() {

      function prepareTest(eventType, manifestURL, funcShouldCalled) {
        test(eventType + ' event with manifestURL: ' + manifestURL, function() {
          var evt = {
            type: eventType,
            detail: {
              manifestURL: manifestURL
            },
            stopImmediatePropagation: function() {}
          };
          var stubEvt = this.sinon.stub(evt, 'stopImmediatePropagation');
          var stubGetHome = this.sinon.stub(fakeLauncher, 'getHomescreen');

          homescreenWinMgr.handleEvent(evt);

          assert.equal(stubEvt.calledOnce, funcShouldCalled);
          assert.equal(stubGetHome.calledOnce, funcShouldCalled);

          stubGetHome.restore();
          stubEvt.restore();
        });
      }

      prepareTest('open-app', fakeHomeManifestURL, true);
      prepareTest('open-app', 'otherapp.manifest.url', false);
      prepareTest('webapps-launch', fakeHomeManifestURL, true);
      prepareTest('webapps-launch', 'otherapp.manifest.url', false);
    });
  });
});
