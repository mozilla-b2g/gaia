var Core = new function() {
    var _name = "Core", _this = this, logger,
        recalculateHeightRetries = 1,
        TIMEOUT_BEFORE_INIT_SESSION = "FROM CONFIG", displayed = false,
        OPACITY_CHANGE_DURATION = 300;

    this.shouldSearchOnInputBlur = true;

    this.init = function() {
        _this.initWithConfig(__config);

        window.addEventListener("message", function(e) {
            // if event has no message - return
            if (!e || !e.data) { return }

            var msg = e.data;

            // if mg is string - parse it
            if (typeof msg === "string") {
                try {
                    msg = JSON.parse(msg);
                } catch (ex) { return }
            }

            switch (msg.type) {
                case "visibilitychange":
                    // change window.hidden value
                    window.hidden = msg.data.hidden;

                    // fire visibilitychange event
                    var e = document.createEvent("Events");
                    e.initEvent("visibilitychange", true, false);
                    document.dispatchEvent(e);
                    break;
            }
        }, false);

        document.addEventListener("visibilitychange", function() {
            var method = window.hidden ? "remove" : "add";
            document.body.classList[method]("evme-displayed");
        }, false);
    };

    this.setOpacityBackground = function(value) {
        BackgroundImage.changeOpacity(value, OPACITY_CHANGE_DURATION, function() {
            if (value === 1) {
                document.body.classList.add("evme-displayed");
                displayed = true;
            } else {
                document.body.classList.remove("evme-displayed");
                displayed = false;
            }
        });
    }

    this.pageMove = function(dir, ratio) {
        if (!displayed && dir === "in") {
            document.body.classList.add("evme-displayed");
            displayed = true;
        }

        ratio = Math.floor(ratio*100)/100;
        var value = dir === "in" ? ratio : 1 - ratio;

        BackgroundImage.changeOpacity(value);
    }

    this.initWithConfig = function(data) {
        logger = (typeof Logger !== "undefined") ? new Logger() : console;

        var apiHost = Utils.getUrlParam("apiHost") || data.apiHost;
        apiHost && api.setHost(apiHost);

        TIMEOUT_BEFORE_INIT_SESSION = data.timeoutBeforeSessionInit;
        Brain.init({
            "numberOfAppsToLoad": data.numberOfAppsToLoad,
            "logger": logger,
            "minimumLettersForSearch": data.minimumLettersForSearch,
            "helper": data.texts.helper,
            "promptInstallAppText": data.texts.installAppPrompt,
            "trending": {
                "itemsPerPage": data.trending.itemsPerPage,
                "itemsOnFirstPage": data.trending.itemsOnFirstPage,
                "timeBeforeError": data.trending.timeBeforeError,
                "timeBeforeCache": data.trending.timeBeforeCache
            },
            "timeBeforeAllowingDialogsRemoval": data.timeBeforeAllowingDialogsRemoval,
            "tips": data.tips,
            "searchSources": data.searchSources,
            "pageViewSources": data.pageViewSources
        });

        DoATAPI.init({
            "env": data.env.server,
            "apiKey": data.apiKey,
            "appVersion": data.appVersion,
            "authCookieName": data.authCookieName
        });

        initObjects(data);
    };

    function initObjects(data) {
        var $container = $("#" + Utils.getID());

        Connection.init({
            "$parent": $container,
            "texts": data.texts.connection
        });

        Location.init({
            "$elName": $(".user-location"),
            "$elButton": $("#button-location"),
            "$elSelectorDialog": $("#location-selector"),
            "$elLocateMe": $("#locate-me"),
            "$elEnterLocation": $("#enter-location"),
            "$elDoItLater": $("#later"),
            "texts": data.texts.location
        });

        Screens.init({
            "$screens": $(".content_page"),
            "tabs": data.texts.tabs
        });

        Shortcuts.init({
            "$el": $("#shortcuts"),
            "$loading": $("#shortcuts-loading"),
            "design": data.design.shortcuts,
            "shortcutsFavorites": data.texts.shortcutsFavorites,
            "defaultShortcuts": data._defaultShortcuts
        });

        ShortcutsCustomize.init({
            "$parent": $container,
            "texts": data.texts.shortcutsFavorites
        });

        Searchbar.init({
            "$el": $("#search-q"),
            "$form": $("#search-rapper"),
            "$defaultText": $("#default-text"),
            "texts": data.texts.searchbar,
            "timeBeforeEventPause": data.searchbar.timeBeforeEventPause,
            "timeBeforeEventIdle": data.searchbar.timeBeforeEventIdle,
            "setFocusOnClear": false
        });

        Helper.init({
            "$el": $("#helper"),
            "$elTitle": $("#search-title"),
            "$tip": $("#helper-tip"),
            "defaultSuggestions": data.defaultSuggestions,
            "texts": data.texts.helper
        });
        Apps.init({
            "$el": $("#doat-apps"),
            "$buttonMore": $("#button-more"),
            "$header": $("#search #header"),
            "texts": data.texts.apps,
            "design": data.design.apps,
            "appHeight": data.apps.appHeight,
            "scrollThresholdTop": data.apps.scrollThresholdTop,
            "scrollThresholdBottom": data.apps.scrollThresholdBottom,
            "widthForFiveApps": data.apps.widthForFiveApps,
            "minHeightForMoreButton": data.minHeightForMoreButton,
            "defaultScreenWidth": {
                "portrait": 320,
                "landscape": 480
            }
        });
        BackgroundImage.init({
            "$el": $("#background-image"),
            "$elementsToFade": $("#doat-apps, #header, #search-header"),
            "defaultImage": data.defaultBGImage,
            "texts": data.texts.backgroundImage
        });
        SearchHistory.init({
            "maxEntries": data.maxHistoryEntries
        });

        EventHandler.trigger(_name, "init", {"deviceId": DoATAPI.getDeviceId()});
    }
};

Core.init();