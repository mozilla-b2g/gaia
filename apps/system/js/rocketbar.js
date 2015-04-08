'use strict';
/* global eventSafety */
/* global Service, SearchWindow, places, Promise, UtilityTray */

(function(exports) {

  /**
   * The Rocketbar is a system-wide URL/search/title bar.
   * @requires SearchWindow
   * @requires SettingsListener
   * @class Rocketbar
   */
  function Rocketbar() {

    // States
    this.enabled = false;
    this.focused = false;
    this.active = false;

    // Properties
    this._port = null; // Inter-app communications port
    this._wasClicked = false; // Remember when transition triggered by a click
    this._pendingMessage = null;

    // Get DOM elements
    this.body = document.body;
    this.screen = document.getElementById('screen');
    this.rocketbar = document.getElementById('rocketbar');
    this.form = document.getElementById('rocketbar-form');
    this.input = document.getElementById('rocketbar-input');
    this.cancel = document.getElementById('rocketbar-cancel');
    this.clearBtn = document.getElementById('rocketbar-clear');
    this.results = document.getElementById('rocketbar-results');
    this.backdrop = document.getElementById('rocketbar-backdrop');
    this.start();
  }

  Rocketbar.prototype = {
    EVENT_PREFIX: 'rocketbar',
    name: 'Rocketbar',

    /**
     * True during the rocketbar closing animation.
     */
    isClosing: false,

    publish: function(name) {
      window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + name, {
        detail: this
      }));
    },

    isActive: function() {
      return this.active;
    },

    getActiveWindow: function() {
      return this.isActive() ? this.searchWindow : null;
    },

    setHierarchy: function(active) {
      if (active) {
        this.focus();
      }
      this.searchWindow &&
      this.searchWindow.setVisibleForScreenReader(active);
      return true;
    },

    /**
     * Starts Rocketbar.
     * @memberof Rocketbar.prototype
     */
    start: function() {
      this.addEventListeners();
      this.enabled = true;
      Service.request('registerHierarchy', this);
    },

    /**
     * Put Rocketbar in the active state.
     *
     * Input is displayed, title is hidden and search app is loaded, input
     * not always focused.
     * @return {Promise}
     * @memberof Rocketbar.prototype
     */
    activate: function() {
      if (this.isClosing) {
        return Promise.reject();
      }

      this._activateCall = new Promise(resolve => {
        if (this.active) {
          resolve();
          return;
        }

        this.active = true;
        this.rocketbar.classList.add('active');
        this.form.classList.remove('hidden');
        this.screen.classList.add('rocketbar-focused');

        // We wait for the transition do be over and the search app to be loaded
        // before moving on (and resolving the promise).
        var searchLoaded = false;
        var transitionEnded = false;
        var waitOver = () => {
          if (searchLoaded && transitionEnded) {
            resolve();
            this._activateCall = null;
            this.publish('-activated');
          }
        };

        var backdrop = this.backdrop;
        var finishTransition = () => {
          window.dispatchEvent(new CustomEvent('rocketbar-overlayopened'));
          transitionEnded = true;
          waitOver();
        };
        backdrop.classList.remove('hidden');
        eventSafety(backdrop, 'transitionend', finishTransition, 300);

        this.loadSearchApp().then(() => {
          if (this.input.value.length) {
            this.handleInput();
          }
          searchLoaded = true;
          waitOver();
        });
        this.publish('-activating');
      });

      // Immediately hide if the utility tray is active.
      // In the future we might be able to streamline this flow, but for now we
      // need to ensure that all events are properly fired so that the chrome
      // collapses. If for example we early exit, currently the chrome will
      // not collapse.
      if (UtilityTray.active || UtilityTray.shown) {
        this._activateCall
          .then(this._closeSearch.bind(this));
      }

      return this._activateCall;
    },

    /**
     * Take Rocketbar out of active state.
     *
     * Title is displayed, input is hidden, input is always blurred.
     * @memberof Rocketbar.prototype
     */
    deactivate: function() {
      if (!this.active) {
        return;
      }
      this.active = false;
      this.isClosing = true;

      var backdrop = this.backdrop;
      var self = this;
      var finish = () => {
        this.form.classList.add('hidden');
        this.rocketbar.classList.remove('active');
        this.screen.classList.remove('rocketbar-focused');

        backdrop.classList.add('hidden');

        eventSafety(backdrop, 'transitionend', () => {
          window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
          self.publish('-deactivated');
          self.isClosing = false;
        }, 300);
      };

      if (this.focused) {
        eventSafety(window, 'keyboardhidden', finish, 1000);
        this.blur();
      } else {
        finish();
      }
      this.publish('-deactivating');
    },

    /**
     * Add event listeners. Only called when Rocketbar is turned on.
     * @memberof Rocketbar.prototype
     */
    addEventListeners: function() {
      // Listen for events from window manager
      window.addEventListener('apploading', this);
      window.addEventListener('appforeground', this);
      window.addEventListener('apptitlechange', this);
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('appopened', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('searchterminated', this);
      window.addEventListener('permissiondialoghide', this);
      window.addEventListener('global-search-request', this);
      window.addEventListener('attentionopening', this);
      window.addEventListener('attentionopened', this);
      window.addEventListener('searchopened', this);
      window.addEventListener('searchclosed', this);
      window.addEventListener('utilitytray-overlayopening', this);
      window.addEventListener('utility-tray-overlayopened', this);
      window.addEventListener('simlockrequestfocus', this);
      window.addEventListener('cardviewbeforeshow', this);

      // Listen for events from Rocketbar
      this.input.addEventListener('focus', this);
      this.input.addEventListener('blur', this);
      this.input.addEventListener('input', this);
      this.cancel.addEventListener('click', this);
      this.clearBtn.addEventListener('click', this);
      this.form.addEventListener('submit', this);
      this.backdrop.addEventListener('click', this);

      // Listen for messages from search app
      window.addEventListener('iac-search-results', this);
    },

    '_handle_system-resize': function() {
      if (this.isActive()) {
        this.searchWindow &&
        this.searchWindow.frontWindow &&
        this.searchWindow.frontWindow.resize();
        return false;
      }
      return true;
    },

    respondToHierarchyEvent: function(evt) {
      if (this['_handle_' + evt.type]) {
        return this['_handle_' + evt.type](evt);
      }
      return true;
    },

    /**
     * Dispatch events to correct event handlers.
     *
     * @param {Event} e Event.
     * @memberof Rocketbar.prototype
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'searchopened':
          window.addEventListener('open-app', this);
          break;
        case 'searchclosed':
          window.removeEventListener('open-app', this);
          break;
        case 'apploading':
        case 'launchapp':
          // Do not close the search app if something opened in the background.
          var detail = e.detail;
          if (detail && detail.stayBackground) {
            return;
          }
          this._closeSearch();
          break;
        case 'open-app':
          // Do not hide the searchWindow if we have a frontWindow.
          if (this.searchWindow && this.searchWindow.frontWindow) {
            return;
          }
          if (e.detail && !e.detail.showApp) {
            return;
          }
          /* falls through */
        case 'attentionopening':
        case 'attentionopened':
        case 'appforeground':
        case 'appopened':
        case 'utilitytray-overlayopening':
        case 'utility-tray-overlayopened':
        case 'simlockrequestfocus':
        case 'cardviewbeforeshow':
          this._closeSearch();
          break;
        case 'lockscreen-appopened':
          this.handleLock(e);
          break;
        case 'focus':
          this.handleFocus(e);
          break;
        case 'blur':
          this.handleBlur(e);
          break;
        case 'input':
          this.handleInput(e);
          break;
        case 'click':
          if (e.target == this.cancel) {
            this.handleCancel(e);
          } else if (e.target == this.clearBtn) {
            this.clear();
          } else if (e.target == this.backdrop) {
            this._closeSearch();
          }
          break;
        case 'searchterminated':
          this.handleSearchTerminated(e);
          break;
        case 'submit':
          this.handleSubmit(e);
          break;
        case 'iac-search-results':
          this.handleSearchMessage(e);
          break;
        case 'permissiondialoghide':
          if (this.active) {
            this.focus();
          }
          break;
        case 'global-search-request':
          // XXX: fix the WindowManager coupling
          // but currently the transition sequence is crucial for performance
          var app = Service.currentApp;
          var afterActivate;

          if (app && !app.isActive()) {
            return;
          }

          // If the app is not a browser, retain the search value and activate.
          if (app && !app.isBrowser()) {
            afterActivate = this.focus.bind(this);
          } else {
            // Clear the input if the URL starts with a system page.
            if (app.config.url.startsWith('app://system.gaiamobile.org')) {
              this.setInput('');
            } else {
              // Set the input to be the URL in the case of a normal browser.
              this.setInput(app.config.url);
            }

            afterActivate = () => {
              this.hideResults();
              setTimeout(() => {
                this.focus();
                this.selectAll();
              });
            };
          }

          if (app && app.appChrome && !app.appChrome.isMaximized()) {
            app.appChrome.maximize(() => {
              this.activate().then(afterActivate);
            });
          } else {
            this.activate().then(afterActivate);
          }
          break;
      }
    },

    /**
     * Set URL and generate manifest URL of search app.
     * @param {String} url The search app URL.
     * @memberof Rocketbar.prototype
     */
    setSearchAppURL: function(url) {
      this._searchAppURL = url;
      this._searchManifestURL = url ? url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp' : '';
    },

    setInput: function(input) {
      this.input.value = input;
      this.rocketbar.classList.toggle('has-text', input.length);
    },

    /**
     * Show the Rocketbar results pane.
     * @memberof Rocketbar.prototype
     */
    showResults: function() {
      if (this.searchWindow && !this.searchWindow.isDead()) {
        this.searchWindow.open();
      }
      this.results.classList.remove('hidden');
      this.backdrop.classList.add('results-shown');
    },

    /**
     * Hide the Rocketbar results pane.
     * @memberof Rocketbar.prototype
     */
    hideResults: function() {
      if (this.searchWindow) {
        this.searchWindow.close();
        this.searchWindow.hideContextMenu();
      }

      this.results.classList.add('hidden');
      this.backdrop.classList.remove('results-shown');

      // Send a message to the search app to clear results
      if (this._port) {
        this._port.postMessage({
          action: 'clear'
        });
      }
    },

    /**
     * Reset the Rocketbar to its initial empty state.
     */
    clear: function() {
      this.setInput('');
      this.hideResults();
    },

    /**
     * Enable back button.
     */
    enableNavigation: function() {
      this.rocketbar.classList.add('navigation');
    },

    /**
     * Disable back button.
     */
    disableNavigation: function() {
      this.rocketbar.classList.remove('navigation');
    },

    /**
     * Focus Rocketbar input.
     * @memberof Rocketbar.prototype
     */
    focus: function() {
      if (this.active) {
        this.input.focus();
      }
    },

    /**
     * SelectAll text content from Rocketbar input.
     * @memberof Rocketbar.prototype
     */
    selectAll: function() {
      this.input.setSelectionRange(0, this.input.value.length, 'forward');
    },

    /**
     * Handle a focus event.
     * @memberof Rocketbar.prototype
     */
    handleFocus: function() {
      this.focused = true;
    },

    /**
     * Handle press of hardware home button.
     * @memberof Rocketbar.prototype
     */
    _handle_home: function() {
      this._closeSearch();
      return true;
    },

    /**
     * Blur Rocketbar input.
     * @memberof Rocketbar.prototype
     */
    blur: function() {
      this.input.blur();
    },

    /**
     * Handle a blur event.
     * @memberof Rocketbar.prototype
     */
    handleBlur: function() {
      this.focused = false;
    },

    /**
     * Handle a lock event.
     * @memberof Rocketbar.prototype
     */
    handleLock: function() {
      this._closeSearch();
    },

    /**
     * This function is called in respondToHierarchyEvent()
     * when there is a value selector event and rocketbar
     * is the current top most UI by HierarchyManager.
     * @param  {Object} evt Event object
     */
    '_handle_mozChromeEvent': function(evt) {
      if (!evt.detail || evt.detail.type !== 'inputmethod-contextchange') {
        return true;
      }
      if (this.searchWindow) {
        this.searchWindow.getTopMostWindow()
            .broadcast('inputmethod-contextchange',
          evt.detail);
        return false;
      }
      return true;
    },

    /**
     * Handles activities for the search app.
    * @memberof Rocketbar.prototype
     */
    _handle_launchactivity: function(e) {
      if (e.detail.isActivity && e.detail.inline && this.searchWindow &&
          this.searchWindow.manifestURL === e.detail.parentApp) {
        this.searchWindow.broadcast('launchactivity', e.detail);
        return false;
      }
      return true;
    },

    _closeSearch: function() {
      var hideAndDeactivate = () => {
        this.hideResults();
        this.deactivate();
      };

      if (this._activateCall) {
        this._activateCall
          .then(hideAndDeactivate);
      } else {
        hideAndDeactivate();
      }
    },

    /**
     * Handle text input in Rocketbar.
     * @memberof Rocketbar.prototype
     */
    handleInput: function() {
      var input = this.input.value;

      this.rocketbar.classList.toggle('has-text', input.length);

      if (UtilityTray.active || UtilityTray.shown) {
        this._closeSearch();
        return;
      }

      if (!input && !this.results.classList.contains('hidden')) {
        this.hideResults();
        return;
      }

      if (this.results.classList.contains('hidden')) {
        this.showResults();
      }

      if (this._port) {
        this._port.postMessage({
          action: 'change',
          input: input,
          isPrivateBrowser: Service.currentApp.isPrivateBrowser()
        });
      }
    },

    /**
     * Handle click of cancel button.
     * @memberof Rocketbar.prototype
     */
    handleCancel: function(e) {
      this.setInput('');
      this._closeSearch();
    },

    /**
     * Handle submission of the Rocketbar.
     *
     * @param {Event} e Submit event.
     * @memberof Rocketbar.prototype
     */
    handleSubmit: function(e) {
      e.preventDefault();

      if (this.results.classList.contains('hidden')) {
        this.showResults();
      }

      this._port.postMessage({
        action: 'submit',
        input: this.input.value
      });

      // Do not persist search submissions from private windows.
      if (Service.currentApp.isPrivateBrowser()) {
        this.setInput('');
      }
    },

    /**
     * Instantiates a new SearchWindow.
     * @return {Promise}
     * @memberof Rocketbar.prototype
     */
    loadSearchApp: function() {
      if (!this.searchWindow) {
        this.searchWindow = new SearchWindow();
      }

      return this.initSearchConnection();
    },

    /**
     * Handles when the search app terminates.
     * @memberof Rocketbar.prototype
     */
    handleSearchTerminated: function(e) {
      if (!this.searchWindow) {
        return;
      }

      this._closeSearch();

      this.searchWindow = null;
      this._port = null;
    },

    /**
     * Initialise inter-app connection with search app.
     * @return {Promise}
     * @memberof Rocketbar.prototype
     */
    initSearchConnection: function() {
      if (this.pendingInitConnection) {
        return this.pendingInitConnection;
      }

      this.pendingInitConnection = new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = (event) => {
          var app = event.target.result;
          if (!app) {
            reject();
            return;
          }

          app.connect('search').then(ports => {
              ports.forEach(port => {
                this._port = port;
              });
              if (this._pendingMessage) {
                this.handleSearchMessage(this._pendingMessage);
                delete this._pendingMessage;
              }
              delete this.pendingInitConnection;
              resolve();
            }, reject);
        };
      });
      return this.pendingInitConnection;
    },

    /**
     * Handle messages from the search app.
     *
     * @param {Event} e Message event.
     * @memberof Rocketbar.prototype
     */
    handleSearchMessage: function(e) {
      // Open the search connection if we receive a message before it's open
      if (!this._port) {
        this._pendingMessage = e;
        this.initSearchConnection();
        return;
      }

      switch (e.detail.action) {
        case 'private-window':
          window.dispatchEvent(new CustomEvent('new-private-window'));
          break;
        case 'render':
          this.activate().then(this.focus.bind(this));
          break;
        case 'focus':
          this.focus();
          break;
        case 'input':
          this.setInput(e.detail.input);
          this.focus();
          this.handleInput();
          break;
        case 'request-screenshot':
          places.screenshotRequested(e.detail.url);
          break;
        case 'hide':
          this._closeSearch();
          break;
      }
    },

    /**
     * Tell the search app to update its index.
     * @memberof Rocketbar.prototype
     */
    updateSearchIndex: function() {
      if (this._port) {
        this._port.postMessage({
          action: 'syncPlaces'
        });
      }
    }
  };

  exports.Rocketbar = Rocketbar;

}(window));
