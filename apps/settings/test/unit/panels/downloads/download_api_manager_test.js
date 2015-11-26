/* global MockDownload */

'use strict';

require('/shared/test/unit/mocks/mock_download.js');

suite('DownloadApiManager', function() {
  var DownloadApiManager, DownloadStore, DownloadUI, DownloadHelper,
    MozDownloads;
  var clock;
  var TICK = 1000;

  suiteSetup(function(done) {
    var modules = [
      'panels/downloads/download_api_manager',
      'unit/mock_download_store',
      'unit/mock_download_ui',
      'shared_mocks/mock_download_helper',
      'shared_mocks/mock_navigator_moz_downloads'
    ];

    var maps = {
      '*': {
        'shared/download/download_store': 'unit/mock_download_store',
        'shared/download/download_formatter':
          'shared_mocks/mock_download_formatter',
        'shared/download/download_helper': 'shared_mocks/mock_download_helper',
        'shared/download/download_ui': 'unit/mock_download_ui'
      }
    };

    testRequire(modules, maps, function(realDownloadApiManager,
      MockDownloadStore, MockDownloadUI, MockDownloadHelper,
      MockMozDownloads) {
        navigator.mozDownloadManager = MockMozDownloads;

        DownloadApiManager = realDownloadApiManager;
        DownloadStore = MockDownloadStore;
        DownloadUI = MockDownloadUI;
        DownloadHelper = MockDownloadHelper;
        MozDownloads = MockMozDownloads;
        done();
      });
  });

  suite(' > methods', function() {
    var downloadsMock;
    setup(function(done) {
      clock = this.sinon.useFakeTimers();

      DownloadApiManager.init();
      clock.tick(TICK);

      DownloadApiManager.getDownloads(function(downloads) {
        downloadsMock = downloads;
        done();
      });
      clock.tick(TICK);
    });

    teardown(function() {
      downloadsMock = null;
      DownloadStore.downloads = [];

      clock.restore();
    });

    test(' > getDownloads with empty datastore', function() {
      // We have *one* item finalized (check the Mock), so it's not
      // considered as part of the list (we just ignore it because
      // it's supossed to be part of the datastore).
      // So we one less element than the mockLength
      assert.equal(downloadsMock.length, MozDownloads.mockLength - 1);
    });

    test(' > getDownloads with one item completed in datastore',
      function(done) {
      // In this case the item 'finalized' is stored in our datastore
      // so we merge both lists!
      DownloadStore.downloads = [new MockDownload({
        state: 'succeeded'
      })];
      DownloadApiManager.getDownloads(function(downloads) {
        assert.equal(downloads.length, MozDownloads.mockLength);
        done();
      });
      clock.tick(TICK);
    });

    test(' > getDownloads sorted properly', function(done) {
      // In this case the item 'finalized' is stored in our datastore
      // so we merge both lists!
      DownloadStore.downloads = [new MockDownload({
        state: 'succeeded'
      })];
      DownloadApiManager.getDownloads(function(downloads) {
        var timeIndex;
        for (var i = 0; i < downloads.length; i++) {
          if (!timeIndex) {
            timeIndex = downloads[i].startTime.getTime();
          } else {
            assert.ok(timeIndex >= downloads[i].startTime.getTime());
            timeIndex = downloads[i].startTime.getTime();
          }
        }
        done();
      });
      clock.tick(TICK);
    });

    test(' > getDownload given an ID', function() {
      var download = DownloadApiManager.getDownload(0);
      assert.equal(download.id, 0);
    });

    test(' > updateDownload', function() {
      var download = DownloadApiManager.getDownload(0);
      clock.tick(TICK);
      // This one comes from datastore, so state is succeed.
      var previousState = download.state;
      download.state = 'downloading';
      DownloadApiManager.updateDownload(download);
      assert.isFalse(previousState === download.state);
    });

    test(' > deleteDownload given an ID (user cancels)', function(done) {
      var showStub = this.sinon.stub(DownloadUI, 'show', function() {
        return {
          set oncancel(cb) {cb();}
        };
      });
      this.sinon.spy(DownloadHelper, 'remove');
      DownloadApiManager.deleteDownloads([{id: 0}], function() {}, function() {
        // Once cancelled, we get the same object
        var download = DownloadApiManager.getDownload(0);
        clock.tick(TICK);
        // and the object still exists
        assert.ok(download);
        assert.isFalse(DownloadHelper.remove.called);
        showStub.restore();
        done();
      });
      clock.tick(TICK);
    });

    test(' > deleteDownload given an ID (user confirms)', function(done) {
      this.sinon.spy(DownloadHelper, 'remove');
      this.sinon.spy(DownloadUI, 'show');
      DownloadApiManager.deleteDownloads([{id: 0}], function() {
        // Once deleted, we try to get the same object
        var download = DownloadApiManager.getDownload(0);
        clock.tick(TICK);
        // Now the object does not exist
        assert.ok(!download);
        sinon.assert.called(DownloadUI.show);
        assert.ok(DownloadHelper.remove.called);
        DownloadHelper.remove.restore();
        DownloadUI.show.restore();
        done();
      });
      clock.tick(TICK);
    });

    test(' > force deleteDownload given an ID', function(done) {
      this.sinon.spy(DownloadHelper, 'remove');
      this.sinon.spy(DownloadUI, 'show');
      DownloadApiManager.deleteDownloads([{id: 1, force: true}], function() {
        // Once deleted, we try to get the same object
        var download = DownloadApiManager.getDownload(1);
        clock.tick(TICK);

        // Now the object does not exist
        assert.ok(!download);
        assert.ok(!DownloadUI.show.called);
        sinon.assert.called(DownloadHelper.remove);
        DownloadHelper.remove.restore();
        DownloadUI.show.restore();
        done();
      });
      clock.tick(TICK);
    });
  });
});
