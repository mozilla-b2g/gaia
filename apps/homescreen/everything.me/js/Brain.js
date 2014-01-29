'use strict';

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
      isActive = false,
      DEFAULT_NUMBER_OF_APPS_TO_LOAD = Evme.Config.numberOfAppsToLoad,
      NUMBER_OF_APPS_TO_LOAD_IN_COLLECTION = 16,
      NUMBER_OF_APPS_TO_LOAD = 'FROM CONFIG',
      TIME_BEFORE_INVOKING_HASH_CHANGE = 200,
      MINIMUM_LETTERS_TO_SEARCH = 2,
      SEARCH_SOURCES = {},
      PAGEVIEW_SOURCES = {},

      TIMEOUT_BEFORE_REQUESTING_APPS_AGAIN = 500,
      TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE = 3000,
      TIMEOUT_BEFORE_SHOWING_HELPER = 3000,
      TIMEOUT_BEFORE_RENDERING_AC = 300,
      TIMEOUT_BEFORE_RUNNING_APPS_SEARCH = 600,
      TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH = 800,
      TIMEOUT_BEFORE_AUTO_RENDERING_MORE_APPS = 200,

      CLASS_WHEN_EVME_READY = 'evme-ready',
      CLASS_WHEN_HAS_QUERY = 'evme-has-query',
      CLASS_WHEN_COLLECTION_VISIBLE = 'evme-collection-visible',
      CLASS_WHEN_LOADING_SHORTCUTS_SUGGESTIONS =
                                            'evme-suggest-collections-loading',
      CLASS_WHEN_SAVING_TO_HOMESCREEN = 'save-to-homescreen',

      L10N_SYSTEM_ALERT = 'alert',

      // whether to show shortcuts customize on startup or not
      ENABLE_FAVORITES_SHORTCUTS_SCREEN = false,

      QUERY_TYPES = {
        'EXPERIENCE': 'experience',
        'APP': 'app',
        'QUERY': 'query'
      },

      DISPLAY_INSTALLED_APPS = 'FROM_CONFIG',

      currentResultsManager = null,

      timeoutSetUrlAsActive = null,
      timeoutHashChange = null,
      _ = navigator.mozL10n.get,
      mozL10nTranslate = navigator.mozL10n.translate,

      mozSettings = navigator.mozSettings;

  /*
  Init sequense triggered by Core.js
  */
  this.init = function init(options) {
    // bind to events
    Evme.EventHandler && Evme.EventHandler.bind(catchCallback);
    elContainer = Evme.Utils.getContainer();

    initL10nObserver();

    _config = options;

    NUMBER_OF_APPS_TO_LOAD = _config.numberOfAppsToLoad ||
                                                DEFAULT_NUMBER_OF_APPS_TO_LOAD;
    NUMBER_OF_APPS_TO_LOAD_IN_COLLECTION = _config.numberOfAppsToLoad ||
                                          NUMBER_OF_APPS_TO_LOAD_IN_COLLECTION;

    SEARCH_SOURCES = _config.searchSources;
    PAGEVIEW_SOURCES = _config.pageViewSources;

    DISPLAY_INSTALLED_APPS = _config.displayInstalledApps;
  };

  // l10n: create a mutation observer to know when a node was added
  // and check if it needs to be translated
  function initL10nObserver() {
    Array.prototype.forEach.call(Evme.Utils.getScopeElements(),
      function createObserver(elScope) {
        new MutationObserver(Evme.Brain.l10nMutationObserver)
        .observe(elScope, {
          childList: true,
          subtree: true
        });
      });
  }

  // callback for "node added" mutation observer
  // this translates all the new nodes added
  // the mozL10nTranslate method is defined above,
  // it's a reference to the mozilla l10n function
  this.l10nMutationObserver = function onMutationEventNodeAdded(mutations) {
    for (var i = 0, mutation; mutation = mutations[i++];) {
      var children = mutation.addedNodes || [];
      for (var j = 0, node; node = children[j++];) {
        if (node instanceof HTMLElement) {
          node && mozL10nTranslate(node);
        }
      }
    }
  };

  /**
   * main event handling method that catches all the events from the different
   * modules, and calls the appropriate method in Brain
   * @_class (string) : the class that issued the event
   * (Apps, Collection, Helper, etc.)
   * @_event (string) : the event that the class sent
   * @_data (object)  : data sent with the event
   */

   function catchCallback(_class, _event, _data) {
    Evme.Utils.log('Callback: ' + _class + '.' + _event);

    try {
      self[_class] && self[_class][_event] && self[_class][_event](_data || {});
    } catch (ex) {
      Evme.Utils.error('CB Error! ' + ex.message, ex.stack);
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
      document.body.classList.add(CLASS_WHEN_EVME_READY);
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

      Evme.Helper.disableCloseAnimation();
      Evme.Helper.hideTitle();
      if (Evme.Searchbar.getValue() !== '') {
        Evme.Helper.showSuggestions();
      } else {
        Brain.Helper.showDefault();
      }
    };

    // Searchbar blurred. Keyboard hides.
    this.blur = function blur(data) {
      // Gaia bug workaround because of this
      // http://b2g.everything.me/tests/input-blur.html
      if (data && data.e && data.e.stopPropagation) {
        data.e.stopPropagation();
      }

      var didClickApp = false,
      elClicked = data && data.e && data.e.explicitOriginalTarget;
      if (elClicked) {
        for (var elParent = elClicked.parentNode; elParent;
                                              elParent = elParent.parentNode) {
          if (elParent.classList && elParent.classList.contains('evme-apps')) {
            didClickApp = true;
            break;
          }
        }
      }

      Evme.Utils.setKeyboardVisibility(false);
      self.setEmptyClass();

      var searchbarValue = Evme.Searchbar.getValue();
      if (searchbarValue === '') {
        Evme.Helper.setTitle();
        Evme.Helper.showTitle();
      } else if (didClickApp) {
        Evme.Searchbar.setValue(searchbarValue);
        Evme.Helper.setTitle(searchbarValue);
        Evme.Helper.showTitle();
      }

      if (!didClickApp && Evme.shouldSearchOnInputBlur) {
        window.clearTimeout(timeoutBlur);
        timeoutBlur = window.setTimeout(function autoReturn() {
          self.returnPressed(true);
        }, TIMEOUT_BEFORE_RUNNING_BLUR);
      }
    };

    this.onfocus = this.focus;
    this.onblur = this.blur;

    // Searchbar value is empty
    this.empty = function empty(data) {
      Searcher.cancelRequests();
      self.emptySource = (data && data.pageviewSource) ||
              (data.sourceObjectName === 'Searchbar' && PAGEVIEW_SOURCES.CLEAR);
      Searcher.empty();

      self.setEmptyClass();

      Evme.DoATAPI.cancelQueue();
      Evme.ConnectionMessage.hide();
    };

    // Searchbar was cleared
    this.clear = function clear(e) {
      Searcher.cancelRequests();
      Evme.SearchResults.clear();
      Evme.Helper.setTitle();
      Brain.Helper.showDefault();
    };

    // Keyboard action key ("search") pressed
    this.returnPressed = function returnPressed(isFromBlur) {
      var query = Evme.Searchbar.getValue();
      isFromBlur = isFromBlur === true;

      if (query) {
        Searcher.searchExactFromOutside(query, SEARCH_SOURCES.RETURN_KEY);
      }
    };

    // toggle classname when searchbar is empty
    this.setEmptyClass = function setEmptyClass() {
      var query = Evme.Searchbar.getValue();
      if (!query) {
        elContainer.classList.add('empty-query');
        document.body.classList.remove(CLASS_WHEN_HAS_QUERY);
      } else {
        elContainer.classList.remove('empty-query');
        document.body.classList.add(CLASS_WHEN_HAS_QUERY);
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
        firstSuggestion = suggestions[0].replace(/[\[\]]/g, '');

      if (typedQuery === suggestionsQuery) {
        Searcher.searchExactAsYouType(firstSuggestion, typedQuery);
      }
    };
  };

  // modules/SearchHistory/
  this.SearchHistory = new function SearchHistory() {

    // items were loaded from the cache
    this.populate = function populate() {
      Evme.Brain.Helper.showDefault();
    };
  };

  // modules/Helper/
  this.Helper = new function Helper() {
    var self = this,
        cleared = false,
        refineQueryShown = '',
        flashCounter = 0,
        previousFirstSuggestion = '',
        SEARCHES_BEFORE_FLASHING_HELPER = 4,
        TIMEOUT_ANDROID_BEFORE_HELPER_CLICK = 500,
        sourcesMap;

    // Helper module init
    this.init = function init(data) {
      sourcesMap = {
        'suggestions': SEARCH_SOURCES.SUGGESTION,
        'didyoumean': SEARCH_SOURCES.SPELLING,
        'refine': SEARCH_SOURCES.REFINE,
        'history': SEARCH_SOURCES.HISTORY
      };
    };

    // items loaded
    this.load = function load(data) {
      refineQueryShown = '';
    };

    // helper item was selected
    this.click = function click(data) {
      var query = data.value,
        index = data.index,
        source = data.source || 'suggestions',
        type = data.type;

      if (query == '.') {
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

    // Save (bookmark) a search as a collection on home screen
    this.saveSearch = function saveSearch(data) {
      var extraIconsData = Evme.SearchResults.getCloudResultsIconData(),
        query = Evme.Searchbar.getValue();

      Evme.Collection.create({
        'query': query,
        'extraIconsData': extraIconsData,
        'callback': function onSave() {
          data.callback && data.callback();
          EvmeManager.onAppSavedToHomescreen(query);
        }
      });
    };

    this.unsaveSearch = function unsaveSearch(data) {
      Evme.Collection.remove(data.collectionId, {'callback': data.callback});
    };

    // slide items in
    this.animateDefault = function animateDefault() {
      Evme.Helper.animateLeft(function onAnimationComplete() {
        self.showDefault();
        Evme.Helper.animateFromRight();
      });
    };

    // transition to default items
    this.showDefault = function showDefault() {
      Evme.BackgroundImage.loadDefault();

      if (Evme.Searchbar.getValue() == '' && !Evme.Utils.isKeyboardVisible) {
        Evme.Helper.setTitle();
        Evme.Helper.showTitle();
      } else {
        self.loadHistory();
      }
    };

    // transition to history items
    this.animateIntoHistory = function animateIntoHistory(history) {
      if (!history || history.length > 0) {
        Evme.Helper.animateLeft(function onAnimationComplete() {
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
        for (var i = 0, l = history.length; i < l; i++) {
          items.push({
            'id': history[i].type,
            'type': history[i].type,
            'name': history[i].query
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
          'query': query
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

      Evme.Helper.getList().classList.remove('default');

      if (type !== 'refine') {
        refineQueryShown = '';
      }

      switch (type) {
        case '':
          var history = Evme.SearchHistory.get() || [];
          if (history && history.length > 0) {
            Evme.Helper.addLink('history-link', function onLinkAdded() {
              self.animateIntoHistory(history);
            });
          }
          break;
        case 'refine':
          if (refineQueryShown == Searcher.getDisplayedQuery()) {
            if (items.length == 1) {
              Evme.Helper.addText('no-refine');
            }

            Evme.Helper.addLink('dismiss', didyoumeanClick);
          }
          break;

        case 'didyoumean':
          Evme.Helper.addLink('dismiss', didyoumeanClick);
          break;

        case 'history':
          Evme.Helper.addLink('history-clear', function historyclearClick(e) {
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

      setTimeout(Evme.Utils.isKeyboardVisible ?
        Evme.Helper.showSuggestions : Evme.Helper.showTitle,
                                          TIMEOUT_ANDROID_BEFORE_HELPER_CLICK);
    }
  };

  // modules/Location/
  this.Location = new function Location() {
    var self = this,
      CLASS_REQUESTING = 'requesting-location';

    // Location is being requested
    this.request = function request() {
      elContainer.classList.add(CLASS_REQUESTING);
    };

    // location retrieved successfully
    this.success = function success(data) {
      elContainer.classList.remove(CLASS_REQUESTING);

      var coords = data && data.position && data.position.coords,
        lat = coords && coords.latitude,
        lon = coords && coords.longitude;

      if (lat && lon) {
        Evme.DoATAPI.setLocation(lat, lon);
      }
    };

    // location request error has occured
    this.error = function error(data) {
      elContainer.classList.remove(CLASS_REQUESTING);

      var s = [];
      for (var k in data) {
        s.push(k + ': ' + data[k]);
      }
      Evme.Utils.log('{' + s.join('},{') + '}');
    };
  };

  // modules/Results/ResultManager
  this.ResultManager = new function ResultManager() {
    // get missing icons
    this.requestMissingIcons = function requestMissingIcons(ids) {
      var format = Evme.Utils.ICONS_FORMATS.Large;

      requestIcons = Evme.DoATAPI.icons({
        'ids': ids.join(','),
        'iconFormat': format
      }, function onSuccess(data) {
        var icons = data.response || [];
        if (icons.length) {
          currentResultsManager && currentResultsManager.cbMissingIcons(icons);
          Evme.IconManager.addIcons(icons, format);
        }
      });
    };
  };

  // modules/Results/ResultManager instance
  this.SearchResults = new function SearchResults() {
    var bShouldGetHighResIcons = false;

    // init sequence ended
    this.init = function init() {
      bShouldGetHighResIcons =
                Evme.Utils.getIconsFormat() == Evme.Utils.ICONS_FORMATS.Large;
      currentResultsManager = Evme.SearchResults;
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
      var hadApps = Evme.SearchResults.clear();
      if (!hadApps) {
        return false;
      }

      Evme.Searchbar.setValue('', true);
      return true;
    };
  };

  // modules/Results/ResultManager instance
  this.CollectionResults = new function CollectionResults() {
    // propogate events to Collection
    // TODO: this is temporary.
    this.scrollTop = function scrollTop() {
      Evme.EventHandler.trigger('Collection', 'scrollTop');
    };

    this.scrollBottom = function scrollBottom() {
      Evme.EventHandler.trigger('Collection', 'scrollBottom');
    };
  };

  this.InstalledAppsService = new function InstalledAppsService() {
    // get app info from API
    this.requestAppsInfo = function getAppsInfo(guids) {
      Evme.DoATAPI.appNativeInfo({
        'guids': guids
      }, function onSuccess(response) {
        var appsInfo = response && response.response;
        if (appsInfo) {
          Evme.InstalledAppsService.requestAppsInfoCb(appsInfo);
        }
      });
    };

    this.queryIndexUpdated = function queryIndexUpdated() {
      // update the results only if search is open
      var searchValue = Evme.Searchbar.getValue();
      if (searchValue && currentResultsManager &&
            currentResultsManager === Evme.SearchResults) {
        Evme.SearchResults.onNewQuery({
          'query': searchValue
        });
      }

      Evme.Collection.onQueryIndexUpdated();
    };
  };

  // modules/Apps/
  this.Result = new function Result() {
    var self = this,
        NAME = 'Result',
        isKeyboardOpenWhenClicking = false,
        loadingApp = null,
        loadingAppAnalyticsData,
        loadingAppId = false;

    var STORAGE_KEY_CLOSE_WHEN_RETURNING = 'needsToCloseKeyboard';

    var cloudAppMenu = document.querySelector('.cloud-app-actions'),
      actionsButtons = Evme.$('button', cloudAppMenu),
      currentHoldData = null;

    for (var i = 0, button; button = actionsButtons[i++];) {
      button.addEventListener('click', function cloudAppAction(e) {
        if (this.dataset.action === 'pin') {
          pinToCollection(currentHoldData);
        } else if (this.dataset.action === 'save') {
          saveToHomescreen(currentHoldData);
        }
        closeCloudAppMenu();
      });
    }

    // app pressed and held
    this.hold = function hold(data) {
      currentHoldData = data;

      // in collection
      if (Evme.Collection.isOpen()) {
        if (data.app.cfg.isStatic === true) {
          Evme.Collection.toggleEditMode(true);
          LazyLoader.load([
            'style/dragdrop.css',
            'everything.me/js/helpers/dndmanager.js'], function onload() {
              var el = data.el;
              Evme.dndManager.start(el, data.evt, function onRearrage(idx) {
                  Evme.Collection.moveApp(el.dataset.id, idx);
              });
          });
        } else if (data.app.type === Evme.RESULT_TYPE.CLOUD) {
          Evme.Collection.toggleEditMode(false);
          openCloudAppMenu(data);
        }
      }

      // in search
      else {
        if (data.app.type === Evme.RESULT_TYPE.CLOUD) {
          saveToHomescreen(data, true);
        }
      }
    };

    this.remove = function remove(data) {
      var id = data.id;
      if (id) {
        Evme.Collection.removeApp(id);
      }
    };

    function openCloudAppMenu(data) {
      cloudAppMenu.classList.add('show');
    }

    function closeCloudAppMenu(data) {
      cloudAppMenu.classList.remove('show');
    }

    function pinToCollection(data) {
      var cloudResult = Evme.Utils.cloneObject(data.app);
      Evme.Collection.addCloudApp(cloudResult);
    }

    function saveToHomescreen(data, showConfirm) {
      var isBookmarked = EvmeManager.isBookmarked(data.app.getFavLink()),
        classList = data.el.classList;

      if (isBookmarked) {
        classList.add(CLASS_WHEN_SAVING_TO_HOMESCREEN);
        window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'app-install-exists', {
          'name': data.data.name
        }));
        classList.remove(CLASS_WHEN_SAVING_TO_HOMESCREEN);
        return;
      }

      if (showConfirm) {
        var msg = Evme.Utils.l10n(L10N_SYSTEM_ALERT, 'app-install-confirm', {
          'name': data.data.name
        });

        classList.add(CLASS_WHEN_SAVING_TO_HOMESCREEN);
        var saved = window.confirm(msg);
        classList.remove(CLASS_WHEN_SAVING_TO_HOMESCREEN);

        if (!saved) {
          return;
        }
      }

      // first resize the icon to the OS size
      // this includes a 2px padding around the icon
      Evme.Utils.padIconForOS({
        'icon': data.app.getIcon(),
        'resize': true,
        'callback': function onIconResized(icon) {
          // bookmark - add to homescreen
          EvmeManager.addGridItem({
            'originUrl': data.app.getFavLink(),
            'name': data.data.name,
            'icon': icon,
            'useAsyncPanZoom': data.app.isExternal()
          });
        }
      });

      // display system banner
      EvmeManager.onAppSavedToHomescreen(data.data.name);

      // analytics
      Evme.EventHandler.trigger(NAME, 'addToHomeScreen', {
        'id': data.data.id,
        'name': data.data.name
      });
    }

    // app clicked
    this.click = function click(data) {
      if (Evme.Collection.editMode) {
        if (data.app.type === Evme.RESULT_TYPE.INSTALLED) {
          return;
        } else {
          Evme.Collection.toggleEditMode(false);
        }
      }

      data.app.launch();

      if (!Searcher.isLoadingApps() || Evme.Utils.isKeyboardVisible) {
        data.keyboardVisible = Evme.Utils.isKeyboardVisible ? 1 : 0;
        var query = Searcher.getDisplayedQuery();

        data.isCollection = !query;

        if (!Searcher.searchedExact()) {
          if (!data.isCollection) {
            Evme.Storage.set(STORAGE_KEY_CLOSE_WHEN_RETURNING, true);

            Evme.Searchbar.setValue(
              data.app.type === Evme.RESULT_TYPE.INSTALLED ?
              data.data.name : Searcher.getDisplayedQuery(), false, true
            );

            Evme.Searchbar.blur();
            Brain.Searchbar.cancelBlur();
          }

          window.setTimeout(function onTimeout() {
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
        'index': data.index,
        'keyboardVisible': data.keyboardVisible,
        'isMore': data.isMore,
        'appUrl': data.app.getLink(),
        'favUrl': data.app.getFavLink(),
        'name': data.data.name,
        'appType': data.app.type === Evme.RESULT_TYPE.CLOUD ?
                                                      'cloud' : data.app.type,
        'isExternal': loadingApp.isExternal(),
        'query': Searcher.getDisplayedQuery(),
        'source': Searcher.getDisplayedSource(),
        'icon': data.data.icon,
        'entryPoint': data.data.entryPoint
      };

      var appId;
      switch (data.app.type) {
        case Evme.RESULT_TYPE.CLOUD:
          appId = data.appId;
          break;
        case Evme.RESULT_TYPE.WEBLINK:
          appId = 0;
          break;
        default:
          appId = -1;
      }
      loadingAppAnalyticsData.id = appId;

      if (currentResultsManager) {
        var grid = currentResultsManager.getResultGridData(data.app);
        loadingAppAnalyticsData.totalRows = grid.rows;
        loadingAppAnalyticsData.totalCols = grid.cols;
        loadingAppAnalyticsData.rowIndex = grid.rowIndex;
        loadingAppAnalyticsData.colIndex = grid.colIndex;
      }
      Evme.EventHandler.trigger('Core', 'redirectedToApp',
                                                      loadingAppAnalyticsData);

      setTimeout(returnFromOutside, 2000);
    };

    function updateLoadingAppData(apps) {
      for (var i = 0; i < apps.length; i++) {
        if (apps[i].id == loadingAppId) {
          loadingApp.update(apps[i]);
          loadingAppAnalyticsData.appUrl = apps[i].appUrl;
          break;
        }
      }
    }

    // returned from opened app

    function returnFromOutside() {
      if (loadingApp) {
        loadingApp = null;

        loadingAppAnalyticsData = null;
        loadingAppId = false;

        Searcher.clearTimeoutForShowingDefaultImage();
        Evme.$remove('#loading-app');
        Evme.BackgroundImage.cancelFullScreenFade();
        elContainer.classList.remove('loading-app');

        Evme.Storage.get(STORAGE_KEY_CLOSE_WHEN_RETURNING,
          function storageGot(value) {
            if (value) {
              Searcher.searchAgain(null, Evme.Searchbar.getValue());
            }

            Evme.Storage.remove(STORAGE_KEY_CLOSE_WHEN_RETURNING);
          });

        Evme.EventHandler.trigger('Core', 'returnedFromApp');
      }
    }

    this.cancel = function app_cancel() {
      returnFromOutside();
    };
  };

  // modules/BackgroundImage/
  this.BackgroundImage = new function BackgroundImage() {
    // show
    this.showFullScreen = function showFullScreen() {
      elContainer.classList.add('fullscreen-bgimage');
    };

    // hide
    this.hideFullScreen = function hideFullScreen() {
      elContainer.classList.remove('fullscreen-bgimage');
    };

    this.updated = function updated(data) {
      if (data && data.image) {
        Evme.SearchResults.changeFadeOnScroll(true);
      }
    };

    this.removed = function removed() {
      Evme.SearchResults.changeFadeOnScroll(false);
    };

    this.setWallpaper = function setWallpaper(data) {
      if (confirm(Evme.Utils.l10n('alert', 'save-wallpaper'))) {
      Evme.Utils.sendToOS(Evme.Utils.OSMessages.SET_WALLPAPER, data.image);
      }
    };
  };

  // modules/Collection/
  this.Collection = new function Collection() {
    var self = this,
        appsPaging = null,
        requestCollectionApps = null,
        requestCollectionImage = null,
        timeoutShowAppsLoading = null;

    // starting to show the collection
    this.beforeShow = function beforeShow(data) {
      PaginationBar.hide();

      window.setTimeout(function() {
        var elAffectedByCollection = document.getElementById('icongrid');
        elAffectedByCollection.classList.add(CLASS_WHEN_COLLECTION_VISIBLE);
      }, 50);
    };

    // the collection is shown
    this.show = function show(data) {
      // this timeout gives the Static apps time to render
      // without the clouds apps have a chance to render with the static apps
      // which overloads the render engine
      window.setTimeout(loadAppsIntoCollection, 300);
      currentResultsManager = Evme.CollectionResults;
    };

    // starting to hide the collection
    this.beforeHide = function beforeHide() {
      window.setTimeout(function() {
        var elAffectedByCollection = document.getElementById('icongrid');
        elAffectedByCollection.classList.remove(CLASS_WHEN_COLLECTION_VISIBLE);
      }, 140);
    };

    // the collection is hidden
    this.hide = function hide() {
      PaginationBar.show();
      Evme.Brain.Collection.cancelRequests();
      Evme.ConnectionMessage.hide();

      currentResultsManager = Evme.SearchResults;

      Evme.dndManager && Evme.dndManager.stop();
    };

    // cancel the current outgoing collection requests
    this.cancelRequests = function cancelRequests() {
      Evme.CollectionResults.APIData.onRequestCanceled();
      requestCollectionApps &&
                  requestCollectionApps.abort && requestCollectionApps.abort();

      requestCollectionImage &&
                requestCollectionImage.abort && requestCollectionImage.abort();
    };

    // a collection was renamed
    this.rename = function rename(data) {
      loadAppsIntoCollection();
    };

    // load the cloud apps into the collection

    function loadAppsIntoCollection() {
      if (!Evme.Collection.isOpen()) { return; }

      var experienceId = Evme.Collection.getExperience(),
        query = Evme.Collection.getQuery(),
        iconsFormat = Evme.Utils.getIconsFormat();

      appsPaging = {
        'offset': 0,
        'limit': NUMBER_OF_APPS_TO_LOAD_IN_COLLECTION
      };

      Evme.CollectionResults.APIData.onRequestSent();

      requestCollectionApps = Evme.DoATAPI.search({
        'query': experienceId ? '' : query,
        'experienceId': experienceId,
        'feature': SEARCH_SOURCES.SHORTCUT_COLLECTION,
        'exact': true,
        'spellcheck': false,
        'suggest': false,
        'limit': appsPaging.limit,
        'first': appsPaging.offset,
        'iconFormat': iconsFormat
      }, function onSuccess(data) {
        Evme.CollectionResults.APIData.onResponseRecieved(data.response);

        requestCollectionApps = null;

        Evme.Location.updateIfNeeded();
      });

      loadBGImage();
    }

    function loadBGImage() {
      if (!Evme.Collection.isOpen()) { return; }
      if (Evme.Collection.userSetBg()) { return; }

      var query = Evme.Collection.getQuery();

      requestCollectionImage = Evme.DoATAPI.bgimage({
        'query': query,
        'feature': SEARCH_SOURCES.SHORTCUT_COLLECTION,
        'exact': true,
        'width': Evme.__config.bgImageSize[0],
        'height': Evme.__config.bgImageSize[1]
      }, function onSuccess(data) {
        Evme.Collection.setBackground({
          'image': Evme.Utils.formatImageData(data.response.image),
          'query': query,
          'source': data.response.source,
          'setByUser': false
        });

        requestCollectionImage = null;
      });
    }

    // app list has scrolled to top
    this.scrollTop = function scrollTop() {
      Evme.Collection.showFullscreen();

      // TODO: FIXME This is temporary.
      // BackgroundImage should be an instance used in parallel to
      // ResultsManager
      Evme.BackgroundImage.cancelFullScreenFade();
    };

    // load more apps in collection
    this.scrollBottom = function scrollBottom() {
      if (!Evme.Collection.isOpen()) { return; }

      appsPaging.offset += appsPaging.limit;

      if (requestCollectionApps) {
        return;
      }

      Evme.CollectionResults.APIData.onRequestSent();

      var experienceId = Evme.Collection.getExperience(),
        query = Evme.Collection.getQuery(),
        iconsFormat = Evme.Utils.getIconsFormat();

      requestCollectionApps = Evme.DoATAPI.search({
        'query': experienceId ? '' : query,
        'experienceId': experienceId,
        'feature': SEARCH_SOURCES.SHORTCUT_COLLECTION,
        'exact': true,
        'spellcheck': false,
        'suggest': false,
        'limit': appsPaging.limit,
        'first': appsPaging.offset,
        'iconFormat': iconsFormat
      }, function onSuccess(data) {
        Evme.CollectionResults.APIData.onResponseRecieved(data.response);

        requestCollectionApps = null;
      });
    };
  };

  // modules/CollectionsSuggest/
  this.CollectionsSuggest = new function CollectionsSuggest() {
    var self = this,
      isRequesting = false,
      isFirstShow = true,
      requestSuggest = null,
      isOpen = false,
      SUGGESTIONS_STORAGE_KEY = 'collection-suggestion-list';

    // purge cached suggestions list when changing OS language
    if (mozSettings) {
      mozSettings.addObserver('language.current', function onLanguageChange(e) {
        Evme.Storage.set(SUGGESTIONS_STORAGE_KEY, null);
      });
    }

    this.show = function show() {
      isOpen = true;
    };

    this.hide = function hide() {
      isOpen = false;
    };

    this.loadingShow = function loadingShow() {
      document.body.classList.add(CLASS_WHEN_LOADING_SHORTCUTS_SUGGESTIONS);
      window.dispatchEvent(new CustomEvent('CollectionSuggestLoadingShow'));
    };

    this.loadingHide = function loadingHide() {
      document.body.classList.remove(CLASS_WHEN_LOADING_SHORTCUTS_SUGGESTIONS);
      window.dispatchEvent(new CustomEvent('CollectionSuggestLoadingHide'));
    };

    this.hideIfOpen = function hideIfOpen() {
      if (isOpen) {
        Evme.CollectionsSuggest.hide();
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
      var shortcuts = data.shortcuts || [];
      var queries = Evme.Utils.pluck(shortcuts, 'query');
      if (queries.length > 0) {
        addCollections(queries);
      }
    };

    this.custom = function custom(data) {
      if (!data || !data.query) {
        return;
      }
      var query = data.query;
      addCollections(query);
    };

    // prepare and show
    this.showUI = function showUI() {
      if (isRequesting) {
        return;
      }

      isRequesting = true;

      Evme.Utils.isOnline(function(isOnline) {
        if (isOnline) {
          Evme.CollectionsSuggest.Loading.show();

          var existingCollectionsQueries = EvmeManager.getCollectionNames();

          // load suggested shortcuts from API
          requestSuggest = Evme.DoATAPI.Shortcuts.suggest({
            'existing': existingCollectionsQueries
          }, function onSuccess(data) {
            showSuggestions(data);
            Evme.Storage.set(SUGGESTIONS_STORAGE_KEY, data);
          });
        }
        else {
          window.dispatchEvent(new CustomEvent('CollectionSuggestOffline'));
          window.setTimeout(function() {
            isRequesting = false;
          }, 200);

          // show cached suggestions list if available
          Evme.Storage.get(SUGGESTIONS_STORAGE_KEY, function onGet(cachedData) {
            if (cachedData) {
              // filter out suggestions that were created
              var gridQueries = EvmeManager.getCollectionNames(true);
              var filteredShortcuts =
                cachedData.response.shortcuts.filter(function filter(shortcut) {
                  var query = shortcut.query;
                  return query ?
                          gridQueries.indexOf(query.toLowerCase()) < 0 : false;
                });

              cachedData.response.shortcuts = filteredShortcuts;
              showSuggestions(cachedData);
            } else {
              window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT,
                                            'offline-smart-collections-more'));
            }
          });
        }
      });
    };

    // cancel button clicked
    this.loadingCancel = function loadingCancel(data) {
      data && data.e.preventDefault();
      data && data.e.stopPropagation();

      requestSuggest && requestSuggest.abort && requestSuggest.abort();
      window.setTimeout(Evme.CollectionsSuggest.Loading.hide, 50);
      isRequesting = false;
    };

    function showSuggestions(data) {
      var suggestedShortcuts = data.response.shortcuts || [],
          icons = data.response.icons || {},
          locale = data.response.locale;

      if (!isRequesting) {
        return;
      }

      isFirstShow = false;
      isRequesting = false;

      if (suggestedShortcuts.length === 0) {
        window.alert(Evme.Utils.l10n(L10N_SYSTEM_ALERT,
                                      'no-more-smart-collections'));
        Evme.CollectionsSuggest.Loading.hide();
      } else {
        Evme.CollectionsSuggest.load({
          'shortcuts': suggestedShortcuts,
          'icons': icons,
          'locale': locale
        });

        Evme.CollectionsSuggest.show();
        // setting timeout to give the select box enough time to show
        // otherwise there's visible flickering
        window.setTimeout(Evme.CollectionsSuggest.Loading.hide, 300);
      }
    };

    // this gets a list of queries and creates collections
    function addCollections(queries) {
      var createdSettings = [];

      if (!Array.isArray(queries)) {
        queries = [queries];
      }

      for (var i = 0, query; query = queries[i++]; ) {
        Evme.Collection.create({
          'query': query,
          'gridPageOffset': EvmeManager.currentPageOffset,
          'callback': function onCreate(collectionSettings) {
            createdSettings.push(collectionSettings);
            if (createdSettings.length === queries.length) {
              getCollectionIcons(createdSettings);
            }
          }
        });
      }
    };

    function getCollectionIcons(collectionSettingsArray) {
      var queriesMap = {};

      for (var i = 0, settings; settings = collectionSettingsArray[i++]; ) {
        queriesMap[settings.query] = settings;
      }

      var queries = Object.keys(queriesMap);

      Evme.DoATAPI.Shortcuts.get({
        'queries': JSON.stringify(queries),
        '_NOCACHE': true
      }, function onShortcutsGet(response) {
        var shortcuts = response.response.shortcuts,
            iconsMap = response.response.icons;

        // cached icons might be missing in the server's response
        var missingIconIds = [];
        for (var i = 0, shortcut; shortcut = shortcuts[i++];) {
          var appIds = shortcut.appIds;
          for (var j = 0, appId; appId = appIds[j++]; ) {
            if (missingIconIds.indexOf(appId) > -1) {
              continue;
            } else if (!iconsMap[appId]) {
              missingIconIds.push(appId);
            }
          }
        }

        if (missingIconIds.length) {
          // try to get missing icons from cache
          Evme.IconManager.getBatch(missingIconIds,
            function onIcons(cachedIconsMap) {
              if (cachedIconsMap) {
                for (var iconId in cachedIconsMap) {
                  iconsMap[iconId] = cachedIconsMap[iconId];
                }
              }
              updateCollectionsIcons();
            });
        } else {
          updateCollectionsIcons();
        }

        function updateCollectionsIcons() {
          Evme.Utils.roundIconsMap(iconsMap,
            function onRoundedIcons(roundedIconsMap) {
              for (var i = 0, shortcut; shortcut = shortcuts[i++];) {
                var extraIconsData =
                  shortcut.appIds.map(function wrapIcon(appId) {
                    return {'id': appId, 'icon': roundedIconsMap[appId]};
                  });

                // update the matching Collection's icon
                var collectionSettings = queriesMap[shortcut.query];
                Evme.Collection.update(collectionSettings, {
                  'extraIconsData': extraIconsData
                });
              }
            });
        }

      });
    }
  };

  // modules/Features/Features.js
  this.Features = new function Features() {
    // called when a feature state is changed
    this.set = function set(data) {
      var featureName = data.featureName,
      isEnabled = data.newValue;

      if (!isEnabled) {
        if (featureName === 'typingApps') {
          Searcher.cancelSearch();
          Evme.SearchResults.clear();

          // if there are no icons, we also disable images
          // no point in showing background image without apps
          Evme.Features.disable('typingImage');
        }
        if (featureName === 'typingImage') {
          Searcher.cancelImageSearch();
          Evme.BackgroundImage.loadDefault();
        }
      } else {
        if (featureName === 'typingImage') {
          Evme.Features.enable('typingApps');
        }
      }
    };
  };

  // helpers/Utils.Connection
  this.Connection = new function Connection() {
    // upon going online
    this.online = function online() {
      Evme.ConnectionMessage.hide();
      Evme.DoATAPI.backOnline();
    };
  };

  // helpers/IconManager
  this.IconManager = new function IconManager() {
    // icon added to cache
    this.iconAdded = function iconAdded(icon) {
      Evme.DoATAPI.CachedIcons.add(icon);
    };
  };

  // api/DoATAPI.js
  this.DoATAPI = new function DoATAPI() {
    // a request was made to the API
    this.request = function request(data) {
      Evme.Utils.log('DoATAPI.request ' + data.url);
    };

    this.cantSendRequest = function cantSendRequest(data) {
      Searcher.cancelRequests();

      if (currentResultsManager && data.method === 'Search/apps') {
        Evme.Utils.isOnline(function isOnlineCallback(isOnline) {
          // only show the connection message if we're offline
          // needed since there are scenarios where the request wasn't sent
          // even though we ARE online (like expired session for example)
          if (isOnline) {
            return;
          }

          var query =
            Evme.Searchbar.getElement().value ||
            Evme.Collection.getQuery() ||
            '';
          var textKey =
            currentResultsManager.hasResults() ? 'apps-has-installed' : 'apps';

          Evme.ConnectionMessage.show(textKey, {
            'query': query
          });
        });
      }
    };

    // an API callback method had en error
    this.clientError = function onAPIClientError(data) {
      Evme.Utils.error('API Client Error: ' + data.exception.message,
                                                          data.exception.stack);
    };

    // an API callback method had en error
    this.error = function onAPIError(data) {
      Evme.Utils.error('API Server Error: ' + JSON.stringify(data.response));
    };

    // user location was updated
    this.setLocation = function setLocation(data) {
      // TODO in the future, we might want to refresh results
      // to reflect accurate location.
      // but for now only the next request will use the location
    };
  };

  // Searcher object to handle all search events
  this.Searcher = new function _Searcher() {
    var appsCurrentOffset = 0,
        lastSearch = {},
        lastQueryForImage = '',
        hasMoreApps = false,
        autocompleteCache = {},
        lastRequestAppsTime = 0,

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

    function resetLastSearch(bKeepImageQuery) {
      lastSearch = {
        'query': '',
        'exact': false,
        'type': '',
        'offset': false,
        'source': ''
      };

      if (!bKeepImageQuery) {
        lastQueryForImage = '';
      }
    }
    resetLastSearch();

    this.isLoadingApps = function isLoadingApps() {
      return requestSearch;
    };

    this.getApps = function getApps(options) {
      var query = options.query,
          source = options.source;

      // always perfom local search
      Evme.SearchResults.onNewQuery({
        'query': query
      });

      // exit if search triggered by typing and this feature is disabled
      if (source === SEARCH_SOURCES.TYPING &&
          !Evme.Features.isOn('typingApps')) {
        return;
      }

      // perform search
      var type = options.type,
        index = options.index,
        reloadingIcons = options.reloadingIcons,
        exact = options.exact || false,
        iconsFormat = options.iconsFormat,
        offset = options.offset,
        onlyDidYouMean = options.onlyDidYouMean,
        callback = options.callback || function() {};

      Evme.Searchbar.startRequest();

      var removeSession = reloadingIcons;
      var prevQuery = removeSession ? '' : lastSearch.query;
      var getSpelling =
        (source !== SEARCH_SOURCES.SUGGESTION &&
         source !== SEARCH_SOURCES.REFINE &&
         source !== SEARCH_SOURCES.SPELLING);

      if (exact && appsCurrentOffset === 0) {
        window.clearTimeout(timeoutHideHelper);

        if (!onlyDidYouMean) {
          if (!options.automaticSearch) {
            var urlOffset = appsCurrentOffset + NUMBER_OF_APPS_TO_LOAD;
            if (urlOffset == NUMBER_OF_APPS_TO_LOAD &&
                NUMBER_OF_APPS_TO_LOAD == DEFAULT_NUMBER_OF_APPS_TO_LOAD) {
              urlOffset = 0;
            }

            Evme.SearchHistory.save(query, type);
          }

          timeoutHideHelper = window.setTimeout(Evme.Helper.showTitle,
                                                TIMEOUT_BEFORE_SHOWING_HELPER);
        }
      }

      iconsFormat = Evme.Utils.getIconsFormat();

      // override icons format according to connection
      if (!Evme.Features.isOn('iconQuality')) {
        iconsFormat = Evme.Utils.ICONS_FORMATS.Small;
        Evme.Features.startTimingFeature('iconQuality', Evme.Features.ENABLE);
      } else {
        Evme.Features.startTimingFeature('iconQuality', Evme.Features.DISABLE);
      }

      options.iconsFormat = iconsFormat;

      Searcher.cancelSearch();

      // set timer for progress indicator
      Evme.SearchResults.APIData.onRequestSent();

      if (!exact && query.length < MINIMUM_LETTERS_TO_SEARCH) {
        Searcher.cancelRequests();
        return;
      }

      var requestAppsTime = Date.now();
        lastRequestAppsTime = requestAppsTime;

      requestSearch = Evme.DoATAPI.search({
        'query': query,
        'typeHint': type,
        'index': index,
        'feature': source,
        'exact': exact,
        'spellcheck': getSpelling,
        'suggest': !onlyDidYouMean,
        'limit': NUMBER_OF_APPS_TO_LOAD,
        'first': appsCurrentOffset,
        'iconFormat': iconsFormat,
        'prevQuery': prevQuery
      }, function onSuccess(data) {
        getAppsComplete(data, options, requestAppsTime);
        requestSearch = null;

        // only try to refresh location of
        // it's a "real" search- with keyboard down
        if (exact && appsCurrentOffset === 0 && !Evme.Utils.isKeyboardVisible) {
          Evme.Location.updateIfNeeded();
        }
      }, removeSession);
    };

    function getAppsComplete(data, options, requestAppsTime) {
      if (data.errorCode !== Evme.DoATAPI.ERROR_CODES.SUCCESS) {
        return false;
      }
      if (requestAppsTime < lastRequestAppsTime) {
        return;
      }

      window.clearTimeout(timeoutHideHelper);

      var _query = options.query,
      _type = options.type,
      _source = options.source,
      _index = options.index,
      reloadingIcons = options.reloadingIcons,
      isExactMatch = options.exact,
      iconsFormat = options.iconsFormat,

      // used for searching for exact results if user
      // stopped typing for X seconds
      queryTyped = options.queryTyped,

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

        // searching after a timeout while user it typing
        if (onlyDidYouMean || options.automaticSearch) {
          // show only spelling or disambiguation,
          // and only if the query is the same as what the user typed
          if (query == queryTyped &&
              (spelling.length > 0 || disambig.length > 1)) {
            Evme.Helper.load(queryTyped, query, undefined, spelling, disambig);
            Evme.Helper.hideTitle();
            Evme.Helper.showSpelling();
          }
        } else {
          if (!isMore && !reloadingIcons) {
            Evme.Helper.load(_query, query, suggestions, spelling, disambig);

            if (isExactMatch) {
              if (spelling.length > 0 || disambig.length > 1) {
                Evme.Helper.hideTitle();
                Evme.Helper.showSpelling();
              } else {
                Evme.Helper.showTitle();
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

            Evme.SearchResults.APIData.onResponseRecieved(data.response);

        // if got less apps then requested, assume no more apps
        if (searchResults.paging.limit < NUMBER_OF_APPS_TO_LOAD) {
          hasMoreApps = false;
        } else {
          var maxApps = (searchResults.paging && searchResults.paging.max) ||
                          NUMBER_OF_APPS_TO_LOAD * 2;
          hasMoreApps =
            appsCurrentOffset + searchResults.paging.limit < maxApps;
        }

        if (hasMoreApps) {
          hasMoreApps = {
            'query': _query,
            'type': _type,
            'isExact': isExactMatch
          };
        }
      }
    }

    Evme.Searchbar.endRequest();

      // consider this benchmark only if the response didn't come from the cache
      if (!data._cache) {
        Evme.Features.stopTimingFeature('typingApps', true);
        Evme.Features.stopTimingFeature('iconQuality', true);
      }

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

      requestImage && requestImage.abort && requestImage.abort();
      requestImage = Evme.DoATAPI.bgimage({
        'query': query,
        'typeHint': type,
        'index': index,
        'feature': source,
        'exact': exact,
        'prevQuery': lastQueryForImage,
        'width': Evme.__config.bgImageSize[0],
        'height': Evme.__config.bgImageSize[1]
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

      var query = data.response.completion,
      image = Evme.Utils.formatImageData(data.response.image);

      if (image) {
        lastQueryForImage = query;

        image = {
          'image': image,
          'query': query,
          'source': data.response.source
        };

        Evme.BackgroundImage.update(image);
      }

      Evme.Features.stopTimingFeature('typingImage');
    }

    this.getAutocomplete = function getAutocomplete(query) {
      if (autocompleteCache[query]) {
        getAutocompleteComplete(autocompleteCache[query]);
        return;
      }

      requestAutocomplete = Evme.DoATAPI.suggestions({
        'query': query
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
      timeoutAutocomplete = window.setTimeout(function onTimeout() {
        if (Evme.Utils.isKeyboardVisible && !requestSearch) {
          Evme.Helper.loadSuggestions(items);
          Evme.Helper.showSuggestions(querySentWith);
          requestAutocomplete = null;
        }
      }, TIMEOUT_BEFORE_RENDERING_AC);
    }


    function setTimeoutForShowingDefaultImage() {
      Searcher.clearTimeoutForShowingDefaultImage();
      timeoutShowDefaultImage =
        window.setTimeout(Evme.BackgroundImage.loadDefault,
                            TIMEOUT_BEFORE_SHOWING_DEFAULT_IMAGE);
    }

    this.clearTimeoutForShowingDefaultImage =
      function clearTimeoutForShowingDefaultImage() {
        window.clearTimeout(timeoutShowDefaultImage);
      };

    this.loadMoreApps = function loadMoreApps() {
      if (!requestSearch) {
        Searcher.nextAppsPage(hasMoreApps.query,
                                hasMoreApps.type, hasMoreApps.isExact);
      }
    };

    this.empty = function empty() {
      Searcher.cancelRequests();
      Evme.SearchResults.clear();
      resetLastSearch();
      lastQueryForImage = '';

      if (!Evme.Searchbar.getValue()) {
        Evme.Helper.clear();
      }
    };

    this.nextAppsPage = function nextAppsPage(query, type, exact) {
      appsCurrentOffset += NUMBER_OF_APPS_TO_LOAD;
      lastSearch.offset = appsCurrentOffset;

      Searcher.getApps({
        'query': query,
        'type': type,
        'source': SEARCH_SOURCES.MORE,
        'exact': exact,
        'offset': appsCurrentOffset
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

    this.searchExactFromOutside =
      function searchExactFromOutside(query, source, index, type, callback) {
        !type && (type = '');

        if (query) {
          Evme.Helper.reset();
          Evme.Searchbar.setValue(query, false);

          if (lastSearch.query != query ||
              lastSearch.type != type || !lastSearch.exact) {
            resetLastSearch();

            Searcher.searchExact(query, source, index, type, 0,
                                                              false, callback);
          } else {
            Evme.Helper.enableCloseAnimation();

            Evme.Helper.setTitle(query);
            window.setTimeout(Evme.Helper.showTitle, 50);
          }

          Evme.Searchbar.blur();
          window.setTimeout(function onTimeout() {
            Brain.Searchbar.cancelBlur();
          }, 0);
        }

        Brain.Searchbar.setEmptyClass();
      };

    this.searchExact =
      function searchExact(query, source, index, type, offset,
                                                  automaticSearch, callback) {
        Searcher.cancelRequests();
        appsCurrentOffset = 0;

        if (!automaticSearch) {
          Evme.Searchbar.setValue(query, false, true);
          Evme.Helper.setTitle(query);
        }

        var options = {
          'query': query,
          'type': type,
          'source': source,
          'index': index,
          'exact': true,
          'offset': offset,
          'automaticSearch': automaticSearch,
          'callback': callback
        };

        Evme.Features.startTimingFeature('typingApps', Evme.Features.ENABLE);
        Searcher.getApps(options);

        Evme.Features.startTimingFeature('typingImage', Evme.Features.ENABLE);
        Searcher.getBackgroundImage(options);
      };

    this.searchExactAsYouType =
      function searchExactAsYouType(query, queryTyped) {
        resetLastSearch(true);

        Searcher.cancelSearch();
        appsCurrentOffset = 0;

        var options = {
          'query': query,
          'queryTyped': queryTyped,
          'source': SEARCH_SOURCES.PAUSE,
          'exact': true,
          'offset': 0,
          'onlyDidYouMean': true
        };

        if (Evme.Features.isOn('typingApps')) {
          Evme.Features.startTimingFeature('typingApps', Evme.Features.ENABLE);
        }

        Searcher.getApps(options);

        if (Evme.Features.isOn('typingImage')) {
          Evme.Features.startTimingFeature('typingImage', Evme.Features.ENABLE);
          Searcher.getBackgroundImage(options);
        }
      };

    this.searchAsYouType = function searchAsYouType(query, source) {
      appsCurrentOffset = 0;

      Searcher.getAutocomplete(query);

      var searchOptions = {
        'query': query,
        'source': source
      };

      requestSearch && requestSearch.abort && requestSearch.abort();
      window.clearTimeout(timeoutSearchWhileTyping);
      timeoutSearchWhileTyping = window.setTimeout(function onTimeout() {
        if (Evme.Features.isOn('typingApps')) {
          Evme.Features.startTimingFeature('typingApps', Evme.Features.DISABLE);
        }
        Searcher.getApps(searchOptions);
      }, TIMEOUT_BEFORE_RUNNING_APPS_SEARCH);

      if (Evme.Features.isOn('typingImage')) {
        requestImage && requestImage.abort && requestImage.abort();
        window.clearTimeout(timeoutSearchImageWhileTyping);
        timeoutSearchImageWhileTyping = window.setTimeout(function onTimeout() {
          Evme.Features.startTimingFeature('typingImage',
                                                        Evme.Features.DISABLE);
          Searcher.getBackgroundImage(searchOptions);
        }, TIMEOUT_BEFORE_RUNNING_IMAGE_SEARCH);
      }
    };

    this.cancelRequests = function cancelRequests() {
      Evme.Features.stopTimingFeature('typingApps');
      Evme.Features.stopTimingFeature('typingImage');

      Searcher.cancelSearch();
      cancelAutocomplete();

      Searcher.cancelImageSearch();

      requestIcons && requestIcons.abort && requestIcons.abort();
      requestIcons = null;
    };

    this.cancelImageSearch = function cancelImageSearch() {
      Searcher.clearTimeoutForShowingDefaultImage();
      window.clearTimeout(timeoutSearchImageWhileTyping);
      requestImage && requestImage.abort && requestImage.abort();
      requestImage = null;
    };

    this.cancelSearch = function cancelSearch() {
      Evme.SearchResults.APIData.onRequestCanceled();
      window.clearTimeout(timeoutSearchWhileTyping);
      window.clearTimeout(timeoutSearch);
      requestSearch && requestSearch.abort && requestSearch.abort();
      requestSearch = null;
    };

    function cancelAutocomplete() {
      window.clearTimeout(timeoutAutocomplete);
      requestAutocomplete && requestAutocomplete.abort &&
                                                  requestAutocomplete.abort();
      requestAutocomplete = null;
    }

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
  };
  var Searcher = this.Searcher;
}
