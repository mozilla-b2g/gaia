'use strict';

/* global LayoutItemList, LayoutItemView, BaseView */

(function(exports) {

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

  this._installedListContainer =
    document.getElementById(this.INSTALLED_LIST_ID);
  this._installableListContainer =
    document.getElementById(this.INSTALLABLE_LIST_ID);
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
      new LayoutItemView(layoutItem);
    layoutItemView.oninlistchange = function() {
      // Must go through every view to ensure correct order in the DOM.
      for (var id in this.childViews) {
        this._putItemViewInList(this.childViews[id]);
      }
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

exports.LayoutItemListView = LayoutItemListView;

}(window));
