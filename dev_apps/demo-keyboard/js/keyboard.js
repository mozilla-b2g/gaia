'use strict';

/* global KeyboardLayoutManager, KeyboardTouchHandler,
         InputField, ShiftKey, AutoCorrect, Settings, Settings, KeyEvent,
         DoubleSpace */
(function(exports) {
  /**
   * KeyboardApp is the starting module of the app itself.
   *
   * @class KeyboardApp
   */
  function KeyboardApp() {
    this._started = false;
  }

  KeyboardApp.prototype.DEBUG = false;

  /**
   * Start the KeyboardApp instance. Attach event listeners and respond
   * to input field and context instantly.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    if (!navigator.mozInputMethod) {
      throw 'No navigator.mozInputMethod!';
    }
    this._started = true;

    window.addEventListener('resize', this);
    navigator.mozInputMethod.addEventListener('inputcontextchange', this);
    window.addEventListener('mozvisibilitychange', this);

    this.container =
      document.getElementById(this.KEYBOARD_CONTAINER_ID);
    this.container.addEventListener('mousedown', this);

    window.addEventListener('hashchange', this);

    this.layoutManager = new KeyboardLayoutManager(this);
    this.layoutManager.start();

    // Get layout name
    this.currentLayoutName = window.location.hash.substring(1);
    this.layoutManager.load(this.currentLayoutName);

    this.touchHandler = new KeyboardTouchHandler();
    this.touchHandler.start();

    this.inputField = new InputField();
    this.inputField.start();

    this.doubleSpace = new DoubleSpace(this);
    this.doubleSpace.start();

    this.shiftKey = new ShiftKey(this);
    this.shiftKey.start();

    this.autoCorrect = new AutoCorrect(this);
    this.autoCorrect.start();

    this.settings = new Settings(this.DEFAULT_SETTINGS);
    this.settings.addEventListener('settingschanged', this);
    this.isShown = false;

    this.touchHandler.addEventListener('key', this);

    this.inputField.addEventListener('inputfieldchanged', this);
  };

  /**
   * Stop the KeyboardApp instance. Remove event listeners, etc.
   * to input field and context instantly.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.stop = function hb_stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    window.removeEventListener('resize', this);
    navigator.mozInputMethod.removeEventListener('inputcontextchange', this);
    this.container.removeEventListener('mousedown', this);

    this.touchHandler.removeEventListener('key', this);
    this.inputField.removeEventListener('inputfieldchanged', this);
    this.settings.removeEventListener('settingschanged', this);

    this.inputField.stop();
    this.shiftKey.stop();
    this.autoCorrect.stop();
    this.doubleSpace.stop();
    this.touchHandler.stop();
    this.layoutManager.stop();

    this.inputcontext = null;
    this.layout = undefined;
    this.variant = undefined;
    this.container = null;
    this.currentPageView = null;
    this.currentPage = null;

    this.touchHandler = null;
    this.inputField = null;
    this.shiftKey = null;
    this.autoCorrect = null;
    this.doubleSpace = null;
    this.settings = null;
    this.layoutManager = null;
    this.isShown = false;
    this.currentLayoutName = '';
  };

  KeyboardApp.prototype.debug = function debug(msg) {
    if (this.DEBUG) {
      console.log('[KeyboardApp]' +
        Array.slice(arguments).concat());
    }
  };

  /**
   * Handle events and dispatch it to other functions.
   * @param  {DOMEvent} evt Event to handle.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.handleEvent = function(evt) {
    this.debug('handleEvent: ' + evt.type);
    switch (evt.type) {
      case 'key':
        this.handleKey(evt.detail);
        break;

      case 'inputfieldchanged':
        this.handleInputFieldChanged();
        break;

      case 'settingschanged':
        this.handleSettingsChange();
        break;

      case 'mousedown':
        // Prevent losing focus to the currently focused app
        // Otherwise, right after mousedown event,
        // the app will receive a focus event.
        evt.preventDefault();
        break;

      case 'resize':
        if (this.isShown) {
          this.resizeWindow();
        }
        break;

      case 'inputcontextchange':
        this.inputcontext = navigator.mozInputMethod.inputcontext;
        this.show();
        break;

      case 'mozvisibilitychange':
        this.show();
        break;

      case 'hashchange':
        this.currentLayoutName = window.location.hash.substring(1);
        this.layoutManager.load(this.currentLayoutName);
        break;
    }
  };

  /**
   * ID of the div to look for to create reference of the keyboard container.
   * @type {String}
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.KEYBOARD_CONTAINER_ID = 'keyboard-container';

  /**
   * Default settings of the keyboard app.
   * @type {Object}
   */
  KeyboardApp.prototype.DEFAULT_SETTINGS = {
    click: {
      defaultValue: false,
      key: 'keyboard.clicksound'
    },
    vibrate: {
      defaultValue: false,
      key: 'keyboard.vibration'
    },
    correct: {
      defaultValue: true,
      key: 'keyboard.autocorrect'
    },
    suggest: {
      defaultValue: true,
      key: 'keyboard.wordsuggestion'
    }
  };

  /**
   * Figure out what layout variant we're using.
   * XXX: match the old keyboard behavior.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.getVariant = function getVariant() {
    var variant;

    switch (this.inputField.inputType) {
    case 'email':
      variant = 'email';
      break;
    case 'url':
      variant = 'url';
      break;
    default:
      variant = null;
    }
    return variant;
  };

  /**
   * Handle input sent from TouchHandler.
   * @memberof KeyboardApp.prototype
   * @param  {String} keyname Name of the key.
   */
  KeyboardApp.prototype.handleKey = function handleKey(keyname) {
    var key = this.currentPage.keys[keyname];
    if (!key) {
      return;
    }

    switch (key.keycmd) {
      case 'sendkey':
        if (this.currentPageView.shifted) {
          var upperCaseKeyCode =
            String.fromCharCode(key.keycode).toUpperCase().charCodeAt(0);
          this.sendKey(upperCaseKeyCode);
        }
        else {
          this.sendKey(key.keycode);
        }
        break;

      case 'backspace':
        this.sendKey(8);
        break;

      case 'switch':
        navigator.mozInputMethod.mgmt.next();
        break;
      case 'page':
        this.switchPage(key.page);
        break;
      case 'defaultPage':
        this.switchPage();
        break;
      default:
        console.error('Unknown keycmd', key.keycmd);
        break;
    }
  };

  /**
   * Handle change to the input field. Triggered by InputField.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.handleInputFieldChanged =
    function handleInputFieldChanged() {
      var newvariant = this.getVariant();
      if (newvariant === this.variant) {
        return;
      }

      console.log('variant changed to', newvariant);

      this.variant = newvariant;
      var newPageView = this.layout.getPageView(this.container,
                                                this.currentPage.name,
                                                this.variant);
      if (newPageView === this.currentPageView) {
        return;
      }

      console.log('pageview changed to',
                  newPageView.page.name, newPageView.page.variant);
      this.currentPageView.hide();
      this.currentPageView = newPageView;
      this.currentPage = this.currentPageView.page;
      this.currentPageView.show();
      this.touchHandler.setPageView(this.currentPageView);
    };

  /**
   * Handle settings change, triggered by Settings.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.handleSettingsChange = function handleSettingsChange() {
    console.log('settingschanged', JSON.stringify(this.settings));
  };

  /**
   * Switch the page view to that of the given pagename of the current layout.
   * @memberof KeyboardApp.prototype
   * @param  {String} pagename Name of the page view.
   */
  KeyboardApp.prototype.switchPage = function switchPage(pagename) {
    var oldPageView = this.currentPageView;
    this.currentPageView = this.layout.getPageView(this.container,
                                                   pagename, this.variant);
    this.currentPage = this.currentPageView.page;
    oldPageView.hide();
    this.currentPageView.show();
    this.touchHandler.setPageView(this.currentPageView);
  };

  /**
   * Actually send a key stroke through input field.
   * @memberof KeyboardApp.prototype
   * @param  {Number} keycode Key Code of the key.
   */
  KeyboardApp.prototype.sendKey = function sendKey(keycode) {
    switch (keycode) {
      case KeyEvent.DOM_VK_BACK_SPACE:
      case KeyEvent.DOM_VK_RETURN:
        this.inputField.sendKey(keycode, 0, 0);
        break;

      default:
        this.inputField.sendKey(0, keycode, 0);
        break;
    }
  };

  /**
   * Resize the window according to the current layout page.
   * XXX: The KeyboardLayout object could register this handler and do the
   *      resizing.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.resizeWindow = function resizeWindow() {
    window.resizeTo(window.innerWidth, this.container.clientHeight);

    // We only resize the currently displayed page view. Other page views
    // are resized as needed when they're retrieved from the cache.
    this.currentPageView.resize();
  };

  /**
   * Show the keyboard only when:
   *  1. It is visible.
   *  2. It got a valid input context.
   * @memberof KeyboardApp.prototype
   */
  KeyboardApp.prototype.show = function show() {
    // Also check if the layout defintion is ready yet.
    var currentLayout = this.layoutManager.getLayout(this.currentLayoutName);

    if (!document.mozHidden && this.inputcontext && currentLayout) {
      this.resizeWindow();
      this.isShown = true;
    } else {
      this.isShown = false;
    }
  };

  KeyboardApp.prototype.changeLayout = function changeLayout(layoutName) {
    this.layout = this.layoutManager.getLayout(layoutName);

    // Start off with the main page
    this.variant = this.getVariant();

    var previousPageView = this.currentPageView;
    this.currentPageView =
      this.layout.getPageView(this.container, null, this.variant);
    this.currentPage = this.currentPageView.page;

    // Make it visible
    this.currentPageView.show();

    // Hide the previous pageview
    if (previousPageView) {
      previousPageView.hide();
    }

    // Handle events
    this.touchHandler.setPageView(this.currentPageView);
  };

  KeyboardApp.prototype.handleLayoutLoaded =
    function handleLayoutLoaded(layoutName) {
      this.changeLayout(layoutName);
      this.inputcontext = navigator.mozInputMethod.inputcontext;
      this.show();
    };

  exports.KeyboardApp = KeyboardApp;
}(window));
