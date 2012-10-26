Evme.Brain = new function() {
    var _this = this,
        Brain = this,
        _config = {},
        logger = null,
        $body = null,
        $container = null,
        QUERIES_TO_NOT_CACHE = "",
        DEFAULT_NUMBER_OF_APPS_TO_LOAD = 16,
        NUMBER_OF_APPS_TO_LOAD = DEFAULT_NUMBER_OF_APPS_TO_LOAD,
        TIME_BEFORE_INVOKING_HASH_CHANGE = 200,
        TIMEOUT_BEFORE_ALLOWING_DIALOG_REMOVE = "FROM CONFIG",
        MINIMUM_LETTERS_TO_SEARCH = 1,
        SEARCH_SOURCES = {},
        PAGEVIEW_SOURCES = {},
        TIPS = {},

        // whether to show shortcuts customize on startup or not
        ENABLE_FAVORITES_SHORTCUTS_SCREEN = false,

        HISTORY_CLEAR_TEXT = "FROM CONFIG",
        REFINE_DISMISS_TEXT = "FROM CONFIG",
        NO_REFINE_TEXT = "FROM CONFIG",
        SHOW_HISTORY_TEXT = "FROM CONFIG",

        QUERY_TYPES = {
            "EXPERIENCE": "experience",
            "APP": "app",
            "QUERY": "query"
        },

        timeoutSetUrlAsActive = null,
        timeoutHashChange = null,
        _ = navigator.mozL10n.get;;

    this.init = function(options) {
        Evme.EventHandler && Evme.EventHandler.bind(catchCallback);
        $body = $("#" + Evme.Utils.getID());
        $container = $("#" + Evme.Utils.getID());

        _config = options;

        // Helper
        HISTORY_CLEAR_TEXT = _config.helper.clearHistory;
        REFINE_DISMISS_TEXT = _config.helper.dismiss;
        NO_REFINE_TEXT = _config.helper.noRefine;
        SHOW_HISTORY_TEXT = _config.helper.linkHistory;

        // Tips
        TIPS = _config.tips;
        TIMEOUT_BEFORE_ALLOWING_DIALOG_REMOVE = _config.timeBeforeAllowingDialogsRemoval;

        SEARCH_SOURCES = _config.searchSources;
        PAGEVIEW_SOURCES = _config.pageViewSources;

        logger = _config && _config.logger || console;
    };

    function catchCallback(_class, _event, _data) {
        logger.debug(_class + "." + _event + "(", (_data || ""), ")");

        try {
            _this[_class] && _this[_class][_event] && _this[_class][_event](_data || {});
        } catch(ex){
            logger.error(ex);
        }
    }

    this.Core = new function() {
        var _this = this;

        this.init = function() {
            Searcher.empty();
            Evme.Searchbar.clear();
            Brain.Searchbar.setEmptyClass();

            Evme.Shortcuts.loadDefault();
            Evme.Shortcuts.show();
        };
    };

    this.Searchbar = new function() {
        var _this = this,
            timeoutBlur = null,
            tipKeyboard = null,
            TIMEOUT_BEFORE_RUNNING_BLUR = 50;

        this.focus = function(data) {
            Evme.Utils.setKeyboardVisibility(true);
            
            if (!Evme.Screens.Search.active()) {
                if (data && data.e && data.e.type === "touchstart"){
                    data.e.preventDefault();
                }
                window.setTimeout(function() {
                    Evme.Screens.Search.show({"pageviewSource": PAGEVIEW_SOURCES.TAB});
                }, 0);
                window.setTimeout(Evme.Helper.showTip, 320);
            } else {
                Evme.Helper.showTip();
            }

            Evme.Location.hideButton();

            Evme.Helper.disableCloseAnimation();
            Evme.Helper.hideTitle();
            if (Evme.Searchbar.getValue() !== "") {
                Evme.Helper.showSuggestions();
            } else {
                Brain.Helper.showDefault();
            }

            if (!tipKeyboard) {
                tipKeyboard = new Evme.Tip(TIPS.SEARCHBAR_FOCUS).show();
            }
        };

        this.blur = function(data) {
            // Gaia bug workaround because of this http://b2g.everything.me/tests/input-blur.html
            data && data.stopPropagation && data.stopPropagation();
            
            if (Brain.Dialog.isActive()) {
                return;
            }
            
            window.setTimeout(_this.hideKeyboardTip, 500);
            
            Evme.Utils.setKeyboardVisibility(false);
            _this.setEmptyClass();
            Evme.Location.showButton();
            Evme.Apps.refreshScroll();

            if (Evme.Searchbar.getValue() == "") {
                Evme.Helper.setTitle();
                Evme.Helper.showTitle();
            }

            if (Evme.shouldSearchOnInputBlur){
                window.clearTimeout(timeoutBlur);
                timeoutBlur = window.setTimeout(_this.returnPressed, TIMEOUT_BEFORE_RUNNING_BLUR);
            }
        };

        this.onfocus = this.focus;
        this.onblur = this.blur;

        this.empty = function(data) {
            Searcher.cancelRequests();
            _this.emptySource = (data && data.pageviewSource) || (data.sourceObjectName === "Searchbar" && PAGEVIEW_SOURCES.CLEAR);
            Searcher.empty();
            _this.setEmptyClass();

            Evme.Shortcuts.show();
        };

        this.clear = function(e) {
            Searcher.cancelRequests();
            Evme.Apps.clear();
            Evme.Helper.setTitle();
            Brain.Helper.showDefault();

            Evme.DoATAPI.cancelQueue();

            Evme.Connection.hide();
        };

        this.returnPressed = function(data) {
            if (Brain.Dialog.isActive()) {
                data && data.e && data.e.preventDefault();
                return;
            }

            var query = Evme.Searchbar.getValue();
            Searcher.searchExactFromOutside(query, SEARCH_SOURCES.RETURN_KEY);
            Evme.Searchbar.blur();
        };

        this.setEmptyClass = function() {
            var query = Evme.Searchbar.getValue();

            if (!query) {
                $body.addClass("empty-query");
            } else {
                $body.removeClass("empty-query");
            }
        };

        this.cancelBlur = function() {
            window.clearTimeout(timeoutBlur);
        };

        this.backButtonClick = function(data) {
            _this.cancelBlur();
            Evme.Screens.Search.hide();

            if (!Evme.Screens.active()) {
                Evme.Screens.goTo(DEFAULT_PAGE);
            }
        };

        this.valueChanged = function(data) {
            _this.hideKeyboardTip();

            var lastQuery = Searcher.getDisplayedQuery();

            if (data.value && (data.value.length > MINIMUM_LETTERS_TO_SEARCH || lastQuery != "")) {
                Searcher.searchAsYouType(data.value, SEARCH_SOURCES.TYPING);
            }

            _this.setEmptyClass();
            Evme.Helper.hideTitle();
        };

        this.idle = function(data) {

        };

        this.pause = function(data) {
            var suggestions = Evme.Helper.getData().suggestions || [];
            if (!suggestions || suggestions.length == 0) {
                return;
            }

            var typedQuery = Evme.Searchbar.getValue(),
                suggestionsQuery = Evme.Helper.getSuggestionsQuery(),
                firstSuggestion = suggestions[0].replace(/[\[\]]/g, "");

            if (typedQuery == suggestionsQuery) {
                Searcher.searchExactAsYouType(firstSuggestion, typedQuery);
            }
        };

        this.hideKeyboardTip = function() {
            if (tipKeyboard) {
                tipKeyboard.hide();
                tipKeyboard = null;
            }
        };
    };

    this.Helper = new function() {
        var _this = this,
            cleared = false,
            refineQueryShown = "",
            flashCounter = 0,
            previousFirstSuggestion = "",
            SEARCHES_BEFORE_FLASHING_HELPER = 4,
            TIMEOUT_ANDROID_BEFORE_HELPER_CLICK = 500;

        var sourcesMap = {
            "suggestions": SEARCH_SOURCES.SUGGESTION,
            "didyoumean": SEARCH_SOURCES.SPELLING,
            "refine": SEARCH_SOURCES.REFINE,
            "history": SEARCH_SOURCES.HISTORY
        };

        this.load = function(data) {
            refineQueryShown = "";
        };

        this.click = function(data) {
            var query = data.value,
                index = data.index,
                source = data.source || "suggestions",
                type = data.type;

            if (query == ".") {
                query = Evme.Searchbar.getValue();
            }

            Evme.Helper.enableCloseAnimation();
            Evme.Helper.setTitle(query);
            window.setTimeout(Evme.Helper.showTitle, 0);

            Searcher.searchExactFromOutside(query, sourcesMap[source], index, type);
        };

        this.clear = function() {
            if (!cleared) {
                cleared = true;
                _this.showDefault();
            }
        };

        this.animateDefault = function() {
            Evme.Helper.animateLeft(function(){
                _this.showDefault();
                Evme.Helper.animateFromRight();
            });
        };

        this.showDefault = function() {
            Searcher.cancelRequests();
            Evme.BackgroundImage.loadDefault();

            if (Evme.Searchbar.getValue() == "" && !Evme.Utils.isKeyboardVisible()) {
                Evme.Helper.setTitle();
                Evme.Helper.showTitle();
            } else {
                _this.loadHistory();
            }
        };

        this.animateIntoHistory = function(history) {
            if (!history || history.length > 0) {
                Evme.Helper.animateLeft(function(){
                    _this.loadHistory(history);
                    Evme.Helper.animateFromRight();
                });
            }
        };

        this.loadHistory = function(history) {
            history = history || Evme.SearchHistory.get();

            if (history && history.length > 0) {
                var items = [];
                for (var i=0,l=history.length; i<l; i++) {
                    items.push({
                        "id": history[i].type,
                        "type": history[i].type,
                        "name": history[i].query
                    });
                }

                Evme.Helper.loadHistory(items);
                Evme.Helper.showHistory();
            }
        };

        this.showRefinement = function(data) {
            var types = data.data;
            var query = Searcher.getDisplayedQuery();

            if (refineQueryShown != query) {

                window.setTimeout(function(){
                    Evme.Helper.Loading.show();
                }, 20);

                Evme.DoATAPI.getDisambiguations({
                    "query": query
                }, function(data) {
                    if (data.errorCode != Evme.DoATAPI.ERROR_CODES.SUCCESS) {
                        Evme.Helper.Loading.hide();
                        return;
                    }

                    var types = data.response;
                    if (types) {
                        Evme.Helper.loadRefinement(types);
                        Evme.Helper.showRefinement();
                        refineQueryShown = query;
                    }
                });
            }
        };

        this.show = function(data) {
            var items = data.data;
            var type = data.type;

            cleared = false;

            Evme.Helper.getList().removeClass("default");

            switch (type) {
                case "":
                    var history = Evme.SearchHistory.get() || [];
                    if (history && history.length > 0) {
                        Evme.Helper.addLink(SHOW_HISTORY_TEXT, function(){
                            _this.animateIntoHistory(history);
                        });
                    }
                    break;
                case "refine":
                    if (refineQueryShown == Searcher.getDisplayedQuery()) {
                        if (items.length == 1) {
                            Evme.Helper.addText(NO_REFINE_TEXT);
                        }

                        Evme.Helper.addLink(REFINE_DISMISS_TEXT, didyoumeanClick);
                    }
                    break;

                case "didyoumean":
                    Evme.Helper.addLink(REFINE_DISMISS_TEXT, didyoumeanClick);
                    break;

                case "history":
                    Evme.Helper.addLink(HISTORY_CLEAR_TEXT, function(e){
                        Evme.SearchHistory.clear();
                        helperClick(Evme.Helper.clear, e);
                    });

                    break;
            }
        };

        function showApps(query, source) {
            if (!Evme.Screens.Search.active()) {
                return;
            }

            if (typeof query == "string") {
                query = {
                    "query": query,
                    "type": ""
                };
            }

            Searcher.searchExact(query.query, source, 1, query.type, false, true);
        }

        function didyoumeanClick(e) {
            var callback = Evme.Helper.showTitle;
            if (Evme.Utils.isKeyboardVisible()) {
                callback = Evme.Helper.showSuggestions;
            }

            helperClick(callback, e);
        }

        function helperClick(callback, e) {
            e && e.stopPropagation();
            e && e.preventDefault();

            setTimeout(callback, TIMEOUT_ANDROID_BEFORE_HELPER_CLICK);
        }
    };


    this.Location = new function() {
        var lastLat = "", lastLon = "";

        this.requesting = function() {
            $body.addClass("requesting-location");
        };

        this.got = function() {
            $body.removeClass("requesting-location");
        };

        this.set = function(data) {
            Evme.Location.hideDialog();
            Evme.DoATAPI.setLocation(data.lat, data.lon);

            if (data.lat !== lastLat || data.lon !== lastLon) {
                lastLat = data.lat;
                lastLon = data.lon;
                Searcher.searchAgain(SEARCH_SOURCES.LOCATION_REFRESH);
            }
        };

        this.error = function() {
            $body.removeClass("requesting-location");
        };

        this.zipValueChanged = function(data) {
            Brain.LocationSelector.searchLocation(data.value, data.callback);
        };

        this.zipSearch = function(data) {
            Brain.LocationSelector.searchLocation(data.value, function(location) {
                if (location && Evme.Location.length > 0) {
                    location = location[0];
                    data.callback(Evme.Location.lat, Evme.Location.lon, Evme.Location.name, data.dialog);
                }
            });
        };

        this.setCallbacks = function(options) {
            callbackSet = options.success;
            callbackError = options.error;
        };
    };

    this.LocationSelector = new function() {
        var requestSearch = null, _this = this;

        this.show = function() {
            $body.addClass("location-input-visible");
        };

        this.valueChanged = function(data) {
            var value = data.value;
            var e = data.e;
            var callback = data.callback || function(){};

            requestSearch && requestSearch.abort();

            // If the query contains digits- don't autocomplete
            if (value.match(/[\d*]/g)) {
                Evme.Location.LocationSelector.clear();

                // If the user presses "return"- resolve it
                if (e.keyCode == 13) {
                    Evme.Location.LocationSelector.blur();
                }

                return;
            }

            if (value) {
                _this.searchLocation(value, callback);
            }
        };

        this.blur = function(data) {
            var query = data.value;

            if (query.match(/\d\d\d\d\d/g)) {
                requestSearch = Evme.DoATAPI.searchLocations({
                    "query": query
                }, function(data) {
                    var location = data.response;
                    if (location && Evme.Location.length > 0) {
                        location = location[0];

                        Evme.Location.setLocation(Evme.Location.lat, Evme.Location.lon, Evme.Location.name);
                        _this.close();
                    }
                });
            }
        };

        this.searchLocation = function(query, callback) {
            requestSearch = Evme.DoATAPI.searchLocations({
                "query": query
            }, function(data) {
                callback(data.response);
            });
        }

        this.click = function(data) {
            Evme.Location.setLocation(data.lat, data.lon, data.city);
        };

        this.close = function() {
            $body.removeClass("location-input-visible");
            Evme.Location.hideDialog();
        };
    };

    this.Apps = new function() {
        var bShouldGetHighResIcons = false;

        this.init = function() {
            bShouldGetHighResIcons = Evme.Utils.getIconsFormat() == Evme.Utils.ICONS_FORMATS.Large;
            Evme.EventHandler && Evme.EventHandler.bind(Brain.App.handleEvents);
        };

        this.loadComplete = function(data) {
            var icons = data.icons,
                iconsToGet = icons.missing;

            if (bShouldGetHighResIcons && !Evme.Utils.isKeyboardVisible() && icons && icons.cached) {
                for (var i=0; i<icons.cached.length; i++) {
                    var icon = icons.cached[i];
                    if (icon && icon.id && icon.format < Evme.Utils.ICONS_FORMATS.Large) {
                        iconsToGet.push(icon.id);
                    }
                }
            }

            if (iconsToGet && iconsToGet.length > 0) {
                Searcher.getIcons(iconsToGet, Evme.Utils.ICONS_FORMATS.Large);
            }
        };

        this.scrollTop = function() {
            Evme.BackgroundImage.showFullScreen();
        };

        this.scrollBottom = function() {
            Searcher.loadMoreApps();
        };

        this.errorRetryClick = function() {

        };
    };

    this.AppsMore = new function() {
        this.show = function() {
        };

        this.hide = function() {
        };

        this.buttonClick = function() {
            Searcher.loadMoreApps();
        };
    };

    this.App = new function() {
        var _this = this,
            bNeedsLocation = false,
            isKeyboardOpenWhenClicking = false,
            loadingApp = null,
            loadingAppAnalyticsData,
            loadingAppId = false;

        var STORAGE_KEY_CLOSE_WHEN_RETURNING = "needsToCloseKeyboard";

        this.close = function(data) {
            Evme.Apps.removeApp(data.data.id);
        };

        this.hold = function(data) {
            var isAppInstalled = Evme.Utils.sendToFFOS(
                Evme.Utils.FFOSMessages.IS_APP_INSTALLED,
                { "url": data.data.appUrl }
            );

            if (isAppInstalled) {
                var msg = _('app-exists-in-home-screen', {name: data.data.name});
                window.alert(msg);
                return;
            }

            var msg = _('add-to-home-screen-question', {name: data.data.name})
            var response = window.confirm(msg);
            if (!response) {
                return;
            }

            // get icon data
            var appIcon = Evme.Utils.formatImageData(data.data.icon);
            // make it round
            Evme.Utils.getRoundIcon(appIcon, 58, 2, function(appIcon) {
                // bookmark
                Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_INSTALL, {
                    "originUrl": data.app.getFavLink(),
                    "title": data.data.name,
                    "icon": appIcon
                });
            });
        };

        this.click = function(data) {
            if (Evme.Screens.active() == "user" && !Evme.Screens.Search.active()) {
                Brain.UserPage.clickApp(data);
                return;
            }

            if (!Searcher.isLoadingApps()) {
                data.keyboardVisible = Evme.Utils.isKeyboardVisible() ? 1 : 0;

                if (!Searcher.searchedExact()) {
                    Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, true);

                    Evme.Searchbar.setValue(Searcher.getDisplayedQuery(), false, true);

                    Evme.Searchbar.blur();
                    Brain.Searchbar.cancelBlur();

                    window.setTimeout(function(){
                        _this.animateAppLoading(data);
                    }, 50);
                } else {
                    Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, false);
                    _this.animateAppLoading(data);
                }
            }
        };

        this.isLoadingApp = function() {
            return loadingApp;
        };

        this.animateAppLoading = function(data) {
            Searcher.cancelRequests();

            loadingApp = true;
            var $app = data.$el;

            loadingAppAnalyticsData = {
                "index": data.index,
                "keyboardVisible": data.keyboardVisible,
                "isMore": data.isMore,
                "appUrl": data.app.getLink(),
                "favUrl": data.app.getFavLink(),
                "name": data.data.name,
                "id": data.appId,
                "query": Searcher.getDisplayedQuery(),
                "source": Searcher.getDisplayedSource(),
                "icon": data.data.icon
            };

            loadingApp = data.app;
            loadingAppId = data.data.id;
            bNeedsLocation = data.data.requiresLocation && !Evme.DoATAPI.hasLocation() && !Evme.Location.userClickedDoItLater();

            var $apps = $("#evmeApps");
            var appListHeight = $apps.height(),
                appListWidth = $apps.width(),
                appHeight = $app.height(),
                appWidth = $app.width();

            var newPos = {
                "top": (appListHeight-appHeight)/2 - Evme.Apps.getScrollPosition(),
                "left": (appListWidth-appWidth)/2
            };

            $("#loading-app").remove();

            var $pseudo = $('<li class="inplace ' + $app.attr("class") + '" id="loading-app">' + loadingApp.getHtml() + '</li>');
            $pseudo[0].setAttribute("style", Evme.Utils.cssPrefix() + "transform: translate(" + $app[0].offsetLeft + "px, " + $app[0].offsetTop + "px)");

            var appName = "Loading...";
            if (bNeedsLocation) {
                appName = "";
            }
            $pseudo.find("b").text(appName);

            $app.parent().append($pseudo);
            $body.addClass("loading-app");

            window.setTimeout(function(){
                $pseudo[0].setAttribute("style", Evme.Utils.cssPrefix() + "transform: translate(" + newPos.left + "px, " + newPos.top + "px)");
            }, 0);

            if (bNeedsLocation) {
                Evme.Location.requestUserLocation(Evme.Location.showErrorDialog);
            } else {
                goToApp(loadingAppAnalyticsData, 500);
            }
        };

        this.handleEvents = function(_class, _event, _data){
            if (!bNeedsLocation) {
                return;
            }

            if (_class == "Apps" && _event == "loadComplete") {
                bNeedsLocation = false;

                var apps = _data.data;
                for (var i=0; i<Evme.Apps.length; i++) {
                    if (apps[i].id == loadingAppId) {
                        loadingApp.update(apps[i]);
                    }
                }
                goToApp(loadingAppAnalyticsData);
            } else if (_class == "Dialog" && _event == "buttonClick") {
                // User clicked on "Do it later"
                if (_data.id == "location_error" && _data.button == "ok") {
                    goToApp(loadingAppAnalyticsData);
                }
            } else if (_class == "Location" && _event == "error") {
                if ($(".dialog").length == 0) {
                    goToApp(loadingAppAnalyticsData);
                }
            }
        };

        function goToApp(data, delay) {
            !delay && (delay = 0);
            data["appUrl"] = loadingApp.getLink();

            Evme.EventHandler.trigger("Core", "redirectedToApp", data);

            window.setTimeout(function(){
                _this.appRedirectExecute(data);
            }, delay);
        }

        this.appRedirectExecute = function(data){
            var appIcon = Evme.Utils.formatImageData(data.icon);

            Evme.Utils.getRoundIcon(appIcon, 58, 2, function(appIcon) {
                // bookmark in ffos
                Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_CLICK, {
                    "url": data.appUrl,
                    "originUrl": data.favUrl,
                    "title": data.name,
                    "icon": appIcon,
                    "urlTitle": Evme.Searchbar.getValue()
                });
            });

            setTimeout(returnFromOutside, 2000);
        };

        function returnFromOutside() {
            if (loadingApp) {
                loadingApp = null;

                bNeedsLocation = false;
                loadingAppAnalyticsData = null;
                loadingAppId = false;

                Searcher.clearTimeoutForShowingDefaultImage();
                $("#loading-app").remove();
                Evme.BackgroundImage.cancelFullScreenFade();
                $body.removeClass("loading-app");

                if (Evme.Storage.get(STORAGE_KEY_CLOSE_WHEN_RETURNING)) {
                    Searcher.searchAgain();
                }
                Evme.Storage.remove(STORAGE_KEY_CLOSE_WHEN_RETURNING);

                Evme.EventHandler.trigger("Core", "returnedFromApp");
            }
        }
    };

    this.BackgroundImage = new function() {
        this.CLASS_FULLSCREEN = "fullscreen-bgimage";

        this.updated = function() {

        };

        this.load = function() {

        };

        //overriden in Brain.android.js
        this.showFullScreen = function() {
            $body.addClass(Brain.BackgroundImage.CLASS_FULLSCREEN);
        };

        this.hideFullScreen = function() {
            $body.removeClass(Brain.BackgroundImage.CLASS_FULLSCREEN);
        };
    };


    this.Shortcuts = new function() {
        var _this = this,
            customizeInited = false,
            timeoutShowLoading = null,
            $screen = null,
            clickedCustomizeHandle = false,
            loadingCustomization = false;

        this.loaded = false;

        var SHOW_FAVORITES_SHORTCUTS_SELECTION_SCREEN_STORAGE_KEY = "shrtFav";

        this.init = function() {
            $screen = $('<div id="category-page-screen"></div>');
            $("#shortcuts-page .pages").append($screen);

            var $buttonClose = $('<b id="close-category"></b>');
            $buttonClose.bind("touchstart", function(e){
                e.preventDefault();
                e.stopPropagation();
                _this.closeCategoryPage();
            });
            $("#shortcuts-page .pages").append($buttonClose);
        };

        this.show = function() {
            new Evme.Tip(TIPS.APP_EXPLAIN, function(tip) {
                $(document.body).bind("touchstart", tip.hide);
            }).show();

            Brain.Searchbar.hideKeyboardTip();

            _this.loadFromAPI(function(){
                Brain.ShortcutsCustomize.addCustomizeButton();
            });
        };

        this.closeCategoryPage = function() {
            Evme.Shortcuts.showCategories();
        };

        this.loadFromAPI = function(callback, bForce) {
            if (!_this.loaded || bForce) {
                Evme.DoATAPI.Shortcuts.get({
                    "iconFormat": Evme.Utils.getIconsFormat(),
                }, function(data, methodNamespace, methodName, url) {
                    Evme.Shortcuts.load(data.response, callback);
                });
            } else {
                callback && callback(Evme.Shortcuts.get());
            }
        };

        function checkForMissingShortcutIcons() {
            var $elsWithMissingIcons = Evme.Shortcuts.getElement().find("*[iconToGet]"),
                appIds = [];

            if ($elsWithMissingIcons.length == 0) {
                return false;
            }

            for (var i=0,l=$elsWithMissingIcons.length; i<l; i++) {
                var $el = $elsWithMissingIcons[i],
                    appId = $el.getAttribute("iconToGet");

                appIds.push(appId);
            }

            Evme.DoATAPI.icons({
                "ids": appIds.join(","),
                "iconFormat": Evme.Utils.getIconsFormat()
            }, function(data) {
                if (!data || !data.response) {
                    return;
                }

                var icons = data.response;
                for (var i in icons) {
                    var icon = icons[i],
                        objIcon = Evme.IconManager.add(icon.id, icon.icon, Evme.Utils.getIconsFormat()),
                        iconImage = Evme.Utils.formatImageData(objIcon);

                    $elsWithMissingIcons.filter("[iconToGet='" + icon.id + "']").css("background-image", "url(" + iconImage + ")");
                }
            });

            return true;
        }

        this.hide = function() {

        };

        this.handleCustomizeClick = function() {
            Evme.ShortcutsCustomize.show(false);
        };

        this.click = function(data) {
            if (!data || !data.data || !data.data.query) {
                return;
            }

            if (!Evme.Shortcuts.customizing() && !Evme.Shortcuts.isSwiping()) {
                var query = data.data.query,
                    tips = Evme.__config.categoriesDialogs;

                data.query = query;

                Evme.EventHandler.trigger("Shortcut", "click", data);

                if (tips[query] && !data.force) {
                    tips[query].query = query;
                    Evme.Shortcuts.showPage(tips[query]);

                    if ($("#category-options li").length == 1) {
                        $("#page-category").addClass("one-option");
                    } else {
                        $("#page-category").removeClass("one-option");
                    }
                } else {
                    searchShortcut(data);
                }
            }
        };

        function searchShortcut(data) {
            !data.source && (data.source = SEARCH_SOURCES.SHORTCUT);

            Evme.EventHandler.trigger("Shortcut", "search", data);

            Searcher.searchExactFromOutside(data.query, data["source"], data.index, data.type);
        }

        this.clickContinue = function(data) {
            data.source = SEARCH_SOURCES.SHORTCUT_CONTINUE_BUTTON;
            searchShortcut(data);

            // after we search, hide the category middle page
            // so when users return they see the main categories
            window.setTimeout(function(){
                Evme.Shortcuts.showCategories();
            }, 1000);
        };

        this.searchCategoryPage = function(data) {
            data.source = SEARCH_SOURCES.SHORTCUT_ENTITY;
            searchShortcut(data);

            window.setTimeout(function(){
                Evme.Shortcuts.showCategories();
            }, 1000);
        };

        this.remove = function(data) {
            data.shortcut.remove();
            Evme.Shortcuts.remove(data.shortcut);

            if (!data.shortcut.isCustom()) {
                Evme.ShortcutsCustomize.add(data.data);
            }
        };

        this.load = function(data) {
            _this.loaded = true;
        };

        this.dragStart = function(data) {
            if (Evme.Shortcuts.customizing()) {
                Evme.ShortcutsCustomize.Dragger.start(data.e, data.shortcut);
            }
        };
    };

    this.ShortcutsCustomize = new function() {
        var _this = this,
            isFirstShow = true;

        this.init = function() {

        };

        this.show = function() {
            if (isFirstShow) {
                isFirstShow = false;

                // load user/default shortcuts from API
                Evme.Brain.Shortcuts.loadFromAPI(function(userShortcuts) {
                    var shortcutsToFavorite = {};
                    
                    for (var i=0; i<userShortcuts.length; i++) {
                        var q = userShortcuts[i].getQuery();
                        shortcutsToFavorite[q.toLowerCase()] = {
                            "query": q,
                            "checked": true
                        };
                    }
                    
                    Evme.ShortcutsCustomize.load(shortcutsToFavorite);
                    
                    // load suggested shortcuts from API
                    Evme.DoATAPI.Shortcuts.suggest({}, function(data) {
                        var suggestedShortcuts = data.response.shortcuts,
                            shortcutsToSuggest = {};
                        
                        for (var i=0; i<suggestedShortcuts.length; i++) {
                            var q = suggestedShortcuts[i].query;
                            if (!shortcutsToFavorite[q.toLowerCase()]) {
                                shortcutsToSuggest[q.toLowerCase()] = {
                                    "query": q,
                                    "checked": false
                                };
                            }
                        }
                        
                        Evme.ShortcutsCustomize.add(shortcutsToSuggest);
                    });
                });
            }
        };

        this.hide = function() {
        };

        this.done = function(data) {
            Evme.Shortcuts.show();
            Evme.ShortcutsCustomize.hide();

            Evme.DoATAPI.Shortcuts.set({
                "shortcuts": JSON.stringify(data.shortcuts)
            }, function(data){
                Brain.Shortcuts.loadFromAPI(function(){
                    _this.addCustomizeButton();
                }, true);
            });
        };


        this.addCustomizeButton = function() {
            var $el = Evme.Shortcuts.getElement(),
                $elCustomize = $('<li class="shortcut add"><div class="c"><span class="thumb"></span><b>More</b></div></li>');

            $el.find(".shortcut.add").remove();

            $elCustomize.bind("click", function(){
                //if (!EvmePageMoved) {
                    Evme.ShortcutsCustomize.show(false);
                //}
            });

            $el.append($elCustomize);
        };
    };

    this.Dialog = new function() {
        var active = null;

        this.show = function(data) {
            active = data.obj;
            if (data.id == "location_error") {
                $body.addClass("location-input-visible");
            }
        };

        this.remove = function(data) {
            active = null;
            $body.removeClass("location-input-visible");
        };

        this.blackoutClick = function() {
            if (Evme.Utils.isKeyboardVisible()) {
                Evme.Searchbar.focus();
                _this.Evme.Searchbar.cancelBlur();
            }
        };

        this.getActive = function() {
            return active;
        };

        this.isActive = function() {
            return (active !== null && !Brain.Tips.isVisible());
        };
    };



    this.Tips = new function() {
        var _this = this,
            activeTip = null,
            timeoutShowTip = null;

        this.show = function(tip, options) {
            !options && (options = {});

            if (activeTip) {
                return null;
            }

            var onHelper = false;

            if (options.query) {
                for (var tipId in TIPS.HELPER) {
                    if (tipId == options.query.toUpperCase()) {
                        var helperTip = TIPS.HELPER[tipId];

                        helperTip.timesShown = _this.timesShown(helperTip);

                        if (_this.timesShown(helperTip) < helperTip.timesToShow) {
                            showHelperTip(helperTip, options);
                            onHelper = true;
                        }

                        break;
                    }
                }
            }

            return onHelper;
        };

        function showHelperTip(tip, options) {
            Evme.Helper.showText(tip.text);
            Evme.Helper.hideTitle();
            Evme.Helper.flash();
            _this.markAsShown(tip);
        }

        this.markAsShown = function(tip) {
            tip.timesShown++;
            Evme.Storage.set(tip.id, tip.timesShown);
        };

        this.timesShown = function(tip) {
            return Evme.Storage.get(tip.id) || 0;
        };

        this.isVisible = function() {
            return activeTip;
        };
    };

    this.Connection = new function() {
        this.online = function() {
            Evme.Connection.hide();
            Evme.DoATAPI.backOnline();
        };
        this.offline = function() {
        };
        this.show = function() {
        };
        this.hide = function() {
        };
    };

    this.DoATAPI = new function() {
        this.cantSendRequest = function() {
            var message;
            if (Evme.Searchbar.getValue()) {
                message = "To get apps for \""+Evme.Searchbar.getValue()+"\" please connect to the internet";
            }
            Evme.Connection.show(message);
        };
    };

    this.Searcher = new function() {
        var appsCurrentOffset = 0,
            lastSearch = {},
            lastQueryForImage = "",
            hasMoreApps = false,
            iconsCachedFromLastRequest = [],
            autocompleteCache = {},
            timeoutShowExactTip = null,

            requestSearch = null,
            requestImage = null,
            requestIcons = null,
            requestAutocomplete = null,

            timeoutShowDefaultImage = null,
            timeoutHideHelper = null,
            timeoutSearchImageWhileTyping = null,
            timeoutSearch = null,
            timeoutSearchWhileTyping = null,
            timeoutAutocomplete = null,

            TIMEOUT_BEFORE_REQUESTING_APPS_AGAIN = 500,
            TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE = 3000,
            TIMEOUT_BEFORE_SHOWING_HELPER = 3000,
            TIMEOUT_BEFORE_RENDERING_AC = 200,
            TIMEOUT_BEFORE_RUNNING_APPS_SEARCH = 200,
            TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH = 500,
            TIMEOUT_BEFORE_AUTO_RENDERING_MORE_APPS = 200;

        function resetLastSearch(bKeepImageQuery) {
            lastSearch = {
                "query": "",
                "exact": false,
                "type": "",
                "offset": false,
                "source": ""
            };

            if (!bKeepImageQuery) {
                lastQueryForImage = "";
            }
        }
        resetLastSearch();

        this.isLoadingApps = function() {
            return requestSearch;
        };

        this.getApps = function(options) {
            var query = options.query,
                type = options.type,
                source = options.source,
                index = options.index,
                reloadingIcons = options.reloadingIcons,
                exact = options.exact || false,
                iconsFormat = options.iconsFormat,
                offset = options.offset,
                onlyDidYouMean = options.onlyDidYouMean;

            Evme.Searchbar.startRequest();

            var removeSession = reloadingIcons;
            var prevQuery = removeSession? "" : lastSearch.query;
            var getSpelling = (source !== SEARCH_SOURCES.SUGGESTION && source !== SEARCH_SOURCES.REFINE && source !== SEARCH_SOURCES.SPELLING);

            if (exact && appsCurrentOffset === 0) {
                window.clearTimeout(timeoutHideHelper);

                if (!onlyDidYouMean) {
                    if (!options.automaticSearch) {
                        var urlOffset = appsCurrentOffset+NUMBER_OF_APPS_TO_LOAD;
                        if (urlOffset == NUMBER_OF_APPS_TO_LOAD && NUMBER_OF_APPS_TO_LOAD == DEFAULT_NUMBER_OF_APPS_TO_LOAD) {
                            urlOffset = 0;
                        }

                        Evme.SearchHistory.save(query, type);
                    }

                    timeoutHideHelper = window.setTimeout(Evme.Helper.showTitle, TIMEOUT_BEFORE_SHOWING_HELPER);
                }
            }

            iconsFormat = (appsCurrentOffset == 0)? Evme.Utils.ICONS_FORMATS.Small : Evme.Utils.getIconsFormat();
            options.iconsFormat = iconsFormat;

            var _NOCACHE = false;
            if (QUERIES_TO_NOT_CACHE.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                _NOCACHE = true;
            }

            cancelSearch();

            requestSearch = Evme.DoATAPI.search({
                "query": query,
                "typeHint": type,
                "index": index,
                "feature": source,
                "exact": exact,
                "spellcheck": getSpelling,
                "suggest": !onlyDidYouMean,
                "limit": NUMBER_OF_APPS_TO_LOAD,
                "first": appsCurrentOffset,
                "cachedIcons": Evme.Utils.convertIconsToAPIFormat(iconsCachedFromLastRequest),
                "iconFormat": iconsFormat,
                "prevQuery": prevQuery,
                "_NOCACHE": _NOCACHE
            }, function(data) {
                getAppsComplete(data, options);

                requestSearch = null;
                NUMBER_OF_APPS_TO_LOAD = DEFAULT_NUMBER_OF_APPS_TO_LOAD;
            }, removeSession);
        };

        function getAppsComplete(data, options) {
            var _query = options.query,
                _type = options.type,
                _source = options.source,
                _index = options.index,
                reloadingIcons = options.reloadingIcons,
                isExactMatch = options.exact,
                iconsFormat = options.iconsFormat,
                queryTyped = options.queryTyped, // used for searching for exact results if user stopped typing for X seconds
                onlyDidYouMean = options.onlyDidYouMean;

            if (data.errorCode !== Evme.DoATAPI.ERROR_CODES.SUCCESS) {
                return false;
            }

            window.clearTimeout(timeoutHideHelper);

            Evme.Apps.More.hideButton();

            var searchResults = data.response;
            var query = searchResults.query || _query;
            var disambig = searchResults.disambiguation || [];
            var suggestions = searchResults.suggestions || [];
            var apps = searchResults.apps || [];
            var spelling = searchResults.spellingCorrection || [];
            var isMore = (appsCurrentOffset > 0);
            var bSameQuery = (lastSearch.query === query);
            var tipShownOnHelper = false;

            // searching after a timeout while user it typing
            if (onlyDidYouMean || options.automaticSearch) {
                // show only spelling or disambiguation, and only if the query is the same as what the user typed
                if (query == queryTyped && (spelling.length > 0 || disambig.length > 1)) {
                    Evme.Helper.load(queryTyped, query, undefined, spelling, disambig);
                    Evme.Helper.hideTitle();
                    Evme.Helper.showSpelling();
                }
            } else {
                if (!isMore && !reloadingIcons) {
                    Evme.Helper.load(_query, query, suggestions, spelling, disambig);

                    if (isExactMatch && !onlyDidYouMean && !Brain.App.isLoadingApp()) {
                        tipShownOnHelper = Brain.Tips.show(TIPS.FIRST_EXACT, {
                            "query": query
                        });
                    }

                    if (isExactMatch) {
                        if (spelling.length > 0 || disambig.length > 1) {
                            Evme.Helper.hideTitle();
                            Evme.Helper.showSpelling();
                        } else {
                            if (!tipShownOnHelper) {
                                Evme.Helper.showTitle();
                            }
                        }
                    } else {
                        Evme.Helper.showSuggestions(_query);
                    }
                }
            }

            lastSearch.exact = isExactMatch && !onlyDidYouMean;

            if (isMore || !bSameQuery) {
                if (apps) {
                    lastSearch.query = query;
                    lastSearch.source = _source;
                    lastSearch.type = _type;

                    Evme.Apps.More.hide();

                    var method = _source == SEARCH_SOURCES.PAUSE? "updateApps" : "load";

                    // if just updating apps (user paused while typing) but we get different apps back from API- replace them instead of updating
                    if (method == "updateApps" && Evme.Apps.getAppsSignature() != Evme.Apps.getAppsSignature(apps)) {
                        method = "load";
                    }

                    var iconsResponse = Evme.Apps[method](apps, appsCurrentOffset, iconsFormat);

                    if (iconsResponse) {
                        iconsCachedFromLastRequest = iconsResponse.cached;
                    }

                    var maxApps = (searchResults.paging)? searchResults.paging.max || NUMBER_OF_APPS_TO_LOAD*2 : NUMBER_OF_APPS_TO_LOAD*2;

                    hasMoreApps = appsCurrentOffset+NUMBER_OF_APPS_TO_LOAD < maxApps;
                    if (hasMoreApps) {
                        hasMoreApps = {
                            "query": _query,
                            "type": _type,
                            "isExact": isExactMatch
                        };

                        Evme.Apps.More.showButton();
                    }
                }
            }

            if (isExactMatch) {
                var originalTip = TIPS.EXACT_RESULTS;
                if (data.response.queryType == QUERY_TYPES.EXPERIENCE && TIPS.EXACT_RESULTS_SHORTCUT) {
                    originalTIp = TIPS.EXACT_RESULTS_SHORTCUT;
                }

                var tip = JSON.parse(JSON.stringify(originalTip)),
                    query = Evme.Searchbar.getValue();

                tip.text = tip.text.replace(/{QUERY}/gi, query);
                if (query.match(/apps/i)) {
                    tip.text = tip.text.replace("apps for ", "");
                }
                new Evme.Tip(tip).show();
            }

            Evme.Searchbar.endRequest();

            return true;
        }

        this.getBackgroundImage = function(options) {
            var query = options.query,
                type = options.type,
                source = options.source,
                index = options.index,
                exact = options.exact;

            if (query == lastQueryForImage) {
                return;
            }

            setTimeoutForShowingDefaultImage();

            requestImage && requestImage.abort();
            requestImage = Evme.DoATAPI.bgimage({
                "query": query,
                "typeHint": type,
                "index": index,
                "feature": source,
                "exact": exact,
                "prevQuery": lastQueryForImage,
                "width": Evme.__config.bgImageSize[0] || screen.width,
                "height": Evme.__config.bgImageSize[1] || screen.height
            }, getBackgroundImageComplete);
        };

        function getBackgroundImageComplete(data) {
            if (data.errorCode !== Evme.DoATAPI.ERROR_CODES.SUCCESS) {
                return;
            }

            Searcher.clearTimeoutForShowingDefaultImage();

            var query = data.response.completion;
            var image = Evme.Utils.formatImageData(data.response.image);

            if (image) {
                lastQueryForImage = query;

                image = {
                    "image": image,
                    "query": query,
                    "source": data.response.source
                };

                Evme.BackgroundImage.update(image);
            }
        }

        this.getIcons = function(ids, format) {
            format = format || Evme.Utils.getIconsFormat();
            if (format !== Evme.Utils.ICONS_FORMATS.Large) {
                return;
            }

            requestIcons = Evme.DoATAPI.icons({
                "ids": ids.join(","),
                "iconFormat": format
            }, function(data) {
                getIconsComplete(ids, data, format);
            });
        };

        function getIconsComplete(ids, data, format) {
            var icons = data.response || [];

            for (var i=0, l=icons.length; i<l; i++) {
                var icon = icons[i];

                if (icon) {
                    var app = Evme.Apps.getApp(icon.id);
                    Evme.IconManager.add(icon.id, icon.icon, format);

                    if (app) {
                        app.setIcon(icon.icon, true);
                    }
                }
            }

            for (var i=0, l=ids.length; i<l; i++) {
                var app = Evme.Apps.getApp(ids[i]);
                if (app && app.missingIcon()) {
                    app.setIcon(Evme.Apps.getDefaultIcon(), true);
                }
            }
        }

        this.getAutocomplete = function(query) {
            if (autocompleteCache[query]) {
                getAutocompleteComplete(autocompleteCache[query]);
                return;
            }

            requestAutocomplete = Evme.DoATAPI.suggestions({
                    "query": query
                }, function(data) {
                    if (!data) {
                        return;
                    }

                    var items = data.response || [];
                    autocompleteCache[query] = items;
                    getAutocompleteComplete(items, query);
                }
            );
        };

        function getAutocompleteComplete(items, querySentWith) {
            window.clearTimeout(timeoutAutocomplete);
            timeoutAutocomplete = window.setTimeout(function(){
                if (Evme.Utils.isKeyboardVisible() && !requestSearch) {
                    Evme.Helper.loadSuggestions(items);
                    Evme.Helper.showSuggestions(querySentWith);
                }
            }, TIMEOUT_BEFORE_RENDERING_AC);
        };


        function setTimeoutForShowingDefaultImage() {
            Searcher.clearTimeoutForShowingDefaultImage();
            timeoutShowDefaultImage = window.setTimeout(Evme.BackgroundImage.loadDefault, TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE);
        }

        this.clearTimeoutForShowingDefaultImage = function() {
            window.clearTimeout(timeoutShowDefaultImage);
        };

        this.loadMoreApps = function() {
            if (hasMoreApps) {
                Evme.Apps.More.show();
                Searcher.nextAppsPage(hasMoreApps.query, hasMoreApps.type, hasMoreApps.isExact);
            }
        };

        this.empty = function(){
            Searcher.cancelRequests();
            Evme.Apps.clear();
            resetLastSearch();
            lastQueryForImage = "";

            if (!Evme.Searchbar.getValue()) {
                Evme.Helper.clear();
            }
        };

        this.nextAppsPage = function(query, type, exact) {
            appsCurrentOffset += NUMBER_OF_APPS_TO_LOAD;
            lastSearch.offset = appsCurrentOffset;

            Searcher.getApps({
                "query": query,
                "type": type,
                "source": SEARCH_SOURCES.MORE,
                "exact": exact,
                "offset": appsCurrentOffset
            });
        };

        this.searchAgain = function(source) {
            Searcher.cancelRequests();

            var query = Evme.Searchbar.getValue();
            var _query = lastSearch.query || query;
            var _source = source || lastSearch.source;
            var _type = lastSearch.type;
            var _offset = lastSearch.offset;

            if (_query) {
                resetLastSearch();
                Searcher.searchExact(_query, _source, null, _type, _offset);
            }
        };

        this.searchExactFromOutside = function(query, source, index, type, offset, isGetAllAppsForPage) {
            !type && (type = "");
            !offset && (offset = 0);

            if (query) {
                Evme.Helper.reset();
                Evme.Searchbar.setValue(query, false);

                Evme.Screens.Search.show();

                if (lastSearch.query != query || lastSearch.type != type || !lastSearch.exact) {
                    resetLastSearch();

                    if (isGetAllAppsForPage && offset) {
                        NUMBER_OF_APPS_TO_LOAD = offset*1;
                        offset = 0;
                    }

                    Searcher.searchExact(query, source, index, type, offset);
                } else {
                    Evme.Helper.enableCloseAnimation();

                    Evme.Helper.setTitle(query);
                    window.setTimeout(Evme.Helper.showTitle, 50);
                }

                Evme.Searchbar.blur();
                window.setTimeout(function(){
                    Brain.Searchbar.cancelBlur();
                }, 0);
            }

            Brain.Searchbar.setEmptyClass();
        };

        this.searchExact = function(query, source, index, type, offset, automaticSearch) {
            Searcher.cancelRequests();
            appsCurrentOffset = 0;

            if (!automaticSearch) {
                Evme.Searchbar.setValue(query, false, true);
                Evme.Helper.setTitle(query);
            }

            var options = {
                "query": query,
                "type": type,
                "source": source,
                "index": index,
                "exact": true,
                "offset": offset,
                "automaticSearch": automaticSearch
            };

            Searcher.getApps(options);
            Searcher.getBackgroundImage(options);
        };

        this.searchExactAsYouType = function(query, queryTyped) {
            resetLastSearch(true);
            cancelSearch();
            appsCurrentOffset = 0;

            var options = {
                "query": query,
                "queryTyped": queryTyped,
                "source": SEARCH_SOURCES.PAUSE,
                "exact": true,
                "offset": 0,
                "onlyDidYouMean": true
            };

            Searcher.getApps(options);
            Searcher.getBackgroundImage(options);
        };

        this.searchAsYouType = function(query, source){
            appsCurrentOffset = 0;

            Searcher.getAutocomplete(query);

            var searchOptions = {
                "query": query,
                "source": source
            };

            requestSearch && requestSearch.abort();
            window.clearTimeout(timeoutSearchWhileTyping);
            timeoutSearchWhileTyping = window.setTimeout(function(){
                Searcher.getApps(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_APPS_SEARCH);

            requestImage && requestImage.abort();
            window.clearTimeout(timeoutSearchImageWhileTyping);
            timeoutSearchImageWhileTyping = window.setTimeout(function(){
                Searcher.getBackgroundImage(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH);
        };

        this.cancelRequests = function() {
            cancelSearch();

            Searcher.clearTimeoutForShowingDefaultImage();
            window.clearTimeout(timeoutSearchImageWhileTyping);
            requestImage && requestImage.abort();

            requestIcons && requestIcons.abort();
        };

        function cancelSearch() {
            window.clearTimeout(timeoutSearchWhileTyping);
            window.clearTimeout(timeoutSearch);
            requestSearch && requestSearch.abort();
        };

        function cancelAutocomplete() {
            requestAutocomplete && requestAutocomplete.abort();
            window.clearTimeout(timeoutAutocomplete);
        };

        this.setLastQuery = function() {
            Evme.Searchbar.setValue(lastSearch.query, false, true);
            Evme.Helper.setTitle(lastSearch.query, lastSearch.type);
        };

        this.getDisplayedQuery = function() {
            return lastSearch.query;
        };

        this.getDisplayedSource = function() {
            return lastSearch.source;
        };

        this.searchedExact = function() {
            return lastSearch.exact;
        };
    }
    var Searcher = this.Searcher;
};
