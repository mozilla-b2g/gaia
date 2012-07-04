'use strict';

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

  DEFAULT_FAVICON: 'style/images/favicon.png',

  urlButtonMode: null,

  init: function browser_init() {
    // Assign UI elements to variables
    this.toolbarStart = document.getElementById('toolbar-start');
    this.urlBar = document.getElementById('url-bar');
    this.urlInput = document.getElementById('url-input');
    this.urlButton = document.getElementById('url-button');
    this.content = document.getElementById('browser-content');
    this.awesomescreen = document.getElementById('awesomescreen');
    this.history = document.getElementById('history');
    this.backButton = document.getElementById('back-button');
    this.forwardButton = document.getElementById('forward-button');
    this.sslIndicator = document.getElementById('ssl-indicator');

    this.tabsBadge = document.getElementById('tabs-badge');
    this.throbber = document.getElementById('throbber');
    this.frames = document.getElementById('frames');
    this.tabsList = document.getElementById('tabs-list');
    this.mainScreen = document.getElementById('main-screen');
    this.tabCover = document.getElementById('tab-cover');

    // Add event listeners
    window.addEventListener('submit', this);
    window.addEventListener('keyup', this, true);
    window.addEventListener('resize', this.handleWindowResize.bind(this));

    this.backButton.addEventListener('click', this.goBack.bind(this));
    this.urlButton.addEventListener('click', this.go.bind(this));
    this.forwardButton.addEventListener('click', this.goForward.bind(this));
    this.urlInput.addEventListener('focus', this.urlFocus.bind(this));
    this.history.addEventListener('click', this.followLink.bind(this));
    this.tabsBadge.addEventListener('click',
      this.handleTabsBadgeClicked.bind(this));

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

    // Load homepage once Places is initialised
    // (currently homepage is blank)
    Places.init((function() {
      this.selectTab(this.createTab());
      this.showPageScreen();
    }).bind(this));
  },

  // Clicking the page preview on the left gutter of the tab page opens
  // that page
  handlePageScreenClicked: function browser_handlePageScreenClicked(e) {
    if (this.currentScreen === this.TABS_SCREEN) {
      this.showPageScreen();
    }
  },

  // We want to ensure the current page preview on the tabs screen is in
  // a consistently sized gutter on the left
  handleWindowResize: function browser_handleWindowResize() {
    var leftPos = -(window.innerWidth - 50) + 'px';
    if (!this.gutterPosRule) {
      var css = '.tabs-screen #main-screen { left: ' + leftPos + ' }';
      var insertId = this.styleSheet.cssRules.length - 1;
      this.gutterPosRule = this.styleSheet.insertRule(css, insertId);
    } else {
      var rule = this.styleSheet.cssRules[this.gutterPosRule];
      rule.style.left = leftPos;
    }
  },

  // Tabs badge is the button at the top left, used to show the number of tabs
  // and to create new ones
  handleTabsBadgeClicked: function browser_handleTabsBadgeClicked() {
    if (this.currentScreen === this.TABS_SCREEN) {
      var tabId = this.createTab();
      this.selectTab(tabId);
      this.showAwesomeScreen();
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
        if (isCurrentTab) {
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
        if (isCurrentTab) {
          this.throbber.classList.remove('loading');
          this.urlInput.value = tab.title;
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
          this.urlInput.value = tab.url;
        }
        break;

      case 'mozbrowsertitlechange':
        if (evt.detail) {
          tab.title = evt.detail;
          Places.setPageTitle(tab.url, tab.title);
          if (isCurrentTab && !tab.loading) {
            this.urlInput.value = tab.title;
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
      }
    }).bind(this);
  },

  handleEvent: function browser_handleEvent(evt) {
    var urlInput = this.urlInput;
    switch (evt.type) {
      case 'submit':
        this.go(evt);
        break;

      case 'keyup':
        if (evt.keyCode === evt.DOM_VK_ESCAPE) {
          evt.preventDefault();
          this.showPageScreen();
          this.urlInput.blur();
        }
    }
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
    this.urlInput.value = url;
  },

  go: function browser_go(e) {
    if (e) {
      e.preventDefault();
    }

    if (this.urlButtonMode == this.REFRESH) {
      this.navigate(this.currentTab.url);
      return;
    }

    var url = this.urlInput.value.trim();
    // If the address entered starts with a quote then search, if it
    // contains a . or : then treat as a url, else search
    var isSearch = /^"|\'/.test(url) || !(/\.|\:/.test(url));
    var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
    var protocol = protocolRegexp.exec(url);

    if (isSearch) {
      url = 'http://www.bing.com/search?q=' + url;
    } else if (!protocol) {
      url = 'http://' + url;
    }

    if (url != this.currentTab.url) {
      this.urlInput.value = url;
      this.currentTab.url = url;
    }
    this.navigate(url);
    this.urlInput.blur();
  },

  goBack: function browser_goBack() {
    this.currentTab.dom.goBack();
    this.refreshButtons();
  },

  goForward: function browser_goForward() {
    this.currentTab.dom.goForward();
    this.refreshButtons();
  },

  refreshButtons: function browser_refreshButtons() {
    this.currentTab.dom.getCanGoBack().onsuccess = (function(e) {
      this.backButton.disabled = !e.target.result;
    }).bind(this);
    this.currentTab.dom.getCanGoForward().onsuccess = (function(e) {
      this.forwardButton.disabled = !e.target.result;
    }).bind(this);
  },

  updateHistory: function browser_updateHistory(url) {
    Places.addVisit(url);
    this.refreshButtons();
  },

  urlFocus: function browser_urlFocus() {
    if (this.currentScreen === this.PAGE_SCREEN) {
      this.urlInput.value = this.currentTab.url;
      this.urlInput.select();
      this.showAwesomeScreen();
    }
  },

  setUrlButtonMode: function browser_setUrlButtonMode(mode) {
    this.urlButtonMode = mode;
    switch (mode) {
      case this.GO:
        this.urlButton.src = 'style/images/go.png';
        this.urlButton.style.display = 'block';
        break;
      case this.REFRESH:
        this.urlButton.src = 'style/images/refresh.png';
        this.urlButton.style.display = 'block';
        break;
      case this.STOP:
        // Dont currently have a stop button
        this.urlButton.style.display = 'none';
        break;
    }
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

    visits.forEach(function browser_processVisit(visit) {
       var timestamp = visit.timestamp;
       // Draw new heading if new threshold reached
       if (timestamp > 0 && timestamp < thresholds[threshold]) {
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
           month = timestampDate.getMonth();
           year = timestampDate.getFullYear();
           this.drawHistoryHeading(threshold, timestamp);
         }
      }
      this.drawHistoryEntry(visit);
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

  drawHistoryEntry: function browser_drawHistoryEntry(visit) {
    var entry = document.createElement('li');
    var link = document.createElement('a');
    var title = document.createElement('span');
    var url = document.createElement('small');
    link.href = visit.uri;
    title.textContent = visit.title ? visit.title : visit.uri;
    url.textContent = visit.uri;
    link.appendChild(title);
    link.appendChild(url);
    entry.appendChild(link);
    this.history.lastChild.appendChild(entry);

    if (!visit.iconUri) {
      link.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
      return;
    }

    Places.db.getIcon(visit.iconUri, (function(icon) {
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
    //TODO: localise
    const LABELS = [
      'Future',
      'Today',
      'Yesterday',
      'Last 7 Days',
      'This Month',
      'Last 6 Months',
      'Older than 6 Months'
    ];

    var text = '';
    var h3 = document.createElement('h3');

    // Special case for month headings
    if (threshold == 5 && timestamp) {
      var date = new Date(timestamp);
      var now = new Date();
      text = DateHelper.MONTHS[date.getMonth()];
      if (date.getFullYear() != now.getFullYear())
        text += ' ' + date.getFullYear();
    } else {
      text = LABELS[threshold];
    }

    var textNode = document.createTextNode(text);
    h3.appendChild(textNode);
    var ul = document.createElement('ul');
    this.history.appendChild(h3);
    this.history.appendChild(ul);
  },

  openInNewTab: function browser_openInNewTab(url) {
    this.createTab(url);
    this.tabsBadge.innerHTML = Object.keys(this.tabs).length;
  },

  showContextMenu: function browser_showContextMenu(evt) {

    var ctxDefaults = {
      'A' : {
        'open_in_tab': {
          src: 'default',
          label: 'Open link in New Tab',
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

  createTab: function browser_createTab(url) {
    var iframe = document.createElement('iframe');
    var browserEvents = ['loadstart', 'loadend', 'locationchange',
                         'titlechange', 'iconchange', 'contextmenu',
                         'securitychange'];
    iframe.mozbrowser = true;
    // FIXME: content shouldn't control this directly
    iframe.setAttribute('remote', 'true');
    iframe.style.top = '-999px';
    if (url) {
      iframe.setAttribute('src', url);
    }

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

  hideCurrentTab: function browser_hideCurrentTab() {
    var tab = this.currentTab;
    this.setTabVisibility(tab, false);
    this.throbber.classList.remove('loading');
  },

  selectTab: function browser_selectTab(id) {
    this.currentTab = this.tabs[id];
    // We may have picked a currently loading background tab
    // that was positioned off screen
    this.urlInput.value = this.currentTab.title;
    this.tabCover.setAttribute('src', this.currentTab.screenshot);

    if (this.currentTab.loading) {
      this.throbber.classList.add('loading');
    }
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
    Places.getHistory(this.showGlobalHistory.bind(this));
    this.urlInput.focus();
    this.setUrlButtonMode(this.GO);
    this.tabsBadge.innerHTML = '';
    this.switchScreen(this.AWESOME_SCREEN);
    this.tabCover.style.display = 'none';
  },

  showPageScreen: function browser_showPageScreen() {
    if (this.currentScreen === this.TABS_SCREEN) {
      var hideCover = (function browser_hideCover() {
        this.tabCover.removeAttribute('src');
        this.tabCover.style.display = 'none';
      }).bind(this);

      var switchLive = (function browser_switchLive() {
        this.mainScreen.removeEventListener('transitionend', switchLive, true);
        this.setTabVisibility(this.currentTab, true);
        // Give the page time to render to avoid a flash when switching
        // TODO: remove
        setTimeout(hideCover, 250);
      }).bind(this);
      this.mainScreen.addEventListener('transitionend', switchLive, true);
    } else {
      this.setTabVisibility(this.currentTab, true);
    }
    this.switchScreen(this.PAGE_SCREEN);
    this.urlInput.value = this.currentTab.title || this.currentTab.url;
    this.tabsBadge.innerHTML = Object.keys(this.tabs).length + '&#x203A;';
  },

  showTabScreen: function browser_showTabScreen() {

    this.hideCurrentTab();
    this.tabsBadge.innerHTML = '';

    this.tabCover.setAttribute('src', this.currentTab.screenshot);
    this.tabCover.style.display = 'block';

    var multipleTabs = Object.keys(this.tabs).length > 1;
    var ul = document.createElement('ul');

    for (var tab in this.tabs) {
      var title = this.tabs[tab].title || this.tabs[tab].url || 'New Tab';
      var a = document.createElement('a');
      var li = document.createElement('li');
      var span = document.createElement('span');
      var img = document.createElement('img');
      var text = document.createTextNode(title);

      a.setAttribute('data-id', this.tabs[tab].id);

      span.appendChild(text);
      a.appendChild(img);
      a.appendChild(span);
      li.appendChild(a);
      ul.appendChild(li);

      if (this.tabs[tab].screenshot) {
        img.setAttribute('src', this.tabs[tab].screenshot);
      }

      if (this.tabs[tab] == this.currentTab)
        li.classList.add('current');
    }
    this.tabsList.innerHTML = '';
    this.tabsList.appendChild(ul);
    this.switchScreen(this.TABS_SCREEN);
    this.screenSwipeMngr.gestureDetector.startDetecting();
    new GestureDetector(ul).startDetecting();
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
      this.screen.style.left = -(this.winWidth - 50) +
        e.detail.absolute.dx + 'px';
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
      this.screen.style.left = '';
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
      if (!this.deleteable) {
        return;
      }
      this.tab.classList.add('active');
      this.tab.style.MozTransition = '';
      this.tab.style.position = 'absolute';
      this.tab.style.width = e.target.parentNode.clientWidth + 'px';
    },

    pan: function tabSwipe_pan(e) {
      if (!this.deleteable) {
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
      this.browser.selectTab(this.id);
      this.browser.showPageScreen();
    },

    swipe: function tabSwipe_swipe(e) {
      if (!this.deleteable) {
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
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});
