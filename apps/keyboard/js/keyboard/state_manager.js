'use strict';

/* global Promise */

(function(exports) {

var StateManager = function(app) {
  this.app = app;

  this._started = false;

  // action ID is an incremental ID that will abort the steps for us
  // if there is a new incoming action.
  this._actionId = 0;

  // A promise queue that will prevent anything that shouldn't run parallel
  // runs parallel.
  this._queue = null;
  this._isActive = undefined;
  this._layoutName = undefined;
};

StateManager.prototype.start = function() {
  this.app.console.log('StateManager.start()');

  if (this._started) {
    throw new Error('StateManager: Should not be start()\'ed twice.');
  }
  this._started = true;

  // Start with inactive state.
  this._isActive = false;
  this._queue = Promise.resolve();

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
    var actionIdCheck = this._getNewActionIdFunction();
    this._queue = this._queue
      .then(this._preloadLayout.bind(this))
      .then(actionIdCheck)
      .then(this.app.l10nLoader.load.bind(this.app.l10nLoader))
      // ... make sure error is not silently ignored and the queue is always
      // set to a resolved promise.
      .catch(function(e) { (e !== undefined) && console.error(e); });
  }

  this._updateActiveState(active);
};

StateManager.prototype.stop = function() {
  this.app.console.log('StateManager.stop()');

  if (!this._started) {
    throw new Error('StateManager: Was not start()\'ed but stop() is called.');
  }
  this._started = false;

  this._actionId = 0;
  this._queue = null;

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

StateManager.prototype._getNewActionIdFunction = function() {
  this._actionId++;
  var id = this._actionId;
  this.app.console.log('StateManager._getNewActionIdFunction()',
    this._actionId);

  // This function should be run in between of all functions we want to run
  // in the promise chain. It will return a reject promise if the id is not
  // match, so we can everything queued afterwards.
  return function __actionIdCheck() {
    this.app.console.log('StateManager.__actionIdCheck', id, this._actionId);
    if (id !== this._actionId) {
      return Promise.reject(
        'StateManager: The current action ID does not match. ' +
        'Expected: ' + id + ', current: ' + this._actionId);
    }
  }.bind(this);
};

StateManager.prototype._updateActiveState = function(active) {
  this.app.console.log('StateManager._updateActiveState()', active);
  var actionIdCheck;

  if (active) {
    this.app.console.time('activate');
    actionIdCheck = this._getNewActionIdFunction();

    // Perform the following async actions with a promise chain.
    this._queue = this._queue
      .then(actionIdCheck)
      .then(function() {
        // Make sure we are working in parallel,
        // since eventually IMEngine will be switched.
        this.app.inputMethodManager.updateInputContextData();

        // Before switching away, clean up anything pending in the previous
        // active layout.
        // We however don't clear active target here because the user might
        // want to input continuously between two layouts.
        this.app.candidatePanelManager.hideFullPanel();
        this.app.candidatePanelManager.updateCandidates([]);
      }.bind(this))
      // Switch the layout,
      .then(actionIdCheck)
      .then(this.app.layoutManager.switchCurrentLayout.bind(
        this.app.layoutManager, this._layoutName))
      // ... switch the IMEngine,
      .then(actionIdCheck)
      .then(this._switchCurrentIMEngine.bind(this))
      // ... load the layout rendering,
      .then(actionIdCheck)
      .then(this._updateLayoutRendering.bind(this))
      // ... load l10n.js (if it's not loaded yet.)
      .then(actionIdCheck)
      .then(this.app.l10nLoader.load.bind(this.app.l10nLoader))
      // ... make sure error is not silently ignored.
      .catch(function(e) { (e !== undefined) && console.error(e); });
  } else {
    // Do nothing if we are already hidden.
    if (active === this._isActive) {
      return;
    }

    actionIdCheck = this._getNewActionIdFunction();

    // Perform the following async actions with a promise chain.
    this._queue = this._queue
      .then(actionIdCheck)
      .then(function() {
        // Finish off anything pending & cancel everything
        this.app.candidatePanelManager.hideFullPanel();
        this.app.candidatePanelManager.updateCandidates([]);
        this.app.targetHandlersManager.activeTargetsManager.clearAllTargets();
      }.bind(this))
      // ... switch the IMEngine to default,
      .then(actionIdCheck)
      .then(this.app.inputMethodManager.switchCurrentIMEngine.bind(
        this.app.inputMethodManager, 'default'))
      // ... set the keyboard.current value,
      // (everything.me uses this setting to improve searches,
      //  but they really shouldn't.)
      .then(this.app.settingsPromiseManager.set.bind(
        this.app.settingsPromiseManager, { 'keyboard.current': undefined }))
      // ... make sure error is not silently ignored.
      .catch(function(e) { (e !== undefined) && console.error(e); });
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

  var page = this.app.layoutManager.currentPage;
  var imEngineName = page.imEngine || 'default';

  this.app.upperCaseStateManager.reset();
  this.app.candidatePanelManager.reset();

  var p = this.app.inputMethodManager.switchCurrentIMEngine(imEngineName);

  return p;
};

StateManager.prototype._updateLayoutRendering = function() {
  this.app.console.log('StateManager._updateLayoutRendering()');

  return this.app.layoutRenderingManager.updateLayoutRendering()
    // everything.me uses this setting to improve searches,
    // but they really shouldn't.
    .then(function() {
      return this.app.settingsPromiseManager.set(
        { 'keyboard.current': this.app.layoutManager.currentPage.layoutName })
        .catch(function(e) {
          console.error('StateManager: Failed to set keyboard.current', e);
        });
    }.bind(this));
};

exports.StateManager = StateManager;

})(window);
