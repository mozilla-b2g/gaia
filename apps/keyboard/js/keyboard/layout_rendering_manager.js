'use strict';

/* global Promise */

(function(exports) {

var LayoutRenderingManager = function(app) {
  this.app = app;
  // Reference of the layoutManager.currentPage that is
  // currently being rendered. Only updates when updateLayoutRendering()
  // is called.
  this._currentRenderingPage = null;

  this._resizeListenerTimer = undefined;

  // a weak map from DOM elements to its abstract key object, to keep us from
  // directly relying on DOM elements during user interactions.
  // this should only be directly written by IMErender,
  // and reading should always take place through |getTargetObject| below.
  this.domObjectMap = null;
};

LayoutRenderingManager.prototype.start = function() {
  this.app.console.log('LayoutRenderingManager.start()');

  // We cannot listen to resize event right at start because of
  // https://bugzil.la/1007595 ;
  // only attach the event listener after 2000ms.
  this._resizeListenerTimer = setTimeout(function attachResizeListener() {
    this.app.console.log('LayoutRenderingManager.attachResizeListener()');
    // Handle resize events
    window.addEventListener('resize', this);
  }.bind(this), 2000);

  this.domObjectMap = new WeakMap();
};

LayoutRenderingManager.prototype.stop = function() {
  clearTimeout(this._resizeListenerTimer);
  this._resizeListenerTimer = undefined;

  window.removeEventListener('resize', this);

  this.domObjectMap = null;
};

LayoutRenderingManager.prototype.handleEvent = function() {
  this.app.console.log('LayoutRenderingManager.handleEvent()');
  if (document.hidden) {
    this.app.console.log(
      'LayoutRenderingManager: Ignore resizing call since ' +
      'document is hidden.');

    return;
  }

  if (this._currentRenderingPage !== this.app.layoutManager.currentPage) {
    this.app.console.log(
      'LayoutRenderingManager: Ignore resizing call since ' +
      'layout is not ready yet.');

    return;
  }

  this.app.viewManager.resize();
  this._updateHeight();

  // TODO: need to check how to handle orientation change case to
  // show current word suggestions
  this._updateLayoutParams();
};

LayoutRenderingManager.prototype.updateCandidatesRendering = function() {
  if (this._currentRenderingPage !== this.app.layoutManager.currentPage) {
    this.app.console.log(
      'LayoutRenderingManager: Ignore updateCandidatesRendering() call since ' +
      'layout is not ready yet.');

    return;
  }

  this.app.viewManager.showCandidates(
      this.app.candidatePanelManager.currentCandidates);
};

LayoutRenderingManager.prototype.updateUpperCaseRendering = function() {
  this.app.console.log('LayoutRenderingManager.updateUpperCaseRendering()');
  if (this._currentRenderingPage !== this.app.layoutManager.currentPage) {
    this.app.console.log(
      'LayoutRenderingManager: Ignore updateUpperCaseRendering() call since ' +
      'layout is not ready yet.');

    return;
  }

  // Otherwise we can just update only the keys we need...
  // Try to block the event loop as little as possible
  window.requestAnimationFrame(function() {
    this.app.console.log(
      'LayoutRenderingManager.updateUpperCaseRendering()::' +
      'requestAnimationFrame');
    this.app.viewManager.setUpperCaseLock(this.app.upperCaseStateManager);
  }.bind(this));
};

// This function asks render.js to create an HTML layout for the keyboard.
//
// This should be called when the keyboard changes or when the layout page
// changes in order to actually render the layout.
LayoutRenderingManager.prototype.updateLayoutRendering = function() {
  this.app.console.log('LayoutRenderingManager.updateLayoutRendering()');
  this.app.console.time('LayoutRenderingManager.updateLayoutRendering()');

  var currentPage = this._currentRenderingPage =
    this.app.layoutManager.currentPage;
  var currentIMEngine = this.app.inputMethodManager.currentIMEngine;

  this.app.console.log('needsCandidatePanel',
    currentPage.autoCorrectLanguage, currentPage.needsCandidatePanel,
    typeof currentIMEngine.displaysCandidates !== 'function',
    (currentIMEngine.displaysCandidates &&
      currentIMEngine.displaysCandidates()));

  // Determine if the candidate panel for word suggestion is needed
  var needsCandidatePanel = !!(
    (currentPage.autoCorrectLanguage || currentPage.needsCandidatePanel) &&
    ((typeof currentIMEngine.displaysCandidates !== 'function') ||
      currentIMEngine.displaysCandidates()));

  var p = new Promise(function(resolve) {
    this.app.viewManager.render(currentPage, {
      uppercase: this.app.upperCaseStateManager.isUpperCase,
      inputType: this.app.getBasicInputType(),
      showCandidatePanel: needsCandidatePanel
    }, resolve);
  }.bind(this)).then(this._afterRenderDrew.bind(this));

  // Make sure JS error is not sliently ignored.
  p.catch(function(e) { console.error(e); });

  // Show the keyboard or update to the current height.
  this._updateHeight();

  this.app.console.timeEnd('LayoutRenderingManager.updateLayoutRendering()');

  return p;
};

LayoutRenderingManager.prototype.drawHandwritingPad = function(press,
                                                               start,
                                                               strokeWidth) {
  return this.app.viewManager.drawHandwritingPad(press, start, strokeWidth);
};

LayoutRenderingManager.prototype.clearHandwritingPad = function(target) {
  this.app.viewManager.clearHandwritingPad(target);
};

// So there are a couple of things that we want don't want to block
// on here, so we can do it if resizeUI is fully finished
LayoutRenderingManager.prototype._afterRenderDrew = function() {
  this.app.console.log('LayoutRenderingManager._afterRenderDrew()');
  this.app.console.time('LayoutRenderingManager._afterRenderDrew()');

  // Reflect the current upper case state on the newly rendered layout.
  this.app.viewManager.setUpperCaseLock(this.app.upperCaseStateManager);

  // Reflect the current candidates on the current layout.
  this.app.viewManager.showCandidates(
      this.app.candidatePanelManager.currentCandidates);

  // Tell the input method about the new keyboard layout
  this._updateLayoutParams();

  this.app.console.timeEnd('LayoutRenderingManager._afterRenderDrew()');
};

// If the input method cares about layout details, get those details
// from the renderer and pass them on to the input method. This is called
// from renderKeyboard() each time the keyboard layout changes.
// As an optimzation, however, we only send parameters if layoutPage is
// the default, since the input methods we support don't do anything special
// for symbols.
LayoutRenderingManager.prototype._updateLayoutParams = function() {
  this.app.console.log('LayoutRenderingManager._updateLayoutParams()');
  var currentIMEngine = this.app.inputMethodManager.currentIMEngine;
  var layoutManager = this.app.layoutManager;

  if ((typeof currentIMEngine.setLayoutParams !== 'function') ||
      layoutManager.currentPageIndex !== layoutManager.PAGE_INDEX_DEFAULT) {
    return;
  }

  var candidatePanel = this.app.viewManager.candidatePanel;
  var yBias = candidatePanel ? candidatePanel.clientHeight : 0;

  currentIMEngine.setLayoutParams({
    keyboardWidth: this.app.viewManager.getWidth(),
    keyboardHeight: (this.app.viewManager.getHeight() - yBias),
    keyArray: this.app.viewManager.getKeyArray(),
    keyWidth: this.app.viewManager.getKeyWidth(),
    keyHeight: this.app.viewManager.getKeyHeight()
  });
};

LayoutRenderingManager.prototype._updateHeight = function() {
  this.app.console.log('LayoutRenderingManager._updateHeight()');
  this.app.console.time('LayoutRenderingManager._updateHeight()');
  // height of the current active IME + 1px for the borderTop
  var imeHeight = this.app.viewManager.getHeight() + 1;
  var imeWidth = this.app.viewManager.getWidth();

  this.app.console.timeEnd('LayoutRenderingManager._updateHeight()');
  this.app.console.timeEnd('activate');
  this.app.console.timeEnd('domLoading');

  window.resizeTo(imeWidth, imeHeight);
};

LayoutRenderingManager.prototype.getTargetObject = function (elem) {
  this.app.console.log(
    'LayoutRenderingManager.getTargetObject()', elem);
  if (!elem) {
    return {};
  }

  var target = this.domObjectMap.get(elem);
  this.app.console.log('target=', target,
                       'prototype=', target && Object.getPrototypeOf(target));
  // default to an empty object such that member accessing and 'in' won't fail
  return target || {};
};

exports.LayoutRenderingManager = LayoutRenderingManager;

})(window);
