'use strict';

/* global LayoutItemListView, LayoutItemList, LayoutItemView,
          DownloadPreference, LayoutEnabler */

require('/js/settings/base_view.js');
require('/js/settings/layout_item_list_view.js');

require('/js/settings/layout_item_list.js');
require('/js/settings/layout_item_view.js');

var Deferred = function() {
  this.promise = new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }.bind(this));
};

suite('LayoutItemListView', function() {
  var listView;

  var app;
  var installedListElStub;
  var installableListElStub;
  var containerElStub;
  var rememberMyChoiceElStub;
  var layoutItemListStub;

  var removeDialogElStub;
  var downloadDialogElStub;
  var toastElStub;
  var enableDialogElStub;

  var downloadPreferenceGetCurrentStateDeferred;
  var downloadPreferenceSetDataConnectionDownloadStateDeferred;

  setup(function() {
    layoutItemListStub =
      this.sinon.stub(LayoutItemList.prototype);
    layoutItemListStub.downloadPreference =
      this.sinon.stub(DownloadPreference.prototype);
    layoutItemListStub.layoutEnabler =
      this.sinon.stub(LayoutEnabler.prototype);
    this.sinon.stub(window, 'LayoutItemList').returns(layoutItemListStub);

    downloadPreferenceGetCurrentStateDeferred = new Deferred();
    layoutItemListStub.downloadPreference.getCurrentState
      .returns(downloadPreferenceGetCurrentStateDeferred.promise);

    downloadPreferenceSetDataConnectionDownloadStateDeferred = new Deferred();
    layoutItemListStub.downloadPreference.setDataConnectionDownloadState
      .returns(
        downloadPreferenceSetDataConnectionDownloadStateDeferred.promise);

    var LayoutItemViewPrototype = LayoutItemView.prototype;
    this.sinon.stub(window, 'LayoutItemView', function() {
      var viewStub = this.sinon.stub(Object.create(LayoutItemViewPrototype));
      viewStub.contaner = {};
      viewStub.inList = viewStub.IN_LIST_INSTALLED;

      return viewStub;
    }.bind(this));

    app = { stub: app };

    containerElStub = { stub: 'container', hidden: true };
    installedListElStub = {
      appendChild: this.sinon.stub()
    };
    installableListElStub = {
      appendChild: this.sinon.stub()
    };

    removeDialogElStub = document.createElement('div');
    removeDialogElStub.appendChild(document.createElement('p'));
    removeDialogElStub.hidden = true;

    downloadDialogElStub = document.createElement('div');
    downloadDialogElStub.hidden = true;

    toastElStub = document.createElement('div');
    toastElStub.show = this.sinon.stub();
    toastElStub.hide = this.sinon.stub();

    rememberMyChoiceElStub = document.createElement('input');
    rememberMyChoiceElStub.type = 'checkbox';

    enableDialogElStub = document.createElement('div');
    enableDialogElStub.appendChild(document.createElement('p'));
    enableDialogElStub.hidden = true;

    listView = new LayoutItemListView(app);

    this.sinon.stub(document, 'getElementById')
      .withArgs(listView.CONTAINER_ID).returns(containerElStub)
      .withArgs(listView.INSTALLED_LIST_ID).returns(installedListElStub)
      .withArgs(listView.INSTALLABLE_LIST_ID).returns(installableListElStub)
      .withArgs('installable-keyboards-removal-dialog')
        .returns(removeDialogElStub)
      .withArgs('installable-keyboards-download-error-toast')
        .returns(toastElStub)
      .withArgs('installable-keyboards-mobile-download-dialog')
        .returns(downloadDialogElStub)
      .withArgs('installable-keyboards-remember')
        .returns(rememberMyChoiceElStub)
      .withArgs('installable-keyboards-enable-dialog')
        .returns(enableDialogElStub);

    listView.start();

    assert.isTrue(window.LayoutItemList.calledWith(app));
    assert.isTrue(layoutItemListStub.start.calledOnce);
    assert.equal(listView.container, containerElStub);
  });

  teardown(function() {
    listView.stop();

    assert.isTrue(layoutItemListStub.stop.calledOnce);
  });

  test('model.onready with 3 layoutItems', function() {
    var items = layoutItemListStub.layoutItems = new Map();
    items.set('foo', { id: 'foo' });
    items.set('bar', { id: 'bar' });
    items.set('baz', { id: 'baz' });

    layoutItemListStub.onready();

    assert.isFalse(containerElStub.hidden);
    var i = 0;
    items.forEach(function(item, id) {
      assert.isTrue(
        window.LayoutItemView.getCall(i).calledWith(listView, item));
      var viewStub = window.LayoutItemView.getCall(i).returnValue;
      assert.isTrue(viewStub.start.calledOnce);
      assert.equal(installedListElStub.appendChild.getCall(i).args[0],
        viewStub.container);

      i++;
    }, this);
  });

  test('Move one layoutItemView to installable', function() {
    var items = layoutItemListStub.layoutItems = new Map();
    items.set('foo', { id: 'foo' });
    items.set('bar', { id: 'bar' });
    items.set('baz', { id: 'baz' });

    layoutItemListStub.onready();

    assert.isFalse(containerElStub.hidden);

    var viewStub0 = window.LayoutItemView.getCall(0).returnValue;
    var viewStub1 = window.LayoutItemView.getCall(1).returnValue;
    var viewStub2 = window.LayoutItemView.getCall(2).returnValue;

    viewStub1.inList = viewStub1.IN_LIST_INSTALLABLE;
    viewStub1.oninlistchange();

    // The entire list of views must be go through in order.
    assert.equal(installedListElStub.appendChild.getCall(3).args[0],
      viewStub0.container);
    assert.equal(installableListElStub.appendChild.getCall(0).args[0],
      viewStub1.container);
    assert.equal(installedListElStub.appendChild.getCall(4).args[0],
      viewStub2.container);
  });

  test('model.onready with 0 layoutItems', function() {
    layoutItemListStub.layoutItems = new Map();

    layoutItemListStub.onready();

    assert.isTrue(containerElStub.hidden);
    assert.isFalse(window.LayoutItemView.calledOnce);
  });

  suite('confirmRemoval', function() {
    var p;

    setup(function() {
      listView.beforeShow();
      listView.show();

      p = listView.confirmRemoval('Foo');

      assert.isFalse(removeDialogElStub.hidden);
      assert.equal(removeDialogElStub.firstElementChild.dataset.l10nArgs,
        '{"keyboard":"Foo"}');
    });

    test('cancel', function(done) {
      removeDialogElStub.dispatchEvent(new CustomEvent('cancel'));

      p.then(function(val) {
        assert.isTrue(removeDialogElStub.hidden);
        assert.isFalse(val);
      }).then(done, done);
    });

    test('confirm', function(done) {
      removeDialogElStub.dispatchEvent(new CustomEvent('confirm'));

      p.then(function(val) {
        assert.isTrue(removeDialogElStub.hidden);
        assert.isTrue(val);
      }).then(done, done);
    });
  });

  suite('confirmDownload', function() {
    var p;

    setup(function() {
      listView.beforeShow();
      listView.show();

      p = listView.confirmDownload('Foo');

      assert.isTrue(
        layoutItemListStub.downloadPreference.getCurrentState.calledOnce);
    });

    suite('STATE_PROMPT', function() {
      setup(function(done) {
        downloadPreferenceGetCurrentStateDeferred
          .resolve(layoutItemListStub.downloadPreference.STATE_PROMPT);

        downloadPreferenceGetCurrentStateDeferred.promise.then(function() {
          assert.isFalse(downloadDialogElStub.hidden);
        }).then(done, done);
      });

      suite('remember my choice checked', function() {
        setup(function() {
          rememberMyChoiceElStub.checked = true;
        });

        test('cancel', function(done) {
          downloadDialogElStub.dispatchEvent(new CustomEvent('cancel'));

          p.then(function(val) {
            assert.isFalse(layoutItemListStub.downloadPreference
              .setDataConnectionDownloadState.calledOnce,
              'Should not remember cancelled dialog.');
            assert.isTrue(downloadDialogElStub.hidden);
            assert.isFalse(val);
          }).then(done, done);
        });

        test('confirm', function(done) {
          downloadDialogElStub.dispatchEvent(new CustomEvent('confirm'));

          p.then(function(val) {
            assert.isTrue(layoutItemListStub.downloadPreference
              .setDataConnectionDownloadState.calledWith(
                layoutItemListStub.downloadPreference.STATE_ALLOW));

            // Should not be blocked by setDataConnectionDownloadState promise.
            assert.isTrue(downloadDialogElStub.hidden);
            assert.isTrue(val);

            // Resolve the promise.
            downloadPreferenceSetDataConnectionDownloadStateDeferred.resolve();
            return downloadPreferenceSetDataConnectionDownloadStateDeferred
              .promise;
          }).then(done, done);
        });
      });

      suite('remember my choice not checked', function() {
        setup(function() {
          rememberMyChoiceElStub.checked = false;
        });

        test('cancel', function(done) {
          downloadDialogElStub.dispatchEvent(new CustomEvent('cancel'));

          p.then(function(val) {
            assert.isFalse(layoutItemListStub.downloadPreference
              .setDataConnectionDownloadState.calledOnce);
            assert.isTrue(downloadDialogElStub.hidden);
            assert.isFalse(val);
          }).then(done, done);
        });

        test('confirm', function(done) {
          downloadDialogElStub.dispatchEvent(new CustomEvent('confirm'));

          p.then(function(val) {
            assert.isFalse(layoutItemListStub.downloadPreference
              .setDataConnectionDownloadState.calledOnce);
            assert.isTrue(downloadDialogElStub.hidden);
            assert.isTrue(val);
          }).then(done, done);
        });
      });
    });

    test('STATE_ALLOW', function(done) {
      downloadPreferenceGetCurrentStateDeferred
        .resolve(layoutItemListStub.downloadPreference.STATE_ALLOW);

      p.then(function(val) {
        assert.isTrue(downloadDialogElStub.hidden);
        assert.isTrue(val);
      }).then(done, done);
    });

    test('STATE_DENY', function(done) {
      downloadPreferenceGetCurrentStateDeferred
        .resolve(layoutItemListStub.downloadPreference.STATE_DENY);

      p.then(function(val) {
        assert.isTrue(downloadDialogElStub.hidden);
        assert.isFalse(val);
      }).then(done, done);
    });
  });

  suite('confirmEnable', function() {
    var p;

    test('queue two dialogs', function(done) {
      assert.isTrue(enableDialogElStub.hidden);
      var p = listView.confirmEnable('Foo');
      var p2 = listView.confirmEnable('Bar');

      assert.isTrue(enableDialogElStub.hidden);

      listView.beforeShow();
      listView.show();

      assert.isFalse(enableDialogElStub.hidden);
      assert.equal(enableDialogElStub.firstElementChild.dataset.l10nArgs,
        '{"keyboard":"Foo"}');

      // Confirm the first dialog
      enableDialogElStub.dispatchEvent(new CustomEvent('confirm'));

      p.then(function(val) {
        assert.isTrue(val, 'Confirm the first dialog.');

        assert.isFalse(enableDialogElStub.hidden, 'Dialog shown');
        assert.equal(enableDialogElStub.firstElementChild.dataset.l10nArgs,
          '{"keyboard":"Bar"}');

        // Cancel the second dialog
        enableDialogElStub.dispatchEvent(new CustomEvent('cancel'));

        return p2;
      })
      .then(function(val) {
        assert.isTrue(enableDialogElStub.hidden, 'Dialog hidden');
        assert.isFalse(val, 'Cancel the second dialog');
      })
      .then(done, done);
    });

    suite('queue before visible', function() {
      setup(function() {
        p = listView.confirmEnable('Foo');
        assert.isTrue(enableDialogElStub.hidden);

        listView.beforeShow();
        listView.show();

        assert.isFalse(enableDialogElStub.hidden);
        assert.equal(enableDialogElStub.firstElementChild.dataset.l10nArgs,
          '{"keyboard":"Foo"}');
      });

      test('cancel', function(done) {
        enableDialogElStub.dispatchEvent(new CustomEvent('cancel'));

        p.then(function(val) {
          assert.isTrue(enableDialogElStub.hidden);
          assert.isFalse(val);
        }).then(done, done);
      });

      test('confirm', function(done) {
        enableDialogElStub.dispatchEvent(new CustomEvent('confirm'));

        p.then(function(val) {
          assert.isTrue(enableDialogElStub.hidden);
          assert.isTrue(val);
        }).then(done, done);
      });
    });

    suite('show while visible', function() {
      setup(function() {
        assert.isTrue(enableDialogElStub.hidden);
        listView.beforeShow();
        listView.show();

        p = listView.confirmEnable('Foo');

        assert.isFalse(enableDialogElStub.hidden);
        assert.equal(enableDialogElStub.firstElementChild.dataset.l10nArgs,
          '{"keyboard":"Foo"}');
      });

      test('cancel', function(done) {
        enableDialogElStub.dispatchEvent(new CustomEvent('cancel'));

        p.then(function(val) {
          assert.isTrue(enableDialogElStub.hidden);
          assert.isFalse(val);
        }).then(done, done);
      });

      test('confirm', function(done) {
        enableDialogElStub.dispatchEvent(new CustomEvent('confirm'));

        p.then(function(val) {
          assert.isTrue(enableDialogElStub.hidden);
          assert.isTrue(val);
        }).then(done, done);
      });
    });
  });

  test('disableLayout', function() {
    layoutItemListStub.layoutEnabler.disableLayout.returns({ stub: 'promise' });

    var p = listView.disableLayout('foo');
    assert.deepEqual(p, { stub: 'promise' });
  });

  test('enableLayout', function() {
    layoutItemListStub.layoutEnabler.enableLayout.returns({ stub: 'promise' });

    var p = listView.enableLayout('foo');
    assert.deepEqual(p, { stub: 'promise' });
  });

  suite('showDownloadErrorToast', function() {
    test('call before the panel is shown', function() {
      listView.showDownloadErrorToast();

      assert.isFalse(toastElStub.show.calledOnce);
    });

    test('call after the panel is shown', function() {
      listView.beforeShow();
      listView.show();

      listView.showDownloadErrorToast();

      assert.isTrue(toastElStub.show.calledOnce);
    });

    test('hide the panel', function() {
      listView.beforeHide();
      listView.hide();

      assert.isTrue(toastElStub.hide.calledOnce);
    });
  });
});
