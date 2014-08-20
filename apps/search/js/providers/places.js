/* globals DataGridProvider, SyncDataStore, Promise, IconsHelper */
/* globals Search, GaiaGrid, PlacesIdbStore */

(function(exports) {

  'use strict';

  // Maximum number of results to show show for a single query
  var MAX_AWESOME_RESULTS = 4;
  var MAX_HISTORY_RESULTS = 5;
  var MAX_TOPSITES_RESULTS = 6;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  var topSitesWrapper = document.getElementById('top-sites');
  var historyWrapper = document.getElementById('history');

  // These elements are only included in the newtab page.
  if (topSitesWrapper && historyWrapper) {
    topSitesWrapper.addEventListener('click', itemClicked);
    historyWrapper.addEventListener('click', itemClicked);
  }

  var cachedLink = document.createElement('a');
  function parseUrl(url) {
    cachedLink.href = url;
    return cachedLink;
  }

  // Storage for locally fetched icons
  var icons = {};
  var iconUrls = {};

  function getIcon(place) {
    var icon = IconsHelper.getBestIcon(place.icons);
    if (icon) {
      saveIcon(place.url, icon);
    }
    if (place.url in icons && icons[place.url]) {
      return icons[place.url];
    }
    return false;
  }

  function saveIcon(key, url) {
    if (key in icons) {
      return;
    }
    icons[key] = null;
    iconUrls[key] = url;
    fetchIcon(url, function(err, icon) {
      if (!err) {
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

  function itemClicked(e) {
    if (e.target.dataset.url) {
      Search.navigate(e.target.dataset.url);
    }
  }

  function showStartPage() {

    if (!topSitesWrapper || !historyWrapper) {
      return;
    }

    var store = exports.Places.persistStore;

    store.read('visited', MAX_HISTORY_RESULTS, function(results) {
      var historyDom = exports.Places.buildResultsDom(results.map(place => {
        return {
          title: place.title || place.url,
          meta: place.url,
          dataset: {
            url: place.url
          },
          icon: getIcon(place)
        };
      }));

      historyWrapper.innerHTML = '';
      historyWrapper.appendChild(historyDom);
    });

    store.read('frecency', MAX_TOPSITES_RESULTS, function(results) {
      var docFragment = document.createDocumentFragment();
      results.forEach(function(x) {
        docFragment.appendChild(formatTopResult(x));
      });
      topSitesWrapper.innerHTML = '';
      topSitesWrapper.appendChild(docFragment);
    });
  }

  function formatTopResult(result) {
    var div = document.createElement('div');
    var span = document.createElement('span');
    span.textContent = result.title;
    div.dataset.url = result.url;
    div.classList.add('top-site');
    div.appendChild(span);
    div.setAttribute('role', 'link');

    if (result.screenshot) {
      var objectURL = typeof result.screenshot === 'string' ?
        result.screenshot : URL.createObjectURL(result.screenshot);
      div.style.backgroundImage = 'url(' + objectURL + ')';
    }
    return div;
  }

  function matchesFilter(value, filter) {
    return !filter || (value && value.match(new RegExp(filter, 'i')) !== null);
  }

  function formatPlace(placeObj, filter) {

    var bookmarkData = {
      id: placeObj.url,
      name: placeObj.title || placeObj.url,
      url: placeObj.url
    };

    var icon = getIcon(placeObj);
    if (icon) {
      bookmarkData.icon = URL.createObjectURL(icon);
      bookmarkData.iconUrl = iconUrls[placeObj.url];
    }

    return {
      data: new GaiaGrid.Bookmark(bookmarkData)
    };
  }

  function Places() {}

  Places.prototype = {

    __proto__: DataGridProvider.prototype,

    name: 'Places',

    click: itemClicked,

    init: function() {
      DataGridProvider.prototype.init.apply(this, arguments);
      this.persistStore = new PlacesIdbStore();

      this.persistStore.init().then((function() {

        this.syncStore =
          new SyncDataStore(STORE_NAME, this.persistStore, 'url');

        this.syncStore.filter = function(place) {
          return place.url.startsWith('app://') ||
            place.url === 'about:blank';
        };
        this.syncStore.onChange = function() {
          showStartPage();
        };
        // Make init return a promise, so we know when
        // we did the sync. Used right now for testing
        // porpuses.
        var rev = this.persistStore.latestRevision || 0;
        return this.syncStore.sync(rev).then(function() {
          return new Promise(function(resolve, reject) {
            showStartPage();
            resolve();
          });
        });
      }).bind(this));
    },

    search: function(filter) {
      return new Promise((resolve, reject) => {
        var matchedOrigins = {};
        this.persistStore.read('frecency', MAX_AWESOME_RESULTS, (results) => {
          resolve(results.map(function(result) {
            return formatPlace(result, filter);
          }));
        }, function filterFun(result) {
          var url = parseUrl(result.url);
          var matches = !(url.hostname in matchedOrigins) &&
            (matchesFilter(result.title, filter) ||
             matchesFilter(result.url, filter));
          if (matches) {
            matchedOrigins[url.hostname] = true;
          }
          return matches;
        });
      });
    }
  };

  exports.Places = new Places();
  Search.provider(exports.Places);

}(window));
