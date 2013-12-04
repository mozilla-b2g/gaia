'use strict';

Evme.InstalledAppResult = function Evme_InstalledAppResult() {
  Evme.Result.call(this);
  this.type = Evme.RESULT_TYPE.INSTALLED;

  // @override
  this.launch = function launchInstalledApp() {
    EvmeManager.openInstalledApp({
      'id': this.cfg.id,
      'origin': this.cfg.appUrl
    });
  };
};
Evme.InstalledAppResult.prototype = Object.create(Evme.Result.prototype);
Evme.InstalledAppResult.prototype.constructor = Evme.InstalledAppResult;

/*
Renders installed apps
*/
Evme.InstalledAppsRenderer = function Evme_InstalledAppsRenderer() {
  var NAME = 'InstalledAppsRenderer',
      DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),
      self = this,
      appsSignature = Evme.Utils.EMPTY_APPS_SIGNATURE,
      containerEl,
      containerSelector,
      filterResults;

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
    containerSelector = cfg.containerSelector;
    filterResults = cfg.filterResults;
  };

  this.render = function render(data) {
    var apps = data.apps;

    var newSignature = Evme.Utils.getAppsSignature(apps);

    if (!apps || !apps.length) {
      self.clear();
      return;
    }

    if (appsSignature === newSignature) {
      Evme.Utils.log('InstalledAppsRenderer: nothing new to render' +
        ' (signatures match)');

    } else {
      self.clear();
      renderDocFrag(apps);
      appsSignature = newSignature;
    }
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
    appsSignature = Evme.Utils.EMPTY_APPS_SIGNATURE;

    // clear deduping style
    if (filterResults) {
      Evme.Utils.filterProviderResults({
        'id': 'installedApps-appUrls'
      });
    }
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function renderDocFrag(apps) {
    var docFrag = document.createDocumentFragment(),
        appUrls = [];

    for (var i = 0, app; app = apps[i++];) {
      var result = new Evme.InstalledAppResult(),
          el = result.init(app);

      result.draw(app.icon || DEFAULT_ICON);
      docFrag.appendChild(el);

      // relevant only for bookmarks as they dedup cloudapps with the same url
      if (filterResults && app.bookmarkURL) {
        appUrls.push(app.bookmarkURL);
      }
    }
    containerEl.appendChild(docFrag);

    if (filterResults) {
      // create a <style> element for hiding cloud apps that are shown as
      // installed apps
      Evme.Utils.filterProviderResults({
        'id': 'installedApps-appUrls',
        'attribute': 'data-url',
        'containerSelector': containerSelector,
        'items': appUrls
      });
    }
  }
};

/*
Responsible for maintaining app indexes

App index - list of apps installed on device,
including apps and bookmarks but *excluding* collections
[
  {app id}: {
    "name": {display name},
    "icon": {HTML element},
    "appUrl": {app url}
  },
  ...
]

 Query index - contains 'experiences' and 'tags' indexes:

   1. queryIndex.EXPS
   a mapping from experience names to app ids (manifestURLs or bookmarkURLs)
     {
       "music": ["manifestURL1", "bookmarkURL1"],
       "top apps": ["manifestURL2", "bookmarkURL2"],
       "radio": ["manifestURL3", "bookmarkURL3"],
       ...
     }

   2. queryIndex.TAGS
   a mapping from tag names to app ids (manifestURLs or bookmarkURLs)
   {
     "tag1": ["manifestURL1", "bookmarkURL1"],
     "tag2": ["manifestURL2", "bookmarkURL2"],
     ...
   }
  */
