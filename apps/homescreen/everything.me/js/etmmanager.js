
"use strict";

var EvmeManager = (function EvmeManager() {
    var currentWindow = null,
        currentURL = null;

    function openApp(params) {
        var evmeApp = new EvmeApp({
            bookmarkURL: params.originUrl,
            name: params.title,
            icon: params.icon
        });

        evmeApp.launch(params.url, params.urlTitle, params.useAsyncPanZoom);
        currentURL = params.url;
    }

    function addBookmark(params) {
        GridManager.install(new Bookmark({
          bookmarkURL: params.originUrl,
          name: params.title,
          icon: params.icon,
          iconable: false,
          useAsyncPanZoom: params.useAsyncPanZoom
        }));
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

    function getApps() {
        return GridManager.getApps(true /* Flatten */, true /* Hide hidden */);
    }

    function getAppIcon(app) {
        var iconObject = GridManager.getIcon(app);
        if (iconObject &&
                'descriptor' in iconObject &&
                'renderedIcon' in iconObject.descriptor) {
            return iconObject.descriptor.renderedIcon;
        }
    }

    function getIconSize() {
        return Icon.prototype.MAX_ICON_SIZE;
    }

    function isEvmeVisible(isVisible) {
        GridManager.setLandingPageOpacity(isVisible ? 0.4 : 0);
    }

    return {
        openApp: openApp,

        addBookmark: addBookmark,

        isAppInstalled: function isAppInstalled(url) {
            return GridManager.getIconForBookmark(url) ||
                   GridManager.getAppByOrigin(url);
        },
        getApps: getApps,
        getAppIcon: getAppIcon,

        openUrl: openUrl,

        isEvmeVisible: isEvmeVisible,

        menuShow: menuShow,
        menuHide: menuHide,
        getMenuHeight: getMenuHeight,

        getIconSize: getIconSize
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
