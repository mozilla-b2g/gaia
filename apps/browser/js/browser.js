'use strict';

var rscheme = /^(?:[a-z\u00a1-\uffff0-9-+]+)(?::|:\/\/)/i;
var _ = navigator.mozL10n.get;

var Browser = {

  currentTab: null,
  tabCounter: 0,
  tabs: {},

  styleSheet: document.styleSheets[0],
  cssTranslateId: null,

  GO: 0,
  REFRESH: 1,
  STOP: 2,
  SEARCH: 3,

  VISIBLE: 0,
  TRANSITIONING: 1,
  HIDDEN: 2,

  PAGE_SCREEN: 'page-screen',
  TABS_SCREEN: 'tabs-screen',
  AWESOME_SCREEN: 'awesome-screen',
  SETTINGS_SCREEN: 'settings-screen',
  previousScreen: null,
  currentScreen: 'page-screen',

  // This data is set from browser settings,
  // populated from init.json on first run
  searchEngine: {},

  DEVICE_RATIO: window.devicePixelRatio,
  UPPER_SCROLL_THRESHOLD: 50, // hide address bar
  LOWER_SCROLL_THRESHOLD: 5, // show address bar
  MAX_TOP_SITES: 4, // max number of top sites to display
  MAX_THUMBNAIL_WIDTH: 140,
  MAX_THUMBNAIL_HEIGHT: 100,
  FIRST_TAB: 'tab_0',
  MAX_SAVING_RETRIES: 100, // max number of retries when saving images with a
                           // new name.
  urlButtonMode: null,
  addressBarState: null,

  inTransition: false,

  waitingActivities: [],
  hasLoaded: false,

  // store the current scroll position, so we can re-calculate whether
  // we need to show the addressbar when loading the page is complete
  lastScrollOffset: 0,

  init: function browser_init() {
    this.getAllElements();

    // Add event listeners
    this.urlBar.addEventListener('submit', this.handleUrlFormSubmit.bind(this));
    this.urlInput.addEventListener('focus', this.urlFocus.bind(this));
    this.urlInput.addEventListener('blur', this.urlBlur.bind(this));
    this.urlInput.addEventListener('mouseup', this.urlMouseUp.bind(this));
    this.urlInput.addEventListener('keyup',
      this.handleUrlInputKeypress.bind(this));
    this.urlButton.addEventListener('click',
      this.handleUrlFormSubmit.bind(this));
    this.tabsBadge.addEventListener('click',
      this.handleTabsBadgeClicked.bind(this));

    // Hack to make integration tests pass, see bug 912150
    this.urlInput.addEventListener('click', this.urlFocus.bind(this));

    BrowserDB.init((function() {
      this.selectTab(this.createTab());
      this.addressBarState = this.VISIBLE;
      BrowserDB.getSetting('defaultSearchEngine', (function(uri) {
        if (!uri)
          return;
        BrowserDB.getSearchEngine(uri, (function(searchEngine) {
          if (!searchEngine)
            return;
          this.searchEngine = searchEngine;
        }).bind(this));
      }).bind(this));
    }).bind(this));
  },

  toCamelCase: function toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  getAllElements: function browser_getAllElements() {
    var elementIDs = [
      'toolbar-start', 'url-bar', 'url-input', 'url-button', 'awesomescreen',
      'ssl-indicator', 'tabs-badge', 'throbber', 'frames', 'main-screen',
      'crashscreen', 'bookmark-menu', 'bookmark-entry-sheet',
      'startscreen', 'top-site-thumbnails',
      'no-top-sites', 'tray', 'danger-dialog'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[this.toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  loadRemaining: function browser_loadRemaining() {
    if (this.hasLoaded)
      return;

    var elementsToLoad = [
      // DOM Nodes with commented content to load
      this.awesomescreen,
      this.crashscreen,
      this.tray,
      this.bookmarkMenu,
      this.bookmarkEntrySheet,
      document.getElementById('settings'),
      document.getElementById('modal-dialog-alert'),
      document.getElementById('modal-dialog-prompt'),
      document.getElementById('modal-dialog-confirm'),
      document.getElementById('modal-dialog-custom-prompt'),
      document.getElementById('http-authentication-dialog'),
      document.getElementById('danger-dialog')
    ];

    var filesToLoad = [
      // css files
      'shared/style/headers.css',
      'shared/style/buttons.css',
      'shared/style/input_areas.css',
      'shared/style/status.css',
      'shared/style/confirm.css',
      'style/modal_dialog/modal_dialog.css',
      'style/modal_dialog/prompt.css',
      'style/themes/default/core.css',
      'style/themes/default/buttons.css',
      'style/action_menu.css',
      'style/authentication_dialog.css',
      'style/settings.css',
      'style/awesomescreen.css',

      // shared JS files
      'shared/js/gesture_detector.js'
    ];

    var jsFiles = [
      'js/awesomescreen.js',
      'js/settings.js',
      'js/modal_dialog.js',
      'js/authentication_dialog.js'
    ];

    var domElements = [
      'tabs-list', 'settings-button',
      'close-tab', 'try-reloading', 'bookmark-menu-add',
      'bookmark-menu-remove', 'bookmark-menu-cancel', 'bookmark-menu-edit',
      'bookmark-entry-sheet-cancel', 'bookmark-entry-sheet-done',
      'bookmark-title', 'bookmark-url', 'bookmark-previous-url',
      'bookmark-menu-add-home', 'new-tab-button',
      'danger-dialog-message', 'danger-dialog-cancel', 'danger-dialog-ok'
    ];

    var loadBrowserFiles = function() {
      LazyLoader.load(jsFiles, function() {
        var mozL10n = navigator.mozL10n;
        mozL10n.ready(function browser_localizeElements() {
          elementsToLoad.forEach(function l10nElement(element) {
            mozL10n.translate(element);
          });
        });
        domElements.forEach(function createElementRef(name) {
          this[this.toCamelCase(name)] = document.getElementById(name);
        }, this);

        this.initRemainingListeners();
        document.body.classList.add('loaded');
        this.hasLoaded = true;

        if (this.waitingActivities.length) {
          this.waitingActivities.forEach(this.handleActivity, this);
        }
      }.bind(this));
    };

    LazyLoader.load(elementsToLoad.concat(filesToLoad),
      loadBrowserFiles.bind(this));
  },

  initRemainingListeners: function browser_initRemainingListeners() {
     this.settingsButton.addEventListener('click',
       Settings.show.bind(Settings));
     this.newTabButton.addEventListener('click', this.handleNewTab.bind(this));
     this.closeTab.addEventListener('click',
       this.handleCloseTab.bind(this));
     this.tryReloading.addEventListener('click',
       this.handleTryReloading.bind(this));
     this.bookmarkMenuAdd.addEventListener('click',
       this.addBookmark.bind(this));
     this.bookmarkMenuRemove.addEventListener('click',
       this.removeBookmark.bind(this));
     this.bookmarkMenuCancel.addEventListener('click',
       this.hideBookmarkMenu.bind(this));
     this.bookmarkMenuEdit.addEventListener('click',
       this.showBookmarkEntrySheet.bind(this));
     this.bookmarkMenuAddHome.addEventListener('click',
       this.addLinkToHome.bind(this));
     this.bookmarkEntrySheetCancel.addEventListener('click',
       this.hideBookmarkEntrySheet.bind(this));
     this.bookmarkEntrySheetDone.addEventListener('click',
       this.saveBookmark.bind(this));
     this.topSiteThumbnails.addEventListener('click',
       this.followLink.bind(this));

    this.tabsSwipeMngr.browser = this;
     ['mousedown', 'pan', 'tap', 'swipe'].forEach(function(evt) {
       this.tabsList.addEventListener(evt,
         this.tabsSwipeMngr[evt].bind(this.tabsSwipeMngr));
     }, this);

     this.screenSwipeMngr.browser = this;
     this.screenSwipeMngr.screen = this.mainScreen;
     this.screenSwipeMngr.gestureDetector =
       new GestureDetector(this.mainScreen);

     ['mousedown', 'pan', 'tap', 'swipe'].forEach(function(evt) {
       this.mainScreen.addEventListener(evt,
         this.screenSwipeMngr[evt].bind(this.screenSwipeMngr));
     }, this);

     document.addEventListener('visibilitychange',
       this.handleVisibilityChange.bind(this));

     Settings.init();
     ModalDialog.init();
     Awesomescreen.init();
     AuthenticationDialog.init(false);
  },

  /**
   * Get configuration data from init.json file generated at build time.
   *
   * Try to get data for the operator variant specified in system settings,
   * otherwise fall back to the default if provided.
   *
   * @param {Object} specifying operator variant as variant.mcc & variant.mnc.
   * @param {Function} callback Called with config data object or null.
   */
  getConfigurationData: function browser_getDefaultData(variant, callback) {
    var DEFAULT_MCC = '000';
    var DEFAULT_MNC = '000';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/js/init.json', true);

    xhr.addEventListener('load', (function browser_defaultDataListener() {
      if (!(xhr.status === 200 | xhr.status === 0)) {
        console.error('Unknown response when getting configuration data.');
        return;
      }
      var data = JSON.parse(xhr.responseText);

      var mccCodes = variant.mcc;
      var mncCodes = variant.mnc;
      if (!Array.isArray(variant.mcc)) {
        mccCodes = [variant.mcc];
      }
      if (!Array.isArray(variant.mnc)) {
        mncCodes = [variant.mnc];
      }

      for (var i = 0; i < mccCodes.length; i++) {
        var mccCode = NumberHelper.zfill(mccCodes[i], 3);
        var mncCode = DEFAULT_MNC;
        if (i < mncCodes.length) {
          mncCode = mncCodes[i];
        }
        mncCode = NumberHelper.zfill(mncCode, 3);

        if (data[mccCode + mncCode]) {
          callback(data[mccCode + mncCode]);
            return;
        }
      }

      if (data[DEFAULT_MCC + DEFAULT_MNC]) {
        callback(data[DEFAULT_MCC + DEFAULT_MNC]);
        return;
      }

      callback(null);
      console.error('No configuration data found.');

    }).bind(this), false);

    xhr.onerror = function getDefaultDataError() {
      callback(null);
      console.error('Error getting configuration data.');
    };

    xhr.send();
  },

  // Clicking the page preview on the left gutter of the tab page opens
  // that page
  handlePageScreenClicked: function browser_handlePageScreenClicked(e) {
    if (this.inTransition) {
      return;
    }
    if (this.currentScreen === this.TABS_SCREEN) {
      this.showPageScreen();
    }
  },

  handleTryReloading: function browser_handleTryReloading() {
    this.reviveCrashedTab(this.currentTab);
  },

  handleCloseTab: function browser_handleCloseTab() {
    this.hideCrashScreen();
    this.deleteTab(this.currentTab.id);
    this.setTabVisibility(this.currentTab, true);
    this.updateTabsCount();
  },

  // Tabs badge is the button at the top right, used to show the number of tabs
  // and to create new ones
  handleTabsBadgeClicked: function browser_handleTabsBadgeClicked(e) {
    if (this.inTransition)
      return;
    this.showTabScreen();
  },

  handleNewTab: function browserHandleNewTab(e) {
    this.inTransition = true;
    var tabId = this.createTab();
    this.showNewTabAnimation((function browser_showNewTabAnimation() {
      this.selectTab(tabId);
      Awesomescreen.show();
    }).bind(this));
  },

  // Each browser gets their own listener
  handleBrowserEvent: function browser_handleBrowserEvent(tab) {
    return (function(evt) {
      var isCurrentTab = this.currentTab.id === tab.id;
      switch (evt.type) {

      case 'mozbrowserloadstart':
        // iframe will call loadstart on creation, ignore
        if (!tab.url || tab.crashed) {
          return;
        }
        // If address bar is hidden then show it
        if (this.addressBarState === this.HIDDEN) {
          this.showAddressBar();
        }
        tab.loading = true;
        if (isCurrentTab && this.currentScreen === this.PAGE_SCREEN) {
          this.throbber.classList.add('loading');
          this.setUrlButtonMode(this.STOP);
        }
        tab.title = null;
        tab.iconUrl = null;
        break;

      case 'mozbrowserloadend':
        if (!tab.loading) {
          return;
        }
        tab.loading = false;
        if (isCurrentTab && this.currentScreen === this.PAGE_SCREEN) {
          this.throbber.classList.remove('loading');
          this.setUrlBar(tab.title || tab.url);
          this.setUrlButtonMode(this.REFRESH);
        }
        // Capture screenshot for tab thumbnail
        if (tab.dom.getScreenshot) {
          tab.dom.getScreenshot(this.MAX_THUMBNAIL_WIDTH * this.DEVICE_RATIO,
            this.MAX_THUMBNAIL_HEIGHT * this.DEVICE_RATIO).onsuccess =
          (function(e) {
            tab.screenshot = e.target.result;
            if (this.currentScreen === this.TABS_SCREEN) {
              this.showTabScreen();
            }
            BrowserDB.updateScreenshot(tab.url, tab.screenshot);
          }).bind(this);
        }

        // If no icon URL found yet, try loading from default location
        if (!tab.iconUrl) {
          var a = document.createElement('a');
          a.href = tab.url;
          var iconUrl = a.protocol + '//' + a.hostname + '/' + 'favicon.ico';
          BrowserDB.setAndLoadIconForPage(tab.url, iconUrl);
        }

        // We always show the address bar when loading
        // After loading we might need to hide it
        this.handleScroll({ detail: { top: this.lastScrollOffset } });

        break;

      case 'mozbrowserlocationchange':
        this.lastScrollOffset = 0;
        if (evt.detail === 'about:blank') {
          return;
        }
        tab.url = evt.detail;
        this.updateHistory(evt.detail);
        if (isCurrentTab) {
          if (this.currentScreen === this.PAGE_SCREEN) {
            this.setUrlBar(tab.url);
          }
        }
        break;

      case 'mozbrowsertitlechange':
        if (evt.detail) {
          tab.title = evt.detail;
          BrowserDB.setPageTitle(tab.url, tab.title);
          if (isCurrentTab && !tab.loading &&
              this.currentScreen === this.PAGE_SCREEN) {
            this.setUrlBar(tab.title);
          }
          // Refresh the tab screen if we are currently viewing it, for dynamic
          // or not yet loaded titles
          if (this.currentScreen === this.TABS_SCREEN) {
            this.showTabScreen();
          }
        }
        break;

      case 'mozbrowsericonchange':
        if (evt.detail.href && evt.detail.href != tab.iconUrl) {
          tab.iconUrl = evt.detail.href;
          // TODO: Pick up the best icon
          // based on evt.detail.sizes and device size.
          BrowserDB.setAndLoadIconForPage(tab.url, tab.iconUrl);
        }
        break;

      case 'mozbrowsercontextmenu':
        if (!this.contextMenuHasCalled) {
          this.contextMenuHasCalled = true;
          this.showContextMenu(evt);
        }
        break;

      case 'mozbrowsersecuritychange':
        tab.security = evt.detail;
        if (isCurrentTab) {
          this.updateSecurityIcon();
        }
        break;

      case 'mozbrowseropenwindow':
        this.handleWindowOpen(evt);
        break;

      case 'mozbrowserclose':
        this.handleWindowClose(tab.id);
        this.setTabVisibility(this.currentTab, true);
        this.updateTabsCount();
        if (tab.id === ModalDialog.currentOrigin) {
          ModalDialog.hide();
        } else if (tab.id === AuthenticationDialog.currentOrigin) {
          AuthenticationDialog.hide();
        }
        break;

      case 'mozbrowserusernameandpasswordrequired':
        if (!isCurrentTab) {
          this.hideCurrentTab();
          this.selectTab(tab.id);
        }
        if (this.currentScreen !== this.PAGE_SCREEN) {
          this.showPageScreen();
        }
        AuthenticationDialog.handleEvent(evt, tab.id);
        break;

      case 'mozbrowsershowmodalprompt':
        if (!isCurrentTab) {
          this.hideCurrentTab();
          this.selectTab(tab.id);
        }
        if (this.currentScreen !== this.PAGE_SCREEN) {
          this.showPageScreen();
        }
        ModalDialog.handleEvent(evt, tab.id);
        break;

      case 'mozbrowsererror':
        if (evt.detail.type === 'fatal')
          this.handleCrashedTab(tab);
        break;

      case 'mozbrowserasyncscroll':
        this.handleScroll(evt);
        break;
      }
    }).bind(this);
  },

  handleScroll: function browser_handleScroll(evt) {
    this.lastScrollOffset = evt.detail.top;

    if (evt.detail.top < this.LOWER_SCROLL_THRESHOLD) {
      this.showAddressBar();
    } else if (evt.detail.top > this.UPPER_SCROLL_THRESHOLD) {
      this.hideAddressBar();
    }
  },

  hideAddressBar: function browser_hideAddressBar() {
    if (this.addressBarState === this.HIDDEN ||
        this.addressBarState === this.TRANSITIONING) {
      return;
    }

    // don't hide the address bar when loading
    if (this.currentTab.loading)
      return;

    var addressBarHidden = (function browser_addressBarHidden() {
      this.addressBarState = this.HIDDEN;
      this.mainScreen.removeEventListener('transitionend', addressBarHidden);
    }).bind(this);
    // Prevent interaction with fluffy address bar when hidden, bug 937929
    this.urlInput.disabled = true;
    this.mainScreen.addEventListener('transitionend', addressBarHidden);
    this.addressBarState = this.TRANSITIONING;
    this.mainScreen.classList.add('expanded');
    this.mainScreen.clientTop;
    this.mainScreen.classList.add('address-hidden');
  },

  showAddressBar: function browser_showAddressBar() {
    if (this.addressBarState === null ||
        this.addressBarState === this.VISIBLE ||
        this.addressBarState === this.TRANSITIONING) {
      return;
    }

    var addressBarVisible = (function browser_addressBarVisible() {
      this.mainScreen.classList.remove('expanded');
      this.addressBarState = this.VISIBLE;
      this.mainScreen.removeEventListener('transitionend', addressBarVisible);
    }).bind(this);
    // Only allow interaction with fluffy address bar when visible, bug 937929
    this.urlInput.disabled = false;
    this.mainScreen.addEventListener('transitionend', addressBarVisible);
    this.addressBarState = this.TRANSITIONING;
    this.mainScreen.clientTop;
    this.mainScreen.classList.remove('address-hidden');
  },

  handleUrlInputKeypress: function browser_handleUrlInputKeypress(evt) {
    var input = this.urlInput.value;
    Awesomescreen.update(input);

    if (input === '') {
      this.setUrlButtonMode(null);
      return;
    }

    this.setUrlButtonMode(
      UrlHelper.isNotURL(input) ? this.SEARCH : this.GO
    );
  },

  showCrashScreen: function browser_showCrashScreen() {
    this.crashscreen.style.display = 'block';
  },

  hideCrashScreen: function browser_hideCrashScreen() {
    this.crashscreen.style.display = 'none';
  },

  handleCrashedTab: function browser_handleCrashedTab(tab) {
    // No need to show the crash screen for background tabs,
    // they will be revived when selected
    if (tab.id === this.currentTab.id && !document.hidden) {
      this.showCrashScreen();
    }
    tab.loading = false;
    tab.crashed = true;
    ModalDialog.clear(tab.id);
    AuthenticationDialog.clear(tab.id);
    this.frames.removeChild(tab.dom);
    delete tab.dom;
    delete tab.screenshot;
    if (this.currentScreen === this.TABS_SCREEN) {
      this.showTabScreen();
    }
  },

  handleVisibilityChange: function browser_handleVisibilityChange() {
    if (!document.hidden && this.currentTab.crashed)
      this.reviveCrashedTab(this.currentTab);

    // Bug 845661 - Attention screen does not appears when
    // the url bar input is focused.
    if (document.hidden) {
      this.urlInput.blur();
      this.currentTab.dom.blur();
    }
  },

  reviveCrashedTab: function browser_reviveCrashedTab(tab) {
    this.createTab(null, null, tab);
    tab.crashed = false;
    if (!tab.url)
      return;
    this.setTabVisibility(tab, true);
    Toolbar.refreshButtons();
    this.navigate(tab.url);
    this.hideCrashScreen();
  },

  handleWindowOpen: function browser_handleWindowOpen(evt) {
    var url = evt.detail.url;
    var frame = evt.detail.frameElement;
    var tab = this.createTab(url, frame);

    this.hideCurrentTab();
    this.selectTab(tab);
    // The frame will already be loading once we receive it, which
    // means we need to assume it is loading
    this.currentTab.loading = true;
    this.setTabVisibility(this.currentTab, true);
    this.updateTabsCount();
  },

  handleWindowClose: function browser_handleWindowClose(tabId) {
    if (!tabId)
      return false;

    this.deleteTab(tabId);
    return true;
  },

  updateTabsCount: function browser_updateTabsCount() {
    this.tabsBadge.innerHTML = Object.keys(this.tabs).length +
      '<span id="more-tabs">&#x203A;</span>';
  },

  updateSecurityIcon: function browser_updateSecurityIcon() {
    if (!this.currentTab.security) {
      this.sslIndicator.value = '';
      return;
    }
    this.sslIndicator.value = this.currentTab.security.state;
  },

  navigate: function browser_navigate(url) {
    this.hideStartscreen();
    this.showPageScreen();
    this.currentTab.title = null;
    this.currentTab.url = url;
    this.currentTab.dom.setAttribute('src', url);
    this.setUrlBar(url);
  },

  getUrlFromInput: function browser_getUrlFromInput(input) {
    var hasScheme = !!(rscheme.exec(input) || [])[0];

    // Not a valid URL, could be a search term
    if (UrlHelper.isNotURL(input) && this.searchEngine.uri) {
      var uri = this.searchEngine.uri.replace('{searchTerms}', input);
      return uri;
    }

    // No scheme, prepend basic protocol and return
    if (!hasScheme) {
      return 'http://' + input;
    }

    return input;
  },

  handleUrlFormSubmit: function browser_handleUrlFormSubmit(e) {
    if (e) {
      e.preventDefault();
    }

    if (this.urlButtonMode === null) {
      return;
    }


    if (this.urlButtonMode == this.REFRESH && this.currentTab.crashed) {
      this.setUrlBar(this.currentTab.url);
      this.reviveCrashedTab(this.currentTab);
      return;
    }

    if (this.urlButtonMode == this.REFRESH && !this.currentTab.crashed) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=829616
      // Switch the hard-reload to soft-reload since hard-reload still has
      // some issue to be fix (bug 831153).
      this.currentTab.dom.reload(false);
      return;
    }

    if (this.urlButtonMode == this.STOP && !this.currentTab.crashed) {
      this.currentTab.dom.stop();
      return;
    }

    var url = this.getUrlFromInput(this.urlInput.value);

    if (url !== this.currentTab.url) {
      this.setUrlBar(url);
      this.currentTab.url = url;
    }

    this.urlInput.blur();

    if (this.currentTab.crashed) {
      this.reviveCrashedTab(this.currentTab);
      return;
    }

    this.navigate(url);
  },

  goBack: function browser_goBack() {
    this.currentTab.dom.goBack();
  },

  goForward: function browser_goForward() {
    this.currentTab.dom.goForward();
  },

  addBookmark: function browser_addBookmark(e) {
    e.preventDefault();
    if (!this.currentTab.url)
      return;
    BrowserDB.addBookmark(this.currentTab.url, this.currentTab.title,
      Toolbar.refreshBookmarkButton.bind(Toolbar));
    this.hideBookmarkMenu();
  },

  removeBookmark: function browser_removeBookmark(e) {
    e.preventDefault();
    if (!this.bookmarkMenuRemove.dataset.url)
      return;

    BrowserDB.removeBookmark(this.bookmarkMenuRemove.dataset.url,
      function() {
        Toolbar.refreshBookmarkButton();
        Awesomescreen.refreshBookmarks();
    });
    this.hideBookmarkMenu();
  },

  // responsible to show the specific action menu
  showActionMenu: function browser_showActionMenu(url, from) {
      if (!url)
        return;
      this.bookmarkMenu.classList.remove('hidden');
      BrowserDB.getBookmark(url, (function(bookmark) {
        if (bookmark) {
          if (from && from === 'bookmarksTab') { //show actions in bookmark tab

            this.bookmarkMenuAdd.parentNode.classList.add('hidden');
            //append url to button's dataset
            this.bookmarkMenuRemove.dataset.url = url;
            this.bookmarkMenuRemove.parentNode.classList.remove('hidden');
            //XXX not implement yet: edit bookmark in bookmarktab #838041
            this.bookmarkMenuEdit.parentNode.classList.add('hidden');
            //XXX not implement yet: link to home in bookmarktab #850999
            this.bookmarkMenuAddHome.parentNode.classList.add('hidden');

          } else { //show actions in browser page

            this.bookmarkMenuAdd.parentNode.classList.add('hidden');
            this.bookmarkMenuRemove.dataset.url = url;
            this.bookmarkMenuRemove.parentNode.classList.remove('hidden');
            this.bookmarkMenuEdit.dataset.url = url;
            this.bookmarkMenuEdit.parentNode.classList.remove('hidden');
            //XXX not implement yet: link to home in bookmarktab #850999
            this.bookmarkMenuAddHome.parentNode.classList.remove('hidden');

          }
        } else { //show actions in browser page

          this.bookmarkMenuAdd.parentNode.classList.remove('hidden');
          this.bookmarkMenuRemove.parentNode.classList.add('hidden');
          this.bookmarkMenuEdit.parentNode.classList.add('hidden');
          //XXX not implement yet: link to home in bookmarktab #850999
          this.bookmarkMenuAddHome.parentNode.classList.remove('hidden');

        }
      }).bind(this));
  },

  // Adaptor to show menu while press bookmark star
  showBookmarkMenu: function browser_showBookmarkMenu() {
    this.showActionMenu(this.currentTab.url);
  },

  // Adaptor to show menu while longpress in bookmark tab
  showBookmarkTabContextMenu: function browser_showBookmarkTabContextMenu(url) {
    this.showActionMenu(url, 'bookmarksTab');
  },

  hideBookmarkMenu: function browser_hideBookmarkMenu() {
    this.bookmarkMenu.classList.add('hidden');
  },

  showBookmarkEntrySheet: function browser_showBookmarkEntrySheet() {
    if (!this.currentTab.url)
      return;
    this.hideBookmarkMenu();
    this.bookmarkEntrySheet.classList.remove('hidden');
    BrowserDB.getBookmark(this.currentTab.url, (function(bookmark) {
      if (!bookmark) {
        this.hideBookmarkEntrySheet();
        return;
      }
      this.bookmarkTitle.value = bookmark.title;
      this.bookmarkUrl.value = bookmark.uri;
      this.bookmarkPreviousUrl.value = bookmark.uri;
    }).bind(this));
  },

  hideBookmarkEntrySheet: function browser_hideBookmarkEntrySheet() {
    this.bookmarkEntrySheet.classList.add('hidden');
    this.bookmarkTitle.value = '';
    this.bookmarkUrl.value = '';
    this.bookmarkPreviousUrl.value = '';
  },

  saveBookmark: function browser_saveBookmark() {
    var url = this.bookmarkUrl.value;
    var title = this.bookmarkTitle.value;
    var previousUrl = this.bookmarkPreviousUrl.value;
    if (url != previousUrl) {
      BrowserDB.removeBookmark(previousUrl,
        Toolbar.refreshBookmarkButton.bind(Toolbar));
      BrowserDB.updateBookmark(url, title);
    } else {
      BrowserDB.updateBookmark(url, title);
    }
    this.hideBookmarkEntrySheet();
  },

  addLinkToHome: function browser_addLinkToHome() {
    if (!this.currentTab.url)
      return;

    BrowserDB.getPlace(this.currentTab.url, (function(place) {
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: this.currentTab.url,
          name: this.currentTab.title,
          icon: place.iconUri,
          useAsyncPanZoom: true
        }
      });
    }).bind(this));
    this.hideBookmarkMenu();
  },

  updateHistory: function browser_updateHistory(url) {
    BrowserDB.addVisit(url);
    Toolbar.refreshButtons();
  },

  shouldFocus: false,

  urlMouseUp: function browser_urlMouseUp(e) {
    if (this.shouldFocus) {
      e.preventDefault();
      this.urlInput.focus();
      this.urlInput.select();
      this.shouldFocus = false;
    }
  },

  urlFocus: function browser_urlFocus(e) {
    // Hack to make integration tests pass, see bug 912150
    if (this.urlBar.classList.contains('focus'))
      return;
    this.urlBar.classList.add('focus');
    if (this.currentScreen === this.PAGE_SCREEN) {
      this.urlInput.value = this.currentTab.url;
      this.sslIndicator.value = '';
      this.setUrlBar(this.currentTab.url);
      Awesomescreen.show();
      this.shouldFocus = true;
    } else if (this.currentScreen === this.AWESOME_SCREEN) {
      this.shouldFocus = true;
    }
  },

  urlBlur: function browser_urlBlur() {
    this.urlBar.classList.remove('focus');
  },

  setUrlBar: function browser_setUrlBar(data) {
    this.urlInput.value = data;
  },

  setUrlButtonMode: function browser_setUrlButtonMode(mode) {
    this.urlButtonMode = mode;

    if (this.urlButtonMode === null) {
      this.urlButton.style.backgroundImage = '';
      this.urlButton.style.display = 'none';
      return;
    }

    this.urlButton.style.display = 'block';

    switch (mode) {
      case this.GO:
        this.urlButton.style.backgroundImage = 'url(style/images/go.png)';
        break;
      case this.REFRESH:
        this.urlButton.style.backgroundImage = 'url(style/images/refresh.png)';
        break;
      case this.STOP:
        this.urlButton.style.backgroundImage = 'url(style/images/stop.png)';
        break;
      case this.SEARCH:
        this.urlButton.style.backgroundImage = 'url(style/images/search.png)';
        break;
    }
  },

  openInNewTab: function browser_openInNewTab(url) {
    this.createTab(url);
    this.updateTabsCount();
  },

  // Saves a media file to device storage.
  saveMedia: function browser_saveMedia(url, type) {
    function displayMessage(message) {
      var status = document.getElementById('save-media-status');
      status.firstElementChild.textContent = message;
      status.classList.add('visible');
      window.setTimeout(function() {
        status.classList.remove('visible');
      }, 3000);
    }

    function storeBlob(blob, name, retryCount) {
      /*
       * XXX: Bug 852864 - DeviceStorage addNamed failed with TypeMismatchError
       * 3gp and ogg types of audio files are returned as blobs of video type.
       * The workaround here is saving the blob to corresponding storage based
       * on the type of it instead of the type specified by users. Which allows
       * users able to save those types of audio files.
       */
      var storageTypeMap = {
        'image': 'pictures',
        'video': 'videos',
        'audio': 'music'
      };
      var blobType = blob.type.split('/')[0];
      var storageType = storageTypeMap[blobType];
      if (!storageType) {
        displayMessage(_('error-saving-' + type));
        return;
      }

      var storage = navigator.getDeviceStorage(storageType);
      var addreq = storage.addNamed(blob, name);

      addreq.onsuccess = function() {
        displayMessage(_(type + '-saved'));
      };
      addreq.onerror = function() {
        // Prepend some always changing id and try to store again, but give up
        // after MAX_SAVING_RETRIES retries.
        if (addreq.error.name === 'NoModificationAllowedError' &&
            retryCount !== Browser.MAX_SAVING_RETRIES) {
          name = Date.now() + '-' + name;
          storeBlob(blob, name, retryCount + 1);
        } else {
          displayMessage(_('error-saving-' + type));
        }
      };
    }

    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function browser_mediaDataListener() {
      if (xhr.status !== 200 || !xhr.response) {
        displayMessage(_('error-saving-' + type));
        return;
      }

      // Save the blob to device storage.
      // Extract a filename from the URL, and to some sanitizing.
      var name = url.split('/').reverse()[0].toLowerCase().split(/[&?#]/g)[0]
                    .replace(/[^a-z0-9\.]/g, '_');

      // If we have no file extension, use the content-type header to
      // add one.
      var ext = MimeMapper.guessExtensionFromType(xhr.response.type);
      if (ext && name.indexOf(ext) === -1) {
        name += '.' + ext;
      }

      storeBlob(xhr.response, name, 0);
    };

    xhr.onerror = function getDefaultDataError() {
      displayMessage(_('error-saving-' + type));
    };
    xhr.send();
  },

  // This generates callbacks for context menu targets that have
  // default actions attached
  generateSystemMenuItem: function browser_generateSystemMenuItem(item) {
    var self = this;
    var nodeName = item.nodeName ? item.nodeName.toUpperCase() : '';
    switch (nodeName) {
      case 'A':
        return {
          id: 'open-in-new-tab',
          label: _('open-in-new-tab'),
          callback: function() {
            self.openInNewTab(item.data.uri);
          }
        };
      case 'IMG':
      case 'VIDEO':
      case 'AUDIO':
        var typeMap = {
          'IMG': 'image',
          'VIDEO': 'video',
          'AUDIO': 'audio'
        };
        var type = typeMap[nodeName];
        if (nodeName === 'VIDEO' && !item.data.hasVideo) {
          type = 'audio';
        }

        return {
          label: _('save-' + type),
          callback: function() {
            self.saveMedia(item.data.uri, type);
          }
        };
      default:
        return false;
    }
  },

  showContextMenu: function browser_showContextMenu(evt) {
    var menuItems = [];
    var menuData = evt.detail;
    var dialog = document.createElement('section');
    var menu = document.createElement('menu');
    var list = document.createElement('ul');
    var self = this;
    // SystemTargets are default elements that have contextmenu
    // actions associated
    evt.detail.systemTargets.forEach(function(item) {
      var action = this.generateSystemMenuItem(item);
      if (action) {
        menuItems.push(action);
      }
    }, this);

    // Content passes in a nested menu object to be displayed
    // and expects 'contextMenuItemSelected' to be called
    // with the id of the selected menuitem
    var collectMenuItems = function(menu) {
      menu.items.forEach(function(item) {
        if (item.type === 'menuitem') {
          menuItems.push({
            icon: item.icon,
            label: item.label,
            callback: function() {
              evt.detail.contextMenuItemSelected(item.id);
            }
          });
        } else if (item.type === 'menu') {
          collectMenuItems(item);
        }
      });
    };

    if (menuData.contextmenu) {
      collectMenuItems(menuData.contextmenu);
    }

    if (Object.keys(menuItems).length === 0) {
      self.contextMenuHasCalled = false;
      return;
    }

    evt.preventDefault();

    menuItems.forEach(function(menuitem) {
      var li = document.createElement('li');
      li.id = menuitem.id;
      var button = this.createButton(menuitem.label, menuitem.icon);

      button.addEventListener('click', function() {
        document.body.removeChild(dialog);
        self.contextMenuHasCalled = false;
        menuitem.callback();
      });

      li.appendChild(button);
      list.appendChild(li);
    }, this);

    var cancel = document.createElement('li');
    cancel.id = 'cancel';
    cancel.appendChild(this.createButton(_('cancel')));
    list.appendChild(cancel);

    cancel.addEventListener('click', function(e) {
      self.contextMenuHasCalled = false;
      document.body.removeChild(dialog);
    });

    menu.classList.add('actions');
    menu.appendChild(list);
    dialog.setAttribute('role', 'dialog');
    dialog.appendChild(menu);
    document.body.appendChild(dialog);
  },

  createButton: function browser_createButton(text, image) {
    var button = document.createElement('button');
    var textNode = document.createTextNode(text);
    if (image) {
      var img = document.createElement('img');
      img.setAttribute('src', image);
      button.appendChild(img);
    }
    button.appendChild(textNode);
    return button;
  },

  followLink: function browser_followLink(e) {
    e.preventDefault();
    if (e.target.nodeName === 'A') {
      this.navigate(e.target.getAttribute('href'));
      this.hideStartscreen();
    }
  },

  setTabVisibility: function(tab, visible) {
    if (!tab.dom)
      return;

    if (ModalDialog.originHasEvent(tab.id)) {
      if (visible) {
        ModalDialog.show(tab.id);
      } else {
        ModalDialog.hide();
      }
    }

    if (AuthenticationDialog.originHasEvent(tab.id)) {
      if (visible) {
        AuthenticationDialog.show(tab.id);
      } else {
        AuthenticationDialog.hide();
      }
    }

    this.setVisibleWrapper(tab, visible);
    var fun = tab.loading ? 'add' : 'remove';
    this.throbber.classList[fun]('loading');
    tab.dom.style.display = visible ? 'block' : 'none';
    tab.dom.style.top = '0px';
  },

  // dom.setVisible is loaded asynchronously from BrowserElementChildPreload
  // and may require a yield before we call it, we want to make sure to
  // clear any previous call
  setVisibleWrapper: function(tab, visible) {
    if (tab.setVisibleTimeout) {
      clearTimeout(tab.setVisibleTimeout);
    }
    if (tab.dom.setVisible) {
      tab.dom.setVisible(visible);
      return;
    }
    tab.setVisibleTimeout = setTimeout(function() {
      if (tab.dom.setVisible)
        tab.dom.setVisible(visible);
    });
  },

  bindBrowserEvents: function browser_bindBrowserEvents(iframe, tab) {
    var browserEvents = ['loadstart', 'loadend', 'locationchange',
                         'titlechange', 'iconchange', 'contextmenu',
                         'securitychange', 'openwindow', 'close',
                         'showmodalprompt', 'error', 'asyncscroll',
                         'usernameandpasswordrequired'];
    browserEvents.forEach(function attachBrowserEvent(type) {
      iframe.addEventListener('mozbrowser' + type,
                              this.handleBrowserEvent(tab));
    }, this);
  },

  createTab: function browser_createTab(url, iframe, tab) {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.setAttribute('mozbrowser', true);
      iframe.setAttribute('mozallowfullscreen', true);
      iframe.classList.add('browser-tab');

      if (url) {
        iframe.setAttribute('src', url);
      }
    }

    iframe.style.top = '-9999px';

    iframe.setAttribute('mozasyncpanzoom', 'true');
    // FIXME: content shouldn't control this directly
    iframe.setAttribute('remote', 'true');

    if (tab) {
      tab.dom = iframe;
    } else {
      tab = {
        id: 'tab_' + this.tabCounter++,
        dom: iframe,
        url: url || null,
        title: null,
        loading: false,
        screenshot: null,
        security: null
      };
    }

    // Default newly created frames to the background
    this.setVisibleWrapper(tab, false);
    this.bindBrowserEvents(iframe, tab);
    this.tabs[tab.id] = tab;
    this.frames.appendChild(iframe);
    return tab.id;
  },

  deleteTab: function browser_deleteTab(id) {
    var tabIds = Object.keys(this.tabs);
    if (this.tabs[id].dom)
      this.tabs[id].dom.parentNode.removeChild(this.tabs[id].dom);
    delete this.tabs[id];
    ModalDialog.clear(id);
    AuthenticationDialog.clear(id);

    // If that was the last tab, create a new one and show start screen
    if (Object.keys(this.tabs).length == 0) {
      this.selectTab(this.createTab());
      this.switchScreen(this.PAGE_SCREEN);
      return;
    }

    // Otherwise, if closing current tab, switch to another one
    if (this.currentTab && this.currentTab.id === id) {
      // The tab to be selected when the current one is deleted
      var newTab = tabIds.indexOf(id);
      if (newTab === tabIds.length - 1) {
        newTab -= 1;
      }
      this.selectTab(Object.keys(this.tabs)[newTab]);
    }
  },

  // Show a quick animation while creating a new tab to indicate
  // that a new tab has been created
  showNewTabAnimation: function browser_showNewTab(showTabCompleteFun) {
    var ul = this.tabsList.childNodes[0];
    var li = document.createElement('li');
    li.innerHTML = '<a><img /><span>' + _('new-tab') + '</span></a>';
    li.style.height = '0px';
    li.style.transition = 'height 0.2s ease-in';
    ul.insertBefore(li, ul.childNodes[0]);

    li.addEventListener('transitionend', function() {
      // Pause so the user has time to see the new tab
      setTimeout(showTabCompleteFun, 100);
    });

    // Hack to force transition to apply synchronously
    // http://lists.w3.org/Archives/Public/www-style/2011Mar/0729.html
    li.clientTop;
    li.style.height = '';
  },

  hideCurrentTab: function browser_hideCurrentTab() {
    var tab = this.currentTab;
    this.setTabVisibility(tab, false);
    this.throbber.classList.remove('loading');
  },

  selectTab: function browser_selectTab(id) {
    this.currentTab = this.tabs[id];
    // If the tab crashed, bring it back to life
    if (this.currentTab.crashed)
      this.reviveCrashedTab(this.currentTab);
    // We may have picked a currently loading background tab
    // that was positioned off screen
    this.setUrlBar(this.currentTab.title);
    this.updateSecurityIcon();
    Toolbar.refreshButtons();
    this.showAddressBar();
    // Show start screen if the tab hasn't been navigated
    if (this.currentTab.url == null) {
      this.showStartscreen();
    } else {
      this.hideStartscreen();
    }
  },

  switchScreen: function browser_switchScreen(screen) {
    if (this.currentScreen === this.TABS_SCREEN) {
      this.screenSwipeMngr.gestureDetector.stopDetecting();
    }
    if (this.currentScreen !== screen) {
      document.body.classList.remove(this.currentScreen);
      this.previousScreen = this.currentScreen;
      this.currentScreen = screen;
      document.body.classList.add(this.currentScreen);
    }
  },

  showStartscreen: function browser_showStartscreen() {
    document.body.classList.add('start-page');
    this.startscreen.classList.remove('hidden');
    BrowserDB.getTopSites(this.MAX_TOP_SITES, null,
      function(places) {
      this.showTopSiteThumbnails(places);
      this.loadRemaining();
    }.bind(this));
    Toolbar.bookmarkButton.classList.remove('bookmarked');
  },

  _topSiteThumbnailObjectURLs: [],
  clearTopSiteThumbnails: function browser_clearTopSiteThumbnails() {
    this.topSiteThumbnails.innerHTML = '';

    // Revoke the object URLs so we don't leak their blobs.  (For some reason,
    // you can't do forEach(URL.revokeObjectURL) -- that causes an exception.)
    this._topSiteThumbnailObjectURLs.forEach(function(url) {
      URL.revokeObjectURL(url);
    });
    this._topSiteThumbnailObjectURLs = [];
  },

  hideStartscreen: function browser_hideStartScreen() {
    document.body.classList.remove('start-page');
    this.startscreen.classList.add('hidden');
    this.clearTopSiteThumbnails();
  },

  showTopSiteThumbnails: function browser_showStartscreenThumbnails(places) {
    this.clearTopSiteThumbnails();

    var length = places.length;
    // Display a message if Top Sites empty
    if (length == 0) {
      this.noTopSites.classList.remove('hidden');
      return;
    } else {
      this.noTopSites.classList.add('hidden');
    }
    // If an odd number greater than one, remove one
    if (length % 2 && length > 1)
      places.pop();
    // If only one, pad with another empty one
    if (length == 1)
      places.push({uri: '', title: ''});

    places.forEach(function processPlace(place) {
      var thumbnail = document.createElement('li');
      var link = document.createElement('a');
      var title = document.createElement('span');
      link.href = place.uri;
      title.textContent = place.title ? place.title : place.uri;

      if (place.screenshot) {
        var objectURL = URL.createObjectURL(place.screenshot);
        this._topSiteThumbnailObjectURLs.push(objectURL);
        link.style.backgroundImage = 'url(' + objectURL + ')';
      }

      thumbnail.appendChild(link);
      thumbnail.appendChild(title);
      this.topSiteThumbnails.appendChild(thumbnail);
    }, this);
  },

  showPageScreen: function browser_showPageScreen() {
    if (this.currentScreen === this.TABS_SCREEN) {
      var switchLive = (function browser_switchLive() {
        this.mainScreen.removeEventListener('transitionend', switchLive, true);
        this.setTabVisibility(this.currentTab, true);
      }).bind(this);
      this.mainScreen.addEventListener('transitionend', switchLive, true);
    } else {
      this.setTabVisibility(this.currentTab, true);
    }

    if (this.currentTab.loading) {
      this.setUrlButtonMode(this.STOP);
      this.throbber.classList.add('loading');
    } else {
      var urlButton = this.currentTab.url ? this.REFRESH : null;
      this.setUrlButtonMode(urlButton);
      this.throbber.classList.remove('loading');
    }

    this.switchScreen(this.PAGE_SCREEN);
    this.setUrlBar(this.currentTab.title || this.currentTab.url);
    if (this.currentTab.crashed) {
      this.showCrashScreen();
    } else {
      this.hideCrashScreen();
    }
    this.updateTabsCount();
    this.inTransition = false;
  },

  _tabScreenObjectURLs: [],
  showTabScreen: function browser_showTabScreen() {

    // TODO: We shouldnt hide the current tab when switching to the tab
    // screen, it should be visible in the gutter, but that currently triggers
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777781
    this.hideCurrentTab();
    this.tabsBadge.innerHTML = '';

    var ul = document.createElement('ul');

    this.tabsList.innerHTML = '';
    // Revoke our old object URLs, so we don't leak.  (It is tempting to do
    // forEach(URL.revokeObjectURL), but that throws an exception.
    this._tabScreenObjectURLs.forEach(function(url) {
      URL.revokeObjectURL(url);
    });
    this._tabScreenObjectURLs = [];

    for (var tab in this.tabs) {
      var li = this.generateTabLi(this.tabs[tab]);
      ul.appendChild(li);
    }

    this.tabsList.appendChild(ul);
    this.switchScreen(this.TABS_SCREEN);
    this.screenSwipeMngr.gestureDetector.startDetecting();
    new GestureDetector(ul).startDetecting();
    this.inTransition = false;
  },

  generateTabLi: function browser_generateTabLi(tab) {
    var title = tab.title || tab.url || _('new-tab');
    var a = document.createElement('a');
    var li = document.createElement('li');
    var span = document.createElement('span');
    var preview = document.createElement('div');
    var text = document.createTextNode(title);

    var close = document.createElement('button');
    close.classList.add('close');
    close.setAttribute('data-id', tab.id);
    a.appendChild(close);

    a.setAttribute('data-id', tab.id);
    preview.classList.add('preview');

    span.appendChild(text);
    a.appendChild(preview);
    a.appendChild(span);
    li.appendChild(a);

    if (tab.crashed) {
      preview.classList.add('crashed');
    } else if (tab.screenshot) {
      var objectURL = URL.createObjectURL(tab.screenshot);
      this._tabScreenObjectURLs.push(objectURL);
      preview.style.backgroundImage = 'url(' + objectURL + ')';
    }

    if (tab == this.currentTab) {
      li.classList.add('current');
    }

    return li;
  },

  showDangerDialog: function browser_showDangerDialog(title, btn, callback) {
    var self = this;
    var msg = navigator.mozL10n.get(title);

    var ok = function(e) {
      e.preventDefault();
      removeEventListeners();
      btn.setAttribute('disabled', 'disabled');
      self.dangerDialog.hidden = true;
      callback();
    };

    var cancel = function(e) {
      e.preventDefault();
      removeEventListeners();
      self.dangerDialogCancel.removeEventListener('click', cancel);
      self.dangerDialog.hidden = true;
    };

    var removeEventListeners = function() {
      self.dangerDialogOk.removeEventListener('click', ok);
      self.dangerDialogCancel.removeEventListener('click', cancel);
    };

    this.dangerDialogMessage.textContent = msg;
    this.dangerDialog.hidden = false;

    this.dangerDialogOk.addEventListener('click', ok);
    this.dangerDialogCancel.addEventListener('click', cancel);
  },

  /**
   * Clear session history for all tabs.
   */
  clearTabsSessionHistory: function browser_clearTabsSessionHistory() {
    var tabIds = Object.keys(this.tabs);
    tabIds.forEach(function(tabId) {
      var tab = this.tabs[tabId];
      if (tab.dom.purgeHistory) {
        tab.dom.purgeHistory().onsuccess = function(e) {
          if (tab == this.currentTab) {
            Toolbar.refreshButtons();
          }
        };
      }
    }, this);
  },

  screenSwipeMngr: {

    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.75,
    DEFAULT_TRANSITION: 'transform 0.2s ease-in-out, height 0.2s ease-in-out',

    gestureDetector: null,
    browser: null,
    screen: null,
    winWidth: null,

    mousedown: function screenSwipe_mousedown(e) {
      // The mousedown event can be fired at any time, the other
      // events are only fired when tabs screen is active
      if (this.browser.currentScreen !== this.browser.TABS_SCREEN) {
        return;
      }
      e.preventDefault();
      this.winWidth = window.innerWidth;
      this.screen.style.MozTransition = 'none';
    },

    pan: function screenSwipe_pan(e) {
      if (e.detail.absolute.dx < 0) {
        return;
      }
      var leftPos = -(this.winWidth - 50) + e.detail.absolute.dx;
      this.screen.style.transform = 'translate(' + leftPos + 'px)';
    },

    tap: function screenSwipe_tap(e) {
      this.screen.style.MozTransition = this.DEFAULT_TRANSITION;
      this.browser.showPageScreen();
    },

    swipe: function screenSwipe_swipe(e) {
      // We only want to deal with left to right swipes
      var fastenough = e.detail.vx > this.TRANSITION_SPEED;
      var distance = e.detail.start.screenX - e.detail.end.screenX;
      var farenough = Math.abs(distance) >
        this.winWidth * this.TRANSITION_FRACTION;
      this.screen.style.MozTransition = this.DEFAULT_TRANSITION;
      this.screen.style.transform = '';
      if (farenough || fastenough) {
        this.browser.showPageScreen();
        return;
      }
    }
  },

  tabsSwipeMngr: {

    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.50,

    browser: null,
    tab: null,
    id: null,
    containerWidth: null,

    mousedown: function tabSwipe_mousedown(e) {
      e.preventDefault();

      this.isCloseButton = e.target.nodeName === 'BUTTON';
      this.tab = this.isCloseButton ? e.target.parentNode : e.target;
      this.id = this.tab.getAttribute('data-id');
      this.containerWidth = this.tab.parentNode.clientWidth;

      if (this.isCloseButton) {
        e.stopPropagation();
        return;
      }

      if (this.browser.inTransition)
        return;

      this.tab.classList.add('active');
      this.tab.style.MozTransition = '';
    },

    pan: function tabSwipe_pan(e) {
      if (this.browser.inTransition)
        return;
      var movement = Math.min(this.containerWidth,
                              Math.abs(e.detail.absolute.dx));
      if (movement > 0) {
        this.tab.style.opacity = 1 - (movement / this.containerWidth);
      }
      this.tab.style.left = e.detail.absolute.dx + 'px';
    },

    tap: function tabSwipe_tap() {
      if (this.browser.inTransition) {
        return;
      }
      if (this.isCloseButton) {
        this.tab.style.left = '0px';
        this.deleteTab(100, this.containerWidth);
        return;
      }

      this.browser.selectTab(this.id);
      this.browser.showPageScreen();
    },

    swipe: function tabSwipe_swipe(e) {
      if (this.browser.inTransition)
        return;

      var distance = e.detail.start.screenX - e.detail.end.screenX;
      var fastenough = Math.abs(e.detail.vx) > this.TRANSITION_SPEED;
      var farenough = Math.abs(distance) >
        this.containerWidth * this.TRANSITION_FRACTION;

      if (!(farenough || fastenough)) {
        // Werent far or fast enough to delete, restore
        var time = Math.abs(distance) / this.TRANSITION_SPEED;
        var transition = 'left ' + time + 'ms linear';
        this.tab.style.MozTransition = transition;
        this.tab.style.left = '0px';
        this.tab.style.opacity = 1;
        this.tab.classList.remove('active');
        return;
      }

      var speed = Math.max(Math.abs(e.detail.vx), 1.8);
      var time = (this.containerWidth - Math.abs(distance)) / speed;
      var offset = e.detail.direction === 'right' ?
        this.containerWidth : -this.containerWidth;

      this.deleteTab(time, offset);
    },

    deleteTab: function tabSwipe_deleteTab(time, offset) {
      var browser = this.browser;
      var id = this.id;
      var li = this.tab.parentNode;
      var self = this;

      // First animate the tab offscreen
      this.tab.addEventListener('transitionend', function() {
        // Then animate the space dissapearing
        li.addEventListener('transitionend', function(e) {
          // Then delete everything
          browser.deleteTab(id);
          li.parentNode.removeChild(li);
          browser.updateTabsCount();
        }, true);
        li.style.MozTransition = 'height ' + 100 + 'ms linear';
        li.style.height = '0px';
      }, true);

      this.tab.style.MozTransition = 'left ' + time + 'ms linear';
      this.tab.clientTop;
      this.tab.style.left = offset + 'px';
    }
  },

  handleActivity: function browser_handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    switch (activity.source.data.type) {
      case 'url':
        var url = this.getUrlFromInput(activity.source.data.url);
        if (this.currentTab) {
          if (this.currentTab.url) {
            this.hideCurrentTab();
            this.selectTab(this.createTab(url));
          } else {
            this.navigate(url);
          }
        }
        this.showPageScreen();
        break;
    }
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});


function actHandle(activity) {
  if (Browser.hasLoaded) {
    Browser.handleActivity(activity);
  } else {
    Browser.waitingActivities.push(activity);
  }
}

if (window.navigator.mozSetMessageHandler) {
  window.navigator.mozSetMessageHandler('activity', actHandle);
}
