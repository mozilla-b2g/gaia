'use strict';

/* global PerformanceTimer, InputMethodManager, LayoutManager,
          SettingsPromiseManager, L10nLoader, TargetHandlersManager,
          FeedbackManager, VisualHighlightManager, CandidatePanelManager,
          UpperCaseStateManager, LayoutRenderingManager, IMERender,
          StateManager */

(function(exports) {

var KeyboardApp = function() {
  this.perfTimer = null;
  this.inputMethodManager = null;
  this.layoutManager = null;
  this.settingsPromiseManager = null;
  this.l10nLoader = null;
  this.targetHandlersManager = null;
  this.feedbackManager = null;
  this.visualHighlightManager = null;
  this.candidatePanelManager = null;
  this.upperCaseStateManager = null;
  this.layoutRenderingManager = null;
  this.stateManager = null;

  this.inputContext = null;
};

KeyboardApp.prototype.ACCENT_CHAR_MENU_ELEMENT_ID = 'keyboard-accent-char-menu';
KeyboardApp.prototype.CONATINER_ELEMENT_ID = 'keyboard';

KeyboardApp.prototype.start = function() {
  this._startComponents();
};

KeyboardApp.prototype._startComponents = function() {
  // A timer for time measurement
  this.perfTimer = new PerformanceTimer();
  this.perfTimer.start();
  this.perfTimer.printTime('KeyboardApp._startComponents()');
  this.perfTimer.startTimer('KeyboardApp._startComponents()');

  // SettingsPromiseManager wraps Settings DB methods into promises.
  // This must be available to InputMethodManager and FeedbackManager.
  this.settingsPromiseManager = new SettingsPromiseManager();

  // InputMethodManager is responsible of loading/activating input methods.
  this.inputMethodManager = new InputMethodManager(this);
  this.inputMethodManager.start();

  // LayoutManager loads and holds layout layouts for us.
  // It also help us ensure there is only one current layout at the time.
  this.layoutManager = new LayoutManager(this);
  this.layoutManager.start();

  // L10nLoader loads l10n.js. We call it's one and only load() method
  // only after we have run everything in the critical cold launch path.
  this.l10nLoader = new L10nLoader();

  // targetHandlersManager handles key targets when they are being interacted.
  this.targetHandlersManager = new TargetHandlersManager(this);
  this.targetHandlersManager.start();

  this.feedbackManager = new FeedbackManager(this);
  this.feedbackManager.start();

  this.visualHighlightManager = new VisualHighlightManager(this);
  this.visualHighlightManager.start();

  this.candidatePanelManager = new CandidatePanelManager(this);
  this.candidatePanelManager.start();

  this.upperCaseStateManager = new UpperCaseStateManager();
  this.upperCaseStateManager.onstatechange =
    this.handleUpperCaseStateChange.bind(this);
  this.upperCaseStateManager.start();

  this.layoutRenderingManager = new LayoutRenderingManager(this);
  this.layoutRenderingManager.start();

  // Initialize the rendering module
  IMERender.init();

  this.stateManager = new StateManager(this);
  this.stateManager.start();

  this.perfTimer.printTime('BLOCKING KeyboardApp._startComponents()',
    'KeyboardApp._startComponents()');
};

KeyboardApp.prototype.stop = function() {
  this._stopComponents();

  this.inputContext = null;
};

KeyboardApp.prototype._stopComponents = function() {
  this.perfTimer = null;

  this.inputMethodManager = null;

  this.layoutManager = null;

  this.settingsPromiseManager = null;

  this.l10nLoader = null;

  this.targetHandlersManager.stop();
  this.targetHandlersManager = null;

  this.feedbackManager.stop();
  this.feedbackManager = null;

  this.visualHighlightManager.stop();
  this.visualHighlightManager = null;

  this.candidatePanelManager.stop();
  this.candidatePanelManager = null;

  this.upperCaseStateManager.onstatechange = null;
  this.upperCaseStateManager.stop();
  this.upperCaseStateManager = null;

  this.layoutRenderingManager.stop();
  this.layoutRenderingManager = null;

  this.stateManager.stop();
  this.stateManager = null;
};

KeyboardApp.prototype.getMenuContainer = function() {
  // This is equal to IMERender.menu.
  return document.getElementById(this.ACCENT_CHAR_MENU_ELEMENT_ID);
};

KeyboardApp.prototype.getContainer = function() {
  // This is equal to IMERender.ime.
  return document.getElementById(this.CONATINER_ELEMENT_ID);
};

KeyboardApp.prototype.setInputContext = function(inputContext) {
  this.inputContext = inputContext;
};

KeyboardApp.prototype.getBasicInputType = function() {
  if (!this.inputContext) {
    return 'text';
  }

  var type = this.inputContext.inputType;
  switch (type) {
    // basic types
    case 'url':
    case 'tel':
    case 'email':
    case 'text':
      // Don't overwrite type

      break;

    // default fallback and textual types
    case 'password':
    case 'search':
    /* falls through */
    default:
      type = 'text';

      break;

    case 'number':
    case 'range': // XXX: should be different from number
      type = 'number';

      break;
  }

  return type;
};

KeyboardApp.prototype.supportsSwitching = function() {
  return navigator.mozInputMethod.mgmt.supportsSwitching();
};

KeyboardApp.prototype.setLayoutPage = function setLayoutPage(page) {
  this.layoutManager.updateLayoutPage(page);
  this.layoutRenderingManager.updateLayoutRendering();

  var engine = this.inputMethodManager.currentIMEngine;
  if (typeof engine.setLayoutPage === 'function') {
    engine.setLayoutPage(this.layoutManager.currentLayoutPage);
  }
};

// XXX: this should move to InputMethodGlue after
// IMERender() is no longer a global class.
KeyboardApp.prototype.getNumberOfCandidatesPerRow = function() {
  return IMERender.getNumberOfCandidatesPerRow();
};

KeyboardApp.prototype.handleUpperCaseStateChange = function() {
  // When we have secondLayout, we need to force re-render on uppercase switch
  if (this.layoutManager.currentModifiedLayout.secondLayout) {
    this.layoutRenderingManager.updateLayoutRendering();

    return;
  }

  // Otherwise we can just update only the keys we need...
  // Try to block the event loop as little as possible
  window.requestAnimationFrame(function() {
    this.perfTimer.startTimer('setUpperCase:requestAnimationFrame:callback');
    // And make sure the caps lock key is highlighted correctly
    IMERender.setUpperCaseLock(this.upperCaseStateManager);

    //restore the previous candidates
    this.candidatePanelManager.showCandidates();

    this.perfTimer.printTime(
      'BLOCKING setUpperCase:requestAnimationFrame:callback',
      'setUpperCase:requestAnimationFrame:callback');
  }.bind(this));
};

exports.KeyboardApp = KeyboardApp;

})(window);
