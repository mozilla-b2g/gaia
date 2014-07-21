'use strict';

/* global PerformanceTimer, InputMethodManager, LayoutManager,
          SettingsPromiseManager, L10nLoader, TargetHandlersManager,
          FeedbackManager, VisualHighlightManager, CandidatePanelManager,
          UpperCaseStateManager, IMERender */

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

  // InputMethodManager is responsible of loading/activating input methods.
  this.inputMethodManager = new InputMethodManager(this);
  this.inputMethodManager.start();

  // LayoutManager loads and holds layout layouts for us.
  // It also help us ensure there is only one current layout at the time.
  this.layoutManager = new LayoutManager(this);
  this.layoutManager.start();

  // SettingsPromiseManager wraps Settings DB methods into promises.
  this.settingsPromiseManager = new SettingsPromiseManager();

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
  this.upperCaseStateManager.start();

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

  this.upperCaseStateManager.stop();
  this.upperCaseStateManager = null;
};

KeyboardApp.prototype.getMenuContainer = function() {
  // This is equal to IMERender.menu.
  return document.getElementById(this.ACCENT_CHAR_MENU_ELEMENT_ID);
};

KeyboardApp.prototype.getContainer = function() {
  // This is equal to IMERender.ime.
  return document.getElementById(this.CONATINER_ELEMENT_ID);
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

// XXX: this should move to InputMethodGlue after
// renderKeyboard() is no longer a global function.
KeyboardApp.prototype.setForcedModifiedLayout = function(layoutName) {
  this.layoutManager.updateForcedModifiedLayout(layoutName);

  window.renderKeyboard();
};

// XXX: this should move to InputMethodGlue after
// renderKeyboard() is no longer a global function.
KeyboardApp.prototype.setLayoutPage = function setLayoutPage(page) {
  if (page === this.layoutManager.currentLayoutPage) {
    return;
  }

  this.layoutManager.updateLayoutPage(page);
  window.renderKeyboard();

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

exports.KeyboardApp = KeyboardApp;

})(window);
