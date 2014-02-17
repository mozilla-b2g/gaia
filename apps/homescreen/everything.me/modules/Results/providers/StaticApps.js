'use strict';

Evme.STATIC_APP_TYPE = {
  CLOUD: 'cloud'
};

Evme.StaticAppsRenderer = function Evme_StaticAppsRenderer() {
  var NAME = 'StaticAppsRenderer',
      DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),
      self = this,
      containerEl,
      containerSelector,
      filterResults,
      renderedAppIds;

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
    containerSelector = cfg.containerSelector;
    filterResults = cfg.filterResults;
    renderedAppIds = [];
  };

  this.render = function render(apps) {
    var diff = apps.length - renderedAppIds.length;

    if (diff < 0) {
      // apps removed
      // no rendering needed - handled by Result.js@remove
    } else if (diff === 1) {
      // one app added, append last
      apps.some(function isNew(app) {
        if (renderedAppIds.indexOf(app.id) < 0) {
          append(app);
          return true;
        }
      });
    } else {
      // render everything
      this.clear();
      renderDocFrag(apps);
    }

    renderedAppIds = apps.map(function getId(app) {
      return app.id;
    });

    setDedupStyles(apps);
  };

  this.clear = function clear() {
    renderedAppIds = [];
    containerEl.innerHTML = '';
    setDedupStyles([]);
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function append(app) {
    var el = renderApp(app);
    containerEl.appendChild(el);
  }

  function renderApp(app) {
    app.isRemovable = true;
    app.isStatic = true;

    var result,
        el;

    if (app.staticType === Evme.STATIC_APP_TYPE.CLOUD) {
      result = new Evme.CloudAppResult(app.collectionQuery);
    } else {
      result = new Evme.InstalledAppResult();
      var localizedName = EvmeManager.getIconName(app.appUrl, app.entry_point);
      if (localizedName) {
        app.name = localizedName;
      }
    }

    el = result.init(app);
    result.draw(app.icon || DEFAULT_ICON);

    return el;
  }

  function renderDocFrag(apps) {
    var docFrag = document.createDocumentFragment();

    for (var i = 0, app; app = apps[i++];) {
      var el = renderApp(app);
      docFrag.appendChild(el);
    }

    containerEl.appendChild(docFrag);
  }

  /**
   * Create a <style> element for hiding:
   * 1. cloud apps that are pinned to a collection as static apps
   * 2. bookmarked cloud apps that were added to the collection
   */
  function setDedupStyles(apps) {
    if (!filterResults) {
      return;
    }

    var appUrls = [];

    for (var i = 0, app; app = apps[i++]; ) {
      if (app.bookmarkURL || app.staticType === Evme.STATIC_APP_TYPE.CLOUD) {
        app.appUrl && appUrls.push(app.appUrl);
      }
    }

    Evme.Utils.filterProviderResults({
      'id': 'staticApps-appUrls',
      'attribute': 'data-url',
      'containerSelector': containerSelector,
      'items': appUrls
    });

  }
};
