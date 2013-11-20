'use strict';

window.Evme = new function Evme_Core() {
  var NAME = 'Core', self = this,
      head_ts = new Date().getTime();

  this.shouldSearchOnInputBlur = false;

  this.init = function init(callback) {
    var data = Evme.__config,
        apiHost = Evme.Utils.getUrlParam('apiHost') || data.apiHost;

    apiHost && Evme.api.setHost(apiHost);

    // calculate the precise background image size loaded behind search results
    // takes screen size and pixel density into account
    data.bgImageSize = [
        Math.floor(window.innerWidth * window.devicePixelRatio),
        Math.floor(window.innerHeight * window.devicePixelRatio)
    ];

    // prevent context menu from opening when holding on evme pages
    preventContextMenu(Evme.Utils.getContainer());
    preventContextMenu(Evme.Utils.getOverlay());

    // calculate number of apps to load on every search
    // if the screen height permits it - add another row of apps
    var numberOfAppsToLoad = data.numberOfAppsToLoad;
    if (window.innerHeight / window.innerWidth > 1.66) {
        numberOfAppsToLoad += data.apps.appsPerRow;
    }

    Evme.Brain.init({
      'numberOfAppsToLoad': numberOfAppsToLoad,
      'searchSources': data.searchSources,
      'pageViewSources': data.pageViewSources,
      'displayInstalledApps': data.apps.displayInstalledApps
    });

    Evme.DoATAPI.init({
      'apiKey': data.apiKey,
      'appVersion': data.appVersion,
      'authCookieName': data.authCookieName,
      'callback': function initCallback() {
        setupObjects(data, callback);
      }
    });
  };

  this.onShow = function onShow() {
    document.body.classList.add('evme-displayed');
  };

  this.onHide = function onHide() {
    document.body.classList.remove('evme-displayed');

    Evme.Searchbar.blur();
    Evme.Collection.hide();
  };

  this.onHomeButtonPress = function onHomeButtonPress() {
    Evme.Searchbar.blur();

    if (
    // hide suggested collections list if open
    Evme.CollectionsSuggest && Evme.CollectionsSuggest.hide() ||
    // stop editing if active
    Evme.Collection.toggleEditMode(false) ||
    // close full screen background image if visible
    Evme.Collection.hideFullscreen() ||
    // hide the collection if visible
    Evme.Collection.hide() ||
    // close search results full screen background image if visible
    Evme.BackgroundImage.closeFullScreen() ||
    // clear the searchbar and apps
    (Evme.Searchbar.clearIfHasQuery() &&
                            document.body.classList.contains('evme-displayed'))
    ) {
      return true;
    }

    return false;
  };

  this.searchFromOutside = function searchFromOutside(query) {
    Evme.Brain.Searcher.searchExactFromOutside(query);
  };

  function preventContextMenu(el) {
    el.addEventListener('contextmenu', function onContextMenu(e) {
      e.stopPropagation();
    });
  }

  // one time setup to execute on device first launch
  function setupObjects(data, callback) {
    var setupCollectionStorageKey = 'collection-storage-setup';

    Evme.Storage.get(setupCollectionStorageKey, function next(didSetup) {
      if (didSetup) {
        initObjects(data);
        callback();
      } else {
        setupCollectionStorage(function deferInit() {
          Evme.Storage.set(setupCollectionStorageKey, true);
          initObjects(data);
          callback();
        });
      }
    });
  }

  function setupCollectionStorage(done) {
    var collections = EvmeManager.getCollections(),
        totalCollections = collections.length;

    if (totalCollections === 0) {
      done();
      return;
    }

    var onDone = function onDone() {
      if (--totalCollections === 0) {
        done();
      }
    };

    var iterateApps = function iterateApps(apps, collection) {
      var infoApps = [],
          total = apps.length;

      apps.forEach(function iteratee(info) {
        // info defines ['manifestURL', 'entry_point']
        var descriptor = {};

        if (info[0]) {
          descriptor.manifestURL = info[0];
        }

        if (info[1]) {
          descriptor.entry_point = info[1];
        }

        var app = EvmeManager.getAppByDescriptor(descriptor);
        if (app) {
          infoApps.push(app);
        }

        if (--total === 0) {
          saveCollectionSettings(collection, infoApps, onDone);
        }
      });
    };

    // Populating apps from manifest file
    collections.forEach(function(collection) {
      var apps = collection.manifest.apps;
      if (!apps || apps.length === 0) {
        // There aren't pre-installed apps for this collection
        saveCollectionSettings(collection, [], onDone);
      } else {
        iterateApps(apps, collection);
      }
    });
  }

  function saveCollectionSettings(collection, apps, done) {
    var collectionSettings = new Evme.CollectionSettings({
      'id': collection.id,
      'experienceId': collection.providerId,
      'apps': apps
    });

    Evme.CollectionStorage.add(collectionSettings, done);
  }

  function initObjects(data) {
    // lazy components
    window.addEventListener('suggestcollections', initSuggestCollections);

    self.ConnectionMessage = lazifyModule('ConnectionMessage',
      ['everything.me/modules/ConnectionMessage/ConnectionMessage.css',
       'everything.me/modules/ConnectionMessage/ConnectionMessage.js'],
      function initModule() {
        Evme.ConnectionMessage.init();
      });

    self.Location = lazifyModule('Location',
      ['everything.me/modules/Location/Location.js'],
      function initModule() {
        Evme.Location.init({
          'refreshInterval': data.locationInterval,
          'requestTimeout': data.locationRequestTimeout
        });
      });

    // active components
    var appsEl = Evme.$('#evmeApps'),
        collectionEl = document.querySelector('#collection .evme-apps');

    Evme.Features.init({
      'featureStateByConnection': data.featureStateByConnection
    });

    Evme.Searchbar.init({
      'el': Evme.$('#search-q'),
      'elForm': Evme.$('#search-rapper'),
      'timeBeforeEventPause': data.searchbar.timeBeforeEventPause,
      'timeBeforeEventIdle': data.searchbar.timeBeforeEventIdle,
      'setFocusOnClear': false
    });

    Evme.Helper.init({
      'el': Evme.$('#helper'),
      'elTitle': Evme.$('#search-title'),
      'elTip': Evme.$('#helper-tip'),
      'elSaveSearch': Evme.$('#save-search')
    });

    Evme.BackgroundImage.init({
      'el': Evme.$('#search-overlay'),
      'elFullScreenParent': Evme.$('#evmeOverlay')
    });

    Evme.SearchResults = new Evme.ResultManager();
    Evme.SearchResults.init({
      'NAME': 'SearchResults',
      'el': appsEl,
      'appsPerRow': data.apps.appsPerRow,
      'providers': [
      {
        type: Evme.PROVIDER_TYPES.INSTALLED,
        config: {
          'renderer': Evme.InstalledAppsRenderer,
          'containerEl': Evme.$('.installed', appsEl)[0],
          'containerSelector': '.installed',
          'filterResults': true
        }
      }, {
        type: Evme.PROVIDER_TYPES.CLOUD,
        config: {
          'renderer': Evme.CloudAppsRenderer,
          'containerEl': Evme.$('.cloud', appsEl)[0]
        }
      }, {
        type: Evme.PROVIDER_TYPES.MARKETAPPS,
        config: {
          'renderer': Evme.MarketAppsRenderer,
          'containerEl': Evme.$('.marketapps', appsEl)[0]
        }
      }, {
        type: Evme.PROVIDER_TYPES.MARKETSEARCH,
        config: {
          'renderer': Evme.MarketSearchRenderer,
          'containerEl': Evme.$('.marketsearch', appsEl)[0]
        }
      }
      ]
    });

    Evme.CollectionResults = new Evme.ResultManager();
    Evme.CollectionResults.init({
      'NAME': 'CollectionResults',
      'el': collectionEl,
      'appsPerRow': data.apps.appsPerRow,
      'providers': [{
        type: Evme.PROVIDER_TYPES.STATIC,
        config: {
          'renderer': Evme.StaticAppsRenderer,
          'containerEl': Evme.$('.static', collectionEl)[0],
          'containerSelector': '.static',
          'filterResults': true
        }
      }, {
        type: Evme.PROVIDER_TYPES.CLOUD,
        config: {
          'renderer': Evme.CloudAppsRenderer,
          'containerEl': Evme.$('.cloud', collectionEl)[0]
        }
      }
      ]
    });

    Evme.CollectionStorage.init();

    Evme.Collection.init({
      'resultsManager': Evme.CollectionResults,
      'bgImage': (Evme.BackgroundImage.get() || {}).image
    });

    Evme.InstalledAppsService.init();

    Evme.IconGroup.init({});

    Evme.IconManager.init({});

    Evme.SearchHistory.init({
      'maxEntries': data.maxHistoryEntries
    });

    Evme.Analytics.init({
      'config': data.analytics,
      'namespace': Evme,
      'DoATAPI': Evme.DoATAPI,
      'Brain': Evme.Brain,
      'connectionLow': Evme.Utils.connection().speed !=
                                            Evme.Utils.connection().SPEED_HIGH,
      'sessionObj': Evme.DoATAPI.Session.get(),
      'pageRenderStartTs': head_ts,
      'SEARCH_SOURCES': data.searchSources,
      'PAGEVIEW_SOURCES': data.pageViewSources
    });

    Evme.EventHandler.trigger(NAME, 'init', {
      'deviceId': Evme.DoATAPI.getDeviceId()
    });
  }

  function initSuggestCollections(e) {
      LazyLoader.load(
        ['everything.me/modules/CollectionsSuggest/CollectionsSuggest.js',
         'everything.me/modules/CollectionsSuggest/CollectionsSuggest.css'],
        function onLoad() {
          Evme.CollectionsSuggest.init({
            'elList': document.getElementById('collections-select'),
            'elParent': Evme.Utils.getContainer()
          });

          window.removeEventListener('suggestcollections',
                                                      initSuggestCollections);
          window.addEventListener('suggestcollections', onSuggestCollections);
          window.dispatchEvent(e);
        }
      );
  }
  function onSuggestCollections(e) {
      Evme.Brain.CollectionsSuggest.showUI();
  }

  // create a 'lazy' version of a module using the Proxy API
  // calling any method of the 'lazy module' will load and initialize
  // the real module and then call the matching method
  function lazifyModule(moduleName, resources, initModule) {
    var handler = {
      get: function get(target, name) {
        return function wrapper() {
          var args = Array.prototype.slice.call(arguments);
          LazyLoader.load(resources, function onLoad() {
            initModule();
            var module = Evme[moduleName];
            module[name].apply(module, args);
          });
        }
      }
    };

    return new Proxy({}, handler);
  };
}
