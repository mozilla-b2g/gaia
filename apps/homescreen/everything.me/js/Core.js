window.Evme = new function() {
    var _name = "Core", _this = this, logger,
        recalculateHeightRetries = 1,
        TIMEOUT_BEFORE_INIT_SESSION = "FROM CONFIG",
        OPACITY_CHANGE_DURATION = 300,
        head_ts = new Date().getTime();

    this.shouldSearchOnInputBlur = true;

    this.init = function() {
        data = Evme.__config;

        logger = (typeof Logger !== "undefined") ? new Logger() : console;

        var apiHost = Evme.Utils.getUrlParam("apiHost") || data.apiHost;
        apiHost && Evme.api.setHost(apiHost);

        TIMEOUT_BEFORE_INIT_SESSION = data.timeoutBeforeSessionInit;

        Evme.Brain.init({
            "numberOfAppsToLoad": data.numberOfAppsToLoad,
            "logger": logger,
            "minimumLettersForSearch": data.minimumLettersForSearch,
            "helper": data.texts.helper,
            "apps": data.texts.apps,
            "promptInstallAppText": data.texts.installAppPrompt,
            "timeBeforeAllowingDialogsRemoval": data.timeBeforeAllowingDialogsRemoval,
            "tips": data.tips,
            "searchSources": data.searchSources,
            "pageViewSources": data.pageViewSources
        });

        Evme.DoATAPI.init({
            "env": data.env.server,
            "apiKey": data.apiKey,
            "appVersion": data.appVersion,
            "authCookieName": data.authCookieName
        });

        initObjects(data);
    };

    // Gaia communication methods
    this.setOpacityBackground = function(value) {
        Evme.BackgroundImage.changeOpacity(value, OPACITY_CHANGE_DURATION);
    };

    this.pageMove = function(value) {
        Evme.BackgroundImage.changeOpacity(Math.floor(value*100)/100);
    };
    
    this.onShow = function() {
        Evme.Shortcuts.refreshScroll();
        if (Evme.Searchbar.getValue() || Evme.Brain.SmartFolder.get()) {
            Evme.Brain.FFOS.hideMenu(); 
        } else {
            Evme.Brain.FFOS.showMenu();
        }
    };
    this.onHide = function() {
        Evme.Brain.App.cancel();
        Evme.Brain.Shortcuts.doneEdit();
        Evme.Brain.SmartFolder.closeCurrent();
    };
    
    this.onHideStart = function(source) {
        if (source == "homeButtonClick") {
            if (
                Evme.Brain.Shortcuts.hideIfEditing() ||
                Evme.Brain.ShortcutsCustomize.isOpen() ||
                Evme.Brain.ShortcutsCustomize.hideIfRequesting() ||
                Evme.Brain.SmartFolder.hideIfOpen()
            ) {
                return true;
            }
        }        

        Evme.Brain.Searchbar.blur();
        return false; // allow navigation to homescreen
    };

    function initObjects(data) {
        var $container = $("#" + Evme.Utils.getID());
        
        Evme.ConnectionMessage.init({
            "$parent": $container,
            "texts": data.texts.connection
        });
        
        Evme.Location.init({
            
        });
        
        Evme.Screens.init({
            "$screens": $(".content_page"),
            "tabs": data.texts.tabs
        });
        
        Evme.Shortcuts.init({
            "$el": $("#shortcuts"),
            "$loading": $("#shortcuts-loading"),
            "design": data.design.shortcuts,
            "shortcutsFavorites": data.texts.shortcutsFavorites,
            "defaultShortcuts": data._defaultShortcuts
        });
        
        Evme.ShortcutsCustomize.init({
            "$parent": $container,
            "texts": data.texts.shortcutsFavorites
        });

        Evme.Searchbar.init({
            "$el": $("#search-q"),
            "$form": $("#search-rapper"),
            "$defaultText": $("#default-text"),
            "texts": data.texts.searchbar,
            "timeBeforeEventPause": data.searchbar.timeBeforeEventPause,
            "timeBeforeEventIdle": data.searchbar.timeBeforeEventIdle,
            "setFocusOnClear": false
        });

        Evme.Helper.init({
            "$el": $("#helper"),
            "$elTitle": $("#search-title"),
            "$tip": $("#helper-tip"),
            "texts": data.texts.helper
        });

        Evme.Apps.init({
            "$el": $("#evmeApps"),
            "$buttonMore": $("#button-more"),
            "$header": $("#search #header"),
            "texts": data.texts.apps,
            "design": data.design.apps,
            "appHeight": data.apps.appHeight,
            "minHeightForMoreButton": data.minHeightForMoreButton,
            "defaultScreenWidth": {
                "portrait": 320,
                "landscape": 480
            }
        });

        Evme.BackgroundImage.init({
            "$el": $("#search-overlay"),
            "$elementsToFade": $("#evmeApps, #header, #search-header"),
            "defaultImage": data.defaultBGImage,
            "texts": data.texts.backgroundImage
        });

        Evme.SearchHistory.init({
            "maxEntries": data.maxHistoryEntries
        });

        Evme.Analytics.init({
            "config": data.analytics,
            "logger": logger,
            "namespace": Evme,
            "DoATAPI": Evme.DoATAPI,
            "getCurrentAppsRowsCols": Evme.Apps.getCurrentRowsCols,
            "Brain": Evme.Brain,
            "env": data.env.server,
            "connectionLow": Evme.Utils.connection().speed != Evme.Utils.connection().SPEED_HIGH,
            "sessionObj": Evme.DoATAPI.Session.get(),
            "pageRenderStartTs": head_ts,
            "SEARCH_SOURCES": data.searchSources,
            "PAGEVIEW_SOURCES": data.pageViewSources
        });

        Evme.EventHandler.trigger(_name, "init", {"deviceId": Evme.DoATAPI.getDeviceId()});
    }
};
