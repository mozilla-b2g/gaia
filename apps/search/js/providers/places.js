/* globals DataGridProvider, SyncDataStore, Promise, IconsHelper */
/* globals Search, GaiaGrid, PlacesIdbStore */
/* globals DateHelper */
/* globals asyncStorage */
/* globals LazyLoader */
(function(exports) {

  'use strict';

  var _ = navigator.mozL10n.get;

  // Maximum number of results to show show for a single query
  var MAX_AWESOME_RESULTS = 4;
  var MAX_HISTORY_RESULTS = 20;
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

    if (place.url in icons && icons[place.url]) {
      return icons[place.url];
    }

    IconsHelper.getIcon(place.url, null, place).then(icon => {
      saveIcon(place.url, icon);
    });

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

    xhr.onerror = function(err) {
      return callback(new Error('Cannot load uri'));
    };
    xhr.send();
  }

  function itemClicked(e) {
    if (e.target.dataset.url) {
      Search.navigate(e.target.dataset.url);
    }
  }

  var listTemplate = createList();

  function createList() {
    var list = document.createElement('ul');
    list.setAttribute('role', 'listbox');
    return list;
  }

  function incrementHistoryThreshold(timestamp, currentThreshold, thresholds) {
    var newThreshold = currentThreshold += 1;
    if (timestamp < thresholds[newThreshold]) {
      return incrementHistoryThreshold(timestamp, newThreshold, thresholds);
    }
    return newThreshold;
  }

  function drawHistoryHeading(parent, threshold, timestamp) {

    var LABELS = [
      'future',
      'today',
      'yesterday',
      'last-7-days',
      'this-month',
      'last-6-months',
      'older-than-6-months'
    ];

    var text = '';

    // Special case for month headings
    if (threshold == 5 && timestamp) {
      var date = new Date(timestamp);
      var now = new Date();
      text = _('month-' + date.getMonth());
      if (date.getFullYear() != now.getFullYear()) {
        text += ' ' + date.getFullYear();
      }
    } else {
      text = _(LABELS[threshold]);
    }

    var h3 = document.createElement('h3');
    var textNode = document.createTextNode(text);
    var ul = listTemplate.cloneNode(true);
    h3.appendChild(textNode);
    parent.appendChild(h3);
    parent.appendChild(ul);
  }

  function buildHistory(visits) {

    var thresholds = [
      Date.now(),                        // 0. Now
      DateHelper.todayStarted(),         // 1. Today
      DateHelper.yesterdayStarted(),     // 2. Yesterday
      DateHelper.thisWeekStarted(),      // 3. This week
      DateHelper.thisMonthStarted(),     // 4. This month
      DateHelper.lastSixMonthsStarted(), // 5. Six months
      0                                  // 6. Epoch!
    ];

    var threshold = 0;
    var month = null;
    var year = null;

    var fragment = document.createDocumentFragment();

    visits.forEach(function(visit) {
      // Draw new heading if new threshold reached
      if (visit.date > 0 && visit.date < thresholds[threshold]) {
        threshold = incrementHistoryThreshold(visit.date,
                                              threshold, thresholds);
        // Special case for month headings
        if (threshold != 5) {
          drawHistoryHeading(fragment, threshold);
        }
      }

      if (threshold === 5) {
        var timestampDate = new Date(visit.date);
        if (timestampDate.getMonth() != month ||
          timestampDate.getFullYear() != year) {
          month = timestampDate.getMonth();
          year = timestampDate.getFullYear();
          drawHistoryHeading(fragment, threshold, visit.date);
        }
      }

      visit.icon = getIcon(visit);
      visit.meta = visit.url;
      visit.dataset = { url: visit.url };
      var dom = exports.Places.buildResultsDom([visit]);
      fragment.appendChild(dom);
    });

    return fragment;
  }

  function showStartPage() {

    if (!topSitesWrapper || !historyWrapper) {
      return;
    }

    var store = exports.Places.persistStore;

    var urls = [];
    store.readVisits(MAX_HISTORY_RESULTS, function(results) {
      var docFragment = buildHistory(results);
      historyWrapper.innerHTML = '';
      historyWrapper.appendChild(docFragment);
    }, function filter(visit) {
      var isStored = visit.url in urls;
      urls[visit.url] = true;
      return !isStored;
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

    if (result.tile) {
      div.style.backgroundImage = 'url(' + result.tile + ')';
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

      this.persistStore.init().then(() => {

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
        // porpoises.
        var rev = this.persistStore.latestRevision || 0;
        return this.syncStore.sync(rev).then(() => {
          return new Promise(resolve => {

            function done() {
              showStartPage();
              resolve();
            }

            asyncStorage.getItem('have-preloaded-sites', (havePreloaded) => {
              if (!havePreloaded) {
                this.preloadTopSites().then(() => {
                  asyncStorage.setItem('have-preloaded-sites', true);
                  done();
                });
              } else {
                done();
              }
            });
          });
        });
      });
    },

    preloadTopSites: function() {
      return LazyLoader.getJSON('/js/inittopsites.json').then(sites => {
        return Promise.all(sites.map(site => {
          return this.persistStore.addPlace(site);
        }));
      });
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
