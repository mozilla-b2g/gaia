'use strict';

Evme.STATIC_APP_TYPE = {
  CLOUD: 'cloud'
};

Evme.StaticAppsRenderer = function Evme_StaticAppsRenderer() {
  var NAME = "StaticAppsRenderer",
      DEFAULT_ICON = Evme.Utils.getDefaultAppIcon(),
      self = this,
      containerEl;

  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
  };

  this.render = function render(apps) {
    this.clear();
    renderDocFrag(apps);
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function renderDocFrag(apps) {
    var docFrag = document.createDocumentFragment();

    for (var i = 0, app; app = apps[i++];) {
      app.isRemovable = true;

      var result,
          el;

      if (app.staticType === Evme.STATIC_APP_TYPE.CLOUD){
        result = new Evme.CloudAppResult(app.collectionQuery);
      } else {
        result = new Evme.InstalledAppResult();
      }

      el = result.init(app);

      result.draw(app.icon || DEFAULT_ICON);
      docFrag.appendChild(el);
    }

    containerEl.appendChild(docFrag);
  }
}
