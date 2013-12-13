
'use strict';

requireApp('settings/test/unit/mock_l10n.js');
// Mockup the API
require('/shared/test/unit/mocks/mock_download.js');
require('/shared/test/unit/mocks/mock_navigator_moz_downloads.js');
// We retrieve them for stubbing
require('/shared/js/download/download_ui.js');
require('/shared/js/mime_mapper.js');

// Mocks for several functions
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/download/download_store.js');
requireApp('settings/test/unit/mock_download_store.js');

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_download_formatter.js');

require('/shared/js/download/download_helper.js');
require('/shared/test/unit/mocks/mock_download_helper.js');

// Code needed from the app
requireApp('settings/js/downloads/download_item.js');
requireApp('settings/js/downloads/download_api_manager.js');
requireApp('settings/js/downloads/downloads_list.js');

suite('DownloadList', function() {
  var mocksHelperForDownloadList = new MocksHelper([
    'DownloadFormatter',
    'DownloadStore',
    'LazyLoader',
    'DownloadHelper'
  ]);
  var realMozDownloads, realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozDownloads = navigator.mozDownloadManager;
    navigator.mozDownloadManager = MockMozDownloads;

    mocksHelperForDownloadList.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozDownloadManager = realMozDownloads;
    realMozDownloads = null;

    mocksHelperForDownloadList.suiteTeardown();
  });

  setup(function() {
    // Generate HTML structure needed
    var ulContainer = document.createElement('section');
    ulContainer.id = 'downloadList';
    var downloadsContainer = document.createElement('ul');
    ulContainer.appendChild(downloadsContainer);
    document.body.appendChild(ulContainer);
    // Also the DOM for no downloads
    var emptyContainer = document.createElement('section');
    emptyContainer.id = 'download-list-empty';
    emptyContainer.classList.add('hide');
    document.body.appendChild(emptyContainer);

    mocksHelperForDownloadList.setup();
  });

  teardown(function() {
    document.body.innerHTML = '';
    MockDownloadStore.downloads = [];
    mocksHelperForDownloadList.teardown();
  });

  suite(' > methods', function() {
    test(' > check render with empty datastore', function(done) {
      DownloadsList.init(function() {
        var downloadsContainer = document.querySelector('#downloadList ul');
        // We have one less because we have one download 'finalized', but
        // datastore is empty
        assert.equal(
          downloadsContainer.childNodes.length,
          MockMozDownloads.mockLength - 1
        );
        assert.equal(downloadsContainer.firstChild.tagName, 'LI');
        done();
      });
    });

    test(' > check render with one item in datastore', function(done) {
      MockDownloadStore.downloads = [new MockDownload({
        state: 'succeeded'
      })];
      DownloadsList.init(function() {
        var downloadsContainer = document.querySelector('#downloadList ul');
        // Now the 'finalized' one is in the Datastore
        assert.equal(
          downloadsContainer.childNodes.length,
          MockMozDownloads.mockLength
        );
        assert.equal(downloadsContainer.firstChild.tagName, 'LI');
        done();
      });
    });

    // This takes into account the structure defined in the mock. In this case
    // Most recent one (the one from DataStore) --> 'succeed'
    // Second element -->'downloading'
    // Penultimate element  -->'stopped'

    suite(' > tap actions', function() {
      var container;
      var launchSpy, downloadUI;
      setup(function(done) {
        launchSpy = this.sinon.spy(DownloadHelper, 'launch');
        downloadUI = this.sinon.spy(DownloadUI, 'show');
        MockDownloadStore.downloads = [new MockDownload({
          state: 'succeeded'
        })];
        DownloadsList.init(function() {
          container = document.querySelector('#downloadList ul');
          done();
        });
      });

      teardown(function() {
        launchSpy = null;
        downloadUI = null;
        container = null;
        MockDownloadStore.downloads = [];
      });

      test(' > a finalized download, so its in datastore', function() {
        container.firstChild.click();
        assert.ok(launchSpy.calledOnce);
      });

      test(' > on downloading download', function() {
        container.childNodes[2].click();
        assert.isFalse(launchSpy.calledOnce);
        assert.ok(downloadUI.calledOnce);
        assert.equal(downloadUI.args[0][0], DownloadUI.TYPE.STOP);
      });

      test(' > a stopped download', function() {
        container.lastChild.click();
        assert.isFalse(launchSpy.calledOnce);
        assert.ok(downloadUI.calledOnce);
        assert.equal(downloadUI.args[0][0], DownloadUI.TYPE.STOPPED);
      });
    });

    suite(' > deletes', function() {
      var container;
      var download;
      var emptyContainer;
      setup(function(done) {
        MockMozDownloads.mockLength = -1;
        download = new MockDownload({
          id: '12',
          state: 'succeeded',
          path: '/sdcard/downloads/xxx.xxx',
          url: 'http://myserver.com/xxx.xxx',
          contentType: 'xxxx'
        });
        MockDownloadStore.downloads = [download];
        DownloadsList.init(function() {
          container = document.querySelector('#downloadList ul');
          done();
        });

        emptyContainer = document.getElementById('download-list-empty');
      });

      teardown(function() {
        download = null;
        container = null;
        emptyContainer = null;
        MockMozDownloads.mockLength = 3;
      });

      test(' > remove last item', function(done) {
        // We will perform a delete right now by clicking
        // in a download which mimetype is not recognized
        // and then deleting

        // Fail on the download;
        var launchStub = sinon.stub(DownloadHelper, 'launch', function() {
          return {
            set onsuccess(cb) {},
            set onerror(cb) {setTimeout(cb, 50);}
          };
        });

        // On the handler directly remove
        var errorStub = sinon.stub(DownloadHelper, 'handlerError',
          function(error, download, cb) {
          cb(download);
        });

        // Simulate the delete
        var deleteStub = sinon.stub(DownloadHelper, 'remove', function() {
          return {
            set onsuccess(cb) {
              cb(); // This callback is the one coming from the download list
              // Check if we are showing the empty list section
              assert.equal(0, emptyContainer.classList.length);
              done();
              setTimeout(cleanStubs, 0);
            },
            set onerror(cb) {}
          };
        });

        container.lastChild.click();

        // Clean any stub we created locally
        function cleanStubs() {
          launchStub.restore();
          launchStub = null;

          errorStub.restore();
          errorStub = null;

          deleteStub.restore();
          deleteStub = null;
        }
      });

      teardown(function() {
        container = null;
      });
    });
  });
});


