'use strict';

(function(exports) {
  var AppWindow = window.AppWindow;

  /**
   * This window is inherit the AppWindow, and modifies some properties
   * different from the later.
   *
   * @constructor InputWindow
   * @augments AppWindow
   */
  var InputWindow = function(manager, app, path, oopEnabled) {
    this._manager = manager;

    var manifestURL = app.manifestURL;
    var origin = app.origin;

    var config = {
      isInputMethod: true,
      name: 'InputMethods',
      url: origin + path,
      origin: origin,
      path: path,
      manifest: app.manifest,
      manifestURL: manifestURL,
      oop: oopEnabled
    };

    // use only the transition controller as the sub component
    this.constructor.SUB_COMPONENTS = {
      'transitionController': window.AppTransitionController
    };

    this.constructor.REGISTERED_EVENTS.push('_closing');
    this.constructor.REGISTERED_EVENTS.push('_opened');
    this.constructor.REGISTERED_EVENTS.push('_closed');

    AppWindow.call(this, config);

    // keyboard transition did not have a timeout before,
    // so we give this a much higher tolerance
    this.transitionController.OPENING_TRANSITION_TIMEOUT = 5000;
    this.transitionController.CLOSING_TRANSITION_TIMEOUT = 5000;

    // when the iframe is OOM-kill'ed we need to know which keyboard
    // to delete, so keep track of the manifestURL
    this.iframe.dataset.frameManifestURL = manifestURL;
  };

  /**
   * @borrows AppWindow.prototype as InputWindow.prototype
   * @memberof InputWindow
   */
  InputWindow.prototype = Object.create(AppWindow.prototype);

  InputWindow.prototype.containerElement = document.getElementById('keyboards');

  InputWindow.prototype.view = function iw_view() {
    return '<div class=" ' + this.CLASS_LIST +
            ' " id="' + this.instanceID +
            '" transition-state="closed">' +
              '<div class="browser-container">' +
              ' <div class="screenshot-overlay"></div>' +
              '</div>' +
           '</div>';
  };

  /**
   * We would maintain our own events by other components.
   *
   * @type string
   * @memberof InputWindow
   */
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

  /**
   * InputWindow has its own styles.
   *
   * @type string
   * @memberof InputWindow
   */
  InputWindow.prototype.CLASS_LIST = 'inputWindow';
  InputWindow.prototype.CLASS_NAME = 'InputWindow';

  InputWindow.prototype.occupyingHeight = undefined;

  InputWindow.prototype._manager = null;

  InputWindow.prototype._isActiveKeyboard = false;

  InputWindow.prototype.openImmediately = false;

  // @override:
  // we never resize because of reasons that would normally resize app windows.
  InputWindow.prototype._resize = function iw__resize() {
  };
  InputWindow.prototype.resize = function iw_resize() {
  };

  // @override:
  // We're never an active app (should not be able to affect system's behavior)
  InputWindow.prototype.isActive = function iw_isActive(){
    return false;
  };  

  InputWindow.prototype._handle_mozbrowserresize =
    function iw_handle_mozbrowserresize(evt) {
    var height = evt.detail.height;

    // do what the old InputAppsTransitionManager's handleResize would do
    switch (this.transitionController._transitionState) {
      case 'closed':
        this.beginOpen(height);
        break;

      case 'opened':
        if (height === this.occupyingHeight) {
          return;
        }
        this._setOccupyingHeight(height);

        // No state change, but we need to publish a event.
        this._kbpublish('keyboardchange');

        break;

      case 'opening':
        // No state change, simply update the cached height.
        this._setOccupyingHeight(height);

        break;
    }

    if (this._manager.onlaunched) {
      this._manager.onlaunched(height);
    }

    evt.stopPropagation();
  };

  InputWindow.prototype._handle__closing = function iw_handle_closing() {
    this._kbpublish('keyboardhide');
  };

  InputWindow.prototype._handle__opened = function iw_handle_opened() {
    if (this._manager.onopened) {
      this._manager.onopened(this);
    }

    this._kbpublish('keyboardchange');
  };

  InputWindow.prototype._handle__closed = function iw_handle_closed() {
    this._kbpublish('keyboardhidden');

    this.setAsActiveInput(false);

    if (this._manager.onclosed) {
      this._manager.onclosed(this);
    }

    this.occupyingHeight = undefined;
  };

  // We're broadcasting system-wide event without app prefix
  // so need to do our own thing...
  InputWindow.prototype._kbpublish = function iw_kbPublish(type){
    // do not actually publish anything if we're not the active keyboard
    // (e.g. we receive closing / closed events when we're being switched out)
    if (!this._isActiveKeyboard) {
      return;
    }

    var eventInitDict = {
      bubbles: true,
      cancellable: true,
      detail: {
        height: this.occupyingHeight
      }
    };

    // We dispatch the events at the body level so we are able to intercept
    // them and prevent page resizing where desired.
    var evt = new CustomEvent(type, eventInitDict);
    document.body.dispatchEvent(evt);
  };

  // wrap it so we can mock it for testing
  InputWindow.prototype._getDpx = function iw_getDpx() {
    return window.devicePixelRatio;
  };

  InputWindow.prototype._setOccupyingHeight =
    function iw_setOccupyingHeight(height) {
    // bug 1059683: when we're on a HiDPI device with non-integer 
    // devicePixelRatio the system may calculate (from available screen height
    // and keyboard height) the available height for current window/layout that
    // is a fraction smaller than the ideal value, which can result in a
    // 1-device-px gap between the current window/layout and keyboard, on such
    // devices. to mitigate this, the keyboard tries to report 1 less pixel of
    // height if it sees that the height of the keyboard is a fraction when
    // expressed in device pixel.

    var dpx = this._getDpx();
    if ((height * dpx) % 1 !== 0) {
      height = Math.floor(height * dpx) / dpx;
    }

    this.occupyingHeight = height;
  };

  InputWindow.prototype.setLayoutData =
    function iw_setLayoutData(layout) {
      // frame name is used by ui-test
      this.iframe.dataset.frameName = layout.id;
      this.framePath = layout.path;
  };

  InputWindow.prototype.beginOpen = function iw_beginOpen(height){
    // since we use resize event to signify keyboard is ready,
    // we need to do this :(
    this._setOccupyingHeight(height);
    if (this.openImmediately) {
      this.open('immediate');
    } else {
      this.open();
    }
  };

  InputWindow.prototype.setAsActiveInput =
    function iw_setAsActiveInput(active) {
    this.debug('setAsActiveInput: ' +
                this.iframe.dataset.frameManifestURL +
                this.framePath + ', active: ' + active);

    if (this.iframe.setVisible) {
      this.iframe.setVisible(active);
    }
    if (this.iframe.setInputMethodActive) {
      this.iframe.setInputMethodActive(active);
    }

    this._isActiveKeyboard = active;

    if (active) {
      this.iframe.addEventListener('mozbrowserresize', this, true);
      this.element.classList.add('active-keyboard');
    } else {
      this.iframe.removeEventListener('mozbrowserresize', this, true);
      this.element.classList.remove('active-keyboard');
    }
  };

  Object.defineProperty(InputWindow.prototype, 'isActiveKeyboard', {
    get: function iw_get_isActiveKeyboard() {
      return this._isActiveKeyboard;
    }
  });

  exports.InputWindow = InputWindow;
})(window);
