'use strict';

/* global UserDictionaryListPanel, GeneralPanel, UserDictionaryEditDialog */

(function(exports) {

/*
 * Controls transitioning of different panels and dialogs. The concept is
 * largely the same with Settings app, but we're working under these bases here:
 *
 * 1) we only have two panels (general and user-dictionary-word-list), and one
 *    dialog (user-dictionary-edit).
 * 2) we either navigate to general from word list, or
 *    navigate from general to word list, or
 *    show the dict edit dialog when we're at word list.
 *
 * The transition between general and word list panels are written
 * ad-hoc thereby.
 *
 *
 * == Dialogs ==
 *
 * A dialog is of more limited use:
 *
 * Similr to Settings app, a dialog is always modal and may only be stacked on
 * top of another panel or another dialog, and cannot freely transition to
 * another panel.
 *
 * We should always open a dialog with DialogController -- we try to limit a
 * dialog object's ability to reach other components, and we only provide it
 * with DialogController, at construction, such that it is able to open other
 * dialogs only.
 *
 * A dialog has a onsubmit call back where it passes its result, which is
 * processed by openDialog, for subsequent clean-up and transition-out, and for
 * propogation the results through openDialog's originally returned Promise to
 * its caller.
 */

// in case transitionend event is interrupted due to whatever reason,
// we use a timeout to make sure that the sequence is not uncontrollably
// interruptted.
const TRANSITION_TIMEOUT = 600;

var PanelController = function(app, rootPanelClass) {
  this.RootPanelClass = rootPanelClass || this.ROOT_PANEL_CLASS;

  this._currentPanel = null;
  this.app = app;

  this.rootPanel = null;
  this.userDictionaryListPanel = null;
};

PanelController.prototype.ROOT_PANEL_CLASS = GeneralPanel;

PanelController.prototype.start = function() {
  this.rootPanel = new this.RootPanelClass(this.app);
  this.rootPanel.start();

  // We support user dictionary!
  if (typeof UserDictionaryListPanel === 'function') {
    this.userDictionaryListPanel = new UserDictionaryListPanel(this.app);
    this.userDictionaryListPanel.start();
  }

  Promise.resolve(this.rootPanel.beforeShow())
  .then(this.rootPanel.show.bind(this.rootPanel))
  .catch(e => e && console.error(e));
};

PanelController.prototype.stop = function() {
  this._currentPanel = null;

  this.rootPanel.stop();
  this.rootPanel = null;

  if (this.userDictionaryListPanel) {
    this.userDictionaryListPanel.stop();
    this.userDictionaryListPanel = null;
  }
};

PanelController.prototype._createTransitionPromise = function(target) {
  return new Promise(function(resolve){
    var transitionEnd = function(){
      clearTimeout(timeout);
      target.removeEventListener('transitionend', transitionEnd);

      resolve();
    };

    var timeout = setTimeout(transitionEnd, TRANSITION_TIMEOUT);
    target.addEventListener('transitionend', transitionEnd);
  });
};

PanelController.prototype.navigateToRoot = function() {
  // we assume we're always navigating from one-level-deep panel (=> word list)

  Promise.resolve(this._currentPanel.beforeHide())
  .then(() => this.rootPanel.beforeShow())
  .then(() => {
    var transitionPromise =
      this._createTransitionPromise(this._currentPanel.container);

    this._currentPanel.container.classList.remove('current');
    this.rootPanel.container.classList.remove('prev');
    this.rootPanel.container.classList.add('current');

    return transitionPromise;
  })
  .then(this._currentPanel.hide.bind(this._currentPanel))
  .then(this.rootPanel.show.bind(this.rootPanel))
  .then(() => {
    this._currentPanel = null;
  })
  .catch(e => e && console.error(e));
};

PanelController.prototype.navigateToPanel = function(panel, options) {
  // we assume we're always navigating from general

  this._currentPanel = panel;

  Promise.resolve(this.rootPanel.beforeHide())
  .then(() => panel.beforeShow(options))
  .then(() => {
    var transitionPromise = this._createTransitionPromise(panel.container);

    panel.container.classList.add('current');
    this.rootPanel.container.classList.remove('current');
    this.rootPanel.container.classList.add('prev');

    return transitionPromise;
  })
  .then(this.rootPanel.hide.bind(this.rootPanel))
  .then(panel.show.bind(panel))
  .catch(e => e && console.error(e));
};


var DialogController = function() {
  this.userDictionaryEditDialog = null;
};

DialogController.prototype.start = function() {
  // We support user dictionary!
  if (typeof UserDictionaryEditDialog === 'function') {
    this.userDictionaryEditDialog = new UserDictionaryEditDialog(this);
    this.userDictionaryEditDialog.start();
  }
};

DialogController.prototype.stop = function() {
  if (this.userDictionaryEditDialog) {
    this.userDictionaryEditDialog.stop();
    this.userDictionaryEditDialog = null;
   }
};

DialogController.prototype._createTransitionPromise =
  PanelController.prototype._createTransitionPromise;

DialogController.prototype.openDialog = function(dialog, options) {
  if (!('onsubmit' in dialog)) {
    return Promise.reject('Dialog does not have a onsubmit callback');
  }

  var resultPromiseResolve, resultPromiseReject;

  var resultPromise = new Promise(function(resolve, reject){
    resultPromiseResolve = resolve;
    resultPromiseReject = reject;
  });

  dialog.onsubmit = results => {
    resultPromiseResolve(results);

    Promise.resolve(dialog.beforeHide())
    .then(() => {
      var transitionPromise = this._createTransitionPromise(dialog.container);

      dialog.container.classList.remove('displayed');

      return transitionPromise;
    })
    .then(() => {
      dialog.onsubmit = undefined;
      return dialog.hide();
    })
    .catch(e => e && console.log(e));
  };

  Promise.resolve(dialog.beforeShow(options))
  .then(() => {
    var transitionPromise = this._createTransitionPromise(dialog.container);

    dialog.container.classList.add('displayed');

    return transitionPromise;
  })
  .then(dialog.show.bind(dialog))
  .catch(e => resultPromiseReject(e));

  return resultPromise;
};

exports.PanelController = PanelController;
exports.DialogController = DialogController;

})(window);
