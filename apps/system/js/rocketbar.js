'use strict';

var Rocketbar = {

  enabled: false,

  /**
   * Either 'search' or 'tasks'.
   * Let us know how the rocketbar was opened.
   */
  home: 'search',

  /**
   * How much room on the statusbar will trigger the rocketbar
   * when tapped on.
   */
  triggerWidth: 0.65,

  /**
   * Minimum swipe to activate the task manager.
   * This is a % of the total screen height.
   */
  swipeThreshold: 0.10,

  /**
   * Current pointer position of a statusbar swipe.
   */
  pointerY: 0,

  /**
   * Height of the screen.
   * Currently passed into and populated by the render method.
   */
  screenHeight: 0,

  searchAppURL: null,

  _port: null,

  screen: document.getElementById('screen'),

  searchContainer: document.getElementById('search-container'),

  searchBar: document.getElementById('search-bar'),

  searchCancel: document.getElementById('search-cancel'),

  searchReset: document.getElementById('search-reset'),

  searchForm: document.getElementById('search-form'),

  get shown() {
    return ('visible' in this.searchBar.dataset);
  },

  get searchInput() {
    var input = document.getElementById('search-input');
    var self = this;
    input.addEventListener('input', function onInput(e) {
      if (!input.value) {
        self.searchReset.classList.add('hidden');
      } else {
        self.searchReset.classList.remove('hidden');
      }
      self._port.postMessage({
        action: 'change',
        input: input.value
      });
    });
    this.searchForm.addEventListener('submit', function onSubmit(e) {
      e.preventDefault();
      self._port.postMessage({
        action: 'submit',
        input: input.value
      });
    });

    delete this.searchInput;
    return this.searchInput = input;
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'cardchange':
        this.searchInput.value = e.detail.title;

        // Every app/browser has a title.
        // If there is no title, there are no cards shown.
        // We should focus on the rocketbar.
        if (this.shown && !e.detail.title) {
          this.searchInput.focus();
        }
        return;
      case 'keyboardchange':
        // When the keyboard is opened make sure to not resize
        // the current app by swallowing the event.
        e.stopImmediatePropagation();
        return;
      case 'apptitlechange':
      case 'applocationchange':
        // Send a message to the search app to notify if
        // of updates to places data
        if (this._port) {
          this._port.postMessage({
            action: 'syncPlaces'
          });
        }
      default:
        break;
    }

    switch (e.target.id) {
      case 'search-cancel':
        e.preventDefault();
        e.stopPropagation();
        // Show the card switcher again if we opened the rocketbar
        // in task manager mode. There needs to be a current card.
        var runningApps = AppWindowManager.getRunningApps();
        if (!this.screen.classList.contains('task-manager') &&
            this.home === 'tasks' && Object.keys(runningApps).length > 1) {
          window.dispatchEvent(new CustomEvent('taskmanagershow'));
          // Send a message to the search app to clear results
          if (this._port) {
            this._port.postMessage({
              action: 'clear'
            });
          }
        } else {
          window.dispatchEvent(new CustomEvent('taskmanagerhide'));
          this.hide();
        }
        break;
      case 'search-reset':
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('taskmanagerhide'));
        this.searchInput.value = '';
        this.searchReset.classList.add('hidden');
        break;
      case 'search-input':
        window.dispatchEvent(new CustomEvent('taskmanagerhide'));
        // If the current text is not a URL, clear it.
        if (UrlHelper.isNotURL(this.searchInput.value)) {
          this.searchInput.value = '';
        }
        break;
      default:
        break;
    }
  },

  init: function() {
    // IACHandler will dispatch inter-app messages
    window.addEventListener('iac-search-results',
      this.onSearchMessage.bind(this));

    // Hide task manager when we focus on search bar
    this.searchInput.addEventListener('focus', this);

    window.addEventListener('cardchange', this);
    window.addEventListener('apptitlechange', this);
    window.addEventListener('applocationchange', this);

    this.searchCancel.addEventListener('click', this);
    // Prevent default on mousedown
    this.searchReset.addEventListener('mousedown', this);
    // Listen to clicks to keep the keyboard up
    this.searchReset.addEventListener('click', this);

    SettingsListener.observe('rocketbar.enabled', false,
    function(value) {
      if (value) {
        document.body.classList.add('rb-enabled');
      } else {
        document.body.classList.remove('rb-enabled');
      }
      this.enabled = value;
    }.bind(this));

    SettingsListener.observe('rocketbar.searchAppURL', false,
    function(url) {
      this.searchAppURL = url;
      this.searchManifestURL = url.match(/(^.*?:\/\/.*?\/)/)[1] +
        'manifest.webapp';
    }.bind(this));
  },

  /**
   * Inserts the search app iframe into the dom.
   */
  loadSearchApp: function() {
    var container = this.searchContainer;
    var searchFrame = container.querySelector('iframe');

    // If there is already a search frame, tell it that it is
    // visible and bail out.
    if (searchFrame) {
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

    container.appendChild(searchFrame);

    searchFrame.addEventListener('mozbrowsererror', function() {
      container.removeChild(searchFrame);
    });

    searchFrame.addEventListener('mozbrowserloadend', function() {
      searchFrame.classList.remove('hidden');
    });

    this.initSearchConnection();
  },

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

  onSearchMessage: function(e) {
    // Open the search connection if we receive a message before it's open
    if (!this._port) {
      this.pendingEvent = e;
      this.initSearchConnection();
      return;
    }

    var detail = e.detail;
    if (detail.action) {
      this[detail.action]();
    } else if (detail.input) {
      var input = this.searchInput;
      input.value = detail.input;
      this._port.postMessage({ action: 'change', input: input.value });
    }
  },

  /**
   * Hides the rocketbar.
   * @param {String} event type that triggers the hide.
   */
  hide: function(evtType) {
    if (!this.shown)
      return;

    if (evtType === 'appopening') {
      this.searchBar.style.display = 'none';
    }

    document.body.removeEventListener('keyboardchange', this, true);

    this.searchInput.blur();

    var searchFrame = this.searchContainer.querySelector('iframe');
    if (searchFrame) {
      searchFrame.setVisible(false);
    }
    delete this.searchBar.dataset.visible;

    window.dispatchEvent(new CustomEvent('rocketbarhidden'));
  },

  /**
   * Renders the rocketbar.
   * @param {Integer} height of the screen in pixels.
   */
  render: function(height) {
    this.screenHeight = height;
    if (this.shown) {
      return;
    }

    // If we have a port, send a message to clear the search app
    if (this._port) {
      this._port.postMessage({
        action: 'clear'
      });
    }

    document.body.addEventListener('keyboardchange', this, true);

    this.searchReset.classList.add('hidden');

    // We need to ensure the rocketbar is visible before we transition it.
    // This is why we wait for the next tick to start the traisition.
    this.searchBar.style.display = 'block';
    setTimeout(this.startTransition.bind(this));
  },

  /**
   * Starts the transition of the rocketbar
   */
  startTransition: function() {
    var search = this.searchBar;
    search.dataset.visible = 'true';
    search.style.visibility = 'visible';

    var input = this.searchInput;
    input.value = '';

    window.dispatchEvent(new CustomEvent('rocketbarshown'));

    var self = this;
    search.addEventListener('transitionend', function shown(e) {
      search.removeEventListener(e.type, shown);

      if (self.pointerY > self.swipeThreshold * self.screenHeight) {
        self.home = 'tasks';
        window.dispatchEvent(new CustomEvent('taskmanagershow'));
      } else {
        self.home = 'search';
        // Only focus for search views
        input.focus();
      }
      self.loadSearchApp();
    });
  }
};

Rocketbar.init();
