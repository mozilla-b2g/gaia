'use strict';
/* global SettingsListener, AppWindow, AppWindowManager, SearchWindow, places,
          SettingsURL */

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
    this.expanded = false;
    this.transitioning = false;
    this.focused = false;
    this.active = false;
    this.onHomescreen = false;
    this.newTabPage = false;
    this.cardView = false;
    this.waitingOnCardViewLaunch = false;
    this.currentApp = null;

    // Properties
    this._port = null; // Inter-app communications port
    this._touchStart = -1;
    this._wasClicked = false; // Remember when transition triggered by a click
    this._pendingMessage = null;

    // Get DOM elements
    this.body = document.body;
    this.screen = document.getElementById('screen');
    this.rocketbar = document.getElementById('rocketbar');
    this.title = document.getElementById('rocketbar-title');
    this.titleContent = document.getElementById('rocketbar-title-content');
    this.form = document.getElementById('rocketbar-form');
    this.input = document.getElementById('rocketbar-input');
    this.cancel = document.getElementById('rocketbar-cancel');
    this.clearBtn = document.getElementById('rocketbar-clear');
    this.results = document.getElementById('rocketbar-results');
    this.backdrop = document.getElementById('rocketbar-backdrop');
    this.overflow = document.getElementById('rocketbar-overflow-button');

    // Listen for settings changes
    SettingsListener.observe('rocketbar.enabled', false, function(value) {
      if (value) {
        this.start();
      } else {
        this.stop();
      }
    }.bind(this));

    // TODO: We shouldnt be creating a blob for each wallpaper that needs
    // changed in the system app
    // https://bugzilla.mozilla.org/show_bug.cgi?id=962902
    var defaultWall = 'resources/images/backgrounds/default.png';
    var wallpaperURL = new SettingsURL();

    SettingsListener.observe('wallpaper.image', defaultWall, function(value) {
      document.getElementById('rocketbar-backdrop').style.backgroundImage =
        'url(' + wallpaperURL.set(value) + ')';
    });

  }

  Rocketbar.prototype = {

    /**
     * How many pixels of swipe triggers expand/collapse
     * @type {Number}
     * @memberof Rocketbar.prototype
     */
    EXPANSION_THRESHOLD: 5,

    /**
     * How many pixels of swipe triggers card view
     * @type {Number}
     * @memberof Rocketbar.prototype
     */
    TASK_MANAGER_THRESHOLD: 200,

    /**
     * How many pixels of scroll triggers expand
     * @type {Number}
     * @memberof Rocketbar.prototype
     */
    SCROLL_THRESHOLD: 5,

    /**
     * Current scroll position of the app window.
     * @type {Number}
     * @memberof Rocketbar.prototype
     */
    currentScrollPosition: 0,

    /**
     * Starts Rocketbar.
     * @memberof Rocketbar.prototype
     */
    start: function() {
      this.addEventListeners();
      this.body.classList.add('rb-enabled');
      this.enabled = true;
    },

    /**
     * Stops Rocketbar.
     * @memberof Rocketbar.prototype
     */
    stop: function() {
      this.removeEventListeners();
      this.body.classList.remove('rb-enabled');
      this.enabled = false;
    },

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
      this.title.classList.add('hidden');
      this.backdrop.classList.remove('hidden');
      this.loadSearchApp((function() {
        if (this.input.value.length) {
          this.handleInput();
        }
        if (callback) {
          callback();
        }
      }).bind(this));
      this.screen.classList.add('rocketbar-focused');
      window.dispatchEvent(new CustomEvent('rocketbar-overlayopened'));
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
      this.cardView = false;
      this.newTabPage = false;
      this.rocketbar.classList.remove('active');
      this.form.classList.add('hidden');
      this.title.classList.remove('hidden');
      this.backdrop.classList.add('hidden');
      this.blur();
      this.screen.classList.remove('rocketbar-focused');
      window.dispatchEvent(new CustomEvent('rocketbar-overlayclosed'));
    },

    /**
     * Add event listeners. Only called when Rocketbar is turned on.
     * @memberof Rocketbar.prototype
     */
    addEventListeners: function() {
      // Listen for events from window manager
      window.addEventListener('apploading', this);
      window.addEventListener('apptitlechange', this);
      window.addEventListener('applocationchange', this);
      window.addEventListener('appscroll', this);
      window.addEventListener('home', this);
      window.addEventListener('cardviewclosedhome', this);
      window.addEventListener('cardviewclosed', this);
      window.addEventListener('cardviewshown', this);
      window.addEventListener('appopened', this);
      window.addEventListener('homescreenopening', this);
      window.addEventListener('stackchanged', this);
      window.addEventListener('searchcrashed', this);

      // Listen for events from Rocketbar
      this.rocketbar.addEventListener('touchstart', this);
      this.rocketbar.addEventListener('touchmove', this);
      this.rocketbar.addEventListener('touchend', this);
      this.rocketbar.addEventListener('transitionend', this);
      this.input.addEventListener('focus', this);
      this.input.addEventListener('blur', this);
      this.input.addEventListener('input', this);
      this.cancel.addEventListener('click', this);
      this.clearBtn.addEventListener('click', this);
      this.overflow.addEventListener('click', this);
      this.form.addEventListener('submit', this);
      this.backdrop.addEventListener('click', this);

      // Listen for messages from search app
      window.addEventListener('iac-search-results', this);

      // Listen for FTU events
      window.addEventListener('ftudone', this);
    },

    /**
     * Dispatch events to correct event handlers.
     *
     * @param {Event} e Event.
     * @memberof Rocketbar.prototype
     */
    handleEvent: function(e) {
      switch(e.type) {
        case 'apploading':
        case 'appopened':
          this.handleAppChange(e);
          break;
        case 'apptitlechange':
          this.handleTitleChange(e);
          break;
        case 'applocationchange':
          this.handleLocationChange(e);
          break;
        case 'appscroll':
          this.handleScroll(e);
          break;
        case 'home':
        case 'cardviewclosedhome':
          this.handleHome(e);
          break;
        case 'cardviewshown':
          if (this.waitingOnCardViewLaunch) {
            this.showTaskManager();
            this.waitingOnCardViewLaunch = false;
          }
          break;
        case 'cardviewclosed':
          this.cardView = false;
          if (this.waitingOnCardViewLaunch) {
            this.handleClick();
            this.waitingOnCardViewLaunch = false;
          }
        break;
        case 'searchcrashed':
          this.handleSearchCrashed(e);
          break;
        case 'touchstart':
        case 'touchmove':
        case 'touchend':
          if (e.target != this.cancel &&
              e.target != this.clearBtn &&
              e.target != this.overflow) {
            this.handleTouch(e);
          }
          break;
        case 'transitionend':
          this.handleTransitionEnd(e);
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
          } else if (e.target == this.overflow) {
            this.handleOverflow(e);
          } else if (e.target == this.backdrop) {
            this.deactivate();
          }
          break;
        case 'submit':
          this.handleSubmit(e);
          break;
        case 'iac-search-results':
          this.handleSearchMessage(e);
          break;
        case 'ftudone':
          this.handleFTUDone(e);
          break;
        case 'homescreenopening':
          this.enterHome(e);
          break;
        case 'stackchanged':
          this.handleStackChanged(e);
          break;
      }
    },

    /**
     * Remove all event listeners. Called when Rocketbar is disabled.
     * @memberof Rocketbar.prototype
     */
    removeEventListeners: function() {
      // Stop listening for events from window manager
      window.removeEventListener('apploading', this);
      window.removeEventListener('apptitlechange', this);
      window.removeEventListener('applocationchange', this);
      window.removeEventListener('home', this);
      window.removeEventListener('cardviewclosed', this);
      window.removeEventListener('cardviewshown', this);
      window.removeEventListener('cardviewclosedhome', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('homescreenopening', this);
      window.removeEventListener('stackchanged', this);

      // Stop listening for events from Rocketbar
      this.rocketbar.removeEventListener('touchstart', this);
      this.rocketbar.removeEventListener('touchmove', this);
      this.rocketbar.removeEventListener('touchend', this);
      this.rocketbar.removeEventListener('transitionend', this);
      this.input.removeEventListener('focus', this);
      this.input.removeEventListener('blur', this);
      this.input.removeEventListener('input', this);
      this.cancel.removeEventListener('click', this);
      this.clearBtn.removeEventListener('click', this);
      this.overflow.removeEventListener('click', this);
      this.form.removeEventListener('submit', this);
      this.backdrop.removeEventListener('click', this);

      // Stop listening for messages from search app
      window.removeEventListener('iac-search-results', this);
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

    /**
     * Put Rocketbar in expanded state.
     * @memberof Rocketbar.prototype
     */
    expand: function() {
      if (this.expanded || this.transitioning) {
        return;
      }

      //TODO: support fullscreen apps in the rocketbar
      var app = AppWindowManager.getActiveApp();
      if (app && app.isFullScreen()) {
        return;
      }

      this.transitioning = true;
      this.rocketbar.classList.add('expanded');
      this.screen.classList.add('rocketbar-expanded');
      this.expanded = true;
    },

    /**
     * Take Rocketbar out of expanded state, into status state.
     * @memberof Rocketbar.prototype
     */
    collapse: function() {
      if (!this.expanded || this.transitioning) {
        return;
      }
      this.transitioning = true;
      this.expanded = false;
      this.rocketbar.classList.remove('expanded');
      this.screen.classList.remove('rocketbar-expanded');
      this.exitHome();
      this.hideResults();
      this.deactivate();
    },

    /**
     * Put Rocketbar into homescreen state.
     * @memberof Rocketbar.prototype
     */
    enterHome: function() {
      if (this.onHomescreen) {
        return;
      }
      this.onHomescreen = true;
      if (!this.expanded) {
        this.expand();
      }
      this.clear();
      this.disableNavigation();
    },

    /**
     * Take Rocketbar out of homescreen state.
     * @memberof Rocketbar.prototype
     */
    exitHome: function() {
      if (!this.onHomescreen) {
        return;
      }
      this.onHomescreen = false;
    },

    /**
     * Show the Rocketbar results pane.
     * @memberof Rocketbar.prototype
     */
    showResults: function() {
      if (this.searchWindow) {
        this.searchWindow._setVisible(true);
      }
      this.results.classList.remove('hidden');
    },

    /**
     * Hide the Rocketbar results pane.
     * @memberof Rocketbar.prototype
     */
    hideResults: function() {
      if (this.searchWindow) {
        this.searchWindow._setVisible(false);
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
      this.input.value = '';
      this.handleInput();
      this.titleContent.textContent =
        navigator.mozL10n.get('search-or-enter-address');
    },

    /**
     * Send event to the system app to show the task manager.
     */
    fireTaskManagerShow: function() {
      this.waitingOnCardViewLaunch = true;
      window.dispatchEvent(new CustomEvent('taskmanagershow'));
    },

    /**
     * Show the task manager and clear Rocketbar.
     * @memberof Rocketbar.prototype
     */
    showTaskManager: function() {
      this.cardView = true;
      if (this._port) {
        this._port.postMessage({
          action: 'showTaskManager'
        });
      }
      this.showResults();
      this.clear();
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
     * Handle a focus event.
     * @memberof Rocketbar.prototype
     */
    handleFocus: function() {
      this.focused = true;
      // Swallow keyboard change events so homescreen does not resize
      // To be removed in bug 999463
      this.body.addEventListener('keyboardchange',
        this.handleKeyboardChange, true);
    },

    handleOverflow: function() {
      this.currentApp.showDefaultContextMenu();
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
      // Stop swallowing keyboard change events
      // To be removed in bug 999463
      this.body.removeEventListener('keyboardchange',
        this.handleKeyboardChange, true);
    },

    /**
     * Handle app being opened or switched to.
     *
     * @param {Event} e Window manager event.
     * @memberof Rocketbar.prototype
     */
    handleAppChange: function(e) {
      this.currentApp = e.detail;
      this.currentScrollPosition = 0;
      this.handleLocationChange(e);
      this.handleTitleChange(e);
      this.exitHome();
      if (!this.currentApp.isBrowser()) {
        this.collapse();
        this.disableNavigation();
      } else {
        this.expand();
        this.enableNavigation();
      }
      this.hideResults();
    },

    /**
     * Update Rocketbar title.
     *
     * @param {Event} e Window manager event.
     * @memberof Rocketbar.prototype
     */
    handleTitleChange: function(e) {
      if (e.detail instanceof AppWindow && !e.detail.isActive()) {
        return;
      }
      if (e.detail.title) {
        this.titleContent.textContent = e.detail.title;
      } else {
        this.titleContent.textContent = '';
      }
      this.updateSearchIndex();
    },

    /**
     * Handle scroll of web content.
     *
     * @param {Event} e mozbrowserasyncscroll event.
     * @memberof Rocketbar.prototype
     */
    handleScroll: function(e) {
      if (e.detail.manifestURL) {
        return;
      }
      if (this.expanded && !this.focused &&
          e.detail.scrollPosition > this.currentScrollPosition) {
        this.collapse();
      } else if (!this.expanded && e.detail.scrollPosition <
        (this.currentScrollPosition - this.SCROLL_THRESHOLD)) {
        this.expand();
      }
      this.currentScrollPosition = e.detail.scrollPosition;
    },

    /**
    * Update the Rocketbar's input field.
    *
    * @param {Event} e Window manager event.
    * @memberof Rocketbar.prototype
    */
    handleLocationChange: function(e) {
      if (e.detail.config.url && !e.detail.manifestURL) {
        this.input.value = e.detail.config.url;
      } else {
        this.input.value = '';
      }
      this.titleContent.textContent = '';
      this.updateSearchIndex();
      this.deactivate();
    },

    /**
     * Handle press of hardware home button.
     * @memberof Rocketbar.prototype
     */
    handleHome: function() {
      this.hideResults();
      this.enterHome();
      this.deactivate();
    },

    /**
     * Handle touches on the Rocketbar.
     *
     * @param {Event} e Touch event.
     * @memberof Rocketbar.prototype
     */
    handleTouch: function(e) {
      var dy = 0;
      switch (e.type) {
        case 'touchstart':
          this._wasClicked = false;
          this._touchStart = e.touches[0].pageY;
          break;
        case 'touchmove':
          dy = parseInt(e.touches[0].pageY) - parseInt(this._touchStart);
          if (dy > this.EXPANSION_THRESHOLD) {
            this.expand();
          } else if (dy < (this.EXPANSION_THRESHOLD * -1) &&
            !this.onHomescreen) {
            this.collapse();
          }
          if (dy > this.TASK_MANAGER_THRESHOLD &&
              !this.active && !this.cardView && !this.waitingOnCardViewLaunch) {
            this.fireTaskManagerShow();
          }
          break;
        case 'touchend':
          dy = parseInt(e.changedTouches[0].pageY) -
            parseInt(this._touchStart);
          if (dy > (this.EXPANSION_THRESHOLD * -1) &&
              dy < this.EXPANSION_THRESHOLD) {
            this.handleClick();
          }
          this._touchStart = -1;
          break;
      }
    },

    /**
     * Handle clicks on the Rocketbar.
     * @memberof Rocketbar.prototype
     */
    handleClick: function() {
      if (this.active) {
        this.focus();
        return;
      }
      if (this.expanded) {
        this.activate((function() {
          this.focus();
        }).bind(this));
      } else {
        this._wasClicked = true;
        this.expand();
      }
    },

    /**
     * Focus the Rocketbar once expanded if was clicked.
     * @memberof Rocketbar.prototype
     */
    handleTransitionEnd: function() {
      this.transitioning = false;
      if (this.expanded && this._wasClicked) {
        this.activate((function() {
          this.focus();
        }).bind(this));
        this._wasClicked = false;
      }
    },

    /**
     * Handle text input in Roketbar.
     * @memberof Rocketbar.prototype
     */
    handleInput: function() {
      var input = this.input.value;

      this.rocketbar.classList.toggle('hasText', input.length);

      // If the task manager is shown, hide it
      if (this.screen.classList.contains('task-manager')) {
        this.cardView = false;
        window.dispatchEvent(new CustomEvent('taskmanagerhide'));
      }

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
    handleCancel: function(e) {
      this.input.value = '';
      this.handleInput();
      this.deactivate();
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
    },

    /**
     * Handle keyboard change.
     *
     * To be removed in bug 999463.
     * @memberof Rocketbar.prototype
     */
    handleKeyboardChange: function(e) {
      // Swallow event to prevent app being resized
      e.stopImmediatePropagation();
    },

    /**
     * Handle change to sheets stack.
     * @memberof Rocketbar.prototype
     */
    handleStackChanged: function(e) {
      // Focus the Rocketbar in cards view when stack length reaches zero.
      if (this.cardView && e.detail.sheets.length === 0) {
        this.hideResults();
        this.activate((function() {
          this.focus();
        }).bind(this));
      }
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
     * Handles when the search app crashes.
     * @memberof Rocketbar.prototype
     */
    handleSearchCrashed: function(e) {
      if (this.searchWindow) {
        this.searchWindow = null;
      }
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
        app.connect('search').then(
          function onConnectionAccepted(ports) {
            ports.forEach(function(port) {
              self._port = port;
            });
            if (self._pendingMessage) {
              self.handleSearchMessage(self._pendingMessage);
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
    handleSearchMessage: function(e) {
      // Open the search connection if we receive a message before it's open
      if (!this._port) {
        this._pendingMessage = e;
        this.initSearchConnection();
        return;
      }
      switch (e.detail.action) {
        case 'render':
          this.activate(this.focus.bind(this));
          break;
        case 'input':
          this.input.value = e.detail.input;
          this.focus();
          this.handleInput();
          break;
        case 'request-screenshot':
          places.screenshotRequested(e.detail.url);
          break;
        case 'hide':
          this.hideResults();
          this.collapse();
          this.deactivate();
          break;
      }
    },

    /**
    * Reset the Rocketbar after completion of FTU
    * @memberof Rocketbar.prototype
    */
    handleFTUDone: function() {
      this.clear();
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
