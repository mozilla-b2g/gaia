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

  currentScreen: null,
  PAGE_SCREEN: 0,
  TABS_SCREEN: 1,

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

    this.tabsBadge = document.getElementById('tabs-badge');
    this.throbber = document.getElementById('throbber');
    this.frames = document.getElementById('frames');
    this.tabsList = document.getElementById('tabs-list');
    this.mainScreen = document.getElementById('main-screen');

    // Add event listeners
    window.addEventListener('submit', this);
    window.addEventListener('keyup', this, true);
    window.addEventListener('resize', this.handleWindowResize.bind(this));

    this.backButton.addEventListener('click', this.goBack.bind(this));
    this.urlButton.addEventListener('click', this.go.bind(this));
    this.forwardButton.addEventListener('click', this.goForward.bind(this));
    this.urlInput.addEventListener('focus', this.urlFocus.bind(this));
    this.urlInput.addEventListener('blur', this.urlBlur.bind(this));
    this.history.addEventListener('click', this.followLink.bind(this));
    this.tabsBadge.addEventListener('click',
      this.handleTabsBadgeClicked.bind(this));
    this.tabsList.addEventListener('click',
      this.handleTabClicked.bind(this));
    this.mainScreen.addEventListener('click',
      this.handlePageScreenClicked.bind(this));

    this.handleWindowResize();

    // Load homepage once GlobalHistory is initialised
    // (currently homepage is blank)
    GlobalHistory.init((function() {
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
    var translate = 'translateX(-' + (window.innerWidth - 50) + 'px)';
    if (!this.cssTranslateId) {
      var css = '.tabs-screen #main-screen { -moz-transform: ' +
        translate + ';}';
      var insertId = this.styleSheet.cssRules.length - 1;
      this.cssTranslateId = this.styleSheet.insertRule(css, insertId);
    } else {
      var rule = this.styleSheet.cssRules[this.cssTranslateId];
      rule.style.MozTransform = translate;
    }
  },

  // Tabs badge is the button at the top left, used to show the number of tabs
  // and to create new ones
  handleTabsBadgeClicked: function browser_handleTabsBadgeClicked() {
    if (this.currentScreen === this.TABS_SCREEN) {
      var tabId = this.createTab();
      this.selectTab(tabId);
      this.urlInput.focus();
      this.showPageScreen();
      return;
    }
    this.showTabScreen();
  },

  handleTabClicked: function browser_handleTabClicked(e) {
    var id = e.target.getAttribute('data-id');
    if (!id) {
      return;
    }
    if (e.target.nodeName === 'INPUT') {
      var tabs = Object.keys(this.tabs);
      if (tabs.length > 1) {
        this.deleteTab(id);
        this.selectTab(Object.keys(this.tabs)[0]);
        this.showTabScreen();
      }
    } else if (e.target.nodeName === 'A') {
      this.selectTab(id);
      this.showPageScreen();
    }
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
        break;

      case 'mozbrowserlocationchange':
        tab.url = evt.detail;
        this.updateHistory(evt.detail);
        if (isCurrentTab) {
          this.urlInput.value = tab.url;
        }
        break;

      case 'mozbrowsertitlechange':
        if (evt.detail) {
          tab.title = evt.detail;
          GlobalHistory.setPageTitle(tab.url, tab.title);
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
          this.getIcon(tab.iconUrl, function(icon) {
            GlobalHistory.setPageIcon(tab.url, icon);
          });

        }

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
        if (!this.currentTab || !this.currentTab.session.backLength() ||
          evt.keyCode != evt.DOM_VK_ESCAPE)
          break;

        this.goBack();
        evt.preventDefault();
        break;
    }
  },

  getIcon: function browser_getIcon(iconUrl, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', iconUrl, true);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function() {
      if (xhr.status === 200) {
        var blob = xhr.response;
        callback(blob);
      }
    }, false);
    xhr.send();
  },

  navigate: function browser_navigate(url) {
    this.awesomescreen.classList.add('hidden');
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
    var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
    var protocol = protocolRegexp.exec(url);
    if (!protocol) {
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
    this.currentTab.session.back();
    this.refreshButtons();
  },

  goForward: function browser_goForward() {
    this.currentTab.session.forward();
    this.refreshButtons();
  },

  refreshButtons: function() {
    this.backButton.disabled = !this.currentTab.session.backLength();
    this.forwardButton.disabled = !this.currentTab.session.forwardLength();
  },

  updateHistory: function browser_updateHistory(url) {
    this.currentTab.session.pushState(null, '', url);
    GlobalHistory.addVisit(url);
    this.refreshButtons();
  },

  urlFocus: function browser_urlFocus() {
    this.urlInput.value = this.currentTab.url;
    this.urlInput.select();
    this.setUrlButtonMode(this.GO);
    this.awesomescreen.classList.remove('hidden');
    GlobalHistory.getHistory(this.showGlobalHistory.bind(this));
  },

  urlBlur: function browser_urlBlur() {
    this.urlInput.value = this.currentTab.title || this.currentTab.url;
  },

  setUrlButtonMode: function browser_setUrlButtonMode(mode) {
    this.urlButtonMode = mode;
    switch (mode) {
      case this.GO:
        this.urlButton.src = 'style/images/go.png';
        this.urlButton.style.visibility = 'visible';
        break;
      case this.REFRESH:
        this.urlButton.src = 'style/images/refresh.png';
        this.urlButton.style.visibility = 'visible';
        break;
      case this.STOP:
        // Dont currently have a stop button
        this.urlButton.style.visibility = 'hidden';
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
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + visit.uri + '"><span>' +
        (visit.title ? visit.title : visit.uri) +
        '</span><small>' + visit.uri + '</small></a>';
      this.history.lastChild.appendChild(li);
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

  followLink: function browser_followLink(e) {
    e.preventDefault();
    this.navigate(e.target.parentNode.getAttribute('href'));
  },

  createTab: function browser_createTab() {
    var iframe = document.createElement('iframe');
    var browserEvents = ['loadstart', 'loadend', 'locationchange',
      'titlechange', 'iconchange'];
    iframe.mozbrowser = true;
    // FIXME: content shouldn't control this directly
    iframe.setAttribute('remote', 'true');
    iframe.style.display = 'none';

    var tab = {
      id: 'tab_' + this.tabCounter++,
      dom: iframe,
      url: null,
      title: null,
      loading: false,
      session: new SessionHistory(),
      screenshot: null
    };

    browserEvents.forEach((function attachBrowserEvent(type) {
      iframe.addEventListener('mozbrowser' +
        type, this.handleBrowserEvent(tab));
    }).bind(this));

    this.tabs[tab.id] = tab;
    this.frames.appendChild(iframe);

    return tab.id;
  },

  deleteTab: function browser_deleteTab(id) {
    this.tabs[id].dom.parentNode.removeChild(this.tabs[id].dom);
    delete this.tabs[id];
    if (this.currentTab.id === id) {
      this.currentTab = null;
    }
  },

  hideCurrentTab: function browser_hideCurrentTab() {
    var tab = this.currentTab;
    if (tab.dom.getScreenshot) {
      // We move the page offscreen so we can take a screenshot while the
      // layout is still active
      tab.dom.style.top = '-999px';
      tab.dom.getScreenshot().onsuccess = function(e) {
        tab.dom.style.display = 'none';
        tab.dom.style.top = '0px';
        tab.screenshot = e.target.result;
        img.src = e.target.result;
      }
    } else {
      tab.dom.style.display = 'none';
    }
    this.throbber.classList.remove('loading');
    this.currentTab = null;
  },

  selectTab: function browser_selectTab(id) {
    if (this.currentTab !== null && this.currentTab.id !== id) {
      this.hideCurrentTab();
    }

    this.currentTab = this.tabs[id];
    this.currentTab.dom.style.display = 'block';
    this.currentTab.dom.style.top = '0px';
    this.urlInput.value = this.currentTab.title;

    if (this.currentTab.loading) {
      this.throbber.classList.add('loading');
    }
    this.refreshButtons();
  },

  showPageScreen: function browser_showPageScreen() {
    document.body.classList.remove('tabs-screen');
    this.currentScreen = this.PAGE_SCREEN;
    this.tabsBadge.innerHTML = Object.keys(this.tabs).length;
  },

  fetchScreenshot: function browser_fetchScreenshot(tab, img) {
    if (tab.dom.getScreenshot) {
      tab.dom.getScreenshot().onsuccess = function(e) {
        img.src = e.target.result;
      }
    }
  },

  showTabScreen: function browser_showTabScreen() {
    this.currentScreen = this.TABS_SCREEN;
    this.tabsBadge.innerHTML = '+';
    this.awesomescreen.classList.add('hidden');
    this.urlInput.blur();

    var ul = document.createElement('ul');
    for (var tab in this.tabs) {
      var title = this.tabs[tab].title || this.tabs[tab].url || 'New Tab';
      var a = document.createElement('a');
      var li = document.createElement('li');
      var span = document.createElement('span');
      var img = document.createElement('img');
      var input = document.createElement('input');
      var text = document.createTextNode(title);

      input.value = '✕';
      input.type = 'button';
      input.classList.add('close');
      input.setAttribute('data-id', this.tabs[tab].id);
      a.setAttribute('data-id', this.tabs[tab].id);

      span.appendChild(text);
      a.appendChild(img);
      a.appendChild(span);
      li.appendChild(a);
      li.appendChild(input);
      ul.appendChild(li);

      // Inactive tabs will have stored screenshots, current active tab
      // has screenshot captured on display
      if (this.tabs[tab].screenshot && tab !== this.currentTab.id) {
        img.setAttribute('src', this.tabs[tab].screenshot);
      }

      if (tab === this.currentTab.id) {
        li.classList.add('current');
        this.fetchScreenshot(this.tabs[tab], img);
      }

    }
    this.tabsList.innerHTML = '';
    this.tabsList.appendChild(ul);

    document.body.classList.add('tabs-screen');
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});
