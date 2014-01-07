'use strict';

var Rocketbar = {

  enabled: false,

  searchAppURL: null,

  _port: null,

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
        'type': 'change',
        'input': input.value
      });
    });
    this.searchForm.addEventListener('submit', function onSubmit(e) {
      e.preventDefault();
      self._port.postMessage({
        'type': 'submit',
        'input': input.value
      });
    });

    delete this.searchInput;
    return this.searchInput = input;
  },

  handleEvent: function(e) {
    switch (e.type) {
      case 'keyboardchange':
        // When the keyboard is opened make sure to not resize
        // the current app by swallowing the event.
        e.stopImmediatePropagation();
        return;
      default:
        break;
    }

    switch (e.target.id) {
      case 'search-cancel':
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        break;
      case 'search-reset':
        e.preventDefault();
        e.stopPropagation();
        this.searchInput.value = '';
        this.searchReset.classList.add('hidden');
        break;
      default:
        break;
    }
  },

  init: function() {
    // IACHandler will dispatch inter-app messages
    window.addEventListener('iac-search-results',
      this.onSearchMessage.bind(this));

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
      this._port.postMessage({ 'input': input.value });
    }
  },

  hide: function() {
    if (!this.shown)
      return;

    document.body.removeEventListener('keyboardchange', this, true);

    this.searchInput.blur();

    var searchFrame = this.searchContainer.querySelector('iframe');
    if (searchFrame) {
      searchFrame.setVisible(false);
    }
    delete this.searchBar.dataset.visible;

    window.dispatchEvent(new CustomEvent('rocketbarhidden'));
  },

  render: function() {
    if (this.shown) {
      return;
    }

    document.body.addEventListener('keyboardchange', this, true);

    var search = this.searchBar;
    search.dataset.visible = 'true';

    var input = this.searchInput;
    input.value = '';
    this.searchReset.classList.add('hidden');

    window.dispatchEvent(new CustomEvent('rocketbarshown'));

    var self = this;
    search.addEventListener('transitionend', function shown(e) {
      search.removeEventListener(e.type, shown);
      input.focus();
      self.loadSearchApp();
    });
  }
};

Rocketbar.init();
