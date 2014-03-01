'use strict';

var EvmeManager = (function EvmeManager() {
  /**
   * E.me references each entry point as a different app with unique id
   * The entry point is encapsulated as a query key
   * http://communications.gaiamobile.org:8080/manifest.webapp?eme-ep=dialer
   */
  var EME_ENTRY_POINT_KEY = 'eme-ep';

  var currentWindow = null,
      currentURL = null;

  function addGridItem(params, extra) {
    var item = GridItemsFactory.create({
      'id': params.id || Evme.Utils.uuid(),
      'bookmarkURL': params.originUrl.trim(),
      'name': params.name,
      'icon': params.icon,
      'iconable': false,
      'useAsyncPanZoom': params.useAsyncPanZoom,
      'type': !!params.isCollection ? GridItemsFactory.TYPE.COLLECTION :
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
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
  }

  function onAppSavedToHomescreen(name) {
    var message = navigator.mozL10n.get('evme-banner-app-install-success', {
      'name': name
    });
    statusShow(message);
  }

  function statusShow(message, duration) {
    LazyLoader.load(['shared/style/status.css',
                     'js/components/status.js'],
      function onLoad() {
        utils.status.show(message, duration);
      });
  }

  function menuShow() {
    footerStyle.MozTransform = 'translateY(0)';
  }

  function menuHide() {
    footerStyle.MozTransform = 'translateY(100%)';
  }

  var footerStyle = document.getElementById('footer').style;
  footerStyle.MozTransition = '-moz-transform .3s ease';

  function getMenuHeight() {
    return document.getElementById('footer').offsetHeight;
  }

  /**
   * Returns all apps on grid *excluding* collections.
   */
  function getGridApps() {
    return GridManager.getApps(true /* Flatten */, true /* Hide hidden */);
  }

  function getAllAppsInfo() {
    var gridApps = getGridApps();
    var infos = [];

    for (var i = 0; i < gridApps.length; i++) {
      var info = getAppInfo(gridApps[i]);
      if (info) {
        infos.push(info);
      }
    }

    return infos;
  }

  /**
   * Returns only the collections on the user's phone
   */
  function getCollections() {
    return GridManager.getCollections();
  }

  /**
   * Returns a list of all Collections names
   * @param  {bool} lowerCase the name strings
   */
  function getCollectionNames(lowerCase) {
    var names = [];
    var gridCollections = getCollections();
    for (var i = 0; collection = gridCollections[i++]; ) {
      var name = getIconName(collection.origin);
      if (name) {
        names.push(lowerCase ? name.toLowerCase() : name);
      }
    }

    return names;
  }

  function getAppByOrigin(origin) {
    var gridApp = GridManager.getApp(origin);
    if (gridApp) {
      return getAppInfo(gridApp);
    } else {
      console.error('E.me error: app ' + origin + ' does not exist');
      return undefined;
    }
  }

  function getAppByDescriptor(descriptor) {
    var icon = getIconByDescriptor(descriptor);

    if (icon) {
      return getAppInfo(icon);
    } else {
      console.error('E.me error: app by descriptor does not exist' +
                      JSON.stringify(descriptor));
      return undefined;
    }
  }

  function getIconByDescriptor(descriptor) {
    return GridManager.getIcon(descriptor);
  }

  /**
   * Returns E.me formatted information about an object that was returned by
   * GridManager.getApps.
   */
  function getAppInfo(gridApp) {
    var nativeApp = gridApp.app,  // XPCWrappedNative
        descriptor = gridApp.descriptor,
        appInfo = {};

    var id;
    if (nativeApp.manifestURL) {
      id = generateAppId(nativeApp.manifestURL, descriptor.entry_point);
    } else {
      id = nativeApp.bookmarkURL;
    }

    if (!id) {
      console.warn('E.me: no id found for ' + descriptor.name +
                                              '. Will not show up in results');
      return undefined;
    }

    var icon = GridManager.getIcon(descriptor);
    if (icon && icon.descriptor) {
      icon = icon.descriptor.renderedIcon;
    }

    appInfo = {
      'id': id,
      'name': descriptor.name,
      'appUrl': nativeApp.origin,
      'icon': icon || Icon.prototype.DEFAULT_ICON_URL,
      'isOfflineReady': gridApp && 'isOfflineReady' in gridApp &&
                          gridApp.isOfflineReady()
    };

    if (descriptor.bookmarkURL) {
      appInfo.bookmarkURL = descriptor.bookmarkURL;
    }
    if (descriptor.manifestURL) {
      appInfo.manifestURL = descriptor.manifestURL;
    }
    if (descriptor.entry_point) {
      appInfo.entry_point = descriptor.entry_point;
    }

    return appInfo;
  }

  /**
   * Generate a uuid for E.me to reference the app
   */
  function generateAppId(manifestURL, entryPoint) {
    if (entryPoint) {
      return Evme.Utils.insertParam(manifestURL,
                                      EME_ENTRY_POINT_KEY, entryPoint);
    }

    return manifestURL;
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
    var activity = new MozActivity({
      name: 'marketplace-app',
      data: {
        slug: data.slug
      }
    });

    activity.onerror = function() {
      window.open('https://marketplace.firefox.com/app/' + data.slug, 'e.me');
    };
  }

  function openMarketplaceSearch(data) {
    var activity = new MozActivity({
      name: 'marketplace-search',
      data: {
        query: data.query
      }
    });

    activity.onerror = function() {
      window.open('https://marketplace.firefox.com/search/?q=' + data.query,
                                                                        'e.me');
    };
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
      return GridManager.getIconForBookmark(
              Bookmark.prototype.generateIndex(origin));
    },

    getIconByDescriptor: getIconByDescriptor,
    getAppByDescriptor: getAppByDescriptor,
    getAppByOrigin: getAppByOrigin,
    getGridApps: getGridApps,
    getCollections: getCollections,
    getCollectionNames: getCollectionNames,
    getAppInfo: getAppInfo,
    getAllAppsInfo: getAllAppsInfo,

    openUrl: openUrl,
    openCloudApp: openCloudApp,
    openInstalledApp: openInstalledApp,
    openMarketplaceApp: openMarketplaceApp,
    openMarketplaceSearch: openMarketplaceSearch,

    isEvmeVisible: isEvmeVisible,

    onAppSavedToHomescreen: onAppSavedToHomescreen,

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
