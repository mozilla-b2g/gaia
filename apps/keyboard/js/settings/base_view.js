'use strict';

/*
 * The base class of everything that user can "view". The derived classes
 * include Panels, Dialogs, and Views (a View is defined as a visual group
 * of UI elements of related functionalities).
 *
 * A view may contain sub-Views in itself.
 *
 * A view exposes the following functions:
 *
 * start() and stop() is the beginning and termination of the object's
 * lifecycle.
 *
 * beforeShow() is called by parent[*] when this is to be shown.
 *
 * show() is called by parent when this view has fully transitioned in. 
 *        Usually, do event binding here.
 *
 * beforeHide() is called by parent when this is to be hidden.
 *              Usually, do event unbinding here.
 *
 * hide() is called by parent when this view has has fully transitioned out.
 *
 * [*] parent = Containing view, or PanelController/DialogController.
 *
 * The beforeShow/show/beforeHide/hide hooks may optionally be asynchronous
 * by returning a Promise, which must be honored by its parent. These functions
 * are currently not used by Views (i.e. Panels and Dialogs' calls to child
 * Views' event hooks essentially do nothing).
 *
 * By default, a BaseView-derived object propogates beforeShow/show/beforeHide/
 * hide event hooks to its child views and makes sure the asynchronousness is
 * preserved.
 *
 * Additionally, we accept |options| parameter at beforeShow for initialization
 * of a view.
 */

(function(exports) {

var BaseView = function() {
  this.childViews = {};
};

// A map from view names to Views.
BaseView.prototype.childViews = null;

BaseView.prototype.CONTAINER_ID = null;

BaseView.prototype.container = null;

BaseView.prototype.start = function() {
  if (this.CONTAINER_ID) {
    this.container = document.getElementById(this.CONTAINER_ID);
  }
};

BaseView.prototype.stop = function() {
  this.container = null;
};

BaseView.prototype.beforeShow = function(options) {
  return Promise.all(Object.keys(this.childViews).map(
    name => this.childViews[name].beforeShow(options)));
};

BaseView.prototype.show = function() {
  return Promise.all(Object.keys(this.childViews).map(
    name => this.childViews[name].show()));
};

BaseView.prototype.beforeHide = function() {
  return Promise.all(Object.keys(this.childViews).map(
    name => this.childViews[name].beforeHide()));
};

BaseView.prototype.hide = function() {
  return Promise.all(Object.keys(this.childViews).map(
    name => this.childViews[name].hide()));
};

exports.BaseView = BaseView;

})(window);
