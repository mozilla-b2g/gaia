'use strict';

var Rocketbar = {
  _nodeNames: [
    'activation-icon',
    'overlay',
    'input',
    'search-results'
  ],

  DOM: {},
  installedApps: {},

  _plugins: null,

  init: function() {
    this.getInstalledApps();

    this._nodeNames.forEach(function(name) {
      this.DOM[this.toCamelCase(name)] =
        document.getElementById('rocketbar-' + name);
    }, this);

    this.DOM.activationIcon.addEventListener('click',
      this.show.bind(this, true)
    );
    this.DOM.overlay.addEventListener('click', this.handleClick.bind(this));
    this.DOM.input.addEventListener('click', this.inputFocus);
    this.DOM.input.addEventListener('keyup', this.inputKeyUp.bind(this));
    this.DOM.searchResults.addEventListener('scroll', this.blur.bind(this));
    this._handleHashChange = this.handleHashChange.bind(this);
  },

  blur: function() {
    this.DOM.input.blur();
  },

  getInstalledApps: function() {
    navigator.mozApps.mgmt.getAll().onsuccess = (function(evt) {
      evt.target.result.forEach(function r_getApps(app) {
        this.installedApps[app.manifestURL] = app;
      }, this);
    }).bind(this);
  },

  toCamelCase: function(str) {
     return str.replace(/\-(.)/g, function replacer(str, p1) {
       return p1.toUpperCase();
     });
  },

  handleClick: function(evt) {
    var target = evt.target;
    var manifestURL = target.getAttribute('data-manifest-url');

    if (manifestURL && this.installedApps[manifestURL]) {
      this.installedApps[manifestURL].launch(
        target.getAttribute('data-entry-point')
      );
      this.hide();
    }

    var siteUrl = target.dataset.siteUrl;
    if (siteUrl) {
      new MozActivity({ name: 'view',
        data: { type: 'url', url: siteUrl }
      });
    }
  },

  handleHashChange: function(evt) {
    evt.stopImmediatePropagation();
    if (document.location.hash === '#root') {
      window.removeEventListener('hashchange', this._handleHashChange);
      this.hide();
    }
  },

  inputFocus: function(evt) {
    evt.stopPropagation();
  },

  searchApps: function(query) {
    var results = [];

    // Create a list of manifestURLs for apps with names which match the query
    var manifestURLs = Object.keys(this.installedApps);
    manifestURLs.forEach(function(manifestURL) {

      var app = this.installedApps[manifestURL];
      var manifest = app.manifest;

      if (GridManager.hiddenRoles.indexOf(manifest.role) !== -1) {
        return;
      }

      var appListing = [];

      if (manifest.entry_points) {
        for (var i in manifest.entry_points) {
          manifest.entry_points[i].entryPoint = i;
          appListing.push(manifest.entry_points[i]);
        }
      }
      appListing.push(manifest);

      appListing.forEach(function(manifest) {
        if (manifest.name.toLowerCase().indexOf(query.toLowerCase()) != -1) {
          results.push({
            manifestURL: manifestURL,
            app: app,
            manifest: manifest,
            entryPoint: manifest.entryPoint
          });
        }
      });
    }, this);

    return results;
  },

  inputKeyUp: function(evt) {
    // Clean up the query and display blank results if blank
    var query = this.DOM.input.value.toLowerCase().trim();
    if (query.length == 0) {
      this.showAppResults([]);
      return;
    }

    this.DOM.searchResults.innerHTML = '';

    // Cancel any open requests
    OpenSearchPlugins.abort();

    this.showAppResults(this.searchApps(query));

    for (var name in this._plugins) {
      var plugin = this._plugins[name];
      var LIMIT = 6;
      OpenSearchPlugins.getSuggestions(name, query, LIMIT,
        (function(_name, _plugin) {
          return function(results) {
            if (results.isVisual) {
              this.visualSearchResults(results.items, _plugin);
            } else {
              this.showSearchResults(results.items, _plugin);
            }
          }.bind(this);
        }).call(this, name, plugin)
      );
    }
  },

  showAppResults: function(results) {
    if (results.length === 0)
      return;

    results.forEach(function(result) {
      var app = result.app;
      var li = document.createElement('li');
      li.textContent = result.manifest.name;
      li.setAttribute('data-manifest-url', result.manifestURL);

      if (result.entryPoint) {
        li.setAttribute('data-entry-point', result.entryPoint);
      }

      if (result.manifest.icons) {
        li.style.backgroundImage = 'url(' + app.origin +
          result.manifest.icons['60'] + ')';
      }
      this.DOM.searchResults.appendChild(li);
    }, this);
  },

  showSearchResults: function(results, plugin) {
    var resultItem = document.createElement('li');
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

  visualSearchResults: function(results, plugin) {
    var resultItem = document.createElement('li');
    resultItem.className = 'visual';
    var resultTitle = document.createElement('h3');
    resultTitle.textContent = plugin.shortname;
    resultItem.appendChild(resultTitle);

    // Render individual results within the element
    results.forEach(function(result) {
      if (!result.title || !result.uri) {
        return;
      }

      var resultURL = document.createElement('small');
      resultURL.className = 'suggestion';

      var icon = document.createElement('img');
      icon.width = 48;
      icon.height = 48;
      icon.src = result.icon || '/style/images/default.png';
      resultURL.appendChild(icon);
      resultURL.appendChild(document.createTextNode(result.title));

      resultURL.setAttribute('data-site-url', result.uri);
      resultItem.appendChild(resultURL);
    }, this);

    this.DOM.searchResults.appendChild(resultItem);
  },

  show: function(focus) {
    this._plugins = OpenSearchPlugins.plugins;

    this.DOM.overlay.classList.add('visible');
    if (focus) {
      this.DOM.input.focus();
    }

    // We reset the hash so we know when the user presses the home button
    document.location.hash = '';
    window.addEventListener('hashchange', this._handleHashChange);
  },

  hide: function() {
    var keyboardHideDelay = 200;
    this.DOM.input.blur();
    setTimeout(function() {
      this.DOM.overlay.classList.remove('visible');
      this.DOM.input.value = '';
      this.DOM.searchResults.innerHTML = '';
    }.bind(this), keyboardHideDelay);
  }
};

Rocketbar.init();
