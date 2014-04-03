'use strict';
/* global SettingsListener, AppWindow */

/**
 * The Rocketbar is a system-wide URL/search/title bar.
 */
var Rocketbar = {

  /* Configuration */
  EXPANSION_THRESHOLD: 5, // How many pixels of swipe triggers expand/collapse
  TASK_MANAGER_THRESHOLD: 200, // How many pixels of swipe triggers card view

  /**
   * Initialise Rocketbar
   */
  init: function() {
    // States
    this.enabled = false;
    this.expanded = false;
    this.focused = false;

    // Properties
    this._searchAppURL = null;
    this._searchManifestURL = null;
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
    this.results = document.getElementById('rocketbar-results');

    // Listen for events from window manager
    window.addEventListener('apploading', this.handleAppChange.bind(this));
    window.addEventListener('appforeground', this.handleAppChange.bind(this));
    window.addEventListener('apptitlechange',
      this.handleTitleChange.bind(this));
    window.addEventListener('applocationchange',
      this.handleLocationChange.bind(this));
    window.addEventListener('home', this.handleHome.bind(this));
    window.addEventListener('cardviewclosedhome', this.handleHome.bind(this));
    window.addEventListener('appopened', this.collapse.bind(this));
    window.addEventListener('cardviewclosed',
      this.handleCardViewClosed.bind(this));

    // Listen for events from Rocketbar
    this.rocketbar.addEventListener('touchstart', this.handleTouch.bind(this));
    this.rocketbar.addEventListener('touchmove', this.handleTouch.bind(this));
    this.rocketbar.addEventListener('touchend', this.handleTouch.bind(this));
    this.rocketbar.addEventListener('transitionend',
      this.handleTransitionEnd.bind(this));
    this.input.addEventListener('blur', this.blur.bind(this));
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    // Listen for messages from search app
    window.addEventListener('iac-search-results',
      this.handleSearchMessage.bind(this));

    // Listen for settings changes
    SettingsListener.observe('rocketbar.enabled', false,
      function(value) {
      if (value) {
        this.enable();
      } else {
        this.disable();
      }
    }.bind(this));
    SettingsListener.observe('rocketbar.searchAppURL', '',
      this.setSearchAppURL.bind(this));
  },

  /**
   * Enable Rocketbar.
   */
  enable: function() {
    this.body.classList.add('rb-enabled');
    this.enabled = true;
  },

  /**
   * Disable Rocketbar.
   */
  disable: function() {
    this.body.classList.remove('rb-enabled');
    this.enabled = false;
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
    if (this.expanded) {
      return;
    }
    this.rocketbar.classList.add('expanded');
    this.expanded = true;
    window.dispatchEvent(new CustomEvent('rocketbarexpand'));
  },

  /**
   * Take Rocketbar out of expanded state, into status state.
   */
  collapse: function() {
    if (!this.expanded) {
      return;
    }
    this.expanded = false;
    this.rocketbar.classList.remove('expanded');
    this.hideResults();
    this.blur();
    window.dispatchEvent(new CustomEvent('rocketbarcollapse'));
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
   * Show the task manager and clear Rocketbar.
   */
  showTaskManager: function() {
    this.showResults();
    window.dispatchEvent(new CustomEvent('taskmanagershow'));
    this.input.value = '';
    this.titleContent.textContent = navigator.mozL10n.get('search');
  },

  /**
   * Put Rocketbar in focused state.
   */
  focus: function() {
    // Swallow keyboard change event so homescreen does not resize
    this.body.addEventListener('keyboardchange',
      this.handleKeyboardChange.bind(this), true);
    this.title.classList.add('hidden');
    this.form.classList.remove('hidden');
    this.input.select();
    this.focused = true;
    this.loadSearchApp();
  },

  /**
   * Take Rocketbar out of focused state.
   */
  blur: function() {
    if (!this.results.classList.contains('hidden')) {
      return;
    }
    // Swallow keyboard change event so homescreen does not resize
    this.body.removeEventListener('keyboardchange',
      this.handleKeyboardChange.bind(this), true);
    this.input.blur();
    this.title.classList.remove('hidden');
    this.form.classList.add('hidden');
    this.focused = false;
  },

  /**
   * Handle app being opened or switched to.
   *
   * @param {Event} e Window manager event.
   */
  handleAppChange: function(e) {
    this.handleLocationChange(e);
    this.handleTitleChange(e);
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
  },

  /**
   * Handle press of hardware home button.
   */
  handleHome: function() {
    this.titleContent.textContent = navigator.mozL10n.get('search');
    this.input.value = '';
    this.hideResults();
    this.collapse();
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
        } else if (dy < (this.EXPANSION_THRESHOLD * -1)) {
          this.collapse();
        }
        if (dy > this.TASK_MANAGER_THRESHOLD && !this.focused) {
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
    if (this.expanded && !this.focused) {
      this.focus();
    } else {
      this._wasClicked = true;
      this.expand();
    }
  },

  /**
   * Focus the Rocketbar once expanded if was clicked.
   */
  handleTransitionEnd: function() {
    if (this.expanded && this._wasClicked) {
      this.focus();
    }
  },

  /**
   * Handle text input in Roketbar.
   */
  handleInput: function() {
    var input = this.input.value;
    // If the task manager is shown, hide it
    if (this.screen.classList.contains('task-manager')) {
      window.dispatchEvent(new CustomEvent('taskmanagerhide'));
    }

    // If there is input and results are hidden, show them
    if (input && this.results.classList.contains('hidden')) {
      this.showResults();
    } else if (!input && !this.results.classList.contains('hidden')) {
      this.hideResults();
    }

    this._port.postMessage({
      action: 'change',
      input: input
    });
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
   */
  handleKeyboardChange: function(e) {
    // Swallow event to prevent app being resized
    e.stopImmediatePropagation();
  },

  /**
   * Handle card view being closed.
   *
   * @param {Event} e cardviewclosed event.
   */
  handleCardViewClosed: function(e) {
    // If closed because no more cards, focus the Rocketbar.
    if (e.detail == null) {
      this.focus();
    }
  },

  /**
   * Insert the search app iframe into the DOM.
   */
  loadSearchApp: function() {
    var container = this.results;
    var searchFrame = container.querySelector('iframe');

    // If there is already a search frame, tell it that it is
    // visible and bail out.
    if (searchFrame && searchFrame.setVisible) {
      searchFrame.setVisible(true);
      return;
    }

    searchFrame = document.createElement('iframe');
    searchFrame.id = 'rocketbar-results-frame';
    searchFrame.src = this._searchAppURL;
    searchFrame.setAttribute('mozapptype', 'mozsearch');
    searchFrame.setAttribute('mozbrowser', 'true');
    searchFrame.setAttribute('remote', 'true');
    searchFrame.setAttribute('mozapp', this._searchManifestURL);
    searchFrame.classList.add('hidden');

    container.appendChild(searchFrame);

    searchFrame.addEventListener('mozbrowsererror', function() {
      container.removeChild(searchFrame);
    });

    searchFrame.addEventListener('mozbrowserloadend', function() {
      searchFrame.classList.remove('hidden');
    });

    this.initSearchConnection();
  },

  /**
   * Initialise inter-app connection with search app.
   */
  initSearchConnection: function() {
    var self = this;
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
    var detail = e.detail;
    if (detail.input) {
      Rocketbar.input.value = detail.input;
    } else if (detail.action && detail.action == 'hide') {
      this.hideResults();
      this.collapse();
    }
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
