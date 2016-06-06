/* exported Settings */
/* global Awesomescreen */
/* global Browser */
/* global BrowserDB */
/* global BrowserDialog */
/* global KeyEvent */
/* global LazyLoader */
/* global SearchUtil */
/* global Toolbar */
/* global UrlHelper */
/* global SharedUtils */

'use strict';

/**
 * Browser app settings panel.
 * @namespace Settings
 */
var Settings = {
  DEFAULT_HOMEPAGE: 'http://www.mozilla.org',
  currentSearchEngine: null,
  selectSearchEngine: null,
  searchEngineList: null,
  focusList: null,
  focusPos: 0,

  /** Get all DOM elements when inited. */
  getAllElements: function settings_getAllElements() {

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'settings-list', 'settings-list-area',
      'settings-homepage', 'settings-homepage-name',
      'settings-search-engine', 'settings-search-engine-name',
      'settings-clear-history',
      'settings-clear-cookie',

      'settings-dialog',

      'settings-dialog-search',
      'settings-dialog-search-select',
      'settings-dialog-search-select-list',
      'settings-dialog-search-cancel',
      'settings-dialog-search-ok',

      'settings-banner-message'
    ];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  /**
   * Intialise settings panel.
   */
  init: function settings_init() {
    this.getAllElements();

    this.getDefaultHomepage((function(result) {
      /* default homepage nothing... */
      Browser.debug('default homepage = ' + result);
      if(!result) {
         console.log('set default homepage...');
         this.setDefaultHomepage();
         this.setHomepage(this.DEFAULT_HOMEPAGE);
      }
    }).bind(this));

    this.settingsList.addEventListener('mouseup',
      this.handleListClick.bind(this));
    this.settingsListArea.addEventListener('mouseup',
      this.handleListAreaClick.bind(this));
    this.settingsDialog.addEventListener('mouseup',
      this.handleListAreaClick.bind(this));

    this.settingsHomepage.addEventListener('mouseup',
      this.handleHomepageClick.bind(this));
    this.settingsSearchEngine.addEventListener('mouseup',
      this.handleSearchEngineClick.bind(this));
    this.settingsClearHistory.addEventListener('mouseup',
      this.handleClearHistoryClick.bind(this));
    this.settingsClearCookie.addEventListener('mouseup',
      this.handleClearCookieClick.bind(this));

    this.settingsDialogSearchCancel.addEventListener('mouseup',
      this.handleDialogSearchCancel.bind(this));
    this.settingsDialogSearchOk.addEventListener('mouseup',
      this.handleDialogSearchOk.bind(this));

    this.settingsDialogSearchCancel.addEventListener('keyup',
      this.handleDialogSearchCancel.bind(this));
    this.settingsDialogSearchOk.addEventListener('keyup',
      this.handleDialogSearchOk.bind(this));

//IFDEF_FIREFOX_SYNC
    LazyLoader.load('js/sync/settings.js');
//ENDIF_FIREFOX_SYNC
  },

  getDefaultHomepage: function settings_getDefaultHomepage(cb) {
    BrowserDB.db.open((function() {
      BrowserDB.getSetting( 'default_homepage', cb );
    }).bind(this));
  },

  setDefaultHomepage: function settings_setDefaultHomepage() {
    BrowserDB.db.open((function() {
      BrowserDB.updateSetting( this.DEFAULT_HOMEPAGE, 'default_homepage' );
    }).bind(this));
  },

  getHomepage: function settings_getHomepage(cb) {
    BrowserDB.db.open((function() {
      BrowserDB.getSetting( 'settings_homepage', cb );
    }).bind(this));
  },

  setHomepage: function settings_setHomepage(url) {
    BrowserDB.db.open((function() {
      BrowserDB.updateSetting( url, 'settings_homepage' );
    }).bind(this));
  },

  /**
   * Show settings panel.
   */
  show: function settings_show() {
    document.body.classList.add('settings-screen');
    this.getHomepage((function(result) {
      this.settingsHomepageName.textContent = result;
    }).bind(this));
    this.settingsSearchEngineName.textContent =
      SearchUtil.getCurrentEngineName();
    this.currentSearchEngine = this.settingsSearchEngineName.textContent;
    this.selectSearchEngine = this.currentSearchEngine;

    // XXX: Get Firefox Account sign in status and display it
  },

  /**
   * settings list displays a confirmation.
   */
  isDisplayed: function settings_isDisplayed() {
    return document.body.classList.contains('settings-screen');
  },

  /**
   * Hide settings panel.
   */
  hide: function settings_hide() {
    // Browser.switchCursorMode( true );
    BrowserDialog.cancelDialog();
    this.hideDialogHomepage();
    this.hideDialogSearch();
    document.body.classList.remove('settings-screen');
  },

  handleListClick: function settings_handleListClick(evt) {
    if( evt ) {
      evt.stopPropagation();
    }
    this.hide();
  },

  handleListAreaClick: function settings_handleListAreaClick(evt) {
    if( evt ) {
      evt.stopPropagation();
    }
  },

  focusChange: function settings_focusChange(pos) {
    var opt = null;
    var flg = false;
    if( Awesomescreen.pointerImg.style.display == 'none' ) {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
      flg = true;
    }
    for( var i = 0 ; i < Settings.focusList.length ; i ++ ) {
      if( i == pos ) {
        Settings.focusList[i].focus();
        Awesomescreen.focusImgFunc(Settings.focusList[i], opt);
      } else {
        Settings.focusList[i].blur();
      }
    }
  },

  /**
   * Handle homepage click.
   */
  handleHomepageClick: function settings_handleHomepageClick() {
    var homepage = this.settingsHomepageName.textContent;

    this.getDefaultHomepage((defaultHomepage) => {
      BrowserDialog.createDialog('edit_homepage', {
        currentHomepage: homepage,
        defaultHomepage: defaultHomepage
      }).then((value) => {
        // No scheme, prepend basic protocol and return
        if (!UrlHelper.hasScheme(value)) {
          value = 'http://' + value;
        }
        this.setHomepage(value);
        this.settingsHomepageName.textContent = value;
        this.hideDialogHomepage();
      }, () => {
        this.hideDialogHomepage();
      });
    });
  },

  hideDialogHomepage: function settings_hideDialogHomepage() {
    Awesomescreen.pointerImg.style.display = 'none';
  },

  /**
   * Handle search engine click.
   */
  handleSearchEngineClick: function settings_handleSearchEngineClick() {
    if( !this.isDialogSearchDisplayed() ) {
      this.focusList = [];
      Browser.switchCursorMode(false);
      this.settingsDialog.classList.remove('hidden');
      this.settingsDialogSearch.classList.remove('hidden');
      this.resetActiveElement();

      this.selectSearchEngine = this.currentSearchEngine;
      this.searchEngineList = SearchUtil.getEngineList();
      for(var i in this.searchEngineList) {
        var title = document.createElement('div');
        title.classList.add('title');
        var name = document.createElement('p');
        name.classList.add('name');
        name.textContent = this.searchEngineList[i].name;
        title.appendChild(name);

        var check = document.createElement('div');
        check.classList.add('check');
        var onoff = document.createElement('p');
        if( name.textContent == this.currentSearchEngine ) {
          name.dataset.display = 'selected';
          onoff.classList.add('on');
        } else {
          name.dataset.display = '';
          onoff.classList.add('off');
        }
        check.appendChild(onoff);

        var item = document.createElement('div');
        item.classList.add('item');
        item.appendChild(title);
        item.appendChild(check);
        item.tabIndex = '0';
        this.settingsDialogSearchSelectList.appendChild(item);
        item.addEventListener('mouseup',
          this.handleDialogSearchSelected.bind(this));
        item.addEventListener('keyup',
          this.handleDialogSearchSelected.bind(this));
        this.focusList.push(item);
      }
      this.focusList.push(this.settingsDialogSearchOk);
      this.focusList.push(this.settingsDialogSearchCancel);
      this.focusPos = this.focusList.length - 1;
      this.focusChange(this.focusPos);
    }
  },

  handleClearHistoryClick: function settings_handleClearHistoryClick() {
    BrowserDialog.createDialog('clear_history', null);
  },

  handleClearCookieClick: function settings_handleClearCookieClick() {
    BrowserDialog.createDialog('del_cookie', null);
  },

  clearCookieFailed: function settings_clearCookieFailed() {
    // this.settingsBannerMessage.innerHTML =
    //    'Failed to clear cookies and stored data';
    this.settingsBannerMessage.setAttribute('data-l10n-id', 'LT_FAILED_');
    this.showBannerMessage();
  },

  showBannerMessage: function settings_showBannerMessage() {
    if( this.settingsBannerMessage.dataset.display != 'visible' ) {
      this.settingsBannerMessage.dataset.display = 'visible';
    }
    clearTimeout( this.showBannerMessageTimeoutID );
    this.showBannerMessageTimeoutID = setTimeout( function() {
      Settings.settingsBannerMessage.dataset.display = '';
    }, 3000);
  },

  hideDialogSearch: function settings_hideDialogSearch() {
    if( this.isDialogSearchDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      var childs = this.settingsDialogSearchSelectList.childNodes;
      var len = childs.length;
      for(var i = 0 ; i < len ; i ++) {
        this.settingsDialogSearchSelectList.removeChild(childs[0]);
      }
      this.settingsDialogSearch.classList.add('hidden');
      this.settingsDialog.classList.add('hidden');
      Browser.switchCursorMode(true);
    }
  },

  isDialogSearchDisplayed: function settings_isDialogSearchDisplayed() {
    return !this.settingsDialogSearch.classList.contains('hidden');
  },

  handleDialogSearchSelected:
    function settings_handleDialogSearchSelected(ev) {
    if( ev ) {
      ev.preventDefault();
    }
    if(( ev.type == 'keyup' ) && ( ev.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    this.selectSearchEngine = ev.currentTarget.textContent;
    var childs = this.settingsDialogSearchSelectList.childNodes;
    var len = childs.length;
    for(var i = 0 ; i < len ; i ++) {
      if(childs[i].textContent == this.selectSearchEngine) {
        childs[i].firstChild.firstChild.dataset.display = 'selected';
        childs[i].lastChild.lastChild.classList.remove('off');
        childs[i].lastChild.lastChild.classList.add('on');
      } else {
        childs[i].firstChild.firstChild.dataset.display = '';
        childs[i].lastChild.lastChild.classList.remove('on');
        childs[i].lastChild.lastChild.classList.add('off');
      }
    }
  },

  handleDialogSearchCancel: function settings_handleDialogSearchCancel(ev) {
    if( ev ) {
      ev.preventDefault();
    }
    if(( ev.type == 'keyup' ) && ( ev.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    // animation end event handler
    var end_event = (function() {
      Settings.settingsDialogSearchCancel.removeEventListener('transitionend',
          end_event, false);
      Settings.hideDialogSearch();
    });
    // end animantion event
    Settings.settingsDialogSearchCancel.addEventListener('transitionend',
      end_event, false);
    document.activeElement.classList.remove('active');
  },

  handleDialogSearchOk: function settings_handleDialogSearchOk(ev) {
    if( ev ) {
      ev.preventDefault();
    }
    if(( ev.type == 'keyup' ) && ( ev.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    // animation end event handler
    var end_event = (function() {
      Settings.settingsDialogSearchOk.removeEventListener('transitionend',
          end_event, false);
      Settings.hideDialogSearch();
    });

    var setSearchEngine = function () {
      this.currentSearchEngine = this.selectSearchEngine;
      this.settingsSearchEngineName.textContent =
        this.currentSearchEngine;
      Toolbar.setSearchEngine();
    };

    // end animantion event
    Settings.settingsDialogSearchOk.addEventListener('transitionend',
      end_event, false);
    if( this.currentSearchEngine != this.selectSearchEngine ) {
      for(var i in this.searchEngineList) {
        if( this.selectSearchEngine == this.searchEngineList[i].name ) {
          SearchUtil.setSearchEngineId(this.searchEngineList[i].id,
            setSearchEngine.bind(this));
          break;
        }
      }
    }
    document.activeElement.classList.remove('active');
  },

  /**
   * Handle Key Event.
   */
  handleKeyEvent: function settings_handleKeyEvent(ev) {
    if( !Settings.isDisplayed() ) {
      return false;
    }
    // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      return true;
    }

    if(SharedUtils.isBackKey(ev)) {
      if( Settings.isDialogSearchDisplayed() ) {
        Settings.hideDialogSearch();
        return true;
      }
      Settings.hide();
      return true;
    }

    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_LEFT :
        ev.preventDefault();
        if( Settings.isDialogSearchDisplayed() ) {
          if( Settings.focusPos == Settings.focusList.length - 1 ) {
            Settings.focusPos --;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
        break;

      case KeyEvent.DOM_VK_RIGHT :
        ev.preventDefault();
        if( Settings.isDialogSearchDisplayed() ) {
          if( Settings.focusPos == Settings.focusList.length - 2 ) {
            Settings.focusPos ++;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
        break;

      case KeyEvent.DOM_VK_UP :
        ev.preventDefault();
        if( Settings.isDialogSearchDisplayed() ) {
          if( Settings.focusPos > 0 ) {
            if( Settings.focusPos >= Settings.focusList.length - 1 ) {
              Settings.focusPos = Settings.focusList.length - 3;
            } else {
              Settings.focusPos --;
            }
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
        break;

      case KeyEvent.DOM_VK_DOWN :
        ev.preventDefault();
        if( Settings.isDialogSearchDisplayed() ) {
          if( Settings.focusPos < Settings.focusList.length - 2 ) {
            Settings.focusPos ++;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
        break;

      case KeyEvent.DOM_VK_RETURN :
        ev.preventDefault();
        if (Settings.isDialogSearchDisplayed()) {
          if( Settings.focusPos === 0 ) {
            Settings.focusList[Settings.focusPos].focus();
          }else{
            if (!document.activeElement.classList.contains('disable')) {
              document.activeElement.classList.remove('active');
              document.activeElement.classList.add('active');
            }
           }
        }
        break;

      default :
        return false;
    }
    return true;
  },

  showInputInvalidState: function settings_showInputInvalidState() {
    this.settingsDialogHomepageInput.classList.add('invalid');
    this.settingsDialogHomepageOk.classList.add('disable');
  },

  hideInputInvalidState: function settings_hideInputInvalidState() {
    this.settingsDialogHomepageInput.classList.remove('invalid');
    this.settingsDialogHomepageOk.classList.remove('disable');
  },

  resetActiveElement: function settings_resetActiveElement() {
    var activeElement = this.settingsDialog.querySelector('.active');
    if (activeElement) {
      activeElement.classList.remove('active');
    }
  }
};
