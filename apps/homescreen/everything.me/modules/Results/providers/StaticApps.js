'use strict';

Evme.STATIC_APP_TYPE = {
  CLOUD: 'cloud'
};

Evme.StaticAppsRenderer = function Evme_StaticAppsRenderer() {
  var NAME = "StaticAppsRenderer",
      DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),
      self = this,
      containerEl,
      containerSelector,
      filterResults;

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
    containerSelector = cfg.containerSelector;
    filterResults = cfg.filterResults;
  };

  this.render = function render(apps) {
    this.clear();
    renderDocFrag(apps);
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
    filterResults && Evme.Utils.filterProviderResults({
      "id": 'static-cloudapps'
    });
    filterResults && Evme.Utils.filterProviderResults({
      "id": 'static-equivs'
    });
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function renderDocFrag(apps) {
    var docFrag = document.createDocumentFragment(),
        appUrls = [],
        equivs = [];

    for (var i = 0, app; app = apps[i++];) {
      app.isRemovable = true;
      app.isStatic = true;

      var result,
          el;

      if (app.staticType === Evme.STATIC_APP_TYPE.CLOUD){
        result = new Evme.CloudAppResult(app.collectionQuery);

        if (filterResults && app.appUrl) {
          appUrls.push(app.appUrl);
        }
      } else {
        result = new Evme.InstalledAppResult();

        if (filterResults && app.equivCloudAppAPIIds) {
          equivs = equivs.concat(app.equivCloudAppAPIIds);
        }
      }

      el = result.init(app);

      result.draw(app.icon || DEFAULT_ICON);
      docFrag.appendChild(el);
    }

    containerEl.appendChild(docFrag);

    if (filterResults) {
      // add cloudapps dedup style
      Evme.Utils.filterProviderResults({
        "id": 'static-cloudapps',
        "attribute": 'data-url',
        "containerSelector": containerSelector,
        "items": appUrls
      });
      // add cloudapp equivalent dedup style
      Evme.Utils.filterProviderResults({
        "id": 'static-equivs',
        "attribute": 'id',
        "value": 'app_{0}',
        "containerSelector": containerSelector,
        "items": equivs
      });
    }
  }
};
