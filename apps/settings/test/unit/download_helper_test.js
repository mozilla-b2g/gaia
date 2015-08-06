/* global MocksHelper, MockGetDeviceStorages, MockMozDownloads,
          MockDownload, DownloadHelper, MockGetDeviceStorage,
          DownloadFormatter  */

'use strict';

require('/shared/test/unit/mocks/mock_download.js');
require('/shared/test/unit/mocks/mock_navigator_moz_downloads.js');

require('/shared/js/download/download_ui.js');
require('/shared/js/mime_mapper.js');
require('/shared/js/settings_listener.js');

require('/shared/js/download/download_store.js');
requireApp('settings/test/unit/mock_download_store.js');

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_download_formatter.js');

require('/shared/js/download/download_helper.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorage.js');
require('/shared/test/unit/mocks/mock_navigator_getdevicestorages.js');

if (!window.MozActivity) {
  window.MozActivity = null;
}

suite('DownloadHelper', function() {
  var mocksHelperForDownloadHelper = new MocksHelper([
    'DownloadStore',
    'LazyLoader',
    'DownloadFormatter',
    'MozActivity'
  ]);
  var realDeviceStorage, realMozDownloads, download,
   realDeviceStorages;

  mocksHelperForDownloadHelper.attachTestHelpers();

  var clock;
  var TICK = 1000;

  suiteSetup(function() {
    realDeviceStorages = navigator.getDeviceStorages;
    navigator.getDeviceStorages = MockGetDeviceStorages;

    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockGetDeviceStorage;

    realMozDownloads = navigator.mozDownloadManager;
    navigator.mozDownloadManager = MockMozDownloads;
  });

  suiteTeardown(function() {
    navigator.getDeviceStorages = realDeviceStorages;
    realDeviceStorages = null;

    navigator.getDeviceStorage = realDeviceStorage;
    realDeviceStorage = null;

    navigator.mozDownloadManager = realMozDownloads;
    realMozDownloads = null;

    download = null;
  });

  setup(function() {
    download = new MockDownload();
    clock = this.sinon.useFakeTimers();
  });

  teardown(function() {
    download = null;
    clock.restore();
  });

  suite('Launch', function() {
    setup(function() {
      download = new MockDownload();
      clock = this.sinon.useFakeTimers();
    });

    teardown(function() {
      download = null;
      clock.restore();
    });

    function getStorage(state) {
      return {
        'get' : function(path) {
          return {
            set onsuccess(cb) {},
            set onerror(cb) {
              setTimeout(cb, 0);
            },
            error: { 'name': 'custom error' }
          };
        },
        'available': function() {
          return {
            set onsuccess(cb) {
              setTimeout(cb);
            },
            get result() {
              return state;
            }
          };
        }
      };
    }

    function assertSuccess(req, done) {
      req.onsuccess = function() {
        assert.ok(true);
        done();
      };

      req.onerror = function() {
        assert.ok(false);
        done();
      };

      clock.tick(TICK);
    }

    function assertIncompleteDownloadRemoved(state, done) {
      var stubGetDeviceStorage = sinon.stub(navigator, 'getDeviceStorage',
        function() {
          return getStorage(state);
        }
      );
      download.state = 'stopped';
      var req = DownloadHelper.remove(download);
      assertSuccess(req, function() {
        stubGetDeviceStorage.restore();
        done();
      });
    }

    function checkError(storage, code, done, type) {
      download.state = 'succeeded';

      var stubGetDeviceStorages = sinon.stub(navigator, 'getDeviceStorages',
        function() {
          return [storage];
        }
      );

      var req = DownloadHelper[type || 'open'](download);

      req.onsuccess = function() {
        assert.ok(false);
        done();
      };

      req.onerror = function(evt) {
        assert.equal(evt.target.error.code, code);
        stubGetDeviceStorages.restore();
        done();
      };

      clock.tick(TICK);
    }

    test('Invalid state download', function(done) {
      var req = DownloadHelper.open(download);

      req.onsuccess = function() {
        assert.ok(false);
        done();
      };

      req.onerror = function(evt) {
        assert.equal(evt.target.error.code, DownloadHelper.CODE.INVALID_STATE);
        done();
      };

      clock.tick(TICK);
    });

    test('Unknown download type', function(done) {
      download.state = 'succeeded';
      download.contentType = 'xxxxxxxx';
      var stubFormatter = sinon.stub(
        DownloadFormatter, 'getFileName', function() {
        return 'xxxxx.xxx';
      });

      var req = DownloadHelper.open(download);

      // We should always attempt to 'open' all content types.
      req.onsuccess = function() {
        assert.ok(true);
        stubFormatter.restore();
        done();
      };

      req.onerror = function(evt) {
        assert.ok(false,
                  'All content types should be openable via third party apps.');
        done();
      };

      clock.tick(TICK);
    });

    test('Missing file', function(done) {
      var storage = getStorage('available');
      checkError(storage, DownloadHelper.CODE.FILE_NOT_FOUND, done);
    });

    test('Success', function(done) {
      download.state = 'succeeded';
      var req = DownloadHelper.open(download);
      assertSuccess(req, done);
    });

    test('Success with canceled Activity', function(done) {
      download.state = 'succeeded';
      DownloadHelper.handlerError({ message: 'canceled' },
                                  null,
                                  function(data) {
                                    if (data === null) {
                                      done();
                                      return;
                                    }
                                    assert.ok(false, 'should get null data');
                                  });
    });

    test('Unmounted sdcard -> try to open and remove ', function(done) {
      var storage = getStorage('shared');
      var code = DownloadHelper.CODE.UNMOUNTED_SDCARD;
      checkError(storage, code, function() {
        checkError(storage, code, done, 'remove');
      }, 'open');
    });

    test('No sdcard -> try to open and remove ', function(done) {
      var storage = getStorage('unavailable');
      var code = DownloadHelper.CODE.NO_SDCARD;
      checkError(storage, code, function() {
        checkError(storage, code, done, 'remove');
      }, 'open');
    });

    test('Unmounted sdcard -> removing incomplete download ', function(done) {
      assertIncompleteDownloadRemoved('shared', done);
    });

    test('No sdcard -> removing incomplete download ', function(done) {
      assertIncompleteDownloadRemoved('unavailable', done);
    });
  });
});
