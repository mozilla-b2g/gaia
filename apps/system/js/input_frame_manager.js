'use strict';

/* global InputWindow */

(function(exports) {

  /**
   * InputFrameManager manages all the iframe-related operations that
   * has to do with keyboard layouts. It receives a layout from KeyboardManager
   * and performs operations on the iframe associated with the layout, such that
   * KeyboardManager does not have to be concerned about the inner mechanisms
   * of a keyboard iframe.
   */
  var InputFrameManager = function(keyboardManager) {
    this._keyboardManager = keyboardManager;

    // The set of running keyboards.
    // This is a map from keyboard manifestURL to an object like this:
    // 'keyboard.gaiamobile.org/manifest.webapp' : {
    //   'English': anInputWindow
    // }
    this.runningLayouts = {};

    this._showedCallbacks = new WeakMap();

    this._onDebug = false;
  };

  InputFrameManager.prototype._debug = function ifm__debug(msg) {
    if (this._onDebug) {
      console.log('[InputFrameManager] ' + msg);
    }
  };

  InputFrameManager.prototype.start = function ifm_start() {

  };

  InputFrameManager.prototype.stop = function ifm_stop() {

  };

  InputFrameManager.prototype.onopened = function ifm_onopened(inputWindow) {
    if (typeof this._showedCallbacks.get(inputWindow) === 'function'){
      this._showedCallbacks.get(inputWindow).call();
    }
    inputWindow.openImmediately = false;    
  };

  InputFrameManager.prototype.onclosed = function ifm_onclosed(inputWindow) {
    if (inputWindow.isActiveKeyboard){
      this._keyboardManager._resetShowingKeyboard();
    }
  };

  InputFrameManager.prototype.onlaunched = function ifm_onlaunched(height) {
    this._keyboardManager._onKeyboardLaunched(height);
  };

  InputFrameManager.prototype.setupInputWindow =
    function ifm_setupInputWindow(layout) {
    var inputWindow = this.runningLayouts[layout.manifestURL][layout.id];
    inputWindow.setAsActiveInput(true);
  };

  InputFrameManager.prototype.resetInputWindow =
    function ifm_resetInputWindow(layout) {
    if (!layout) {
      return;
    }

    var inputWindow = this.runningLayouts[layout.manifestURL][layout.id];

    if (!inputWindow) {
      return;
    }

    inputWindow.setAsActiveInput(false);
  };

  InputFrameManager.prototype.launchInputWindow =
    function ifm_launchInputWindow(layout, keepInactive,
                                   showImmediately, showedCallback) {
    var inputWindow = null;

    if (this._isRunningLayout(layout)) {
      this._debug('this layout is running');

      inputWindow = this.runningLayouts[layout.manifestURL][layout.id];
    } else {
      // See if the layout is in a keyboard app that has been launched.
      if (this._isRunningKeyboard(layout)) {
        // Re-use the iframe by changing its src.
        inputWindow = this._getWindowFromExistingKeyboard(layout);
      }

      // Can't reuse, so create a new frame to load this new layout.
      if (!inputWindow) {
        inputWindow = this._loadKeyboardLayoutToWindow(layout, keepInactive);
      }

      inputWindow.setLayoutData(layout);

      this._insertWindowRef(layout, inputWindow);
    }

    inputWindow.openImmediately = showImmediately;
    this._showedCallbacks.set(inputWindow, showedCallback);
  };

  InputFrameManager.prototype._loadKeyboardLayoutToWindow =
    function ifm__loadKeyboardLayoutToWindow(layout, keepInactive) {
    var app = window.applications.getByManifestURL(layout.manifestURL);

    var oopEnabled = false;
    var isCertifiedApp = (app.manifest.type === 'certified');

    // oop is always enabled for non-certified app,
    // and optionally enabled to certified apps if
    // available memory is more than 512MB.
    if (this._keyboardManager.isOutOfProcessEnabled &&
        (!isCertifiedApp || this._keyboardManager.totalMemory >= 512)) {
      this._debug('=== Enable keyboard: ' + layout.origin + ' run as OOP ===');
      oopEnabled = true;
    }

    var inputWindow =
      new InputWindow(this, app, layout.path, oopEnabled);

    if (keepInactive) {
      inputWindow.iframe.setVisible(false);
    }

    return inputWindow;
  };

  InputFrameManager.prototype._getWindowFromExistingKeyboard =
    function ifm__getWindowFromExistingKeyboard(layout) {
    var inputWindow = null;
    var runningKeybaord = this.runningLayouts[layout.manifestURL];
    for (var id in runningKeybaord) {
      var oldPath = runningKeybaord[id].framePath;
      var newPath = layout.path;
      if (oldPath.substring(0, oldPath.indexOf('#')) ===
          newPath.substring(0, newPath.indexOf('#'))) {
        inputWindow = runningKeybaord[id];
        inputWindow.iframe.src = layout.origin + newPath;
        this._debug(id + ' is overwritten: ' + inputWindow.iframe.src);
        this._deleteRunningWindowRef(layout.manifestURL, id);
        break;
      }
    }
    return inputWindow;
  };

  // XXX: delegate to input_window
  InputFrameManager.prototype._destroyWindow =
    function ifm__destroyWindow(kbManifestURL, layoutID) {
    var inputWindow = this.runningLayouts[kbManifestURL][layoutID];
    inputWindow.destroy();
  };

  InputFrameManager.prototype._insertWindowRef =
    function ifm__insertWindowRef(layout, inputWindow) {
    if (!(layout.manifestURL in this.runningLayouts)) {
      this.runningLayouts[layout.manifestURL] = {};
    }

    this.runningLayouts[layout.manifestURL][layout.id] = inputWindow;
  };

  InputFrameManager.prototype._deleteRunningWindowRef =
    function ifm__deleteRunningLayoutRef(kbManifestURL, layoutID) {
    delete this.runningLayouts[kbManifestURL][layoutID];
  };

  InputFrameManager.prototype.removeKeyboard =
    function ifm_removeKeyboard(kbManifestURL) {
    for (var id in this.runningLayouts[kbManifestURL]) {
      this._destroyWindow(kbManifestURL, id);
      this._deleteRunningWindowRef(kbManifestURL, id);
    }

    delete this.runningLayouts[kbManifestURL];
  };

  InputFrameManager.prototype._isRunningKeyboard =
    function ifm__isRunningKeyboard(layout) {
    return this.runningLayouts.hasOwnProperty(layout.manifestURL);
  };

  InputFrameManager.prototype._isRunningLayout =
    function ifm__isRunningLayout(layout) {
    if (!this._isRunningKeyboard(layout)) {
      return false;
   }
    return this.runningLayouts[layout.manifestURL].hasOwnProperty(layout.id);
  };

  // XXX: maybe active layout should be kept at inputwindowmanager in the future

  InputFrameManager.prototype.getInputWindowState =
    function ifm_getInputWindowState(kbManifestURL, layoutID) {
      if (this.runningLayouts[kbManifestURL] &&
          this.runningLayouts[kbManifestURL][layoutID]){
        return this.runningLayouts[kbManifestURL][layoutID]
               .transitionController._transitionState;
      }

      return undefined;
  };

  InputFrameManager.prototype.hideInputWindow =
    function ifm_hideInputWindow(kbManifestURL, layoutID) {

    this.runningLayouts[kbManifestURL][layoutID].close();
  };

  InputFrameManager.prototype.hideInputWindowImmediately =
    function ifm_hideInputWindowImmediately(kbManifestURL, layoutID) {

    // simulate anything we would do in 'closing' event
    if ('_handle__closing' in this.runningLayouts[kbManifestURL][layoutID]) {
      this.runningLayouts[kbManifestURL][layoutID]._handle__closing();
    }
    this.runningLayouts[kbManifestURL][layoutID].close('immediate');
  };

  InputFrameManager.prototype.getOccupyingHeight =
    function ifm_getOccupyingHeight(kbManifestURL, layoutID) {
      return this.runningLayouts[kbManifestURL][layoutID].occupyingHeight;
  };

  InputFrameManager.prototype.hasActiveKeyboard =
    function ifm_hasActiveKeyboard() {
      return Object.keys(this.runningLayouts).some(
        manifestURL =>
        Object.keys(this.runningLayouts[manifestURL]).some(
          layoutID =>
          this.runningLayouts[manifestURL][layoutID].isActiveKeyboard
        )
      );
  };

  InputFrameManager.prototype.beginOpen =
    function ifm_beginOpen(kbManifestURL, layoutID, height) {
      this.runningLayouts[kbManifestURL][layoutID].beginOpen(height);
  };

  exports.InputFrameManager = InputFrameManager;

})(window);
