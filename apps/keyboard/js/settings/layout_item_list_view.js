'use strict';

/* global LayoutItemList, LayoutItemView, BaseView */

(function(exports) {

// This is a simple wrapper that wraps <gaia-toast> into our view management.
// The reason we did this is because we need to defer the toast from showing,
// if our containing view is not visible.
var LayoutItemDownloadErrorToastView = function() {
  BaseView.apply(this);

  this.isVisible = false;
  this.showDeferred = false;
};
LayoutItemDownloadErrorToastView.prototype = Object.create(BaseView.prototype);
LayoutItemDownloadErrorToastView.prototype.CONTAINER_ID =
  'installable-keyboards-download-error-toast';
LayoutItemDownloadErrorToastView.prototype.start = function() {
  BaseView.prototype.start.call(this);
  this.isVisible = false;
  this.showDeferred = false;
};
LayoutItemDownloadErrorToastView.prototype.stop = function() {
  BaseView.prototype.stop.call(this);
  this.isVisible = false;
  this.showDeferred = false;
};
LayoutItemDownloadErrorToastView.prototype.show = function() {
  BaseView.prototype.show.call(this);

  this.isVisible = true;
  if (this.showDeferred) {
    this.container.show();
    this.showDeferred = false;
  }
};
LayoutItemDownloadErrorToastView.prototype.beforeHide = function() {
  BaseView.prototype.beforeHide.call(this);

  this.isVisible = false;
  this.container.hide();
};
LayoutItemDownloadErrorToastView.prototype.showToast = function() {
  if (!this.isVisible) {
    this.showDeferred = true;

    return;
  }

  // The <gaia-toast> will hide itself, or delay the timeout if it is already
  // shown.
  this.container.show();
};

var Deferred = function() {
  this.promise = new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }.bind(this));
};

var ConfirmationDialogBaseView = function() {
  BaseView.apply(this);

  this.deferred = null;
};

ConfirmationDialogBaseView.prototype.isShown = false;

ConfirmationDialogBaseView.prototype =
  Object.create(BaseView.prototype);

ConfirmationDialogBaseView.prototype.CONTAINER_ID = undefined;

ConfirmationDialogBaseView.prototype.start = function() {
  if (!this.CONTAINER_ID) {
    throw new Error('ConfirmationDialogBaseView: CONTAINER_ID unset.');
  }

  BaseView.prototype.start.call(this);

  this.container.addEventListener('confirm', this);
  this.container.addEventListener('cancel', this);
};

ConfirmationDialogBaseView.prototype.stop = function() {
  this.container.removeEventListener('confirm', this);
  this.container.removeEventListener('cancel', this);

  BaseView.prototype.stop.call(this);
};

ConfirmationDialogBaseView.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'confirm':
      this.hideDialog(true);

      break;

    case 'cancel':
      this.hideDialog(false);

      break;

    default:
      throw new Error('ConfirmationDialogBaseView: Unknown event.');
  }
};

ConfirmationDialogBaseView.prototype.showDialog = function() {
  if (this.isShown) {
    throw new Error(
      'ConfirmationDialogBaseView: showDialog() called twice.');
  }

  this.container.hidden = false;
  this.isShown = true;
  this.deferred = new Deferred();

  return this.deferred.promise;
};

ConfirmationDialogBaseView.prototype.beforeHide = function() {
  if (this.isShown) {
    this.hideDialog(false);
  }

  BaseView.prototype.beforeHide.call(this);
};

ConfirmationDialogBaseView.prototype.hideDialog = function(confirmed) {
  if (!this.isShown) {
    throw new Error(
      'ConfirmationDialogBaseView: hideDialog() called twice.');
  }

  this.deferred.resolve(confirmed);

  this.container.hidden = true;
  this.isShown = false;
  this.deferred = null;
};

var LayoutItemRemovalConfirmationDialogView = function() {
  ConfirmationDialogBaseView.apply(this);
};

LayoutItemRemovalConfirmationDialogView.prototype =
  Object.create(ConfirmationDialogBaseView.prototype);

LayoutItemRemovalConfirmationDialogView.prototype.CONTAINER_ID =
  'installable-keyboards-removal-dialog';

