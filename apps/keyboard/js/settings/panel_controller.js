'use strict';

(function(exports) {

/*
 * Controls transitioning of different panels. The concept is largely the same
 * with Settings app, but we're working under these bases here:
 *
 * 1) we only have three panels (root, user-dictionary-word-list
 *    user-dictionary-edit).
 * 2) we either navigate to root from word list, or
 *    navigate from root to word list, or
 *    show the dict edit panel (in a dialog's sense) when we're at word list.
 *
 * The transition between root and word list panels are written ad-hoc thereby.
 *
 * The architecture is like Settings app and we have a few exposed event hooks
 * required for each panel class, like:
 * - beforeShow(): when a panel is to be shown.
 * - show(): when a panel has fully transitioned in. Do event binding here
 * - beforeHide(): when a panel is to be hidden. Do event unbinding here
 * - hide(): when a panel has fully transitioned out.
 * Each event hook may optionally be asynchronous by returning a Promise.
 *
 * Additionally, each panel should initialize itself on first beforeShow() in
 * its object lifetime.
 * 
 * The big exception is the root panel -- it's still taken care of by the old
 * codes; and it doesn't need to do any housekeeping job when we transition
 * back from word list.
 *
 * Similar to Settings app, a dialog panel has a onsubmit call back where it
 * passes the result of the dialog when it's done. It should be handled by
 * openDialog (for subsequent clean-up and transition-out) and the results will
 * propagate through openDialog's originally returned Promise to its caller.
 */

var PanelController = function(rootPanelElem) {
  this._rootPanelElem = rootPanelElem;
  this._currentPanel = null;
};

// in case transitionend event is interrupted due to whatever reason,
// we use a timeout to make sure that the sequence is not uncontrollably
// interruptted.
PanelController.prototype.TRANSITION_TIMEOUT = 600;

PanelController.prototype.start = function() {
};

PanelController.prototype.stop = function() {
  this._currentPanel = null;
  this._rootPanelElem = undefined;
};

PanelController.prototype._createTransitionPromise = function(target) {
  return new Promise(function(resolve){
    var transitionEnd = function(){
      clearTimeout(timeout);
      target.removeEventListener('transitionend', transitionEnd);

      resolve();
    };

    var timeout = setTimeout(transitionEnd, this.TRANSITION_TIMEOUT);
    target.addEventListener('transitionend', transitionEnd);
  }.bind(this));
};

PanelController.prototype.navigateToRoot = function() {
  // we assume we're always navigating from one-level-deep panel (=> word list)

  Promise.resolve(this._currentPanel.beforeHide())
  .then(() => {
    var transitionPromise =
      this._createTransitionPromise(this._currentPanel._container);

    this._currentPanel._container.classList.remove('current');
    this._rootPanelElem.classList.remove('prev');
    this._rootPanelElem.classList.add('current');

    return transitionPromise;
  })
  .then(this._currentPanel.hide.bind(this._currentPanel))
  .then(() => {
    this._currentPanel = null;
  })
  .catch(e => e && console.error(e));
};

PanelController.prototype.navigateToPanel = function(panel, options) {
  // we assume we're always navigating from root
  // XXX: We don't have a root panel yet, so root panel won't stop listening
  // to event when we're navigating to another panel. So we might be triggering
  // this twice. We need to fix this in a follow-up bug when we do root panel.

  this._currentPanel = panel;

  Promise.resolve(panel.beforeShow(options))
  .then(() => {
    var transitionPromise = this._createTransitionPromise(panel._container);

    panel._container.classList.add('current');
    this._rootPanelElem.classList.remove('current');
    this._rootPanelElem.classList.add('prev');

    return transitionPromise;
  })
  .then(panel.show.bind(panel))
  .catch(e => e && console.error(e));
};

PanelController.prototype.openDialog = function(panel, options) {
  var resultPromiseResolve, resultPromiseReject;

  var resultPromise = new Promise(function(resolve, reject){
    resultPromiseResolve = resolve;
    resultPromiseReject = reject;
  });

  panel.onsubmit = results => {
    resultPromiseResolve(results);

    Promise.resolve(panel.beforeHide())
    .then(() => {
      var transitionPromise = this._createTransitionPromise(panel._container);

      panel._container.classList.remove('displayed');

      return transitionPromise;
    })
    .then(() => {
      panel.onsubmit = undefined;
      return panel.hide();
    })
    .catch(e => e && console.log(e));
  };

  Promise.resolve(panel.beforeShow(options))
  .then(() => {
    var transitionPromise = this._createTransitionPromise(panel._container);

    panel._container.classList.add('displayed');

    return transitionPromise;
  })
  .then(panel.show.bind(panel))
  .catch(e => resultPromiseReject(e));

  return resultPromise;
};

exports.PanelController = PanelController;

})(window);
