'use strict';

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

  previousScreen: null,
  currentScreen: null,
  PAGE_SCREEN: 'page-screen',
  TABS_SCREEN: 'tabs-screen',
  AWESOME_SCREEN: 'awesome-screen',
  SETTINGS_SCREEN: 'settings-screen',

  DEFAULT_FAVICON: 'style/images/favicon.png',
  START_PAGE_URL: document.location.protocol + '//' + document.location.host +
    '/start.html',
  ABOUT_PAGE_URL: document.location.protocol + '//' + document.location.host +
    '/about.html',

  urlButtonMode: null,
  inTransition: false,

  waitingActivities: [],
  hasLoaded: false,

  init: function browser_init() {
    // Assign UI elements to variables
    this.toolbarStart = document.getElementById('toolbar-start');
    this.urlBar = document.getElementById('url-bar');
    this.tabHeaders = document.getElementById('tab-headers');
    this.urlInput = document.getElementById('url-input');
    this.urlButton = document.getElementById('url-button');
    this.content = document.getElementById('browser-content');
    this.awesomescreen = document.getElementById('awesomescreen');
    this.topSites = document.getElementById('top-sites');
    this.bookmarks = document.getElementById('bookmarks');
    this.history = document.getElementById('history');
    this.topSitesTab = document.getElementById('top-sites-tab');
    this.bookmarksTab = document.getElementById('bookmarks-tab');
    this.historyTab = document.getElementById('history-tab');
    this.backButton = document.getElementById('back-button');
    this.forwardButton = document.getElementById('forward-button');
    this.bookmarkButton = document.getElementById('bookmark-button');
    this.sslIndicator = document.getElementById('ssl-indicator');

    this.tabsBadge = document.getElementById('tabs-badge');
    this.throbber = document.getElementById('throbber');
    this.frames = document.getElementById('frames');
    this.tabsList = document.getElementById('tabs-list');
    this.mainScreen = document.getElementById('main-screen');
    this.settingsButton = document.getElementById('settings-button');
    this.settingsDoneButton = document.getElementById('settings-done-button');
    this.aboutFirefoxButton = document.getElementById('about-firefox-button');
    this.clearHistoryButton = document.getElementById('clear-history-button');

    // Add event listeners
    window.addEventListener('submit', this);
    window.addEventListener('keyup', this, true);
    window.addEventListener('resize', this.handleWindowResize.bind(this));

    this.backButton.addEventListener('click', this.goBack.bind(this));
    this.forwardButton.addEventListener('click', this.goForward.bind(this));
    this.bookmarkButton.addEventListener('click', this.bookmark.bind(this));
    this.urlInput.addEventListener('focus', this.urlFocus.bind(this));
    this.urlInput.addEventListener('mouseup', this.urlMouseUp.bind(this));
    this.topSites.addEventListener('click', this.followLink.bind(this));
    this.bookmarks.addEventListener('click', this.followLink.bind(this));
    this.history.addEventListener('click', this.followLink.bind(this));
    this.urlButton.addEventListener('click',
      this.handleUrlFormSubmit.bind(this));
    this.tabsBadge.addEventListener('click',
      this.handleTabsBadgeClicked.bind(this));
    this.topSitesTab.addEventListener('click',
      this.showTopSitesTab.bind(this));
    this.bookmarksTab.addEventListener('click',
      this.showBookmarksTab.bind(this));
    this.historyTab.addEventListener('click', this.showHistoryTab.bind(this));
    this.settingsButton.addEventListener('click',
      this.showSettingsScreen.bind(this));
    this.settingsDoneButton.addEventListener('click',
      this.showPageScreen.bind(this));
    this.aboutFirefoxButton.addEventListener('click',
      this.showAboutPage.bind(this));
    this.clearHistoryButton.addEventListener('click',
      this.handleClearHistory.bind(this));

    this.tabsSwipeMngr.browser = this;
    ['mousedown', 'pan', 'tap', 'swipe'].forEach(function(evt) {
      this.tabsList.addEventListener(evt,
        this.tabsSwipeMngr[evt].bind(this.tabsSwipeMngr));
    }, this);

    this.screenSwipeMngr.browser = this;
    this.screenSwipeMngr.screen = this.mainScreen;
    this.screenSwipeMngr.gestureDetector = new GestureDetector(this.mainScreen);

    ['mousedown', 'pan', 'tap', 'swipe'].forEach(function(evt) {
      this.mainScreen.addEventListener(evt,
        this.screenSwipeMngr[evt].bind(this.screenSwipeMngr));
    }, this);

    this.handleWindowResize();

    ModalDialog.init(false);

    // Load homepage once Places is initialised
    // (currently homepage is blank)
    Places.init((function() {
      this.hasLoaded = true;
      if (this.waitingActivities.length) {
        this.waitingActivities.forEach(this.handleActivity, this);
        return;
      }
      this.selectTab(this.createTab(this.START_PAGE_URL));
      this.showPageScreen();
    }).bind(this));
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

  // We want to ensure the current page preview on the tabs screen is in
  // a consistently sized gutter on the left
  handleWindowResize: function browser_handleWindowResize() {
    var leftPos = 'translate(' + -(window.innerWidth - 50) + 'px)';
    if (!this.gutterPosRule) {
      var css = '.tabs-screen #main-screen { transform: ' + leftPos + '; }';
      var insertId = this.styleSheet.cssRules.length - 1;
      this.gutterPosRule = this.styleSheet.insertRule(css, insertId);
    } else {
      var rule = this.styleSheet.cssRules[this.gutterPosRule];
      rule.style.transform = leftPos;
    }
  },

  // Tabs badge is the button at the top left, used to show the number of tabs
  // and to create new ones
  handleTabsBadgeClicked: function browser_handleTabsBadgeClicked(e) {
    if (this.inTransition) {
      return;
    }
    if (this.currentScreen === this.TABS_SCREEN) {
      this.inTransition = true;
      var tabId = this.createTab();
      this.showNewTabAnimation((function browser_showNewTabAnimation() {
        this.selectTab(tabId);
        this.showAwesomeScreen();
      }).bind(this));
      return;
    }
    if (this.currentScreen === this.AWESOME_SCREEN &&
        this.previousScreen === this.PAGE_SCREEN) {
      this.showPageScreen();
      return;
    }
    if (this.currentScreen === this.AWESOME_SCREEN) {
      this.deleteTab(this.currentTab.id);
    }
    this.showTabScreen();
  },

  // Each browser gets their own listener
  handleBrowserEvent: function browser_handleBrowserEvent(tab) {
    return (function(evt) {

      var isCurrentTab = this.currentTab.id === tab.id;
      switch (evt.type) {

      case 'mozbrowserloadstart':
        // iframe will call loadstart on creation, ignore
        if (!tab.url) {
          return;
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

        // We capture screenshots for everything when loading is
        // completed, but set background tabs inactive
        if (tab.dom.getScreenshot) {
          tab.dom.getScreenshot().onsuccess = (function(e) {
            tab.screenshot = e.target.result;
            if (!isCurrentTab) {
              this.setTabVisibility(tab, false);
            }
            if (this.currentScreen === this.TABS_SCREEN) {
              this.showTabScreen();
            }
            Places.updateScreenshot(tab.url, tab.screenshot);
          }).bind(this);
        }

        // If no icon URL found yet, try loading from default location
        if (!tab.iconUrl) {
          var a = document.createElement('a');
          a.href = tab.url;
          var iconUrl = a.protocol + '//' + a.hostname + '/' + 'favicon.ico';
          Places.setAndLoadIconForPage(tab.url, iconUrl);
        }

        break;

      case 'mozbrowserlocationchange':
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
          Places.setPageTitle(tab.url, tab.title);
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
        if (evt.detail && evt.detail != tab.iconUrl) {
          tab.iconUrl = evt.detail;
          Places.setAndLoadIconForPage(tab.url, tab.iconUrl);
        }
        break;

      case 'mozbrowsercontextmenu':
        this.showContextMenu(evt);
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
        }
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
      }
    }).bind(this);
  },

  handleEvent: function browser_handleEvent(evt) {
    var urlInput = this.urlInput;
    switch (evt.type) {
      case 'submit':
        this.handleUrlFormSubmit(evt);
        break;

      case 'keyup':
        if (evt.keyCode === evt.DOM_VK_ESCAPE) {
          evt.preventDefault();
          this.showPageScreen();
          this.urlInput.blur();
        } else {
          this.updateAwesomeScreen(this.urlInput.value);
        }
    }
  },

  handleWindowOpen: function browser_handleWindowOpen(evt) {
    var url = evt.detail.url;
    var frame = evt.detail.frameElement;
    var tab = this.createTab(url, frame);

    this.hideCurrentTab();
    this.selectTab(tab);
    // The frame will already be loading once we recieve it, which
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
    this.tabsBadge.innerHTML = Object.keys(this.tabs).length + '&#x203A;';
  },

  updateSecurityIcon: function browser_updateSecurityIcon() {
    if (!this.currentTab.security) {
      this.sslIndicator.value = '';
      return;
    }
    this.sslIndicator.value = this.currentTab.security.state;
  },

  navigate: function browser_navigate(url) {
    this.showPageScreen();
    this.currentTab.title = null;
    this.currentTab.url = url;
    this.currentTab.dom.setAttribute('src', url);
    this.setUrlBar(url);
  },

  getUrlFromInput: function browser_getUrlFromInput(url) {
    url = url.trim();
    // If the address entered starts with a quote then search, if it
    // contains a . or : then treat as a url, else search
    var isSearch = /^"|\'/.test(url) || !(/\.|\:/.test(url));
    var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
    var protocol = protocolRegexp.exec(url);

    if (isSearch) {
      return 'http://www.bing.com/search?q=' + url;
    }
    if (!protocol) {
      return 'http://' + url;
    }
    return url;
  },

  handleUrlFormSubmit: function browser_handleUrlFormSubmit(e) {
    if (e) {
      e.preventDefault();
    }

    if (this.urlButtonMode == this.REFRESH) {
      this.currentTab.dom.reload(true);
      return;
    }

    if (this.urlButtonMode == this.STOP) {
      this.currentTab.dom.stop();
      return;
    }

    var url = this.getUrlFromInput(this.urlInput.value);

    if (url != this.currentTab.url) {
      this.setUrlBar(url);
      this.currentTab.url = url;
    }
    this.navigate(url);
    this.urlInput.blur();
  },

  goBack: function browser_goBack() {
    this.currentTab.dom.goBack();
  },

  goForward: function browser_goForward() {
    this.currentTab.dom.goForward();
  },

  bookmark: function browser_bookmark() {
    // If no URL, can't create a bookmark
    if (!this.currentTab.url)
      return;
    // If bookmarked, unbookmark
    if (this.bookmarkButton.classList.contains('bookmarked')) {
      Places.removeBookmark(this.currentTab.url,
        this.refreshBookmarkButton.bind(this));
    // If not bookmarked, bookmark
    } else {
      Places.addBookmark(this.currentTab.url, this.currentTab.title,
        this.refreshBookmarkButton.bind(this));
    }
  },

  refreshBookmarkButton: function browser_refreshBookmarkButton() {
    if (!this.currentTab.url)
      return;
    Places.getBookmark(this.currentTab.url, (function(bookmark) {
      if (bookmark) {
        this.bookmarkButton.classList.add('bookmarked');
      } else {
        this.bookmarkButton.classList.remove('bookmarked');
      }
    }).bind(this));
  },

  refreshButtons: function browser_refreshButtons() {
    // When handling window.open we may hit this code
    // before canGoBack etc has been applied to the frame
    if (!this.currentTab.dom.getCanGoBack)
      return;

    this.currentTab.dom.getCanGoBack().onsuccess = (function(e) {
      this.backButton.disabled = !e.target.result;
    }).bind(this);
    this.currentTab.dom.getCanGoForward().onsuccess = (function(e) {
      this.forwardButton.disabled = !e.target.result;
    }).bind(this);
    this.refreshBookmarkButton();
  },

  updateHistory: function browser_updateHistory(url) {
    Places.addVisit(url);
    this.refreshButtons();
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
    if (this.currentScreen === this.PAGE_SCREEN) {
      this.urlInput.value = this.currentTab.url;
      this.setUrlBar(this.currentTab.url);
      this.showAwesomeScreen();
      this.shouldFocus = true;
    } else if (this.currentScreen === this.AWESOME_SCREEN) {
      this.shouldFocus = true;
    }
  },

  setUrlBar: function browser_setUrlBar(data) {
    if (this.currentTab.url == this.START_PAGE_URL ||
      this.currentTab.url == this.ABOUT_PAGE_URL) {
      this.urlInput.value = '';
    } else {
      this.urlInput.value = data;
    }
  },

  setUrlButtonMode: function browser_setUrlButtonMode(mode) {
    if (this.currentTab.url == this.START_PAGE_URL)
      mode = this.GO;
    this.urlButtonMode = mode;
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
    }
  },

  deselectAwesomescreenTabs: function browser_deselectAwesomescreenTabs() {
    this.topSites.classList.remove('selected');
    this.topSitesTab.classList.remove('selected');
    this.bookmarks.classList.remove('selected');
    this.bookmarksTab.classList.remove('selected');
    this.history.classList.remove('selected');
    this.historyTab.classList.remove('selected');
  },

  updateAwesomeScreen: function browser_updateAwesomeScreen(filter) {
    if (!filter) {
      this.tabHeaders.style.display = 'block';
      filter = false;
    } else {
      this.tabHeaders.style.display = 'none';
    }
    Places.getTopSites(20, filter, this.showTopSites.bind(this));
  },

  showTopSitesTab: function browser_showTopSitesTab(filter) {
    this.deselectAwesomescreenTabs();
    this.topSitesTab.classList.add('selected');
    this.topSites.classList.add('selected');
    this.updateAwesomeScreen();
  },

  showTopSites: function browser_showTopSites(topSites, filter) {
    this.topSites.innerHTML = '';
    var list = document.createElement('ul');
    list.setAttribute('role', 'listbox');
    this.topSites.appendChild(list);
    topSites.forEach(function browser_processTopSite(data) {
      this.drawAwesomescreenListItem(list, data, filter);
    }, this);
  },

  showHistoryTab: function browser_showHistoryTab() {
    this.deselectAwesomescreenTabs();
    this.historyTab.classList.add('selected');
    this.history.classList.add('selected');
    Places.getHistory(this.showGlobalHistory.bind(this));
  },

  showGlobalHistory: function browser_showGlobalHistory(visits) {
    this.history.innerHTML = '';
    var thresholds = [
      new Date().valueOf(),              // 0. Now
      DateHelper.todayStarted(),         // 1. Today
      DateHelper.yesterdayStarted(),     // 2. Yesterday
      DateHelper.thisWeekStarted(),      // 3. This week
      DateHelper.thisMonthStarted(),     // 4. This month
      DateHelper.lastSixMonthsStarted(), // 5. Six months
      0                                  // 6. Epoch!
    ];
    var threshold = 0;
    var month = null;
    var year = null;
    var urls = []; // List of URLs under each heading for de-duplication

    visits.forEach(function browser_processVisit(visit) {
      var timestamp = visit.timestamp;
      // Draw new heading if new threshold reached
      if (timestamp > 0 && timestamp < thresholds[threshold]) {
        urls = [];
        threshold = this.incrementHistoryThreshold(timestamp, threshold,
          thresholds);
        // Special case for month headings
        if (threshold != 5)
          this.drawHistoryHeading(threshold);
      }
      if (threshold == 5) {
        var timestampDate = new Date(timestamp);
        if (timestampDate.getMonth() != month ||
          timestampDate.getFullYear() != year) {
          urls = [];
          month = timestampDate.getMonth();
          year = timestampDate.getFullYear();
          this.drawHistoryHeading(threshold, timestamp);
        }
      }
      // If not a duplicate, draw list item & add to list
      if (urls.indexOf(visit.uri) == -1) {
        urls.push(visit.uri);
        this.drawAwesomescreenListItem(this.history.lastChild, visit);
      }
    }, this);
  },

  incrementHistoryThreshold: function browser_incrementHistoryThreshold(
    timestamp, currentThreshold, thresholds) {
    var newThreshold = currentThreshold += 1;
    if (timestamp < thresholds[newThreshold])
      return browser_incrementHistoryThreshold(timestamp, newThreshold,
        thresholds);
    return newThreshold;
  },

  drawAwesomescreenListItem: function browser_drawAwesomescreenListItem(list,
    data, filter) {
    var entry = document.createElement('li');
    var link = document.createElement('a');
    var title = document.createElement('h5');
    var url = document.createElement('small');
    entry.setAttribute('role', 'listitem');
    link.href = data.uri;
    var titleText = data.title ? data.title : data.url;
    title.innerHTML = Utils.createHighlightHTML(titleText, filter);

    if (data.uri == this.START_PAGE_URL) {
      url.textContent = 'about:home';
    } else if (data.uri == this.ABOUT_PAGE_URL) {
      url.textContent = 'about:';
    } else {
      url.innerHTML = Utils.createHighlightHTML(data.uri, filter);
    }
    link.appendChild(title);
    link.appendChild(url);
    entry.appendChild(link);
    list.appendChild(entry);

    if (!data.iconUri) {
      link.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
      return;
    }

    Places.db.getIcon(data.iconUri, (function(icon) {
      if (icon && icon.failed != true && icon.data) {
        var imgUrl = window.URL.createObjectURL(icon.data);
        link.style.backgroundImage = 'url(' + imgUrl + ')';
      } else {
        link.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
      }
    }).bind(this));
  },

  drawHistoryHeading: function browser_drawHistoryHeading(threshold,
    timestamp) {
    const LABELS = [
      'future',
      'today',
      'yesterday',
      'last-7-days',
      'this-month',
      'last-6-months',
      'older-than-6-months'
    ];

    var text = '';
    var h3 = document.createElement('h3');

    // Special case for month headings
    if (threshold == 5 && timestamp) {
      var date = new Date(timestamp);
      var now = new Date();
      text = _('month-' + date.getMonth());
      if (date.getFullYear() != now.getFullYear())
        text += ' ' + date.getFullYear();
    } else {
      text = _(LABELS[threshold]);
    }

    var textNode = document.createTextNode(text);
    var ul = document.createElement('ul');
    ul.setAttribute('role', 'listbox');
    h3.appendChild(textNode);
    this.history.appendChild(h3);
    this.history.appendChild(ul);
  },

  showBookmarksTab: function browser_showBookmarksTab() {
    this.deselectAwesomescreenTabs();
    this.bookmarksTab.classList.add('selected');
    this.bookmarks.classList.add('selected');
    Places.getBookmarks(this.showBookmarks.bind(this));
  },

  showBookmarks: function browser_showBookmarks(bookmarks) {
    this.bookmarks.innerHTML = '';
    var list = document.createElement('ul');
    list.setAttribute('role', 'listbox');
    this.bookmarks.appendChild(list);
    bookmarks.forEach(function browser_processBookmark(data) {
      this.drawAwesomescreenListItem(list, data);
    }, this);
  },

  openInNewTab: function browser_openInNewTab(url) {
    this.createTab(url);
    this.updateTabsCount();
  },

  showContextMenu: function browser_showContextMenu(evt) {

    var ctxDefaults = {
      'A' : {
        'open_in_tab': {
          src: 'default',
          label: _('open-in-new-tab'),
          selected: this.openInNewTab.bind(this)
        }
      }
    };

    var menuItems = ctxDefaults[evt.detail.nodeName] || {};

    var collectMenuItems = function(menu) {
      for (var i in menu.items) {
        if (menu.items[i].type === 'menuitem') {
          var id = menu.items[i].id;;
          menuItems[id] = menu.items[i];
          menuItems[id].src = 'user';
        } else if (menu.items[i].type === 'menu') {
          collectMenuItems(menu.items[i]);
        }
      }
    }

    var menuData = evt.detail;
    var cover = document.createElement('div');
    var menu = document.createElement('ul');

    if (menuData.menu) {
      collectMenuItems(menuData.menu);
    }

    if (Object.keys(menuItems).length === 0) {
      return;
    }

    for (var i in menuItems) {
      var text = document.createTextNode(menuItems[i].label);
      var li = document.createElement('li');
      li.setAttribute('data-menusource', menuItems[i].src);
      li.setAttribute('data-id', i);

      if (menuItems[i].icon) {
        var img = document.createElement('img');
        img.setAttribute('src', menuItems[i].icon);
        li.appendChild(img);
      }

      li.appendChild(text);
      menu.appendChild(li);
    }

    cover.setAttribute('id', 'cover');
    cover.appendChild(menu);

    menu.addEventListener('click', function(e) {
      if (e.target.nodeName !== 'LI') {
        return;
      }
      e.stopPropagation();
      var id = e.target.getAttribute('data-id');
      var src = e.target.getAttribute('data-menusource');
      if (src === 'user') {
        evt.detail.contextMenuItemSelected(id);
      } else if (src === 'default') {
        menuItems[id].selected(menuData.href);
      }
      document.body.removeChild(cover);
    });

    cover.addEventListener('click', function() {
      document.body.removeChild(cover);
    });

    document.body.appendChild(cover);
  },

  followLink: function browser_followLink(e) {
    e.preventDefault();
    if (e.target.nodeName === 'A') {
      this.navigate(e.target.getAttribute('href'));
    }
  },

  setTabVisibility: function(tab, visible) {
    if (ModalDialog.originHasEvent(tab.id)) {
      if (visible) {
        ModalDialog.show(tab.id);
      } else {
        ModalDialog.hide();
      }
    }
    // We put loading tabs off screen as we want to screenshot
    // them when loaded
    if (tab.loading && !visible) {
      tab.dom.style.top = '-999px';
      return;
    }
    if (tab.dom.setActive) {
      tab.dom.setActive(visible);
    }
    tab.dom.style.display = visible ? 'block' : 'none';
    tab.dom.style.top = '0px';
  },

  createTab: function browser_createTab(url, iframe) {
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.mozbrowser = true;

      if (url) {
        iframe.setAttribute('src', url);
      }
    }

    var browserEvents = ['loadstart', 'loadend', 'locationchange',
                         'titlechange', 'iconchange', 'contextmenu',
                         'securitychange', 'openwindow', 'close',
                         'showmodalprompt'];
    iframe.style.top = '-999px';

    // FIXME: content shouldn't control this directly
    iframe.setAttribute('remote', 'true');

    var tab = {
      id: 'tab_' + this.tabCounter++,
      dom: iframe,
      url: url || null,
      title: null,
      loading: false,
      screenshot: null,
      security: null
    };

    browserEvents.forEach(function attachBrowserEvent(type) {
      iframe.addEventListener('mozbrowser' +
        type, this.handleBrowserEvent(tab));
    }, this);

    this.tabs[tab.id] = tab;
    this.frames.appendChild(iframe);

    return tab.id;
  },

  deleteTab: function browser_deleteTab(id) {
    var tabIds = Object.keys(this.tabs);
    this.tabs[id].dom.parentNode.removeChild(this.tabs[id].dom);
    delete this.tabs[id];
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
    li.innerHTML = '<a><img /><span>New Tab</span></a>';
    li.style.height = '0px';
    li.style.transition = 'height 0.2s ease-in';
    ul.insertBefore(li, ul.childNodes[0]);

    li.addEventListener('transitionend', function() {
      // Pause so the user has time to see the new tab
      setTimeout(showTabCompleteFun, 100);
    });

    // TODO: remove setTimeout
    //   https://bugzilla.mozilla.org/show_bug.cgi?id=774642)
    setTimeout(function() {
      li.style.height = '';
    }, 50);
  },

  hideCurrentTab: function browser_hideCurrentTab() {
    var tab = this.currentTab;
    this.setTabVisibility(tab, false);
    this.throbber.classList.remove('loading');
  },

  selectTab: function browser_selectTab(id) {
    this.currentTab = this.tabs[id];
    // We may have picked a currently loading background tab
    // that was positioned off screen
    this.setUrlBar(this.currentTab.title);

    this.updateSecurityIcon();
    this.refreshButtons();
  },

  switchScreen: function browser_switchScreen(screen) {
    if (this.currentScreen === this.TABS_SCREEN) {
      this.screenSwipeMngr.gestureDetector.stopDetecting();
    }
    document.body.classList.remove(this.currentScreen);
    this.previousScreen = this.currentScreen;
    this.currentScreen = screen;
    document.body.classList.add(this.currentScreen);
  },

  showAwesomeScreen: function browser_showAwesomeScreen() {
    this.tabsBadge.innerHTML = '';
    // Ensure the user cannot interact with the browser until the
    // transition has ended
    var pageShown = (function() {
      this.inTransition = false;
      this.setUrlButtonMode(this.GO);
    }).bind(this);
    this.mainScreen.addEventListener('transitionend', pageShown, true);
    this.switchScreen(this.AWESOME_SCREEN);
    this.showTopSitesTab();
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
      var urlButton = this.currentTab.url ? this.REFRESH : this.GO;
      this.setUrlButtonMode(urlButton);
      this.throbber.classList.remove('loading');
    }

    this.switchScreen(this.PAGE_SCREEN);
    this.setUrlBar(this.currentTab.title || this.currentTab.url);
    this.updateTabsCount();
    this.inTransition = false;
  },

  showTabScreen: function browser_showTabScreen() {

    // TODO: We shouldnt hide the current tab when switching to the tab
    // screen, it should be visible in the gutter, but that currently triggers
    // https://bugzilla.mozilla.org/show_bug.cgi?id=777781
    this.hideCurrentTab();
    this.tabsBadge.innerHTML = '';

    var multipleTabs = Object.keys(this.tabs).length > 1;
    var ul = document.createElement('ul');

    for each(var tab in this.tabs) {
      var li = this.generateTabLi(tab);
      ul.appendChild(li);
    }

    this.tabsList.innerHTML = '';
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

    a.setAttribute('data-id', tab.id);
    preview.classList.add('preview');

    span.appendChild(text);
    a.appendChild(preview);
    a.appendChild(span);
    li.appendChild(a);

    if (tab.screenshot) {
      preview.style.backgroundImage = 'url(' + tab.screenshot + ')';
    }

    if (tab == this.currentTab) {
      li.classList.add('current');
    }

    return li;
  },

  showSettingsScreen: function browser_showSettingsScreen() {
    this.switchScreen(this.SETTINGS_SCREEN);
    this.clearHistoryButton.disabled = false;
  },

  showAboutPage: function browser_showAboutPage() {
    var tab = this.createTab(this.ABOUT_PAGE_URL);
    this.hideCurrentTab();
    this.selectTab(tab);
    this.setTabVisibility(this.currentTab, true);
    this.updateTabsCount();
    this.showPageScreen();
  },

  handleClearHistory: function browser_handleClearHistory() {
    var msg = navigator.mozL10n.get('confirm-clear-history');
    if (confirm(msg)) {
      Places.clearHistory((function() {
        this.clearHistoryButton.setAttribute('disabled', 'disabled');
      }).bind(this));
    }
  },

  screenSwipeMngr: {

    TRANSITION_SPEED: 1.8,
    TRANSITION_FRACTION: 0.75,
    DEFAULT_TRANSITION: '0.2s ease-in-out',

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
      this.tab = e.target;
      this.id = this.tab.getAttribute('data-id');
      this.containerWidth = this.tab.parentNode.clientWidth;
      // We cant delete the last tab
      this.deleteable = Object.keys(this.browser.tabs).length > 1;
      if (!this.deleteable || this.browser.inTransition) {
        return;
      }
      this.tab.classList.add('active');
      this.tab.style.MozTransition = '';
      this.tab.style.position = 'absolute';
      this.tab.style.width = e.target.parentNode.clientWidth + 'px';
    },

    pan: function tabSwipe_pan(e) {
      if (!this.deleteable || this.browser.inTransition) {
        return;
      }
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
      this.browser.selectTab(this.id);
      this.browser.showPageScreen();
    },

    swipe: function tabSwipe_swipe(e) {
      if (!this.deleteable || this.browser.inTransition) {
        return;
      }

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
      // First animate the tab offscreen
      this.tab.addEventListener('transitionend', function() {
        // Then animate the space dissapearing
        li.addEventListener('transitionend', function(e) {
          // Then delete everything
          browser.deleteTab(id);
          li.parentNode.removeChild(li);
        }, true);
        li.style.MozTransition = 'height ' + 100 + 'ms linear';
        li.style.height = '0px';
      }, true);
      this.tab.style.MozTransition = 'left ' + time + 'ms linear';
      this.tab.style.left = offset + 'px';
    }
  },

  handleActivity: function browser_handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    switch (activity.source.data.type) {
      case 'url':
        var url = this.getUrlFromInput(activity.source.data.url);
        this.selectTab(this.createTab(url));
        if (this.currentScreen !== this.PAGE_SCREEN) {
          this.showPageScreen();
        }
        break;
    }
  }
};