// override
LayoutItemRemovalConfirmationDialogView.prototype.showDialog = function(label) {
  if (this.isShown) {
    throw new Error(
      'LayoutItemRemovalConfirmationDialogView: showDialog() called twice.');
  }

  this.container.firstElementChild.dataset.l10nArgs =
    JSON.stringify({ keyboard: label });

  return ConfirmationDialogBaseView.prototype.showDialog.call(this, label);
};

var LayoutItemDataConnectionConfirmationDialogView = function() {
  ConfirmationDialogBaseView.apply(this);

  this.rememberMyChoiceElement = null;
};

LayoutItemDataConnectionConfirmationDialogView.prototype =
  Object.create(ConfirmationDialogBaseView.prototype);

LayoutItemDataConnectionConfirmationDialogView.prototype.CONTAINER_ID =
  'installable-keyboards-mobile-download-dialog';

LayoutItemDataConnectionConfirmationDialogView.prototype.REMEMBER_MY_CHOICE_ID =
  'installable-keyboards-remember';

// override
LayoutItemDataConnectionConfirmationDialogView.prototype.start = function() {
  ConfirmationDialogBaseView.prototype.start.apply(this);

  this.rememberMyChoiceElement =
    document.getElementById(this.REMEMBER_MY_CHOICE_ID);
};

// override
LayoutItemDataConnectionConfirmationDialogView.prototype.stop = function() {
  ConfirmationDialogBaseView.prototype.stop.apply(this);

  this.rememberMyChoiceElement = null;
};

// override
LayoutItemDataConnectionConfirmationDialogView
.prototype.showDialog = function() {
  this.rememberMyChoiceElement.checked = false;

  return ConfirmationDialogBaseView.prototype.showDialog.call(this);
};

LayoutItemDataConnectionConfirmationDialogView
.prototype.shouldRemember = function() {
  return this.rememberMyChoiceElement.checked;
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
  this.childViews.downloadErrorToast =
    new LayoutItemDownloadErrorToastView();
  this.childViews.downloadErrorToast.start();
  this.childViews.dataConnectionDialog =
    new LayoutItemDataConnectionConfirmationDialogView();
  this.childViews.dataConnectionDialog.start();

  this._installedListContainer =
    document.getElementById(this.INSTALLED_LIST_ID);
  this._installableListContainer =
    document.getElementById(this.INSTALLABLE_LIST_ID);
};

LayoutItemListView.prototype.confirmDownload = function() {
  var downloadPreference = this._model.downloadPreference;
  return downloadPreference.getCurrentState()
    .then(function(state) {
      switch (state) {
        case downloadPreference.STATE_PROMPT:
          return this._showConfirmDownloadDialog();
        case downloadPreference.STATE_ALLOW:
          return true;
        case downloadPreference.STATE_DENY:
          return false;
      }
    }.bind(this));
};

LayoutItemListView.prototype._showConfirmDownloadDialog = function() {
  // Here we assume our safety with UI, i.e. the confirm dialog is an overlay
  // on top of other views so that this method will never get called twice
  // before the previous dialog is confirmed/canceled.
  var downloadPreference = this._model.downloadPreference;
  var dataConnectionDialog = this.childViews.dataConnectionDialog;
  return dataConnectionDialog.showDialog()
    .then(function(confirmed) {
      if (confirmed && dataConnectionDialog.shouldRemember()) {
        downloadPreference
          .setDataConnectionDownloadState(downloadPreference.STATE_ALLOW)
          .catch(function(e) { e && console.error(e); });
      }

      return confirmed;
    }.bind(this));
};

LayoutItemListView.prototype.confirmRemoval = function(layoutName) {
  // Here we assume our safety with UI, i.e. the removal dialog is an overlay
  // on top of other views so that this method will never get called twice
  // before the previous dialog is confirmed/canceled.
  return this.childViews.removeDialog.showDialog(layoutName);
};

LayoutItemListView.prototype.showDownloadErrorToast = function() {
  this.childViews.downloadErrorToast.showToast();
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

exports.LayoutItemDownloadErrorToastView =
  LayoutItemDownloadErrorToastView;
exports.LayoutItemRemovalConfirmationDialogView =
  LayoutItemRemovalConfirmationDialogView;
exports.LayoutItemListView = LayoutItemListView;

}(window));
