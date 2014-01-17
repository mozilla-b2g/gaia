'use strict';

var Rocketbar = {

  /**
   * Proportion of statusbar which can trigger Rocketbar.
   */
  triggerWidth: 0.67,

  /**
   * URL of search app.
   */
  searchAppURL: null,

  /**
   * Inter-app communications API port
   */
  _port: null,

  /**
   * Rocketbar states.
   */
  expanded: false,
  focused: false,

  /**
   * DOM elements.
   */
  screen: document.getElementById('screen'),
  statusbar: document.getElementById('statusbar'),
  form: document.getElementById('rocketbar'),
  input: document.getElementById('rocketbar-input'),
  resetButton: document.getElementById('rocketbar-reset'),
  cancelButton: document.getElementById('rocketbar-cancel'),
  results: document.getElementById('rocketbar-results'),

  /**
   * Initlialise Rocketbar.
   */
  init: function() {
    // IACHandler will dispatch inter-app messages
    window.addEventListener('iac-search-results',
      this.onSearchMessage.bind(this));

    // Events from window manager
    window.addEventListener('applocationchange',
      this.updateLocation.bind(this));
    window.addEventListener('cardchange', this.updateTitle.bind(this));
    window.addEventListener('apploading', this.updateTitle.bind(this));
    window.addEventListener('appforeground', this.updateTitle.bind(this));
    window.addEventListener('apptitlechange', this.updateTitle.bind(this));
    window.addEventListener('appopened', this.collapse.bind(this));
    window.addEventListener('cardviewclosed', this);
    window.addEventListener('cardviewclosedhome', this.collapse.bind(this));
    window.addEventListener('home', this.handleHome.bind(this));

    // Events from Rocketbar
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.input.addEventListener('focus', this.handleFocus.bind(this));
    this.input.addEventListener('blur', this.handleBlur.bind(this));
    this.cancelButton.addEventListener('click', this.handleCancel.bind(this));
    this.resetButton.addEventListener('click', this.handleReset.bind(this));

    // Settings changes
    SettingsListener.observe('rocketbar.searchAppURL', false,
    function(url) {
      this.searchAppURL = url;
      this.searchManifestURL = url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp';
    }.bind(this));

  },

  /**
   * Inserts the search app iframe into the DOM.
   */
  loadSearchApp: function() {
    var results = this.results;
    var searchFrame = results.querySelector('iframe');

    // If there is already a search frame, tell it that it is
    // visible and bail out.
    if (searchFrame && searchFrame.setVisible) {
      searchFrame.setVisible(true);
      return;
    }

    searchFrame = document.createElement('iframe');
    searchFrame.src = this.searchAppURL;
    searchFrame.setAttribute('mozapptype', 'mozsearch');
    searchFrame.setAttribute('mozbrowser', 'true');
    searchFrame.setAttribute('remote', 'true');
    searchFrame.setAttribute('mozapp', this.searchManifestURL);
    searchFrame.classList.add('hidden');

    results.appendChild(searchFrame);

    searchFrame.addEventListener('mozbrowsererror', function() {
      results.removeChild(searchFrame);
    });

    searchFrame.addEventListener('mozbrowserloadend', function() {
      searchFrame.classList.remove('hidden');
    });

    this.initSearchConnection();
  },

  /**
   * Initialise inter-app communications API connection to search app.
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
          if (self.pendingEvent) {
            self.onSearchMessage(self.pendingEvent);
            delete self.pendingEvent;
          }
        },
        function onConnectionRejected(reason) {
          dump('Error connecting: ' + reason + '\n');
        }
      );
    };
  },

  /**
   * Handle messages from search app.
   *
   * @param {Event} e Message event.
   */
  onSearchMessage: function(e) {
    // Open the search connection if we receive a message before it's open
    if (!this._port) {
      this.pendingEvent = e;
      this.initSearchConnection();
      return;
    }

    var detail = e.detail;
    if (detail.action) {
      switch (e.type) {
        case 'hide':
          this.collapse();
          return;
      }
    } else if (detail.input) {
      this.input.value = detail.input;
      this._port.postMessage({ action: 'change', input: input.value });
    }
  },

  /**
   * Expand Rocketbar into expanded state.
   */
  expand: function() {
    if (LockScreen.locked || this.expanded)
      return;

    this.statusbar.classList.add('expanded');
    this.expanded = true;
    this.showResults();
    this.showTaskManager();
    this.loadSearchApp();
    this.updateResetButton();

    // If we have a port, send a message to clear the search app
    if (this._port) {
      this._port.postMessage({
        action: 'clear'
      });
    }

    document.body.addEventListener('keyboardchange',
      this.handleKeyboardChange, true);
  },

  /**
   * Collapse Rocketbar into status state.
   */
  collapse: function(e) {
    if (!this.expanded)
      return;

    this.statusbar.classList.remove('expanded');
    this.expanded = false;
    this.hideResults();
    this.hideTaskManager();

    var searchFrame = this.results.querySelector('iframe');
    if (searchFrame && searchFrame.setVisible) {
      searchFrame.setVisible(false);
    }

    this.input.blur();

    setTimeout(function nextTick() {
      this._port.postMessage({
        action: 'clear'
      });
    }.bind(this));

    document.body.removeEventListener('keyboardchange',
      this.handleKeyboardChange, true);
  },

  /**
   * Show task manager.
   */
  showTaskManager: function() {
    if (!this.screen.classList.contains('task-manager'))
      window.dispatchEvent(new CustomEvent('taskmanagershow'));
  },

  /**
   * Hide task manager.
   */
  hideTaskManager: function() {
    if (this.screen.classList.contains('task-manager'))
      window.dispatchEvent(new CustomEvent('taskmanagerhide'));
  },

  /**
   * Show Rocketbar results pane.
   */
  showResults: function() {
    this.results.classList.remove('hidden');
  },

    /**
   * Hide Rocketbar results pane.
   */
  hideResults: function() {
    this.results.classList.add('hidden');
  },

  /**
   * Update Rocketbar title.
   */
  updateTitle: function(e) {
    if (e && e.detail && e.detail.title) {
      this.input.value = e.detail.title;
    } else {
      this.input.value = '';
    }

    if (e.type == 'apptitlechange' && this._port) {
      this._port.postMessage({
        action: 'syncPlaces'
      });
    }
  },

  /**
   *  Update Rocketbar location.
   */
  updateLocation: function() {
    if (this._port) {
      this._port.postMessage({
        action: 'syncPlaces'
      });
    }
  },

  /**
   * Handle Rocketbar text input.
   */
  handleInput: function() {
    this.updateResetButton();
    this._port.postMessage({
      action: 'change',
      input: this.input.value
    });
  },

  /**
   * Handle Rocketbar cancel button press.
   */
  handleCancel: function() {
      this.input.value = '';
      this.collapse();
  },

  /**
   * Handle reset button press.
   */
  handleReset: function() {
    this.input.value = '';
    this.updateResetButton();
  },

  /**
   * Handle Rocketbar form submission.
   *
   * @param {Event} e The submit event.
   */
  handleSubmit: function(e) {
    e.preventDefault();
    this._port.postMessage({
      action: 'submit',
      input: this.input.value
    });
  },

  /**
   * Handle focus on Rocketbar input.
   *
   * @param {Event} e The focus event.
   */
  handleFocus: function(e) {
    this.input.value = '';
    this.hideTaskManager();
    this.focused = true;
    this.updateResetButton();
  },

  /**
   * Handle blur on Rocketbar input.
   *
   * @param {Event} e The blur event.
   */
  handleBlur: function(e) {
    this.focused = false;
  },

  /**
   * Displays or hides the reset button as necessary.
   */
  updateResetButton: function() {
    if (this.input.value && this.focused) {
      this.resetButton.classList.remove('hidden');
    } else {
      this.resetButton.classList.add('hidden');
    }
  },

  /**
   * Handle going home.
   */
  handleHome: function() {
    this.input.value = '';
  },

  /**
   * Handle change to keyboard state.
   *
   * @param {Event} e keyboardchange event.
   */
  handleKeyboardChange: function(e) {
    // When the keyboard is opened make sure to not resize
    // the current app by swallowing the event.
    e.stopImmediatePropagation();
    return;
  }
};

Rocketbar.init();
