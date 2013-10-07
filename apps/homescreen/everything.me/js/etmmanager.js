'use strict';

var EvmeManager = (function EvmeManager() {
  /**
   * E.me references each entry point as a different app with unique id
   * The entry point is encapsulated as a query key
   * http://communications.gaiamobile.org:8080/manifest.webapp?eme-ep=dialer
   */
  var EME_ENTRY_POINT_KEY = "eme-ep";

  var currentWindow = null,
      currentURL = null;

  function addGridItem(params, extra) {
    var item = GridItemsFactory.create({
      "id": params.id || Evme.Utils.uuid(),
      "bookmarkURL": params.originUrl,
      "name": params.name,
      "icon": params.icon,
      "iconable": false,
      "useAsyncPanZoom": params.useAsyncPanZoom,
      "type": !!params.isCollection ? GridItemsFactory.TYPE.COLLECTION :
              GridItemsFactory.TYPE.BOOKMARK
    });
    GridManager.install(item, params.gridPageOffset, extra);
    GridManager.ensurePagesOverflow(Evme.Utils.NOOP);
  }

  function removeGridItem(params) {
    var origin = params.id;

    var gridItem = GridManager.getApp(origin);
    Homescreen.showAppDialog(gridItem);

    window.addEventListener('confirmdialog', confirmDialogHandler);

    function confirmDialogHandler(evt) {
      window.removeEventListener('confirmdialog', confirmDialogHandler);

      if (evt.detail.app.id === gridItem.app.id &&
          params.onConfirm && evt.detail.action === 'confirm') {
         params.onConfirm();
      }
    }
  }

  function openUrl(url) {
    new MozActivity({
      name: "view",
      data: {
        type: "url",
        url: url
      }
    });
  }

  function menuShow() {
    footerStyle.MozTransform = "translateY(0)";
  }

  function menuHide() {
    footerStyle.MozTransform = "translateY(100%)";
  }

  var footerStyle = document.getElementById("footer").style;
  footerStyle.MozTransition = "-moz-transform .3s ease";

  function getMenuHeight() {
    return document.getElementById("footer").offsetHeight;
  }

  /**
   * Returns all apps on grid *excluding* collections.
   */
  function getGridApps() {
    return GridManager.getApps(true /* Flatten */, true /* Hide hidden */);
  }

  /**
   * Returns only the collections on the user's phone
   */
  function getCollections() {
    return GridManager.getCollections();
  }

  function getAppByOrigin(origin, cb) {
    var gridApp = GridManager.getApp(origin);
    if (gridApp) {
      getAppInfo(gridApp, cb);
    } else {
      console.error("E.me error: app " + origin + " does not exist");
    }
  }

  function getAppByDescriptor(cb, descriptor) {
    var icon = getIconByDescriptor(descriptor);

    if (icon) {
      getAppInfo(icon, cb);
    } else {
      console.error("E.me error: app " + origin + " does not exist");
      cb();
    }
  }

  function getIconByDescriptor(descriptor) {
    return GridManager.getIcon(descriptor);
  }

  /**
   * Returns E.me formatted information about an object
   * returned by GridManager.getApps.
   */
  function getAppInfo(gridApp, cb) {
    cb = cb || Evme.Utils.NOOP;

    var nativeApp = gridApp.app,  // XPCWrappedNative
        descriptor = gridApp.descriptor,
        id,
        icon,
        appInfo;

    // TODO document
    // TODO launch by entry_point
    if (nativeApp.manifestURL) {
      id = generateAppId(nativeApp.manifestURL, descriptor.entry_point);
    } else {
      id = nativeApp.bookmarkURL;
    }

    if (!id) {
      console.warn('E.me: no id found for ' + descriptor.name + '. Will not show up in results');
      cb();
      return;
    }

    icon = GridManager.getIcon(descriptor);

    appInfo = {
      "id": id,
      "name": descriptor.name,
      "appUrl": nativeApp.origin,
      "icon": Icon.prototype.DEFAULT_ICON_URL,
      "isOfflineReady": icon && 'isOfflineReady' in icon && icon.isOfflineReady()
    };

    // appInfo is an extended descriptor
    // when we will remove Eme's appIndex we can use plain descriptors
    if ('bookmarkURL' in descriptor) {
      appInfo.bookmarkURL = descriptor.bookmarkURL;
    }
    if ('manifestURL' in descriptor) {
      appInfo.manifestURL = descriptor.manifestURL;
    }
    if ('entry_point' in descriptor) {
      appInfo.entry_point = descriptor.entry_point;
    }

    if (!icon) {
      cb(appInfo);
    } else {
      retrieveIcon({
        icon: icon,
        done: function(blob) {
          if (blob) appInfo['icon'] = blob;
          cb(appInfo);
        }
      });
    }
  }

  /**
   * Generate a uuid for E.me to reference the app
   */
  function generateAppId(manifestURL, entryPoint) {
    if (entryPoint)
      return Evme.Utils.insertParam(manifestURL, EME_ENTRY_POINT_KEY, entryPoint);

    return manifestURL;
  }

  function retrieveIcon(request) {
    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    var icon = request.icon.descriptor.icon;

    xhr.open('GET', icon, true);
    xhr.responseType = 'blob';

    try {
      xhr.send(null);
    } catch (evt) {
      request.done();
      return;
    }

    xhr.onload = function onload(evt) {
      var status = xhr.status;
      if (status !== 0 && status !== 200)
        request.done();
      else
        request.done(xhr.response);
    };

    xhr.ontimeout = xhr.onerror = function onerror(evt) {
      request.done();
    };
  }

  function getIconSize() {
    return Icon.prototype.MAX_ICON_SIZE;
  }

  function isEvmeVisible(isVisible) {
    // TODO remove
  }

  function openInstalledApp(params) {
    var gridApp = GridManager.getApp(params.origin),
    entryPoint = Evme.Utils.extractParam(params.id, EME_ENTRY_POINT_KEY);

    if (entryPoint) {
      gridApp.app.launch(entryPoint);
    } else {
      gridApp.app.launch();
    }
  }

  var openCloudAppDisabled = false, OPEN_CLOUD_APP_DISABLED_DELAY = 600;

  function openCloudApp(params) {
    if (openCloudAppDisabled) {
      return;
    }

    openCloudAppDisabled = true;
    setTimeout(enableOpenCloudApp, OPEN_CLOUD_APP_DISABLED_DELAY);

    var evmeApp = new EvmeApp({
      bookmarkURL: params.originUrl,
      name: params.title,
      icon: params.icon
    });

    evmeApp.launch(params.url, params.urlTitle, params.useAsyncPanZoom);
    currentURL = params.url;
  }

  function enableOpenCloudApp() {
    openCloudAppDisabled = false;
  }

  function openMarketplaceApp(data) {
    launchMarketplaceApp(data.slug);
  }

  function openMarketplaceSearch(data) {
    launchMarketplaceSearch(data.query);
  }

  function launchMarketplaceApp(slug) {
    var url = 'https://marketplace.firefox.com/app/';
    window.open(url + encodeURIComponent(slug), 'e.memarket');
  }

  function launchMarketplaceSearch(query) {
    var url = 'https://marketplace.firefox.com/search/?q=';
    window.open(url + encodeURIComponent(query), 'e.memarket');
  }

  // sets an image as the device's wallpaper
  function setWallpaper(image) {
    navigator.mozSettings && navigator.mozSettings.createLock().set({
      'wallpaper.image': image
    });
  }

  function setIconName(name, origin, entryPoint) {
    var icon = GridManager.getIconByOrigin(origin, entryPoint);
    if (icon) {
      icon.setName(name);
    }
  }

  function getIconName(origin, entryPoint) {
    var out;

    var icon = GridManager.getIconByOrigin(origin, entryPoint);
    if (icon) {
      out = icon.getName();
    }

    return out;
  }

  function setIconImage(image, origin, entryPoint) {
    var icon = GridManager.getIconByOrigin(origin, entryPoint);
    if (icon) {
      icon.setImage(image);
    }
  }

  return {
    addGridItem: addGridItem,
    removeGridItem: removeGridItem,

    isAppInstalled: function isAppInstalled(origin) {
      return GridManager.getApp(origin);
    },

    getIconByDescriptor: getIconByDescriptor,
    getAppByDescriptor: getAppByDescriptor,
    getAppByOrigin: getAppByOrigin,
    getGridApps: getGridApps,
    getCollections: getCollections,
    getAppInfo: getAppInfo,

    openUrl: openUrl,
    openCloudApp: openCloudApp,
    openInstalledApp: openInstalledApp,
    openMarketplaceApp: openMarketplaceApp,
    openMarketplaceSearch: openMarketplaceSearch,

    isEvmeVisible: isEvmeVisible,

    menuShow: menuShow,
    menuHide: menuHide,
    getMenuHeight: getMenuHeight,

    getIconSize: getIconSize,

    setWallpaper: setWallpaper,

    getIconName: getIconName,
    setIconName: setIconName,
    setIconImage: setIconImage,
    get currentPageOffset() {
      return GridManager.pageHelper.getCurrentPageNumber();
    }
  };
}());

var EvmeApp = function createEvmeApp(params) {
  Bookmark.call(this, params);
};

extend(EvmeApp, Bookmark);

EvmeApp.prototype.launch = function evmeapp_launch(url, name, useAsyncPanZoom) {
  var features = {
    name: this.manifest.name,
    icon: this.manifest.icons['60'],
    remote: true,
    useAsyncPanZoom: useAsyncPanZoom
  };

  if (!GridManager.getIconForBookmark(this.origin)) {
    features.originName = features.name;
    features.originUrl = this.origin;
  }

  if (url && url !== this.origin && !GridManager.getIconForBookmark(url)) {
    var searchName = navigator.mozL10n.get('wrapper-search-name', {
      topic: name,
      name: this.manifest.name
    });

    features.name = searchName;
    features.searchName = searchName;
    features.searchUrl = url;
  }

  // We use `e.me` name in order to always reuse the same window
  // so that we can only open one e.me app at a time
  return window.open(url || this.origin, 'e.me', Object.keys(features)
    .map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(features[key]);
    }).join(','));
};
