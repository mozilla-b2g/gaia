/* global MockMozActivity */
'use strict';

require('/shared/test/unit/mocks/mock_moz_activity.js');

suite('homescreens > wallpaper', () => {
  var modules = [
    'modules/mvvm/observable',
    'shared_mocks/mock_settings_listener',
    'shared_mocks/mock_settings_url',
    'shared_mocks/mock_omadrm_fl',
    'panels/homescreens/wallpaper'
  ];

  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'shared/settings_url': 'shared_mocks/mock_settings_url',
      'shared/omadrm/fl': 'shared_mocks/mock_omadrm_fl'
    }
  };

  var mockSettingsListener;
  var mockSettingsURL;
  var mockForwardLock;
  var wallpaper;
  var realMozActivity;
  var clock;

  suiteSetup(done => {
    testRequire(modules, maps, (Observable, MockSettingsListener,
                                MockSettingsUrl, MockForwardLock,
                                Wallpaper) => {
      wallpaper = Wallpaper();
      mockSettingsListener = MockSettingsListener;
      mockSettingsURL = MockSettingsUrl;
      mockForwardLock = MockForwardLock;
      done();
    });

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
  });

  suiteTeardown(() => {
    window.MozActivity = realMozActivity;
  });

  setup(() => {
    MockMozActivity.mSetup();
    clock = sinon.useFakeTimers();
  });

  teardown(() => {
    MockMozActivity.mTeardown();
    clock.restore();
    // clear the lock so tests that write into settings would not read from
    // other tests' locks
    mockSettingsListener.getSettingsLock().clear();
  });

  test('_init', () => {
    this.sinon.stub(wallpaper, '_watchWallpaperChange');
    wallpaper._init();
    assert.equal(wallpaper._watchWallpaperChange.calledOnce, true);
  });

  test('select wallpaper', function() {
    this.sinon.stub(wallpaper, '_triggerActivity');
    this.sinon.stub(mockForwardLock, 'getKey');
    wallpaper.selectWallpaper();
    assert.equal(mockForwardLock.getKey.calledOnce, true);
    mockForwardLock.getKey.args[0][0]();
    assert.equal(wallpaper._triggerActivity.calledOnce, true);
  });

  test('_watchWallpaperChange', () => {
    var value = 'testlink';
    wallpaper.wallpaperURL = new mockSettingsURL();
    wallpaper._watchWallpaperChange();
    mockSettingsListener.mTriggerCallback('wallpaper.image',
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
    clock.tick(50);
    assert.equal(wallpaper._onPickSuccess.calledOnce, true);
    sinon.assert.calledWith(wallpaper._onPickSuccess, testblob, secret);

    MockMozActivity.mTriggerOnError();
    assert.equal(wallpaper._onPickError.calledOnce, true);
  });

  test('_onPickSuccess, blob type is mimeSubtype', () => {
    var unlockBlobStub = this.sinon.stub(mockForwardLock, 'unlockBlob');
    mockForwardLock.mSetupMimeSubtype('mimeSubtype');

    var testBlob = {
      type: 'test/mimeSubtype'
    };
    var testSecret = 'testSecret';

    wallpaper._onPickSuccess(testBlob, testSecret);
    assert.isTrue(unlockBlobStub.calledOnce);
    assert.equal(unlockBlobStub.args[0][0], testSecret);
    assert.equal(unlockBlobStub.args[0][1], testBlob);
  });

  test('_onPickSuccess, blob type is not mimeSubtype', function() {
    this.sinon.stub(wallpaper, '_setWallpaper');
    mockForwardLock.mSetupMimeSubtype('mimeSubtype');

    var testBlob = {
      type: 'test/notMimeSubtype'
    };
    wallpaper._onPickSuccess(testBlob);
    sinon.assert.calledWith(wallpaper._setWallpaper, testBlob);
  });

  test('_setWallpaper', () => {
    var blob = 'testblob';
    wallpaper._setWallpaper(blob);
    assert.deepEqual(mockSettingsListener.getSettingsLock().locks[0], {
      'wallpaper.image': 'testblob'
    });
  });
});
