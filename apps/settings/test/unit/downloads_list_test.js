/*global loadBodyHTML*/

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

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

suite('DownloadList', function() {
  var mocksHelperForDownloadList = new MocksHelper([
    'DownloadFormatter',
    'DownloadStore',
    'LazyLoader',
    'DownloadHelper'
  ]);
  var realMozDownloads, realL10n;

  var downloadsContainerDOM, editButton, deleteButton,
    selectAllButton, deselectAllButton;

  suiteSetup(function() {
    // Mock l10n
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    // Mock moz_downloads API
    realMozDownloads = navigator.mozDownloadManager;
    navigator.mozDownloadManager = MockMozDownloads;
    mocksHelperForDownloadList.suiteSetup();
  });

  suiteTeardown(function() {
    navigator.mozDownloadManager = realMozDownloads;
    navigator.mozL10n = realL10n;
    realL10n = null;
    realMozDownloads = null;

    downloadsContainerDOM = null;
    editButton = null;
    selectAllButton = null;
    deselectAllButton = null;
    deleteButton = null;
    mocksHelperForDownloadList.suiteTeardown();
  });

  setup(function(done) {
     // Load markup of settings APP
    loadBodyHTML('/index.html');
    // Inject the panel of downloads
    var importHook = document.createElement('link');
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/elements/downloads.html');
    document.head.appendChild(importHook);

    HtmlImports.populate(function() {
      // Once the downloads panel is ready
      downloadsContainerDOM = document.querySelector('#downloadList ul');
      editButton = document.getElementById('downloads-edit-button');
      deleteButton = document.getElementById('downloads-delete-button');
      selectAllButton =
        document.getElementById('downloads-edit-select-all');
      deselectAllButton =
        document.getElementById('downloads-edit-deselect-all');
      mocksHelperForDownloadList.setup();
      done();
    });

  });

  teardown(function() {
    document.body.innerHTML = '';
    MockDownloadStore.downloads = [];
    mocksHelperForDownloadList.teardown();
  });


  suite(' > edit mode', function() {
    test(' > edit mode button enabled/disabled', function(done) {
      DownloadsList.init(function() {
        // Edit button is false at the beginning
        assert.isFalse(editButton.classList.contains('disabled'));
        // Edit mode
        editButton.click();
        // Select all
        selectAllButton.click();

        var itemsDeleted = 0;
        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            itemsDeleted++;
            if (itemsDeleted === MockMozDownloads.mockLength) {
              // Stop the observer
              observer.disconnect();
              assert.ok(editButton.classList.contains('disabled'));
              done();
            }
          });
        });

        // Configuration of the observer
        var config = { attributes: true, childList: true, characterData: true };
        // Observe changes to the container of downloads
        observer.observe(downloadsContainerDOM, config);

        // Delete all downloads
        deleteButton.click();
      });
    });

    test(' > select all button enabled/disabled', function(done) {
      DownloadsList.init(function() {
        // Edit mode
        editButton.click();
        // Select all
        selectAllButton.click();
        // Is the button disabled?
        assert.ok(selectAllButton.disabled);
        // Deselect all
        deselectAllButton.click();
        // Is the button disabled?
        assert.isFalse(selectAllButton.disabled);
        done();
      });
    });

    test(' > deselect all button enabled/disabled', function(done) {
      DownloadsList.init(function() {
        // Edit mode
        editButton.click();
        // At the beginnig is disabled
        assert.ok(deselectAllButton.disabled);
        // Select all
        selectAllButton.click();
        // Is the button disabled?
        assert.isFalse(deselectAllButton.disabled);
        // Deselect all
        deselectAllButton.click();
        // Is the button disabled?
        assert.ok(deselectAllButton.disabled);
        done();
      });
    });

    test(' > Deletion', function(done) {
      DownloadsList.init(function() {
        assert.equal(
          downloadsContainerDOM.childNodes.length,
          MockMozDownloads.mockLength - 1
        );
        // Edit mode
        editButton.click();
        // Select all
        selectAllButton.click();

        var itemsDeleted = 0;
        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            itemsDeleted++;
            if (itemsDeleted === MockMozDownloads.mockLength) {
              // Stop the observer
              observer.disconnect();
              assert.equal(
                downloadsContainerDOM.childNodes.length,
                0
              );
              done();
            }
          });
        });

        // Configuration of the observer
        var config = { attributes: true, childList: true, characterData: true };
        // Observe changes to the container of downloads
        observer.observe(downloadsContainerDOM, config);

        // Delete all downloads
        deleteButton.click();
      });
    });
  });

  suite(' > methods', function() {
    test(' > check render with empty datastore', function(done) {
      DownloadsList.init(function() {
        // We have one less because we have one download 'finalized', but
        // datastore is empty
        assert.equal(
          downloadsContainerDOM.childNodes.length,
          MockMozDownloads.mockLength - 1
        );
        assert.equal(downloadsContainerDOM.firstChild.tagName, 'LI');
        done();
      });
    });

    test(' > check render with one item in datastore', function(done) {
      MockDownloadStore.downloads = [new MockDownload({
        state: 'succeeded'
      })];
      DownloadsList.init(function() {
        // Now the 'finalized' one is in the Datastore
        assert.equal(
          downloadsContainerDOM.childNodes.length,
          MockMozDownloads.mockLength
        );
        assert.equal(downloadsContainerDOM.firstChild.tagName, 'LI');
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
        // DownloadUI knows which will be the correct confirm depending on state
        // and error attributes
        assert.equal(downloadUI.args[0][0], null);
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


