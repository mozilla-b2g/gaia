'use strict';

/* global LayoutItemList, LayoutItemView, BaseView */

(function(exports) {

// This is a simple wrapper that wraps <gaia-toast> into our view management.
// The reason we did this is because we need to defer the toast from showing,
// if our containing view is not visible.
var LayoutItemDownloadErrorToastView = function() {
  BaseView.apply(this);

  // This property keeps the visibility state of the view,
  // so we would know whether or not to delay the toast to show.
  this._isVisible = false;
  this._showDelayed = false;
};
LayoutItemDownloadErrorToastView.prototype = Object.create(BaseView.prototype);
LayoutItemDownloadErrorToastView.prototype.CONTAINER_ID =
  'installable-keyboards-download-error-toast';
LayoutItemDownloadErrorToastView.prototype.start = function() {
  BaseView.prototype.start.call(this);
  this._isVisible = false;
  this._showDelayed = false;
};
LayoutItemDownloadErrorToastView.prototype.stop = function() {
  BaseView.prototype.stop.call(this);
  this._isVisible = false;
  this._showDelayed = false;
};
LayoutItemDownloadErrorToastView.prototype.show = function() {
  BaseView.prototype.show.call(this);

  this._isVisible = true;
  if (this._showDelayed) {
    this.container.show();
    this._showDelayed = false;
  }
};
LayoutItemDownloadErrorToastView.prototype.beforeHide = function() {
  BaseView.prototype.beforeHide.call(this);

  this._isVisible = false;
  this.container.hide();
};
LayoutItemDownloadErrorToastView.prototype.showToast = function() {
  if (!this._isVisible) {
    this._showDelayed = true;

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

var DialogInfo = function(args) {
  this.args = args;
  this.deferred = new Deferred();
};

// This is a wrapper that wraps <gaia-confirm> into our view management.
// The reason we did this is because we need to defer the toast from showing,
// if our containing view is not visible.
// We also want to queue the showDialog requests.
var ConfirmationDialogBaseView = function() {
  BaseView.apply(this);

  // This property keeps the visibility state of the view,
  // so we would know whether or not to delay the dialog to show.
  this._isVisible = false;
  this._isShown = undefined;

  this._currentDialogInfo = null;
  this._delayedDialogInfo = null;
};

ConfirmationDialogBaseView.prototype =
  Object.create(BaseView.prototype);

ConfirmationDialogBaseView.prototype.CONTAINER_ID = undefined;

ConfirmationDialogBaseView.prototype.start = function() {
  if (!this.CONTAINER_ID) {
    throw new Error('ConfirmationDialogBaseView: CONTAINER_ID unset.');
  }

  BaseView.prototype.start.call(this);

  this._delayedDialogInfo = [];
  this.container.hidden = true;
  this._isShown = false;

  this.container.addEventListener('confirm', this);
  this.container.addEventListener('cancel', this);
};

ConfirmationDialogBaseView.prototype.stop = function() {
  this.container.removeEventListener('confirm', this);
  this.container.removeEventListener('cancel', this);

  // Reject unhandled promises.
  this._delayedDialogInfo.forEach(function(info) {
    info.deferred.reject('stopped');
  });
  this._delayedDialogInfo = null;

  BaseView.prototype.stop.call(this);
};

ConfirmationDialogBaseView.prototype.show = function() {
  BaseView.prototype.show.call(this);

  this._isVisible = true;
  this._maybeShowNextDelayedDialog();
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
  var info = new DialogInfo(Array.prototype.slice.call(arguments));
  this._delayedDialogInfo.push(info);
  this._maybeShowNextDelayedDialog();

  return info.deferred.promise;
};

// noop, to be overriden, will be called when the dialog actually shown,
// with whatever arguments passed to showDialog originally.
ConfirmationDialogBaseView.prototype.beforeShowDialog = function() {
};

ConfirmationDialogBaseView.prototype._maybeShowNextDelayedDialog = function() {
  if (!this._delayedDialogInfo.length ||
      !this._isVisible ||
      this._isShown) {
    return;
  }

  var info = this._delayedDialogInfo.shift();
  this.beforeShowDialog.apply(this, info.args);

  this.container.hidden = false;
  this._isShown = true;
  this._currentDialogInfo = info;
};

ConfirmationDialogBaseView.prototype.beforeHide = function() {
  this._isVisible = false;

  if (this._isShown) {
    this.hideDialog(false);
  }

  BaseView.prototype.beforeHide.call(this);
};

ConfirmationDialogBaseView.prototype.hideDialog = function(confirmed) {
  if (!this._isShown) {
    throw new Error(
      'ConfirmationDialogBaseView: hideDialog() called when not shown.');
  }

  this._currentDialogInfo.deferred.resolve(confirmed);

  this.container.hidden = true;
  this._isShown = false;
  this._currentDialogInfo = null;

  this._maybeShowNextDelayedDialog();
};

var LayoutItemRemovalConfirmationDialogView = function() {
  ConfirmationDialogBaseView.apply(this);
};

LayoutItemRemovalConfirmationDialogView.prototype =
  Object.create(ConfirmationDialogBaseView.prototype);

LayoutItemRemovalConfirmationDialogView.prototype.CONTAINER_ID =
  'installable-keyboards-removal-dialog';

// override
LayoutItemRemovalConfirmationDialogView.prototype.beforeShowDialog =
function(label) {
  ConfirmationDialogBaseView.prototype.beforeShowDialog(this);

  this.container.firstElementChild.dataset.l10nArgs =
    JSON.stringify({ keyboard: label });
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
LayoutItemDataConnectionConfirmationDialogView.prototype.beforeShowDialog =
function() {
  ConfirmationDialogBaseView.prototype.beforeShowDialog(this);

  this.rememberMyChoiceElement.checked = false;
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
