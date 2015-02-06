'use strict';

/* global LayoutItemList, LayoutItemView, BaseView */

(function(exports) {

var LayoutItemRemovalConfirmationDialogView = function() {
  BaseView.apply(this);
};

LayoutItemRemovalConfirmationDialogView.prototype.isShown = false;

LayoutItemRemovalConfirmationDialogView.prototype =
  Object.create(BaseView.prototype);

LayoutItemRemovalConfirmationDialogView.prototype.CONTAINER_ID =
  'installable-keyboards-removal-dialog';

LayoutItemRemovalConfirmationDialogView.prototype.oncancel = null;
LayoutItemRemovalConfirmationDialogView.prototype.onconfirm = null;

LayoutItemRemovalConfirmationDialogView.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this.container.addEventListener('confirm', this);
  this.container.addEventListener('cancel', this);
};

LayoutItemRemovalConfirmationDialogView.prototype.stop = function() {
  this.container.removeEventListener('confirm', this);
  this.container.removeEventListener('cancel', this);

  BaseView.prototype.stop.call(this);
};

LayoutItemRemovalConfirmationDialogView.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'confirm':
      if (typeof this.onconfirm === 'function') {
        this.onconfirm();
      } else {
        console.error('LayoutItemRemovalConfirmationDialog: ' +
          'onconfirm callback should call but no callback attached.');
      }
      this.hideDialog();

      break;

    case 'cancel':
      if (typeof this.oncancel === 'function') {
        this.oncancel();
      }
      this.hideDialog();

      break;

    default:
      throw new Error('LayoutItemRemovalConfirmationDialog: Unknown event.');
  }
};

LayoutItemRemovalConfirmationDialogView.prototype.showDialog = function(label) {
  if (this.isShown) {
    throw new Error(
      'LayoutItemRemovalConfirmationDialog: showDialog() called twice.');
  }
  this.container.firstElementChild.dataset.l10nArgs =
    JSON.stringify({ keyboard: label });

  this.container.hidden = false;
  this.isShown = true;
};

LayoutItemRemovalConfirmationDialogView.prototype.beforeHide = function() {
  if (this.isShown) {
    if (typeof this.oncancel === 'function') {
      this.oncancel();
    }

    this.hideDialog();
  }

  BaseView.prototype.beforeHide.call(this);
};

LayoutItemRemovalConfirmationDialogView.prototype.hideDialog = function() {
  if (!this.isShown) {
    throw new Error(
      'LayoutItemRemovalConfirmationDialog: hide() called twice.');
  }

  this.container.hidden = true;
  this.isShown = false;
};

var LayoutItemListView = function(app) {
  BaseView.apply(this);

  this.app = app;

  this._model = null;
  this._installableListContainer = null;
  this._installedListContainer = null;
};

LayoutItemListView.prototype = Object.create(BaseView.prototype);

LayoutItemListView.prototype.CONTAINER_ID = 'installable-keyboard';
LayoutItemListView.prototype.INSTALLED_LIST_ID = 'installed-keyboards-list';
LayoutItemListView.prototype.INSTALLABLE_LIST_ID = 'installable-keyboards-list';

LayoutItemListView.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this._model = new LayoutItemList(this.app);
  this._model.onready = this._handleModelReady.bind(this);
  this._model.start();

  this.childViews.removeDialog =
    new LayoutItemRemovalConfirmationDialogView();
  this.childViews.removeDialog.start();

  this._installedListContainer =
    document.getElementById(this.INSTALLED_LIST_ID);
  this._installableListContainer =
    document.getElementById(this.INSTALLABLE_LIST_ID);
};

LayoutItemListView.prototype.confirmRemoval = function(view, layoutName) {
  // Here we assume our safety with UI, i.e. the removal dialog is an overlay
  // on top of other views so that this method will never get called twice
  // before the previous dialog is confirmed/canceled.
  this.childViews.removeDialog.onconfirm = function() {
    view.confirmRemoveItem();
    this.childViews.removeDialog.onconfirm = null;
    this.childViews.removeDialog.oncancel = null;
  }.bind(this);

  this.childViews.removeDialog.oncancel = function() {
    this.childViews.removeDialog.onconfirm = null;
    this.childViews.removeDialog.oncancel = null;
  }.bind(this);

  this.childViews.removeDialog.showDialog(layoutName);
};

LayoutItemListView.prototype._handleModelReady = function() {
  this._model.onready = null;

  var layoutItems = this._model.layoutItems;

  if (layoutItems.size === 0) {
    // Nothing to show; all layouts are preloaded.
    return;
  }

  this.container.hidden = false;

  this._model.layoutItems.forEach(function(layoutItem, layoutId) {
    var layoutItemView = this.childViews[layoutId] =
      new LayoutItemView(this, layoutItem);
    layoutItemView.oninlistchange = function() {
      // Must go through every view to ensure correct order in the DOM.
      Array.from(this._model.layoutItems)
        .map(function(keyValue) { return keyValue[0]; })
        .forEach(function(id) {
          this._putItemViewInList(this.childViews[id]);
        }.bind(this));
    }.bind(this);

    layoutItemView.start();

    this._putItemViewInList(layoutItemView);
  }, this);
};

LayoutItemListView.prototype._putItemViewInList = function(layoutItemView) {
  var container;

  switch (layoutItemView.inList) {
    case layoutItemView.IN_LIST_INSTALLED:
      container = this._installedListContainer;

      break;

    case layoutItemView.IN_LIST_INSTALLABLE:
      container = this._installableListContainer;

      break;

    default:
      throw new Error('LayoutItemListView: ' +
        'Unknown inList state of child view.');
  }

  // A nice "feature" of DOM API is that you don't need to removeChild first
  // to do appendChild, and you don't need to re-attach event listeners here
  // after DOM position of the elements changes.
  container.appendChild(layoutItemView.container);
};

LayoutItemListView.prototype.stop = function() {
  BaseView.prototype.stop.call(this);

  this._model.onready = null;
  this._model.stop();
  this._model = null;

  this._installedListContainer = null;

  for (var id in this.childViews) {
    this.childViews[id].stop();
    this.childViews[id] = null;
  }
};

exports.LayoutItemRemovalConfirmationDialogView =
  LayoutItemRemovalConfirmationDialogView;
exports.LayoutItemListView = LayoutItemListView;

}(window));
