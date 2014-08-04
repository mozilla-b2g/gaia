/* global MockMozActivity */
'use strict';
require('/shared/test/unit/mocks/mock_moz_activity.js');

suite('start testing > ', function() {
  var wallpaper;
  var realMozActivity;

  suiteSetup(function(done) {
    var modules = [
      'modules/mvvm/observable',
      'shared_mocks/mock_settings_listener',
      'shared_mocks/mock_settings_url',
      'shared_mocks/mock_omadrm_fl',
      'panels/display/wallpaper'
    ];

    var maps = {
      'panels/display/wallpaper': {
        'shared/settings_listener': 'shared_mocks/mock_settings_listener',
        'shared/settings_url': 'shared_mocks/mock_settings_url',
        'shared/omadrm/fl': 'shared_mocks/mock_omadrm_fl'
      }
    };
    testRequire(modules, maps, function(Observable, SettingsListener,
      SettingsUrl, ForwardLock, Wallpaper) {
        this.Observable = Observable;
        this.Wallpaper = Wallpaper;
        this.mockSettingsListener = SettingsListener;
        this.mockSettingsURL = SettingsUrl;
        this.mockForwardLock = ForwardLock;
        done();
      }.bind(this));

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
  });

  suiteTeardown(function() {
    window.MozActivity = realMozActivity;
  });

  setup(function() {
    MockMozActivity.mSetup();
    wallpaper = this.Wallpaper();
    this.clock = sinon.useFakeTimers();
  });

  teardown(function() {
    MockMozActivity.mTeardown();
    this.clock.restore();
    // clear the lock so tests that write into settings would not read from
    // other tests' locks
    this.mockSettingsListener.getSettingsLock().clear();
  });

  suite('start test wallpaper module > ', function() {
    test('_init', function() {
      this.sinon.stub(wallpaper, '_watchWallpaperChange');
      wallpaper._init();
      assert.equal(wallpaper._watchWallpaperChange.calledOnce, true);
    });

    test('select wallpaper', function() {
      this.sinon.stub(wallpaper, '_triggerActivity');
      this.sinon.stub(this.mockForwardLock, 'getKey');
      wallpaper.selectWallpaper();
      assert.equal(this.mockForwardLock.getKey.calledOnce, true);
      this.mockForwardLock.getKey.args[0][0]();
      assert.equal(wallpaper._triggerActivity.calledOnce, true);
    });

    test('_watchWallpaperChange', function() {
      var value = 'testlink';
      wallpaper.wallpaperURL = new this.mockSettingsURL();
      wallpaper._watchWallpaperChange();
      this.mockSettingsListener.mTriggerCallback(wallpaper.WALLPAPER_KEY,
        value);
      assert.equal(wallpaper.wallpaperSrc, value);
    });

    test('_triggerActivity', function() {
      this.sinon.stub(wallpaper, '_onPickSuccess');
      this.sinon.stub(wallpaper, '_onPickError');
      var secret = !null;
      var testblob = 'testblob';

      MockMozActivity.successResult = { blob: testblob };
      wallpaper._triggerActivity(secret);

      assert.equal(MockMozActivity.calls[0].name, 'pick');
      assert.equal(MockMozActivity.calls[0].data.includeLocked, secret);
      assert.deepEqual(MockMozActivity.calls[0].data.type,
        ['wallpaper', 'image/*']);

      // waiting for onsuccess. (50ms is defined in mock_moz_activity.js)
      this.clock.tick(50);
      assert.equal(wallpaper._onPickSuccess.calledOnce, true);
      sinon.assert.calledWith(wallpaper._onPickSuccess, testblob, secret);

      MockMozActivity.mTriggerOnError();
      assert.equal(wallpaper._onPickError.calledOnce, true);
    });

    test('_onPickSuccess, blob type is mimeSubtype', function() {
      this.sinon.stub(this.mockForwardLock, 'unlockBlob');
      this.mockForwardLock.mSetupMimeSubtype('mimeSubtype');

      var testBlob = {
        type: 'test/mimeSubtype'
      };
      var testSecret = 'testSecret';

      wallpaper._onPickSuccess(testBlob, testSecret);
      sinon.assert.calledOnce(this.mockForwardLock.unlockBlob, testSecret,
        testBlob);
    });

    test('_onPickSuccess, blob type is not mimeSubtype', function() {
      this.sinon.stub(wallpaper, '_setWallpaper');
      this.mockForwardLock.mSetupMimeSubtype('mimeSubtype');

      var testBlob = {
        type: 'test/notMimeSubtype'
      };
      wallpaper._onPickSuccess(testBlob);
      sinon.assert.calledWith(wallpaper._setWallpaper, testBlob);
    });

    test('_setWallpaper', function() {
      var blob = 'testblob';
      wallpaper._setWallpaper(blob);
      assert.deepEqual(this.mockSettingsListener.getSettingsLock().locks[0], {
        'wallpaper.image': 'testblob'
      });
    });
  });
});
