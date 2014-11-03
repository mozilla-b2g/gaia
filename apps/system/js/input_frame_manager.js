'use strict';

/* global applications, InputWindow */

(function(exports) {

  /**
   * InputFrameManager manages all the InputWindow-related operations. It shows/
   * hides/preloads/kills InputWindows for KeyboardManager as specified by
   * keyboard layouts, and internally book-keeps those InputWindows and the
   * currently displayed one.
   *
   * An input app may specify different layouts. A layout passed from
   * KeyboardManager may specify its manifestURL (mapping to the input app), and
   * its path (i.e. the Input Window frame src).
   *
   * The path is like: /index.html#en. Different layouts of the same input app
   * may differ in only the hash part of the path, or may differ in the whole
   * path.
   *
   * Currently, when we are to display a keyboard layout, we may reuse
   * an InputWindow of the same (manifestURL, path_without_hash) of that layout,
   * and only replaces the hash part of the src of that InputWindow frame.
   * To say it another way, We have different InputWindows for different
   * (manifestURL, path_without_hash) of different layouts.
   *
   *
   * There are several scenarios to be considered when we show a layout:
   *
   * - There is currently no displayed InputWindow:
   *   We show the InputWindow for that layout, with animation.
   *
   * - There is currently a displayed InputWindow, and we can reuse it for that
   *  layout:
   *   InputWindow will know to change its hash only, and does not re-animate
   *   for showing.
   *
   * - There is currently a displayed InputWindow, and it is closing, and we'll
   *  re-use it:
   *   InputWindow will know to show itself without animation (and may change)
   *   its frame src hash)
   *
   * - There is currently a displayed InputWindow, and we can't re-use it:
   *   We show the new InputWindow without animation, and hide the old
   *   InputWindow, without animation, when the new InputWIndow is ready.
   */
  var InputFrameManager = function(keyboardManager) {
    this._keyboardManager = keyboardManager;

    /*
     * The collection of loaded InputWindows.
     * This is a two-level map, from input app manifestURL to path_without_hash
     * to an InputWindow. By this structure we fulfill the need to reuse
     * an InputWindow for the same (manifestURL, path_without_hash) of layouts
     * as said above.
     *
     * {
     *   'keyboard.gaiamobile.org/manifest.webapp' : {
     *     '/index.html': inputWindow1,
     *     '/complex.html': inputWindow2,
     *   },
     *   'demo-keyboard.gaiamobile.org/manifest.webapp' : {
     *     '/ime1.html': inputWindow3,
     *     '/ime2.html': inputWindow4,
     *   }
     * }
     *
     */
    this._inputWindows = {};

    // The InputWindow that's being displayed
    this._currentWindow = null;

    // The switched-out InputWindow that we need to deactivate when the
    // switched-in InputWindow finishes activation.
    this._lastWindow = null;

    this._onDebug = false;
  };

  InputFrameManager.prototype._debug = function ifm__debug(msg) {
    if (this._onDebug) {
      console.log('[InputFrameManager] ' + msg);
    }
  };

  InputFrameManager.prototype.start = function ifm_start() {
    window.addEventListener('input-appopened', this);
    window.addEventListener('input-appclosing', this);
    window.addEventListener('input-appclosed', this);
    window.addEventListener('input-appready', this);
    window.addEventListener('input-appheightchanged', this);
    window.addEventListener('input-appterminated', this);
  };

  InputFrameManager.prototype.stop = function ifm_stop() {
    window.removeEventListener('input-appopened', this);
    window.removeEventListener('input-appclosing', this);
    window.removeEventListener('input-appclosed', this);
    window.removeEventListener('input-appready', this);
    window.removeEventListener('input-appheightchanged', this);
    window.removeEventListener('input-appterminated', this);
  };

  InputFrameManager.prototype.handleEvent = function ifm_handleEvent(evt) {
    var inputWindow = evt.detail;
    switch (evt.type) {
      case 'input-appopened':
      case 'input-appheightchanged':
        // for opened/ready/heightchanged events, make sure the originating
        // InputWindow is the displayed one
        if (inputWindow === this._currentWindow){
          this._kbPublish('keyboardchange', inputWindow.height);
        }
        break;
      case 'input-appready':
        if (inputWindow === this._currentWindow){
          // XXX: keyboard manager should listen to event
          this._keyboardManager._onKeyboardReady();
        }
        if (this._lastWindow){
          this._lastWindow.close('immediate');
          this._lastWindow = null;
        }
        break;
      case 'input-appclosing':
        // for closing/closed events, make sure we don't have any displayed
        // InputWindow, to send out this system-wide event.
        if (!this._currentWindow){
          this._kbPublish('keyboardhide', undefined);
        }
        break;
      case 'input-appclosed':
        inputWindow._setAsActiveInput(false);
        if (!this._currentWindow){
          this._kbPublish('keyboardhidden', undefined);
        }
        break;
      case 'input-appterminated':
        this._keyboardManager.removeKeyboard(inputWindow.manifestURL, true);
        break;
    }
  };

  // XXX: change it to removeInputApp
  InputFrameManager.prototype.removeKeyboard =
  function ifm_removeKeyboard(kbManifestURL) {
    if (!this._inputWindows[kbManifestURL]) {
      return;
    }

    for (var pathInitial in this._inputWindows[kbManifestURL]) {
      this._inputWindows[kbManifestURL][pathInitial].destroy();
      delete this._inputWindows[kbManifestURL][pathInitial];
    }

    delete this._inputWindows[kbManifestURL];
  };

  InputFrameManager.prototype.getHeight = function ifm_getHeight() {
    return this._currentWindow ? this._currentWindow.height : undefined;
  };

  // XXX: change it to hasActiveInputApp
  InputFrameManager.prototype.hasActiveKeyboard =
    function ifm_hasActiveKeyboard() {
      return !!this._currentWindow;
  };

  // Extract some re-usable configs from the layout
  // pathInitial is |path| without the hash part
  // hash is the hash part of the |path|, including #, may be empty string
  // XXX: this should be done at KeyboardManager or KeyboardHelper
  // when we normalize the layouts there
  InputFrameManager.prototype._extractLayoutConfigs =
  function ifm_extractLayoutConfigs(layout){
    var manifestURL = layout.manifestURL;
    var path = layout.path;
    var id = layout.id;
    var origin = layout.origin;

    var pathInitial;
    var hash;
    if (path.indexOf('#') === -1) {
      pathInitial = path;
      hash = '';
    } else {
      pathInitial = path.substring(0, path.indexOf('#'));
      hash = path.substring(path.indexOf('#'));
    }

    var app = applications.getByManifestURL(manifestURL);

    return {
      manifest: app.manifest,
      manifestURL: manifestURL,
      path: path,
      id: id,
      pathInitial: pathInitial,
      hash: hash,
      origin: origin
    };
  };

  InputFrameManager.prototype._makeInputWindow =
  function ifm_makeInputWindow(configs){
    var isCertifiedApp = (configs.manifest.type === 'certified');

    // oop is always enabled for non-certified app,
    // and optionally enabled to certified apps if
    // available memory is more than 512MB.
    if (this._keyboardManager.isOutOfProcessEnabled &&
        (!isCertifiedApp || this._keyboardManager.totalMemory >= 512)) {
      this._debug('=== Enable keyboard: ' +
                  configs.origin + ' run as OOP ===');
      configs.oop = true;
    } else {
      configs.oop = false;
    }

    var inputWindow = new InputWindow(configs);

    this._inputWindows[configs.manifestURL] =
      this._inputWindows[configs.manifestURL] || {};

    this._inputWindows[configs.manifestURL][configs.pathInitial] =
      inputWindow;

    return inputWindow;
  };

  InputFrameManager.prototype.preloadInputWindow =
  function ifm_preloadInputWindow(layout) {
    var configs = this._extractLayoutConfigs(layout);
    configs.stayBackground = true;
    this._makeInputWindow(configs);
  };

  InputFrameManager.prototype.showInputWindow =
  function ifm_showInputWindow(layout) {
    var configs = this._extractLayoutConfigs(layout);

    // see if we can reuse an InputWindow...
    var nextWindow =
      this._inputWindows[configs.manifestURL] ?
      this._inputWindows[configs.manifestURL][configs.pathInitial] :
      undefined;

    if (!nextWindow){
      // no, we can't reuse. make a new one.
      nextWindow = this._makeInputWindow(configs);
    }

    if (this._currentWindow && nextWindow !== this._currentWindow) {
      // we have some displayed InputWindow and the new window is a different IW
      // let the new one show immediately, and this._lastWindow will also be
      // closed immediately after the new one is ready
      this._lastWindow = this._currentWindow;
      configs.immediateOpen = true;
      nextWindow.open(configs);
    } else {
      // we don't have any displayed InputWindow, or the currently displayed
      // one is what we'd like to open, so just show it normally.
      nextWindow.open(configs);
    }

    this._currentWindow = nextWindow;
  };

  InputFrameManager.prototype.hideInputWindow = function ifm_hideInputWindow() {
    if (!this._currentWindow){
      return;
    }

    var windowToClose = this._currentWindow;
    this._currentWindow = null;
    windowToClose.close();
  };

  InputFrameManager.prototype.hideInputWindowImmediately =
  function ifm_hideInputWindowImmediately() {
    if (!this._currentWindow){
      return;
    }

    var windowToClose = this._currentWindow;
    this._currentWindow = null;

    // simulate anything we would do in 'closing' event
    this._kbPublish('keyboardhide', undefined);

    windowToClose.close('immediate');
  };

  InputFrameManager.prototype.getLoadedManifestURLs =
  function ifm_getLoadedManifestURLs() {
    return Object.keys(this._inputWindows);
  };

  // broadcast system-wide keyboard-related events
  InputFrameManager.prototype._kbPublish = function ifm_kbPublish(type, height){
    var eventInitDict = {
      bubbles: true,
      cancelable: true,
      detail: {
        height: height
      }
    };

    // We dispatch the events at the body level so we are able to intercept
    // them and prevent page resizing where desired.
    var evt = new CustomEvent(type, eventInitDict);
    document.body.dispatchEvent(evt);
  };

  exports.InputFrameManager = InputFrameManager;

})(window);
