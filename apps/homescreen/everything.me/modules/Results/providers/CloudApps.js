'use strict';

Evme.CloudAppResult = function Evme_CloudAppsResult(query) {
  Evme.Result.call(this);

  this.type = Evme.RESULT_TYPE.CLOUD;

  var SHADOW_OFFSET = 2 * window.devicePixelRatio,
      SHADOW_BLUR = 2 * window.devicePixelRatio,

      self = this;

  // @override
  // manipulate the icon (clipping, shadow, resize)
  this.onAppIconLoad = function CloudResult_onAppIconLoad() {
    // only round if the app is below the line
    // apps above the line (pinned) are already round
    if (self.cfg.staticType) {
      renderIcon(this.src);
    } else {
      Evme.Utils.getRoundIcon({
        'src': this.src,
        'size': this.width
      }, renderIcon);
    }

    function renderIcon(roundedIcon) {
      var fixedImage = new Image();

      // save a reference to the clipped icon
      self.setIconSrc(roundedIcon);
      // override the original with the round icon,
      // for later use throughout the app
      self.cfg.icon = roundedIcon;

      fixedImage.onload = function onImageLoad() {
        var osIconSize = Evme.Utils.getOSIconSize(),
            width = osIconSize,
            height = osIconSize,
            padding = Evme.Utils.OS_ICON_PADDING,
            canvas = self.initIcon(height + padding),
            context = canvas.getContext('2d'),
            canvasHeight = canvas.height,
            canvasWidth = canvas.width,
            SHADOW_SIZE = (SHADOW_OFFSET + SHADOW_BLUR);

        // account for shadow - pad the canvas from the bottom,
        // and move the name back up
        canvas.height += SHADOW_SIZE;
        self.elIcon.style.cssText += 'margin-bottom: ' + -SHADOW_SIZE + 'px;';

        // shadow
        context.shadowOffsetX = 0;
        context.shadowOffsetY = SHADOW_OFFSET;
        context.shadowBlur = SHADOW_BLUR;
        context.shadowColor = 'rgba(0, 0, 0, 0.6)';
        context.drawImage(fixedImage,
                          (canvasWidth - width + padding) / 2, padding,
                          width - padding, height - padding);

        self.finalizeIcon(canvas);
      };

      fixedImage.src = roundedIcon;
    }
  };

  // @override
  this.launch = function launchCloudApp() {
    // first resize the icon to the OS size
    // this includes a 2px padding around the icon
    Evme.Utils.padIconForOS({
      'icon': self.cfg.icon,
      'resize': true,
      'callback': function onIconResized(icon) {
        EvmeManager.openCloudApp({
          'url': self.cfg.appUrl,
          'originUrl': self.getFavLink(),
          'title': self.cfg.name,
          'icon': icon,
          'urlTitle': query,
          'useAsyncPanZoom': self.cfg.isWeblink
        });
      }
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

    DEFAULT_ICON_URLS =
      Evme.Config.design.apps.defaultIconUrl[Evme.Utils.ICONS_FORMATS.Large];


    this.init = function init(cfg) {
      containerEl = cfg.containerEl;
    };

    this.render = function render(apps, params) {
      if (!apps.length) { return; }

      var query = params.query,
      pageNum = params.pageNum,
      requestMissingIcons = params.requestMissingIcons,
      newSignature = Evme.Utils.getAppsSignature(apps);

      // if same apps as last - do nothing
      if (lastSignature === newSignature) {
        Evme.Utils.log('CloudAppsRenderer: nothing to render' +
                        ' (signature match)');
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
      for (var i = 0, entry; entry = data[i++];) {
        var result = lastRenderedResults[entry.id];
        result && result.draw(entry.icon);
      }
    };

    this.getResultCount = function getResultCount() {
      return containerEl.childElementCount;
    };

    function _render(apps, query, requestMissingIcons) {
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

      // used for result filtering
      var el = result.getElement();
      if (el) {
        el.dataset.url = app.appUrl;
      }

      lastRenderedResults[app.id] = result;

      docFrag.appendChild(el);
    }

    containerEl.appendChild(docFrag);

    noIconAppIds.length &&
      getCachedIconsAsync(noIconAppIds, requestMissingIcons);
  }

  function getCachedIconsAsync(appIds, requestMissingIcons) {
    var idsMissing = [], // ids of apps which have no cached icon
    pendingRequests = appIds.length;

    for (var i = 0, appId; appId = appIds[i++];) {
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

  function isWebLink(app) {
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