Evme.InstalledAppsService = new function Evme_InstalledAppsService() {
  var self = this,
      NAME = 'InstalledAppsService',
      EXPS = 'experiences',
      TAGS = 'tags',
      QUERY_INDEX_STORAGE_KEY = NAME + '-query-index',
      CLOUD_EQUIVS_STORAGE_KEY = NAME + '-cloud-equivs',
      SLUGS_STORAGE_KEY = NAME + '-slugs',
      newInstalledApps = [],
      queryIndex = {};

  this.init = function init() {
    // create indexes
    resetQueryIndex();
    loadQueryIndex();

    // listeners
    window.addEventListener('appInstalled', onAppInstallChanged);
    window.addEventListener('appUninstalled', onAppInstallChanged);
  };

  this.requestAppsInfo = function requestAppsInfo() {
    var gridApps = EvmeManager.getGridApps(),
        guids = [];

    for (var i = 0, gridApp; gridApp = gridApps[i++]; ) {
      guids.push(gridApp.app.manifestURL || gridApp.app.bookmarkURL);
    }

    Evme.EventHandler.trigger(NAME, 'requestAppsInfo', guids);
  };

  this.requestAppsInfoCb = function requestAppsInfoCb(appsInfoFromAPI) {
    var slugs = [];

    resetQueryIndex();

    // a list of cloud app ids that are equivalent to installed apps
    // and so should be hidden
    var cloudEquivs = [];

    for (var k in appsInfoFromAPI) {
      var apiInfo = appsInfoFromAPI[k];
      var idInQueryIndex = apiInfo.guid;

      // store information for deduping cloud apps
      if (apiInfo.equivWebapps && apiInfo.equivWebapps.length) {
        cloudEquivs = cloudEquivs.concat(apiInfo.equivWebapps);
      }

      // store the marketplace api slug,
      // in order to compare and dedup Marketplace app suggestions later on
      slugs.push(apiInfo.nativeId);

      var exps = apiInfo.experiences || [];
      var tags = apiInfo.tags || [];

      // populate queryIndex.EXPS
      for (var i = 0; i < exps.length; i++) {
        var exp = normalizeQuery(exps[i]);

        if (!(exp in queryIndex.EXPS)) {
          queryIndex.EXPS[exp] = [];
        }
        queryIndex.EXPS[exp].push(idInQueryIndex);
      }

      // populate queryIndex.TAGS
      for (var j = 0; j < tags.length; j++) {
        var tag = normalizeQuery(tags[j]);

        if (!(tag in queryIndex.TAGS)) {
          queryIndex.TAGS[tag] = [];
        }
        queryIndex.TAGS[tag].push(idInQueryIndex);
      }
    }

    Evme.Storage.set(QUERY_INDEX_STORAGE_KEY, queryIndex);
    Evme.Storage.set(CLOUD_EQUIVS_STORAGE_KEY, cloudEquivs);
    Evme.Storage.set(SLUGS_STORAGE_KEY, slugs);

    onSlugsUpdated(slugs);
    onCloudEquivsUpdated(cloudEquivs);

    Evme.EventHandler.trigger(NAME, 'queryIndexUpdated');

    newInstalledApps.forEach(function dispatch(app) {
      var appInfo = EvmeManager.getAppByOrigin(app.origin);

      window.dispatchEvent(new CustomEvent('appAddedToQueryIndex', {
        'detail': {
          'appInfo': appInfo
        }
      }));
    });
    newInstalledApps = [];
  };

  this.getMatchingApps = function getMatchingApps(data) {
    var matchingApps = [],
        appInfos = EvmeManager.getAllAppsInfo(),
        query = data.query;

    if (!query) {
      return matchingApps;
    }

    query = normalizeQuery(query);

    // match againt queryIndex.TAGS (for search)
    // or queryIndex.EXPS (for collections)
    var index = queryIndex.EXPS;
    if (data.byTags) {
      index = queryIndex.TAGS;
      Evme.Utils.log('searching tag index');
    }

    var regex = new RegExp('\\b' + query, 'i');
    var appIds = index[query] || [];

    for (var i = 0; i < appInfos.length; i++) {
      var appInfo = appInfos[i];

      // match by name prefix
      if (regex.test(appInfo.name)) {
        matchingApps.push(appInfo);
      }

      // match by tag/experience
      if (appIds.indexOf(appInfo.id) > 0) {
        matchingApps.push(appInfo);
      }
    }

    matchingApps = Evme.Utils.unique(matchingApps, 'id');

    return matchingApps;
  };


  this.getMatchingQueries = function getMatchingQueries(appInfo) {
    var matchingQueries = [];
    var appId = appInfo.bookmarkURL || appInfo.manifestURL;

    var expIdx = queryIndex.EXPS;
    for (var query in expIdx) {
      if (expIdx[query].indexOf(appId) > -1) {
        matchingQueries.push(query);
      }
    }

    return matchingQueries;
  };

  function onAppInstallChanged(e) {
    if (e.type === 'appInstalled') {
      newInstalledApps.push(e.detail.app);
    }

    self.requestAppsInfo();
  }

  function onSlugsUpdated(slugs) {
    Evme.Utils.filterProviderResults({
      'id': 'installedApps-slugs',
      'attribute': 'data-slug',
      'containerSelector': '.installed',
      'items': slugs
    });
    slugs = null;
  }

  function onCloudEquivsUpdated(equivs) {
    Evme.Utils.filterProviderResults({
      'id': 'installedApps-cloudEquivs',
      'attribute': 'id',
      'value': 'app_{0}',
      'containerSelector': '.installed',
      'items': equivs
    });
  }

  function resetQueryIndex() {
    queryIndex = {
      TAGS: {},
      EXPS: {}
    };
  }

  function loadQueryIndex() {
    Evme.Storage.get(QUERY_INDEX_STORAGE_KEY,
      function queryIndexCb(queryIndexFromStorage) {
        if (queryIndexFromStorage) {
          queryIndex = queryIndexFromStorage;
          Evme.Storage.get(SLUGS_STORAGE_KEY,
            function slugsCb(storedSlugs) {
              onSlugsUpdated(storedSlugs);
            });
          Evme.Storage.get(CLOUD_EQUIVS_STORAGE_KEY,
            function equivsCb(storedEquivs) {
              onCloudEquivsUpdated(storedEquivs);
            });
        } else {
          self.requestAppsInfo();
        }
      });
  }

  function normalizeQuery(query) {
    return Evme.Utils.escapeRegexp(query.toLowerCase());
  }
}
