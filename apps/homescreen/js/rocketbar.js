var Rocketbar = {
  nodeNames: [
    'activation-icon',
    'overlay',
    'input',
    'search-results',
    'apps-results',
    'tabs'
  ],

  DOM: {},
  installedApps: {},
  plugins: null,
  
  init: function rocketbar_init() {
    this.getInstalledApps();

    this.nodeNames.forEach(function(name) {
      this.DOM[this.toCamelCase(name)] =
        document.getElementById('rocketbar-' + name);
    }, this);
    
    this.plugins = OpenSearchPlugins.plugins;
    
    this.DOM.activationIcon.addEventListener('click',
      this.show.bind(this, true)
    );
    this.DOM.overlay.addEventListener('click', this.handleClick.bind(this));
    this.DOM.input.addEventListener('click', this.inputFocus);
    this.DOM.input.addEventListener('keyup', this.inputKeyUp.bind(this));
    this.DOM.tabs.addEventListener('click', this.tabClickHandler.bind(this));
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
  },

  getInstalledApps: function() {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function mozAppGotAll(evt) {
      var apps = evt.target.result;
      apps.forEach(function(app) {
        self.installedApps[app.manifestURL] = app;
      });
    };
  },

  toCamelCase: function toCamelCase(str) {
     return str.replace(/\-(.)/g, function replacer(str, p1) {
       return p1.toUpperCase();
     });
  },

  handleClick: function(evt) {
    var target = evt.target;
    var manifestURL = target.getAttribute('data-manifest-url');
    if (manifestURL && this.installedApps[manifestURL]) {
     this.installedApps[manifestURL].launch();
     this.hide();
    }

    if (target.dataset.siteUrl) {
      console.log(target.dataset.siteUrl);
      new MozActivity({ name: 'view',
        data: { type: 'url', url: target.dataset.siteUrl }
      });
    }
  },

  handleHashChange: function(evt) {
    if (document.location.hash === '#root') {
      this.hide();
    }
  },

  inputFocus: function(evt) {
    evt.stopPropagation();
  },

  inputKeyUp: function(evt) {
    var results = [];

    // Clean up the query and display blank results if blank
    var query = this.DOM.input.value.toLowerCase().trim();
    if (query.length == 0) {
      this.showAppResults(results);
      return;
    }

    this.DOM.searchResults.innerHTML = '';
    this.DOM.appsResults.innerHTML = '';
    
    // If the user is typing quickly, we may request multiple async results
    // This function verifies that the current query matches the desired query
    this.lastQuery = query;
    var verifyQuery = function(callback) {
      return function() {
        if (this.lastQuery === query) {
          callback.apply(this, arguments);
        }
      }.bind(this);
    }.bind(this);
    
    // Create a list of manifestURLs for apps with names which match the query
    var manifestURLs = Object.keys(this.installedApps);
    manifestURLs.forEach(function(manifestURL) {
      var appName = this.installedApps[manifestURL].manifest.name.toLowerCase();
      if (appName.indexOf(query.toLowerCase()) != -1 &&
          this.HIDDEN_APPS.indexOf(manifestURL) == -1) {
        results.push(manifestURL);
      }
    }, this);
    this.showAppResults(results);
    
    for (var name in this.plugins) {
      var plugin = this.plugins[name];
      var LIMIT = 12;
      OpenSearchPlugins.getSuggestions(name, query, LIMIT,
        (function(_name, _plugin) {
          return verifyQuery(function(results) {
            if (_name == 'EverythingMe' || _name == 'Marketplace') {
              this.visualSearchResults(results, _plugin);
            } else {
              this.showSearchResults(results, _plugin);
            }
          })
        })(name, plugin)
      );
    }
  },

  showAppResults: function rocketbar_showAppResults(results) {
    if (results.length === 0)
      return;
    results.forEach(function(manifestURL) {
      var app = this.installedApps[manifestURL];
      var li = document.createElement('li');
      li.textContent = app.manifest.name;
      li.setAttribute('data-manifest-url', manifestURL);
      if (app.manifest.icons) {
        li.style.backgroundImage = 'url(' + app.origin +
          app.manifest.icons['60'] + ')';
      }
      this.DOM.searchResults.appendChild(li);
    }, this);
  },

  showSearchResults: function rocketbar_showSearchResults(results, plugin) {
    var resultItem = document.createElement('li');
    var resultTitle = document.createElement('h3');
    resultTitle.textContent = 'Search ' + plugin.shortname + ' for:';
    resultItem.appendChild(resultTitle);
    resultItem.style.backgroundImage = 'url(' + plugin.icon + ')';

    // Render individual results within the element
    results.forEach(function(result) {

      if (!result.title || !result.uri) {
        return;
      }

      var resultURL = document.createElement('small');
      resultURL.className = 'suggestion';
      resultURL.textContent = result.title;
      resultURL.setAttribute('data-site-url', result.uri);
      resultItem.appendChild(resultURL);
    }, this);
    this.DOM.searchResults.appendChild(resultItem);
  },
  
  visualSearchResults: function rocketbar_visualSearchResults(results, plugin) {
    var resultItem = document.createElement('li');
    resultItem.className = 'visual';
    var resultTitle = document.createElement('h3');
    resultTitle.textContent = plugin.shortname + ' Results';
    resultItem.appendChild(resultTitle);

    // Render individual results within the element
    results.forEach(function(result) {

      if (!result.title || !result.uri) {
        return;
      }

      var resultURL = document.createElement('small');
      resultURL.className = 'suggestion';
      resultURL.innerHTML = 
        '<img height="48" width="48" src="' + 
        result.icon + 
        '">' + 
        result.title;
      resultURL.setAttribute('data-site-url', result.uri);
      resultItem.appendChild(resultURL);
    }, this);

    this.DOM.appsResults.appendChild(resultItem);
  },
    
  tabClickHandler: function(evt) {
    // disable active tab & tabpanel
    Array.prototype.slice.call(document.querySelectorAll('.active')).forEach(function(element){
      element.classList.remove('active');
    });
    
    // make the new one active
    evt.target.classList.add('active');
    this.DOM[evt.target.dataset.tabId].classList.add('active');
  },
  
  show: function(focus) {
    this.DOM.overlay.classList.add('visible');
    if (focus) {
      this.DOM.input.focus();
    }
    document.location.hash = '';
  },

  hide: function() {
    this.DOM.input.blur();
    setTimeout(function() {
      this.DOM.overlay.classList.remove('visible');
      this.DOM.input.value = '';
      this.DOM.searchResults.innerHTML = '';
      this.DOM.appsResults.innerHTML = '';
    }.bind(this), 200);
  },

  HIDDEN_APPS: ['app://keyboard.gaiamobile.org/manifest.webapp',
      'app://wallpaper.gaiamobile.org/manifest.webapp',
      'app://bluetooth.gaiamobile.org/manifest.webapp',
      'app://pdfjs.gaiamobile.org/manifest.webapp',
      'app://homescreen.gaiamobile.org/manifest.webapp',
      'app://system.gaiamobile.org/manifest.webapp',
      'app://image-uploader.gaiamobile.org/manifest.webapp',
      'http://keyboard.gaiamobile.org:8080/manifest.webapp',
      'http://wallpaper.gaiamobile.org:8080/manifest.webapp',
      'http://bluetooth.gaiamobile.org:8080/manifest.webapp',
      'http://pdfjs.gaiamobile.org:8080/manifest.webapp',
      'http://homescreen.gaiamobile.org:8080/manifest.webapp',
      'http://system.gaiamobile.org:8080/manifest.webapp',
      'http://image-uploader.gaiamobile.org/manifest.webapp']
};

Rocketbar.init();
