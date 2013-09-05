Evme.CloudAppResult = function Evme_CloudAppsResult(query) {
  Evme.Result.call(this);

  this.type = Evme.RESULT_TYPE.CLOUD;

  var SHADOW_OFFSET = 2 * Evme.Utils.devicePixelRatio,
      SHADOW_BLUR = 2 * Evme.Utils.devicePixelRatio,
      SIZE = 52 * Evme.Utils.devicePixelRatio,
      FULL_SIZE = SIZE + SHADOW_OFFSET + SHADOW_BLUR,

      self = this,
      roundedAppIcon;
 
  // @override
  // manipulate the icon (clipping, shadow, resize)
  this.onAppIconLoad = function CloudResult_onAppIconLoad() {
    var canvas = self.initIcon(FULL_SIZE, SIZE),
        context = canvas.getContext('2d'),

        elImageCanvas = document.createElement('canvas'),
        imageContext = elImageCanvas.getContext('2d'),
        fixedImage = new Image();

    elImageCanvas.width = elImageCanvas.height = FULL_SIZE;
    
    imageContext.beginPath();
    imageContext.arc(FULL_SIZE / 2, FULL_SIZE / 2, SIZE / 2, 0, Math.PI * 2, false);
    imageContext.closePath();
    imageContext.clip();
    imageContext.drawImage(this, (FULL_SIZE - SIZE) / 2, (FULL_SIZE - SIZE) / 2, SIZE, SIZE);

    // save a reference to the clipped icon
    roundedAppIcon = elImageCanvas.toDataURL();
    self.setIconSrc(roundedAppIcon);

    fixedImage.onload = function onImageLoad() {
      // shadow
      context.shadowOffsetX = 0;
      context.shadowOffsetY = SHADOW_OFFSET;
      context.shadowBlur = SHADOW_BLUR;
      context.shadowColor = 'rgba(0, 0, 0, 0.6)';
      context.drawImage(fixedImage, (canvas.width - FULL_SIZE) / 2, 0);
      self.finalizeIcon(canvas);
    };

    fixedImage.src = elImageCanvas.toDataURL('image/png');
  };

  // @override
  this.launch = function launchCloudApp() {
    EvmeManager.openCloudApp({
        "url": self.cfg.appUrl,
        "originUrl": self.getFavLink(),
        "title": self.cfg.name,
        "icon": roundedAppIcon,
        "urlTitle": query,
        "useAsyncPanZoom": self.cfg.isWeblink
    });
  };
};
Evme.CloudAppResult.prototype = Object.create(Evme.Result.prototype);
Evme.CloudAppResult.prototype.constructor = Evme.CloudAppResult;


Evme.CloudAppsRenderer = function Evme_CloudAppsRenderer() {
  var NAME = 'CloudAppsRenderer',
    self = this,
    containerEl,
    lastRenderedResults = {}, // app.id -> Result instance
    lastSignature = Evme.Utils.EMPTY_APPS_SIGNATURE,
    iconFormat = Evme.Utils.getIconsFormat(), 
    defaultIconIndex = 0,

    DEFAULT_ICON_URLS = Evme.Config.design.apps.defaultIconUrl[Evme.Utils.ICONS_FORMATS.Large];


  this.init = function init(cfg) {
    containerEl = cfg.containerEl;
  };

  this.render = function render(apps, params) {
    if (!apps.length) return;

    var query = params.query,
        pageNum = params.pageNum,
        requestMissingIcons = params.requestMissingIcons,
        newSignature = Evme.Utils.getAppsSignature(apps);

    // if same apps as last - do nothing
    if (lastSignature === newSignature) {
      Evme.Utils.log("CloudAppsRenderer: nothing to render (signature match)");
      return;
    }
    lastSignature = newSignature;

    // if not "loaded more", clear current results
    if (pageNum === 0) {
      self.clear();
    }

    _render(apps, query, requestMissingIcons);
  };

  this.clear = function clear() {
    containerEl.innerHTML = '';
    lastRenderedResults = {};
    lastSignature = Evme.Utils.EMPTY_APPS_SIGNATURE;
    defaultIconIndex = 0;
  };

  /*
    data = [{ id: id, icon: {} }, ... ]
  */
  this.updateIcons = function updateIcons(data) {
    for (var i=0, entry; entry=data[i++];){
      var result = lastRenderedResults[entry.id];
      result && result.draw(entry.icon);
    }
  };

  this.getResultCount = function getResultCount() {
    return containerEl.childElementCount;
  };

  function _render(apps, query, requestMissingIcons){
    var docFrag = document.createDocumentFragment(),
      noIconAppIds = [];  // ids of apps received without an icon

    for (var i = 0, app; app = apps[i++];) {
      var result = new Evme.CloudAppResult(query),
          el = result.init(app);

      if (app.icon) {  // app with icon url from API response
        result.draw(app.icon);
        Evme.IconManager.add(app.id, app.icon, iconFormat);

      } else if (isWebLink(app)) {  // no id for weblinks so generate one
        app.id = 'app-' + Evme.Utils.uuid();
        app.icon = getDefaultIcon();
        result.draw(app.icon);

      } else {  // icon will be drawn from cache (or requested if missing)
        noIconAppIds.push(app.id);
      }

      lastRenderedResults[app.id] = result;

      docFrag.appendChild(el);
    }

    containerEl.appendChild(docFrag);

    noIconAppIds.length && getCachedIconsAsync(noIconAppIds, requestMissingIcons);
  }

  function getCachedIconsAsync(appIds, requestMissingIcons) {
    var idsMissing = [], // ids of apps which have no cached icon
      pendingRequests = appIds.length;

    for (var i=0, appId; appId=appIds[i++];) {
      _getCachedIcon(appId);
    }

    // wrapped in function to create new scope (with correct value of appId)
    function _getCachedIcon(appId) {
      Evme.IconManager.get(appId, function onIconFromCache(iconFromCache) {
        // make sure app still appears in results
        var app = lastRenderedResults[appId];
        if (!app) {
          return;
        }

        if (iconFromCache) {
          app.icon = iconFromCache;
          app.draw(iconFromCache);
        } else {
          idsMissing.push(appId);
          app.draw(getDefaultIcon());
        }

        pendingRequests--;

        // all cache requests returned - request missing icons
        if (pendingRequests === 0) {
          idsMissing.length && requestMissingIcons(idsMissing);
        }
      });
    }

  }

  function isWebLink(app){
    // apps that are not indexed by E.me (web links)
    // or missing id for some reason
    return app.isWebLink || app.type === Evme.RESULT_TYPE.WEBLINK || !app.id;
  }

  function getDefaultIcon() {
    var defaultIcon = DEFAULT_ICON_URLS[defaultIconIndex];
    defaultIconIndex = (defaultIconIndex + 1) % DEFAULT_ICON_URLS.length;
    return defaultIcon;
  }
};