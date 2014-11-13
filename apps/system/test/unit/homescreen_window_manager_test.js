'use strict';
/* global MocksHelper, Service, HomescreenWindow, HomescreenLauncher,
          HomescreenWindowManager */

require('/shared/test/unit/mocks/mock_service.js');

requireApp('system/test/unit/mock_homescreen_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/js/homescreen_window_manager.js');

var mocksForHomescreenWindowManager = new MocksHelper([
  'HomescreenWindow', 'HomescreenLauncher', 'Service'
]).init();

suite('system/HomescreenWindowManager', function() {
  var fakeHome, fakeLauncher;
  var fakeHomeManifestURL = 'app://fakehome.gaiamobile.org/manifest.webapp';
  mocksForHomescreenWindowManager.attachTestHelpers();

  setup(function() {
    fakeHome = new HomescreenWindow('fakeHome');
    fakeLauncher = new HomescreenLauncher();
    window.homescreenLauncher = fakeLauncher;
    window.homescreenLauncher.mFeedFixtures({
      mHomescreenWindow: fakeHome,
      manifestURL: fakeHomeManifestURL,
      ready: true
    });
    window.homescreenLauncher.start();
  });

  teardown(function() {
    // MocksHelper doesn't call mTeardown() on instantiable object for us.
    fakeLauncher.mTeardown();
    delete window.homescreenLauncher;
  });

  suite('getHomescreen', function() {
    var homescreenWinMgr;
    var stubEnsureHome;
    setup(function() {
      homescreenWinMgr = new HomescreenWindowManager();
      homescreenWinMgr.start();
      stubEnsureHome = this.sinon.stub(fakeHome, 'ensure');
    });

    teardown(function() {
      homescreenWinMgr.stop();
      stubEnsureHome.restore();
    });

    test('with isHomeEvent = false', function() {
      assert.deepEqual(homescreenWinMgr.getHomescreen(), fakeHome);
      assert.isFalse(stubEnsureHome.called,
        'we donot ensure home while not called with home event');
    });

    test('with isHomeEvent = true', function() {
      assert.deepEqual(homescreenWinMgr.getHomescreen(true), fakeHome);
      assert.isTrue(stubEnsureHome.called,
        'we should ensure home with home event');
      assert.isTrue(stubEnsureHome.calledWith(true),
        'ensure should called with true');
    });

    test('while launcher is not ready', function() {
      fakeLauncher.ready = false;
      assert.isNull(homescreenWinMgr.getHomescreen(),
        'if launcher.ready = false, getHomescreen() should return null');
      assert.isFalse(stubEnsureHome.called,
        'if launcher.ready = false, ensure should not be called');
    });
  });

  suite('handleEvent', function() {
    var homescreenWinMgr;

    setup(function() {
      homescreenWinMgr = new HomescreenWindowManager();
      homescreenWinMgr.start();
    });

    teardown(function() {
      homescreenWinMgr.stop();
    });

    test('appswitching event', function() {
      var stubFadeOut = this.sinon.stub(fakeHome, 'fadeOut');
      homescreenWinMgr.handleEvent({type: 'appswitching'});
      assert.isTrue(stubFadeOut.calledOnce,
        'We must fadeOut the home when appswitching is received.');
      stubFadeOut.restore();
    });

    test('ftuskip event with Service.locked = true', function() {
      var stubSetVisible = this.sinon.stub(fakeHome, 'setVisible');
      Service.locked = true;
      
      homescreenWinMgr.handleEvent({type: 'ftuskip'});
      
      assert.isTrue(stubSetVisible.calledOnce,
        'To prevent race condition, we need to call setVisible(false).');
      assert.isTrue(stubSetVisible.calledWith(false),
        'hide homescreen to prevent race condition');
      stubSetVisible.restore();
    });

    test('ftuskip event with Service.locked = false', function() {
      var stubSetVisible = this.sinon.stub(fakeHome, 'setVisible');
      Service.locked = false;
      
      homescreenWinMgr.handleEvent({type: 'ftuskip'});

      assert.isFalse(stubSetVisible.called,
        'homescreen shows by default, we do not need to call setVisible.');
      stubSetVisible.restore();
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
