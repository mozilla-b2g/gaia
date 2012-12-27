/*
* Brain.js
* A subscriber to all EventHandler published event
* The glue that sticks all components to one another
*/
Evme.Brain = new function Evme_Brain() {
    var self = this,
        Brain = this,
        _config = {},
        logger = null,
        elContainer = null,
        QUERIES_TO_NOT_CACHE = "",
        DEFAULT_NUMBER_OF_APPS_TO_LOAD = 16,
        NUMBER_OF_APPS_TO_LOAD_IN_FOLDER = 16,
        NUMBER_OF_APPS_TO_LOAD = DEFAULT_NUMBER_OF_APPS_TO_LOAD,
        TIME_BEFORE_INVOKING_HASH_CHANGE = 200,
        TIMEOUT_BEFORE_ALLOWING_DIALOG_REMOVE = "FROM CONFIG",
        MINIMUM_LETTERS_TO_SEARCH = 2,
        SEARCH_SOURCES = {},
        PAGEVIEW_SOURCES = {},
        TIPS = {},
        ICON_SIZE = null,

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

        DISPLAY_INSTALLED_APPS = "FROM_CONFIG",

        INSTALLED_APPS_TO_TYPE = {
            "music": ["FM Radio", "Music", "Video"],
            "games": ["Marketplace", "CrystalSkull", "PenguinPop", "TowerJelly"],
            "maps": ["Maps"],
            "email": ["E-mail"],
            "images": ["Gallery", "Camera"],
            "video": ["Video", "Camera"],
            "local": ["Maps", "FM Radio"]
        },

        timeoutSetUrlAsActive = null,
        timeoutHashChange = null,
        _ = navigator.mozL10n.get;

    /*
        Init sequense triggered by Core.js
    */
    this.init = function init(options) {
        // bind to events
        Evme.EventHandler && Evme.EventHandler.bind(catchCallback);
        elContainer = Evme.Utils.getContainer();

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

        DISPLAY_INSTALLED_APPS = _config.displayInstalledApps;

        logger = _config && _config.logger || console;

        ICON_SIZE = Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.GET_ICON_SIZE);
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
            self[_class] && self[_class][_event] && self[_class][_event](_data || {});
        } catch(ex){
            Evme.Utils.log('Evme CB Error: ' + ex.message);
            logger.error(ex);
        }
    }

    /*  EVENT HANDLERS */

    // Core.js
    this.Core = new function Core() {
        var self = this;

        this.init = function init() {
            Searcher.empty();
            Evme.Searchbar.clear();
            Brain.Searchbar.setEmptyClass();

            Evme.Shortcuts.show();
        };
    };

    // modules/Searchbar/
    this.Searchbar = new function Searchbar() {
        var self = this,
            timeoutBlur = null,
            tipKeyboard = null,
            TIMEOUT_BEFORE_RUNNING_BLUR = 50;

        // Searchbar focused. Keyboard shows
        this.focus = function focus(data) {
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
        this.blur = function blur(data) {
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

            window.setTimeout(self.hideKeyboardTip, 500);

            Evme.Utils.setKeyboardVisibility(false);
            self.setEmptyClass();
            Evme.Apps.refreshScroll();

            var searchbarValue = Evme.Searchbar.getValue();
            if (searchbarValue === "") {
                Evme.Helper.setTitle();
                Evme.Helper.showTitle();
            } else if (didClickApp) {
                Evme.Searchbar.setValue(searchbarValue);
                Evme.Helper.setTitle(searchbarValue);
                Evme.Helper.showTitle();
            }

            if (!didClickApp && Evme.shouldSearchOnInputBlur){
                window.clearTimeout(timeoutBlur);
                timeoutBlur = window.setTimeout(self.returnPressed, TIMEOUT_BEFORE_RUNNING_BLUR);
            }
        };

        this.onfocus = this.focus;
        this.onblur = this.blur;

        // Searchbar value is empty
        this.empty = function empty(data) {
            Searcher.cancelRequests();
            self.emptySource = (data && data.pageviewSource) || (data.sourceObjectName === "Searchbar" && PAGEVIEW_SOURCES.CLEAR);
            Searcher.empty();

            self.setEmptyClass();

            Evme.DoATAPI.cancelQueue();
            Evme.ConnectionMessage.hide();
        };

        // Searchbar was cleared
        this.clear = function clear(e) {
            Searcher.cancelRequests();
            Evme.Apps.clear();
            Evme.Helper.setTitle();
            Brain.Helper.showDefault();
        };

        // Keyboard action key ("search") pressed
        this.returnPressed = function returnPressed(data) {
            if (Brain.Dialog.isActive()) {
                data && data.e && data.e.preventDefault();
                return;
            }

            var query = Evme.Searchbar.getValue();
            Searcher.searchExactFromOutside(query, SEARCH_SOURCES.RETURN_KEY);
            Evme.Searchbar.blur();
        };

        // toggle classname when searchbar is empty
        this.setEmptyClass = function setEmptyClass() {
            var query = Evme.Searchbar.getValue();

            if (!query) {
                elContainer.classList.add("empty-query");
            } else {
                elContainer.classList.remove("empty-query");
            }
        };

        // if an event was captured - cancel the blur timeout
        this.cancelBlur = function cancelBlur() {
            window.clearTimeout(timeoutBlur);
        };

        // clear button was clicked
        this.clearButtonClick = function clearButtonClick(data) {
            self.cancelBlur();
            Evme.Searchbar.focus();
        };

        // searchbar value changed
        this.valueChanged = function valueChanged(data) {
            self.hideKeyboardTip();

            if (data.value) {
                Searcher.searchAsYouType(data.value, SEARCH_SOURCES.TYPING);
            }

            self.setEmptyClass();
            Evme.Helper.hideTitle();
        };

        // Searchbar is focused but no action is taken
        this.idle = function idle(data) {

        };

        // User paused for a slight time when typing
        this.pause = function pause(data) {
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
        this.hideKeyboardTip = function hideKeyboardTip() {
            if (tipKeyboard) {
                tipKeyboard.hide();
                tipKeyboard = null;
            }
        };
    };
    this.FFOS = new function FFOS() {
        // dock hidden
        this.hideMenu = function hideMenu() {
            Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.HIDE_MENU);
            elContainer.classList.remove("ffos-menu-visible");
            Evme.Shortcuts.refreshScroll();
        };

        // dock appears
        this.showMenu = function showMenu() {
            Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.SHOW_MENU);
            elContainer.classList.add("ffos-menu-visible");
            Evme.Shortcuts.refreshScroll();
        };
    };

    // modules/Helper/
    this.Helper = new function Helper() {
        var self = this,
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
        this.load = function load(data) {
            refineQueryShown = "";
        };

        // helper item was selected
        this.click = function click(data) {
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
        this.clear = function clear() {
            if (!cleared) {
                cleared = true;
                self.showDefault();
            }
        };

        // slide items in
        this.animateDefault = function animateDefault() {
            Evme.Helper.animateLeft(function onAnimationComplete(){
                self.showDefault();
                Evme.Helper.animateFromRight();
            });
        };

        // transition to default items
        this.showDefault = function showDefault() {
            Searcher.cancelRequests();
            Evme.BackgroundImage.loadDefault();

            if (Evme.Searchbar.getValue() == "" && !Evme.Utils.isKeyboardVisible) {
                Evme.Helper.setTitle();
                Evme.Helper.showTitle();
            } else {
                self.loadHistory();
            }
        };

        // transition to history items
        this.animateIntoHistory = function animateIntoHistory(history) {
            if (!history || history.length > 0) {
                Evme.Helper.animateLeft(function onAnimationComplete(){
                    self.loadHistory(history);
                    Evme.Helper.animateFromRight();
                });
            }
        };

        // load history items
        this.loadHistory = function loadHistory(history) {
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
        this.showRefinement = function showRefinement(data) {
            var types = data.data;
            var query = Searcher.getDisplayedQuery();

            if (refineQueryShown != query) {
                Evme.DoATAPI.getDisambiguations({
                    "query": query
                }, function onSuccess(data) {
                    if (data.errorCode != Evme.DoATAPI.ERROR_CODES.SUCCESS) {
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
        this.show = function show(data) {
            var items = data.data;
            var type = data.type;

            cleared = false;

            Evme.Helper.getList().classList.remove("default");

            if (type !== "refine") {
                refineQueryShown = "";
            }

            switch (type) {
                case "":
                    var history = Evme.SearchHistory.get() || [];
                    if (history && history.length > 0) {
                        Evme.Helper.addLink(SHOW_HISTORY_TEXT, function onLinkAdded(){
                            self.animateIntoHistory(history);
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
                    Evme.Helper.addLink(HISTORY_CLEAR_TEXT, function onLinkAdded(e){
                        Evme.SearchHistory.clear();

                        if (Evme.Searchbar.getValue()) {
                            Evme.Helper.showSuggestions();
                        } else {
                            Evme.Helper.clear();
                        }
                    });

                    break;
            }
        };

        // Spelling correction item click
        function didyoumeanClick(e) {
            var callback = Evme.Helper.showTitle;
            if (Evme.Utils.isKeyboardVisible) {
                callback = Evme.Helper.showSuggestions;
            }

            e && e.stopPropagation();
            e && e.preventDefault();

            setTimeout(callback, TIMEOUT_ANDROID_BEFORE_HELPER_CLICK);
        }
    };

    // modules/Location/
    this.Location = new function Location() {
        var self = this;

        // Location is being requested
        this.requesting = function requesting() {
            elContainer.classList.add("requesting-location");
        };

        // location retrieved successfully
        this.success = function success(data) {
            elContainer.classList.remove("requesting-location");
        };

        // location request error has occured
        this.error = function error(data) {
            elContainer.classList.remove("requesting-location");
        };
    };

    // modules/Apps/
    this.Apps = new function Apps() {
        var bShouldGetHighResIcons = false;

        // init sequence ended
        this.init = function init() {
            bShouldGetHighResIcons = Evme.Utils.getIconsFormat() == Evme.Utils.ICONS_FORMATS.Large;
            Evme.EventHandler && Evme.EventHandler.bind(Brain.App.handleEvents);
        };

        // app items loaded
        this.loadComplete = function loadComplete(data) {
            var icons = data.icons,
                iconsToGet = icons.missing;

            if (bShouldGetHighResIcons && !Evme.Utils.isKeyboardVisible && icons && icons.cached) {
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
        this.scrollTop = function scrollTop() {
            Evme.BackgroundImage.showFullScreen();
        };

        // app list has scrolled to bottom
        this.scrollBottom = function scrollBottom() {
            Searcher.loadMoreApps();
        };

        this.clearIfHas = function() {
            var hadApps = Evme.Apps.clear();
            if (!hadApps) {
                return false;
            }

            Evme.Searchbar.setValue('', true);
            Brain.FFOS.showMenu();

            return true;
        }
    };

    // modules/Apps/
    this.AppsMore = new function() {
        // more button was clicked
        this.buttonClick = function() {
            Searcher.loadMoreApps();
        };
    };

    // modules/Apps/
    this.App = new function App() {
        var self = this,
            bNeedsLocation = false,
            isKeyboardOpenWhenClicking = false,
            loadingApp = null,
            loadingAppAnalyticsData,
            loadingAppId = false;

        var STORAGE_KEY_CLOSE_WHEN_RETURNING = "needsToCloseKeyboard";

        // Remove app clicked
        this.close = function close(data) {
            Evme.Apps.removeApp(data.data.id);
        };

        // app pressed and held
        this.hold = function hold(data) {
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
            var appIcon = Evme.Utils.formatImageData(data.app.getIcon());
            // make it round
            Evme.Utils.getRoundIcon(appIcon, function onIconReady(roundedAppIcon) {
                // bookmark
                Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_INSTALL, {
                    "originUrl": data.app.getFavLink(),
                    "title": data.data.name,
                    "icon": roundedAppIcon
                });
                // display system banner
                Evme.Banner.show(_('app-added-to-home-screen', {name: data.data.name}));
            });
        };

        // app clicked
        this.click = function click(data) {
            if (!Searcher.isLoadingApps() || data.data.installed || Evme.Utils.isKeyboardVisible) {
                data.keyboardVisible = Evme.Utils.isKeyboardVisible ? 1 : 0;
                var query = Searcher.getDisplayedQuery();

                data.isFolder = !query;

                if (!Searcher.searchedExact()) {
                    if (!data.isFolder) {
                        Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, true);

                        Evme.Searchbar.setValue(data.data.installed? data.data.name : Searcher.getDisplayedQuery(), false, true);

                        Evme.Searchbar.blur();
                        Brain.Searchbar.cancelBlur();
                    }

                    window.setTimeout(function onTimeout(){
                        self.animateAppLoading(data);
                    }, 50);
                } else {
                    Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, false);
                    self.animateAppLoading(data);
                }
            }
        };

        // returns if app is currently loading
        this.isLoadingApp = function isLoadingApp() {
            return loadingApp;
        };

        // animate icon position after click
        this.animateAppLoading = function animateAppLoading(data) {
            Searcher.cancelRequests();


            loadingApp = data.app;
            loadingAppId = data.data.id;
            bNeedsLocation = data.data.requiresLocation && !Evme.DoATAPI.hasLocation();
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

            var elApp = data.el,
                appBounds = elApp.getBoundingClientRect(),

                elAppsList = elApp.parentNode.parentNode,
                appsListBounds = elAppsList.getBoundingClientRect(),

                oldPos = {
                    "top": elApp.offsetTop,
                    "left": elApp.offsetLeft
                },
                newPos = {
                    "top": (appsListBounds.height - appBounds.height)/2 - ((data.isFolder? elAppsList.dataset.scrollOffset*1 : Evme.Apps.getScrollPosition()) || 0),
                    "left": (appsListBounds.width - appBounds.width)/2
                };

            Evme.$remove("#loading-app");

            var elPseudo = Evme.$create('li', {'class': "inplace", 'id': "loading-app"}, loadingApp.getHtml()),
                useClass = !data.isFolder;

            if (data.data.installed) {
                elPseudo.classList.add("installed");
            }

            newPos.top -= appBounds.height/4;

            elPseudo.style.cssText += 'position: absolute; top: ' + oldPos.top + 'px; left: ' + oldPos.left + 'px; -moz-transform: translate3d(0,0,0);';

            var appName = "Loading...";
            if (bNeedsLocation) {
                appName = "";
            }

            Evme.$('b', elPseudo, function itemIteration(el) {
                el.innerHTML = appName;
            });

            elApp.parentNode.appendChild(elPseudo);
            elContainer.classList.add("loading-app");

            window.setTimeout(function onTimeout(){
                var x = -Math.round(oldPos.left-newPos.left),
                    y = -Math.round(oldPos.top-newPos.top);

                elPseudo.style.cssText += "; -moz-transform: translate3d(" + x + "px, " + y + "px, 0);";

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
        this.handleEvents = function handleEvents(_class, _event, _data){
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

            window.setTimeout(function onTimeout(){
                self.appRedirectExecute(data);
            }, delay);
        }

        // actual redirection
        this.appRedirectExecute = function appRedirectExecute(data){
            var appIcon = Evme.Utils.formatImageData(data.icon);
            if (data.installed) {
                GridManager.getAppByOrigin(data.appUrl).launch();
            } else {
                Evme.Utils.getRoundIcon(appIcon, function onIconReady(roundedAppIcon) {
                    Evme.Utils.sendToFFOS(Evme.Utils.FFOSMessages.APP_CLICK, {
                        "url": data.appUrl,
                        "originUrl": data.favUrl,
                        "title": data.name,
                        "icon": roundedAppIcon,
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
                Evme.$remove("#loading-app");
                Evme.BackgroundImage.cancelFullScreenFade();
                elContainer.classList.remove("loading-app");

                if (Evme.Storage.get(STORAGE_KEY_CLOSE_WHEN_RETURNING)) {
                    Searcher.searchAgain();
                }
                Evme.Storage.remove(STORAGE_KEY_CLOSE_WHEN_RETURNING);

                Evme.EventHandler.trigger("Core", "returnedFromApp");
            }
        }

        this.cancel = function app_cancel() {
          returnFromOutside();
        }
    };

    // modules/BackgroundImage/
    this.BackgroundImage = new function BackgroundImage() {
        // show
        this.showFullScreen = function showFullScreen() {
            elContainer.classList.add("fullscreen-bgimage");
            Evme.Apps.scrollToStart();
        };

        // hide
        this.hideFullScreen = function hideFullScreen() {
            elContainer.classList.remove("fullscreen-bgimage");
        };
    };

    // modules/SmartFolder/
    this.SmartFolder = new function SmartFolder() {
        var self = this,
            currentFolder = null,
            requestSmartFolderApps = null;

        // shortcut was clicked
        this.show = function show(data) {
            elContainer.classList.add("smart-folder-visible");

            currentFolder = data.folder;

            window.setTimeout(self.loadAppsIntoFolder, 2000);
        };

        // hiding the folder
        this.hide = function hide() {
            elContainer.classList.remove("smart-folder-visible");

            Evme.Brain.Shortcuts.cancelSmartFolderRequests();
            Evme.ConnectionMessage.hide();
        };

        // close button was clicked
        this.close = function close() {
            currentFolder = null;
        };

        // get current folder
        this.get = function get() {
            return currentFolder;
        };

        // close current folder
        this.closeCurrent = function closeCurrent() {
            currentFolder && currentFolder.close();
        };

        this.hideIfOpen = function hideIfOpen() {
            if (self.get()) {
                self.closeCurrent();
                return true;
            }

            return false;
        };

        this.loadAppsIntoFolder = function loadAppsIntoFolder(onAppsLoaded) {
            if (!currentFolder) return;

            var query = currentFolder.getName();

            currentFolder.appsPaging = {
                "offset": 0,
                "limit": NUMBER_OF_APPS_TO_LOAD_IN_FOLDER
            };

            var iconsFormat = Evme.Utils.getIconsFormat(),
                installedApps = Searcher.getInstalledApps({
                    "query": query
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
                }, function onSuccess(data) {
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
        this.loadMoreApps = function loadMoreApps() {
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
            }, function onSuccess(data) {
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
    this.Shortcuts = new function Shortcuts() {
        var self = this,
            customizeInited = false,
            timeoutShowLoading = null,
            clickedCustomizeHandle = false,
            loadingCustomization = false,
            requestSmartFolderApps = null,
            requestSmartFolderImage = null;


        // module was inited
        this.init = function init() {
            elContainer.addEventListener('click', checkCustomizeDone);
        };

        // show
        this.show = function show() {
            new Evme.Tip(TIPS.APP_EXPLAIN, function onShow(tip) {
                elContainer.addEventListener("touchstart", tip.hide);
            }).show();

            Brain.Searchbar.hideKeyboardTip();

            self.loadFromAPI();
        };

        /// load items from API (as opposed to persistent storage)
        this.loadFromAPI = function loadFromAPI() {
            Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data) {
                Evme.Shortcuts.load(data.response);
            });
        };

        // fired when smartfolder shows but closed before apps requests return
        this.cancelSmartFolderRequests = function cancelSmartFolderRequests() {
            requestSmartFolderApps && requestSmartFolderApps.abort();
            requestSmartFolderImage && requestSmartFolderImage.abort();
        };

        // shortcut is clicked
        this.showSmartFolder = function showSmartFolder(options) {
            var folder = new Evme.SmartFolder({
                            "name": options.query,
                            "bgImage": (Evme.BackgroundImage.get() || {}).image,
                            "elParent": elContainer,
                            "onScrollEnd": Evme.Brain.SmartFolder.loadMoreApps
                        });

            folder.show();

            requestSmartFolderImage = Evme.DoATAPI.bgimage({
                "query": options.query,
                "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                "exact": true,
                "width": screen.width,
                "height": screen.height
            }, function onSuccess(data) {
                folder.setImage({
                    "image": Evme.Utils.formatImageData(data.response.image),
                    "query": options.query,
                    "source": data.response.source
                });

                requestSmartFolderImage = null;
            });
        };

        // shortcuts loaded. add + icon
        this.load = function load() {
            Brain.ShortcutsCustomize.addCustomizeButton();
        };

        // return to normal shortcut mode
        this.doneEdit = function doneEdit() {
            if (!Evme.Shortcuts.isEditing) return;

            Evme.Shortcuts.isEditing = false;
            elContainer.classList.remove("shortcuts-customizing");
        };

        // returns edit status
        this.isEditing = function isEditing() {
            return Evme.Shortcuts.isEditing;
        };

        // checks all clicks inside our app, and stops the customizing mode
        function checkCustomizeDone(e) {
            if (e.target.tagName === 'DIV' || e.target.tagName === 'UL') {
                if (!e.target.classList.contains('apps-group')) {
                    Brain.Shortcuts.doneEdit();
                }
            }
        }

        // stops editing (if active)
        this.hideIfEditing = function hideIfEditing() {
            if (self.isEditing()) {
                self.doneEdit();
                return true;
            }

            return false;
        };
    };

    // modules/Shortcuts/
    this.Shortcut = new function Shortcut() {
        // item clicked and held, remove item mode
        this.hold = function hold() {
            Evme.Shortcuts.isEditing = true;
            elContainer.classList.add("shortcuts-customizing");
        };

        // item clicked
        this.click = function click(data) {
            if(!Evme.Shortcuts.isEditing && !Evme.Shortcuts.isSwiping()) {
                var query = data.data.query;

                data.query = query;

                Brain.Shortcuts.showSmartFolder({
                    "query": data.query
                });
            }
        };

        // item remove
        this.remove = function remove(data) {
            Evme.Shortcuts.remove(data.shortcut);
            Evme.Shortcuts.refreshScroll();
            Evme.DoATAPI.Shortcuts.remove(data.data.query);
        };
    };

    // modules/ShortcutsCustomize/
    this.ShortcutsCustomize = new function ShortcutsCustomize() {
        var self = this,
            isRequesting = false,
            isFirstShow = true,
            requestSuggest = null,
            isOpen = false;

        this.show = function show() {
            isOpen = true;
        };

        this.hide = function hide() {
            Evme.ShortcutsCustomize.Loading.hide();
            isOpen = false;
        };

        this.hideIfRequesting = function hideIfRequesting() {
            if (isRequesting) {
                self.loadingCancel();
                return true;
            }

            return false;
        }

        this.isOpen = function _isOpen() {
            return isOpen;
        };

        // done button clicked
        this.done = function done(data) {
            if (data.shortcuts && data.shortcuts.length > 0) {
                Evme.DoATAPI.Shortcuts.add({
                    "shortcuts": data.shortcuts,
                    "icons": data.icons
                }, function onSuccess(){
                    Brain.Shortcuts.loadFromAPI();
                });
            }
        };

        // prepare and show
        this.showUI = function showUI() {
            if (isRequesting) return;

            isRequesting = true;

            Evme.ShortcutsCustomize.Loading.show();

            // load user/default shortcuts from API
            Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data){
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
                }, function onSuccess(data) {
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
        this.loadingCancel = function loadingCancel(data) {
            data && data.e.preventDefault();
            data && data.e.stopPropagation();

            requestSuggest && requestSuggest.abort();
            window.setTimeout(Evme.ShortcutsCustomize.Loading.hide, 50);
            isRequesting = false;
        };

        // inject + button
        this.addCustomizeButton = function addCustomizeButton() {
            var el = Evme.Shortcuts.getElement(),
                elCustomize = Evme.$create('li', {'class': "shortcut add"}, '<div class="c"><span class="thumb"></span><b>More</b></div>');

            elCustomize.addEventListener("click", self.showUI);

            el.appendChild(elCustomize);
        };
    };

    // modules/Dialog/
    this.Dialog = new function Dialog() {
        var active = null;

        // show
        this.show = function show(data) {
            active = data.obj;
        };

        // hide
        this.remove = function remove(data) {
            active = null;
        };

        // background modal clicked
        this.blackoutClick = function blackoutClick() {
            if (Evme.Utils.isKeyboardVisible) {
                Evme.Searchbar.focus();
                self.Evme.Searchbar.cancelBlur();
            }
        };

        this.getActive = function getActive() {
            return active;
        };

        this.isActive = function isActive() {
            return (active !== null && !Brain.Tips.isVisible());
        };
    };

    // modules/Tip/
    this.Tips = new function Tips() {
        var self = this,
            activeTip = null,
            timeoutShowTip = null;

        // show
        this.show = function show(tip, options) {
            !options && (options = {});

            if (activeTip) {
                return null;
            }

            var onHelper = false;

            if (options.query) {
                for (var tipId in TIPS.HELPER) {
                    if (tipId == options.query.toUpperCase()) {
                        var helperTip = TIPS.HELPER[tipId];

                        helperTip.timesShown = self.timesShown(helperTip);

                        if (self.timesShown(helperTip) < helperTip.timesToShow) {
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
            self.markAsShown(tip);
        }

        this.markAsShown = function markAsShown(tip) {
            tip.timesShown++;
            Evme.Storage.set(tip.id, tip.timesShown);
        };

        this.timesShown = function timesShown(tip) {
            return Evme.Storage.get(tip.id) || 0;
        };

        this.isVisible = function isVisible() {
            return activeTip;
        };
    };

    // helpers/Utils.Connection
    this.Connection = new function Connection() {
        // upon becoming online
        this.online = function online() {
            Evme.ConnectionMessage.hide();
            Evme.DoATAPI.backOnline();
        };
    };

    // api/DoATAPI.js
    this.DoATAPI = new function DoATAPI() {
        // trigger message when request fails
        this.cantSendRequest = function cantSendRequest() {
            var message = APPS_ERROR_TEXT,
                folder = Brain.SmartFolder.get(),
                elParent = folder? Evme.$(".evme-apps", folder.getElement())[0] : Evme.Apps.getList().parentNode,
                query = Evme.Searchbar.getElement().value || (folder && folder.getName()) || '';

            message = message.replace(/{QUERY}/g, query);
            Evme.ConnectionMessage.show(message, elParent);
        };
    };

    // Searcher object to handle all search events
    this.Searcher = new function _Searcher() {
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

        this.isLoadingApps = function isLoadingApps() {
            return requestSearch;
        };

        this.getApps = function getApps(options) {
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

            iconsFormat = Evme.Utils.getIconsFormat();
            options.iconsFormat = iconsFormat;

            var _NOCACHE = false;
            if (QUERIES_TO_NOT_CACHE.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                _NOCACHE = true;
            }

            cancelSearch();

            var installedApps = [];
            if (appsCurrentOffset == 0) {
                installedApps = Searcher.getInstalledApps({
                    "query": Evme.Searchbar.getValue()
                });
            }

            options.hasInstalledApps = installedApps.length > 0;

            Evme.Apps.load({
                "apps": installedApps,
                "clear": appsCurrentOffset == 0,
                "iconFormat": iconsFormat,
                "offset": 0,
                "installed": true,
                "onDone": function onAppsLoaded() {
                    if (!exact && query.length < MINIMUM_LETTERS_TO_SEARCH) {
                        return;
                    }

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
                    }, function onSuccess(data) {
                        getAppsComplete(data, options);
                        requestSearch = null;
                        NUMBER_OF_APPS_TO_LOAD = DEFAULT_NUMBER_OF_APPS_TO_LOAD;
                    }, removeSession);
                }
            });
        };

        this.getInstalledApps = function getInstalledApps(options) {
            if (!DISPLAY_INSTALLED_APPS) {
                return [];
            }

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

            if (max) {
                apps.splice(max);
            }

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

                        Evme.Apps.getElement().classList.add("has-more");
                    } else {
                        Evme.Apps.getElement().classList.remove("has-more");
                    }
                }
            }

            if (isExactMatch) {
                var originalTip = TIPS.EXACT_RESULTS;
                if (data.response.queryType == QUERY_TYPES.EXPERIENCE && TIPS.EXACT_RESULTS_SHORTCUT) {
                    originalTIp = TIPS.EXACT_RESULTS_SHORTCUT;
                }

                var tip = Evme.Utils.cloneObject(originalTip),
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

        this.getBackgroundImage = function getBackgroundImage(options) {
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

        this.getIcons = function getIcons(ids, format) {
            format = format || Evme.Utils.getIconsFormat();
            if (format !== Evme.Utils.ICONS_FORMATS.Large) {
                return;
            }

            requestIcons = Evme.DoATAPI.icons({
                "ids": ids.join(","),
                "iconFormat": format
            }, function onSuccess(data) {
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

        this.getAutocomplete = function getAutocomplete(query) {
            if (autocompleteCache[query]) {
                getAutocompleteComplete(autocompleteCache[query]);
                return;
            }

            requestAutocomplete = Evme.DoATAPI.suggestions({
                "query": query
            }, function onSuccess(data) {
                if (!data) {
                    return;
                }

                var items = data.response || [];
                autocompleteCache[query] = items;
                getAutocompleteComplete(items, query);
            });
        };

        function getAutocompleteComplete(items, querySentWith) {
            window.clearTimeout(timeoutAutocomplete);
            timeoutAutocomplete = window.setTimeout(function onTimeout(){
                if (Evme.Utils.isKeyboardVisible && !requestSearch) {
                    Evme.Helper.loadSuggestions(items);
                    Evme.Helper.showSuggestions(querySentWith);
                }
            }, TIMEOUT_BEFORE_RENDERING_AC);
        };


        function setTimeoutForShowingDefaultImage() {
            Searcher.clearTimeoutForShowingDefaultImage();
            timeoutShowDefaultImage = window.setTimeout(Evme.BackgroundImage.loadDefault, TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE);
        }

        this.clearTimeoutForShowingDefaultImage = function clearTimeoutForShowingDefaultImage() {
            window.clearTimeout(timeoutShowDefaultImage);
        };

        this.loadMoreApps = function loadMoreApps() {
            if (hasMoreApps) {
                Evme.Apps.More.show();
                Searcher.nextAppsPage(hasMoreApps.query, hasMoreApps.type, hasMoreApps.isExact);
            }
        };

        this.empty = function empty(){
            Searcher.cancelRequests();
            Evme.Apps.clear();
            resetLastSearch();
            lastQueryForImage = "";

            if (!Evme.Searchbar.getValue()) {
                Evme.Helper.clear();
            }
        };

        this.nextAppsPage = function nextAppsPage(query, type, exact) {
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

        this.searchAgain = function searchAgain(source) {
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

        this.searchExactFromOutside = function searchExactFromOutside(query, source, index, type, offset, isGetAllAppsForPage) {
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
                window.setTimeout(function onTimeout(){
                    Brain.Searchbar.cancelBlur();
                }, 0);
            }

            Brain.Searchbar.setEmptyClass();
        };

        this.searchExact = function searchExact(query, source, index, type, offset, automaticSearch) {
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

        this.searchExactAsYouType = function searchExactAsYouType(query, queryTyped) {
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

        this.searchAsYouType = function searchAsYouType(query, source){
            appsCurrentOffset = 0;

            Searcher.getAutocomplete(query);

            var searchOptions = {
                "query": query,
                "source": source
            };

            requestSearch && requestSearch.abort();
            window.clearTimeout(timeoutSearchWhileTyping);
            timeoutSearchWhileTyping = window.setTimeout(function onTimeout(){
                Searcher.getApps(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_APPS_SEARCH);

            requestImage && requestImage.abort();
            window.clearTimeout(timeoutSearchImageWhileTyping);
            timeoutSearchImageWhileTyping = window.setTimeout(function onTimeout(){
                Searcher.getBackgroundImage(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH);
        };

        this.cancelRequests = function cancelRequests() {
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

        this.setLastQuery = function setLastQuery() {
            Evme.Searchbar.setValue(lastSearch.query, false, true);
            Evme.Helper.setTitle(lastSearch.query, lastSearch.type);
        };

        this.getDisplayedQuery = function getDisplayedQuery() {
            return lastSearch.query;
        };

        this.getDisplayedSource = function getDisplayedSource() {
            return lastSearch.source;
        };

        this.searchedExact = function searchedExact() {
            return lastSearch.exact;
        };
    }
    var Searcher = this.Searcher;
};
