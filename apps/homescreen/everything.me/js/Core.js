window.Evme = new function Evme_Core() {
    var NAME = "Core", self = this,
        recalculateHeightRetries = 1,
        TIMEOUT_BEFORE_INIT_SESSION = "FROM CONFIG",
        OPACITY_CHANGE_DURATION = 300,
        head_ts = new Date().getTime(),

        CLASS_WHEN_SHOWING_SHORTCUTS = 'evme-display-shortcuts';

    this.shouldSearchOnInputBlur = true;

    this.init = function init() {
        data = Evme.__config;

        var apiHost = Evme.Utils.getUrlParam("apiHost") || data.apiHost;
        apiHost && Evme.api.setHost(apiHost);

        TIMEOUT_BEFORE_INIT_SESSION = data.timeoutBeforeSessionInit;
        
        window.addEventListener('contextmenu', onContextMenu, true);

        Evme.Brain.init({
            "numberOfAppsToLoad": data.numberOfAppsToLoad+(Evme.Utils.devicePixelRatio>1? data.apps.appsPerRow: 0),
            "minimumLettersForSearch": data.minimumLettersForSearch,
            "searchSources": data.searchSources,
            "pageViewSources": data.pageViewSources,
            "displayInstalledApps": data.apps.displayInstalledApps
        });

        Evme.DoATAPI.init({
            "apiKey": data.apiKey,
            "appVersion": data.appVersion,
            "authCookieName": data.authCookieName,
            "callback": function callback() {
                Evme.Analytics.init({
                    "config": data.analytics,
                    "namespace": Evme,
                    "DoATAPI": Evme.DoATAPI,
                    "getCurrentAppsRowsCols": Evme.Apps.getCurrentRowsCols,
                    "Brain": Evme.Brain,
                    "connectionLow": Evme.Utils.connection().speed != Evme.Utils.connection().SPEED_HIGH,
                    "sessionObj": Evme.DoATAPI.Session.get(),
                    "pageRenderStartTs": head_ts,
                    "SEARCH_SOURCES": data.searchSources,
                    "PAGEVIEW_SOURCES": data.pageViewSources
                });
            }
        });

        initObjects(data);
    };

    // Gaia communication methods
    this.setOpacityBackground = function setOpacityBackground(value) {
        Evme.BackgroundImage.changeOpacity(value, OPACITY_CHANGE_DURATION);
    };

    this.pageMove = function pageMove(value) {
        Evme.BackgroundImage.changeOpacity(Math.floor(value*100)/100);
    };
    
    this.onSwipeFromPage = function onSwipeFromPage() {
      
    };

    this.onHomeButtonPress = function onHomeButtonPress() {
        Evme.Searchbar.clearIfHasQuery();
        Evme.Searchbar.blur();

        if (
          Evme.BackgroundImage.closeFullScreen() ||
          Evme.Brain.Shortcuts.hideIfEditing() ||
          Evme.Brain.ShortcutsCustomize.hideIfOpen() ||
          Evme.Brain.ShortcutsCustomize.hideIfRequesting()
        ) {
          // return true to prevent homescreen from performing its own home button actions
          return true;
        }

        document.body.classList.remove(CLASS_WHEN_SHOWING_SHORTCUTS);

        // return false to allow homescreen to perform its own home button actions
        return false;
    };

    this.searchFromOutside = function searchFromOutside(query) {
        Evme.Brain.Searcher.searchExactFromOutside(query);
    };
    this.onShow = function onShow() {
        self.displayed = true;
        document.body.classList.add('evme-displayed');
    };
    this.onHide = function onHide() {
        self.displayed = false;
        document.body.classList.remove('evme-displayed');
        Evme.Searchbar.blur();
        document.body.classList.remove(CLASS_WHEN_SHOWING_SHORTCUTS);
        Evme.Brain.Shortcuts.hideIfEditing();
    };

    this.onHideStart = function onHideStart(source) {
        Evme.Brain.SmartFolder.hideIfOpen();
        
        if (source === "homeButtonClick") {
            if (
                Evme.Brain.Shortcuts.hideIfEditing() ||
                Evme.Brain.ShortcutsCustomize.hideIfOpen() ||
                Evme.Brain.ShortcutsCustomize.hideIfRequesting() ||
                Evme.Searchbar.clearIfHasQuery()
            ) {
                return true;
            }
        }

        Evme.Searchbar.blur();
        return false; // allow navigation to homescreen
    };
    
    function onContextMenu(e) {
      if (self.displayed && 
          (Evme.Searchbar.getValue() ||
          document.body.classList.contains(CLASS_WHEN_SHOWING_SHORTCUTS))
          ) {
        e.stopImmediatePropagation();
      }
    }

    function initObjects(data) {
        Evme.Features.init({
            "featureStateByConnection": data.featureStateByConnection
        });
        
        Evme.ConnectionMessage.init({
        });
        
        Evme.Location.init({
            "refreshInterval": data.locationInterval,
            "requestTimeout": data.locationRequestTimeout
        });
        
        Evme.Shortcuts.init({
            "el": Evme.$("#shortcuts"),
            "elLoading": Evme.$("#shortcuts-loading"),
            "design": data.design.shortcuts,
            "defaultShortcuts": data._defaultShortcuts
        });

        Evme.ShortcutsCustomize.init({
            "elParent": Evme.Utils.getContainer()
        });

        Evme.Searchbar.init({
            "el": Evme.$("#search-q"),
            "elForm": Evme.$("#search-rapper"),
            "elDefaultText": Evme.$("#default-text"),
            "timeBeforeEventPause": data.searchbar.timeBeforeEventPause,
            "timeBeforeEventIdle": data.searchbar.timeBeforeEventIdle,
            "setFocusOnClear": false
        });

        Evme.Helper.init({
            "el": Evme.$("#helper"),
            "elTitle": Evme.$("#search-title"),
            "elTip": Evme.$("#helper-tip")
        });

        Evme.Apps.init({
            "el": Evme.$("#evmeApps"),
            "elHeader": Evme.$("#header"),
            "design": data.design.apps,
            "appHeight": data.apps.appHeight,
            "minHeightForMoreButton": data.minHeightForMoreButton,
            "defaultScreenWidth": {
                "portrait": 320,
                "landscape": 480
            }
        });

        Evme.IconGroup.init({});

        Evme.BackgroundImage.init({
            "el": Evme.$("#search-overlay"),
            "elementsToFade": [Evme.$("#evmeApps"), Evme.$("#header"), Evme.$("#search-header")],
            "defaultImage": data.defaultBGImage
        });

        Evme.Banner.init({
            "el": Evme.$("#evmeBanner")
        });

        Evme.SearchHistory.init({
            "maxEntries": data.maxHistoryEntries
        });
    
        Evme.Tasker.init({
          "triggerInterval": data.taskerTriggerInterval
        });

        Evme.EventHandler.trigger(NAME, "init", {"deviceId": Evme.DoATAPI.getDeviceId()});
    }
};
