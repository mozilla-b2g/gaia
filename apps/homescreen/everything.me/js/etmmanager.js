"use strict";

var EvmeManager = (function EvmeManager() {
    var currentWindow = null,
        currentURL = null,
        EverythingME,
        currentFrame;
    
    function onInit(evmeInstance) {

      document.body.classList.add('evme-visible');

      EverythingME = evmeInstance;

      var elEvme = document.getElementById('landing-page');

      elEvme.addEventListener('gridpageshowstart', function pageshowstart() {
        EverythingME.onShowStart();
      });
      elEvme.addEventListener('gridpageshowend', function gridpageshowend() {
        EverythingME.onShowEnd();
      });
      elEvme.addEventListener('gridpagehidestart', function gridpagehidestart() {
        EverythingME.onHideStart();
      });
      elEvme.addEventListener('gridpagehideend', function gridpagehideend() {
        EverythingME.onHideEnd();
      });

      // context- long tap, should sometimes be canceled
      elEvme.addEventListener('contextmenu', function longPress(evt) {
        if (!EverythingME.allowContext()) {
          evt.stopImmediatePropagation();
        }
      });

      // hash change- mainly for Home Button click
      window.addEventListener('hashchange', function hashChange(e) {
        if (!EverythingME.allowHomeButtonClick(e)) {
          e.stopImmediatePropagation();
        }
      });
    }
    
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

    var footerStyle = document.getElementById("footer").style;
    footerStyle.transition = 'transform .3s ease';
    
    function menuShow() {
        footerStyle.transform = "translateY(0)";
    }

    function menuHide() {
        footerStyle.transform = "translateY(100%)";
    }

    function getMenuHeight() {
        return document.getElementById("footer").offsetHeight;
    }

    function getApps() {
        return GridManager.getApps();
    }

    function getAppIcon(app) {
        var iconObject = GridManager.getIcon(app);
        if (iconObject &&
                'descriptor' in iconObject &&
                'renderedIcon' in iconObject.descriptor) {
            return iconObject.descriptor.renderedIcon;
        }
    }

    function getAppName(app) {
        var manifest = app.manifest;
        if (!manifest) {
            return null;
        }

        if ('locales' in manifest) {
            var locale = manifest.locales[document.documentElement.lang];
            if (locale && locale.name) {
                return locale.name;
            }
        }

        return manifest.name;
    }

    function getIconSize() {
      return Icon.prototype.MAX_ICON_SIZE;
    }
    
    function setWallpaper(image) {
      navigator.mozSettings.createLock().set({
        'wallpaper.image': image
      });
    }

    function load() {

      var CB = !('ontouchstart' in window),
          js_files = ['js/Core.js',
                      'js/helpers/Utils.js',
                      'config/config.js',
                      'config/shortcuts.js',
                      'js/Brain.js',
                      'modules/Apps/Apps.js',
                      'modules/BackgroundImage/BackgroundImage.js',
                      'modules/Banner/Banner.js',
                      'modules/ConnectionMessage/ConnectionMessage.js',
                      'modules/Helper/Helper.js',
                      'modules/Location/Location.js',
                      'modules/Searchbar/Searchbar.js',
                      'modules/SearchHistory/SearchHistory.js',
                      'modules/Shortcuts/Shortcuts.js',
                      'modules/ShortcutsCustomize/ShortcutsCustomize.js',
                      'modules/SmartFolder/SmartFolder.js',
                      'modules/Tasker/Tasker.js',
                      'js/helpers/Storage.js',
                      'js/plugins/Scroll.js',
                      'js/external/uuid.js',
                      'js/api/apiv2.js',
                      'js/api/DoATAPI.js',
                      'js/helpers/EventHandler.js',
                      'js/helpers/Idle.js',
                      'js/plugins/Analytics.js',
                      'js/plugins/APIStatsEvents.js'];
      var css_files = ['css/common.css',
                      'modules/Apps/Apps.css',
                      'modules/BackgroundImage/BackgroundImage.css',
                      'modules/Banner/Banner.css',
                      'modules/ConnectionMessage/ConnectionMessage.css',
                      'modules/Helper/Helper.css',
                      'modules/Searchbar/Searchbar.css',
                      'modules/Shortcuts/Shortcuts.css',
                      'modules/ShortcutsCustomize/ShortcutsCustomize.css',
                      'modules/SmartFolder/SmartFolder.css'];

      var head = document.head,
          filesLoadProgress = 0,
          filesLoadCount = js_files.length + css_files.length;

      function onFileLoad(e) {
        e.target.removeEventListener('load', onFileLoad);
        
        filesLoadProgress++;
        console.log('tasker load: ' + filesLoadProgress + '/' + filesLoadCount);
        if (filesLoadProgress >= filesLoadCount) {
          Evme.init();
        }
      }

      function loadCSS(file) {
        var link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
        link.addEventListener('load', onFileLoad);
        head.appendChild(link);
      }

      function loadScript(file) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'everything.me/' + file + (CB ? '?' + Date.now() : '');
        script.defer = true;
        script.addEventListener('load', onFileLoad);
        head.appendChild(script);
      }
      
      function loadAssets() {
        for (var i=0,js; js=js_files[i++];) {
          loadScript(js);
        }
        for (var i=0,css; css=css_files[i++];) {
          loadCSS(css);
        }
      }
      
      loadAssets();
    }

    return {
        init: load,

        onInit: onInit,

        openApp: openApp,

        addBookmark: addBookmark,

        isAppInstalled: function isAppInstalled(url) {
            return GridManager.getIconForBookmark(url) ||
                   GridManager.getAppByOrigin(url);
        },
        getApps: getApps,
        getAppIcon: getAppIcon,
        getAppName: getAppName,

        openUrl: openUrl,

        menuShow: menuShow,
        menuHide: menuHide,
        getMenuHeight: getMenuHeight,

        getIconSize: getIconSize,
        
        setWallpaper: setWallpaper
    };
}());

var EvmeApp = function createEvmeApp(params) {
    Bookmark.call(this, params);
};

extend(EvmeApp, Bookmark);

EvmeApp.prototype.launch = function evmeapp_launch(url, name, useAsyncPanZoom) {
    var features = {
      name: this.manifest.name.replace(/\s/g, '&nbsp;'),
      icon: this.manifest.icons['60'],
      remote: true,
      useAsyncPanZoom: useAsyncPanZoom
    };

    if (!GridManager.getIconForBookmark(this.origin)) {
      features.origin = {
        name: features.name,
        url: encodeURIComponent(this.origin)
      };
    }

    if (url && url !== this.origin && !GridManager.getIconForBookmark(url)) {
      var searchName = navigator.mozL10n.get('wrapper-search-name', {
        topic: name,
        name: this.manifest.name
      }).replace(/\s/g, '&nbsp;');

      features.name = searchName;
      features.search = {
        name: searchName,
        url: encodeURIComponent(url)
      };
    }

    // The third parameter is received in window_manager without whitespaces
    // so we decice replace them for &nbsp;
    // We use `e.me` name in order to always reuse the same window
    // so that we can only open one e.me app at a time
    return window.open(url || this.origin, 'e.me', JSON.stringify(features));
};