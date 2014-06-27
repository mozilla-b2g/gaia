/* globals HtmlHelper, Promise, Provider, Search, SettingsListener */

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
  var MAX_AWESOME_RESULTS = 3;
  var MAX_HISTORY_RESULTS = 5;
  var MAX_TOPSITES_RESULTS = 6;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  // The last revision that we synced from the datastore, we sync
  // every time the search app gains focus
  var lastRevision = 0;

  // Is there a sync in progress
  var syncing = false;

  var store;

  var topSitesWrapper = document.getElementById('top-sites');
  var historyWrapper = document.getElementById('history');

  var initialSync = true;
  var screenshotRequests = {};

  topSitesWrapper.addEventListener('click', itemClicked);
  historyWrapper.addEventListener('click', itemClicked);

  function itemClicked(e) {
    if (e.target.dataset.url) {
      Search.navigate(e.target.dataset.url);
    }
  }

  function saveIcon(url) {
    if (url in icons) {
      return;
    }
    fetchIcon(url, function(err, icon) {
      if (err) {
        // null it out so we dont keep fetching broken icons
        icons[url] = null;
      } else {
        icons[url] = icon;
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
      if (initialSync) {
        // Dont attempt to load screenshots during initial sync, the
        // pages wont exist
        return;
      }
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
    var historyDom = exports.Places.buildResultsDom(history.map(function(x) {
      return formatPlace(x, '');
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

  function doSync() {
    if (syncing) {
      return;
    }
    syncing = true;
    var cursor = store.sync(lastRevision);

    function cursorResolve(task) {
      lastRevision = task.revisionId;
      switch (task.operation) {
        // First implementation simply syncs recently used links
        // and searches most recent, this will eventually be used
        // to build an index
      case 'update':
      case 'add':
        var place = task.data;
        if (place.url.startsWith('app://') || place.url === 'about:blank') {
          break;
        }
        exports.Places.addPlace(place);
        break;
      case 'clear':
      case 'remove':
        break;
      case 'done':
        initialSync = false;
        showStartPage();
        syncing = false;
        return;
      }
      cursor.next().then(cursorResolve);
    }
    cursor.next().then(cursorResolve);
  }

  function matchesFilter(value, filter) {
    return !filter || (value && value.match(new RegExp(filter, 'i')) !== null);
  }

  function formatPlace(placeObj, filter) {
    var titleText = placeObj.title || placeObj.url;

    var renderObj = {
      title: HtmlHelper.createHighlightHTML(titleText, filter),
      meta: HtmlHelper.createHighlightHTML(placeObj.url, filter),
      description: placeObj.url,
      label: titleText,
      dataset: {
        url: placeObj.url
      }
    };

    if (placeObj.iconUri in icons && icons[placeObj.iconUri]) {
      renderObj.icon = icons[placeObj.iconUri];
    }

    return renderObj;
  }

  function Places() {}

  Places.prototype = {

    __proto__: Provider.prototype,

    name: 'Places',

    click: itemClicked,

    init: function() {
      Provider.prototype.init.apply(this, arguments);
    },

    search: function(filter) {
      return new Promise((resolve, reject) => {
        this.clear();
        var matched = 0;
        var renderResults = [];
        for (var url in results) {
          var result = results[url];
          if (!(matchesFilter(result.title, filter) ||
                matchesFilter(result.url, filter))) {
            continue;
          }
          renderResults.push(formatPlace(result, filter));

          if (++matched >= MAX_AWESOME_RESULTS) {
            break;
          }
        }

        resolve(renderResults);
      });
    },


    clear: function() {
      Provider.prototype.clear.apply(this, arguments);
    },

    /**
     * Add a place
     */
    addPlace: function(place) {
      results[place.url] = place;
      if (place.iconUri) {
        saveIcon(place.iconUri);
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

  SettingsListener.observe('rocketbar.enabled', false, (function(value) {
    if (value) {
      Search.provider(exports.Places);
    } else {
      Search.removeProvider(exports.Places);
    }
  }).bind(this));

  navigator.getDataStores(STORE_NAME).then(function(stores) {
    store = stores[0];
    store.onchange = doSync;
    doSync();
  });

}(window));
