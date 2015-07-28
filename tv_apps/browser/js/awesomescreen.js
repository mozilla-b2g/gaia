/* globals _, Browser, BrowserDB */

/* exported Awesomescreen */

'use strict';

/**
 * Browser App Awesomescreen. Display top sites, bookmarks, histories and search
 * result.
 * @namespace Awesomescreen
 */
var Awesomescreen = {

  DEFAULT_FAVICON: 'style/images/default-fav.svg',
  DEFAULT_TAB_ADD: 'style/images/add-tab.svg',
  DEFAULT_SCREENSHOT: 'style/images/mozilla_screenshot.png',
  DEFAULT_BOOKMARK: 'Bookmark',
  DEFAULT_HISTORY: 'History',
  DEFAULT_TABVIEW: 'Tabview',
  DEFAULT_TAB_DELETE: 'TabDelete',
  DEFAULT_TOPSITE: 'Topsite',
  DEFAULT_LOADPOSITION: 'LoadPosition',
  DEFAULT_EXCLEAR: 'exclear',
  LIST_NUM: 6,
  TOP_SITES_COUNT: 9,
  RESULT_CACHE_SIZE: 20,
  TABLIST_MAX: 12,
  PTH_THUMBNAIL_WIDTH_FULL: 658,
  PTH_THUMBNAIL_WIDTH_SIDE: 521,
  PTH_THUMBNAIL_HEIGHT: 336,
  MOUSE_RIGHT_CLICK: 2,
  focusList: null,
  focusPos: 0,
  blurFlag: false,
  listTemplate: null,
  resultTemplate: null,
  searchTemplate: null,
  resultCache: {},
  upgradimgArea: null,
  downgradimgArea: null,
  historyClearFlg: false,
  focusSwitchFlg: null,
  exeflag: true,
  onmouseX: null,
  onmouseY: null,
  // Keep img object URLs to later clean up img file references
  objectURLs: [],
  tabList: null,
  bmhisList:{},
  finalDispTabId: null,
  topSiteList: null,
  selectList:null,
  selectMenu:null,
  manifestURL: null,
  pintohomeTitle: null,
  clickTopListFlg:false,
  clickTopActFlg:false,
  clickTabListFlg:false,
  clickTabActFlg:false,
  /**
   * Initialise Awesomescreen.
   */
  init: function awesomescreen_init() {

    /* Event Listener */
    window.addEventListener('click', this);
    window.addEventListener('blur', this);

    // Create template elements
    this.resultTemplate = this.createResultTemplate();
    this.listTemplate = this.createList();

    //Create topsite,tab template elements
    this.topTemplate = this.createtopTemplate();
    this.topListTemplate = this.createTopList();

    this.tabListTemplate = this.createNewtabTemplate();
    this.tabTemplate = this.createtabList();

    /* get Element */
    this.getAllElements();

    //awesomescreem elements

    this.inputArea.addEventListener('focus',
        this.handleinputAreaFocus.bind(this));

    this.inputArea.addEventListener('mousedown',
        this.handleinputAreaClick.bind(this));

    this.inputArea.addEventListener('blur',
        this.handleinputAreaBlur.bind(this));

    this.checkBox.addEventListener('mouseup',
        this.pintohomeCheck.bind(this));

    this.textArea.addEventListener('mouseup',
        this.pintohomeCheck.bind(this));

    this.circleImg.addEventListener('mouseup',
        this.inputClear.bind(this));

    this.cancelButton.addEventListener('mouseup',
        this.clickCancelButton.bind(this));

    this.okButton.addEventListener('mouseup',
        this.dialogConfirm.bind(this));

    this.pinhomeButton.addEventListener('mouseup',
        this.clickPinhomeButton.bind(this));

    this.removeButton.addEventListener('mouseup',
        this.clickRemoveButton.bind(this));

    this.removeBookmarkButton.addEventListener('mouseup',
        this.clickRemoveBookmarkButton.bind(this));

    this.editButton.addEventListener('mouseup',
        this.clickEditButton.bind(this));

    this.clhistoryButton.addEventListener('mouseup',
        this.clickClhistoryButton.bind(this));

    this.sethomeButton.addEventListener('mouseup',
        this.clickSethomeButton.bind(this));

    this.removeTopsiteButton.addEventListener('mouseup',
        this.clickRmtopsiteButton.bind(this));

    this.removeConfirmButton.addEventListener('mouseup',
        this.titleRemove.bind(this));

    this.renameConfirmButton.addEventListener('mouseup',
        this.titleRename.bind(this));

    this.clearButton.addEventListener('mouseup',
        this.clickClearButton.bind(this));

    this.privateBrowsingBlock.addEventListener('mouseup',
        this.hidePrivateBrowsingBlock.bind(this));

    //And setting various button events
    this.setEventListener();

    //get to manifest
    this.getManifest();

    //Get the coordinates of the mouse pointer
    this.mouseMoveFunc();
  },

  /**
   * awesomescreen displays a confirmation.
   */
  isDisplayed: function awesomescreen_isDisplayed() {
    return document.body.classList.contains('awesomescreen-screen');
  },

  isDisplayedList: function awesomescreen_isDisplayed() {
    return this.awesomescreen.classList.contains('awesomescreen-screen-list');
  },

  isDisplayedBookmark: function awesomescreen_isDisplayedBookmark() {
    return this.awesomescreen.classList.contains('awesomescreen-bookmark');
  },

  isDisplayedHistory: function awesomescreen_isDisplayedHistory() {
    return this.awesomescreen.classList.contains('awesomescreen-history');
  },

  isDisplayedTab: function awesomescreen_isDisplayed() {
    return this.awesomescreen.classList.contains('awesomescreen-screen-tab');
  },

  isDisplayedTop: function awesomescreen_isDisplayed() {
    return this.awesomescreen.classList.contains('awesomescreen-screen-top');
  },

  isDisplayedDialog: function awesomescreen_isDisplayed() {
    return this.awesomescreen.classList.contains('awesomescreen-screen-dialog');
  },

  /**
   * The scaling in scale change in the toolbar
   */
  isScaleChange: function awesomescreen_isScaleChange(setElemnt) {
    //The scale switching by the width of the screen
    if(Browser.mainBlock.dataset.sidebar == 'true'){
      setElemnt.classList.remove('scale-standard');
      setElemnt.classList.add('scale-min')
    }else{
      setElemnt.classList.remove('scale-min');
      setElemnt.classList.add('scale-standard');
    }
  },

  /**
   * Save the final display tab
   */
  isTabSetting: function awesomescreen_isTabSetting() {
    var tabIds = Object.keys(Browser.info);
    this.finalDispTabId = Browser.info[tabIds[0]].id;
  },

  /**
   * Check whether the focus is hitting the check box
   */
  isFocusCheck: function awesomescreen_isFocusCheck() {
    if(document.activeElement == this.checkBox){
      return true;
    }else{
      return false;
    }

    document.activeElement.blur();

  },

  /**
   * close all awesomescreen screen
   */
  allHidden: function awesomescreen_allHidden() {
    if(this.isDisplayedList()) this.listHidden();
    if(this.isDisplayedDialog()) this.dialogHidden();
    if(this.isDisplayedTop()) this.topsiteHidden();
    if(this.isDisplayedTab()) this.tabviewHidden();
  },

  /**
   * CamelCase (xxx-yyy -> xxxYyy)
   */
  toCamelCase: function toCamelCase(str) {
    return str.replace(/-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  },

  /**
   * Get All Elements (from id)
   */
  getAllElements: function toolbar_getAllElements() {
    var elementIDs = [
    'top-sites', 'bookmarks', 'history', 'topsite-dialog',
    'tab-site-list', 'dialog-area', 'message-title',
    'input-area', 'check-img', 'circle-img',
    'button-area', 'check-box', 'bmtitle-area',
    'check-area', 'message-area', 'bt-position',
    'cancel-button', 'ok-button', 'pinhome-button',
    'remove-button', 'edit-button', 'clhistory-button',
     'sethome-button', 'remove-topsite-button',
    'remove-confirm-button', 'rename-confirm-button', 'clear-button',
    'list-dialog', 'tab-view', 'pointer-img',
    'awesomescreen', 'dialog-banner-message' , 'bmd-dialog',
    'dialog-area', 'tabview-panels', 'top-site-list', 'top-panels',
    'private-browsing-block', 'top-default-list', 'awesome-loading-icon',
    'remove-bookmark-button', 'text-area'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[this.toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  getManifest: function awesomescreen_getManifest() {
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      Awesomescreen.manifestURL = request.result.manifestURL;
    };
    request.onerror = function() {
      this.debug("getSelf error");
    };
  },

  setEventListener: function awesomescreen_setEventListener(){

    var elementIDs = [this.cancelButton, this.checkBox, this.circleImg,
                      this.okButton, this.pinhomeButton, this.removeButton,
                      this.editButton, this.clhistoryButton, this.sethomeButton,
                      this.removeTopsiteButton, this.removeConfirmButton, this.renameConfirmButton,
                      this.clearButton, this.removeBookmarkButton];

    elementIDs.forEach(function createElementStyle(name) {
      name.addEventListener('keyup', this.dialogButtonKeyup.bind(this));
    }, this);
  },

  /**
   * handle event
   */
  handleEvent: function awesomescreen_handleEvent(ev) {
    switch(ev.button){
      case 0: //left click
        switch(ev.target){
          //I close the dialog screen
          case Browser.sideBlock :
          case this.dialogArea :
            if(this.isDisplayedDialog() && (this.cancelButton.style.display == 'none') ){
              this.dialogHidden();
             }
            return false;
            break;
          case this.history :
          case this.bookmarks :
            if(this.isDisplayedList()) this.listHidden();
            return false;
            break;
          case this.topSites :
          case this.topPanels :
          case this.tabView :
          case this.tabviewPanels :
              //tabview be closed when I appear
              if(this.isDisplayedTab())  this.tabviewHidden();
            return false;
            break;
          default:
            if(this.isDisplayedTab()){
              if( (ev.target.className) && (ev.target.className.contains('browser-tab')) ){
                this.tabviewHidden();
                return false;
              }
              break;
            }
            if(this.isDisplayedList()){
              if( (ev.target.id) && (ev.target.id.contains('list-dialog')) ){
                this.listHidden();
                return false;
              }
              break;
            }
            break;
        }
      break;
    default:
      break;
    }
    return true;
  },

  /**
   * Hide Private Browsing
   */
  hidePrivateBrowsingBlock: function hidePrivateBrowsingBlock() {
    this.privateBrowsingBlock.classList.remove('visible');
  },

  /**
   * Select Top Sites tab.
   */
  selectTopSites: function awesomescreen_selectTopSites() {
    Toolbar.setToolbarMode('top');
    BrowserDB.getTopSites(this.TOP_SITES_COUNT, null,
      this.populateTopSites.bind(this));
    // show private browsing
    this.showPrivateBrowsing();
  },

  /**
   * show private browsing
   */
  showPrivateBrowsing: function awesomescreen_showPrivateBrowsing() {
    this.privateBrowsingBlock.classList.remove('visible');
    if(Toolbar.isPrivateBrowsing()) {
      this.privateBrowsingBlock.classList.add('visible');
      var privateBrowsingInfoText = document.getElementById('private-browsing-info-text');
      privateBrowsingInfoText.innerHTML = _('WB_LT_PRIVATE_BROWSING_2');
    }
  },

  /**
   * Show the list of Top Sites.
   *
   * @param {Array} topSites Array of top site data.
   */
  populateTopSites: function awesomescreen_populateTopSites(topSites) {
    Toolbar.searchInput.value = "";
    //If the top site of 0, display the default page
    if(topSites.length == 0){
      Settings.getDefaultHomepage(this.defaultTopsite.bind(this));
      return;
    }
    this.history.innerHTML = '';
    this.bookmarks.innerHTML = '';
    this.topSites.style.opacity = "0";
    this.topSiteList.innerHTML = "";

    //Get the "container, ul" element
    var list = this.topSiteList;
    this.objectURLs = [];
    topSites.forEach(function(data,index) {
      //Add "topsite, tab" the list creation process of the main
      list.appendChild(this.createListItemTopsite(data,null,null,index));
    }, this);

    this.topPanels.appendChild(list);
    this.topsiteShow();
  },

  /**
   * default topsite.
   */
  defaultTopsite: function awesomescreen_defaultTopsite() {

    BrowserDB.addTopSite(Settings.DEFAULT_HOMEPAGE, Settings.DEFAULT_HOMEPAGE, 1);
    var topListObject = {id: 'top-list-default', thumbnail: this.DEFAULT_SCREENSHOT};
    this.objectURLs.push(topListObject);

    BrowserDB.getTopSites(this.TOP_SITES_COUNT, null,this.populateTopSites.bind(this));
  },

  /**
   * Select Top Sites tab.
   */
  //I want to display the URL of the list and click
  clickTopList: function awesomescreen_clickTopList(ev) {
    if(ev) ev.stopPropagation();
    this.clickTopListFlg = true;
    if(this.clickTopActFlg){
      this.clickTopActFlg = false;
      this.clickTopListFlg = false;
      var fade_top_action = (function() {

        switch(ev.button){
          case 0 :  // left click
            var uri = ev.target.childNodes[0].childNodes[1].textContent;
            Toolbar.urlInput.blur();
            Browser.navigate(uri);
            Browser.selectInfo(Browser.currentInfo.id);
            Browser.switchVisibility(Browser.currentInfo, true);
            //To the tab you are currently viewing the final display tab
            Awesomescreen.finalDispTabId = Browser.currentInfo.id;
            if(Awesomescreen.isDisplayedTab()) Awesomescreen.tabviewHidden();
            Awesomescreen.topsiteHidden();

            break;
          case 2:  //right click
            ev.keyCode = KeyEvent.DOM_VK_SUBMENU;
            Awesomescreen.handleKeyEvent(ev);
            break;
          default:
            break;
        }
        //undo the outer frame of the thumbnail
        document.getElementById('default-' + ev.target.id).style.opacity = '1';
        ev.target.childNodes[0].removeEventListener('transitionend', fade_top_action, false);
      });

      // Add fade animantion event
      ev.target.childNodes[0].addEventListener('transitionend', fade_top_action, false);
      ev.target.classList.remove('active');
    }
  },

  clickTopAction: function awesomescreen_clickTopAction(evt) {
    if( evt ) evt.preventDefault();
    var click_top_action = (function() {
      Awesomescreen.clickTopActFlg = true;
      if(Awesomescreen.clickTopListFlg){
        Awesomescreen.clickTopList(evt);
      }
      evt.target.childNodes[0].removeEventListener('transitionend', click_top_action, false);
    });

    // Add fade animantion event
    evt.target.childNodes[0].addEventListener('transitionend', click_top_action, false);
    evt.target.classList.add('active');
  },

  /**
   * topsite show.
   */
  topsiteShow: function awesomescreen_topsiteShow() {
    if( Browser.currentInfo ) {
      if(( Browser.currentInfo.url != null ) && ( Browser.currentInfo.url != '' )) {
        Browser.debug('stopped for TopSites display...');
        this.topsiteHidden(true);
        Browser.switchCursorMode(true);
        return;
      }
    }
    document.body.classList.add('awesomescreen-screen');
    this.awesomescreen.classList.add('awesomescreen-screen-top');
    this.topSites.style.display = 'block';
    this.topSites.style.opacity = '1';
    if(this.isDisplayedTab()){
       Browser.switchCursorMode(false);
    }else{
       Browser.switchCursorMode(true);
    }
  },

  /**
   * topsite hidden.
   */
  topsiteHidden: function awesomescreen_topsiteHidden(type) {
    if(!this.isDisplayedTab()) document.body.classList.remove('awesomescreen-screen');
    this.awesomescreen.classList.remove('awesomescreen-screen-top');
    Awesomescreen.topSites.style.display = 'none';
    this.topSites.style.opacity = '0';
    Toolbar.setToolbarMode('normal');

    this.privateBrowsingBlock.classList.remove('visible');
  },

  /**
   * Select History tab.
   */
  selectHistoryTab: function awesomescreen_selectHistoryTab() {
    BrowserDB.getHistory(this.populateHistory.bind(this));
  },

  /**
   * Show the list of history items.
   *
   * @param {Array} visits An array of visit data.
   */
  populateHistory: function awesomescreen_populateHistory(visits) {
    this.history.innerHTML = '';
    this.bookmarks.innerHTML = '';
    this.bmhisList = {};
    var urls = []; // List of URLs under each heading for de-duplication
    var container = this.listTemplate.cloneNode(true);
    var title = container.childNodes[0];
    title.innerHTML = _('LT_SE_HISTORY');
    var list = container.childNodes[2].childNodes[0];

    //Add "index" to the parameters of the "createListItem"
    visits.forEach(function awesomescreen_processVisit(visit,listIdx) {
      // If not a duplicate, draw list item & add to list
      if (urls.indexOf(visit.uri) == -1) {
        urls.push(visit.uri);
        //Add "index" to the parameters of the "createListItem"
        //To the same UI as the "bookmark", and changes the screen configuration
        list.appendChild(this.createListItem(visit,null,null,(urls.length -1)));
      }
    }, this);
    this.bmhisList = list;
    if(list.childElementCount >= 2){
      list.firstChild.classList.add('first-pos');
      list.lastChild.classList.add('last-pos');
    }
    //Change "fragment" element in the "container" element
    this.history.appendChild(container);

    //Add history display processing
    this.awesomescreen.classList.add('awesomescreen-history');
    this.listShow();
  },

  /**
   * Select the Bookmarks tab.
   */
  selectBookmarksTab: function awesomescreen_selectBookmarksTab() {
    BrowserDB.getBookmarks(this.populateBookmarks.bind(this));
  },

  /**
   * Show the list of bookmarks.
   *
   * @param {Array} bookmarks List of bookmark data objects.
   */
  populateBookmarks: function awesomescreen_populateBookmarks(bookmarks) {
    this.history.innerHTML = '';
    this.bookmarks.innerHTML = '';
    this.bmhisList = {};
    //Get the "container, ul" element
    var container = this.listTemplate.cloneNode(true);
    var title = container.childNodes[0];
    title.innerHTML = _('LT_NET_BOOKMARK');
    var list = container.childNodes[2].childNodes[0];
    bookmarks.forEach(function(data,index) {
    //Add "index" to the parameters of the "createListItem"
      list.appendChild(this.createListItem(data, null, 'bookmarks',index));
    }, this);
    this.bmhisList = list;
    if(list.childElementCount >= 2){
      list.firstChild.classList.add('first-pos');
      list.lastChild.classList.add('last-pos');
    }
    //bookmark or History set to ul
    this.bookmarks.appendChild(container);
    this.awesomescreen.classList.add('awesomescreen-bookmark');
    this.listShow();
  },

  /**
   * display the URL of the list and click.
   *
   * @param {ev} event to mouseup.
   */
  clickBmHisList: function awesomescreen_clickBmHisList(ev) {
    if(ev)  ev.preventDefault();
    var activeElem = ev.currentTarget;

    //select the list that are not shaded only
    if(activeElem.className.contains('visible')){
      switch(ev.button){
        case 0 :  // left click
          var uri = activeElem.lastChild.childNodes[1].textContent;
          Toolbar.urlInput.blur();
          Browser.navigate(uri);
          this.listHidden();
          if(this.isDisplayedTop()) this.topsiteHidden();
          Browser.switchCursorMode(true);
          break;
        case 2:  //right click
          this.selectList = activeElem;
          ev.keyCode = KeyEvent.DOM_VK_SUBMENU;
          this.handleKeyEvent(ev);
          break;
        default:
          break;
      }
    }

  },

  /**
   * hidden bookmark,history list.
   */
  listShow: function awesomescreen_listShow() {


    document.body.classList.add('awesomescreen-screen');
    this.awesomescreen.classList.add('awesomescreen-screen-list');
    this.listDialog.style.display = 'block';
    Awesomescreen.blurFlag = false;
    //I focus to the top of the list
    var list = document.getElementsByClassName('history-area');
    var listLength = list.length;

    //Initial setting of the list dim part
    this.upgradimgArea = document.getElementById('upgradimg-area');
    this.downgradimgArea = document.getElementById('downgradimg-area');
    this.upgradimgArea.classList.add('hidden');

    //If the number of the list is more than 9 to dim to 8 Items per page
    if(listLength <= this.LIST_NUM + 1){
      this.downgradimgArea.classList.add('hidden');
    }

    if(listLength != 0) {
        list[0].focus();
        Awesomescreen.focusImgFunc(list[0], null);
      if(listLength == this.LIST_NUM + 1){
        list[this.LIST_NUM].classList.add('visible');
     }
    }
    Awesomescreen.listDialog.style.opacity = '0.95';
    Browser.switchCursorMode(false);
  },
  /**
   * hidden bookmark,history list.
   */
  listHidden: function awesomescreen_listHidden() {
    this.pointerImg.style.display = 'none';
    if(!(Awesomescreen.isDisplayedTop())) {
      document.body.classList.remove('awesomescreen-screen');
    }
    Awesomescreen.awesomescreen.classList.remove('awesomescreen-screen-list');
    Awesomescreen.awesomescreen.classList.remove('awesomescreen-bookmark');
    Awesomescreen.awesomescreen.classList.remove('awesomescreen-history');
    document.activeElement.blur();
    // Fade animation end event handler
    var fade_event_list = (function() {
      Awesomescreen.listDialog.style.display = 'none';
      Browser.switchCursorMode(true);
      Awesomescreen.listDialog.removeEventListener('transitionend', fade_event_list, false);
    });

    Awesomescreen.listDialog.addEventListener('transitionend', fade_event_list, false);
    this.listDialog.style.opacity = '0';

    this.exeflag = true;
  },

  /**
   * sort by object
   *
   * @return {prop_name} Item name you want to sort.
   * @return {reverse} Alignment sequence. asc:false,desc:true
   * @return {primer} parseInt and function.
   */
  objectSort: function awesomescreen_objectSort(prop_name, reverse, primer) {
    reverse = (reverse) ? -1 : 1;
    return function(a,b){
      a = a[prop_name];
      b = b[prop_name];
      if (typeof(primer) != 'undefined'){
        a = primer(a);
        b = primer(b);
      }
      if (a < b) return reverse * -1;
      if (a > b) return reverse * 1;
      return 0;
    }
  },

  /**
   * Create a list element to contain results.
   *
   * @return {Element} An unordered list element.
   */
  createList: function awesomescreen_createList() {
    var container = document.createElement('div');
    var title = document.createElement('div');
    var list = document.createElement('ul');
    var listArea = document.createElement('div');
    var imgUpArea = document.createElement('span');

    listArea.id = 'list-area';
    list.setAttribute('role', 'listbox');
    list.id = "bmhis-list";
    title.id = 'title-area';
    imgUpArea.id = 'upgradimg-area';

    container.classList.add('container');
    container.appendChild(title);
    container.appendChild(imgUpArea);
    var imgDownArea = imgUpArea.cloneNode(true);
    imgDownArea.id = 'downgradimg-area';
    listArea.appendChild(list);
    container.appendChild(listArea);
    container.appendChild(imgDownArea);

    return container;
  },

  /**
   * Create a template list item DOM node.
   *
   * @return {Element} List item element.
   */
  createResultTemplate: function awesomescreen_createResultTemplate() {
    var template = document.createElement('li');
    var textArea = document.createElement('div');
    var backImgArea = document.createElement('div');
    var imgArea = document.createElement('div');
    var url = document.createElement('span');
    var title = document.createElement('span');
    var img = document.createElement('img');

    template.setAttribute('role', 'listitem');
    template.classList.add('history-area');
    url.classList.add('text-url');
    title.classList.add('text-title');

    img.classList.add('icon-img');
    textArea.appendChild(title);
    textArea.appendChild(url);

    backImgArea.classList.add('back-icon-img');
    backImgArea.appendChild(img);
    imgArea.appendChild(backImgArea);
    imgArea.classList.add('img-area');

    textArea.classList.add('text-area');
    template.appendChild(imgArea);
    template.appendChild(textArea);
    return template;
  },

  //Add "topsite, tab" an element configuration process
  createTopList: function awesomescreen_createTopList() {
    var topPanels = document.createElement('div');
    var list = document.createElement('ul');
    topPanels.id = "top-panels";
    list.setAttribute('role', 'listbox');
    list.id = "top-site-list";
    topPanels.appendChild(list);

    return topPanels;
  },

  createtabList: function awesomescreen_createtabList() {
    var template = document.createElement('li');
    var delArea = document.createElement('div');
    var delImg = document.createElement('span');
    var backArea = document.createElement('div');
    var tabviewThumbnailArea =  backArea.cloneNode(true);
    var tabviewListArea =  backArea.cloneNode(true);
    var tabThumbnail = backArea.cloneNode(true);
    var tabviewTitleArea = backArea.cloneNode(true);
    var tabviewTitle = backArea.cloneNode(true);

    template.classList.add('tabview-site-item');
    delArea.classList.add('del-area');
    delImg.classList.add('del-img');
    backArea.classList.add('back-area');
    delImg.classList.add('del-img');
    tabviewListArea.classList.add('tabviewList-area');
    tabviewTitle.classList.add('tabview-title');
    tabviewTitleArea.classList.add('tabview-title-area');
    tabThumbnail.classList.add('tab-thumbnail');

    delArea.appendChild(delImg);
    tabviewTitleArea.appendChild(tabviewTitle);
    tabThumbnail.appendChild(tabviewListArea);
    backArea.appendChild(tabThumbnail);
    backArea.appendChild(tabviewTitleArea);
    template.appendChild(delArea);
    template.appendChild(backArea);

    return template;
  },

  createNewtabTemplate: function awesomescreen_createNewtabTemplate() {
    var template = document.createElement('li').cloneNode(true);
    var delArea = document.createElement('div');
    var delImg = document.createElement('span');
    var backArea = document.createElement('div');
    var tabviewThumbnailArea =  backArea.cloneNode(true);
    var tabviewListArea =  backArea.cloneNode(true);
    var tabThumbnail = backArea.cloneNode(true);

    template.classList.add('tabview-site-item');
    template.id = "newtab";
    delArea.classList.add('del-area');
    delImg.classList.add('del-img');
    delImg.classList.add('hidden');
    backArea.classList.add('back-area');
    tabviewListArea.classList.add('tabviewList-area');

    tabThumbnail.id = 'new-thumbnail';
    tabThumbnail.style.backgroundImage = 'url(' + this.DEFAULT_TAB_ADD + ')';
    tabThumbnail.style.backgroundRepeat = 'no-repeat';
    tabThumbnail.style.backgroundSize = 'contain';
    tabThumbnail.style.backgroundPosition = 'center';
    tabThumbnail.style.backgroundColor = '#5f6267';

    delArea.appendChild(delImg);
    tabThumbnail.appendChild(tabviewListArea);
    backArea.appendChild(tabThumbnail);
    template.appendChild(delArea);
    template.appendChild(backArea);

    return template;
  },

  createtopTemplate: function awesomescreen_createtopTemplate() {
    var template = document.createElement('li');
    var topListArea = document.createElement('div');
    var siteTitleArea = topListArea.cloneNode(true);
    var siteTitle = topListArea.cloneNode(true);
    var toptabUrl = topListArea.cloneNode(true);
    var thumbnailArea =  topListArea.cloneNode(true);

    template.classList.add('top-site-item');
    topListArea.classList.add('topList-area');
    thumbnailArea.classList.add('thumbnail-area')

    siteTitleArea.classList.add('site-title-area');
    siteTitle.classList.add('site-title');
    toptabUrl.classList.add('toptab-url');

    siteTitleArea.appendChild(siteTitle);
    thumbnailArea.appendChild(topListArea);
    thumbnailArea.appendChild(toptabUrl);

    template.appendChild(thumbnailArea);
    template.appendChild(siteTitleArea);
    return template;
  },

  /**
   * Create a list item representing a result.
   *
   * @param {Object} data Result data.
   * @param {string} filter Text to highlight if necessary.
   * @param {string} listType Type of list being generated e.g. 'bookmarks'.
   * @param {number} data index.
   * @return {Element} List item element representing result.
   */
  createListItem: function awesomescreen_createListItem(data, filter,
    listType, index) {

    var listItem = null;
    var fromCache = false;

    // Clone list item element from the cache or a template
    if (listType == 'search') {
      if (this.searchTemplate) {
        listItem = this.searchTemplate.cloneNode(true);
        fromCache = true;
      }else{
        listItem = this.resultTemplate.cloneNode(true);
        this.searchTemplate = listItem;
      }
    }else if(this.resultCache[data.uri]) {
      listItem = this.resultTemplate.cloneNode(true);
    }else{
      listItem = this.resultTemplate.cloneNode(true);
      this.cacheResult(data.uri, listItem);
    }

    //Get the element of "textArea"
    var textArea = listItem.childNodes[1];
    // Set text content of non-cached results or those that may need updating
    if (!fromCache || listType == 'bookmarks' || listType == 'results' ||
      listType == 'search') {

      //Change acquisition element, such as a "title"
      var title = textArea.childNodes[0];
      var url = textArea.childNodes[1];

      title.textContent = data.title
      if (data.uri == this.ABOUT_PAGE_URL) {
        url.textContent = 'about:';
      }else{
        url.textContent = data.uri
      }
    }

    //Add an element acquisition process of "icon image, title"
    //image.textarea get
    var iconImg = listItem.childNodes[0].childNodes[0].childNodes[0];
    var backImg = listItem.childNodes[0].childNodes[0];

    // Set result icon
    //"Underlay" is deleted because unnecessary
    if (!data.iconUri) {
      //Change "link" element to "iconImg" element
      iconImg.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
      iconImg.src = this.DEFAULT_FAVICON;
    }else{
      iconImg.src = data.iconUri;
      if( (iconImg.naturalWidth > 32) || (data.iconUri == this.DEFAULT_FAVICON)){
        iconImg.style.width = '74px';
        iconImg.style.height = '74px';
        iconImg.style.backgroundSize = '74px 74px';
      }else{
        iconImg.style.width = '42px';
        iconImg.style.height = '42px';
        iconImg.style.backgroundSize = '42px 42px';
      }
    }
    //To impart a unique ID to the list that you created
    if(index == null) index = 0;
    listItem.id = 'list-' + index;

    //List display number determination process
    if(index <= this.LIST_NUM - 1) listItem.classList.add('visible');
    listItem.tabIndex = index + 1;

    // Add event listeners(listItem)
    listItem.addEventListener('mouseup', this.clickBmHisList.bind(this));
    listItem.addEventListener('keyup', this.dialogButtonKeyup.bind(this));
    listItem.addEventListener('mouseover', this.mouseOverFunc.bind(this));
    listItem.addEventListener('mouseout', this.mouseOutFunc.bind(this));
    listItem.addEventListener('DOMMouseScroll', this.mouseWheelFunc.bind(this));
    return listItem;
  },

  //Add "topsite, tab" the list creation process of the main
  /**
   * Create a list item representing a result.
   *
   * @param {Object} data Result data.
   * @param {string} filter Text to highlight if necessary.
   * @param {string} listType Type of list being generated e.g. 'bookmarks'.
   * @param {number} data index.
   * @return {Element} List item element representing result.
   */
  createListItemTopsite: function awesomescreen_createListItemTopsite(data, filter,
    listType, index) {

    var listItem = null;
    var fromCache = false;

    // Clone list item element from the cache or a template
    if (listType == 'search') {
      if (this.searchTemplate) {
        listItem = this.searchTemplate.cloneNode(true);
        fromCache = true;
      }else{
        listItem = this.topTemplate.cloneNode(true);
        this.searchTemplate = listItem;
      }
    }else if(this.resultCache[data.uri]) {
      //listItem = this.resultCache[data.uri].cloneNode(true);
      listItem = this.topTemplate.cloneNode(true);
      //fromCache = true;
    }else{
      listItem = this.topTemplate.cloneNode(true);
      this.cacheResult(data.uri, listItem);
    }

    // If the result was cached, nothing left to do so return it
    if (fromCache) {
      listItem.addEventListener('mouseover', this.mouseOverTopsiteFunc.bind(this));
     return listItem;
    }

    var title = listItem.childNodes[1].childNodes[0];
    title.textContent = data.title;
    var url = listItem.childNodes[0].childNodes[1];
    url.textContent = data.uri;

    //image.textarea get
    var iconImg = listItem.childNodes[0];
    var imgUrl = "";
    // Set result icon
    if (!data.screenshot) {
      if(data.title == Settings.DEFAULT_HOMEPAGE){
        iconImg.style.backgroundImage = 'url(' + this.DEFAULT_SCREENSHOT + ')';
        iconImg.style.backgroundRepeat = 'no-repeat';
        iconImg.style.backgroundPosition = 'center';

      }else{
        iconImg.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
        iconImg.style.backgroundColor = '#a3a3a3';
        iconImg.style.backgroundSize = 'contain';
        iconImg.style.backgroundRepeat = 'no-repeat';
        iconImg.style.backgroundPosition = 'center';
      }
    }else{
      if(data.title == Settings.DEFAULT_HOMEPAGE){
        iconImg.style.backgroundImage = 'url(' + this.DEFAULT_SCREENSHOT + ')';
        iconImg.style.backgroundRepeat = 'no-repeat';
        iconImg.style.backgroundPosition = 'center';
      }else{
        var imgUrl = window.URL.createObjectURL(data.screenshot);
        iconImg.style.backgroundImage = 'url(' + imgUrl + ')';
        iconImg.style.backgroundRepeat = 'no-repeat';
        iconImg.style.backgroundPosition = 'center';
        var topListObject = {id:'top-list-' + index, thumbnail: data.screenshot};
        this.objectURLs.push(topListObject);
      }
    }
    listItem.id = 'top-list-' + index;
    // Add event listeners(listItem)
    listItem.addEventListener('mouseup', this.clickTopList.bind(this));
    listItem.addEventListener('mousedown', this.clickTopAction.bind(this));
    listItem.addEventListener('mouseover', this.mouseOverTopsiteFunc.bind(this));
    listItem.addEventListener('mouseout', this.mouseOutTopsiteFunc.bind(this));
    return listItem;
  },

  /**
   * Cache an awesomescreen result.
   *
   * Use this.resultCache as a FIFO cache of DOM elements for previous results.
   *
   * @param {string} uri URI of result to cache.
   * @param {Element} listItem DOM element representing result.
   */
  cacheResult: function awesomescreen_cacheResult(uri, listItem) {
    var keys = Object.keys(this.resultCache);
    if (keys.length >= this.RESULT_CACHE_SIZE) delete this.resultCache[keys[0]];
    this.resultCache[uri] = listItem;
  },

  /**
   * Clear the cache of awesomescreen results to save memory.
   */
  clearResultCache: function awesomescreen_clearResultCache() {
    this.resultCache = {};
    this.searchTemplate = null;

    this.objectURLs.forEach(function(url) {
      window.URL.revokeObjectURL(url);
    });
    this.objectURLs = [];
  },

  /**
   * Handle the user clicking on an awesomescreen result.
   *
   * @param {Event} e Click event.
   */
  handleClickResult: function awesomescreen_handleClickResult(e) {
    this.clearResultCache();
    Browser.followLink(e);
  },

  /**
   * Add Bookmark Current url
   *
   * @param {bmList} bookmark list.
   */
  addBookmarkSite: function awesomescreen_addBookmarkSite(bmList) {

    Awesomescreen.dialogInitialize();
    if(Toolbar.isBookmarks()){
      Awesomescreen.optionDialogOpen('rmBookmark');
    }else{
      //Bookmark maximum number check
      if(bmList.length >= Browser.MAX_BOOKMARK_LIST){
        //TODO This message I want to change later
        Awesomescreen.dialogBannerMessage.innerHTML = _('WB_LT_BOOKMARK_ERROR_1');
        Awesomescreen.showBannerMessage();
      }else{
        Awesomescreen.bmDialogSetting();
        //dialog show
        Awesomescreen.dialogShow();
      }
    }
  },

  /**
   * bookmark dialog setting
   */
  bmDialogSetting: function awesomescreen_bmDialogSetting() {

    this.focusList = new Array();
    this.blurFlag = false;
    Awesomescreen.messageTitle.innerHTML = _('WB_LT_BOOKMARK_THIS_PAGE');
    Awesomescreen.inputArea.value = Browser.currentInfo.title;
    var elementIDs = [Awesomescreen.bmtitleArea, Awesomescreen.checkArea, Awesomescreen.okButton,
                      Awesomescreen.cancelButton, Awesomescreen.messageArea];
    this.elementSetDisplayBlock(elementIDs);

    var elementIDs2 = [Awesomescreen.inputArea, Awesomescreen.circleImg, Awesomescreen.checkBox,
                      Awesomescreen.okButton, Awesomescreen.cancelButton];

    this.elementSetTabindex(elementIDs2);
    this.focusList.push(this.okButton);
    this.focusList.push(this.cancelButton);
    this.focusList.push(this.inputArea);
    this.focusList.push(this.circleImg);
    this.focusList.push(this.checkBox);
    this.focusPos = this.focusList.length - 4;

    Awesomescreen.buttonArea.style.opacity = '1';
  },

  /**
   * AClear input content
   */
  inputClear: function awesomescreen_inputClear(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    this.inputArea.style.color = '#020202';
    Awesomescreen.inputArea.value = "";
    Awesomescreen.inputArea.style.color = '#fff';
  },

  /**
   * "Pin to home" check processing
   */
  pintohomeCheck: function awesomescreen_pintohomeCheck(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    if(this.checkBox.classList.contains('true')){
      this.checkBox.className = 'false';
      this.checkImg.style.opacity = '0';
    }else{
      this.checkBox.className = 'true';
      this.checkImg.style.opacity = '1';
    }
  },

  /**
   * "Bookmark", "pin to home" registration process
   */
  dialogConfirm: function awesomescreen_dialogConfirm(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;

    //title is I do check if empty
    var bmTitle = this.inputArea.value;
    if(bmTitle == "") bmTitle =  Browser.currentInfo.title;

    //Check confirmation of "pin to home"
    if(this.checkBox.classList.contains('true')){
      this.pinToHome();
      this.checkBox.className = 'false';
      this.checkImg.style.opacity = '0';
    }

    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      //add a bookmark
      BrowserDB.addBookmark(Browser.currentInfo.url,
                          bmTitle,
                          Awesomescreen.addBookmarkHidden.bind(Awesomescreen));
      });
    target.addEventListener('transitionend', end_event, false);
  },

  addBookmarkHidden: function awesomescreen_addBookmarkHidden() {
    Browser.refreshBrowserParts();
    this.dialogHidden();
    //Check confirmation of "pin to home"
    if(this.checkBox.classList.contains('true')){
      this.checkBox.className = 'false';
      this.showBannerMessage();
    }

    Toolbar.bookmarkButtonAnime.dataset.anime = 'start';
    Toolbar.showBookmarksButtonAnime.dataset.anime = 'start';
    Toolbar.showBookmarksButton.style.display = 'none';
  },

  /**
   * "remove", "rename" dialog determination process
   */
  optionDialogOpen: function awesomescreen_optionDialogOpen(type) {
    this.focusList = new Array();
    this.blurFlag = false;
    this.dialogInitialize();
    var elementIDs = [];
    //And determine the type to open the dialog menu
    if(!type){
      if(this.isDisplayedList()){
        if(this.isDisplayedBookmark()){
          type = this.DEFAULT_BOOKMARK;
        }else if(this.isDisplayedHistory()){
          type = this.DEFAULT_HISTORY;
        }
      }else if(this.isDisplayedTop()){
        type = this.DEFAULT_TOPSITE;
      }
    }

    switch(type){
      case this.DEFAULT_BOOKMARK:
        elementIDs = [this.pinhomeButton, this.removeBookmarkButton, this.editButton];
        this.focusList.push(this.pinhomeButton);
        this.focusList.push(this.removeBookmarkButton);
        this.focusList.push(this.editButton);
        this.focusPos = this.focusList.length - 3;
        this.elementSetDisplayBlock(elementIDs);
        this.elementSetTabindex(elementIDs);
        break;

      case this.DEFAULT_HISTORY:
        elementIDs = [this.pinhomeButton, this.clhistoryButton, this.removeButton];
        this.focusList.push(this.pinhomeButton);
        this.focusList.push(this.clhistoryButton);
        this.focusList.push(this.removeButton);
        this.focusPos = this.focusList.length - 3;
        this.elementSetDisplayBlock(elementIDs);
        this.elementSetTabindex(elementIDs);
        break;

      case this.DEFAULT_TOPSITE:
        elementIDs = [this.pinhomeButton, this.sethomeButton, this.removeTopsiteButton];
        this.elementSetDisplayBlock(elementIDs);
        this.elementSetTabindex(elementIDs);
        this.focusList.push(this.pinhomeButton);
        this.focusList.push(this.sethomeButton);
        this.focusList.push(this.removeTopsiteButton);
        this.focusPos = this.focusList.length - 3;
        break;

      case 'rmBookmark':
        this.messageTitle.innerHTML = _('WB_LT_REMOVE_FROM_BOOKMARKS');
        elementIDs = [this.messageArea, this.messageTitle, this.removeConfirmButton, this.cancelButton];
        this.elementSetDisplayBlock(elementIDs);
        elementIDs = [this.removeConfirmButton, this.cancelButton];
        this.elementSetTabindex(elementIDs);
        this.focusList.push(this.removeConfirmButton);
        this.focusList.push(this.cancelButton);
        this.focusPos = this.focusList.length - 1;
        break;

      case 'clHistory': // remove One history item
        this.messageTitle.innerHTML = _('WB_LT_REMOVE_HISTORY');
        elementIDs = [this.messageArea, this.messageTitle, this.removeConfirmButton, this.cancelButton];
        this.elementSetDisplayBlock(elementIDs);
        elementIDs = [this.removeConfirmButton, this.cancelButton];
        this.elementSetTabindex(elementIDs);
        this.focusList.push(this.removeConfirmButton);
        this.focusList.push(this.cancelButton);
        this.focusPos = this.focusList.length - 1;
        break;

      case 'rnBookmark':
        this.messageTitle.innerHTML = _('WB_LT_RENAME_BOOKMARK');
        this.inputArea.value = this.selectList.childNodes[1].childNodes[0].textContent;
        elementIDs = [this.messageArea, this.bmtitleArea, this.messageTitle, this.renameConfirmButton, this.cancelButton];
        this.elementSetDisplayBlock(elementIDs);
        elementIDs = [this.inputArea, this.circleImg, this.renameConfirmButton, this.cancelButton];
        this.elementSetTabindex(elementIDs);
        this.focusList.push(this.renameConfirmButton);
        this.focusList.push(this.cancelButton);
        this.focusList.push(this.inputArea);
        this.focusList.push(this.circleImg);
        this.focusPos = this.focusList.length - 3;
        break;

      case 'rmHistory': // remove All history
        this.messageTitle.innerHTML = _('WB_LT_CLEAR_ALL_HISTORY');
        elementIDs = [this.messageArea, this.messageTitle, this.clearButton, this.cancelButton];
        this.elementSetDisplayBlock(elementIDs);
        elementIDs = [this.clearButton, this.cancelButton];
        this.elementSetTabindex(elementIDs);
        this.focusList.push(this.clearButton);
        this.focusList.push(this.cancelButton);
        this.focusPos = this.focusList.length - 1;
        break;
      default:
        break;
    }
    this.buttonArea.style.opacity = '1';
    this.dialogShow(type);

  },

  /**
   * tabindex ,display initialize
   */
  dialogInitialize: function awesomescreen_dialogInitialize(type) {
    var elementIDs = [
           this.inputArea, this.circleImg, this.checkBox, this.cancelButton,
           this.okButton, this.clearButton, this.clhistoryButton, this.editButton,
           this.pinhomeButton, this.removeButton, this.removeConfirmButton, this.removeTopsiteButton,
           this.renameConfirmButton, this.sethomeButton, this.removeBookmarkButton
        ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementSetTabindexClear(elementIDs);

    var elementIDs2 = [
           this.messageArea, this.bmtitleArea, this.checkArea, this.cancelButton,
           this.okButton, this.clearButton, this.clhistoryButton, this.editButton,
           this.pinhomeButton, this.removeButton, this.removeConfirmButton, this.removeTopsiteButton,
           this.renameConfirmButton, this.sethomeButton, this.removeBookmarkButton
        ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementSetDisplayNone(elementIDs2);
  },

  elementSetTabindex: function awesomescreen_elementSetTabindex(elementIDs) {
    elementIDs.forEach(function createElementTabIndex(name,index) {
      name.tabIndex = index + 50;
    }, this);
  },

  elementSetTabindexClear: function awesomescreen_elementSetTabindexClear(elementIDs) {
    elementIDs.forEach(function createElementTabIndex(name,index) {
      name.tabIndex = '-1';
    }, this);
  },

  elementSetDisplayBlock: function awesomescreen_elementSetDisplay(elementIDs) {
    elementIDs.forEach(function createElementStyle(name) {
      name.style.display = 'block';
    }, this);
  },

  elementSetDisplayNone: function awesomescreen_elementSetDisplay(elementIDs) {
    elementIDs.forEach(function createElementStyle(name) {
      name.style.display = 'none';
    }, this);
  },

  focusChange: function awesomescreen_focusChange(pos) {
    if( Awesomescreen.blurFlag ) {
      Awesomescreen.blurFlag = false;
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
    }
    for( var i = 0 ; i < Awesomescreen.focusList.length ; i ++ ) {
      if( i == pos ) {
        if(Awesomescreen.focusList[i].nodeName != 'INPUT'){

          Awesomescreen.focusList[i].focus();
          if(!Awesomescreen.focusList[i].id.contains('circle-img')){
            Awesomescreen.bmtitleArea.classList.remove('exfocus');
           }
         }else{
          document.activeElement.blur();
          Awesomescreen.bmtitleArea.classList.add('exfocus');
         }
        Awesomescreen.focusImgFunc(Awesomescreen.focusList[i], null);
      }
    }
  },

  handleinputAreaFocus: function settings_handleinputAreaFocus(evt) {
    if( evt ) evt.preventDefault();
    Awesomescreen.bmtitleArea.classList.add('input');
    Awesomescreen.bmtitleArea.classList.remove('exfocus');
  },

  handleinputAreaClick: function awesomescreen_handleinputAreaClick(evt) {
    Browser.switchCursorMode(true);
    Browser.switchCursorMode(false);

    Awesomescreen.bmtitleArea.classList.add('input');
    Awesomescreen.bmtitleArea.classList.remove('exfocus');
    Awesomescreen.focusPos = 2;
    Awesomescreen.focusList[Awesomescreen.focusPos].focus();
    Awesomescreen.pointerImg.style.display = 'none';
  },

  /**
   * input Blur event
   */
  handleinputAreaBlur: function awesomescreen_handleinputAreaBlur(evt) {
    if( evt ) evt.preventDefault();
    if( Awesomescreen.pointerImg.style.display == 'none' ) {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
    }
    // Pointer image to the input area(fucusPos=2)
    Awesomescreen.focusPos = 2;
    Awesomescreen.bmtitleArea.classList.remove('input');
    Awesomescreen.focusChange(Awesomescreen.focusPos);
    Awesomescreen.pointerImg.style.display = 'block';
  },

  clickEditButton: function awesomescreen_clickEditButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.optionDialogOpen('rnBookmark');
    });
    target.addEventListener('transitionend', end_event, false);
  },

  clickPinhomeButton: function awesomescreen_clickPinhomeButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.pinToHome();
    });
    target.addEventListener('transitionend', end_event, false);
    return false;
  },

  clickRemoveButton: function awesomescreen_clickRemoveButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    this.optionDialogOpen('rmHistory');
  },

  clickRemoveBookmarkButton: function awesomescreen_clickRemoveBookmarkButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.optionDialogOpen('rmBookmark');
    });
    target.addEventListener('transitionend', end_event, false);
   },

  clickSethomeButton: function awesomescreen_clickSethomeButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    var url = this.selectList.childNodes[0].childNodes[1].textContent;
    var title = this.selectList.childNodes[1].childNodes[0].textContent;
    Settings.setHomepage(url);

    var strMessage = _('WB_LT_SET_HOMEPAGE', {value0:title});
    this.dialogBannerMessage.textContent = strMessage;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.allDialogHidden();
      Awesomescreen.showBannerMessage();
    });
    target.addEventListener('transitionend', end_event, false);
  },

  showBannerMessage: function awesomescreen_showBannerMessage() {
    this.dialogBannerMessage.style.opacity = '1';
    clearTimeout(this.showBannerMessageTimeoutID);
    this.showBannerMessageTimeoutID = setTimeout(function(){
      Awesomescreen.dialogBannerMessage.style.opacity = '0';
      Awesomescreen.dialogBannerMessage.classList.remove('visible');
    }, 3000);
  },

  clickRmtopsiteButton: function awesomescreen_clickRmtopsiteButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    var url = this.selectList.childNodes[0].childNodes[1].textContent;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      BrowserDB.removeTopsite(url,Awesomescreen.topsiteReload.bind(Awesomescreen));
    });
    target.addEventListener('transitionend', end_event, false);
  },

  clickClhistoryButton: function awesomescreen_clickClhistoryButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.optionDialogOpen('clHistory');
    });
    target.addEventListener('transitionend', end_event, false);
  },

  clickClearButton: function awesomescreen_clickClearButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    this.historyClearFlg = true;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      BrowserDB.clearHistory(Awesomescreen.allDialogHidden.bind(Awesomescreen));
    });
    target.addEventListener('transitionend', end_event, false);
  },

  clickRmconfirmButton: function awesomescreen_clickClearButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.titleRemove();
    });
    target.addEventListener('transitionend', end_event, false);
  },

  clickCancelButton: function awesomescreen_clickCancelButton(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      Awesomescreen.dialogHidden();
    });
    target.addEventListener('transitionend', end_event, false);
  },
  /**
   * "bookmark", "history" title remove processing
   */
  titleRemove: function awesomescreen_titleRemove(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    var listUrl = "";
    if(Awesomescreen.isDisplayedList()){
      listUrl = this.selectList.childNodes[1].childNodes[1].textContent;
    }else{
      listUrl = Browser.currentInfo.url;
    }

    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      if(Awesomescreen.isDisplayedHistory()){
        BrowserDB.removeHistory(listUrl, Awesomescreen.bmlistRemoveFunc.bind(Awesomescreen));
      }else{
        BrowserDB.removeBookmark(listUrl, Awesomescreen.bmlistRemoveFunc.bind(Awesomescreen));
      }
    });
    target.addEventListener('transitionend', end_event, false);
  },

  /**
   * "Bookmark" title rename processing
   */
  titleRename: function awesomescreen_titleRename(ev) {
    if(ev) ev.preventDefault();
    if(ev.button == 2) return;
    //title is I do check if empty
    var bmTitle = "";
    var listUrl = this.selectList.childNodes[1].childNodes[1].textContent;
    var listTitle = this.selectList.childNodes[1].childNodes[0].textContent;

    if(this.inputArea.value == ""){
      bmTitle =  listTitle;
    }else{
      bmTitle = this.inputArea.value;
    }
    // Animation end event
    var target = ev.currentTarget;
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      //updateBookmark
      BrowserDB.updateBookmark(listUrl,
                               bmTitle,
                               Awesomescreen.allDialogHidden.bind(Awesomescreen, bmTitle));
    });
    target.addEventListener('transitionend', end_event, false);
  },

   /**
    * The name change process of bookmark,history
    */
   bmlistRemoveFunc: function awesomescreen_bmlistRemoveFunc() {

     //add bookmark to remove
     if(!this.isDisplayedList()){
       this.dialogHidden();
       Browser.switchCursorMode(true);
       this.pointerImg.style.display = 'none';
       Browser.refreshBrowserParts();
       return;
      }

     //next to focus element
     var focusElem = false;
     if(this.selectList.nextSibling){
       focusElem = this.selectList.nextSibling;
     }else if(this.selectList.previousSibling){
       focusElem = this.selectList.previousSibling;
     }

     //target element remove
     this.bmhisList.removeChild(this.selectList);

     //To reacquire the list after deletion
     var visiList = this.bmhisList.getElementsByClassName('visible');
     var visiLength = visiList.length;
     var bmlist = document.getElementsByClassName('history-area');
     var bmlistLength = bmlist.length;

     //add to visible class
     if(visiList[visiLength - 1]){
       if(visiList[visiLength - 1].nextSibling){
         visiList[visiLength - 1].nextSibling.classList.add('visible');
       }else if(visiList[0].previousSibling){
         visiList[0].previousSibling.classList.add('visible');
       }

      if(bmlistLength <= this.LIST_NUM + 1){
        this.upgradimgArea.classList.add('hidden');
        this.downgradimgArea.classList.add('hidden');
       }
       this.dialogHidden();
       Browser.switchCursorMode(false);
       focusElem.focus();
       this.focusImgFunc(focusElem);
       this.blurFlag = false;
     }else{
        //if the elements of the list of one
       this.dialogHidden();
       this.pointerImg.style.display = 'none';
     }
     Browser.refreshBrowserParts();
   },

  dialogShow: function awesomescreen_dialogShow(type) {
    Awesomescreen.dialogArea.style.opacity = '1';
    document.body.classList.add('awesomescreen-screen');
    this.awesomescreen.classList.add('awesomescreen-screen-dialog');
    this.dialogArea.style.display = 'block';
    Browser.switchCursorMode(true);
    Browser.switchCursorMode(false);
    this.focusChange(this.focusPos);

    this.listDialog.style.backgroundImage = 'none';

  },

  dialogHidden: function awesomescreen_dialogHidden(ev) {
    if(ev) ev.preventDefault();
    if((ev) && (ev.button == 2)) return;
    if(Awesomescreen.isDisplayedDialog()){
      Awesomescreen.awesomescreen.classList.remove('awesomescreen-screen-dialog');
      Awesomescreen.listDialog.style.backgroundImage = 'url("../style/images/background_black.png")';
      Awesomescreen.dialogArea.style.display = 'none';
    }
    if( (!(Awesomescreen.isDisplayedList())) && (!Awesomescreen.isDisplayedTop()) ) {
         document.body.classList.remove('awesomescreen-screen');
    }

    if(Awesomescreen.checkBox.classList.contains('true')){
      Awesomescreen.checkBox.className = 'false';
      Awesomescreen.checkImg.style.opacity = '0';
    }

    Awesomescreen.exeflag = true;

    //And release the focus of active elements
    if( Awesomescreen.isDisplayed() ) {
      if(Awesomescreen.isDisplayedTop() ){
        if(Awesomescreen.isDisplayedList() ){
          Browser.switchCursorMode(false);
          Awesomescreen.selectList.focus();
        }else{
          Browser.switchCursorMode(true);
        }
      }else{
        Browser.switchCursorMode(true);
        Browser.switchCursorMode(false);
        Awesomescreen.selectList.focus();
      }
    } else {
      Browser.switchCursorMode(true);
    }
    if( Awesomescreen.isDisplayedList()){
      this.selectList.focus();
      this.focusImgFunc(this.selectList, null);
    }else{
      this.pointerImg.style.display = 'none';
    }
    Awesomescreen.dialogArea.style.display = 'none';
  },

  /**
   * bookmark,history list hidden and dialog menu hidden.
   */
  allDialogHidden: function awesomescreen_allDialogHidden(bmTitle) {
    this.dialogHidden();
    Browser.switchCursorMode(true);

    this.pointerImg.style.display = 'none';
    if(this.isDisplayedList()){
      if(this.history.firstChild){
        if(this.historyClearFlg){
          this.historyClearFlg = false;
          this.listHidden();
          Settings.getDefaultHomepage(this.defaultTopsite.bind(this));
        }else{
          this.selectHistoryTab();
        }
      }else{
        if(bmTitle){
          this.selectList.childNodes[1].childNodes[0].textContent = bmTitle;
           Browser.switchCursorMode(false);
           this.pointerImg.style.display = 'block';
           this.blurFlag = false;
         }
      }
    }
    Browser.refreshBrowserParts();
  },

  /**
   * dialog menu hidden, and topsite reload
   */
  topsiteReload: function awesomescreen_topsiteReload() {
    this.dialogHidden();
    this.selectTopSites();
  },

  dialogButtonKeyup: function awesomescreen_dialogButtonKeyup(evt) {
    if( evt ) evt.preventDefault();

    if(Awesomescreen.blurFlag){
      Awesomescreen.blurFlag = false;
      return;
    }

    switch( evt.keyCode ) {
      case KeyEvent.DOM_VK_RETURN :
        var elm = document.activeElement;
        elm.classList.remove('active');
        var dEvt = document.createEvent("MouseEvents");
        dEvt.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0,
            false, false, false, false, 0, elm);
        elm.dispatchEvent( dEvt );
        break;
    }

  },

  /**
   * option dialog , pin to home
   */
  pinToHome: function awesomescreen_pinToHome() {

    var url = "";
    var title  = "";

    switch(true) {
      case this.isDisplayedList() :
        this.showAwesomeLoadingIcon();
        url = this.selectList.childNodes[1].childNodes[1].textContent;
        this.pintohomeTitle = this.selectList.childNodes[1].childNodes[0].textContent;
        this.callAwesomescreenEvents(url);
        return;
        break;
      case this.isDisplayedTop() :
        this.showAwesomeLoadingIcon();
        url = this.selectList.childNodes[0].childNodes[1].textContent;
        this.pintohomeTitle = this.selectList.childNodes[1].childNodes[0].textContent;
        this.callAwesomescreenEvents(url);
        return;
        break;
      case this.isDisplayedDialog() :
        if(this.checkBox.classList.contains('true')){
          this.showAwesomeLoadingIcon(this.DEFAULT_LOADPOSITION);
        }else{
          this.showAwesomeLoadingIcon();
        }
        if(this.checkBox.classList.contains('true')){
          title = this.inputArea.value;
          Awesomescreen.getScreenshot(Browser.currentInfo.dom.getScreenshot,Browser.currentInfo.url, this.inputArea.value, null);
          return;
        }
        break;
      case (!this.isDisplayed()) :
        this.showAwesomeLoadingIcon();
        Awesomescreen.getScreenshot(Browser.currentInfo.dom.getScreenshot,Browser.currentInfo.url, Browser.currentInfo.title, null);
        return;
        break;
      default:
        break;
    }
  },

  /**
   * Select tabview button.
   */
  getScreenshot: function awesomescreen_getScreenshot(domGetScreenshot, url, title, calback) {

    var widthScreenshot = "";
    if(Browser.mainBlock.dataset.sidebar == 'true'){
      widthScreenshot = this.PTH_THUMBNAIL_WIDTH_SIDE;
    }else{
      widthScreenshot = this.PTH_THUMBNAIL_WIDTH_FULL;
    }

    if( (this.isDisplayedList()) || (this.isDisplayedTop()) ){
      title = this.pintohomeTitle;
    }

    if( domGetScreenshot ) {
      domGetScreenshot(
        widthScreenshot, this.PTH_THUMBNAIL_HEIGHT).onsuccess =
      (function(ev) {
        var blob = new Blob([ev.target.result], {type: 'image/jpeg'});
        this.callMozActivity(url, title, blob, calback);
      }).bind(this);
    }

  },

  /**
   * Select tabview button.
   */
  callAwesomescreenEvents: function awesomescreen_callAwesomescreenEvents(url) {
    this.finalDispTabId = Browser.currentInfo.id;
    var tabId = Browser.createIframe(url);
    this.bindAwesomescreenEvents(Browser.info[tabId].dom, Browser.info[tabId]);
  },

  /**
   * call to pin to home Activity.
   */
  callMozActivity: function awesomescreen_callMozActivity(url, title, blob, callback) {
    var entryPoint = 'index.html';
    var launchURL = location.origin + '/' + entryPoint + '#' + url;
    this.getManifest();
    if(!title) title = url;
    var activity = new MozActivity({
      name: 'pin',
      data: {
        name: title,
        type: 'AppBookmark',
        manifestURL: this.manifestURL ,
        launchURL: launchURL,
        thumbnail: blob
      }
    });

    activity.onsuccess = function() {
      if(Awesomescreen.isDisplayedDialog()) Awesomescreen.dialogHidden();
      Awesomescreen.hiddenAwesomeLoadingIcon();
      if(callback){
        callback();
      }
    };

    activity.onerror = function() {
      Browser.debug(activity.error.name + ' : pin');
      Awesomescreen.hiddenAwesomeLoadingIcon();
      if(callback) callback();
    };
  },

  handleAwesomescreenEvent: function awesomescreen_handleAwesomescreenEvent(tab) {
    return (function(evt) {
      switch (evt.type) {
      case 'mozbrowserloadstart':
        Browser.debug('awesomescreen mozbrowserloadstart[' + tab.id + ']');
        evt.preventDefault();
        tab.title = null;
        tab.iconUrl = null;
        break;
      case 'mozbrowserloadend':
        Browser.debug('awesomescreen mozbrowserloadend[' + tab.id + ']');
        evt.preventDefault();
        Awesomescreen.getScreenshot(tab.dom.getScreenshot, tab.url, tab.title, this.deleteIframe.bind(tab.id));
        break;
      case 'mozbrowsercontextmenu':
        Awesomescreen.hiddenAwesomeLoadingIcon();
        Browser.debug('awesomescreen mozbrowsercontextmenu[' + tab.id + ']');
        evt.preventDefault();
        break;
      case 'mozbrowsererror':
        Awesomescreen.hiddenAwesomeLoadingIcon();
        Browser.debug('awesomescreen mozbrowsererror[' + tab.id + ']');
        evt.preventDefault();
        break;
      default:
        Browser.debug('other event = ' + evt.type);
        break;
      }
    }).bind(this);
  },

  deleteIframe: function awesomescreen_deleteIframe() {
    if (Browser.info[this].alive) {
      Browser.info[this].dom.parentNode.removeChild(Browser.info[this].dom);
      Browser.info[this].alive = false;
    }
    delete Browser.info[this];
    Browser.switchVisibility(Browser.info[Awesomescreen.finalDispTabId], true);
  },

  showAwesomeLoadingIcon: function toolbar_showAwesomeLoadingIcon(type) {
    if(!this.awesomeLoadingIcon.classList.contains('visible')){
      if(type == this.DEFAULT_LOADPOSITION){
        if(Browser.mainBlock.dataset.sidebar == 'true'){
          this.awesomeLoadingIcon.classList.add('bookmarkPos1');
        }else{
          this.awesomeLoadingIcon.classList.add('bookmarkPos2');
         }
      }else{
        if(Browser.mainBlock.dataset.sidebar == 'true'){
          this.awesomeLoadingIcon.classList.add('sideBarPos1');
         }
       }
    this.awesomeLoadingIcon.classList.add('visible');
    }
  },

  hiddenAwesomeLoadingIcon: function toolbar_hiddenAwesomeLoadingIcon() {
    this.awesomeLoadingIcon.classList.remove('visible');
    if(this.awesomeLoadingIcon.classList.contains('sideBarPos1')){
      this.awesomeLoadingIcon.classList.remove('sideBarPos1');
    }
    if(this.awesomeLoadingIcon.classList.contains('bookmarkPos1')){
      this.awesomeLoadingIcon.classList.remove('bookmarkPos1');
    }
    if(this.awesomeLoadingIcon.classList.contains('bookmarkPos2')){
      this.awesomeLoadingIcon.classList.remove('bookmarkPos2');
    }
  },

  /**
   * Add Browser Event (iframe)
   */
  bindAwesomescreenEvents: function awesomescreen_bindAwesomescreenEvents(iframe, tab) {
    var awesomescreenEvents = ['loadstart', 'loadend', 'contextmenu',
                               'error'];
    awesomescreenEvents.forEach(function attachAwesomescreenEvent(type) {
      iframe.addEventListener('mozbrowser' + type,
                              this.handleAwesomescreenEvent(tab));
    }, this);
  },

  /**
   * Select tabview button.
   */
  selectTabviewSitesTab: function awesomescreen_selectTabviewSitesTab(data,count) {

    var id = data.id;
    var url = data.url;
    var title = data.title;
    var thumbnail = data.screenshot;

    var tabNum = count + 1;
    this.createTabpanel(id,url,title,thumbnail,tabNum);
  },

  /**
   * Click event listener of the new tab button.
   * @param {Event} e
   */
  handleNewTab: function browserHandleNewTab(e,type) {

    this.tabSiteList.innerHTML = "";
    //I get the information from the "iframe"
    var tabCount = Object.keys(Browser.info).length;
    var tabIds = Object.keys(Browser.info);

    if(tabCount > Awesomescreen.TABLIST_MAX) tabCount = Awesomescreen.TABLIST_MAX - 1;
    if(tabCount == 0){
      Awesomescreen.tabNewCreate(Awesomescreen.tabSiteList,tabCount);
    }else{
      for( var i=0; i < tabCount; i++) {
        Awesomescreen.selectTabviewSitesTab(Browser.info[tabIds[i]] ,i);
      }
    }
    switch(true){
      case tabCount <= 3:
        Awesomescreen.tabView.style.height = '360px';
        break;
      case tabCount <= 7:
        Awesomescreen.tabView.style.height = '720px';
        break;
      default:
        Awesomescreen.tabView.style.height = '1080px';
        break;
    }
    Awesomescreen.tabviewShow();
  },

  /**
   * tabview show.
   */
  tabviewShow:function awesomescreen_tabviewShow() {
      this.pointerImg.style.display = 'none';
      var tabCount = Object.keys(Browser.info).length;
      Browser.switchCursorMode(false);
      Awesomescreen.blurFlag = false;
      var fade_event_tabview_show = (function() {
        Awesomescreen.awesomescreen.classList.add('awesomescreen-screen-tab');
        document.body.classList.add('awesomescreen-screen');
        Awesomescreen.tabList = document.getElementsByClassName('tabview-site-item');
        Awesomescreen.tabList[0].childNodes[1].focus();
        Awesomescreen.focusImgFunc(Awesomescreen.tabList[0].childNodes[1]);
        Awesomescreen.tabView.removeEventListener('transitionend', fade_event_tabview_show, false);
      });

      // Add fade animantion event
      Awesomescreen.tabView.addEventListener('transitionend', fade_event_tabview_show, false);
      Awesomescreen.tabView.style.transform = 'translateY(0px)';
  },

  /**
   * tabview hidden.
   */
  tabviewHidden:function awesomescreen_tabviewHidden() {
    this.pointerImg.style.display = 'none';
    if(!(Awesomescreen.isDisplayedTop())){
      document.body.classList.remove('awesomescreen-screen');
    }
    Awesomescreen.awesomescreen.classList.remove('awesomescreen-screen-tab');
    document.activeElement.blur();
    if( Awesomescreen.isDisplayed() ) {
      if(Awesomescreen.isDisplayedTop()){
        Browser.switchCursorMode(true);
      }else{
        Browser.switchCursorMode(false);
      }
    } else {
      Browser.switchCursorMode(true);
    }
    // Fade animation end event handler
    var fade_event_tabview_hidden = (function() {
        Awesomescreen.tabView.removeEventListener('transitionend', fade_event_tabview_hidden, false);
    });
    Awesomescreen.tabView.addEventListener('transitionend', fade_event_tabview_hidden, false);
    Awesomescreen.tabView.style.transform = 'translateY(-1080px)';

  },
  /**
   * Update tab counter.
   */
  updateTabsCount: function awesomescreen_updateTabsCount() {
    var tabsCount = Object.keys(Browser.info).length;
    if(tabsCount >= 0 && tabsCount <= this.TABLIST_MAX){
      Toolbar.tabsButtonBlock.dataset.tabs = 'tab' +  ('00' + tabsCount).slice(-2);
    }

    // tabs icon action
    Toolbar.tabsButtonBlock.dataset.update = 'true';
    setTimeout( function() {
      Toolbar.tabsButtonBlock.dataset.update = 'false';
    }, 1000);
  },

  /**
   * Draw heading to divide up history list.
   *
   * @param {url} URL of the page you are currently viewing.
   * @param {title} Title of the page you are currently viewing.
   * @param {thumbnail} Thumbnail of the page you are currently viewing.
   */
  creatNewThumbnail: function awesomescreen_creatNewThumbnail(url,title,thumbnail) {

    var list = this.tabTemplate.cloneNode(true);
    var tabThumbnail = list.childNodes[1].childNodes[0];
    var tabTitle = list.childNodes[1].childNodes[1].childNodes[0];
    tabTitle.textContent = title;
    tabTitle.url = url;
    if((url != null)  && (thumbnail)){
      var imgUrl = window.URL.createObjectURL(thumbnail);
        tabThumbnail.style.backgroundImage = 'url(' + imgUrl + ')';
        tabThumbnail.style.backgroundRepeat = 'no-repeat';
        tabThumbnail.style.backgroundPosition = 'center';
    }else{
        tabThumbnail.style.backgroundImage = 'url(' + this.DEFAULT_FAVICON + ')';
        tabThumbnail.style.backgroundColor = '#5f6267';
        tabThumbnail.style.backgroundSize = 'contain';
        tabThumbnail.style.backgroundRepeat = 'no-repeat';
        tabThumbnail.style.backgroundPosition = 'center';

    }
    tabThumbnail.url = url;
    return list;

  },

  /**
   * event processing in the tab view screen.
   *
   * @param {ul} Parent element of the list you are currently viewing.
   */
  clickTabEvent: function awesomescreen_clickTabEvent(ev) {

    if( (!(ev.keyCode == KeyEvent.DOM_VK_RETURN)) && (!(ev.button == 0)) ) return;
    var actionElem = "";
    this.clickTabListFlg = true;
    if(this.clickTabActFlg){
      this.clickTabActFlg = false;
      this.clickTabListFlg = false;

      var fade_tab_action = (function() {
        var cName = ev.target.className;
        var list_Id = ev.target.parentNode;
        var tabid = ev.target.parentNode.id;
        actionElem.removeEventListener('transitionend', fade_tab_action, false);
        if(cName == 'del-img'){
          Awesomescreen.tabDelete(list_Id, ev);
        }else if(cName == 'back-area'){
          if(tabid == 'newtab'){
            Awesomescreen.createAddNewTab();
          }else{
            Awesomescreen.currentTabShow(ev.target);
          }
        }
      });
      if(ev.target){

        if(ev.target.className.contains('back-area')){
          actionElem = ev.target.childNodes[0];
        }else if(ev.target.className.contains('del-img')){
          actionElem = ev.target;
        }
        // Add fade animantion event
        actionElem.addEventListener('transitionend', fade_tab_action, false);
        ev.target.classList.remove('active');
      }
    }

  },

  /**
   * event processing in the tab view screen.
   *
   * @param {ul} Parent element of the list you are currently viewing.
   */
  createAddNewTab: function awesomescreen_createAddNewTab() {
      //If you want to create a 13 second tab, delete the oldest tab
      if(Object.keys(Browser.info).length >= this.TABLIST_MAX) this.oldTabDelete();

      var tabCount = Object.keys(Browser.info).length;
      var tabIds = Object.keys(Browser.info);
      //store to tabid,timestamp
      for( var i=0; i < tabCount; i++) {
        //Save the ID of the final display tab
        if(Browser.info[tabIds[i]].dom.style.display == 'block') {
          this.finalDispTabId = Browser.info[tabIds[i]].id;
        }
      }
      Browser.selectInfo(Browser.createIframe());
      Browser.refreshBrowserParts();
      this.updateTabsCount();
      if(this.isDisplayedTab())  this.tabviewHidden();
      this.selectTopSites();
  },

  openNewTab: function awesomescreen_openNewTab(evt) {
    if( evt == null ) return;

    //If you want to create a 13 second tab, delete the oldest tab
    if(Object.keys(Browser.info).length >= this.TABLIST_MAX) this.oldTabDelete();
    this.finalDispTabId = Browser.createIframe(evt.detail.url, evt.detail.frameElement);
    Browser.selectInfo(this.finalDispTabId);
    this.updateTabsCount();
  },

  oldTabDelete: function awesomescreen_oldTabDelete(evt) {

    var tabCount = Object.keys(Browser.info).length;
    var tabIds = Object.keys(Browser.info);
    var tabDateObj = [];
    //store to tabid,timestamp
    for( var i=0; i < tabCount; i++) {
      var tabDate = {tabId: Browser.info[tabIds[i]].id, timestamp: Browser.info[tabIds[i]].timestamp}
      tabDateObj.push(tabDate);
    }
    tabDateObj.sort(this.objectSort('timestamp', false, parseInt));

    //delete to iframe
    if (Browser.info[tabDateObj[0].tabId].alive) {
      Browser.info[tabDateObj[0].tabId].dom.parentNode.removeChild(Browser.info[tabDateObj[0].tabId].dom);
      Browser.info[tabDateObj[0].tabId].alive = false;
    }

    //delete to info
    delete Browser.info[tabDateObj[0].tabId];

  },
  /**
   * event processing in the tab view screen.
   *
   * @param {ul} Parent element of the list you are currently viewing.
   */
  currentTabShow: function awesomescreen_currentTabShow(activeElem) {
    var currentTabId = activeElem.parentNode.id.slice(5);
    var tabCount = Object.keys(Browser.info).length;
    var tabIds = Object.keys(Browser.info);

    //Hide all tab
    for( var i=0; i < tabCount; i++) {

      if(tabIds[i] != currentTabId){
        Browser.switchVisibility(Browser.info[tabIds[i]], false);
      }else{
        //Show the selected tab
        Browser.selectInfo(tabIds[i]);
        if(( Browser.info[tabIds[i]].url != null ) && ( Browser.info[tabIds[i]].url != '' )) {
          if(!Browser.info[tabIds[i]].alive){
            Browser.info[tabIds[i]].dom.src = Browser.info[tabIds[i]].url;
          }
          Browser.switchVisibility(Browser.info[tabIds[i]], true);
          this.finalDispTabId = Browser.info[tabIds[i]].id;
          if(this.isDisplayedTop()) this.topsiteHidden();
        }else{
          Browser.switchVisibility(Browser.info[tabIds[i]], true);
          this.selectTopSites();
        }
      }

    }
    Browser.refreshBrowserParts();
    if(this.isDisplayedTab())  this.tabviewHidden();
  },

  /**
   * To tab of the page you are viewing in the browser screen.
   *
   * @param {url} URL of the page you are currently viewing.
   * @param {title} Title of the page you are currently viewing.
   * @param {thumbnail} Thumbnail of the page you are currently viewing.
   */
  createTabpanel: function awesomescreen_createTabpanel(id,url,title,thumbnail,count) {
    //I get the number of tab currently displayed
    var newtab = "";

    if(this.tabSiteList.lastChild) newtab = this.tabSiteList.lastChild;

    //Tab displays the newtab If it is less than 12
    if(count < this.TABLIST_MAX ){

      //remove any element of newtab
      if(newtab.id == 'newtab'){
        this.tabSiteList.lastChild.style.opacity  = '0';
        this.tabSiteList.removeChild(newtab);
      }
      //create a newtab
      this.tabListEdit(id,url,title,thumbnail,count);

      //create a addtab
      this.tabNewCreate(this.tabSiteList,count);

    }else if(count == this.TABLIST_MAX){
      if(newtab.id == 'newtab'){
        this.tabSiteList.removeChild(newtab);
        this.tabListEdit(id,url,title,thumbnail,count);
      }
    }
  },

  clickTabAction: function awesomescreen_clickTabAction(ev) {
    if( ev ) ev.preventDefault();
    if( (!(ev.keyCode == KeyEvent.DOM_VK_RETURN)) && (!(ev.button == 0)) ) return;

    var actionElem = "";

      var click_tab_action = (function() {
        Awesomescreen.clickTabActFlg = true;
        if(Awesomescreen.clickTabListFlg){
          Awesomescreen.clickTabEvent(ev);
        }
        actionElem.removeEventListener('transitionend', click_tab_action, false);
       });

      if(ev.target){
        if(ev.target.className.contains('back-area')){
          actionElem = ev.target.childNodes[0];
        }else if(ev.target.className.contains('del-img')){
          actionElem = ev.target;
        }
        // Add fade animantion event
        actionElem.addEventListener('transitionend', click_tab_action, false);
        ev.target.classList.add('active');
      }

  },
  /**
   * Configuring the tab list.
   *
   * @param {url} URL of the page you are currently viewing.
   * @param {title} Title of the page you are currently viewing.
   * @param {thumbnail} Thumbnail of the page you are currently viewing.
   * @param {count} now tab count.
   */
  tabListEdit: function awesomescreen_tabListEdit(id,url,title,thumbnail,count) {
    var list = null;

    list = this.creatNewThumbnail(url,title,thumbnail);
    list.id = 'list-' + id;
    list.childNodes[0].childNodes[0].tabIndex = count + 120;
    list.childNodes[1].tabIndex = count + 100;

    //Events additional Delete button
    list.childNodes[0].childNodes[0].addEventListener('mouseup',this.clickTabEvent.bind(this));
    list.childNodes[0].childNodes[0].addEventListener('keyup',this.clickTabEvent.bind(this));
    list.childNodes[0].childNodes[0].addEventListener('mousedown',this.clickTabAction.bind(this));
    list.childNodes[0].childNodes[0].addEventListener('mouseover', this.mouseOverFunc.bind(this));
    list.childNodes[0].childNodes[0].addEventListener('mouseout', this.mouseOutFunc.bind(this));

    //Events additional thumbnail
    list.childNodes[1].addEventListener('mouseup',this.clickTabEvent.bind(this));
    list.childNodes[1].addEventListener('keyup',this.clickTabEvent.bind(this));
    list.childNodes[1].addEventListener('mousedown',this.clickTabAction.bind(this));
    list.childNodes[1].addEventListener('mouseover', this.mouseOverFunc.bind(this));
    list.childNodes[1].addEventListener('mouseout', this.mouseOutFunc.bind(this));

    Awesomescreen.isScaleChange(list);


    this.tabSiteList.appendChild(list);
    Awesomescreen.tabSiteList.lastChild.style.opacity  = '1';
  },

  /**
   * Configuring the tab list.
   *
   * @param {tab} Elements of the tab that is currently creating.
   * @param {thumbnail} Thumbnail of the page you are currently viewing.
   */
  tabNewCreate: function awesomescreen_tabNewCreate(tab,tabNum) {
    //create a newtab
    //tab if is long been displayed 12, does not create a new tab is
    if(tabNum < this.TABLIST_MAX){
      tab.appendChild(this.tabListTemplate.cloneNode(true));
      tab.lastChild.childNodes[1].tabIndex = tabNum + 101;
      tab.lastChild.childNodes[1].addEventListener('mouseup',this.clickTabEvent.bind(this));
      tab.lastChild.childNodes[1].addEventListener('keyup',this.clickTabEvent.bind(this));
      tab.lastChild.childNodes[1].addEventListener('mousedown',this.clickTabAction.bind(this));
      tab.lastChild.childNodes[1].addEventListener('mouseover', this.mouseOverFunc.bind(this));
      tab.lastChild.childNodes[1].addEventListener('mouseout', this.mouseOutFunc.bind(this));
      tab.lastChild.style.opacity  = '1';

       Awesomescreen.isScaleChange(tab.lastChild);
    }
  },

  /**
   *Remove the selected tab.
   *
   * @param {list_id} selected tab id.
   */
  tabDelete: function awesomescreen_tabDelete(list_id, ev) {

    var tabCount = Object.keys(Browser.info).length;
    var tabIds = Object.keys(Browser.info);

    //Tab I close the tabview if 1
    if(tabCount == 1){
      this.tabviewHidden();
      return;
    }

    //Remove the elements of the iframe corresponding to the id
    var id = list_id.parentNode.id.slice(5);
    var topsiteViewflg = false;
    var nextElem = list_id.parentNode.nextSibling;
    var prevElem = list_id.parentNode.previousSibling;
    var focusElem = "";
    //Only if the current URL as the deleted selected URL matches, to perform the switching of the tab
    if(id != Browser.currentInfo.id ) {

      //It is not the focus in the case of click
      if(ev.type == 'keydown' || ev.type == 'keyup') {
        if(nextElem != null) {
          if(nextElem.id.contains('newtab')){
            prevElem.childNodes[0].childNodes[0].focus();
          }else{
            nextElem.childNodes[0].childNodes[0].focus();
             focusElem = nextElem.childNodes[0].childNodes[0];
          }
        }else{
          prevElem.childNodes[0].childNodes[0].focus();
          focusElem = nextElem.childNodes[0].childNodes[0];
        }
      }
      this.tabDeleteFunc(id, list_id, focusElem);
      tabCount = Object.keys(Browser.info).length;
      if(tabCount == 1) this.tabviewHidden();
      return;
    }

    if (Browser.info[id].dom) {
      if( Browser.info[id].loading ) Browser.info[id].dom.stop();
      //all tab hide
      for( var i=0; i < tabCount; i++) {
        Browser.switchVisibility(Browser.info[tabIds[i]], false);
      }
      //switch between tabs
      for( var i=0; i < tabCount; i++) {
        if(tabIds[i] == id){
          topsiteViewflg = this.switchCurrentTab(tabIds,i,id,list_id.parentNode,ev);
          break;
        }
      }
    }

    //Current tab judgment
    if( (list_id.parentNode.nextSibling) && (!(list_id.parentNode.nextSibling.id.contains('newtab'))) ){
      Browser.currentInfo = Browser.info[list_id.parentNode.nextSibling.id.slice(5)];
    }else if(list_id.parentNode.previousSibling){
      Browser.currentInfo = Browser.info[list_id.parentNode.previousSibling.id.slice(5)];
    }
    Toolbar.setPrivateBrowsing(Browser.currentInfo.pvtBrowse);
    this.showPrivateBrowsing();

    this.tabDeleteFunc(id, list_id);
    tabCount = Object.keys(Browser.info).length;
    //URL is not set to the tab, which will be displayed
    if(topsiteViewflg){
      this.selectTopSites();
    }else{
      if(this.isDisplayedTop()) this.topsiteHidden();
    }
    //Tab I close the tabview if 1
    if(tabCount == 1) this.tabviewHidden();
  },

    /**
   * switch between tabs.
   * @param {ev} key event.
   */
  switchCurrentTab: function awesomescreen_switchCurrentTab(tabIds,array,tabId, list, ev) {

    var topsiteViewflg = false;
    var focusElem = "";
    var dispTab = "";
    if(Browser.info[tabIds[array + 1]]) {
      focusElem = list.nextSibling;
      dispTab = Browser.info[tabIds[array + 1]];
    }else if(Browser.info[tabIds[array - 1]]) {
      focusElem = list.previousSibling;
      dispTab = Browser.info[tabIds[array - 1]];
    }
    Browser.switchVisibility(dispTab, true);
    Browser.selectInfo(dispTab.id);

    //focus set
    if( (ev.type == 'keydown') || (ev.type == 'keyup') ){
      if(!(focusElem.childNodes[0].childNodes[0].className.contains('hidden'))){
        focusElem.childNodes[0].childNodes[0].focus();
        this.focusImgFunc(focusElem.childNodes[0].childNodes[0], this.DEFAULT_TABVIEW);
      }else{
        focusElem.childNodes[1].focus();
        this.focusImgFunc(focusElem.childNodes[1], this.DEFAULT_TABVIEW);
      }
    }
   if(!dispTab.url) topsiteViewflg = true;

    return topsiteViewflg;
  },

    /**
   * tab delete function.
   * @param {id} ID of the selected tab.
   * @param {list_id} Elements of the selected tab list
   */
  tabDeleteFunc: function awesomescreen_tabDeleteFunc(id, list_id, focusElem) {
    var list = this.tabSiteList;
    var list_num = list.childElementCount;

    if (Browser.info[id].dom) {
      //Remove iframe of the relevant
      if (Browser.info[id].alive) {
        Browser.info[id].dom.parentNode.removeChild(Browser.info[id].dom);
        Browser.info[id].alive = false;
      }
    }

    list.removeChild(list_id.parentNode);
    this.focusImgFunc(document.activeElement , this.DEFAULT_TAB_DELETE);
    if(focusElem){
      this.focusImgFunc(focusElem, this.DEFAULT_TAB_DELETE);
    }else{
      this.focusImgFunc(document.activeElemnt, this.DEFAULT_TAB_DELETE);
    }
    //And adjusting the height in accordance with the number of tabs
    switch(true){
       case list_num -1 <= 4:
         Awesomescreen.tabView.style.height = '360px';
         break;
       case list_num -1 <= 8:
         Awesomescreen.tabView.style.height = '720px';
         break;
       default:
         Awesomescreen.tabView.style.height = '1080px';
         break;
    };

    if(list.lastChild.id != 'newtab') Awesomescreen.tabNewCreate(list,list.childElementCount);

    //Hide iframe related to the selected tab
    delete Browser.info[id];
    this.updateTabsCount();
    Browser.refreshBrowserParts();
  },

  /**
   * Handle Key Event.
   * @param {ev} key event.
   */
  handleKeyEvent: function awesomescreen_handleKeyEvent(ev) {
     // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      return;
    }
    var hoverElem = document.elementFromPoint(Awesomescreen.onmouseX, Awesomescreen.onmouseY);
    // in the input area focus (= display keyboard)
    if(document.activeElement == this.inputArea) return true;

    switch(true){
      case Awesomescreen.isDisplayedDialog():
        this.selectMenu = document.activeElement;
        break;
      case Awesomescreen.isDisplayedList():
        if(ev.type == 'keydown'){
          this.selectList = ev.target;
        }
        break;
      case Awesomescreen.isDisplayedTab():
        break;
      case Awesomescreen.isDisplayedTop():
        if(!(ev.type == 'keydown')){
          this.selectList = ev.target;
        }
        break;
      default :
        this.selectList = ev.target;
        break;
    }

    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_BACK_SPACE:
        switch(true){
          case Awesomescreen.isDisplayedDialog() :
            // close bookmark.history to dialog
            Awesomescreen.dialogHidden();
            break;
          case Awesomescreen.isDisplayedList() :
            // close bookmark.history
            Awesomescreen.listHidden();
             break;
           case Awesomescreen.isDisplayedTab() :
             // close tabview
             Awesomescreen.tabviewHidden();
             break;
           case Awesomescreen.isDisplayedTop() :
             // close topsite
             this.topsiteReturnFunc();
             break;
           default:
             break;
        }
        return false;
        break;

       case KeyEvent.DOM_VK_SUBMENU:
         switch(true){
           case this.isDisplayedDialog() :
             break;
           case this.isDisplayedList() && !(this.isDisplayedDialog()):
             if((this.bmhisList.childElementCount > 0) &&
               (this.selectList.className.contains('history-area')) ){
               this.optionDialogOpen();
             }
             break;
           case this.isDisplayedTop() && !(this.isDisplayedTab()):
             if(hoverElem == this.topSites){
               return true;
             }
             if( (this.selectList) && (this.selectList.className.contains('top-site-item')) ) {
               this.optionDialogOpen();
               return false;
             }
             break;
           default:
             break;
         }
         return false;
         break;
       case KeyEvent.DOM_VK_MYBUTTON:
         if(!(Awesomescreen.isDisplayed())){
           Awesomescreen.pinToHome();
         }
         return false;
         break;
       case KeyEvent.DOM_VK_UP :
       case KeyEvent.DOM_VK_DOWN :
       case KeyEvent.DOM_VK_LEFT :
       case KeyEvent.DOM_VK_RIGHT :
       case KeyEvent.DOM_VK_RETURN :

         //If the cursor overlaps the element , and calls the cursor switch only once
         if(this.focusSwitchFlg){
           this.focusSwitchFlg = false;
           Browser.switchCursorMode(true);
           Browser.switchCursorMode(false);
         }

         switch(true){
           case Awesomescreen.isDisplayedDialog() :
             Awesomescreen.dialogKeyCont(ev,this.selectMenu);
             break;
           case Awesomescreen.isDisplayedList() :
             if(Awesomescreen.blurFlag){
               Awesomescreen.blurFlag = false;
               ev.preventDefault();
               //After the pointer is released, I to focus on list
               this.defaultFocusFunc (this.DEFAULT_BOOKMARK, this.bmhisList,'visible', 0);
             }else{
               Awesomescreen.listDialogKeyCont(ev,this.selectList);
               }
             break;
           case Awesomescreen.isDisplayedTab() :
             if(Awesomescreen.blurFlag){
               Awesomescreen.blurFlag = false;
               ev.preventDefault();
               //After the pointer is released, I to focus on list
               this.defaultFocusFunc(this.DEFAULT_TABVIEW, this.tabSiteList, 'tabview-site-item', 0);
             }else{
               Awesomescreen.tabviewKeyCont(ev);
             }
             break;
           default:
             break;
         }
         return false;
       default:
         if( (Awesomescreen.isDisplayedList()) || (Awesomescreen.isDisplayedDialog()) ){
           return false
         }
         break;
    }
  return true;
  },

  defaultFocusFunc: function awesomescreen_defaultFocusFunc(type, listObject, listClassName, selectNum) {
    var visiList = listObject.getElementsByClassName(listClassName);
    var focusElem = null;
    //After the pointer is released, I to focus on list
    switch(type){
      case this.DEFAULT_TABVIEW :
        focusElem = visiList[selectNum].childNodes[1];
        break;
      case this.DEFAULT_BOOKMARK :
        focusElem = visiList[selectNum];
        break;
      default :
        break;
    }

    if(visiList.length > 0){
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
      focusElem.focus();
      this.focusImgFunc(focusElem, null);
    }
  },

   /**
   * goBack,return key Event.
   * @param {ev} key event.
   */
  topsiteReturnFunc: function awesomescreen_topsiteReturnFunc() {
    if((Browser.info[Awesomescreen.finalDispTabId]) && (Browser.info[Awesomescreen.finalDispTabId].url)) {
      var tabCount = Object.keys(Browser.info).length;
      var tabIds = Object.keys(Browser.info);
      //all tab hide
      for( var i=0; i < tabCount; i++) {
        Browser.switchVisibility(Browser.info[tabIds[i]], false);
      }

      if(!Browser.info[Awesomescreen.finalDispTabId].alive){
          Browser.info[Awesomescreen.finalDispTabId].dom.src = Browser.info[Awesomescreen.finalDispTabId].url;
      }
      Browser.switchVisibility(Browser.info[Awesomescreen.finalDispTabId],true);
      Browser.selectInfo(Awesomescreen.finalDispTabId);
      Browser.refreshBookmarkButton();
      this.topsiteHidden();
    }else{
      BrowserDialog.createDialog('close_browser', null);
    }
  },

   /**
   * bookmark,history Key Event.
   * @param {ev} key event.
   */
  listDialogKeyCont: function awesomescreen_listDialogKeyCont(ev,activeElem) {
    ev.preventDefault();

    if(this.bmhisList.childElementCount < 1) return;
    if(this.exeflag){
      this.exeflag = false;
      var currentNum = parseInt(activeElem.id.slice(5), 10);
      var listCount = this.bmhisList.childElementCount;
      var visiList = this.bmhisList.getElementsByClassName('visible');
      switch( ev.keyCode ) {
        case KeyEvent.DOM_VK_UP :
          if(activeElem.previousSibling){

            //If the list is greater than or equal to 9 , to dim
            if(listCount > this.LIST_NUM + 1){
              if(activeElem.previousSibling.className.contains('first-pos')) {
                this.upgradimgArea.classList.add('hidden');
              }else{
                if( !(this.upgradimgArea.className.contains('hidden'))){
                  this.upgradimgArea.classList.remove('hidden');
                }
              }
              this.updownControl(visiList, visiList[0].previousSibling, activeElem.previousSibling, 'UP', 'first-pos', 121);
              return;
            }else{
               this.bmhisList.firstChild.classList.add('visible');
               activeElem.previousSibling.focus();
               this.focusImgFunc(activeElem.previousSibling, null);
            }
          }
          break;
        case KeyEvent.DOM_VK_DOWN :
          if(activeElem.nextSibling){
            //If the list is greater than or equal to 9 , to dim
            if(listCount > this.LIST_NUM + 1){
              if(activeElem.nextSibling.className.contains('last-pos')) {
                this.downgradimgArea.classList.add('hidden');
              }else{
                if( !(this.downgradimgArea.className.contains('hidden'))){
                  this.downgradimgArea.classList.remove('hidden');
                }
              }
              this.updownControl(visiList, visiList[4].nextSibling, activeElem.nextSibling, 'DOWN', 'last-pos', -121);
              return;
            }else{
               this.bmhisList.lastChild.classList.add('visible');
               activeElem.nextSibling.focus();
               this.focusImgFunc(activeElem.nextSibling, null);
            }
         }
          break;
        case KeyEvent.DOM_VK_LEFT :
        case KeyEvent.DOM_VK_RIGHT :
          break;
        case KeyEvent.DOM_VK_RETURN :
          document.activeElement.classList.add('active');
          break;
        default:
          break;
      }
     this.exeflag = true;
    }
  },

   /**
    * Visible display processing of list
    * @param {visiList} List that is currently displayed
    * @param {type} UP or Down
    */
  updownControl: function awesomescreen_updownControl(visiList, visiListFirstElem, activeElem, type, position, scrollNum) {

    var strTrancelate = "";
    var latepx = "";

    if(activeElem.className.contains(position)){
      activeElem.focus();
      this.focusImgFunc(activeElem, null);
      this.exeflag = true;
      if(visiListFirstElem){
        visiListFirstElem.classList.add('visible');
      }
    }else{
      //When focus to the list that is currently displayed
      if(activeElem.className.contains('visible')){
        activeElem.focus();
        this.focusImgFunc(activeElem, this.DEFAULT_BOOKMARK);
        this.exeflag = true;
      }else{
        //If you focus to blackout the element being , to scroll
        var list_scroll_action = (function() {
          activeElem.focus();
          Awesomescreen.visibleDispCheck(visiList,type);
          Awesomescreen.exeflag = true;
          Awesomescreen.bmhisList.removeEventListener('transitionend', list_scroll_action, false);
         });

        // Add fade animantion event
        Awesomescreen.bmhisList.addEventListener('transitionend', list_scroll_action, false);
        if(!this.bmhisList.style.transform){
          this.bmhisList.style.transform = 'translateY(0px)';
         }
        strTrancelate = this.bmhisList.style.transform.split("\(");
        latepx = parseInt(strTrancelate[1].split("px\)"));
        Awesomescreen.bmhisList.style.transform = 'translateY(' + (latepx + scrollNum) + 'px)';
      }
    }
  },

   /**
    * Visible display processing of list
    * @param {visiList} List that is currently displayed
    * @param {type} UP or Down
    */
  visibleDispCheck: function awesomescreen_visibleDispCheck(visiList,type) {
    switch(type){
      case 'DOWN':
        if(visiList.length >= this.LIST_NUM){
          if(visiList[5].nextSibling){
            visiList[5].nextSibling.classList.add('visible');
            visiList[1].classList.remove('visible');
            visiList[0].classList.remove('visible');
            this.upgradimgArea.classList.remove('hidden');
          }
        }else{
          visiList[4].nextSibling.classList.add('visible');
          visiList[0].classList.remove('visible');
        }
        break;
      case 'UP':
        if(visiList.length >= this.LIST_NUM){
          if(visiList[0].previousSibling){
            visiList[4].classList.remove('visible');
            visiList[0].previousSibling.classList.add('visible');
            visiList[5].classList.remove('visible');
            this.downgradimgArea.classList.remove('hidden');
          }
        }else{
          visiList[4].classList.remove('visible');
          visiList[0].previousSibling.classList.add('visible');
        }
        break;
      default:
        break;
    }
  },

   /**
    * opsition dialog Key Event.
    * @param {ev} key event.
    */
  dialogKeyCont: function awesomescreen_dialogKeyCont(ev) {

    //If the focus is outside , I return to the default position
    if(Awesomescreen.blurFlag){
      Awesomescreen.focusPos = 0;
      Awesomescreen.focusChange(Awesomescreen.focusPos);
      Awesomescreen.blurFlag = true;
      return;
    }

    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_UP :
        ev.preventDefault();
        if( (Awesomescreen.focusPos == 4) ||
            ((( Awesomescreen.focusPos == 0 ) || ( Awesomescreen.focusPos == 1 )) && (Awesomescreen.focusList.length == 4)) ) {
          Awesomescreen.focusPos = 2;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }else if( (( Awesomescreen.focusPos == 0 ) || ( Awesomescreen.focusPos == 1 )) && (Awesomescreen.focusList.length == 5) ) {
          Awesomescreen.focusPos = 4;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }
        break;
      case KeyEvent.DOM_VK_DOWN :
        ev.preventDefault();
        if( Awesomescreen.focusPos == 2 ) {
          if(Awesomescreen.focusList.length >= 5) {
            Awesomescreen.focusPos = 4;
            Awesomescreen.focusChange(Awesomescreen.focusPos);
          }else if(Awesomescreen.focusList.length == 4) {
            Awesomescreen.focusPos = 0;
            Awesomescreen.focusChange(Awesomescreen.focusPos);
          }
        }else if( (Awesomescreen.focusPos == 3) || (Awesomescreen.focusPos == 4)) {
            Awesomescreen.focusPos = 0;
            Awesomescreen.focusChange(Awesomescreen.focusPos);
        }
        break;
      case KeyEvent.DOM_VK_LEFT :
        ev.preventDefault();
        if( ( Awesomescreen.focusPos == 1 ) || ( (Awesomescreen.focusPos == 2) && ( Awesomescreen.focusList[2].nodeName != 'INPUT') ) ||
            ( Awesomescreen.focusPos == 3 )) {
          Awesomescreen.focusPos --;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }
        break;
      case KeyEvent.DOM_VK_RIGHT :
        ev.preventDefault();
        if( Awesomescreen.focusPos == 0 ) {
          Awesomescreen.focusPos ++;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }else if( (Awesomescreen.focusPos == 1 ) && (Awesomescreen.focusList.length == 3) ) {
          Awesomescreen.focusPos ++;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }else if( ( Awesomescreen.focusPos == 2 ) && ( !(Awesomescreen.focusList.length == 3) )) {
          Awesomescreen.focusPos ++;
          Awesomescreen.focusChange(Awesomescreen.focusPos);
        }
        break;
      case KeyEvent.DOM_VK_RETURN :
        ev.preventDefault();
        if( (Awesomescreen.focusPos == 2) && ( Awesomescreen.focusList[2].nodeName == 'INPUT') ) {
          this.pointerImg.style.display = 'none';
          Awesomescreen.focusList[2].focus();
        }else if(!(Awesomescreen.focusPos == -1)) {
          if(!Awesomescreen.blurFlag) {
            document.activeElement.classList.add('active');
          }
        }
        break;
      default:
        break;
      }

   },

  /**
   * tabview  Key controll.
   * @param {ev} key event.
   */
  tabviewKeyCont: function awesomescreen_tabviewKeyCont(ev) {

    var activeElem = null;
    var thumbnailFlg = null;
    var currentPos = "";

    //Get the current focus element
    if(document.activeElement.className.contains('back-area')){
      activeElem = document.activeElement.parentNode;
      thumbnailFlg = true;
    }else{
      activeElem = document.activeElement.parentNode.parentNode;
      thumbnailFlg = false;
    }

    //Get the element number of the array from the focus element
    for(var i = 0; i < this.tabList.length; i++){
      if(activeElem == this.tabList[i]){
        currentPos = i;
        break;
      }
    }

    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_UP :
        if(thumbnailFlg){  //Focus is on the thumbnail area
          if(this.tabList[currentPos].id.contains('newtab')){
            if(this.tabList[currentPos - 4]){
              this.tabUpdownControl(thumbnailFlg, (currentPos - 4));
            }
          }else{
            this.tabUpdownControl(false, currentPos);
          }
        }else{  //Focus is on the delete area
          if(this.tabList[currentPos - 4]){
            this.tabUpdownControl(true, (currentPos - 4));
          }
        }
        break;
      case KeyEvent.DOM_VK_DOWN :
        if(thumbnailFlg){  //Focus is on the thumbnail area
          if(this.tabList[currentPos + 4]){
            if(this.tabList[currentPos + 4].id.contains('newtab')){
              this.tabUpdownControl(thumbnailFlg, (currentPos + 4));
            }else{
              this.tabUpdownControl(false, (currentPos + 4));
            }
          }
        }else{  //Focus is on the delete area
          if(this.tabList[currentPos]){
            this.tabUpdownControl(true, currentPos);
          }
        }
        break;
      case KeyEvent.DOM_VK_LEFT :
        if(this.tabList[currentPos - 1]){
          this.tabUpdownControl(thumbnailFlg, (currentPos - 1));
        }
        break;
      case KeyEvent.DOM_VK_RIGHT :
        if(this.tabList[currentPos + 1]){
          if(this.tabList[currentPos + 1].id.contains('newtab')){
            this.tabUpdownControl(true, (currentPos + 1));
          }else{
            this.tabUpdownControl(thumbnailFlg, (currentPos + 1));
          }
        }
        break;
      case KeyEvent.DOM_VK_RETURN :
        this.clickTabAction(ev);
        return false;
        break;
      default:
        break;
    }

  },

  /**
   * tabview focus control event
   */
  tabUpdownControl: function awesomescreen_tabUpdownControl(thumbnailFlg, pos) {

    //Move focus to the thumbnail area
    if(thumbnailFlg){
      this.tabList[pos].childNodes[1].focus();
      this.focusImgFunc(this.tabList[pos].childNodes[1], this.DEFAULT_TABVIEW);
    }else{
    //Move focus to Delete area
      this.tabList[pos].childNodes[0].childNodes[0].focus();
      this.focusImgFunc(this.tabList[pos].childNodes[0].childNodes[0], this.DEFAULT_TAB_DELETE);
    }
  },


  /**
   * mouse wheel event
   */
  mouseWheelFunc: function awesomescreen_mouseWheelFunc(ev) {
   ev.preventDefault();
   if(this.exeflag){
     this.exeflag = false;
     var visiList = this.bmhisList.getElementsByClassName('visible');
     var listLength = this.bmhisList.childElementCount;
     if(listLength <= this.LIST_NUM + 1){
       Awesomescreen.exeflag = true;
       return;
      }
     //I adjust the 'visible' class by scroll
     switch(ev.detail){
       case 3: // dwon to scroll
         if((visiList[4].nextSibling) && (!visiList[4].nextSibling.className.contains('last-pos')) ){
           this.mouseWheelScrollFunc(visiList, 'DOWN', -121);
            return;
          }
         break;
       case -3 : //up to scroll
         if((visiList[0].previousSibling) && (!visiList[0].previousSibling.className.contains('first-pos')) ){
           this.mouseWheelScrollFunc(visiList, 'UP', 121);
            return;
          }
         break;
       default:
         break;
     }

     Awesomescreen.exeflag = true;
    }
  },

  /**
   * mouse wheel event
   */
  mouseWheelScrollFunc: function awesomescreen_mouseWheelScrollFunc(visiList, type, scrollNum) {
    var strTrancelate = "";
    var latepx = "";

        var list_scroll_action = (function() {
          Awesomescreen.visibleDispCheck(visiList,type);

            if(type == 'DOWN'){
              if((visiList[4]) && (visiList[4].nextSibling.className.contains('last-pos')) ){
                Awesomescreen.downgradimgArea.classList.add('hidden');
                visiList[4].nextSibling.classList.add('visible');
               }
            }else{
              if((visiList[0].previousSibling) && (visiList[0].previousSibling.className.contains('first-pos')) ){
                Awesomescreen.upgradimgArea.classList.add('hidden');
                visiList[0].previousSibling.classList.add('visible');
               }
           }

          var hoverElem = document.elementFromPoint(Awesomescreen.onmouseX, Awesomescreen.onmouseY);
          if(hoverElem.className.contains('history-area')){
            hoverElem.focus();
          }else{
            hoverElem.offsetParent.focus();
          }
          Awesomescreen.exeflag = true;
          Awesomescreen.bmhisList.removeEventListener('transitionend', list_scroll_action, false);
         });

        // Add fade animantion event
        Awesomescreen.bmhisList.addEventListener('transitionend', list_scroll_action, false);
        if(!this.bmhisList.style.transform){
          this.bmhisList.style.transform = 'translateY(0px)';
         }
        strTrancelate = this.bmhisList.style.transform.split("\(");
        latepx = parseInt(strTrancelate[1].split("px\)"));
        Awesomescreen.bmhisList.style.transform = 'translateY(' + (latepx + scrollNum) + 'px)';
  },



  /**
   * mouse over event bookmark,history list
   */
  mouseOverFunc: function awesomescreen_mouseOverFunc(ev) {
    this.pointerImg.style.display = 'none';
    this.focusSwitchFlg = true;
    ev.currentTarget.focus();
    return;
  },

  /**
   * mouse over event topsite
   */
  mouseOverTopsiteFunc: function awesomescreen_mouseOverTopsiteFunc(ev) {
    var defaultTopId = document.getElementById('default-' + ev.target.id);
    defaultTopId.style.opacity = '0';
    this.selectList = ev.currentTarget;
    return;
  },

  /**
   * mouse out event bookmark,history list
   */
  mouseOutFunc: function awesomescreen_mouseOutFunc(ev) {
    this.focusSwitchFlg = false;
    ev.target.blur();
    if(ev.target.className.contains('active')){
      ev.target.classList.remove('active');
    }
    return false;
  },

  /**
   * mouse out event topsite
   */
  mouseOutTopsiteFunc: function awesomescreen_mouseOutTopsiteFunc(ev) {
    var defaultTopId = document.getElementById('default-' + ev.target.id);
    defaultTopId.style.opacity = '1';
    if(ev.target.className.contains('active')){
      ev.target.classList.remove('active');
    }
  },

  /**
   * get mouse pointer
   */
  mouseMoveFunc: function awesomescreen_mouseMoveFunc() {
    this.pointerImg.style.display = 'none';
    window.document.onmousemove = function(e){
      Awesomescreen.onmouseX = e.pageX;
      Awesomescreen.onmouseY = e.pageY;
    }
  },

  /**
   * get mouse pointer
   * @param {focusElem} Elements that give focus.
   * @param {type} Type processing.
   * @param {setTop} Adjustment to yop position
   * @param {setLeft} Adjustment to left position.
   */
  focusImgFunc: function awesomescreen_focusImgFunc(focusElem, type) {
    //get to pointer img
    if( !focusElem ) return;
    var elemPos = focusElem.getBoundingClientRect();
    var elemBottom = Math.ceil(elemPos.bottom);
    var elemRight = Math.ceil(elemPos.right);
    var elemCenter = Math.ceil(elemPos.x + (elemPos.width / 2));
    var transposX = null;
    var transposY = null;

    //Side view discriminant
    if(Browser.mainBlock.dataset.sidebar == 'true'){
      elemRight = elemRight - Browser.SIDE_WINDOW_WIDTH;
      elemCenter -= Browser.SIDE_WINDOW_WIDTH;
    }
    transposX = elemRight - 20;
    transposY = elemBottom - 120;

    //Type processing
    switch(type){
      case this.DEFAULT_BOOKMARK:
        if(elemBottom < 375) elemBottom = 375;
        if(elemBottom > 840) elemBottom = 840;
        break;
      case this.DEFAULT_TABVIEW:
        transposX = elemRight - 25;
        transposY = elemBottom - 120;
        break;
      case this.DEFAULT_TAB_DELETE:
        transposX = elemRight - 10;
        transposY = elemBottom - 110;
        break;
      case this.DEFAULT_EXCLEAR:
        transposX += 63;
        transposY += 3;
        break;
      default:
        break;
    }

    // Position adjustment at the time of the input area
    if(focusElem.nodeName == 'INPUT') {
      transposX = elemCenter + 200;
      if( transposX > elemPos.right - 90 ) {
       transposX = elemPos.right - 90;
      }
      transposY += 10;
    }

    //position setting
    this.pointerImg.style.transform =
        'translate(' + transposX + 'px,' + transposY + 'px)';
    this.pointerImg.style.display = 'block';

    // Specialized processing (for authentication text clear element)
    this.fE = focusElem;
    if(focusElem.classList.contains('special-pointer') &&
       this.oldFocusElem &&
       this.oldFocusElem.classList.contains('special-pointer')) {
      // Animation end event
      var trans_image = (function() {
        var focusElem = Awesomescreen.fE;
        focusElem.removeEventListener('transitionend', trans_image, false);
        // Interval timer stop (for Tracking pointer image)
        clearInterval(Awesomescreen.TrackingTID);
      });
      focusElem.addEventListener('transitionend', trans_image, false);

      // Interval timer start (for Tracking pointer image)
      this.TrackingTID = setInterval(function(){
        var focusElem = Awesomescreen.fE;
        var elemPos = focusElem.getBoundingClientRect();
        var elemBottom = Math.ceil(elemPos.bottom);
        var elemRight = Math.ceil(elemPos.right);
        var transposX = null;
        var transposY = null;

        //Side view discriminant
        if(Browser.mainBlock.dataset.sidebar == 'true'){
          elemRight = elemRight - Browser.SIDE_WINDOW_WIDTH;
        }
        transposX = elemRight - 20;
        transposY = elemBottom - 120;

        Awesomescreen.pointerImg.style.transform =
              'translate(' + transposX + 'px,' + transposY + 'px)';
      }, 50);
    }

    this.oldFocusElem = focusElem;
  }

};

