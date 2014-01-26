'use strict';

function Rocketbar(searchAppURL, searchManifestURL) {

  this.searchAppURL = searchAppURL;
  this.searchManifestURL = searchManifestURL;

  this.instanceID = 'rocketbar';
  this.setBrowserConfig(searchManifestURL);
  this.render();
  this.publish('created');
  return this;
}

Rocketbar.REGISTERED_EVENTS = [];

Rocketbar.SUB_COMPONENTS = {};

Rocketbar.prototype = {
  __proto__: AppWindow.prototype,

  _DEBUG: false,

  CLASS_NAME: 'Rocketbar',

  openAnimation: 'zoom-out',

  closeAnimation: 'zoom-in',

  eventPrefix: 'rocketbar',

  /**
   * Construct browser config object by manifestURL.
   * @param {String} manifestURL The manifestURL of rocketbar.
   */
  setBrowserConfig: function(manifestURL) {
    var app = Applications.getByManifestURL(manifestURL);
    this.origin = app.origin;
    this.manifestURL = app.manifestURL;
    this.url = app.origin + '/index.html#root';

    this.browser_config =
      new BrowserConfigHelper(this.origin, this.manifestURL);

    this.manifest = this.browser_config.manifest;
    // XXX: Remove this hardcode
    this.browser_config.url = this.url;
    this.browser_config.isRocketbar = true;
    this.config = this.browser_config;
    this.isRocketbar = true;
  },

  /**
   * Either 'search' or 'tasks'.
   * Let us know how the rocketbar was opened.
   */
  home: 'search',

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

  _input: null,

  get searchInput() {
    if (this.__input) {
      return this._input;
    }

    var input = document.getElementById('search-input');
    var self = this;
    input.addEventListener('input', function onInput(e) {
      if (!input.value) {
        self.searchReset.classList.add('hidden');
      } else {
        self.searchReset.classList.remove('hidden');
      }

      // If the task manager is shown, hide it
      if (this.screen.classList.contains('task-manager')) {
        window.dispatchEvent(new CustomEvent('taskmanagerhide'));
      }

      self._port.postMessage({
        action: 'change',
        input: input.value
      });
    }.bind(this));
    this.searchForm.addEventListener('submit', function onSubmit(e) {
      e.preventDefault();
      self._port.postMessage({
        action: 'submit',
        input: input.value
      });
    });
    this._input = input;
    return input;
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'cardchange':
        this.searchInput.value = e.detail.title;
        return;
      case 'cardviewclosedhome':
        // Stop listeneing for cardviewclosed if we pressed the home button.
        // This is necessary due to keeping backwards compatability with the
        // existing card view, without having to rewrite it.
        // Bug 963616 has been filed to clean this up.
        window.removeEventListener('cardviewclosed', this);
        window.setTimeout(function nextTick() {
          window.addEventListener('cardviewclosed', this);
        }.bind(this));
        this.hide();
        return;
      case 'cardviewclosed':
          if (this.shown) {
            this.searchInput.focus();
          }
        return;
      case 'keyboardchange':
        // When the keyboard is opened make sure to not resize
        // the current app by swallowing the event.
        e.stopImmediatePropagation();
        return;
      case 'home':
      case 'appopened':
        this.hide();
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
        if (e.type === 'blur') {
          this.screen.classList.remove('rocketbar-focus');
          return;
        }
        this.screen.classList.add('rocketbar-focus');

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

    this.searchInput.addEventListener('blur', this);

    window.addEventListener('apptitlechange', this);
    window.addEventListener('applocationchange', this);
    window.addEventListener('appopened', this);
    window.addEventListener('cardchange', this);
    window.addEventListener('cardviewclosed', this);
    window.addEventListener('cardviewclosedhome', this);
    window.addEventListener('home', this);

    this.searchCancel.addEventListener('click', this);
    // Prevent default on mousedown
    this.searchReset.addEventListener('mousedown', this);
    // Listen to clicks to keep the keyboard up
    this.searchReset.addEventListener('click', this);
  },

  /**
   * Inserts the search app iframe into the dom.
   */
  loadSearchApp: function() {
    var container = this.searchContainer;
    var searchFrame = container.querySelector('iframe');

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
  hide: function() {
    if (!this.shown)
      return;

    document.body.removeEventListener('keyboardchange', this, true);

    this.searchInput.blur();

    var searchFrame = this.searchContainer.querySelector('iframe');
    if (searchFrame && searchFrame.setVisible) {
      searchFrame.setVisible(false);
    }
    delete this.searchBar.dataset.visible;
    this.searchBar.style.display = 'none';

    window.dispatchEvent(new CustomEvent('rocketbarhidden'));

    setTimeout(function nextTick() {
      this._port.postMessage({
        action: 'clear'
      });
    }.bind(this));
  },

  /**
   * Renders the rocketbar.
   * @param {Object} Rocketbar configuration.
   * - config.home, tasks to launch the task manager.
   */
  render: function(config) {
    if (LockScreen.locked) {
      return;
    }

    if (this.shown) {
      return;
    }

    config = config || {};

    var input = this.searchInput;
    input.value = '';

    if (config.home === 'tasks') {
      this.home = 'tasks';
      window.dispatchEvent(new CustomEvent('taskmanagershow'));
    } else {
      this.home = 'search';
    }

    // If we have a port, send a message to clear the search app
    if (this._port) {
      this._port.postMessage({
        action: 'clear'
      });
    }

    document.body.addEventListener('keyboardchange', this, true);

    this.searchReset.classList.add('hidden');

    this.searchBar.style.display = 'block';

    var search = this.searchBar;
    search.dataset.visible = 'true';
    search.style.visibility = 'visible';

    window.dispatchEvent(new CustomEvent('rocketbarshown'));

    this.loadSearchApp();

    if (this.home === 'search') {
      // Only focus for search views
      input.focus();
    }

  }
};
