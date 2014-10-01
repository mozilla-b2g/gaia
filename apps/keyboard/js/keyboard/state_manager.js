'use strict';

/* global Promise */

(function(exports) {

var StateManager = function(app) {
  this.app = app;
  this._isActive = undefined;
  this._layoutName = undefined;
};

StateManager.prototype.start = function() {
  this.app.console.log('StateManager.start()');
  // Start with inactive state.
  this._isActive = false;

  window.addEventListener('hashchange', this);
  window.addEventListener('visibilitychange', this);
  navigator.mozInputMethod.addEventListener('inputcontextchange', this);

  this.app.setInputContext(navigator.mozInputMethod.inputcontext);
  this._layoutName = window.location.hash.substr(1);

  var active = (!document.hidden && !!this.app.inputContext);

  // If the app was started inactive, we should start the loading process of
  // what we would need.
  // l10n.js gets loaded here too, eventually, since there is nothing left
  // in the critical path.
  if (!active) {
    this._preloadLayout().then(
      this.app.l10nLoader.load.bind(this.app.l10nLoader));
  }

  this._updateActiveState(active);
};

StateManager.prototype.stop = function() {
  this.app.console.log('StateManager.stop()');
  window.removeEventListener('hashchange', this);
  window.removeEventListener('visibilitychange', this);
  navigator.mozInputMethod.removeEventListener('inputcontextchange', this);

  this._isActive = undefined;
  this._layoutName = undefined;
};

StateManager.prototype.handleEvent = function(evt) {
  var active = (!document.hidden &&
                !!navigator.mozInputMethod.inputcontext);
  this.app.console.info('StateManager.handleEvent()', evt, active);

  switch (evt.type) {
    case 'hashchange':
      this._layoutName = window.location.hash.substr(1);
      if (!active) {
        this._preloadLayout();
      }

      break;

    case 'visibilitychange':
      break;

    case 'inputcontextchange':
      this.app.setInputContext(navigator.mozInputMethod.inputcontext);

      break;
  }

  this._updateActiveState(active);
};

StateManager.prototype._updateActiveState = function(active) {
  this.app.console.log('StateManager._updateActiveState()', active);
  if (active) {
    this.app.console.time('activate');
    // Make sure we are working in parallel,
    // since eventually IMEngine will be switched.
    this.app.inputMethodManager.updateInputContextData();

    // Before switching away, clean up anything pending in the previous
    // active layout.
    // We however don't clear active target here because the user might
    // want to input continuously between two layouts.
    this.app.candidatePanelManager.hideFullPanel();
    this.app.candidatePanelManager.updateCandidates([]);

    // Perform the following async actions with a promise chain.
    // Switch the layout,
    this.app.layoutManager.switchCurrentLayout(this._layoutName)
      // ... switch the IMEngine,
      .then(this._switchCurrentIMEngine.bind(this))
      // ... load the layout rendering,
      .then(this._updateLayoutRendering.bind(this))
      // ... load l10n.js (if it's not loaded yet.)
      .then(this.app.l10nLoader.load.bind(this.app.l10nLoader))
      // ... make sure error is not silently ignored.
      .catch(function(e) { (e !== undefined) && console.error(e); });
  } else {
    // Do nothing if we are already hidden.
    if (active === this._isActive) {
      return;
    }

    // everything.me uses this setting to improve searches,
    // but they really shouldn't.
    this.app.settingsPromiseManager.set({
      'keyboard.current': undefined
    });

    // Finish off anything pending & cancel everything
    this.app.candidatePanelManager.hideFullPanel();
    this.app.candidatePanelManager.updateCandidates([]);
    this.app.targetHandlersManager.activeTargetsManager.clearAllTargets();
    var p = this.app.inputMethodManager.switchCurrentIMEngine('default');
    // ... make sure error is not silently ignored.
    p.catch(function(e) { (e !== undefined) && console.error(e); });
  }

  this._isActive = active;
};

StateManager.prototype._preloadLayout = function() {
  this.app.console.log('StateManager._preloadLayout()');
  var layoutLoader = this.app.layoutManager.loader;
  var p = layoutLoader.getLayoutAsync(this._layoutName).then(function(layout) {
    var imEngineName = layout.imEngine;
    var imEngineLoader = this.app.inputMethodManager.loader;
    // Ask the loader to start loading IMEngine
    if (imEngineName) {
      var p = imEngineLoader.getInputMethodAsync(imEngineName);
      return p;
    }
  }.bind(this)).catch(function(e) {
    if (e !== undefined) {
      console.error(e);
    }
  });

  return p;
};

StateManager.prototype._switchCurrentIMEngine = function() {
  this.app.console.log('StateManager._switchCurrentIMEngine()');

  // Only start loading the IMEngine if we remain active.
  if (!this._isActive) {
    return Promise.reject();
  }

  var page = this.app.layoutManager.currentPage;
  var imEngineName = page.imEngine || 'default';

  this.app.upperCaseStateManager.reset();
  this.app.candidatePanelManager.reset();

  var p = this.app.inputMethodManager.switchCurrentIMEngine(imEngineName);

  return p;
};

StateManager.prototype._updateLayoutRendering = function() {
  this.app.console.log('StateManager._updateLayoutRendering()');
  if (!this._isActive) {
    return Promise.reject();
  }

  // everything.me uses this setting to improve searches,
  // but they really shouldn't.
  this.app.settingsPromiseManager.set({
    'keyboard.current': this.app.layoutManager.currentPage.layoutName
  });

  var p = this.app.layoutRenderingManager.updateLayoutRendering();

  return p;
};

exports.StateManager = StateManager;

})(window);