// Taken (and modified) from /apps/sms/js/searchUtils.js
// and /apps/sms/js/utils.js
var Utils = {
  createHighlightHTML: function ut_createHighlightHTML(text, searchRegExp) {
    if (!searchRegExp) {
      return text;
    }
    searchRegExp = new RegExp(searchRegExp, 'gi');
    var sliceStrs = text.split(searchRegExp);
    var patterns = text.match(searchRegExp);
    if (!patterns) {
      return text;
    }
    var str = '';
    for (var i = 0; i < patterns.length; i++) {
      str = str +
        Utils.escapeHTML(sliceStrs[i]) + '<span class="highlight">' +
        Utils.escapeHTML(patterns[i]) + '</span>';
    }
    str += Utils.escapeHTML(sliceStrs.pop());
    return str;
  },

  escapeHTML: function ut_escapeHTML(str, escapeQuotes) {
    var span = document.createElement('span');
    span.textContent = str;

    // Escape space for displaying multiple space in message.
    span.innerHTML = span.innerHTML.replace(/\s/g, '&nbsp;');

    if (escapeQuotes)
      return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    return span.innerHTML;
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});

window.navigator.mozSetMessageHandler('activity', function actHandle(activity) {
  if (Browser.hasLoaded) {
    Browser.handleActivity(activity);
  } else {
    Browser.waitingActivities.push(activity);
  }
  activity.postResult({ status: 'accepted' });
});
