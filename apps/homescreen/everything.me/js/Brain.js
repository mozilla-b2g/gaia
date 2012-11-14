/*
* Brain.js
* A subscriber to all EventHandler published event
* The glue that sticks all components to one another
*/
Evme.Brain = new function() {
    var _this = this,
        Brain = this,
        _config = {},
        logger = null,
        $container = null,
        QUERIES_TO_NOT_CACHE = "",
        DEFAULT_NUMBER_OF_APPS_TO_LOAD = 16,
        NUMBER_OF_APPS_TO_LOAD_IN_FOLDER = 16,
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
        APPS_ERROR_TEXT = "FROM CONFIG",
        
        QUERY_TYPES = {
            "EXPERIENCE": "experience",
            "APP": "app",
            "QUERY": "query"
        },
        
        INSTALLED_APPS_TO_TYPE = {
            /*
            "music": ["Music"],
            "movies": ["Video"],
            "tv": ["Video"],
            "games": ["TowerJelly", "PenguinPop", "CrystalSkull", "CubeVid"]
            */
        },

        timeoutSetUrlAsActive = null,
        timeoutHashChange = null,
        _ = navigator.mozL10n.get;

    /*
        Init sequense triggered by Core.js
    */
    this.init = function(options) {
        // bind to events
        Evme.EventHandler && Evme.EventHandler.bind(catchCallback);
        $container = $("#" + Evme.Utils.getID());

        _config = options;

        // Helper
        HISTORY_CLEAR_TEXT = _config.helper.clearHistory;
        REFINE_DISMISS_TEXT = _config.helper.dismiss;
        NO_REFINE_TEXT = _config.helper.noRefine;
        SHOW_HISTORY_TEXT = _config.helper.linkHistory;
        APPS_ERROR_TEXT = _config.apps.connectionError;

        // Tips
        TIPS = _config.tips;
        TIMEOUT_BEFORE_ALLOWING_DIALOG_REMOVE = _config.timeBeforeAllowingDialogsRemoval;

        SEARCH_SOURCES = _config.searchSources;
        PAGEVIEW_SOURCES = _config.pageViewSources;

        logger = _config && _config.logger || console;
    };
    
    /**
     * main event handling method that catches all the events from the different modules,
     * and calls the appropriate method in Brain 
     * @_class (string) : the class that issued the event (Apps, SmartFolder, Helper, etc.)
     * @_event (string) : the event that the class sent
     * @_data (object)  : data sent with the event
     */
    function catchCallback(_class, _event, _data) {
        logger.debug(_class + "." + _event + "(", (_data || ""), ")");

        try {
            _this[_class] && _this[_class][_event] && _this[_class][_event](_data || {});
        } catch(ex){
            logger.error(ex);
        }
    }

    /*  EVENT HANDLERS */

    // Core.js
    this.Core = new function() {
        var _this = this;

        this.init = function() {
            Searcher.empty();
            Evme.Searchbar.clear();
            Brain.Searchbar.setEmptyClass();

            Evme.Shortcuts.show();
            
            Brain.FFOS.showMenu();
        };
    };

    // modules/Searchbar/
    this.Searchbar = new function() {
        var _this = this,
            timeoutBlur = null,
            tipKeyboard = null,
            TIMEOUT_BEFORE_RUNNING_BLUR = 50;

        // Searchbar focused. Keyboard shows
        this.focus = function(data) {
            Evme.Utils.setKeyboardVisibility(true);
            
            Brain.FFOS.hideMenu();

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

        // Searchbar blurred. Keyboard hides.
        this.blur = function(data) {
            // Gaia bug workaround because of this http://b2g.everything.me/tests/input-blur.html
            if (data && data.e) {
                data.e.stopPropagation();
            }
            
            if (Brain.Dialog.isActive()) {
                return;
            }
            
            var didClickApp = false,
                elClicked = data && data.e && data.e.explicitOriginalTarget;
            if (elClicked) {
                for (var elParent = elClicked.parentNode; elParent; elParent = elParent.parentNode) {
                    if (elParent.classList && elParent.classList.contains('evme-apps')) {
                        didClickApp = true;
                        break;
                    }
                }
            }
            
            
            window.setTimeout(_this.hideKeyboardTip, 500);
            
            Evme.Utils.setKeyboardVisibility(false);
            _this.setEmptyClass();
            Evme.Apps.refreshScroll();

            var searchbarValue = Evme.Searchbar.getValue();
            if (searchbarValue === "") {
                Evme.Helper.setTitle();
                Evme.Helper.showTitle();
                
                Brain.FFOS.showMenu();
            } else if (didClickApp) {
                Evme.Searchbar.setValue(searchbarValue);
                Evme.Helper.setTitle(searchbarValue);
                Evme.Helper.showTitle();
            }

            if (!didClickApp && Evme.shouldSearchOnInputBlur){
                window.clearTimeout(timeoutBlur);
                timeoutBlur = window.setTimeout(_this.returnPressed, TIMEOUT_BEFORE_RUNNING_BLUR);
            }
        };
        
        this.onfocus = this.focus;
        this.onblur = this.blur;
        
        // Searchbar value is empty
        this.empty = function(data) {
            Searcher.cancelRequests();
            _this.emptySource = (data && data.pageviewSource) || (data.sourceObjectName === "Searchbar" && PAGEVIEW_SOURCES.CLEAR);
            Searcher.empty();
            _this.setEmptyClass();
            
            Evme.DoATAPI.cancelQueue();
            Evme.ConnectionMessage.hide();
        };
        
        // Searchbar was cleared
        this.clear = function(e) {
            Searcher.cancelRequests();
            Evme.Apps.clear();
            Evme.Helper.setTitle();
            Brain.Helper.showDefault();
        };
        
        // Keyboard action key ("search") pressed
        this.returnPressed = function(data) {
            if (Brain.Dialog.isActive()) {
                data && data.e && data.e.preventDefault();
                return;
            }
            
            var query = Evme.Searchbar.getValue();
            Searcher.searchExactFromOutside(query, SEARCH_SOURCES.RETURN_KEY);
            Evme.Searchbar.blur();
        };

        // toggle classname when searchbar is empty
        this.setEmptyClass = function() {
            var query = Evme.Searchbar.getValue();

            if (!query) {
                $container.addClass("empty-query");
            } else {
                $container.removeClass("empty-query");
            }
        };
        
        // if an event was captured - cancel the blur timeout
        this.cancelBlur = function() {
            window.clearTimeout(timeoutBlur);
        };
        
        // clear button was clicked
        this.clearButtonClick = function(data) {
            _this.cancelBlur();
            if (!Evme.Utils.isKeyboardVisible()) {
                Brain.FFOS.showMenu();
            }
        };
        
        // searchbar value changed
        this.valueChanged = function(data) {
            _this.hideKeyboardTip();

            var lastQuery = Searcher.getDisplayedQuery();

            if (data.value && (data.value.length > MINIMUM_LETTERS_TO_SEARCH || lastQuery != "")) {
                Searcher.searchAsYouType(data.value, SEARCH_SOURCES.TYPING);
            }

            _this.setEmptyClass();
            Evme.Helper.hideTitle();
        };

        // Searchbar is focused but no action is taken
        this.idle = function(data) {

        };

        // User paused for a slight time when typing
        this.pause = function(data) {
            var suggestions = Evme.Helper.getData().suggestions || [];
            if (suggestions.length === 0) {
                return;
            }

            var typedQuery = Evme.Searchbar.getValue(),
                suggestionsQuery = Evme.Helper.getSuggestionsQuery(),
                firstSuggestion = suggestions[0].replace(/[\[\]]/g, "");

            if (typedQuery === suggestionsQuery) {
                Searcher.searchExactAsYouType(firstSuggestion, typedQuery);
            }
        };

        // hide keyboard tip
        this.hideKeyboardTip = function() {
            if (tipKeyboard) {
                tipKeyboard.hide();
                tipKeyboard = null;
            }
        };
    };
    
    this.FFOS = new function() {
        // dock hidden
        this.hideMenu = function() {
            Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.HIDE_MENU);
            $container.removeClass("ffos-menu-visible");
            Evme.Shortcuts.refreshScroll();
        };
        
        // dock appears
        this.showMenu = function() {
            Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.SHOW_MENU);
            $container.addClass("ffos-menu-visible");
            Evme.Shortcuts.refreshScroll();
        };
    };

    // modules/Helper/
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

        // items loaded
        this.load = function(data) {
            refineQueryShown = "";
        };

        // helper item was selected
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

        // Items were cleared
        this.clear = function() {
            if (!cleared) {
                cleared = true;
                _this.showDefault();
            }
        };

        // slide items in
        this.animateDefault = function() {
            Evme.Helper.animateLeft(function(){
                _this.showDefault();
                Evme.Helper.animateFromRight();
            });
        };

        // transition to default items
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

        // transition to history items
        this.animateIntoHistory = function(history) {
            if (!history || history.length > 0) {
                Evme.Helper.animateLeft(function(){
                    _this.loadHistory(history);
                    Evme.Helper.animateFromRight();
                });
            }
        };

        // load history items
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

        // Show disambiguation items
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

        // display hepler
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

        // Spelling correction item click
        function didyoumeanClick(e) {
            var callback = Evme.Helper.showTitle;
            if (Evme.Utils.isKeyboardVisible()) {
                callback = Evme.Helper.showSuggestions;
            }

            e && e.stopPropagation();
            e && e.preventDefault();

            setTimeout(callback, TIMEOUT_ANDROID_BEFORE_HELPER_CLICK);
        }
    };

    // modules/Location/
    this.Location = new function() {
        var _this = this;
        
        // Location is being requested
        this.requesting = function() {
            $container.addClass("requesting-location");
        };
        
        // location retrieved successfully
        this.success = function(data) {
            $container.removeClass("requesting-location");
        };
        
        // location request error has occured
        this.error = function(data) {
            $container.removeClass("requesting-location");
        };
    };
    
    // modules/Apps/
    this.Apps = new function() {
        var bShouldGetHighResIcons = false;

        // init sequence ended
        this.init = function() {
            bShouldGetHighResIcons = Evme.Utils.getIconsFormat() == Evme.Utils.ICONS_FORMATS.Large;
            Evme.EventHandler && Evme.EventHandler.bind(Brain.App.handleEvents);
        };

        // app items loaded
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

        // app list has scrolled to top
        this.scrollTop = function() {
            Evme.BackgroundImage.showFullScreen();
        };

        // app list has scrolled to bottom
        this.scrollBottom = function() {
            Searcher.loadMoreApps();
        };
    };

    // modules/Apps/
    this.AppsMore = new function() {
        // more button was clicked
        this.buttonClick = function() {
            Searcher.loadMoreApps();
        };
    };

    // modules/Apps/
    this.App = new function() {
        var _this = this,
            bNeedsLocation = false,
            isKeyboardOpenWhenClicking = false,
            loadingApp = null,
            loadingAppAnalyticsData,
            loadingAppId = false;

        var STORAGE_KEY_CLOSE_WHEN_RETURNING = "needsToCloseKeyboard";

        // Remove app clicked
        this.close = function(data) {
            Evme.Apps.removeApp(data.data.id);
        };

        // app pressed and held
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
            Evme.Utils.getRoundIcon(appIcon, 49, function(appIcon) {
                // bookmark
                Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_INSTALL, {
                    "originUrl": data.app.getFavLink(),
                    "title": data.data.name,
                    "icon": appIcon
                });
            });
        };
        
        // app clicked
        this.click = function(data) {
            if (!Searcher.isLoadingApps() || data.data.installed || Evme.Utils.isKeyboardVisible()) {
                data.keyboardVisible = Evme.Utils.isKeyboardVisible() ? 1 : 0;
                var query = Searcher.getDisplayedQuery();
                
                data.isFolder = !query;
                
                if (!Searcher.searchedExact()) {
                    if (!data.isFolder) {
                        Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, true);
                        
                        Evme.Searchbar.setValue(data.data.installed? data.data.name : Searcher.getDisplayedQuery(), false, true);
                        
                        Evme.Searchbar.blur();
                        Brain.Searchbar.cancelBlur();
                    }
                    
                    window.setTimeout(function(){
                        _this.animateAppLoading(data);
                    }, 50);
                } else {
                    Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, false);
                    _this.animateAppLoading(data);
                }
            }
        };
        
        // returns if app is currently loading
        this.isLoadingApp = function() {
            return loadingApp;
        };
        
        // animate icon position after click
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
                "icon": data.data.icon,
                "installed": data.data.installed || false
            };

            loadingApp = data.app;
            loadingAppId = data.data.id;
            bNeedsLocation = data.data.requiresLocation && !Evme.DoATAPI.hasLocation();

            var $apps = $app.parent().parent(),
            
                oldPos = {
                    "top": $app[0].offsetTop,
                    "left": $app[0].offsetLeft
                },
                
                appListHeight = $apps.height(),
                appListWidth = $apps.width(),
                appHeight = $app.height(),
                appWidth = $app.width(),
                
                newPos = {
                    "top": (appListHeight-appHeight)/2 - ((data.isFolder? $apps.data("scrollOffset")*1 : Evme.Apps.getScrollPosition()) || 0),
                    "left": (appListWidth-appWidth)/2
                };
                
            $("#loading-app").remove();

            var $pseudo = $('<li class="inplace" id="loading-app">' + loadingApp.getHtml() + '</li>'),
                useClass = !data.isFolder;
                
            if (data.data.installed) {
                $pseudo.addClass("installed");
            }
            
            newPos.top -= appHeight/4;
            
            $pseudo.css({
                "position": "absolute",
                "top": oldPos.top + "px",
                "left": oldPos.left + "px"
            });
            
            $pseudo.css("-moz-transform", 'translate3d(0, 0, 0)');

            var appName = "Loading...";
            if (bNeedsLocation) {
                appName = "";
            }
            $pseudo.find("b").text(appName);

            $app.parent().append($pseudo);
            $container.addClass("loading-app");
            
            window.setTimeout(function(){
                var translate = "translate3d(" + -Math.round(oldPos.left-newPos.left) + "px, " + -Math.round(oldPos.top-newPos.top) + "px, 0)";
                $pseudo.css("-moz-transform", translate);
                
                if (bNeedsLocation) {
                    Evme.Location.requestUserLocation(function onSuccess(data) {
                        if (Brain.SmartFolder.get()) {
                            Brain.SmartFolder.loadAppsIntoFolder(function onAppsReloaded(apps) {
                                updateLoadingAppData(apps);
                                goToApp(loadingAppAnalyticsData);
                            });
                        } else {
                            Evme.DoATAPI.setLocation(data.coords.latitude, data.coords.longitude);
                            Searcher.searchAgain(SEARCH_SOURCES.LOCATION_REFRESH);
                        }
                    }, function onError(data) {
                        goToApp(loadingAppAnalyticsData);
                    });
                } else {
                    goToApp(loadingAppAnalyticsData, 500);
                }
            }, 10);
        };
        
        function updateLoadingAppData(apps) {
            for (var i=0; i<apps.length; i++) {
                if (apps[i].id == loadingAppId) {
                    loadingApp.update(apps[i]);
                    loadingAppAnalyticsData.appUrl = apps[i].appUrl;
                    break;
                }
            }
        }

        /**
         * a separate event listener for when apps are loaded after requesting location
         * @_class (string) : the class that issued the event (Apps, SmartFolder, Helper, etc.)
         * @_event (string) : the event that the class sent
         * @_data (object)  : data sent with the event
         */
        this.handleEvents = function(_class, _event, _data){
            if (bNeedsLocation && _class == "Apps" && _event == "loadComplete") {
                bNeedsLocation = false;
                
                updateLoadingAppData(_data.data);
                goToApp(loadingAppAnalyticsData);
            }
        };

        // continue flow of redirecting to app
        function goToApp(data, delay) {
            !delay && (delay = 0);
            data["appUrl"] = loadingApp.getLink();

            Evme.EventHandler.trigger("Core", "redirectedToApp", data);

            window.setTimeout(function(){
                _this.appRedirectExecute(data);
            }, delay);
        }
        
        // actual redirection
        this.appRedirectExecute = function(data){
            var appIcon = Evme.Utils.formatImageData(data.icon);
            if (data.installed) {
                GridManager.getAppByOrigin(data.appUrl).launch();
            } else {
                Evme.Utils.getRoundIcon(appIcon, 49, function(appIcon) {
                    Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_CLICK, {
                        "url": data.appUrl,
                        "originUrl": data.favUrl,
                        "title": data.name,
                        "icon": appIcon,
                        "urlTitle": Evme.Searchbar.getValue()
                    });
                });
            }

            setTimeout(returnFromOutside, 2000);
        };

        // returned from opened app
        function returnFromOutside() {
            if (loadingApp) {
                loadingApp = null;

                bNeedsLocation = false;
                loadingAppAnalyticsData = null;
                loadingAppId = false;

                Searcher.clearTimeoutForShowingDefaultImage();
                $("#loading-app").remove();
                Evme.BackgroundImage.cancelFullScreenFade();
                $container.removeClass("loading-app");

                if (Evme.Storage.get(STORAGE_KEY_CLOSE_WHEN_RETURNING)) {
                    Searcher.searchAgain();
                }
                Evme.Storage.remove(STORAGE_KEY_CLOSE_WHEN_RETURNING);

                Evme.EventHandler.trigger("Core", "returnedFromApp");
            }
        }
    };

    // modules/BackgroundImage/
    this.BackgroundImage = new function() {
        this.CLASS_FULLSCREEN = "fullscreen-bgimage";

        // show
        this.showFullScreen = function() {
            $container.addClass(Brain.BackgroundImage.CLASS_FULLSCREEN);
            Evme.Apps.scrollToStart();
        };

        // hide
        this.hideFullScreen = function() {
            $container.removeClass(Brain.BackgroundImage.CLASS_FULLSCREEN);
        };
    };

    // modules/SmartFolder/    
    this.SmartFolder = new function() {
        var _this = this,
            currentFolder = null,
            requestSmartFolderApps = null;
        
        // shortcut was clicked
        this.show = function(data) {
            $container.addClass("smart-folder-visible");
            Brain.FFOS.hideMenu();
            
            currentFolder = data.folder;
            
            window.setTimeout(_this.loadAppsIntoFolder, 2000);
        };
        
        // close button was clicked
        this.hide = function() {
            $container.removeClass("smart-folder-visible");
            Evme.Brain.Shortcuts.cancelSmartFolderRequests();
            Evme.ConnectionMessage.hide();
            
            currentFolder = null;
            
            window.setTimeout(Brain.FFOS.showMenu, 500);
        };
        
        // get current folder
        this.get = function() {
            return currentFolder;
        };
        
        // close current folder
        this.closeCurrent = function() {
            currentFolder && currentFolder.close();
        };

        this.hideIfOpen = function() {
            if (_this.get()) {
                _this.closeCurrent();
                return true;
            }

            return false;
        };
        
        this.loadAppsIntoFolder = function(onAppsLoaded) {
            if (!currentFolder) return;
            
            var query = currentFolder.getName();
                
            currentFolder.appsPaging = {
                "offset": 0,
                "limit": NUMBER_OF_APPS_TO_LOAD_IN_FOLDER
            };
            
            var iconsFormat = Evme.Utils.getIconsFormat(),
                installedApps = Searcher.getInstalledApps({
                    "query": query,
                    "max": 4
                });
            
            currentFolder.clear();
            currentFolder.loadApps({
                "apps": installedApps,
                "iconsFormat": iconsFormat,
                "offset": 0
            }, function onDone() {
                requestSmartFolderApps = Evme.DoATAPI.search({
                    "query": query,
                    "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                    "exact": true,
                    "spellcheck": false,
                    "suggest": false,
                    "limit": currentFolder.appsPaging.limit,
                    "first": currentFolder.appsPaging.offset,
                    "iconFormat": iconsFormat
                }, function(data) {
                    var apps = data.response.apps;
                    
                    currentFolder.appsPaging.limit = NUMBER_OF_APPS_TO_LOAD_IN_FOLDER;
                    currentFolder.appsPaging.max = data.response.paging.max;
                    
                    if (currentFolder.appsPaging.max > currentFolder.appsPaging.offset + currentFolder.appsPaging.limit) {
                        currentFolder.MoreIndicator.set(true);
                    } else {
                        currentFolder.MoreIndicator.set(false);
                    }
                    
                    currentFolder.loadApps({
                        "apps": apps,
                        "iconsFormat": iconsFormat,
                        "offset": currentFolder.appsPaging.offset
                    });
                    
                    requestSmartFolderApps = null;
                    
                    onAppsLoaded && onAppsLoaded(apps);
                });
            });
        };
        
        // load more apps in smartfolder
        this.loadMoreApps = function() {
            if (!currentFolder) return;
            
            currentFolder.appsPaging.offset += currentFolder.appsPaging.limit;
            if (currentFolder.appsPaging.offset >= currentFolder.appsPaging.max) {
                return;
            }
            
            if (requestSmartFolderApps) {
                return;
            }
            
            currentFolder.MoreIndicator.show();
            
            var iconsFormat = Evme.Utils.getIconsFormat();
            
            requestSmartFolderApps = Evme.DoATAPI.search({
                "query": currentFolder.getName(),
                "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                "exact": true,
                "spellcheck": false,
                "suggest": false,
                "limit": currentFolder.appsPaging.limit,
                "first": currentFolder.appsPaging.offset,
                "iconFormat": iconsFormat
            }, function(data) {
                var apps = data.response.apps;
                
                currentFolder.MoreIndicator.hide();
                
                if (currentFolder.appsPaging.max > currentFolder.appsPaging.offset + currentFolder.appsPaging.limit) {
                    currentFolder.MoreIndicator.set(true);
                } else {
                    currentFolder.MoreIndicator.set(false);
                }
                
                currentFolder.loadApps({
                    "apps": apps,
                    "iconsFormat": iconsFormat,
                    "offset": currentFolder.appsPaging.offset
                });
                
                requestSmartFolderApps = null;
            });
        }
    };
    
    // modules/Shortcuts/
    this.Shortcuts = new function() {
        var _this = this,
            customizeInited = false,
            timeoutShowLoading = null,
            clickedCustomizeHandle = false,
            loadingCustomization = false,
            requestSmartFolderApps = null,
            requestSmartFolderImage = null;

        // show
        this.show = function() {
            Brain.FFOS.showMenu();
            
            new Evme.Tip(TIPS.APP_EXPLAIN, function(tip) {
                $container.bind("touchstart", tip.hide);
            }).show();

            Brain.Searchbar.hideKeyboardTip();
            
            _this.loadFromAPI();
        };
        
        /// load items from API (as opposed to persistent storage)
        this.loadFromAPI = function() {
            Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data) {
                Evme.Shortcuts.load(data.response);
            });
        };
        
        // fired when smartfolder shows but closed before apps requests return
        this.cancelSmartFolderRequests = function() {
            requestSmartFolderApps && requestSmartFolderApps.abort();
            requestSmartFolderImage && requestSmartFolderImage.abort();
        };
        
        // shortcut is clicked
        this.showSmartFolder = function(options) {
            var folder = new Evme.SmartFolder({
                            "name": options.query,
                            "bgImage": (Evme.BackgroundImage.get() || {}).image,
                            "parent": $container,
                            "onScrollEnd": Evme.Brain.SmartFolder.loadMoreApps
                        });
            
            folder.show();
            
            requestSmartFolderImage = Evme.DoATAPI.bgimage({
                "query": options.query,
                "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                "exact": true,
                "width": screen.width,
                "height": screen.height
            }, function(data) {
                folder.setImage({
                    "image": Evme.Utils.formatImageData(data.response.image),
                    "query": options.query,
                    "source": data.response.source
                });
                
                requestSmartFolderImage = null;
            });
        };
        
        // shortcuts loaded. add + icon
        this.load = function() {
            Brain.ShortcutsCustomize.addCustomizeButton();
        };
        
        // empty space 
        this.listClick = function() {
            Brain.Shortcuts.doneEdit();
        };
        
        // return to normal shortcut mode
        this.doneEdit = function() {
            if (!Evme.Shortcuts.isEditing) return;
            
            Evme.Shortcuts.isEditing = false;
            $container.removeClass("shortcuts-customizing");
            Brain.FFOS.showMenu();
        };

        // returns edit status
        this.isEditing = function() {
            return Evme.Shortcuts.isEditing;
        };

        this.hideIfEditing = function() {
            if (_this.isEditing()) {
                _this.doneEdit();
                return true;
            }

            return false;
        };
    };
    
    // modules/Shortcuts/
    this.Shortcut = new function() {
        // item clicked and held, remove item mode
        this.hold = function() {
            Evme.Shortcuts.isEditing = true;
            $container.addClass("shortcuts-customizing");
            Brain.FFOS.hideMenu();
        };
        
        // item clicked
        this.click = function(data) {
            if(!Evme.Shortcuts.isEditing && !Evme.Shortcuts.isSwiping()) {
                var query = data.data.query;
                
                data.query = query;
                
                Brain.Shortcuts.showSmartFolder({
                    "query": data.query
                });
            }
        };
        
        // item remove
        this.remove = function(data) {
            Evme.Shortcuts.remove(data.shortcut);
            Evme.Shortcuts.refreshScroll();
            Evme.DoATAPI.Shortcuts.remove(data.data.query);   
        };
    };
    
    // modules/ShortcutsCustomize/
    this.ShortcutsCustomize = new function() {
        var _this = this,
            isRequesting = false,
            isFirstShow = true,
            requestSuggest = null,
            isOpen = false;
        
        this.show = function() {
            Brain.FFOS.hideMenu();
            isOpen = true;
        };
        
        this.hide = function() {
            Evme.ShortcutsCustomize.Loading.hide();
            Brain.FFOS.showMenu();
            isOpen = false;
        };

        this.hideIfRequesting = function() {
            if (isRequesting) {
                _this.loadingCancel();
                return true;
            }

            return false;
        }

        this.isOpen = function() {
            return isOpen;
        };

        // done button clicked
        this.done = function(data) {
            Evme.DoATAPI.Shortcuts.add({
                "shortcuts": data.shortcuts,
                "icons": data.icons
            }, function(){
                Brain.Shortcuts.loadFromAPI();
                Brain.FFOS.showMenu();
            });
        };
        
        // prepare and show
        this.showUI = function() {
            if (isRequesting) return;
            
            isRequesting = true;
            
            Brain.FFOS.hideMenu();
            Evme.ShortcutsCustomize.Loading.show();
            
            // load user/default shortcuts from API
            Evme.DoATAPI.Shortcuts.get(null, function(data){
                var loadedResponse = data.response,
                    currentIcons = loadedResponse.icons,
                    arrShortcuts = [],
                    shortcutsToFavorite = {};
                
                for (var i=0, len=loadedResponse.shortcuts.length; i<len; i++) {
                    arrShortcuts.push(loadedResponse.shortcuts[i].query);
                }
                
                // load suggested shortcuts from API
                requestSuggest = Evme.DoATAPI.Shortcuts.suggest({
                    "existing": arrShortcuts
                }, function(data) {
                    var suggestedShortcuts = data.response.shortcuts,
                        icons = data.response.icons;
                    
                    for (var i=0; i<suggestedShortcuts.length; i++) {
                        var query = suggestedShortcuts[i].query.toLowerCase();
                        
                        if (!shortcutsToFavorite[query] && arrShortcuts.indexOf(query.toLowerCase()) == -1) {
                            shortcutsToFavorite[query] = false;
                        }
                    }
                    
                    for (var id in icons) {
                        currentIcons[id] = icons[id];
                    }
                    
                    Evme.ShortcutsCustomize.load({
                        "shortcuts": shortcutsToFavorite,
                        "icons": currentIcons
                    });
                    
                    isFirstShow = false;
                    isRequesting = false;
                    Evme.ShortcutsCustomize.show();
                    Evme.ShortcutsCustomize.Loading.hide();
                });   
            });
        };
        
        // cancel button clicked
        this.loadingCancel = function(data) {
            data && data.e.preventDefault();
            data && data.e.stopPropagation();
            
            requestSuggest && requestSuggest.abort();
            window.setTimeout(Evme.ShortcutsCustomize.Loading.hide, 50);
            isRequesting = false;
            Brain.FFOS.showMenu();
        };
        
        // inject + button
        this.addCustomizeButton = function() {
            var $el = Evme.Shortcuts.getElement(),
                $elCustomize = $('<li class="shortcut add"><div class="c"><span class="thumb"></span><b>More</b></div></li>');
            
            $elCustomize.bind("click", _this.showUI);
            
            $el.find(".shortcut.add").remove();
            $el.append($elCustomize);
        };
    };

    // modules/Dialog/
    this.Dialog = new function() {
        var active = null;

        // show
        this.show = function(data) {
            active = data.obj;
        };

        // hide
        this.remove = function(data) {
            active = null;
        };

        // background modal clicked
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

    // modules/Tip/
    this.Tips = new function() {
        var _this = this,
            activeTip = null,
            timeoutShowTip = null;

        // show
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

    // helpers/Utils.Connection
    this.Connection = new function() {
        // upon becoming online
        this.online = function() {
            Evme.ConnectionMessage.hide();
            Evme.DoATAPI.backOnline();
        };
    };

    // api/DoATAPI.js
    this.DoATAPI = new function() {
        // trigger message when request fails
        this.cantSendRequest = function() {
            var message = APPS_ERROR_TEXT,
                folder = Brain.SmartFolder.get(),
                query = Evme.Searchbar.getElement().val() || (folder && folder.getName()) || '';
            
            message = message.replace(/{QUERY}/g, query);
            Evme.ConnectionMessage.show(message, folder? folder.getElement().find(".evme-apps") : Evme.Apps.getList().parent());
        };
    };
    
    // Searcher object to handle all search events
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
            
            var installedApps = [];
            if (appsCurrentOffset == 0) {
                installedApps = Searcher.getInstalledApps({
                    "query": Evme.Searchbar.getValue(),
                    "max": 4
                });
            }
            
            options.hasInstalledApps = installedApps.length > 0;
            
            Evme.Apps.load({
                "apps": installedApps,
                "clear": appsCurrentOffset == 0,
                "iconFormat": iconsFormat,
                "offset": 0,
                "onDone": function() {
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
                }
            });
        };
        
        this.getInstalledApps = function(options, cb) {
            var query = options.query || '',
                max = options.max,
                regex = new RegExp('(' + query + ')', 'i'),
                apps = [],
                typeApps = INSTALLED_APPS_TO_TYPE[query.toLowerCase()],
                _apps = Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.GET_ALL_APPS);
                
            if (!query) {
                return apps;
            }
            
            for (var i=0; i<_apps.length; i++) {
                var app = _apps[i],
                    name = Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.GET_APP_NAME, app);
                
                if (regex.test(name) || typeApps && typeApps.indexOf(app.manifest.name) !== -1) {
                    apps.push({
                       'id': app._id,
                       'name': name,
                       'installed': true,
                       'appUrl': app.origin,
                       'preferences': '',
                       'icon': Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.GET_APP_ICON, app),
                       'requiresLocation': false,
                       'appNativeUrl': '',
                       'numShares': 0,
                       'hasAppStore': false
                    });
                }
            }
            
            apps.splice(max);
            
            return apps;
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
                onlyDidYouMean = options.onlyDidYouMean,
                hasInstalledApps = options.hasInstalledApps;

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

                    var iconsResponse = Evme.Apps[method]({
                        "apps": apps,
                        "iconsFormat": iconsFormat,
                        "clear": !hasInstalledApps && appsCurrentOffset == 0
                    });

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
                        Evme.Apps.getElement().addClass("has-more");
                    } else {
                        Evme.Apps.getElement().removeClass("has-more");
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
            Evme.Searchbar.clearAutocomplete();

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
