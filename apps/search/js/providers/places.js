/* globals DataGridProvider, SyncDataStore, Promise,
 Search, GaiaGrid, InMemoryStore */

(function(exports) {

  'use strict';

  // We current re sync from scratch every time and store the last 50
  // urls in memory
  var results = {};
  var icons = {};
  var urls = [];
  var MAX_URLS = 50;

  // Store the most recent history and top sites in an ordered list
  // in memory
  var history = [];
  var topSites = [];

  // Maximum number of results to show show for a single query
  var MAX_AWESOME_RESULTS = 4;
  var MAX_HISTORY_RESULTS = 5;
  var MAX_TOPSITES_RESULTS = 6;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  var topSitesWrapper = document.getElementById('top-sites');
  var historyWrapper = document.getElementById('history');

  var screenshotRequests = {};

  topSitesWrapper.addEventListener('click', itemClicked);
  historyWrapper.addEventListener('click', itemClicked);

  var cachedLink = document.createElement('a');
  function parseUrl(url) {
    cachedLink.href = url;
    return cachedLink;
  }

  function itemClicked(e) {
    if (e.target.dataset.url) {
      Search.navigate(e.target.dataset.url);
    }
  }

  function saveIcon(key, url) {
    if (key in icons) {
      return;
    }
    fetchIcon(url, function(err, icon) {
      if (err) {
        // null it out so we dont keep fetching broken icons
        icons[key] = null;
      } else {
        icons[key] = icon;
      }
      showStartPage();
    });
  }

  function fetchIcon(uri, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function() {
      // Check icon was successfully downloded
      // 0 is due to https://bugzilla.mozilla.org/show_bug.cgi?id=716491
      if (!(xhr.status === 200 || xhr.status === 0)) {
        return callback(new Error('error_downloading'));
      }

      var blob = xhr.response;

      if (blob.size > this.MAX_ICON_SIZE) {
        return callback(new Error('image_to_large'));
      }

      // Only save the icon if it can be loaded as an image bigger than 0px
      var img = document.createElement('img');
      img.src = window.URL.createObjectURL(blob);

      img.onload = function() {
        window.URL.revokeObjectURL(img.src);
        if (img.naturalWidth <= 0) {
          return callback(new Error('Cannot load image'));
        }
        callback(null, blob);
      };

      img.onerror = function() {
        window.URL.revokeObjectURL(img.src);
        return callback(new Error('Cannot load image'));
      };
    });

    xhr.onerror = function() {
      return callback(new Error('Cannot load uri'));
    };
    xhr.send();
  }

  function addToOrderedStore(store, obj, key, max) {
    // Check the url isnt already in the store
    var index = store.findIndex(function(x) { return x.url === obj.url; });
    if (index !== -1) {
      store[index] = obj;
      return true;
    }
    // if the store is empty or the objects key is larger than the smallest
    // in the store (ie oldest visit or least frecency)
    if (store.length < max || obj[key] >= store[store.length - 1][key]) {
      store.push(obj);
      // Sort by key in reverse order
      store.sort(function(a, b) { return b[key] - a[key]; });
      if (store.length > max) {
        store.length = max;
      }
      return true;
    }
    return false;
  }

  function addToStartPage(place) {
    place.visited = place.visited || 0;
    place.frecency = place.frecency || 0;

    addToOrderedStore(history, place, 'visited', MAX_HISTORY_RESULTS);

    if (addToOrderedStore(topSites, place, 'frecency', MAX_TOPSITES_RESULTS)) {
      if (place.url in screenshotRequests &&
          screenshotRequests[place.url] >= place.visited) {
        return;
      }
      if (exports.Places.searchObj) {
        screenshotRequests[place.url] = place.visited;
        exports.Places.searchObj.requestScreenshot(place.url);
      }
    }
  }

  function showStartPage() {
    var historyDom = exports.Places.buildResultsDom(history.map(place => {
      var renderObj = {
        title: place.title || place.url,
        meta: place.url,
        dataset: {
          url: place.url
        }
      };

      if (place.url in icons) {
        renderObj.icon = URL.createObjectURL(icons[place.url]);
      }

      return renderObj;
    }));

    var docFragment = document.createDocumentFragment();

    topSites.forEach(function(x) {
      var div = document.createElement('div');
      var span = document.createElement('span');
      span.textContent = x.title;
      div.dataset.url = x.url;
      div.classList.add('top-site');
      div.appendChild(span);
      div.setAttribute('role', 'link');

      if (x.screenshot) {
        var objectURL = typeof x.screenshot === 'string' ? x.screenshot :
          URL.createObjectURL(x.screenshot);
        div.style.backgroundImage = 'url(' + objectURL + ')';
      }
      docFragment.appendChild(div);
    });

    historyWrapper.innerHTML = '';
    historyWrapper.appendChild(historyDom);
    topSitesWrapper.innerHTML = '';
    topSitesWrapper.appendChild(docFragment);
  }

  function matchesFilter(value, filter) {
    return !filter || (value && value.match(new RegExp(filter, 'i')) !== null);
  }

  function formatPlace(placeObj, filter) {
    var icon;
    if (placeObj.url in icons) {
      icon = URL.createObjectURL(icons[placeObj.url]);
    }

    var renderObj = {
      data: new GaiaGrid.Bookmark({
        id: placeObj.url,
        name: placeObj.title || placeObj.url,
        url: placeObj.url,
        icon: icon
      })
    };
    return renderObj;
  }

  function parseResults(provider) {
    results = provider.persistStore.results;
    Object.keys(results).forEach(function(url) {
      provider.addPlace(results[url]);
    });
    showStartPage();
  }

  function Places() {}

  Places.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'Places',

    click: itemClicked,

    init: function() {
      DataGridProvider.prototype.init.apply(this, arguments);
      this.persistStore = new InMemoryStore();
      this.syncStore = new SyncDataStore(STORE_NAME, this.persistStore, 'url');
      this.syncStore.filter = function(place) {
        return place.url.startsWith('app://') ||
          place.url === 'about:blank';
      };
      var self = this;
      this.syncStore.onChange = function() {
        parseResults(self);
      };
      // Make init return a promise, so we know when
      // we did the sync. Used right now for testing
      // porpuses.
      return this.syncStore.sync().then(function() {
        return new Promise(function(resolve, reject) {
          parseResults(self);
          resolve();
        });
      });
    },

    search: function(filter) {
      return new Promise((resolve, reject) => {
        var matched = 0;
        var renderResults = [];
        var matchedOrigins = {};
        for (var url in results) {
          var result = results[url];
          var parsedUrl = parseUrl(result.url);
          if (!(matchesFilter(result.title, filter) ||
                matchesFilter(result.url, filter)) ||
              parsedUrl.hostname in matchedOrigins) {
            continue;
          }
          matchedOrigins[parsedUrl.hostname] = true;
          renderResults.push(formatPlace(result, filter));

          if (++matched >= MAX_AWESOME_RESULTS) {
            break;
          }
        }

        resolve(renderResults);
      });
    },

    /**
     * Add a place
     */
    addPlace: function(place) {
      results[place.url] = place;
      var icons = place.icons ? Object.keys(place.icons) : [];
      if (icons.length) {
        saveIcon(place.url, icons[0]);
      }
      if (!(place.url in urls)) {
        urls.unshift(place.url);
      }
      while (urls.length > MAX_URLS) {
        var url = urls.pop();
        delete results[url];
      }
      addToStartPage(place);
    }
  };

  exports.Places = new Places();
  Search.provider(exports.Places);

}(window));
