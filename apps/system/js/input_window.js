'use strict';

/* global AppWindow */

(function(exports) {
  /**
   * This window inherits the AppWindow, and modifies some properties
   * different from the later.
   *
   * For some flow diagrams related to input management, please refer to
   * https://wiki.mozilla.org/Gaia/System/InputManagement#Flow_Diagrams .
   *
   * @class InputWindow
   * @param {OBject} configs The configuration of the input app
   * @augments AppWindow
   */
  var InputWindow = function(configs) {
    // note: properties in configs will become this[properties]
    configs.isInputMethod = true;
    configs.name = 'InputMethods';
    configs.url = configs.origin + configs.path;

    this.splashed = true;

    // we're waiting for _ready to fire to do something further
    this._pendingReady = false;

    AppWindow.call(this, configs);

    // input keyboard transition was not supposed to have a timeout before,
    // so we give this a much higher tolerance
    this.transitionController.OPENING_TRANSITION_TIMEOUT = 5000;
    this.transitionController.CLOSING_TRANSITION_TIMEOUT = 5000;

    // ui-test need this
    this.browser.element.dataset.frameName = configs.id;
  };

  /**
   * @borrows AppWindow.prototype as InputWindow.prototype
   * @memberof InputWindow
   */
  InputWindow.prototype = Object.create(AppWindow.prototype);

  InputWindow.prototype.constructor = InputWindow;

  InputWindow.REGISTERED_EVENTS = ['mozbrowsererror'];

  // use only the transition controller as the sub component
  InputWindow.SUB_COMPONENTS = {
    'transitionController': 'AppTransitionController'
  };

  InputWindow.prototype.containerElement = document.getElementById('keyboards');

  InputWindow.prototype.view = function iw_view() {
    return `<div class="${this.CLASS_LIST}" id="${this.instanceID}"
            transition-state="closed">
              <div class="browser-container"></div>
           </div>`;
  };

  InputWindow.prototype.eventPrefix = 'input-app';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof InputWindow
   */
  InputWindow.prototype.openAnimation = 'slide-from-bottom';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof InputWindow
   */
  InputWindow.prototype.closeAnimation = 'slide-to-bottom';

  InputWindow.prototype._DEBUG = false;

  InputWindow.prototype.CLASS_LIST = 'inputWindow';
  InputWindow.prototype.CLASS_NAME = 'InputWindow';

  /**
   * Fired when the input app signals its readiness through window.resizeTo(),
   * which translates to mozbrowserresized;
   *  or
   * Fired when the input app wants to resize itself
   *
   * @event InputWindow#mozbrowserresize
   */
  InputWindow.prototype._handle_mozbrowserresize =
  function iw_handle_mozbrowserresize(evt) {

    var height = evt.detail.height;

    this._setHeight(height);

    this.publish('ready');

    // we're already opened, so publish heightchanged
    if ('opened' === this.transitionController._transitionState) {
      this.publish('heightchanged');
    }

    evt.stopPropagation();
  };

  /**
   * ready is a one-time event and is triggered when the keyboard app
   * signals its readiness through mozbrowserresize event.
   * we only listen to this one-time ready event when we're opening the
   * keyboard app through |setAsActiveInput()|; subsequent mozbrowserresize
   * events (like keyboard app wants to resize itself) would not trigger this
   * ready event.
   *
   * @event InputWindow#_ready
   */
  InputWindow.prototype._handle__ready =
  function iw_handle__ready(evt) {
    this.element.removeEventListener('_ready', this);
    this._pendingReady = false;

    this._setHeight(evt.detail.height);

    AppWindow.prototype.open.call(this,
                                  this.immediateOpen ? 'immediate' : undefined
                                 );
  };

  InputWindow.prototype._setHeight = function iw_setHeight(height) {
    // bug 1059683: when we're on a HiDPI device with non-integer
    // devicePixelRatio the system may calculate (from available screen height
    // and keyboard height) the available height for current window/layout that
    // is a fraction smaller than the ideal value, which can result in a
    // 1-device-px gap between the current window/layout and keyboard, on such
    // devices. to mitigate this, the keyboard tries to report 1 less pixel of
    // height if it sees that the height of the keyboard is a fraction when
    // expressed in device pixel.

    var dpx = window.devicePixelRatio;
    if ((height * dpx) % 1 !== 0) {
      height = Math.floor(height * dpx) / dpx;
    }

    this.height = height;
  };

  // Set the input method activeness of this InputWindow:
  // - mozbrowserresize event (for the readiness of the input app)
  // - setVisible & setInputMethodActive
  // - styling classes
  InputWindow.prototype._setAsActiveInput =
  function iw_setAsActiveInput(active) {
    this.debug('setAsActiveInput: ' + this.manifestURL + this.path +
               ', active: ' + active);

    this.setVisible(active);

    if (this.browser.element.setInputMethodActive) {
      this.browser.element.setInputMethodActive(active);
    } else {
      console.warn('setInputMethodActive is not available');
    }

    if (active) {
      this.browser.element.addEventListener('mozbrowserresize', this, true);
      this.element.classList.add('top-most');
    } else {
      this.browser.element.removeEventListener('mozbrowserresize', this, true);
      this.element.classList.remove('top-most');

      this.height = 0;
    }
  };

  /**
   * Input apps can never change orientation for whatever reasons.
   *
   * @override
   * @memberof InputWindow
   */
  InputWindow.prototype.lockOrientation = function iw_setOrientation(){
  };
  InputWindow.prototype.setOrientation = function iw_setOrientation(){
  };

  /**
   * Close the input window.
   *
   * Also, remove the handler of ready event because our caller might be closing
   * this input window immediately after it has just called open() on this, and
   * the ready event (required by the whole opening process) hasn't been
   * triggered -- In that case, since we're closing, we must ignore that ready
   * event too.
   *
   * @override
   * @param {String} immediate If the window has to be closed without animation
   * @memberof InputWindow
   */
  InputWindow.prototype.close = function iw_close(immediate){
    this.element.removeEventListener('_ready', this);

    AppWindow.prototype.close.call(this, immediate);
  };

  /**
   * Open the input window, optionally replacing the layout before doing so.
   *
   * @override
   * @param {Object} configs The configs of the layout
   * @memberof InputWindow
   */
  InputWindow.prototype.open = function iw_open(configs){
    var hashChanged = false;

    if (configs.hash !== this.hash) {
      this.browser.element.src = this.origin + this.pathInitial + configs.hash;
      this.debug(this.browser.element.frameName + ' is overwritten: ' +
                 this.browser.element.src);

      this.browser.element.dataset.frameName = configs.id;

      this.hash = configs.hash;

      hashChanged = true;
    }

    this.immediateOpen = configs.immediateOpen;

    this.element.addEventListener('_ready', this);
    this._pendingReady = true;

    this._setAsActiveInput(true);

    // if we're not chaning the hash and we're currently closing, then we are
    // currently still the active input method (because setAsActiveInput(false)
    // is called at |closed| on the manager); as we still want to open the
    // window, and as we won't trigger the hashchange nor the input/visibility
    // events on the app, we need to trigger the readyhandler by ourselves.
    // (on top of that, we want to show the keyboard immediately.)
    if (!hashChanged &&
        'closing' === this.transitionController._transitionState){
      this.immediateOpen = true;
      this.publish('ready');
    }
  };

  exports.InputWindow = InputWindow;
})(window);
