'use strict';

/* exported _ */
/* global AuthenticationDialog */
/* global Awesomescreen */
/* global BrowserDB */
/* global BrowserDialog */
/* global SearchResult */
/* global SearchUtil */
/* global Settings */
/* global Toolbar */
/* global UrlHelper */

var _ = navigator.mozL10n.get;

var Browser = {

  currentInfo: null,
  info: {},

  DEFAULT_LANG: 'en-US',
  language: null,

  SCREEN_HEIGHT: 1080,
  SCREEN_WIDTH: 1920,
  SIDE_WINDOW_WIDTH: 400,
  MAX_THUMBNAIL_WIDTH: 448, //storage change
  MAX_THUMBNAIL_HEIGHT: 236, //storage change
  //By multiplying 0.8, image of the designated size can be obtained
  DEVICE_RATIO: 0.8,

  MAX_BOOKMARK_LIST: 60,
  MAX_HISTORY_LIST: 60,
  MAX_TOPSITE_LIST: 18,
  MAX_ICON_LIST: 120,

  waitingActivities: [],
  hasLoaded: false,

  // < category >
  // 1 : web search
  // 2 : image search
  // 3 : movie search
  // 4 : news search
  // 5 : map search
  category: 1,
  categoryTbl: [
    {'category':'internet', 'id': 1},
    {'category':'image'   , 'id': 2},
    {'category':'video'   , 'id': 3},
    {'category':'news'    , 'id': 4},
    {'category':'maps'    , 'id': 5},
  ],

  // < keyword >
  keyword: '',

  // Country code
  DEFAULT_COUNTRY: 'US',
  country: null,

  // color bar
  colorBar: null,

  // start page url
  start_page_url: '',

  // tabcount
  tabCounter: 0,

  // private browsing
  privateBrowsing: false,

  cursorMode: true,

  // auto scroll cursor direction
  direction: null,

  returnApp: null,
  returnOpt: null,

  // Suspend flag
  isSuspend: false,

  /**
   * Debug
   */
  DEBUG: false,
  debug: function debug(msg) {
    if (this.DEBUG) {
      var output = '##### [DEBUG BROWSER] ##### : ' + msg;
      console.log(output);
    }
  },

  //
  // Initialize
  //
  init: function browser_init() {
    // Get elements
    this.getAllElements();
    this.isSuspend = false;

    // key hook
    document.addEventListener('keydown', this.keyHook.bind(this), true);
    // mouse move
    document.addEventListener('mousemove', this.mouseMove.bind(this), false);
    // key press
    document.addEventListener('keypress', this.keypress.bind(this), true);


    // init bookmark dialog
    Awesomescreen.init();

    // init database
    BrowserDB.init((function() {
      // init screen mode(side, full)
      this.initScreenMode();

      // init database MaxNum Check
      this.initIdbCheck();

      // XXX: Remove country dependency here.
      // get Country
      this.getCountry((function() {
        // get Language
        this.getLanguage();
        // get color bar
        this.getColorBar();
        // init search util
        this.initSearchUtil();
        // init settings list
        Settings.init();
        // init Toolbar
        Toolbar.init();

        BrowserDB.getBookmarks(this.populateBookmarks.bind(this));

        // init create
        this.selectInfo(this.createIframe());

        // init tab setting
        Awesomescreen.isTabSetting();

      }).bind(this));
    }).bind(this));

    // init authentication dialog
    AuthenticationDialog.init();

    // init dialog
    BrowserDialog.init();

    // init SearchResult
    SearchResult.init();

    if (this.waitingActivities.length) {
      this.waitingActivities.forEach(this.handleActivity, this);
    }
    this.hasLoaded = true;
  },

  mouseMove: function browser_mouseMove(ev) {

    if(Toolbar.sidebarButtonBlock.dataset.fade == 'true') {
      Toolbar.sidebarButtonBlock.dataset.fade = 'false';
    }

    var rangeX = (Browser.sideBlock.dataset.sidebar == 'true')? 400: 0;
    if(ev.clientX == 0) {
      this.startScroll('left');
    } else if(ev.clientX == 1919) {
      this.startScroll('right');
    } else if(ev.clientY == 0 && ev.clientX >= rangeX) {
      this.startScroll('up');
    } else if(ev.clientY == 1079 && ev.clientX >= rangeX) {
      this.startScroll('down');
    } else {
      this.stopScroll();
    }
    if(Awesomescreen.pointerImg.style.display == 'block') {
      Awesomescreen.pointerImg.style.display = 'none';
      document.activeElement.blur();
    }

    if( Awesomescreen.isDisplayed() ) {
      Awesomescreen.blurFlag = true;
      if( Awesomescreen.bmtitleArea.classList.contains('exfocus') ) {
        Awesomescreen.bmtitleArea.classList.remove('exfocus');
      }
    }

    if( Awesomescreen.isFocusCheck() ) {
      document.activeElement.blur();
    }

    if( BrowserDialog.isDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      if(document.activeElement.nodeName != 'INPUT') {
        document.activeElement.blur();
      }
      if( BrowserDialog.browserDialogInput.classList.contains('exfocus') ) {
        BrowserDialog.browserDialogInput.classList.remove('exfocus');
      }
    }
    if( AuthenticationDialog.isDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      if(document.activeElement.nodeName != 'INPUT') {
        document.activeElement.blur();
      }
      if( AuthenticationDialog.httpAuthenticationUsername.classList.contains('exfocus') ) {
        AuthenticationDialog.httpAuthenticationUsername.classList.remove('exfocus');
      }
      if( AuthenticationDialog.httpAuthenticationPassword.classList.contains('exfocus') ) {
        AuthenticationDialog.httpAuthenticationPassword.classList.remove('exfocus');
      }
    }
    if( Settings.isDialogHomepageDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      if(document.activeElement.nodeName != 'INPUT') {
        document.activeElement.blur();
      }
      if( Settings.settingsDialogHomepageInput.classList.contains('exfocus') ) {
        Settings.settingsDialogHomepageInput.classList.remove('exfocus');
      }
    }
    if( Settings.isDialogSearchDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      document.activeElement.blur();
    }
  },

  startScroll: function browser_startScroll(direction) {
    // Timeout when no key operation
    if(this.mouseMoveTID) {
      clearTimeout(this.mouseMoveTID);
    }
    this.mouseMoveTID = setTimeout(function(){
      clearTimeout(this.mouseMoveTID);
      Browser.stopScroll();
    }, 100);

    if(this.direction != direction) {
      this.direction = direction;
      var scroll_val = (direction == 'up' || direction == 'left')? -10: 10;
      var scroll_cnt = 0;
      var add_val = 0;

      var scroll_run = (function() {
        if(scroll_cnt < 13){
          scroll_cnt++;
          add_val += 5;
          if(scroll_val > 0){
            scroll_val += add_val;
          }else{
            scroll_val -= add_val;
          }
        }
        if(Browser.direction == 'up' || Browser.direction == 'down'){
          Browser.currentInfo.dom.scrollBy(0, scroll_val);
        }else{
          Browser.currentInfo.dom.scrollBy(scroll_val, 0);
        }
      });

      // first run
      //scroll_run();

      if(this.scrollingTID) {
        clearInterval(this.scrollingTID);
      }
      // scrolling timer set
      this.scrollingTID = setInterval(function(){
        scroll_run();
      }, 200);
    }
  },

  stopScroll: function browser_stopScroll() {
    this.direction = 'default';
    if(this.scrollingTID) {
      clearInterval(this.scrollingTID);
    }
  },

  /**
   * init screen mode
   */
  initScreenMode: function browser_initScreenMode() {
    BrowserDB.db.open((function() {
      BrowserDB.getSetting('screen_mode', ((function(result) {
        if(!result || result === 'full') {
          // Full screen
          Browser.sideBlock.dataset.sidebar = 'false';
          Browser.mainBlock.dataset.sidebar = 'false';
          if(!result) {
            // save screen mode
            BrowserDB.updateSetting('full', 'screen_mode');
          }
        } else if (result === 'side') {
          // Disp side screen
          Browser.sideBlock.dataset.sidebar = 'true';
          Browser.mainBlock.dataset.sidebar = 'true';
        }
      }).bind(this)));
    }).bind(this));
  },

 /**
  * init database MaxNum Check
  */
  initIdbCheck: function browser_initIdbCheck() {

    // indexedDB MaxNum Check Type
    var checkTypeTbl = [
      {'type':'bookmarks', 'maxNum': Browser.MAX_BOOKMARK_LIST},
      {'type':'visits'   , 'maxNum': Browser.MAX_HISTORY_LIST},
      {'type':'places'   , 'maxNum': Browser.MAX_TOPSITE_LIST},
      {'type':'icons'    , 'maxNum': Browser.MAX_ICON_LIST}
    ];

    for (var i=0; i < checkTypeTbl.length; i++) {
      if(checkTypeTbl[i].type != 'icons') {
        BrowserDB.db.idbMaxCheck(checkTypeTbl[i].type, checkTypeTbl[i].maxNum);
      }else{
        BrowserDB.db.iconMaxCheck(checkTypeTbl[i].maxNum);
      }
    }
  },


 /**
  * Get default data generated at build time.
  * Invoked by BrowserDB.
  */
  getDefaultData: function browser_getConfData(callback) {
    // TODO
    callback(null);
  },
  getConfigurationData: function browser_getDefaultData(variant, callback) {
    // TODO
    callback(null);
  },

  /**
   * init search util
   */
  initSearchUtil: function browser_initSearchUtil() {
    SearchUtil.init(this.country, (function(){
      // display search bar engine name
      Toolbar.setSearchEngine();
    }).bind(this));
  },
  getLanguageUrl: function browser_getLanguageUrl() {
    var url_str = '';
    // processing of the engine
    var engineName = SearchUtil.getCurrentEngineName();
    var low = engineName.toLowerCase();
    switch(low){
      case "google":
        if((this.language.substr(0,2) == "pt") ||
           (this.language.substr(0,2) == "zh")){
          url_str = "&hl=" + this.language;
        }else{
          url_str = "&hl=" + this.language.substr(0,2);
        }
        break;
      case "bing":
        url_str = "&Market=" + this.language;
        break;
      case "baido":
        break;
      default:
        break;
    }
    return url_str;
  },
  keywordSearch: function browser_keywordSearch(param) {
    var action_id = {
      'internet': 0, 'image': 1, 'video': 2, 'news': 3, 'maps': 4, 'youtube': 5,
    };
    var index = (param.browser_param.id in action_id)?
        action_id[param.browser_param.id]: 0;
    var urlStr = SearchUtil.getCurrentSearchUrl();
    var url = urlStr[index];
    if(param.keywords) {
      url += encodeURIComponent(param.keywords[0].word);
    } else {
      url = url.replace(/&q=/g, '');
    }
    url += this.getLanguageUrl();
    this.debug('search url = ' + url);
    this.navigate(url);
  },

  /**
   * Set cursor pan mode.
   */
  setCursorPanMode: function browser_setCursorPanMode(mode) {
    this.mainBlock.dataset.mode = mode;
  },

  /**
   * Get cursor pan mode.
   */
  getCursorPanMode: function browser_getCursorPanMode() {
    return this.mainBlock.dataset.mode;
  },

  /**
   * Init Start Browsing
   */
  initStartBrowsing: function browser_initStartBrowsing() {
    if( this.currentInfo.url == null ) return;
    Toolbar.initStartBrowsing();
  },

  /**
   * Refresh state of Back Forward buttons.
   */
  refreshBackForwardButtons: function browser_refreshBackForwardButtons() {
    // When handling window.open we may hit this code
    // before canGoBack etc has been applied to the frame
    if (!this.currentInfo.dom.getCanGoForward){
      return;
    }

    Toolbar.backButton.classList.remove('disable');

    this.currentInfo.dom.getCanGoForward().onsuccess = (function(ev) {
      Toolbar.forwardButtonBlock.classList.remove('disable');
      if(!ev.target.result){
        Toolbar.forwardButtonBlock.classList.add('disable');
      }
    }).bind(this);
  },

  /**
   * Refresh state of add bookmark button based on current info URL.
   */
  refreshBookmarkButton: function browser_refreshBookmarkButton() {
    if( this.currentInfo.url == null ) {
      Toolbar.bookmarkButton.dataset.isbookmark = false;
      return;
    }
    BrowserDB.getBookmark(this.currentInfo.url, (function(bookmark) {
      if(bookmark) {
        Toolbar.bookmarkButton.dataset.isbookmark = true;
        Toolbar.bookmarkButtonBlock.dataset.tips = 'WB_LT_W_BOOKMARK_DELETE';
      } else {
        Toolbar.bookmarkButton.dataset.isbookmark = false;
        Toolbar.bookmarkButtonBlock.dataset.tips = 'WB_LT_TIPS_BOOKMARK_THIS_PAGE';
      }
    }).bind(this));
  },

  /**
   * Refresh state of scroll cursor.
   */
  refreshScrollCursor: function browser_refreshScrollCursor() {
    this.scrollU.classList.remove('disable');
    this.scrollD.classList.remove('disable');
    this.scrollL.classList.remove('disable');
    this.scrollR.classList.remove('disable');
    if (!this.currentInfo.url) {
      this.scrollU.classList.add('disable');
      this.scrollD.classList.add('disable');
      this.scrollL.classList.add('disable');
      this.scrollR.classList.add('disable');
      return;
    }
  },

  refreshBrowserParts: function browser_refreshBrowserParts() {
    Browser.refreshBackForwardButtons();
    Browser.refreshBookmarkButton();
    Browser.refreshScrollCursor();
    if(( Browser.currentInfo.loading ) && ( !Browser.isSuspend )) {
      Toolbar.showLoadingIcon();
    } else {
      Toolbar.hiddenLoadingIcon();
    }
  },

  // Add Bookmark Current url
  addBookmark: function browser_addBookmark(ev) {
    if(Toolbar.bookmarkButton.classList.contains('disable')){
      return;
    }

    if(ev) {
      // Can be canceled
      ev.preventDefault();
    }
    if (!this.currentInfo.url || UrlHelper.isNotURL(this.currentInfo.url)){
      return;
    }

    //and the process proceeds to awesomescreen 20150106 update
    BrowserDB.getBookmarks(Awesomescreen.addBookmarkSite.bind(this));
  },
  // Bookmark animation end
  bookmarkButtonAnimeEnd: function browser_bookmarkButtonAnimeEnd(ev) {
    Toolbar.bookmarkButtonAnime.dataset.anime = 'end';
    Toolbar.showBookmarksButtonAnime.dataset.anime = 'end';
    Toolbar.showBookmarksButton.style.display = 'block';
  },

  /**
   * CamelCase (xxx_yyy -> xxxYyy)
   */
  toCamelCase: function toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  /**
   * Get All Elements (from id)
   */
  getAllElements: function browser_getAllElements() {
    var elementIDs = [
      'fade-base',

      'side-block',
      'main-block',
      'web-block',

      'scroll-u', 'scroll-d', 'scroll-l', 'scroll-r',
    ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[this.toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  /**
   * Each browser gets their own listener
   */
  handleBrowserEvent: function browser_handleBrowserEvent(tab) {
    return (function(evt) {
      switch (evt.type) {

      case 'mozbrowsermemorypressure':
        this.debug('mozbrowsermemorypressure[' + tab.id + ']');
        if (tab.alive && tab.dom.style.visibility === 'hidden') {
          tab.dom.parentNode.removeChild(tab.dom);
          tab.alive = false;
        }
        break;

      case 'mozbrowserloadstart':
        this.debug('mozbrowserloadstart[' + tab.id + ']');
        evt.preventDefault();
        tab.title = null;
        tab.iconUrl = null;
        tab.loading = true;
        tab.dom.blur();
         BrowserDB.browserTitle = null;
        if(( this.currentInfo.id === tab.id ) && ( !this.isSuspend )) {
          Toolbar.showLoadingIcon();
        }
        if(( tab.zoomInit ) && ( tab.dom.zoom )) {
          tab.zoomInit = false;
          tab.dom.zoom(Toolbar.getDefaultZoomScale());
        }
        break;

      case 'mozbrowserloadend':
        this.debug('mozbrowserloadend[' + tab.id + ']');
        evt.preventDefault();
        if(( tab.zoomInit ) && ( tab.dom.zoom )) {
          tab.zoomInit = false;
          tab.dom.zoom(Toolbar.getDefaultZoomScale());
        } else if( tab.dom.zoom ) {
          if( tab.zoom ) {
            Toolbar.setZoomScale(tab.zoom);
            tab.dom.zoom(Toolbar.getZoomScale());
          } else {
            tab.dom.zoom(Toolbar.getDefaultZoomScale());
          }
        }
        tab.loading = false;
        this.refreshBrowserParts();
        this.initStartBrowsing();

        // get to favicon
        if( (tab.url != null) && (tab.url != "") && (!tab.iconUrl) ) {
            var a = document.createElement('a');
            a.href = tab.url;
            var iconUrl = a.protocol + '//' + a.hostname + '/' + 'favicon.ico';
            BrowserDB.setAndLoadIconForPage(tab.url, iconUrl);
          }

        // Capture screenshot for tab thumbnail
        if (tab.dom.getScreenshot) {
          tab.dom.getScreenshot(this.MAX_THUMBNAIL_WIDTH * this.DEVICE_RATIO,
                                this.MAX_THUMBNAIL_HEIGHT * this.DEVICE_RATIO).onsuccess =
          (function(e) {
            tab.screenshot = e.target.result;
            BrowserDB.updateScreenshot(tab.url, tab.screenshot);
          }).bind(this);
        }
        break;

      case 'mozbrowserlocationchange':
        this.debug('mozbrowserlocationchange[' + tab.id + ']');
        evt.preventDefault();
        if (evt.detail === 'about:blank') {
          return;
        }
        if( tab.loading ) tab.dom.blur();
        tab.url = evt.detail;
        if( !tab.pvtBrowse ) {
          BrowserDB.addVisit(tab.url);
        }
        if( this.currentInfo.id === tab.id ) {
          Toolbar.setUrlBar(tab.url);
          this.refreshBookmarkButton();
        }
        break;

      case 'mozbrowsertitlechange':
        this.debug('mozbrowsertitlechange[' + tab.id + ']');
        evt.preventDefault();
        tab.dom.blur();
        if (evt.detail) {
          tab.title = evt.detail;
          if( !tab.pvtBrowse ) {
            BrowserDB.setPageTitle(tab.url, tab.title);
          }
        }
        break;

      case 'mozbrowsericonchange':
        this.debug('mozbrowsericonchange[' + tab.id + ']');
        evt.preventDefault();
        if (evt.detail.href && evt.detail.href != tab.iconUrl) {
          tab.iconUrl = evt.detail.href;
          // TODO: Pick up the best icon
          // based on evt.detail.sizes and device size.
          BrowserDB.setAndLoadIconForPage(tab.url, tab.iconUrl);
        }
        break;

      case 'mozbrowsercontextmenu':
        this.debug('mozbrowsercontextmenu[' + tab.id + ']');
        evt.preventDefault();
        break;

      case 'mozbrowsersecuritychange':
        this.debug('mozbrowsersecuritychange[' + tab.id + ']');
        evt.preventDefault();
        tab.security = evt.detail;
        if( this.currentInfo.id === tab.id ) {
          this.updateSecurityIcon();
        }
        break;

      case 'mozbrowseropenwindow':
        this.debug('mozbrowseropenwindow[' + tab.id + ']');
        evt.preventDefault();
        if( tab.pvtBrowse ) {
          this.privateBrowsing = true;
        }
        tab.dom.blur();
        Awesomescreen.openNewTab(evt);
        break;

      case 'mozbrowserclose':
        this.debug('mozbrowserclose[' + tab.id + ']');
        evt.preventDefault();
        this.handleCrashed(tab);
        break;

      case 'mozbrowserusernameandpasswordrequired':
        this.debug('mozbrowserusernameandpasswordrequired[' + tab.id + ']');
        tab.loading = false;
        this.refreshBrowserParts();
        AuthenticationDialog.handleEvent(evt, tab.id);
        break;

      case 'mozbrowsershowmodalprompt':
        this.debug('mozbrowsershowmodalprompt[' + tab.id + ']');
        switch( evt.detail.promptType ) {
          case 'alert' :
            BrowserDialog.createDialog('alert', evt);
            break;
          case 'prompt' :
            BrowserDialog.createDialog('prompt', evt);
            break;
          case 'confirm' :
            BrowserDialog.createDialog('confirm', evt);
            break;
        }
        break;

      case 'mozbrowsererror':
        this.debug('mozbrowsererror[' + tab.id + ']:'+JSON.stringify(evt.detail));
        evt.preventDefault();
        tab.loading = false;
        this.refreshBrowserParts();
        if (evt.detail.type === 'fatal') {
          if( Awesomescreen.isDisplayedTab() ) Awesomescreen.tabviewHidden();
          this.handleCrashed(tab);
        }
        setTimeout( function() {
          BrowserDialog.createDialog('error_browser', evt);
        }, 800);
        break;

      case 'mozbrowserasyncscroll':
        this.debug('mozbrowserasyncscroll[' + tab.id + ']');
        break;

      default:
        this.debug('other event = ' + evt.type);
        break;
      }
    }).bind(this);
  },

  handleCrashed: function browser_handleCrashed(tab) {
    if( tab.id == this.currentInfo.id ) {
      var tabCount = Object.keys(this.info).length;
      var tabIds = Object.keys(this.info);
      for( var i = 0 ; i < tabCount ; i++ ) {
        if( tab.id == this.info[tabIds[i]].id ) {
          if( i + 1 < tabCount ) {
            this.selectInfo(tabIds[i+1]);
            this.refreshBrowserParts();
            this.switchVisibility(this.currentInfo, true);
          } else if( i - 1 >= 0 ) {
            this.selectInfo(tabIds[i-1]);
            this.refreshBrowserParts();
            this.switchVisibility(this.currentInfo, true);
          }
        }
      }
    }
    var id = tab.id;
    this.webBlock.removeChild(tab.dom);
    delete tab.dom;
    delete this.info[id];
    if( Object.keys(this.info).length == 0 ) {
      Awesomescreen.createAddNewTab();
    } else {
      Awesomescreen.updateTabsCount();
    }
  },

  /**
   * Add Browser Event (iframe)
   */
  bindBrowserEvents: function browser_bindBrowserEvents(iframe, tab) {
    var browserEvents = ['loadstart', 'loadend', 'locationchange',
                         'titlechange', 'iconchange', 'contextmenu',
                         'securitychange', 'openwindow', 'close',
                         'showmodalprompt', 'error', 'asyncscroll',
                         'usernameandpasswordrequired', 'memorypressure'];
    browserEvents.forEach(function attachBrowserEvent(type) {
      iframe.addEventListener('mozbrowser' + type,
                              this.handleBrowserEvent(tab));
    }, this);
  },

  /**
   * Create Iframe (browser page)
   */
  createIframe: function browser_createIframe(url, rcvIframe, info) {
    var iframe = null;
    if( !rcvIframe ) {
      iframe = document.createElement('iframe');
    } else {
      iframe = rcvIframe;
    }
    iframe.setAttribute('mozbrowser', true);
    iframe.setAttribute('mozallowfullscreen', true);
    iframe.classList.add('browser-tab');
    iframe.setAttribute('remote', 'true');
    if( this.privateBrowsing ) {
      iframe.setAttribute('mozprivatebrowsing', 'true');
    }
    if (url) {
      iframe.setAttribute('src', url);
    }
    if (info) {
      info.dom = iframe;
    } else {
      info = {
        id: 'tab' +  ('000' + this.tabCounter++).slice(-3),
        dom: iframe,
        url: url || null,
        title: null,
        screenshot: null,
        pvtBrowse: this.privateBrowsing,
        zoom: Toolbar.defaultZoomScale,
        zoomInit: false,
        security: null,
        loading: false,
        alive: true,
        timestamp: new Date().getTime()
      };
    }
    Toolbar.setPrivateBrowsing(this.privateBrowsing);
    this.privateBrowsing = false;

    // Default newly created frames to the background
    var tabCount = Object.keys(this.info).length;
    var tabIds = Object.keys(this.info);
    //Hide other than the selected tab
    for( var i = 0 ; i < tabCount ; i++ ) {
      this.switchVisibility(this.info[tabIds[i]], false);
    }
    this.bindBrowserEvents(iframe, info);
    this.info[info.id] = info;
    this.webBlock.appendChild(iframe);
    this.switchVisibility(info, true);
    if( info.dom.zoom ) {
      info.dom.zoom(Toolbar.getDefaultZoomScale());
    } else {
      info.zoomInit = true;
    }
    return info.id;
  },

  handlePrivateBrowsing: function browser_handlePrivateBrowsing() {
    this.privateBrowsing = true;
    Awesomescreen.createAddNewTab();
  },

  navigate: function browser_navigate(url) {
    if(Awesomescreen.isDisplayedTop()) {
      Awesomescreen.topsiteHidden();
    }
    this.currentInfo.title = null;
    this.currentInfo.url = url;
    this.currentInfo.dom.setAttribute('src', url);
    Toolbar.setZoomScale(this.currentInfo.zoom);
    this.currentInfo.dom.zoom(Toolbar.getZoomScale());
    Toolbar.setUrlBar(url);
  },

  // Get search form input
  getSearchFromInput: function browser_getSearchFromInput(input) {
    var url_str = SearchUtil.getCurrentSearchUrl();
    this.debug("Search Url:"+url_str[0]);
    url_str = url_str[0] + encodeURIComponent(input);
    // get language option
    url_str += this.getLanguageUrl();

    return url_str;
  },

  // Get url form input
  getUrlFromInput: function browser_getUrlFromInput(input) {
    var hasScheme = UrlHelper.hasScheme(input);

    // No scheme, prepend basic protocol and return
    if (!hasScheme) {
      return 'http://' + input;
    }

    return input;
  },

  closeBrowser: function browser_closeBrowser(ev) {
    self.close();
  },

  switchVisibility: function browser_switchVisibility(info, visible) {
    if( !info ) return;
    if( visible ) {
      if(info.dom.setVisible) {
        info.dom.setVisible(true);
        info.dom.style.display = 'block';
        info.dom.style.visibility = 'visible';
      }
      if (!info.alive) {
        this.webBlock.appendChild(info.dom);
        info.alive = true;
      }
    } else {
      if(info.dom.setVisible) {
        info.dom.setVisible(false);
        info.dom.style.display = 'none';
        info.dom.style.visibility = 'hidden';
      }
    }
  },

  // dom.setVisible is loaded asynchronously from BrowserElementChildPreload
  // and may require a yield before we call it, we want to make sure to
  // clear any previous call
  setVisibleWrapper: function(info, visible) {
    if (info.setVisibleTimeout) {
      clearTimeout(info.setVisibleTimeout);
    }
    if (info.dom.setVisible) {
      this.switchVisibility(info, true);
      return;
    }
    info.setVisibleTimeout = setTimeout(function() {
      if (info.dom.setVisible) {
        this.switchVisibility(info, true);
      }
    });
  },

  updateSecurityIcon: function browser_updateSecurityIcon() {
    if (!this.currentInfo.security) {
      Toolbar.sslIndicator.name = '';
      return;
    }
    this.debug('updateSecurityIcon:' + this.currentInfo.security.state);
    Toolbar.sslIndicator.name = this.currentInfo.security.state;
  },

  selectInfo: function browser_selectInfo(id) {
    this.currentInfo = this.info[id];
    this.debug('currentInfo = ' + this.currentInfo.id);
    Toolbar.setUrlBar(this.currentInfo.url);
    Toolbar.setPrivateBrowsing(this.currentInfo.pvtBrowse);
    this.updateSecurityIcon();
  },

  variousWindowErase: function browser_variousWindowErase() {
    // various window erase...
    // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      document.activeElement.blur();
    }
    if( BrowserDialog ) BrowserDialog.cancelDialog();
    if(( AuthenticationDialog ) && ( AuthenticationDialog.isDisplayed() )) {
      AuthenticationDialog.cancelHandler();
    }
    if( Settings ) Settings.hide();
    if( Awesomescreen ) Awesomescreen.allHidden();
    if( SearchResult ) SearchResult.hide();
  },

  /**
   * Show the list of bookmarks.
   *
   * @param {Array} bookmarks List of bookmark data objects.
   */
  populateBookmarks: function browser_populateBookmarks(bookmarks) {
    Awesomescreen.selectTopSites();
  },

  handleActivity: function browser_handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    switch( activity.source.name ) {
      case 'view':
        switch (activity.source.data.type) {
          case 'url':
            var url = this.getUrlFromInput(activity.source.data.url);
            this.debug(' url = ' + url);
            this.start_page_url = url;
            break;
        }
        break;
    }
  },

  /**
   * get language (ex:en-US)
   */
  getLanguage: function browser_getLanguage() {
    this.language = this.DEFAULT_LANG;
    // XXX: replace this with navigator.language
    var getLang = null;
    if(getLang){
      var lang = getLang;
      Browser.language = lang;
      this.debug('========== get language:'+getLang);
    } else {
      console.log('========== get language: error');
    }
  },

  /**
   * get country (ex:US)
   */
  getCountry: function browser_getCountry(cb) {
    this.country = this.DEFAULT_COUNTRY;
    // XXX: replace this with navigator.language
    var getCountry = null;
    if(getCountry){
      Browser.country = getCountry;
      Browser.tvBlock.dataset.model = getCountry;
      this.debug('========== get country:'+Browser.country);
    } else {
      console.log('========== get country: error');
    }
    if(cb){
      cb();
    }
  },

  /**
   * get color bar (color bar)
   */
  getColorBar: function browser_getColorBar() {
    var COLOR_KEY_TYPE = {
      'US' : [
        { 'COLOR': 'red',    'KEY_CODE': KeyEvent.DOM_VK_RED    },
        { 'COLOR': 'green',  'KEY_CODE': KeyEvent.DOM_VK_GREEN  },
        { 'COLOR': 'yellow', 'KEY_CODE': KeyEvent.DOM_VK_YELLOW },
        { 'COLOR': 'blue',   'KEY_CODE': KeyEvent.DOM_VK_BLUE   }
      ],
      'JP' : [
        { 'COLOR': 'blue',   'KEY_CODE': KeyEvent.DOM_VK_BLUE   },
        { 'COLOR': 'red',    'KEY_CODE': KeyEvent.DOM_VK_RED    },
        { 'COLOR': 'green',  'KEY_CODE': KeyEvent.DOM_VK_GREEN  },
        { 'COLOR': 'yellow', 'KEY_CODE': KeyEvent.DOM_VK_YELLOW }
      ]
    };

    if(this.country == 'JP'){
      this.colorBar = COLOR_KEY_TYPE['JP'];
    }else{
      this.colorBar = COLOR_KEY_TYPE['US'];
    }
  },
  getColorBarData: function browser_getColorBarData() {
    return this.colorBar;
  },

  switchCursorMode: function browser_switchCursorMode( mode ) {
    this.debug("switch cursor new_mode = " + mode + " , current = " + this.cursorMode);
    if( this.cursorMode == null ) {
      this.cursorMode = mode;
    } else if( this.cursorMode != mode ) {
      this.cursorMode = mode;
    } else {
      return;
    }

    Toolbar.clearDragMode();
  },

  /**
   * key hook
   */
  keyHook: function browser_keyHook(ev) {
    this.debug('kc = ' + ev.keyCode);

    if(ev.keyCode == KeyEvent.DOM_VK_BACK_SPACE) {
      if(Toolbar.toolbarPanel.dataset.menu == 'show') {
        Toolbar.toolbarPanel.dataset.menu = 'hide';
        return;
      }
    }

    if(BrowserDialog.isDisplayed()) {
      BrowserDialog.handleKeyEvent(ev);
      return;
    }
    if(AuthenticationDialog.isDisplayed()) {
      AuthenticationDialog.handleKeyEvent(ev);
      return;
    }
    if(Settings.isDisplayed()) {
      Settings.handleKeyEvent(ev);
      return;
    }
    if(Awesomescreen.isDisplayed()) {
      if(!Awesomescreen.handleKeyEvent(ev)){
        return;
      }
    }
    if(SearchResult.isDisplayed()) {
      SearchResult.handleKeyEvent(ev);
      return;
    }
    // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      return;
    }

    switch (ev.keyCode) {
    case KeyEvent.DOM_VK_F9:
    case this.colorBar[0].KEY_CODE:
      if(Awesomescreen.isDisplayedTop()) return;
      Toolbar.clickModeButtonBlock();
      break;

    case KeyEvent.DOM_VK_F10:
    case this.colorBar[1].KEY_CODE:
      if(this.getCursorPanMode() == 'pan') return;
      Toolbar.clickZoomButtonBlock();
      break;

    case KeyEvent.DOM_VK_F11:
    case this.colorBar[2].KEY_CODE:
      if(this.getCursorPanMode() == 'pan') return;
      Awesomescreen.handleNewTab();
      break;

    case KeyEvent.DOM_VK_F12:
    case this.colorBar[3].KEY_CODE:
      if(this.getCursorPanMode() == 'pan') return;
      Awesomescreen.createAddNewTab();
      break;

    // Touch pad remote control(Star Mark)
    case KeyEvent.DOM_VK_MYBUTTON:
      Awesomescreen.pinToHome();
      break;

    case KeyEvent.DOM_VK_BACK_SPACE:
      // clear drag mode
      Toolbar.clearDragMode();

      Toolbar.goBack();
      break;

    default:
      break;
    }
  },


  /**
   * keypress
   */
  keypress: function browser_keypress(ev) {
    if( (Awesomescreen.isDisplayedList()) && (!(Awesomescreen.isDisplayedDialog())) ){
      ev.preventDefault();
      setTimeout( function() {
        if(Awesomescreen.exeflag && (ev.keyCode == KeyEvent.DOM_VK_UP || ev.keyCode == KeyEvent.DOM_VK_DOWN )){
          Awesomescreen.listDialogKeyCont(ev, ev.target);
        }
      }, 100);
    }

 },

  /**
   * location hash change event
   */
  hashChange: function browser_hashChange() {
    Browser.debug("location.hash=" + location.hash);
    var new_url = location.hash.replace("#","");
    //URL format check
    var data = new_url.match(/(http|https):\/\/.+/);
    if(data) {
      location.hash = "";
      Browser.debug("new_url=" + new_url);
      Browser.start_page_url = new_url;
      if( !Browser.currentInfo ) {
        Browser.launch_from = 5;
      } else {
        Browser.variousWindowErase();
        if(( Browser.currentInfo.url != null ) && ( Browser.currentInfo.url != '' )) {
          var evt = new Object();
          evt.detail = { url: new_url, frameElement: null };
          Awesomescreen.openNewTab(evt);
        } else {
          Browser.navigate(new_url);
        }
      }
    }
  }

};

document.addEventListener('visibilitychange', function browser_VisivilityChange() {
  if( document.hidden ) {
    Browser.debug('browser suspend...');
    Browser.isSuspend = true;
    Browser.variousWindowErase();
    if(Browser.sideBlock.dataset.sidebar == 'true'){
      // XXX: open side block
    }
    if( Browser.currentInfo ) Browser.refreshBrowserParts();
  } else {
    Browser.debug('browser resume...');
    Browser.isSuspend = false;
    if(Browser.sideBlock.dataset.sidebar == 'true') {
      // XXX: open side block
    }
    //Browser.hashChange();
    if(Browser.currentInfo) {
      if(( Browser.currentInfo.url == null ) || ( Browser.currentInfo.url == '' )) {
        Awesomescreen.selectTopSites();
      }
      Browser.refreshBrowserParts();
    }

  }
}, false);

window.onhashchange = Browser.hashChange;

window.addEventListener('load', function browserOnLoad(evt) {
  Browser.debug('browser browserOnLoad...');
  window.removeEventListener('load', browserOnLoad, false);
  var mozL10n = navigator.mozL10n;
  mozL10n.ready(function() {
    // hash change param
    Browser.hashChange();
    Browser.init();
  }.bind(this));
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

