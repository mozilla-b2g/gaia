'use strict';

/* global KeyboardConsole, InputMethodManager, LayoutManager,
          SettingsPromiseManager, L10nLoader, TargetHandlersManager,
          FeedbackManager, VisualHighlightManager, CandidatePanelManager,
          UpperCaseStateManager, LayoutRenderingManager, IMERender,
          StateManager, HandwritingPadsManager */

(function(exports) {

var KeyboardApp = function() {
  this.console = null;
  this.inputMethodManager = null;
  this.layoutManager = null;
  this.settingsPromiseManager = null;
  this.l10nLoader = null;
  this.targetHandlersManager = null;
  this.handwritingPadsManager = null;
  this.feedbackManager = null;
  this.visualHighlightManager = null;
  this.candidatePanelManager = null;
  this.upperCaseStateManager = null;
  this.layoutRenderingManager = null;
  this.stateManager = null;

  this.inputContext = null;
};

KeyboardApp.prototype.CONATINER_ELEMENT_ID = 'keyboard';

KeyboardApp.prototype.start = function() {
  this._startComponents();
};

KeyboardApp.prototype._startComponents = function() {
  // A timer for time measurement
  this.console = new KeyboardConsole();
  this.console.start();
  this.console.log('KeyboardApp._startComponents()');
  this.console.trace();
  this.console.time('KeyboardApp._startComponents()');

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

  // handwritingPadsManager handles handwritintg pad
  // targets when they are being interacted.
  this.handwritingPadsManager = new HandwritingPadsManager(this);
  this.handwritingPadsManager.start();

  this.feedbackManager = new FeedbackManager(this);
  this.feedbackManager.start();

  this.visualHighlightManager = new VisualHighlightManager(this);
  this.visualHighlightManager.start();

  var renderingManager = this.layoutRenderingManager =
    new LayoutRenderingManager(this);
  renderingManager.start();

  this.upperCaseStateManager = new UpperCaseStateManager();
  this.upperCaseStateManager.onstatechange =
    renderingManager.updateUpperCaseRendering.bind(renderingManager);
  this.upperCaseStateManager.start();

  this.candidatePanelManager = new CandidatePanelManager(this);
  this.candidatePanelManager.oncandidateschange =
    renderingManager.updateCandidatesRendering.bind(renderingManager);
  this.candidatePanelManager.start();

  // Initialize the rendering module
  IMERender.init(this.layoutRenderingManager);

  this.stateManager = new StateManager(this);
  this.stateManager.start();

  this.console.timeEnd('KeyboardApp._startComponents()');
};

KeyboardApp.prototype.stop = function() {
  this.console.log('KeyboardApp.stop()');
  this._stopComponents();

  this.inputContext = null;
};

KeyboardApp.prototype._stopComponents = function() {
  this.console = null;

  this.inputMethodManager = null;

  this.layoutManager = null;

  this.settingsPromiseManager = null;

  this.l10nLoader = null;

  this.targetHandlersManager.stop();
  this.targetHandlersManager = null;

  this.handwritingPadsManager.stop();
  this.handwritingPadsManager = null;

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

KeyboardApp.prototype.getContainer = function() {
  // This is equal to IMERender.ime.
  return document.getElementById(this.CONATINER_ELEMENT_ID);
};

KeyboardApp.prototype.setInputContext = function(inputContext) {
  this.console.log('KeyboardApp.setInputContext()', inputContext);
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
    case 'search':
      // Don't overwrite type

      break;

    // default fallback and textual types
    case 'password':
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
  this.console.log('KeyboardApp.setLayoutPage()', page);
  this.layoutManager.updateLayoutPage(page);
  this.layoutRenderingManager.updateLayoutRendering();

  var engine = this.inputMethodManager.currentIMEngine;
  if (typeof engine.setLayoutPage === 'function') {
    engine.setLayoutPage(this.layoutManager.currentPageIndex);
  }
};

// XXX: this should move to InputMethodGlue after
// IMERender() is no longer a global class.
KeyboardApp.prototype.getNumberOfCandidatesPerRow = function() {
  return IMERender.getNumberOfCandidatesPerRow();
};

exports.KeyboardApp = KeyboardApp;

})(window);
