'use strict';

/* global BaseView, LayoutItemListView,
          GeneralSettingsGroupView, HandwritingSettingsGroupView */

(function(exports) {

var GeneralPanel = function(app) {
  BaseView.apply(this);

  this._menuUDItem = null;

  this.app = app;
};

GeneralPanel.prototype = Object.create(BaseView.prototype);

GeneralPanel.prototype.CONTAINER_ID = 'general';
GeneralPanel.prototype.USER_DICT_ITEM_ID = 'menu-userdict';

GeneralPanel.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this._menuUDItem = document.getElementById(this.USER_DICT_ITEM_ID);

  this.childViews.general = new GeneralSettingsGroupView(this.app);
  this.childViews.general.start();

  // We might not have handwriting settings
  if (typeof HandwritingSettingsGroupView === 'function') {
    this.childViews.handwriting = new HandwritingSettingsGroupView(this.app);
    this.childViews.handwriting.start();
  } else {
    // drop in a dummy View to avoid future if-then-else'.
    this.childViews.handwriting = new BaseView();
    this.childViews.handwriting.start();
  }

  this.childViews.layoutItemList = new LayoutItemListView(this.app);
  this.childViews.layoutItemList.start();
};

GeneralPanel.prototype.stop = function() {
  BaseView.prototype.stop.call(this);

  this._menuUDItem = null;

  this.childViews.general.stop();
  delete this.childViews.general;

  this.childViews.handwriting.stop();
  delete this.childViews.handwriting;

  this.childViews.layoutItemList.stop();
  delete this.childViews.layoutItemList;
};

GeneralPanel.prototype.show = function() {
  this.container.querySelector('gaia-header').addEventListener('action', this);

  // we might not have user dict
  if (this._menuUDItem) {
    this._menuUDItem.addEventListener('click', this);
  }

  return BaseView.prototype.show.call(this);
};

GeneralPanel.prototype.beforeHide = function() {
  this.container.querySelector('gaia-header')
    .removeEventListener('action', this);

  if (this._menuUDItem) {
    this._menuUDItem.removeEventListener('click', this);
  }

  return BaseView.prototype.beforeHide.call(this);
};

GeneralPanel.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'action':
      this.app.requestClose();
      break;

    case 'click':
      this.app.panelController.navigateToPanel(
        this.app.panelController.userDictionaryListPanel
      );
      evt.preventDefault();
      break;
  }
};

exports.GeneralPanel = GeneralPanel;

})(window);
