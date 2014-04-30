'use strict';
/* global SettingsListener, AppWindow, SearchWindow, places */

/**
 * The Rocketbar is a system-wide URL/search/title bar.
 */
var Rocketbar = {

  /* Configuration */
  EXPANSION_THRESHOLD: 5, // How many pixels of swipe triggers expand/collapse
  TASK_MANAGER_THRESHOLD: 200, // How many pixels of swipe triggers card view
  SCROLL_THRESHOLD: 5, // How many pixels of scroll triggers expand

  /**
   * Initialise Rocketbar
   */
  init: function() {
    // States
    this.enabled = false;
    this.expanded = false;
    this.transitioning = false;
    this.focused = false;
    this.active = false;
    this.onHomescreen = false;
    this.newTabPage = false;
    this.cardView = false;

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
    this.results = document.getElementById('rocketbar-results');
    this.backdrop = document.getElementById('rocketbar-backdrop');

    // Listen for settings changes
    SettingsListener.observe('rocketbar.enabled', false,
      function(value) {
      if (value) {
        this.enable();
      } else {
        this.disable();
      }
    }.bind(this));
  },

  /**
   * Enable Rocketbar.
   */
  enable: function() {
    this.addEventListeners();
    this.body.classList.add('rb-enabled');
    this.enabled = true;
  },

  /**
   * Disable Rocketbar.
   */
  disable: function() {
    this.removeEventListeners();
    this.body.classList.remove('rb-enabled');
    this.enabled = false;
  },

  /**
   * Put Rocketbar in the active state.
   *
   * Input is displayed, title is hidden and search app is loaded, input
   * not always focused.
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
    this.loadSearchApp(callback);
    this.screen.classList.add('rocketbar-focused');
  },

  /**
   * Take Rocketbar out of active state.
   *
   * Title is displayed, input is hidden, input is always blurred.
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
  },

  /**
   * Add event listeners. Only called when Rocketbar is turned on.
   */
  addEventListeners: function() {
    // Listen for events from window manager
    window.addEventListener('apploading', this);
    window.addEventListener('appforeground', this);
    window.addEventListener('apptitlechange', this);
    window.addEventListener('applocationchange', this);
    window.addEventListener('appscroll', this);
    window.addEventListener('home', this);
    window.addEventListener('cardviewclosedhome', this);
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
   */
  handleEvent: function(e) {
    switch(e.type) {
      case 'apploading':
      case 'appforeground':
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
      case 'searchcrashed':
        this.handleSearchCrashed(e);
        break;
      case 'touchstart':
      case 'touchmove':
      case 'touchend':
        if (e.target != this.cancel) {
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
   */
  removeEventListeners: function() {
    // Stop listening for events from window manager
    window.removeEventListener('apploading', this);
    window.removeEventListener('appforeground', this);
    window.removeEventListener('apptitlechange', this);
    window.removeEventListener('applocationchange', this);
    window.removeEventListener('home', this);
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
    this.form.removeEventListener('submit', this);
    this.backdrop.removeEventListener('click', this);

    // Stop listening for messages from search app
    window.removeEventListener('iac-search-results', this);
  },

  /**
   * Set URL and generate manifest URL of search app.
   */
  setSearchAppURL: function(url) {
    this._searchAppURL = url;
    this._searchManifestURL = url ? url.match(/(^.*?:\/\/.*?\/)/)[1] +
      'manifest.webapp' : '';
  },

  /**
   * Put Rocketbar in expanded state.
   */
  expand: function() {
    if (this.expanded || this.transitioning) {
      return;
    }
    this.transitioning = true;
    this.rocketbar.classList.add('expanded');
    this.screen.classList.add('rocketbar-expanded');
    this.expanded = true;
  },

  /**
   * Take Rocketbar out of expanded state, into status state.
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
  },

  /**
   * Take Rocketbar out of homescreen state.
   */
  exitHome: function() {
    if (!this.onHomescreen) {
      return;
    }
    this.onHomescreen = false;
  },

  /**
   * Show the Rocketbar results pane.
   */
  showResults: function() {
    this.results.classList.remove('hidden');
  },

  /**
   * Hide the Rocketbar results pane.
   */
  hideResults: function() {
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
    this.titleContent.textContent =
      navigator.mozL10n.get('search-or-enter-address');
  },

  /**
   * Show the task manager and clear Rocketbar.
   */
  showTaskManager: function() {
    this.cardView = true;
    if (this._port) {
      this._port.postMessage({
        action: 'showTaskManager'
      });
    }
    this.showResults();
    window.dispatchEvent(new CustomEvent('taskmanagershow'));
    this.clear();
  },

  /**
   * Show New Tab Page.
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
   * Focus Rocketbar input.
   */
  focus: function() {
    this.input.focus();
    this.input.select();
  },

  /**
   * Handle a focus event.
   */
  handleFocus: function() {
    this.focused = true;
    // Swallow keyboard change events so homescreen does not resize
    // To be removed in bug 999463
    this.body.addEventListener('keyboardchange',
      this.handleKeyboardChange, true);
  },

  /**
   * Blur Rocketbar input.
   */
  blur: function() {
    this.input.blur();
  },

  /**
   * Handle a blur event.
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
   */
  handleAppChange: function(e) {
    this.currentScrollPosition = 0;
    this.handleLocationChange(e);
    this.handleTitleChange(e);
    this.exitHome();
    if (e.detail.manifestURL) {
      this.collapse();
    } else {
      this.expand();
    }
    this.hideResults();
  },

  /**
   * Update Rocketbar title.
   *
   * @param {Event} e Window manager event.
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
            !this.active && !this.cardView) {
          this.showTaskManager();
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
   */
  handleInput: function() {
    var input = this.input.value;
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

    this._port.postMessage({
      action: 'change',
      input: input
    });
  },

  /**
   * Handle click of cancel button.
   */
  handleCancel: function(e) {
    this.deactivate();
    this.hideResults();
  },

  /**
   * Handle submission of the Rocketbar.
   *
   * @param {Event} e Submit event.
   */
  handleSubmit: function(e) {
    e.preventDefault();
    this._port.postMessage({
      action: 'submit',
      input: this.input.value
    });
  },

  /**
   * Handle keyboard change.
   *
   * To be removed in bug 999463.
   */
  handleKeyboardChange: function(e) {
    // Swallow event to prevent app being resized
    e.stopImmediatePropagation();
  },

  /**
   * Handle change to sheets stack.
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
   * Instantiates a new SearchWindow
   */
  loadSearchApp: function(callback) {
    if (!this.searchWindow) {
      this.searchWindow = new SearchWindow();
    }

    this.initSearchConnection(callback);
  },

  /**
   * Handles when the search app crashes.
   */
  handleSearchCrashed: function(e) {
    if (this.searchWindow) {
      this.searchWindow = null;
    }
  },

  /**
   * Initialise inter-app connection with search app.
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
   */
  handleSearchMessage: function(e) {
    // Open the search connection if we receive a message before it's open
    if (!this._port) {
      this._pendingMessage = e;
      this.initSearchConnection();
      return;
    }
    switch (e.detail.action) {
      case 'input':
        Rocketbar.input.value = e.detail.input;
        break;
      case 'request-screenshot':
        places.screenshotRequested(e.detail.url);
        break;
      case 'hide':
        this.hideResults();
        this.collapse();
        break;
    }
  },

  /**
  * Reset the Rocketbar after completion of FTU
  */
  handleFTUDone: function() {
    this.clear();
  },

  /**
   * Tell the search app to update its index.
   */
  updateSearchIndex: function() {
    if (this._port) {
      this._port.postMessage({
        action: 'syncPlaces'
      });
    }
  }
};
