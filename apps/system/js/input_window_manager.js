'use strict';

/* global applications, InputWindow, SettingsListener, KeyboardManager,
   Service, Promise */

(function(exports) {

  /**
   * For some flow diagrams related to input management, please refer to
   * https://wiki.mozilla.org/Gaia/System/InputManagement#Flow_Diagrams .
   *
   * InputWindowManager manages all the InputWindow-related operations. It shows
   * /hides/preloads/kills InputWindows for KeyboardManager as specified by
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
  var InputWindowManager = function() {
    this.isOutOfProcessEnabled = false;
    this._totalMemory = 0;

    this._getMemory();

    this._oopSettingCallbackBind = null;

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

  InputWindowManager.prototype.name = 'InputWindowManager';

  InputWindowManager.prototype._debug = function iwm__debug(msg) {
    if (this._onDebug) {
      console.log('[InputWindowManager] ' + msg);
    }
  };

  InputWindowManager.prototype.start = function iwm_start() {
    // 3rd-party keyboard apps must be run out-of-process.
    this._oopSettingCallbackBind = this._oopSettingCallback.bind(this);
    SettingsListener.observe('keyboard.3rd-party-app.enabled', true,
      this._oopSettingCallbackBind);

    window.addEventListener('input-appopened', this);
    window.addEventListener('input-appclosed', this);
    window.addEventListener('input-apprequestclose', this);
    window.addEventListener('input-appready', this);
    window.addEventListener('input-appheightchanged', this);
    window.addEventListener('input-appterminated', this);
    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    // Also in Bug 856692 we realise that we need to close the keyboard
    // when an inline activity goes away.
    window.addEventListener('activityrequesting', this);
    window.addEventListener('activityopening', this);
    window.addEventListener('activityclosing', this);
    window.addEventListener('attentionrequestopen', this);
    window.addEventListener('attentionrecovering', this);
    window.addEventListener('attentionopening', this);
    window.addEventListener('attentionopened', this);
    window.addEventListener('attentionclosing', this);
    window.addEventListener('attentionclosed', this);
    window.addEventListener('notification-clicked', this);
    window.addEventListener('applicationsetupdialogshow', this);
    window.addEventListener('sheets-gesture-begin', this);
    window.addEventListener('cardviewbeforeshow', this);
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('mozmemorypressure', this);
    Service.registerState('getHeight', this);
    Service.registerState('isOutOfProcessEnabled', this);
    Service.register('hideInputWindow', this);
    Service.register('hideInputWindowImmediately', this);
  };

  InputWindowManager.prototype.stop = function iwm_stop() {
    SettingsListener.unobserve('keyboard.3rd-party-app.enabled',
      this._oopSettingCallbackBind);
    this._oopSettingCallbackBind = null;

    window.removeEventListener('input-appopened', this);
    window.removeEventListener('input-appclosed', this);
    window.removeEventListener('input-apprequestclose', this);
    window.removeEventListener('input-appready', this);
    window.removeEventListener('input-appheightchanged', this);
    window.removeEventListener('input-appterminated', this);
    window.removeEventListener('activityrequesting', this);
    window.removeEventListener('activityopening', this);
    window.removeEventListener('activityclosing', this);
    window.removeEventListener('attentionrequestopen', this);
    window.removeEventListener('attentionrecovering', this);
    window.removeEventListener('attentionopening', this);
    window.removeEventListener('attentionopened', this);
    window.removeEventListener('attentionclosing', this);
    window.removeEventListener('attentionclosed', this);
    window.removeEventListener('notification-clicked', this);
    window.removeEventListener('applicationsetupdialogshow', this);
    window.removeEventListener('sheets-gesture-begin', this);
    window.removeEventListener('cardviewbeforeshow', this);
    window.removeEventListener('lockscreen-appopened', this);
    window.removeEventListener('mozmemorypressure', this);
  };

  InputWindowManager.prototype.handleEvent = function iwm_handleEvent(evt) {
    var inputWindow;
    var manifestURL;
    if (evt.type.startsWith('input-app')) {
      inputWindow = evt.detail;
    }
    this._debug('handleEvent: ' + evt.type);
    switch (evt.type) {
      case 'input-appopened':
      case 'input-appheightchanged':
        // for opened/ready/heightchanged events, make sure the originating
        // InputWindow is the displayed one
        if (inputWindow === this._currentWindow) {
          this._kbPublish('keyboardchange', inputWindow.height);
        }
        break;
      case 'input-appready':
        if (inputWindow === this._currentWindow) {
          KeyboardManager._onKeyboardReady();
        }
        // don't bother close the last window if it's been killed
        // (happens when last window was replaced due to OOM-kill)
        if (this._lastWindow) {
          if (!this._lastWindow.isDead()) {
            this._lastWindow.close('immediate');
          }
          this._lastWindow = null;
        }
        break;
      case 'input-appclosed':
        // bug 1112416: when blur and focus successively fire, there is a racing
        // where we may close an inputWindow while its input app is still busy
        // to become ready. If we were to set that inputWindow as inactive
        // input, it would abort that input app's becoming-ready progress and
        // we'll get stuck. Thus, do not really set the inactiveness when we
        // know the inputWindow is waiting to be ready.
        this._debug('inputWindow pendingReady: ' + inputWindow._pendingReady);

        if (inputWindow._pendingReady) {
          return;
        }

        inputWindow._setAsActiveInput(false);
        if (!this._currentWindow) {
          this._kbPublish('keyboardhidden', undefined);
        }
        break;
      case 'input-appterminated':
        // input app is OOM-killed...
        manifestURL = inputWindow.manifestURL;

        // We always destroy the reference of all current InputWindows for that
        // input app.
        this._removeInputApp(manifestURL);

        // if the showing window is the killed window,
        // we need to notify KeyboardManager to relaunch something.
        if (this._currentWindow &&
            this._currentWindow.manifestURL === manifestURL) {
          KeyboardManager._onKeyboardKilled(manifestURL);
        }
        break;
      case 'activityrequesting':
      case 'activityopening':
      case 'activityclosing':
      case 'attentionrequestopen':
      case 'attentionrecovering':
      case 'attentionopening':
      case 'attentionclosing':
      case 'attentionopened':
      case 'attentionclosed':
      case 'notification-clicked':
      case 'applicationsetupdialogshow':
        this.hideInputWindowImmediately();
        break;
      case 'lockscreen-appopened':
      case 'sheets-gesture-begin':
      case 'cardviewbeforeshow':
        if (this._hasActiveInputApp()) {
          // Instead of hideInputWindow(), we should removeFocus() here.
          // (and removing the focus cause Gecko to ask us to hideInputWindow())

          // We need to blur the app to prevent the keyboard from refocusing
          // right away.
          // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1138977
          var app = Service.query('getTopMostWindow');
          app && app.blur();
          navigator.mozInputMethod.removeFocus();
        }
        break;
      case 'mozmemorypressure':
        // Memory pressure event. If input apps are loaded but not active,
        // get rid of them.
        // We only do that when we don't run input apps OOP.
        this._debug('mozmemorypressure event');
        if (!this.isOutOfProcessEnabled && !this._hasActiveInputApp()) {
          this.getLoadedManifestURLs().forEach(manifestURL => {
            this._removeInputApp(manifestURL);
          });
          this._debug('mozmemorypressure event; keyboards removed');
        }
        break;
    }
  };

  InputWindowManager.prototype._getMemory = function iwm_getMemory() {
    Service.request('getDeviceMemory').then((mem) => {
      this._totalMemory = mem;
    });
  };

  InputWindowManager.prototype._oopSettingCallback =
  function iwm_oopSettingCallback(value) {
    this.isOutOfProcessEnabled = value;
  };

  // returns true if the currentWindow is being removed
  // we can't use Array.prototype.every() or some() because we'll anyway have
  // to loop through the whole array
  InputWindowManager.prototype._onInputLayoutsRemoved =
  function iwm_onInputLayoutsRemoved(manifestURLs) {
    var currentWindowRemoved = false;

    manifestURLs.forEach(manifestURL => {
      if (this._currentWindow &&
          this._currentWindow.manifestURL === manifestURL) {
        this.hideInputWindow();
        currentWindowRemoved = true;
      }
      this._removeInputApp(manifestURL);
    });

    return currentWindowRemoved;
  };

  InputWindowManager.prototype._removeInputApp =
  function iwm_removeInputApp(manifestURL) {
    if (!this._inputWindows[manifestURL]) {
      return;
    }

    for (var pathInitial in this._inputWindows[manifestURL]) {
      this._inputWindows[manifestURL][pathInitial].destroy();
      delete this._inputWindows[manifestURL][pathInitial];
    }

    delete this._inputWindows[manifestURL];
  };

  InputWindowManager.prototype.getHeight = function iwm_getHeight() {
    return this._currentWindow ? this._currentWindow.height : 0;
  };

  InputWindowManager.prototype._hasActiveInputApp =
    function iwm_hasActiveInputApp() {
      return !!this._currentWindow;
  };

  // Extract some re-usable configs from the layout
  // pathInitial is |path| without the hash part
  // hash is the hash part of the |path|, including #, may be empty string
  // XXX: this should be done at KeyboardManager or KeyboardHelper
  // when we normalize the layouts there
  InputWindowManager.prototype._extractLayoutConfigs =
  function iwm_extractLayoutConfigs(layout){
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

  InputWindowManager.prototype._makeInputWindow =
  function iwm_makeInputWindow(configs){
    var isCertifiedApp = (configs.manifest.type === 'certified');

    if (0 === this._totalMemory){
      console.warn('InputWindowManager: totalMemory is 0');
    }

    // oop is always enabled for non-certified app,
    // and optionally enabled to certified apps if
    // available memory is more than 512MB.
    if (this.isOutOfProcessEnabled &&
        (!isCertifiedApp || this._totalMemory >= 512)) {
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

  InputWindowManager.prototype.preloadInputWindow =
  function iwm_preloadInputWindow(layout) {
    var configs = this._extractLayoutConfigs(layout);
    configs.stayBackground = true;
    this._makeInputWindow(configs);
  };

  InputWindowManager.prototype.showInputWindow =
  function iwm_showInputWindow(layout) {
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

  InputWindowManager.prototype.HIDE_INPUT_WINDOW_TIMEOUT = 200;

  InputWindowManager.prototype.hideInputWindow =
  function iwm_hideInputWindow() {
    if (!this._currentWindow){
      return;
    }

    var windowToClose = this._currentWindow;
    this._currentWindow = null;

    // If the focus is regain within a short time, we would not want to resize
    // the forground app viewport, which creates suboptimal experiences
    // (see bug 1176926 and bug 1176771).
    //
    // Previously we tried to remove this timeout by delay the blurring message
    // with a next tick from forms.js (bug 1057898), but this is suboptimal
    // for the following reasons: While the focus is regain before next tick
    // when switching between two inputs (see the case in bug 1057898),
    // That will not work when the focus is removed by tapping a button and
    // regain at the click event of the button (which is the case of Message app
    // composer). In this case, the focus is removed at mousedown/touchstart
    // event; next tick of the blur would happen *before* touchend and click
    // events of the button.
    //
    // This timeout also happen to absorb the event order differences between
    // oop/inproc environment (see bug 1171950 comment 2).
    return new Promise(function(resolve) {
        setTimeout(resolve, this.HIDE_INPUT_WINDOW_TIMEOUT);
      }.bind(this))
      .then(function iwm_publishKeyboardHideEventSync() {
        // We should not close ourselves if we are being set back to become
        // the currentWindow again, which implies we have already regain the
        // focus.
        if (this._currentWindow === windowToClose) {
          return;
        }

        // Publish an keyboardhide event that would cause the
        // foreground app to resize.
        // The promise will resolve when all the promises passed to waitUntil()
        // have resolved.
        return this._kbPublish('keyboardhide', undefined);
      }.bind(this))
      .then(function iwm_hideInputWindowSync() {
        // We should not close ourselves if we are being set back to become
        // the currentWindow again.
        if (this._currentWindow === windowToClose) {
          return;
        }

        windowToClose.close();
      }.bind(this))
      .catch((e) => { console.error(e); });
  };

  InputWindowManager.prototype.hideInputWindowImmediately =
  function iwm_hideInputWindowImmediately() {
    if (!this._currentWindow){
      return;
    }

    this._kbPublish('keyboardhide', undefined);

    var windowToClose = this._currentWindow;
    this._currentWindow = null;
    windowToClose.close('immediate');
  };

  InputWindowManager.prototype.getLoadedManifestURLs =
  function iwm_getLoadedManifestURLs() {
    return Object.keys(this._inputWindows);
  };

  // As per bug 952441, we want to use a special way to broadcast system-wide
  // keyboard-related events
  // This function returns a promise and it will only resolves when all
  // promises passed into evt.detail.waitUntil() is resolved.
  InputWindowManager.prototype._kbPublish =
  function iwm_kbPublish(type, height) {
    var chainedPromise = Promise.resolve();
    var returned = false;

    var eventInitDict = {
      bubbles: true,
      cancelable: true,
      detail: {
        height: height,
        waitUntil: function(p) {
          // Need an extra protection here since waitUntil will be an no-op
          // when chainedPromise is already returned.
          if (returned) {
            throw new Error('InputWindowManager: You must call waitUntil()' +
              ' within the event handling loop.');
          }

          // No point to put it into the queue if it's not a then-able.
          if (!p || typeof p.then !== 'function') {
            return;
          }

          chainedPromise = chainedPromise
            .then(function() { return p; })
            .catch((e) => { console.error(e); });
        }
      }
    };

    // We dispatch the events at the body level so we are able to intercept
    // them and prevent page resizing where desired.
    var evt = new CustomEvent(type, eventInitDict);
    document.body.dispatchEvent(evt);

    returned = true;
    return chainedPromise;
  };

  exports.InputWindowManager = InputWindowManager;

})(window);
