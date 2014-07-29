/* globals SyncProvider, GaiaGrid, Search */

(function(exports) {

  'use strict';

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

  var MAX_ICON_SIZE = 20000;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  var topSitesWrapper = document.getElementById('top-sites');
  var historyWrapper = document.getElementById('history');

  var screenshotRequests = {};

  // Default click handler, expects that we
  // build object with a url value in the
  // dataset
  function itemClicked(e) {
    if (e.target.dataset.url) {
      Search.navigate(e.target.dataset.url);
    }
  }

  topSitesWrapper.addEventListener('click', itemClicked);
  historyWrapper.addEventListener('click', itemClicked);

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

      if (blob.size > MAX_ICON_SIZE) {
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
      if (exports.Places.initialSync) {
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

  function Places() {}

  Places.prototype = {

    __proto__: SyncProvider.prototype,

    name: 'Places',

    storeName: STORE_NAME,

    matchFilter: function(result, filter) {
      return (matchesFilter(result.title, filter) ||
                matchesFilter(result.url, filter));
    },

    filterData: function(place) {
      return place.url.startsWith('app://') ||
       place.url === 'about:blank';
    },

    adapt: formatPlace,

    limitResults: MAX_AWESOME_RESULTS,

    /**
     * Add a place
     */
    addPlace: function(place) {
      this.add(place);
    },

    add: function(place) {
      SyncProvider.prototype.add.call(this, place);
    },

    postAdd: function(place) {
      var icons = place.icons ? Object.keys(place.icons) : [];
      if (icons.length) {
        saveIcon(place.url, icons[0]);
      }
      if (!(place.url in urls)) {
        urls.unshift(place.url);
      }
      while (urls.length > MAX_URLS) {
        var url = urls.pop();
        this.delete(url);
      }
      addToStartPage(place);
    },

    onDone: showStartPage
  };

  exports.Places = new Places();
  exports.Places.init();

}(window));
