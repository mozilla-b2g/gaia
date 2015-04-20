'use strict';

/* global LayoutItemListView, LayoutItemView, LayoutItem, LayoutItemErrorInfo */

require('/js/settings/base_view.js');

require('/js/settings/layout_item.js');
require('/js/settings/layout_item_view.js');
require('/js/settings/layout_item_list_view.js');

var Deferred = function() {
  this.promise = new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }.bind(this));
};

suite('LayoutItemView', function() {
  var view;

  var itemStub;
  var listViewStub;

  var labelEl;
  var statusEl;
  var progressEl;

  var confirmRemovalDeferred;
  var confirmDownloadDeferred;

  setup(function() {
    navigator.mozL10n = {
      get: this.sinon.spy(function(id) { return 'l10n_get_' + id; })
    };

    itemStub = this.sinon.stub(LayoutItem.prototype);
    itemStub.name = 'Pig Latin';
    itemStub.fileSize = 24601;
    itemStub.state = itemStub.STATE_PRELOADED;

    confirmRemovalDeferred = new Deferred();
    confirmDownloadDeferred = new Deferred();

    listViewStub = this.sinon.stub(Object.create(LayoutItemListView.prototype));
    listViewStub.confirmRemoval.returns(confirmRemovalDeferred.promise);
    listViewStub.confirmDownload.returns(confirmDownloadDeferred.promise);

    view = new LayoutItemView(listViewStub, itemStub);

    var templateEl = document.createElement('template');
    templateEl.innerHTML =
      '<div><p class="label"></p>' +
      '<p><small class="status"></small></p>' +
      '<progress class="progress" hidden></div>';

    this.sinon.stub(document, 'getElementById')
      .withArgs(view.TEMPLATE_ID).returns(templateEl);

    view.oninlistchange = this.sinon.stub();

    view.start();

    labelEl = view.container.querySelector('.label');
    statusEl = view.container.querySelector('.status');
    progressEl = view.container.querySelector('.progress');

    assert.equal(labelEl.textContent, 'Pig Latin');
  });

  teardown(function() {
    navigator.mozL10n = null;
  });

  test('STATE_PRELOADED', function() {
    assert.equal(view.inList, view.IN_LIST_INSTALLED);
    assert.equal(view.oninlistchange.callCount, 0);
    assert.equal(view.container.dataset.enabledAction, 'none');
    assert.equal(statusEl.dataset.l10nId, 'preInstalledStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"size":"24.02","sizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isTrue(progressEl.classList.contains('hide'));
  });

  test('STATE_INSTALLABLE', function() {
    itemStub.state = itemStub.STATE_INSTALLABLE;
    itemStub.onstatechange();

    assert.equal(view.inList, view.IN_LIST_INSTALLABLE);
    assert.equal(view.oninlistchange.callCount, 1);
    assert.equal(view.container.dataset.enabledAction, 'download');
    assert.equal(statusEl.dataset.l10nId, 'installableStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"size":"24.02","sizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isTrue(progressEl.classList.contains('hide'));
  });

  test('STATE_INSTALLING_CANCELLABLE', function() {
    itemStub.state = itemStub.STATE_INSTALLING_CANCELLABLE;
    itemStub.downloadLoadedSize = 1234;
    itemStub.downloadTotalSize = 24601;

    itemStub.onstatechange();

    assert.equal(view.inList, view.IN_LIST_INSTALLABLE);
    assert.equal(view.oninlistchange.callCount, 1);
    assert.equal(view.container.dataset.enabledAction, 'cancel-download');
    assert.equal(statusEl.dataset.l10nId, 'downloadingStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"loadedSize":"1.21","loadedSizeUnit":"l10n_get_byteUnit-KB",' +
      '"totalSize":"24.02","totalSizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isFalse(progressEl.classList.contains('hide'));
    assert.equal(progressEl.value, '1234');
    assert.equal(progressEl.max, '24601');

    itemStub.downloadLoadedSize = 2345;

    itemStub.onprogress();

    assert.equal(view.oninlistchange.callCount, 1);
    assert.equal(view.container.dataset.enabledAction, 'cancel-download');
    assert.equal(statusEl.dataset.l10nId, 'downloadingStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"loadedSize":"2.29","loadedSizeUnit":"l10n_get_byteUnit-KB",' +
      '"totalSize":"24.02","totalSizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isFalse(progressEl.classList.contains('hide'));
    assert.equal(progressEl.value, '2345');
    assert.equal(progressEl.max, '24601');
  });

  test('STATE_INSTALLING', function() {
    itemStub.state = itemStub.STATE_INSTALLING;

    itemStub.onstatechange();

    assert.equal(view.inList, view.IN_LIST_INSTALLABLE);
    assert.equal(view.oninlistchange.callCount, 1);
    assert.equal(view.container.dataset.enabledAction, 'none');
    assert.equal(statusEl.dataset.l10nId, 'downloadingStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"loadedSize":"24.02","loadedSizeUnit":"l10n_get_byteUnit-KB",' +
      '"totalSize":"24.02","totalSizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isFalse(progressEl.classList.contains('hide'));
    assert.equal(progressEl.value, '24601');
    assert.equal(progressEl.max, '24601');
  });

  test('STATE_INSTALLED', function() {
    itemStub.state = itemStub.STATE_INSTALLED;
    itemStub.onstatechange();

    assert.equal(view.inList, view.IN_LIST_INSTALLED);
    assert.equal(view.oninlistchange.callCount, 0);
    assert.equal(view.container.dataset.enabledAction, 'remove');
    assert.equal(statusEl.dataset.l10nId, 'installedStatus');
    assert.equal(statusEl.dataset.l10nArgs,
      '{"size":"24.02","sizeUnit":"l10n_get_byteUnit-KB"}');
    assert.isTrue(progressEl.classList.contains('hide'));
  });

  test('STATE_REMOVING', function() {
    itemStub.state = itemStub.STATE_REMOVING;
    itemStub.onstatechange();

    assert.equal(view.inList, view.IN_LIST_INSTALLED);
    assert.equal(view.oninlistchange.callCount, 0);
    assert.equal(view.container.dataset.enabledAction, 'none');
    assert.equal(statusEl.dataset.l10nId, 'removingStatus');
    assert.equal(statusEl.dataset.l10nArgs, undefined);
    assert.isTrue(progressEl.classList.contains('hide'));
  });

  suite('handleEvent', function() {
    suite('download', function() {
      setup(function() {
        var evt = {
          type: 'click',
          target: {
            dataset: {
              action: 'download'
            }
          }
        };
        view.handleEvent(evt);

        assert.isTrue(listViewStub.confirmDownload.calledOnce);
      });

      test('confirmed', function(done) {
        confirmDownloadDeferred.resolve(true);
        confirmDownloadDeferred.promise.then(function() {
          assert.isTrue(itemStub.install.calledOnce);
        }).then(done, done);
      });

      test('cancelled', function(done) {
        confirmDownloadDeferred.resolve(false);
        confirmDownloadDeferred.promise.then(function() {
          assert.isFalse(itemStub.install.calledOnce);
        }).then(done, done);
      });
    });

    test('cancelDownload', function() {
      var evt = {
        type: 'click',
        target: {
          dataset: {
            action: 'cancelDownload'
          }
        }
      };
      view.handleEvent(evt);

      assert.isTrue(itemStub.cancelInstall.calledOnce);
    });

    suite('remove', function() {
      setup(function() {
        var evt = {
          type: 'click',
          target: {
            dataset: {
              action: 'remove'
            }
          }
        };
        view.handleEvent(evt);

        assert.isTrue(
          listViewStub.confirmRemoval.calledWith('Pig Latin'));
      });

      test('confirmed', function(done) {
        confirmRemovalDeferred.resolve(true);
        confirmRemovalDeferred.promise.then(function() {
          assert.isTrue(itemStub.remove.calledOnce);
        }).then(done, done);
      });

      test('cancelled', function(done) {
        confirmRemovalDeferred.resolve(false);
        confirmRemovalDeferred.promise.then(function() {
          assert.isFalse(itemStub.remove.calledOnce);
        }).then(done, done);
      });
    });
  });

  suite('onerror', function() {
    test('ERROR_DOWNLOADERROR', function() {
      var errorInfo = Object.create(LayoutItemErrorInfo.prototype);
      errorInfo.error = errorInfo.ERROR_DOWNLOADERROR;

      itemStub.onerror(errorInfo);

      assert.isTrue(listViewStub.showDownloadErrorToast.calledOnce);
    });

    test('ERROR_INSTALLERROR', function() {
      var errorInfo = Object.create(LayoutItemErrorInfo.prototype);
      errorInfo.error = errorInfo.ERROR_INSTALLERROR;

      itemStub.onerror(errorInfo);

      assert.isFalse(listViewStub.showDownloadErrorToast.calledOnce);
    });

    test('ERROR_REMOVEERROR', function() {
      var errorInfo = Object.create(LayoutItemErrorInfo.prototype);
      errorInfo.error = errorInfo.ERROR_REMOVEERROR;

      itemStub.onerror(errorInfo);

      assert.isFalse(listViewStub.showDownloadErrorToast.calledOnce);
    });
  });
});
