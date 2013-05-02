/*
* Brain.js
* A subscriber to all EventHandler published event
* The glue that sticks all components to one another
*/
Evme.Brain = new function Evme_Brain() {
    var self = this,
        Brain = this,
        _config = {},
        elContainer = null,
        QUERIES_TO_NOT_CACHE = "",
        DEFAULT_NUMBER_OF_APPS_TO_LOAD = 16,
        NUMBER_OF_APPS_TO_LOAD_IN_FOLDER = "FROM CONFIG",
        NUMBER_OF_APPS_TO_LOAD = "FROM CONFIG",
        TIME_BEFORE_INVOKING_HASH_CHANGE = 200,
        MINIMUM_LETTERS_TO_SEARCH = 2,
        SEARCH_SOURCES = {},
        PAGEVIEW_SOURCES = {},
        ICON_SIZE = null,
        
        CLASS_HIDE_OS = 'evme-hide-os',
        CLASS_NO_QUERY = 'evme-empty-query',
        CLASS_SHORTCUTS_VISIBLE = 'evme-shortcuts-visible',
        CLASS_FOLDER_VISIBLE = 'evme-smart-folder-visible',
        CLASS_CUSTOMIZING = 'evme-shortcuts-customizing',
        CLASS_WHEN_OFFLINE = 'evme-offline',
        CLASS_WHEN_BGIMAGE_FULLSCREEN = 'evme-fullscreen-bgimage',
        CLASS_WHEN_GOING_TO_APP = 'evme-loading-app',

        TIMEOUT_BEFORE_REQUESTING_APPS_AGAIN = 500,
        TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE = 3000,
        TIMEOUT_BEFORE_SHOWING_HELPER = 3000,
        TIMEOUT_BEFORE_RENDERING_AC = 300,
        TIMEOUT_BEFORE_RUNNING_APPS_SEARCH = 600,
        TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH = 800,
        TIMEOUT_BEFORE_AUTO_RENDERING_MORE_APPS = 200,
        TIMEOUT_BEFORE_SHOWING_APPS_LOADING = 800,

        L10N_SYSTEM_ALERT = 'alert',

        // whether to show shortcuts customize on startup or not
        ENABLE_FAVORITES_SHORTCUTS_SCREEN = false,
        
        QUERY_TYPES = {
          "EXPERIENCE": "experience",
          "APP": "app",
          "QUERY": "query"
        },

        DISPLAY_INSTALLED_APPS = "FROM_CONFIG",

        INSTALLED_APPS_TO_TYPE = {
          "music": ["FM Radio", "Music", "Video"],
          "games": ["Marketplace", "CrystalSkull", "PenguinPop", "TowerJelly"],
          "maps": ["Geoloc"],
          "email": ["E-mail"],
          "images": ["Gallery", "Camera"],
          "video": ["Video", "Camera"],
          "local": ["Geoloc", "Maps"]
        },

        timeoutSetUrlAsActive = null,
        timeoutHashChange = null,
        mozL10nTranslate = navigator.mozL10n.translate;

    /*
        Init sequense triggered by Core.js
    */
    this.init = function init(options) {
        // bind to events
        Evme.EventHandler.bind(self.catchCallback);
        
        elContainer = Evme.$('#evmeContainer');
        
        initL10nObserver();

        _config = options;
        
        NUMBER_OF_APPS_TO_LOAD = _config.numberOfAppsToLoad || DEFAULT_NUMBER_OF_APPS_TO_LOAD;
        NUMBER_OF_APPS_TO_LOAD_IN_FOLDER = _config.numberOfAppsToLoad || NUMBER_OF_APPS_TO_LOAD_IN_FOLDER;

        SEARCH_SOURCES = _config.searchSources;
        PAGEVIEW_SOURCES = _config.pageViewSources;

        DISPLAY_INSTALLED_APPS = _config.displayInstalledApps;

        ICON_SIZE = Evme.Utils.sendToOS(Evme.Utils.OSMessages.GET_ICON_SIZE);
    };
    
    // l10n: create a mutation observer to know when a node was added
    // and check if it needs to be translated
    function initL10nObserver() {
      // Shortcuts page (left)
      new MutationObserver(Evme.Brain.l10nMutationObserver)
          .observe(elContainer, {
            childList: true,
            subtree: true
          });
    }
    
    // callback for "node added" mutation observer
    // this translates all the new nodes added
    // the mozL10nTranslate method is defined above, it's a reference to the mozilla l10n function
    this.l10nMutationObserver = function onMutationEventNodeAdded(mutations) {
      for (var i=0, mutation; mutation=mutations[i++];) {
        var children = mutation.addedNodes || [];
        for (var j=0, node; node=children[j++];) {
          if (node instanceof HTMLElement) {
            node && mozL10nTranslate(node);
          }
        }
      }
    }

    /**
     * main event handling method that catches all the events from the different modules,
     * and calls the appropriate method in Brain
     * @_class (string) : the class that issued the event (Apps, SmartFolder, Helper, etc.)
     * @_event (string) : the event that the class sent
     * @_data (object)  : data sent with the event
     */
    this.catchCallback = function catchCallback(_class, _event, _data) {       
      Evme.Utils.log('Callback: ' + _class + '.' + _event);

      try {
        self[_class] && self[_class][_event] && self[_class][_event](_data || {});
      } catch(ex){
        Evme.Utils.log('CB Error! ' + ex.message);
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
            
            // set the initial online/offline class
            window.setTimeout(function setonlinestatus() {
              Evme.Utils.Connection.online(function onlineStatus(isOnline) {
                isOnline? Evme.Utils.Connection.setOnline() : Evme.Utils.Connection.setOffline();
              });
            }, 300);
            
            
            window.setTimeout(Evme.Brain.Shortcuts.loadFromAPI, 0);
            
            Evme.Utils.sendToOS(Evme.Utils.OSMessages.ON_INIT);
            
            Evme.Searchbar.updateFontSize();
        };
    };

    // modules/Searchbar/
    this.Searchbar = new function Searchbar() {
        var self = this,
            timeoutBlur = null,
            TIMEOUT_BEFORE_RUNNING_BLUR = 50;

        // Searchbar focused. Keyboard shows
        this.focus = function focus(data) {
            Evme.Utils.setKeyboardVisibility(true);

            document.body.classList.add(CLASS_HIDE_OS);
            Evme.hideMenu();

            if (Evme.Searchbar.getValue() !== "") {
                Evme.Helper.showSuggestions();
            } else {
                Brain.Helper.showDefault();
            }
        };

        // Searchbar blurred. Keyboard hides.
        this.blur = function blur(data) {
          // Gaia bug workaround because of this http://b2g.everything.me/tests/input-blur.html
          if (data && data.e) {
              data.e.stopPropagation();
          }

          var searchbarValue = Evme.Searchbar.getValue(),
              didClickApp = false,
              elClicked = data && data.e && data.e.explicitOriginalTarget;

          if (elClicked) {
            for (var elParent = elClicked.parentNode; elParent; elParent = elParent.parentNode) {
              if (elParent.classList && elParent.classList.contains('evme-apps')) {
                didClickApp = true;
                break;
              }
            }
          }

          Evme.Utils.setKeyboardVisibility(false);
          self.setEmptyClass();

          if (searchbarValue !== '' && didClickApp) {
            Evme.Searchbar.setValue(searchbarValue);
          }
          
          if (!didClickApp){
            window.clearTimeout(timeoutBlur);
            timeoutBlur = window.setTimeout(self.returnPressed, TIMEOUT_BEFORE_RUNNING_BLUR);
          }
          
          // if the searchbar is empty- reset the view to landing page
          window.setTimeout(function onKeyboardHidden() {
            if (Evme.Searchbar.isEmpty()) {
              document.body.classList.remove(CLASS_HIDE_OS);
              Evme.showMenu();
            } else {
              Evme.goTo('search-results');
            }
          }, 400);
        };

        // Searchbar value is empty
        this.empty = function empty(data) {
            Searcher.cancelRequests();
            self.emptySource = (data && data.pageviewSource) || (data.sourceObjectName === "Searchbar" && PAGEVIEW_SOURCES.CLEAR);
            Searcher.empty();

            self.setEmptyClass();
            
            Brain.Helper.showDefault();
            Evme.BackgroundImage.loadDefault();

            Evme.DoATAPI.cancelQueue();
            
            Evme.ConnectionMessage.hide(Evme.Apps.getList());
            
            if (!Evme.Utils.isKeyboardVisible) {
              document.body.classList.remove(CLASS_HIDE_OS);
              Evme.showMenu();
            }
        };

        // Searchbar was cleared
        this.clear = function clear(e) {
            Searcher.cancelRequests();
            Evme.Apps.clear();
            Brain.Helper.showDefault();
        };

        // Keyboard action key ("search") pressed
        this.returnPressed = function returnPressed(data) {
            var query = Evme.Searchbar.getValue();
            Searcher.searchExactFromOutside(query, SEARCH_SOURCES.RETURN_KEY);
            Evme.Searchbar.blur();
        };

        // toggle classname when searchbar is empty
        this.setEmptyClass = function setEmptyClass() {
          if (Evme.Searchbar.getValue()) {
            document.body.classList.remove(CLASS_NO_QUERY);
          } else {
            document.body.classList.add(CLASS_NO_QUERY);
          }
        };

        // if an event was captured - cancel the blur timeout
        this.cancelBlur = function cancelBlur() {
            window.clearTimeout(timeoutBlur);
        };

        // clear button was clicked
        this.clearButtonClick = function clearButtonClick(data) {
          if (Evme.Searchbar.isFocused()) {
            if (Evme.Searchbar.isEmpty()) {
              Evme.Searchbar.blur();
            } else {
              Evme.Searchbar.setValue('', true, true);
            }
          } else {
            Evme.Searchbar.setValue('', true, true);
            document.body.classList.remove(CLASS_HIDE_OS);
            Evme.showMenu();
          }
        };
        
        // shortcuts button was clicked
        this.shortcutsButtonClick = function shortcutsButtonClick(data) {
          Evme.Shortcuts.show();
        };
        
        // save button was clicked
        this.saveButtonClick = function saveButtonClick(data) {
          if (!confirm(Evme.Utils.l10n('alert', 'save-smartfolder'))) {
            return;
          }
          
          var query = Evme.Searchbar.getValue(),
              shortcut = {
                "query": query,
                "appIds": []
              },
              apps = Evme.Apps.getApps(),
              icons = {},
              i = 0;
          
          for (var id in apps) {
            icons[id] = apps[id].getIcon();
            shortcut.appIds.push(id);
            
            if (++i >= 3) {
              break;
            }
          }
          
          Evme.DoATAPI.Shortcuts.add({
            "shortcuts": shortcut,
            "icons": icons
          }, function onSuccess(){
            Brain.Shortcuts.loadFromAPI();
          });
        };

        // searchbar value changed
        this.valueChanged = function valueChanged(data) {
            if (data.value) {
                Searcher.searchAsYouType(data.value, SEARCH_SOURCES.TYPING);
            }

            self.setEmptyClass();
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
    };
    
    // modules/Helper/
    this.Helper = new function Helper() {
        var self = this,
            cleared = false,
            refineQueryShown = '',
            flashCounter = 0,
            previousFirstSuggestion = '',
            TIMEOUT_ANDROID_BEFORE_HELPER_CLICK = 500,
            sourcesMap = {};
      
        this.init = function init() {
          sourcesMap = {
            "suggestions": SEARCH_SOURCES.SUGGESTION,
            "didyoumean": SEARCH_SOURCES.SPELLING,
            "refine": SEARCH_SOURCES.REFINE,
            "history": SEARCH_SOURCES.HISTORY
          };
        };
        
        // items loaded
        this.load = function load(data) {
          refineQueryShown = "";
        };

        // helper item was selected
        this.click = function click(data) {
          var query = data.value,
              index = data.index,
              source = data.source || 'suggestions',
              type = data.type;

          Brain.Searchbar.cancelBlur();

          if (query === '.') {
            query = Evme.Searchbar.getValue();
          } else {
            Evme.Searchbar.setValue(query, false, true);
          }

          Searcher.searchExactFromOutside(query, sourcesMap[source], index, type);
        };

        // Items were cleared
        this.clear = function clear() {
          if (!cleared) {
            cleared = true;
            self.showDefault();
          }
        };

        // transition to default items
        this.showDefault = function showDefault() {
            if (Evme.Searchbar.getValue() !== "" || Evme.Utils.isKeyboardVisible) {
                self.loadHistory();
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
            var items = data.data,
                type = data.type;
            
            cleared = false;
            
            if (type !== "refine") {
                refineQueryShown = "";
            }
            
            switch (type) {
                case "":
                    var history = Evme.SearchHistory.get() || [];
                    if (history && history.length > 0) {
                        Evme.Helper.addLink('history-link', function onLinkAdded(){
                            self.loadHistory(history);
                        });
                    }
                    break;
                case "refine":
                    if (refineQueryShown == Searcher.getDisplayedQuery()) {
                        if (items.length == 1) {
                            Evme.Helper.addText('no-refine');
                        }
                        
                        Evme.Helper.addLink('dismiss', didyoumeanClick);
                    }
                    break;

                case "didyoumean":
                    Evme.Helper.addLink('dismiss', didyoumeanClick);
                    break;

                case "history":
                    Evme.Helper.addLink('history-clear', function historyclearClick(e){
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
            e && e.stopPropagation();
            e && e.preventDefault();
            
            setTimeout(Evme.Helper.showSuggestions, TIMEOUT_ANDROID_BEFORE_HELPER_CLICK);
        }
    };
    
    // modules/Location/
    this.Location = new function Location() {
        var self = this,
            CLASS_REQUESTING = 'requesting-location';

        // Location is being requested
        this.request = function request() {
            document.body.classList.add(CLASS_REQUESTING);
        };
        
        // location retrieved successfully
        this.success = function success(data) {
            document.body.classList.remove(CLASS_REQUESTING);
            
            var coords = data && data.position && data.position.coords,
                lat = coords && coords.latitude,
                lon = coords && coords.longitude;
            
            if (lat && lon) {
                Evme.DoATAPI.setLocation(lat, lon);
            }
        };

        // location request error has occured
        this.error = function error(data) {
            document.body.classList.remove(CLASS_REQUESTING);
            
            var s = [];
            for (var k in data) {
                s.push(k + ': ' + data[k]);
            }
            Evme.Utils.log('{' + s.join('},{') + '}');
        };
    };

    // modules/Tasker/
    this.Tasker = new function Tasker() {
      var self = this;
      
      this.TASK_UPDATE_SHORTCUT_ICONS = "updateShortcutIcons";

      // module init
      this.init = function init() {
        Evme.Tasker.add({
          "id": self.TASK_UPDATE_SHORTCUT_ICONS
        });
      };

      // when a new task is added to the queue
      this.taskAdded = function taskAdded(data) {
        
      };

      // process the queue
      this.trigger = function trigger(data) {
        var tasks = data.tasks;

        for (var id in tasks) {
          if (self['callback_' + id]) {
            self['callback_' + id](tasks[id])
          } else {
            Evme.Utils.log('Error: No handler for task [' + id + ']');
          }
        }
      };

      this['callback_' + this.TASK_UPDATE_SHORTCUT_ICONS] = function updateShortcutIcons(taskData) {
        if (Evme.Brain.ShortcutsCustomize.isOpen()) {
          return false;
        }
        
        Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data){
          var currentShortcuts = data && data.response && data.response.shortcuts || [],
              shortcutsToSend = [];
  
          for (var i=0, shortcut, query; shortcut=currentShortcuts[i++];) {
              query = shortcut.query;
  
              if (shortcut.experienceId && !query) {
                  query = Evme.Utils.l10n('shortcut', 'id-' + Evme.Utils.shortcutIdToKey(shortcut.experienceId));
              }
              
              if (query) {
                  shortcutsToSend.push(query.toLowerCase());
              }
          }
          
          // re-request all the user's shortcuts to upadte them from the API
          // otherwise the shortcut icons will remain static and will never change, even if
          // the apps inside them have
          Evme.DoATAPI.shortcutsGet({
            "queries": JSON.stringify(shortcutsToSend),
            "_NOCACHE": true
          }, function onShortcutsGet(response) {
            var shortcuts = response.response.shortcuts,
                icons = response.response.icons;
            
            if (!shortcuts || !icons) {
              return;
            }
            
            Evme.DoATAPI.Shortcuts.clear(function onShortcuteCleared(){
              Evme.DoATAPI.Shortcuts.add({
                  "shortcuts": shortcuts,
                  "icons": icons
              }, function onSuccess(){
                  Brain.Shortcuts.loadFromAPI();
              });
            });
          });
          
          return true;
        });
      };
    };

    // modules/Apps/
    this.Apps = new function Apps() {
        var bShouldGetHighResIcons = false;

        // init sequence ended
        this.init = function init() {
            bShouldGetHighResIcons = Evme.Utils.getIconsFormat() == Evme.Utils.ICONS_FORMATS.Large;
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

        this.clearIfHas = function clearIfHas() {
            var hadApps = Evme.Apps.clear();
            if (!hadApps) {
                return false;
            }

            Evme.Searchbar.setValue('', true);
            return true;
        }
    };

    // modules/Apps/
    this.AppsMore = new function AppsMore() {
        // more button was clicked
        this.buttonClick = function buttonClick() {
            Searcher.loadMoreApps();
        };
        
        // indication of loading more apps is shown
        this.show = function AppsMore_show() {
            Evme.Apps.getElement().classList.add('loading-more');
        };
        
        // indication of loading more apps is hidden
        this.hide = function AppsMore_hide() {
            Evme.Apps.getElement().classList.remove('loading-more');
        };
    };

    // modules/Apps/
    this.App = new function App() {
        var self = this,
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
            // if hold an app while keyboard is visible we need to hide the keyboard.
            // since the user is actually looking at the first suggestion now,
            // we set the searchbar to it, so the apps won't change
            if (Evme.Utils.isKeyboardVisible) {
                var suggestions = Evme.Helper.getData().suggestions || [];
                if (suggestions.length > 0) {
                    var firstSuggestion = suggestions[0].replace(/[\[\]]/g, '');
                    Evme.Searchbar.setValue(firstSuggestion, true, true);
                }
                
                Evme.Searchbar.blur();
            }
            
            var isAppInstalled = Evme.Utils.sendToOS(
                Evme.Utils.OSMessages.IS_APP_INSTALLED,
                { 'url': data.app.getFavLink() }
            );

            if (isAppInstalled) {
                window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'app-install-exists', {'name': data.data.name}));
                return;
            }
            
            var msg = Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'app-install-confirm', {'name': data.data.name});
            if (!window.confirm(msg)) {
                return;
            }
            
            // get icon data
            var appIcon = Evme.Utils.formatImageData(data.app.getIcon());
            // make it round
            Evme.Utils.getRoundIcon(appIcon, function onIconReady(roundedAppIcon) {
                // bookmark - add to homescreen
                Evme.Utils.sendToOS(Evme.Utils.OSMessages.APP_INSTALL, {
                    'originUrl': data.app.getFavLink(),
                    'title': data.data.name,
                    'icon': roundedAppIcon,
                    'useAsyncPanZoom': data.app.isExternal()
                });
                // display system banner
                Evme.Banner.show('app-install-success', {
                    'name': data.data.name
                }, elContainer);

                Evme.EventHandler.trigger("App", "addToHomeScreen", {
                    "id": data.data.id,
                    "name": data.data.name
                });
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

                if (!data.data.installed) {
                  Evme.Searchbar.setValue(Searcher.getDisplayedQuery(), false, true);
                }

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
            loadingAppAnalyticsData = {
                "index": data.index,
                "keyboardVisible": data.keyboardVisible,
                "isMore": data.isMore,
                "appUrl": data.app.getLink(),
                "favUrl": data.app.getFavLink(),
                "name": data.data.name,
                "id": data.appId,
                "appType": data.data.appType || "cloud",
                "query": Searcher.getDisplayedQuery(),
                "source": Searcher.getDisplayedSource(),
                "icon": data.data.icon,
                "installed": data.data.installed || false
            };

            var elApp = data.el,
                appGridPosition = data.app.getPositionOnGrid(),
                appBounds = elApp.getBoundingClientRect(),

                elAppsList = elApp.parentNode,
                appsListBounds = elAppsList.getBoundingClientRect(),
                elAppsListParent = elAppsList.parentNode,
                appsListParentBounds = elAppsListParent.getBoundingClientRect(),
                
                oldPos = {
                  "top": elApp.offsetTop,
                  "left": elApp.offsetLeft
                },

                // First calculate the horizontal center of the viewport
                // Then add the scroll offset (different in smartfolder / search results)
                newPosTop = (appsListParentBounds.height - appBounds.height)/2 +
                  ((data.isFolder? elAppsListParent.dataset.scrollOffset*1 : Evme.Apps.getScrollPosition()) || 0),

                newPos = {
                  "top": newPosTop,
                  "left": (appsListBounds.width - appBounds.width)/2
                },
                
                elPseudo = Evme.$create('li', {
                             'class': 'inplace',
                             'id': "loading-app"
                           }, '<canvas></canvas>'),
                           
                pseudoCanvas = Evme.$('canvas', elPseudo)[0],
                appCanvas = data.app.getIconCanvas(),
                appIconData = appCanvas.getContext('2d').getImageData(0, 0, appCanvas.width, appCanvas.height);

            // copy the clicked app's canvas here
            pseudoCanvas.width = appCanvas.width;
            pseudoCanvas.height = appCanvas.height;
            pseudoCanvas.getContext('2d').putImageData(appIconData, 0, 0);
            
            // update analytics data
            loadingAppAnalyticsData.rowIndex = appGridPosition.row;
            loadingAppAnalyticsData.colIndex = appGridPosition.col;
            loadingAppAnalyticsData.totalRows = appGridPosition.rows;
            loadingAppAnalyticsData.totalCols = appGridPosition.cols;

            Evme.$remove("#loading-app");

            if (data.data.installed) {
                elPseudo.classList.add('installed');
            }

            newPos.top -= appBounds.height/4;

            elPseudo.style.cssText += ';top: ' + oldPos.top + 'px;' +
                                      'left: ' + oldPos.left + 'px;';

            elApp.parentNode.appendChild(elPseudo);
            document.body.classList.add(CLASS_WHEN_GOING_TO_APP);
            
            window.setTimeout(function onTimeout(){
                var x = -Math.round(oldPos.left-newPos.left),
                    y = -Math.round(oldPos.top-newPos.top);

                elPseudo.style.cssText += '; transform: translate3d(' + x + 'px, ' + y + 'px, 0);';

                goToApp(loadingAppAnalyticsData);
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

        // continue flow of redirecting to app
        function goToApp(data) {
            data.appUrl = loadingApp.getLink();
            data.isExternal = loadingApp.isExternal();

            Evme.EventHandler.trigger("Core", "redirectedToApp", data);

            self.appRedirectExecute(data);
        }

        // actual redirection
        this.appRedirectExecute = function appRedirectExecute(data){
            var appIcon = Evme.Utils.formatImageData(data.icon);
            if (data.installed) {
                GridManager.getAppByOrigin(data.appUrl).launch();
            } else {
                Evme.Utils.getRoundIcon(appIcon, function onIconReady(roundedAppIcon) {
                    Evme.Utils.sendToOS(Evme.Utils.OSMessages.APP_CLICK, {
                        "url": data.appUrl,
                        "originUrl": data.favUrl,
                        "title": data.name,
                        "icon": roundedAppIcon,
                        "urlTitle": Evme.Searchbar.getValue(),
                        "useAsyncPanZoom": data.isExternal
                    });
                });
            }

            setTimeout(returnFromOutside, 2000);
        };

        // returned from opened app
        function returnFromOutside() {
          if (loadingApp) {
            loadingAppAnalyticsData = null;
            loadingAppId = false;

            Searcher.clearTimeoutForShowingDefaultImage();
            Evme.$remove("#loading-app");
            Evme.BackgroundImage.cancelFullScreenFade();
            document.body.classList.remove(CLASS_WHEN_GOING_TO_APP);

            Evme.Storage.get(STORAGE_KEY_CLOSE_WHEN_RETURNING, function storageGot(value) {
              if (value) {
                Searcher.searchAgain(null, Evme.Searchbar.getValue());
              }

              Evme.Storage.remove(STORAGE_KEY_CLOSE_WHEN_RETURNING);
            });

            loadingApp = null;

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
        Evme.goTo('bgimage-fullscreen');
        document.body.classList.add(CLASS_WHEN_BGIMAGE_FULLSCREEN);
        Evme.Apps.scrollToStart();
      };

      // hide
      this.hideFullScreen = function hideFullScreen() {
        document.body.classList.remove(CLASS_WHEN_BGIMAGE_FULLSCREEN);

        if (Brain.SmartFolder.get()) {
          Evme.goTo('smartfolder');
        } else {
          Evme.goTo('search-results');
        }
      };
      
      this.setWallpaper = function setWallpaper(data) {
        if (confirm(Evme.Utils.l10n('alert', 'save-wallpaper'))) {
          Evme.Utils.sendToOS(Evme.Utils.OSMessages.SET_WALLPAPER, data.image);
        }
      };
    };

    // modules/SmartFolder/
    this.SmartFolder = new function SmartFolder() {
        var self = this,
            currentFolder = null,
            requestSmartFolderApps = null,
            requestSmartFolderImage = null,
            timeoutShowAppsLoading = null;

        // a folder is shown
        this.show = function show(data) {
            document.body.classList.add(CLASS_FOLDER_VISIBLE);
            Evme.goTo('smartfolder');
            currentFolder = data.folder;
            window.setTimeout(self.loadAppsIntoFolder, 400);
        };

        // hiding the folder
        this.hide = function hide() {
          document.body.classList.remove(CLASS_FOLDER_VISIBLE);
          Evme.Brain.SmartFolder.cancelRequests();
          Evme.goTo('shortcuts');
        };

        // close button was clicked
        this.close = function close() {
            currentFolder = null;
        };

        // get current folder
        this.get = function get() {
            return currentFolder;
        };
        
        this.showFullscreen = function showFullscreen() {
          Evme.goTo('smart-folder-fullscreen');
        };
        
        this.hideFullscreen = function hideFullscreen() {
          Evme.goTo('smartfolder');
        };
        
        this.closeFullScreen = function closeFullScreen() {
          if (currentFolder) {
            return currentFolder.hideFullscreen();
          }

          return false;
        };

        // close current folder
        this.closeCurrent = function closeCurrent() {
          currentFolder && currentFolder.close();
        };

        // cancel the current outgoing smart folder requests
        this.cancelRequests = function cancelRequests() {
            window.clearTimeout(timeoutShowAppsLoading);
            currentFolder && currentFolder.hideLoading();
            requestSmartFolderApps && requestSmartFolderApps.abort && requestSmartFolderApps.abort();
            requestSmartFolderImage && requestSmartFolderImage.abort && requestSmartFolderImage.abort();
        };
        
        // load the folder's background image
        this.loadBGImage = function loadBGImage() {
            if (!currentFolder) return;
            
            var experienceId = currentFolder.getExperience(),
                query = currentFolder.getQuery();
            
            requestSmartFolderImage = Evme.DoATAPI.bgimage({
                "query": experienceId? '' : query,
                "experienceId": experienceId,
                "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                "exact": true,
                "width": screen.width,
                "height": screen.height
            }, function onSuccess(data) {
                currentFolder && currentFolder.setImage({
                    "image": Evme.Utils.formatImageData(data.response.image),
                    "query": query,
                    "source": data.response.source
                });
                
                requestSmartFolderImage = null;
            });
        };
        
        // start the smart folder apps loading process
        this.loadAppsIntoFolder = function loadAppsIntoFolder() {
            if (!currentFolder) return;
            
            var experienceId = currentFolder.getExperience(),
                query = currentFolder.getQuery(),
                iconsFormat = Evme.Utils.getIconsFormat(),
                
                installedApps = Searcher.getInstalledApps({
                    "query": query
                });

            currentFolder.appsPaging = {
              "offset": 0,
              "limit": NUMBER_OF_APPS_TO_LOAD_IN_FOLDER
            };
            
            currentFolder.clear();
            currentFolder.loadApps({
                "apps": installedApps,
                "iconsFormat": iconsFormat,
                "offset": 0,
                "installed": true
            }, function onDone() {
                Evme.Utils.isOnline(function isOnlineCallback(isOnline){
                  if (isOnline && currentFolder) {
                    timeoutShowAppsLoading = window.setTimeout(currentFolder.showLoading,
                                                TIMEOUT_BEFORE_SHOWING_APPS_LOADING);
                  }
                });
  
                requestSmartFolderApps = Evme.DoATAPI.search({
                    "query": experienceId? '' : query,
                    "experienceId": experienceId,
                    "feature": SEARCH_SOURCES.SHORTCUT_SMART_FOLDER,
                    "exact": true,
                    "spellcheck": false,
                    "suggest": false,
                    "limit": currentFolder.appsPaging.limit,
                    "first": currentFolder.appsPaging.offset,
                    "iconFormat": iconsFormat
                }, function onSuccess(data) {
                    var apps = data.response.apps;
                    
                    updateShortcutIcons(experienceId || query, apps);

                    currentFolder.appsPaging.max = data.response.paging.max;

                    if (currentFolder.appsPaging.max > currentFolder.appsPaging.offset + currentFolder.appsPaging.limit) {
                        currentFolder.MoreIndicator.set(true);
                    } else {
                        currentFolder.MoreIndicator.set(false);
                    }
                    
                    // remove the already installed apps from the cloud apps
                    apps = Evme.Utils.dedupInstalledApps(apps, installedApps);
                    
                    window.clearTimeout(timeoutShowAppsLoading);
                    currentFolder.hideLoading();
                    
                    currentFolder.loadApps({
                        "apps": apps,
                        "iconsFormat": iconsFormat,
                        "offset": currentFolder.appsPaging.offset
                    });

                    requestSmartFolderApps = null;
                    
                    Evme.Location.updateIfNeeded();
                });
            });
            
            self.loadBGImage();
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

            var experienceId = currentFolder.getExperience(),
                query = currentFolder.getQuery(),
                iconsFormat = Evme.Utils.getIconsFormat();

            requestSmartFolderApps = Evme.DoATAPI.search({
                "query": experienceId? '' : query,
                "experienceId": experienceId,
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
                
                currentFolder.loadApps({
                    "apps": apps,
                    "iconsFormat": iconsFormat,
                    "offset": currentFolder.appsPaging.offset
                }, function onAppsLoaded() {
                  if (currentFolder.appsPaging.max > currentFolder.appsPaging.offset + currentFolder.appsPaging.limit) {
                      currentFolder.MoreIndicator.set(true);
                  } else {
                      currentFolder.MoreIndicator.set(false);
                  }
                });
                
                requestSmartFolderApps = null;
            });
        };
        
        function updateShortcutIcons(key, apps) {
          var shortcuts = {},
              icons = {},
              NUMBER_OF_ICONS = 3;
              
          for (var i=0,app; i<NUMBER_OF_ICONS; i++) {
            app = apps[i]
            icons[app.id] = app.icon;
          }
          shortcuts[key] = Object.keys(icons);
          
          Evme.DoATAPI.Shortcuts.update({
            "shortcuts": shortcuts,
            "icons": icons
          }, function onShortcutsUpdated() {
            for (var key in shortcuts) {
              var shortcut = Evme.Shortcuts.getShortcutByKey(key);
              if (shortcut) {
                shortcut.setImage(shortcuts[key]);
              }
            }
          });
        }
    };

    // modules/Shortcuts/
    this.Shortcuts = new function Shortcuts() {
        var self = this,
            customizeInited = false,
            timeoutShowLoading = null,
            clickedCustomizeHandle = false,
            loadingCustomization = false;
        
        // module was inited
        this.init = function init() {
            elContainer.addEventListener('click', checkCustomizeDone);
        };

        // show Smart Collections
        this.show = function show() {
            Evme.goTo('shortcuts');
            
            document.body.classList.add(CLASS_SHORTCUTS_VISIBLE);
            Evme.hideMenu(true);
        };
        
        // hide Smart Collections
        this.hide = function hide() {
            document.body.classList.remove(CLASS_SHORTCUTS_VISIBLE);
            Evme.showMenu(true);
            self.doneEdit();
            Evme.goTo();
        };

        /// load items from API (as opposed to persistent storage)
        this.loadFromAPI = function loadFromAPI() {
            Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data) {
                Evme.Shortcuts.load(data.response);
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
            document.body.classList.remove(CLASS_CUSTOMIZING);
            
            Evme.goTo('shortcuts');
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
            } else {
              Evme.Shortcuts.hide();
            }

            return false;
        };
    };

    // modules/Shortcuts/
    this.Shortcut = new function Shortcut() {
        // item clicked and held, remove item mode
        this.hold = function hold() {
            Evme.goTo('shortcuts-removing');
            Evme.Shortcuts.isEditing = true;
            document.body.classList.add(CLASS_CUSTOMIZING);
        };

        // item clicked
        this.click = function click(data) {
            if(!Evme.Shortcuts.isEditing && !Evme.Shortcuts.isSwiping()) {
                new Evme.SmartFolder({
                    "query": data.shortcut.getQuery(),
                    "experienceId": data.shortcut.getExperience(),
                    "elParent": Evme.$('#evme-shortcuts'),
                    "onScrollEnd": Evme.Brain.SmartFolder.loadMoreApps
                }).show();
            }
        };

        // item remove
        this.remove = function remove(data) {
            Evme.Shortcuts.remove(data.shortcut);
            Evme.DoATAPI.Shortcuts.remove(data.data);
        };
    };

    // modules/ShortcutsCustomize/
    this.ShortcutsCustomize = new function ShortcutsCustomize() {
        var self = this,
            isRequesting = false,
            requestSuggest = null,
            isOpen = false;

        this.loadingShow = function loadingShow() {
          Evme.hideMenu();
        };
        
        this.show = function show() {
          isOpen = true;
          Evme.goTo('shortcuts-customizing');
        };

        this.hide = function hide() {
          Evme.ShortcutsCustomize.Loading.hide();
          isOpen = false;
          Evme.goTo('shortcuts');
        };
        
        this.hideIfOpen = function hideIfOpen() {
            if (isOpen) {
                Evme.ShortcutsCustomize.hide();
                return true;
            }
            
            return false;
        };

        this.hideIfRequesting = function hideIfRequesting() {
            if (isRequesting) {
                self.loadingCancel();
                return true;
            }

            return false;
        };

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

            Evme.Utils.isOnline(function(isOnline) {
                if (!isOnline) {
                    window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'offline-shortcuts-more'));
                    window.setTimeout(function() {
                        isRequesting = false;
                    }, 200);
                    
                    return;
                }
                
                Evme.ShortcutsCustomize.Loading.show();
    
                // load user/default shortcuts from API
                Evme.DoATAPI.Shortcuts.get(null, function onSuccess(data){
                    var loadedResponse = data.response,
                        currentShortcuts = loadedResponse.shortcuts || [],
                        currentIcons = loadedResponse.icons || {},
                        // save data to send to the API
                        arrCurrentShortcuts = [],
                        // keep a map of existing shortcut IDs, to filter out API's response
                        shortcutIds = {};

                    for (var i=0, shortcut, query; shortcut=currentShortcuts[i++];) {
                        query = shortcut.query;

                        if (shortcut.experienceId) {
                          shortcutIds['' + shortcut.experienceId] = true;
                          if (!query) {
                              query = Evme.Utils.l10n('shortcut', 'id-' + Evme.Utils.shortcutIdToKey(shortcut.experienceId));
                          }
                        }
                        
                        if (query) {
                            arrCurrentShortcuts.push(query.toLowerCase());
                        }
                    }

                    // load suggested shortcuts from API
                    requestSuggest = Evme.DoATAPI.Shortcuts.suggest({
                        "existing": arrCurrentShortcuts,
                        "iconFormat": Evme.Utils.getIconsFormat()
                    }, function onSuccess(data) {
                        var suggestedShortcuts = data.response.shortcuts || [],
                            icons = data.response.icons || {};

                      	if (!isRequesting) {
                      		return;
                      	}
                      	
                        isRequesting = false;

                        // filter out duplicates, in case the API returns shortcuts we already have
                        // could happen due to translations mismatch
                        for (var i=0,shortcut; shortcut=suggestedShortcuts[i++];) {
                          if (shortcutIds['' + shortcut.experienceId]) {
                            suggestedShortcuts.splice(i-1, 1);
                            i--;
                          }
                        }

                        // API returned no shortcuts to suggest
                        if (suggestedShortcuts.length === 0) {
                          Evme.ShortcutsCustomize.Loading.hide();
                          window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'shortcuts-suggest-empty'));
                        } else {
                          for (var id in icons) {
                              currentIcons[id] = icons[id];
                          }

                          Evme.ShortcutsCustomize.load({
                              "shortcuts": suggestedShortcuts,
                              "icons": currentIcons
                          });
      
                          Evme.ShortcutsCustomize.show();
                          // setting timeout to give the select box enough time to show
                          // otherwise there's visible flickering
                          window.setTimeout(Evme.ShortcutsCustomize.Loading.hide, 300);
                        }
                    });
                });
            });
        };

        // cancel button clicked
        this.loadingCancel = function loadingCancel(data) {
            data && data.e.preventDefault();
            data && data.e.stopPropagation();

            requestSuggest && requestSuggest.abort && requestSuggest.abort();
            window.setTimeout(Evme.ShortcutsCustomize.Loading.hide, 50);
            isRequesting = false;
        };

        this.addButtonClicked = function() {
            self.showUI();
        };

        // inject + button
        this.addCustomizeButton = function addCustomizeButton() {
            var el = Evme.Shortcuts.getElement(),
                elCustomize = Evme.$create('li', {'class': "shortcut add"},
                                '<div class="c">' +
                                    '<span class="thumb"></span>' +
                                    '<b ' + Evme.Utils.l10nAttr('shortcuts', 'more') + '></b>' +
                                '</div>');
            
            elCustomize.addEventListener("click", self.showUI);

            el.appendChild(elCustomize);
        };
    };

    // helpers/Utils.Connection
    this.Connection = new function Connection() {
        // upon becoming online
        this.online = function online() {
            document.body.classList.remove(CLASS_WHEN_OFFLINE);
            Evme.ConnectionMessage.hide();
            Evme.DoATAPI.backOnline();
        };
        
        // upon going offline
        this.offline = function offline() {
            document.body.classList.add(CLASS_WHEN_OFFLINE);
        };
    };

    // api/DoATAPI.js
    this.DoATAPI = new function DoATAPI() {
        // a request was made to the API
        this.request = function request(data) {
            Evme.Utils.log(getRequestUrl(data));
        };
        
        this.cantSendRequest = function cantSendRequest(data) {
            if (data.method === 'Search/apps' || data.method === 'Search/suggestions'){
                var folder = Brain.SmartFolder.get(),
                    query = (folder? folder.getQuery() : Evme.Searchbar.getElement().value) || '',
                    elTo = folder? Evme.$(".evme-apps ul", folder.getElement())[0] : Evme.Apps.getList(),
                    bHasInstalled = folder? folder.hasInstalled() : Evme.Apps.hasInstalled(),
                    textKey = bHasInstalled? 'apps-has-installed' : 'apps';

                Evme.ConnectionMessage.show(elTo, textKey, { 'query': query });
            }
        };
        
        // an API callback method had en error
        this.clientError = function onAPIClientError(data) {
            Evme.Utils.log('API Client Error: ' + data.exception.message);
        };
        
        // an API callback method had en error
        this.error = function onAPIError(data) {
            Evme.Utils.log('API Server Error: ' + JSON.stringify(data.response));
        };
        
        // an API callback method had en error
        this.success = function onAPIError(data) {
            Evme.Utils.log('DoATAPI.succes: ' + data.method);
        };
        
        // user location was updated
        this.setLocation = function setLocation(data) {
            // TODO in the future, we might want to refresh results
            // to reflect accurate location.
            // but for now only the next request will use the location

            Evme.Tasker.trigger(true);
        };
        
        // construct a valid API url- for debugging purposes
        function getRequestUrl(eventData) {
            var params = eventData.params || {},
                urlParams = [];
                
            for (var p in params) {
                urlParams.push(p + '=' + encodeURIComponent(params[p]));
            }
            urlParams = urlParams.join('&');
            
            return Evme.api.getBaseURL() + eventData.method + '?' + urlParams;
        }
    };

    // Searcher object to handle all search events
    this.Searcher = new function _Searcher() {
        var appsCurrentOffset = 0,
            lastSearch = {},
            lastQueryForImage = "",
            hasMoreApps = false,
            iconsCachedFromLastRequest = [],
            autocompleteCache = {},

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
            timeoutShowAppsLoading = null;
            
            installedAppsQuery = '';

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

                if (!onlyDidYouMean && !options.automaticSearch) {
                    var urlOffset = appsCurrentOffset+NUMBER_OF_APPS_TO_LOAD;
                    if (urlOffset == NUMBER_OF_APPS_TO_LOAD && NUMBER_OF_APPS_TO_LOAD == DEFAULT_NUMBER_OF_APPS_TO_LOAD) {
                        urlOffset = 0;
                    }

                    Evme.SearchHistory.save(query, type);
                }
            }

            iconsFormat = Evme.Utils.getIconsFormat();
            options.iconsFormat = iconsFormat;

            var _NOCACHE = false;
            if (QUERIES_TO_NOT_CACHE.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
                _NOCACHE = true;
            }
            
            cancelSearch();



            var installedApps = [],
                searchbarValue = Evme.Searchbar.getValue(),
                isNewQuery = searchbarValue !== installedAppsQuery ||
                             source === SEARCH_SOURCES.RETURN_KEY;
            
            // current installed apps results don't match the query in the searchbar
            // search installed again   
            if (appsCurrentOffset === 0 && isNewQuery) {
              installedAppsQuery = searchbarValue;
              
              installedApps = Searcher.getInstalledApps({
                  "query": installedAppsQuery
              });
              
              options.hasInstalledApps = installedApps.length > 0;
            }
            
            Evme.Apps.load({
                "apps": installedApps,
                "clear": appsCurrentOffset === 0 && isNewQuery,
                "iconFormat": iconsFormat,
                "offset": 0,
                "installed": true,
                "onDone": function onAppsLoaded() {
                    if (!exact && query.length < MINIMUM_LETTERS_TO_SEARCH) {
                        return;
                    }

                    cancelSearch();

                    if (appsCurrentOffset === 0) {
                      Evme.Utils.isOnline(function isOnlineCallback(isOnline){
                        if (isOnline) {
                          timeoutShowAppsLoading = window.setTimeout(Evme.Apps.showLoading,
                                                      TIMEOUT_BEFORE_SHOWING_APPS_LOADING);
                        }
                      });
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
                        window.clearTimeout(timeoutShowAppsLoading);
                        Evme.Apps.hideLoading();

                        getAppsComplete(data, options, installedApps);

                        NUMBER_OF_APPS_TO_LOAD = DEFAULT_NUMBER_OF_APPS_TO_LOAD;

                        // only try to refresh location of it's a "real" search- with keyboard down
                        if (exact && appsCurrentOffset === 0 && !Evme.Utils.isKeyboardVisible) {
                            Evme.Location.updateIfNeeded();
                        }
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
                querySearch = query.toLowerCase(),
                apps = [],
                typeApps = INSTALLED_APPS_TO_TYPE[query.toLowerCase()],
                _apps = Evme.Utils.sendToOS(Evme.Utils.OSMessages.GET_ALL_APPS);

            if (!query) {
                return apps;
            }

            for (var i=0; i<_apps.length; i++) {
                var app = _apps[i],
                    name = Evme.Utils.sendToOS(Evme.Utils.OSMessages.GET_APP_NAME, app),
                    nameSearch = name.toLowerCase();

                if (nameSearch.indexOf(querySearch) !== -1 || typeApps && typeApps.indexOf(app.manifest.name) !== -1) {
                    apps.push({
                       'id': app._id,
                       'name': name,
                       'installed': true,
                       'appUrl': app.origin,
                       'favUrl': app.origin,
                       'appType': app.isBookmark ? 'bookmark' : 'installed',
                       'preferences': '',
                       'icon': Evme.Utils.sendToOS(Evme.Utils.OSMessages.GET_APP_ICON, app),
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

        function getAppsComplete(data, options, installedApps) {
            if (data.errorCode !== Evme.DoATAPI.ERROR_CODES.SUCCESS) {
              return false;
            }
            
            window.clearTimeout(timeoutHideHelper);
            
            var _query = options.query,
                _type = options.type,
                _source = options.source,
                _index = options.index,
                reloadingIcons = options.reloadingIcons,
                isExactMatch = options.exact,
                iconsFormat = options.iconsFormat,
                queryTyped = options.queryTyped, // used for searching for exact results if user stopped typing for X seconds
                onlyDidYouMean = options.onlyDidYouMean,
                hasInstalledApps = options.hasInstalledApps,
                
                searchResults = data.response,
                query = searchResults.query || _query,
                disambig = searchResults.disambiguation || [],
                suggestions = searchResults.suggestions || [],
                apps = searchResults.apps || [],
                spelling = searchResults.spellingCorrection || [],
                isMore = (appsCurrentOffset > 0),
                bSameQuery = (lastSearch.query === query);
            
            if (_source !== SEARCH_SOURCES.SUGGESTION &&
                _source !== SEARCH_SOURCES.SPELLING &&
                _source !== SEARCH_SOURCES.REFINE) {

              // searching after a timeout while user it typing
              if (onlyDidYouMean || options.automaticSearch) {
                  // show only spelling or disambiguation, and only if the query is the same as what the user typed
                  if (query == queryTyped && (spelling.length > 0 || disambig.length > 1)) {
                      Evme.Helper.load(queryTyped, query, undefined, spelling, disambig);
                      Evme.Helper.showSpelling();
                  }
              } else {
                  if (!isMore && !reloadingIcons) {
                      Evme.Helper.load(_query, query, suggestions, spelling, disambig);
  
                      if (isExactMatch) {
                          if (spelling.length > 0 || disambig.length > 1) {
                              Evme.Helper.showSpelling();
                          }
                      } else {
                          Evme.Helper.showSuggestions(_query);
                      }
                  }
              }
            } else {
              Evme.Helper.clear();
            }

            lastSearch.exact = isExactMatch && !onlyDidYouMean;

            if (isMore || !bSameQuery) {
                if (apps) {
                    // in case we're offline, but the apps come from the cache
                    // still need to remove the message
                    Evme.ConnectionMessage.hide(Evme.Apps.getList());
                    
                    // remove the already installed apps from the cloud apps
                    apps = Evme.Utils.dedupInstalledApps(apps, installedApps);

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
                        "onDone": function onDone() {
                          var maxApps = (searchResults.paging)? searchResults.paging.max || NUMBER_OF_APPS_TO_LOAD*2 : NUMBER_OF_APPS_TO_LOAD*2;
      
                          hasMoreApps = appsCurrentOffset+NUMBER_OF_APPS_TO_LOAD < maxApps;
                          if (hasMoreApps) {
                              hasMoreApps = {
                                  "query": _query,
                                  "type": _type,
                                  "isExact": isExactMatch
                              };
      
                              Evme.Apps.getElement().classList.add('has-more');
                          } else {
                              Evme.Apps.getElement().classList.remove('has-more');
                          }
                        }
                    });

                    if (iconsResponse) {
                        iconsCachedFromLastRequest = iconsResponse.cached;
                    }
                }
            }

            Evme.Searchbar.endRequest();
            
            requestSearch = null;
            
            return true;
        }

        this.getBackgroundImage = function getBackgroundImage(options) {
            var query = options.query,
                type = options.type,
                source = options.source,
                index = options.index,
                exact = options.exact,
                
                queryInSearchbar = Evme.Searchbar.getValue();

            if (query === lastQueryForImage) {
                return;
            }
            
            if (queryInSearchbar.length < MINIMUM_LETTERS_TO_SEARCH) {
              return;
            }

            setTimeoutForShowingDefaultImage();

            requestImage && requestImage.abort && requestImage.abort();
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
            if (!requestImage) {
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
                requestAutocomplete = true;
                getAutocompleteComplete(autocompleteCache[query], query);
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
                requestAutocomplete = null;
            });
        };

        function getAutocompleteComplete(items, querySentWith) {
            if (!requestAutocomplete) {
                return;
            }
            
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
            if (hasMoreApps && !requestSearch) {
                Evme.Apps.More.show();
                Searcher.nextAppsPage(hasMoreApps.query, hasMoreApps.type, hasMoreApps.isExact);
            }
        };

        this.empty = function empty(){
            Searcher.cancelRequests();
            Evme.Apps.clear();
            resetLastSearch();
            lastQueryForImage = '';
            installedAppsQuery = '';

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

        this.searchAgain = function searchAgain(source, query) {
            Searcher.cancelRequests();

            var _query = query || lastSearch.query || Evme.Searchbar.getValue(),
                _source = source || lastSearch.source,
                _type = lastSearch.type,
                _offset = lastSearch.offset;

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
                Evme.Searchbar.setValue(query, false, true);

                if (lastSearch.query != query || lastSearch.type != type || !lastSearch.exact) {
                    resetLastSearch();

                    if (isGetAllAppsForPage && offset) {
                        NUMBER_OF_APPS_TO_LOAD = offset*1;
                        offset = 0;
                    }

                    Searcher.searchExact(query, source, index, type, offset);
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

            requestSearch && requestSearch.abort && requestSearch.abort();
            window.clearTimeout(timeoutSearchWhileTyping);
            timeoutSearchWhileTyping = window.setTimeout(function onTimeout(){
                Searcher.getApps(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_APPS_SEARCH);

            requestImage && requestImage.abort && requestImage.abort();
            window.clearTimeout(timeoutSearchImageWhileTyping);
            timeoutSearchImageWhileTyping = window.setTimeout(function onTimeout(){
                Searcher.getBackgroundImage(searchOptions);
            }, TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH);
        };

        this.cancelRequests = function cancelRequests() {
            cancelSearch();
            cancelAutocomplete();

            Searcher.clearTimeoutForShowingDefaultImage();
            window.clearTimeout(timeoutSearchImageWhileTyping);
            requestImage && requestImage.abort && requestImage.abort();
            requestImage = null;
            
            requestIcons && requestIcons.abort && requestIcons.abort();
            requestIcons = null;
        };

        function cancelSearch() {
            window.clearTimeout(timeoutShowAppsLoading);
            window.clearTimeout(timeoutSearchWhileTyping);
            window.clearTimeout(timeoutSearch);
            requestSearch && requestSearch.abort && requestSearch.abort();
            requestSearch = null;
            Evme.Apps.hideLoading();
        };

        function cancelAutocomplete() {
            window.clearTimeout(timeoutAutocomplete);
            requestAutocomplete && requestAutocomplete.abort && requestAutocomplete.abort();
            requestAutocomplete = null;
        };

        this.setLastQuery = function setLastQuery() {
            Evme.Searchbar.setValue(lastSearch.query, false, true);
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
