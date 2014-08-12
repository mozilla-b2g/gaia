'use strict';
/* global SettingsListener, SearchWindow, places,
          SettingsURL, System */

(function(exports) {
  /**
   * The Rocketbar is a system-wide URL/search/title bar.
   * @requires SearchWindow
   * @requires SettingsListener
   * @class Rocketbar
   */
  var Rocketbar = function(appWindowManager) {
    // States
    this.enabled = false;
    this.focused = false;
    this.active = false;
    this.newTabPage = false;
    this.currentApp = null;

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

    // TODO: We shouldnt be creating a blob for each wallpaper that needs
    // changed in the system app
    // https://bugzilla.mozilla.org/show_bug.cgi?id=962902
    var defaultWall = 'resources/images/backgrounds/default.png';
    var wallpaperURL = new SettingsURL();

    SettingsListener.observe('wallpaper.image', defaultWall, function(value) {
      document.getElementById('rocketbar-backdrop').style.backgroundImage =
        'url(' + wallpaperURL.set(value) + ')';
    });
  };
  Rocketbar.SUB_MODULES = ['Places'];
  Rocketbar.EVENTS = [
    // Listen for events from window manager
    'apploading',
    'appforeground',
    'apptitlechange',
    'lockscreen-appopened',
    'appopened',
    'home',
    'launchactivity',
    'searchterminated',
    'permissiondialoghide',
    'attentionscreenshow',
    'status-inactive',
    'global-search-request',
    // Listen for messages from search app
    'iac-search-results',
    'system-resize'
  ];

  System.create(Rocketbar, {}, {
    /**
     * Put Rocketbar in the active state.
     *
     * Input is displayed, title is hidden and search app is loaded, input
     * not always focused.
     * @param {Function} callback Function to call after search app is ensured.
     * @memberof Rocketbar.prototype
     */
    activate: function(callback) {
      if (this.active) {
        if (callback) {
          callback();
        }
        return;
      }
      this.active = true;
      this.rocketbar.classList.add('active');
      this.form.classList.remove('hidden');
      this.screen.classList.add('rocketbar-focused');

      // We wait for the transition do be over and the search app to be loaded
      // before moving on (and triggering the callback).
      var searchLoaded = false;
      var transitionEnded = false;
      var waitOver = function() {
        if (searchLoaded && transitionEnded && callback) {
          callback();
        }
      };

      var backdrop = this.backdrop;
      var safetyTimeout = null;
      var finishTransition = function() {
        backdrop.removeEventListener('transitionend', finishTransition);
        clearTimeout(safetyTimeout);

        window.dispatchEvent(new CustomEvent('rocketbar-overlayopened'));
        transitionEnded = true;
        waitOver();
      };
      backdrop.classList.remove('hidden');
      backdrop.addEventListener('transitionend', finishTransition);
      safetyTimeout = setTimeout(finishTransition, 300);

      var finishLoad = (function() {
        if (this.input.value.length) {
          this.handleInput();
        }
        searchLoaded = true;
        waitOver();
      }).bind(this);
      this.loadSearchApp(finishLoad);
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
      this.newTabPage = false;
      this.rocketbar.classList.remove('active');
      this.form.classList.add('hidden');
      this.backdrop.classList.add('hidden');
      this.blur();
      this.screen.classList.remove('rocketbar-focused');
      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
    },

    /**
     * Add event listeners. Only called when Rocketbar is turned on.
     * @memberof Rocketbar.prototype
     */
    _start: function() {
      this.enabled = true;
      // Listen for events from Rocketbar
      this.input.addEventListener('focus', this);
      this.input.addEventListener('blur', this);
      this.input.addEventListener('input', this);
      this.cancel.addEventListener('click', this);
      this.clearBtn.addEventListener('click', this);
      this.form.addEventListener('submit', this);
      this.backdrop.addEventListener('click', this);
    },

    '_handle_apploading': function() {
      this.hideResults();
      this.deactivate();
    },

    '_handle_appforeground': function() {
      this._handle_apploading();
    },

    '_handle_appopened': function() {
      this._handle_apploading();
    },

    '_handle_attentionscreenshow': function() {
      this._handle_apploading();
    },

    '_handle_status-inactive': function() {
      this._handle_apploading();
    },

    _handle_click: function(evt) {
      if (evt.target == this.cancel) {
        this.handleCancel(evt);
      } else if (evt.target == this.clearBtn) {
        this.clear();
      } else if (evt.target == this.backdrop) {
        this.deactivate();
      }
    },

    _handle_permissiondialoghide: function() {
      if (this.active) {
        this.focus();
      }
    },

    '_handle_global-search-request': function(evt) {
      // XXX: fix it.
      var app = System.topMostWindow;
      if (app && !app.manifestURL) {
        this.setInput(app.config.url);
      } else {
        this.setInput('');
      }

      var self = this;
      var focusAndSelect = function() {
        self.hideResults();
        setTimeout(function() {
          self.focus();
          self.selectAll();
        });
      };

      if (app && app.appChrome && !app.appChrome.isMaximized()) {
        app.appChrome.maximize(function() {
          self.activate(focusAndSelect);
        });
      } else {
        this.activate(focusAndSelect);
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
    },

    /**
     * Show New Tab Page.
     * @memberof Rocketbar.prototype
     */
    showNewTabPage: function() {
      this.newTabPage = true;
      this.activate((function() {
        this.showResults();
        if (this._port) {
          this._port.postMessage({
            action: 'showNewTabPage'
          });
        }
      }).bind(this));
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
      this.input.focus();
    },

    /**
     * SelectAll text content from Rocketbar input.
     * @memberof Rocketbar.prototype
     */
    selectAll: function() {
      this.input.select();
    },

    /**
     * Handle press of hardware home button.
     * @memberof Rocketbar.prototype
     */
    _handle_home: function() {
      this.hideResults();
      this.deactivate();
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
    _handle_blur: function() {
      this.focused = false;
      // Stop swallowing keyboard change events
      // To be removed in bug 999463
      this.body.removeEventListener('keyboardchange',
        this.handleKeyboardChange, true);
    },

    /**
     * Handle a lock event.
     * @memberof Rocketbar.prototype
     */
    '_handle_lockscreen-appopening': function() {
      this.hideResults();
      this.deactivate();
    },

    /**
     * Handles activities for the search app.
    * @memberof Rocketbar.prototype
     */
    _handle_launchactivity: function(e) {
      if (e.detail.isActivity && e.detail.inline && this.searchWindow &&
          this.searchWindow.manifestURL === e.detail.parentApp) {
        e.stopImmediatePropagation();
        this.searchWindow.broadcast('launchactivity', e.detail);
      }
    },

    /**
     * Handle text input in Roketbar.
     * @memberof Rocketbar.prototype
     */
    _handle_input: function() {
      var input = this.input.value;

      this.rocketbar.classList.toggle('has-text', input.length);

      if (!input && !this.newTabPage &&
          !this.results.classList.contains('hidden')) {
        this.hideResults();
        return;
      }

      if (!input && this.newTabPage) {
        this.showNewTabPage();
        return;
      }

      if (this.results.classList.contains('hidden')) {
        this.showResults();
      }

      if (this._port) {
        this._port.postMessage({
          action: 'change',
          input: input
        });
      }
    },

    /**
     * Handle click of cancel button.
     * @memberof Rocketbar.prototype
     */
    _handle_cancel: function(e) {
      this.setInput('');
      this.hideResults();
      this.deactivate();
    },

    /**
     * Handle submission of the Rocketbar.
     *
     * @param {Event} e Submit event.
     * @memberof Rocketbar.prototype
     */
    _handle_submit: function(e) {
      e.preventDefault();

      if (this.results.classList.contains('hidden')) {
        this.showResults();
      }

      this._port.postMessage({
        action: 'submit',
        input: this.input.value
      });
    },

    /**
     * Handle keyboard change.
     *
     * To be removed in bug 999463.
     * @memberof Rocketbar.prototype
     */
    '_handle_system-resize': function(e) {
      // Swallow event to prevent app being resized
      e.stopImmediatePropagation();
    },

    /**
     * Instantiates a new SearchWindow.
     * @memberof Rocketbar.prototype
     */
    loadSearchApp: function(callback) {
      if (!this.searchWindow) {
        this.searchWindow = new SearchWindow();
      }

      this.initSearchConnection(callback);
    },

    /**
     * Handles when the search app terminates.
     * @memberof Rocketbar.prototype
     */
    _handle_searchterminated: function(e) {
      if (!this.searchWindow) {
        return;
      }

      this.hideResults();
      this.deactivate();

      this.searchWindow = null;
      this._port = null;
    },

    /**
     * Initialise inter-app connection with search app.
     * @param {Function} callback Function to call after we have an IAC port.
     * @memberof Rocketbar.prototype
     */
    initSearchConnection: function(callback) {
      var self = this;

      if (this._port) {
        if (callback) {
          callback();
        }
        return;
      }

      this._port = 'pending';
      navigator.mozApps.getSelf().onsuccess = function() {
        var app = this.result;
        if (!app) {
          return;
        }

        app.connect('search').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              self._port = port;
            });
            if (self._pendingMessage) {
              self['_handle_iac-search-results'](self._pendingMessage);
              delete self._pendingMessage;
            }
            if (callback) {
              callback();
            }
          },
          function onConnectionRejected(reason) {
            console.error('Error connecting: ' + reason + '\n');
          }
        );
      };
    },

    /**
     * Handle messages from the search app.
     *
     * @param {Event} e Message event.
     * @memberof Rocketbar.prototype
     */
    '_handle_iac-search-results': function(e) {
      // Open the search connection if we receive a message before it's open
      if (!this._port) {
        this._pendingMessage = e;
        this.initSearchConnection();
        return;
      }

      switch (e.detail.action) {
        case 'render':
          this.activate(setTimeout.bind(null, this.focus.bind(this)));
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
          this.hideResults();
          this.deactivate();
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
    },
    containerElement: document.getElementById('screen'),
    view: function() {
      return
      '<div id="rocketbar-backdrop" class="hidden" data-z-index-level="rocketbar-backdrop">' +
        '<div id="rocketbar-backdrop-cover"></div>' +
      '</div>' +
      '<div id="rocketbar-results" class="hidden" data-z-index-level="rocketbar-results"></div>';
    }
  });
  exports.Rocketbar = Rocketbar;

}(window));
