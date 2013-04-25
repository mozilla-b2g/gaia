window.Evme = new function Evme_Core() {
  var NAME = "Core", self = this,
      recalculateHeightRetries = 1,
      TIMEOUT_BEFORE_INIT_SESSION = "FROM CONFIG",
      OPACITY_CHANGE_DURATION = 300,
      head_ts = Date.now(),
      
      timeoutMenuVisiblity = null,
      urlSetManually = false,
      lastHash = '#root',
      currentPage = '',
      
      DEFAULT_HASH = 'root';

  this.PAGES = {
    SHORTCUTS: 'evmePage',
    HOMEPAGE: 'landing-page'
  };

  this.init = function init() {
    data = Evme.__config;
    
    currentPage = self.PAGES.HOMEPAGE;

    var apiHost = Evme.Utils.getUrlParam("apiHost") || data.apiHost;
    apiHost && Evme.api.setHost(apiHost);

    TIMEOUT_BEFORE_INIT_SESSION = data.timeoutBeforeSessionInit;

    Evme.$('#evme-search .header')[0].addEventListener('contextmenu', function longPress(e) {
      e.stopPropagation();
    });

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
      "authCookieName": data.authCookieName
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

  this.goTo = function goTo(url) {
    Evme.Utils.log('goTo: ' + url);
    urlSetManually = true;
    document.location.href = '#' + (url || DEFAULT_HASH);
  };
  
  this.getPage = function getPage() {
    return currentPage;
  };
  
  this.allowContext = function allowContext() {
    if (!Evme.Searchbar.isEmpty() ||
        Evme.Utils.isKeyboardVisible || 
        Evme.Shortcuts.isVisible()) {
      return false;
    }

    return true;
  };

  // this method is called whenever there's a "hashchange" event
  // hashchange event is called when the Home Button is clicked
  // if it returns false- the event will be canceled
  // if it returns true - the event will continue normally to the OS
  this.allowHomeButtonClick = function allowHomeButtonClick(e) {
    var newHash = document.location.hash;

    Evme.Utils.log('Hash Change (' + e.triggeredByPanning + ':' + urlSetManually + '): ' + newHash + '=' + lastHash);

    // if changing to the current hash
    if (newHash === lastHash) {
      urlSetManually = false;
      return false;
    }

    // we change the hash manually, to allow the home button click when still on the landing page
    // so we need to make sure that if the change occured from within the app
    // it won't trigger the OS behavior
    if (urlSetManually) {
      lastHash = newHash;
      urlSetManually = false;
      return false;
    }

    // since "hashchange" also occurs when panning, we first make sure it's from the home button
    if (!e.triggeredByPanning) {
      // modules that are open and need to return to the landing page
      if (Evme.BackgroundImage.closeFullScreen() ||
          Evme.Searchbar.clearIfHasQuery() ||
          Evme.Utils.isKeyboardVisible ||
          Evme.Brain.SmartFolder.closeFullScreen() ||
          Evme.Brain.SmartFolder.closeCurrent() ||
          Evme.Brain.ShortcutsCustomize.hideIfOpen() ||
          Evme.Brain.ShortcutsCustomize.hideIfRequesting() ||
          Evme.Brain.Shortcuts.hideIfEditing()
          ) {

        lastHash = newHash;
        Evme.Searchbar.blur();
  
        return false;
      }
    } else if (lastHash && lastHash !== '#' + DEFAULT_HASH) {
      // when panning, but something is open on our app- change the hash back to ours
      // so when panning back, the home button will still work as expected (close whatever's open)
      urlSetManually = true;
      document.location.href = lastHash;
    }

    lastHash = newHash;
    // allow OS normal behavior
    return true;
  };
  
  this.onShowStart = function onShowStart() {
    Evme.BackgroundImage.restoreOpacity(OPACITY_CHANGE_DURATION);

    if (Evme.Searchbar.isEmpty() && !Evme.Shortcuts.isVisible()) {
      self.showMenu();
    } else {
      self.hideMenu();
    }
  };

  this.onShowEnd = function onShowEnd() {
  };

  this.onHideStart = function onHideStart() {
    Evme.Searchbar.blur();
    Evme.BackgroundImage.changeOpacity(0, OPACITY_CHANGE_DURATION);
    self.showMenu();
  };

  this.onHideEnd = function onHideEnd() {
    Evme.Brain.Shortcuts.doneEdit();
  };
  
  this.showMenu = function showMenu(isInstant) {
    window.clearTimeout(timeoutMenuVisiblity);

    if (isInstant) {
      Evme.Utils.sendToOS(Evme.Utils.OSMessages.SHOW_MENU);
    } else {
      timeoutMenuVisiblity = window.setTimeout(function changemenuvisibility(){
        Evme.Utils.sendToOS(Evme.Utils.OSMessages.SHOW_MENU);
      }, 50);
    }
  };
  this.hideMenu = function hideMenu(isInstant) {
    window.clearTimeout(timeoutMenuVisiblity);

    if (isInstant) {
      Evme.Utils.sendToOS(Evme.Utils.OSMessages.HIDE_MENU);
    } else {
      timeoutMenuVisiblity = window.setTimeout(function changemenuvisibility(){
        Evme.Utils.sendToOS(Evme.Utils.OSMessages.HIDE_MENU);
      }, 50);
    }
  };

  function initObjects(data) {
    Evme.ConnectionMessage.init({
    });

    Evme.Location.init({
      "refreshInterval": data.locationInterval,
      "requestTimeout": data.locationRequestTimeout
    });

    Evme.Shortcuts.init({
      "el": Evme.$("#evme-shortcuts"),
      "elLoading": Evme.$("#shortcuts-loading"),
      "design": data.design.shortcuts,
      "defaultShortcuts": data._defaultShortcuts
    });

    Evme.ShortcutsCustomize.init({
      "elParent": Evme.Utils.getContainer()
    });

    var elSearch = Evme.$('#evme-search');
    Evme.Searchbar.init({
      "el": Evme.$('input', elSearch)[0],
      "elClearButton": Evme.$('.clear', elSearch)[0],
      "elSaveButton": Evme.$('.save', elSearch)[0],
      "elCursor": Evme.$('.cursor', elSearch)[0],
      "elShortcutsButton": Evme.$('.shortcuts', elSearch)[0],
      "timeBeforeEventPause": data.searchbar.timeBeforeEventPause,
      "timeBeforeEventIdle": data.searchbar.timeBeforeEventIdle
    });

    Evme.Helper.init({
      "el": Evme.$("#evme-search .helper")[0]
    });

    Evme.Apps.init({
      "el": Evme.$('#evmeApps'),
      "elHeader": Evme.$("#header"),
      "design": data.design.apps,
      "appHeight": data.apps.appHeight,
      "minHeightForMoreButton": data.minHeightForMoreButton,
      "defaultScreenWidth": {
        "portrait": 320,
        "landscape": 480
      }
    });

    Evme.IconGroup.init({
    });

    Evme.BackgroundImage.init({
      "el": Evme.$("#search-overlay"),
      "elToFade": Evme.$("#evme-search")
    });

    Evme.Banner.init({
    });

    Evme.SearchHistory.init({
      "maxEntries": data.maxHistoryEntries
    });

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

    Evme.EventHandler.trigger(NAME, "init", {"deviceId": Evme.DoATAPI.getDeviceId()});
  }
};
