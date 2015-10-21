'use strict';

/* global MockL10n, loadBodyHTML, DownloadStore, downloadPicker,
          DownloadFormatter */
/* global require, requireApp, suite, suiteTeardown, suiteSetup, test, assert,
          MocksHelper, sinon */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/download/download_store.js');
require('/shared/js/download/download_formatter.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForDownloadPicker = new MocksHelper([
  'LazyLoader'
]).init();

suite('pick.js >', function() {

  var realSetMessageHandler = null;
  var realL10n = null;
  var downloads = [];

  function createSource(name, type) {
    return {
      name: name,
      data: {
        type: type
      }
    };
  }

  function runActivity(data) {
    navigator.mozSetMessageHandler.mMessageHandlers.activity(data);
  }

  mocksHelperForDownloadPicker.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = window.MockNavigatormozSetMessageHandler;
    navigator.mozSetMessageHandler.mSetup();
    loadBodyHTML('/pick.html');
    sinon.stub(DownloadStore, 'getAll', function() {
      return {
        set onsuccess(cb) {
          cb({ target: { result: downloads }});
        }
      };
    });
    sinon.stub(navigator.mozL10n, 'DateTimeFormat', function(date) {
      return {
        relativeDate: function(date, useCompactFormat) {
          return Promise.resolve('pretty' + date.toString());
        }
      };
    });
    requireApp('download/js/pick.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n.DateTimeFormat.restore();
    navigator.mozL10n = realL10n;
    navigator.mozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    DownloadStore.getAll.restore();
  });

  suite('Initialization >', function() {
    test(' download picker ready ', function() {
      var handlers = navigator.mozSetMessageHandler.mMessageHandlers;
      assert.equal(Object.keys(handlers).length, 1);
      assert.isFunction(handlers.activity);
    });
  });

  suite('No downloads >', function() {
    test(' document.body.dataset.downloads is 0', function() {
      runActivity({
        source: createSource('pick', 'application/*')
      });

      assert.equal(document.body.dataset.downloads, 0);
    });
  });

  suite('Downloads >', function() {

    suiteSetup(function() {
      downloads = [
        {
          id: '1',
          startTime: new Date(),
          path: '/music.mp3'
        }, {
          id: '2',
          startTime: new Date(),
          path: '/image.gif'
        }
      ];

      runActivity({
        source: createSource('pick', 'application/*')
      });
    });

    suiteTeardown(function() {
      downloadPicker.pick.restore();
    });

    function checkItem(download) {
      var item = downloadPicker.list.querySelector('li[data-id="' +
                                                   download.id + '"]');
      assert.equal(item.querySelector('.fileName').textContent,
                   DownloadFormatter.getFileName(download));
    }

    test(' rendered list', function() {
      assert.equal(document.body.dataset.downloads, downloads.length);
      assert.equal(downloadPicker.list.querySelectorAll('li').length,
                   downloads.length);

      checkItem(downloads[0]);
      checkItem(downloads[1]);
    });

    test(' click an item', function() {
      var expectedDownload = downloads[0];
      sinon.stub(downloadPicker, 'pick', function(download) {
        assert.equal(download, expectedDownload);
        return {};
      });

      var item = downloadPicker.list.querySelector('li[data-id="' +
                                                    expectedDownload.id + '"]');
      item.click();
    });
  });

  suite('Cancel action >', function() {
    test(' clicking on cross icon', function() {
      runActivity({
        source: createSource('pick', 'application/*'),
        postError: function(result) {
          assert.equal(result, 'cancelled');
        }
      });

      downloadPicker.header.dispatchEvent(new CustomEvent('action'));
    });
  });

  suite('Error >', function() {
    test(' name not supported', function() {
      // "share" activities are not supported
      runActivity({
        source: createSource('share', 'application/*'),
        postError: function(result) {
          assert.equal(result, 'name not supported');
        }
      });
    });
  });

});
