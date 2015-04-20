'use strict';

/* global LayoutItemListView, LayoutItemList, LayoutItemView */

require('/js/settings/base_view.js');
require('/js/settings/layout_item_list_view.js');

require('/js/settings/layout_item_list.js');
require('/js/settings/layout_item_view.js');

suite('LayoutItemListView', function() {
  var listView;

  var app;
  var installedListElStub;
  var installableListElStub;
  var containerElStub;
  var layoutItemListStub;

  var removeDialogElStub;
  var downloadDialogStub;
  var toastStub;

  setup(function() {
    layoutItemListStub =
      this.sinon.stub(LayoutItemList.prototype);
    this.sinon.stub(window, 'LayoutItemList').returns(layoutItemListStub);

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

    downloadDialogStub = document.createElement('div');
    downloadDialogStub.appendChild(document.createElement('p'));
    downloadDialogStub.hidden = true;

    toastStub = document.createElement('div');
    toastStub.show = this.sinon.stub();
    toastStub.hide = this.sinon.stub();

    listView = new LayoutItemListView(app);

    this.sinon.stub(document, 'getElementById')
      .withArgs(listView.CONTAINER_ID).returns(containerElStub)
      .withArgs(listView.INSTALLED_LIST_ID).returns(installedListElStub)
      .withArgs(listView.INSTALLABLE_LIST_ID).returns(installableListElStub)
      .withArgs('installable-keyboards-removal-dialog')
        .returns(removeDialogElStub)
      .withArgs('installable-keyboards-download-error-toast')
        .returns(toastStub)
      .withArgs('installable-keyboards-mobile-download-dialog')
        .returns(downloadDialogStub);

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
      p = listView.confirmDownload('Foo');

      assert.isFalse(downloadDialogStub.hidden);
    });

    test('cancel', function(done) {
      downloadDialogStub.dispatchEvent(new CustomEvent('cancel'));

      p.then(function(val) {
        assert.isTrue(downloadDialogStub.hidden);
        assert.isFalse(val);
      }).then(done, done);
    });

    test('confirm', function(done) {
      downloadDialogStub.dispatchEvent(new CustomEvent('confirm'));

      p.then(function(val) {
        assert.isTrue(downloadDialogStub.hidden);
        assert.isTrue(val);
      }).then(done, done);
    });
  });


  suite('showDownloadErrorToast', function() {
    test('call before the panel is shown', function() {
      listView.showDownloadErrorToast();

      assert.isFalse(toastStub.show.calledOnce);
    });

    test('call after the panel is shown', function() {
      listView.beforeShow();
      listView.show();

      listView.showDownloadErrorToast();

      assert.isTrue(toastStub.show.calledOnce);
    });

    test('hide the panel', function() {
      listView.beforeHide();
      listView.hide();

      assert.isTrue(toastStub.hide.calledOnce);
    });
  });
});
