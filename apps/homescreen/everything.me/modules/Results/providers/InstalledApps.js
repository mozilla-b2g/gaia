'use strict';

Evme.InstalledAppResult = function Evme_InstalledAppResult() {
  Evme.Result.call(this);
  this.type = Evme.RESULT_TYPE.INSTALLED;

  // @override
  this.launch = function launchInstalledApp(){
    EvmeManager.openInstalledApp({
      "id": this.cfg.id,
      "origin": this.cfg.appUrl
    });
  };
};
Evme.InstalledAppResult.prototype = Object.create(Evme.Result.prototype);
Evme.InstalledAppResult.prototype.constructor = Evme.InstalledAppResult;

/*
Renders installed apps
*/
Evme.InstalledAppsRenderer = function Evme_InstalledAppsRenderer() {
  var NAME = "InstalledAppsRenderer",
      DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),
      self = this,
      appsSignature = Evme.Utils.EMPTY_APPS_SIGNATURE,
      containerEl;

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
  };

  this.render = function render(data) {
    var apps = Evme.InstalledAppsService.getMatchingApps(data),
        newSignature = Evme.Utils.getAppsSignature(apps);

    if (!apps || !apps.length) {
      self.clear();
      return;
    }

    if (appsSignature === newSignature) {
      Evme.Utils.log("InstalledAppsRenderer: nothing new to render (signatures match)");

    } else {
      self.clear();
      renderDocFrag(apps);
      appsSignature = newSignature;
    }
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
    appsSignature = Evme.Utils.EMPTY_APPS_SIGNATURE;
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function renderDocFrag(apps) {
    var docFrag = document.createDocumentFragment();

    for (var i = 0, app; app = apps[i++];) {
      var result = new Evme.InstalledAppResult(),
          el = result.init(app);

      result.draw(app.icon || DEFAULT_ICON);
      docFrag.appendChild(el);
    }
    containerEl.appendChild(docFrag);
  }
};

/*
Responsible for maintaining app indexes

App index - list of apps installed on device, including apps and bookmarks but *excluding* collections
[
  {app id}: {
    "name": {display name},
    "icon": {HTML element},
    "appUrl": {app url}
  },
  ...
]

 Query index - a mapping from experience name to app ids (manifestURLs or bookmarkURLs)
{
  "music": ["manifestURL1", "bookmarkURL1"],
  "top apps": ["manifestURL2", "bookmarkURL2"],
  "radio": ["manifestURL3", "bookmarkURL3"],
  ...
}
*/
Evme.InstalledAppsService = new function Evme_InstalledAppsService() {
  var NAME = "InstalledAppsService",
    self = this,
    slugIndex = {},
    queryIndex = {}, QUERY_INDEX_STORAGE_KEY = NAME + "-query-index";

  this.init = function init() {
    // load stored index or create one
    loadQueryIndex();

    // listeners
    window.addEventListener('appInstalled', onAppInstallChanged);
    window.addEventListener('appUninstalled', onAppInstallChanged);
  }

  this.requestAppsInfo = function requestAppsInfo() {
    var gridApps = EvmeManager.getGridApps(),
        guids = gridApps.map(function getId(gridApp){
          return gridApp.app.manifestURL || gridApp.app.bookmarkURL;
        });

    Evme.EventHandler.trigger(NAME, "requestAppsInfo", guids);
  };

  this.requestAppsInfoCb = function requestAppsInfoCb(appsInfoFromAPI) {
    queryIndex = {};
    slugIndex = {};

    for (var k in appsInfoFromAPI) {
      var appAPIInfo = appsInfoFromAPI[k],
          appId = appAPIInfo.guid;

      // make sure the app does actually exist
      if (!EvmeManager.getAppById(appId)) {
         continue;
      }

      // Store the marketplace api slug, in order to compare and
      // dedup Marketplace app suggestions later on
      // slugIndex[appId] = appAPIInfo.nativeId;

      // queries is comprised of tags and experiences
      var tags = appAPIInfo.tags || [],
          experiences = appAPIInfo.experiences || [],
          queries = Evme.Utils.unique(tags.concat(experiences));

      // populate queryIndex
      for (var i = 0, query; query = queries[i++];) {
        query = normalizeQuery(query);
        if (!(query in queryIndex)) {
          queryIndex[query] = [];
        }
        queryIndex[query].push(appId);
      }
    }

    Evme.Storage.set(QUERY_INDEX_STORAGE_KEY, queryIndex);
    Evme.EventHandler.trigger(NAME, "queryIndexUpdated");
  };

  this.getMatchingApps = function getMatchingApps(data) {
    if (!data || !data.query) {
      return [];
    }

    var matchingApps = [],
        query = normalizeQuery(data.query),
        gridApps = EvmeManager.getGridApps();

    // search installed app names
    // search query within first letters of app name words
    var regex = new RegExp('\\b' + query, 'i');
    for (var i = 0, gridApp; gridApp = gridApps[i++];) {
      // if there's a match, add to matchingApps
      var appInfo = EvmeManager.getAppInfo(gridApp);
      if (appInfo && regex.test(normalizeQuery(appInfo.name))) {
        matchingApps.push(appInfo);
      }
      appInfo = null;
    }

    // search query
    // search for only exact query match
    if (query in queryIndex) {
      for (var i = 0, appId; appId = queryIndex[query][i++];) {
        var appInfo = EvmeManager.getAppInfo(appId);
        if (appInfo) {
          matchingApps.push(appInfo);
        }
        appInfo = null;
      }
    }

    matchingApps = Evme.Utils.unique(matchingApps, 'id');

    return matchingApps;
  };

  function onAppInstallChanged() {
    self.requestAppsInfo();
  }

  function loadQueryIndex() {
    Evme.Storage.get(QUERY_INDEX_STORAGE_KEY, function queryIndexCb(queryIndexFromStorage) {
      if (queryIndexFromStorage) {
        queryIndex = queryIndexFromStorage;
      } else {
        self.requestAppsInfo();
      }
    });
  }

  function normalizeQuery(query) {
    return Evme.Utils.escapeRegexp(query.toLowerCase());
  }
};
