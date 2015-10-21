/* exported Settings */
/* global _ */
/* global Browser */
/* global BrowserDB */

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

      'settings-dialog-homepage',
      'settings-dialog-homepage-input',
      'settings-dialog-homepage-input-area',
      'settings-dialog-homepage-clear',
      'settings-dialog-homepage-default',
      'settings-dialog-homepage-cancel',
      'settings-dialog-homepage-ok',

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
      Browser.debug("default homepage = " + result);
      if((result == null) || (result == undefined)) {
         console.log("set default homepage...");
         this.setDefaultHomepage();
         this.setHomepage(this.DEFAULT_HOMEPAGE);
      }
    }).bind(this));

    this.settingsList.addEventListener('mouseup',
      this.handleListClick.bind(this));
    this.settingsListArea.addEventListener('mouseup',
      this.handleListAreaClick.bind(this));
    this.settingsDialog.addEventListener('mouseup',
      this.handleDialogClick.bind(this));

    this.settingsHomepage.addEventListener('mouseup',
      this.handleHomepageClick.bind(this));
    this.settingsSearchEngine.addEventListener('mouseup',
      this.handleSearchEngineClick.bind(this));
    this.settingsClearHistory.addEventListener('mouseup',
      this.handleClearHistoryClick.bind(this));
    this.settingsClearCookie.addEventListener('mouseup',
      this.handleClearCookieClick.bind(this));

    this.settingsDialogHomepageInput.addEventListener('submit',
      this.handleDialogHomepageInputSubmit.bind(this));
    this.settingsDialogHomepageClear.addEventListener('mouseup',
      this.handleDialogHomepageClear.bind(this));
    this.settingsDialogHomepageDefault.addEventListener('mouseup',
      this.handleDialogHomepageDefault.bind(this));
    this.settingsDialogHomepageCancel.addEventListener('mouseup',
      this.handleDialogHomepageCancel.bind(this));
    this.settingsDialogHomepageOk.addEventListener('mouseup',
      this.handleDialogHomepageOk.bind(this));

    this.settingsDialogSearchCancel.addEventListener('mouseup',
      this.handleDialogSearchCancel.bind(this));
    this.settingsDialogSearchOk.addEventListener('mouseup',
      this.handleDialogSearchOk.bind(this));

    this.settingsDialogHomepageInputArea.addEventListener('focus',
      this.handleDialogHomepageInputAreaFocus.bind(this));
    this.settingsDialogHomepageInputArea.addEventListener('mousedown',
      this.handleDialogHomepageInputAreaClick.bind(this));

    this.settingsDialogHomepageInputArea.addEventListener('blur',
      this.handleDialogHomepageInputBlur.bind(this));
    this.settingsDialogHomepageClear.addEventListener('keyup',
      this.handleDialogHomepageClear.bind(this));
    this.settingsDialogHomepageDefault.addEventListener('keyup',
      this.handleDialogHomepageDefault.bind(this));
    this.settingsDialogHomepageCancel.addEventListener('keyup',
      this.handleDialogHomepageCancel.bind(this));
    this.settingsDialogHomepageOk.addEventListener('keyup',
      this.handleDialogHomepageOk.bind(this));

    this.settingsDialogSearchCancel.addEventListener('keyup',
      this.handleDialogSearchCancel.bind(this));
    this.settingsDialogSearchOk.addEventListener('keyup',
      this.handleDialogSearchOk.bind(this));
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
    this.settingsSearchEngineName.textContent = SearchUtil.getCurrentEngineName();
    this.currentSearchEngine = this.settingsSearchEngineName.textContent;
    this.selectSearchEngine = this.currentSearchEngine;
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
    if( evt ) evt.stopPropagation();
    this.hide();
  },

  handleListAreaClick: function settings_handleListAreaClick(evt) {
    if( evt ) evt.stopPropagation();
  },

  handleDialogClick: function settings_handleDialogClick(evt) {
    if( evt ) evt.stopPropagation();
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
        if(Settings.focusList[i].nodeName == 'INPUT') {
          if( !Settings.settingsDialogHomepageInput.classList.contains('exfocus') ) {
            Settings.settingsDialogHomepageInput.classList.add('exfocus');
          }
        } else if(Settings.focusList[i].id == 'settings-dialog-homepage-clear') {
          Settings.focusList[i].focus();
          if( !Settings.settingsDialogHomepageInput.classList.contains('exfocus') ) {
            Settings.settingsDialogHomepageInput.classList.add('exfocus');
          }
          if( flg ) opt = Awesomescreen.DEFAULT_EXCLEAR;
        } else {
          Settings.focusList[i].focus();
          Settings.settingsDialogHomepageInput.classList.remove('exfocus');
        }
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
    if( !this.isDialogHomepageDisplayed() ) {
      this.focusList = new Array();
      Browser.switchCursorMode(false);
      this.settingsDialog.classList.remove('hidden');
      this.settingsDialogHomepage.classList.remove('hidden');
      this.settingsDialogHomepageInput.classList.remove('input');
      this.settingsDialogHomepageInput.classList.remove('exfocus');
      this.settingsDialogHomepageInputArea.value =
        this.settingsHomepageName.textContent;
      this.settingsDialogHomepageInputArea.tabIndex = '0';
      this.settingsDialogHomepageClear.tabIndex = '0';

      this.focusList.push(this.settingsDialogHomepageInputArea);
      this.focusList.push(this.settingsDialogHomepageClear);
      this.focusList.push(this.settingsDialogHomepageDefault);
      this.focusList.push(this.settingsDialogHomepageOk);
      this.focusList.push(this.settingsDialogHomepageCancel);
      this.focusPos = this.focusList.length - 1;
      this.focusChange(this.focusPos);
    }
  },

  hideDialogHomepage: function settings_hideDialogHomepage() {
    if( this.isDialogHomepageDisplayed() ) {
      Awesomescreen.pointerImg.style.display = 'none';
      this.settingsDialogHomepageInput.classList.remove('input');
      this.settingsDialogHomepageInput.classList.remove('exfocus');
      this.settingsDialogHomepage.classList.add('hidden');
      this.settingsDialog.classList.add('hidden');
      Browser.switchCursorMode(true);
    }
  },

  isDialogHomepageDisplayed: function settings_isDialogHomepageDisplayed() {
    return !this.settingsDialogHomepage.classList.contains('hidden');
  },

  handleDialogHomepageInputSubmit: function settings_handleDialogHomepageInputSubmit(ev) {
    if (ev) {
      // Can be canceled
      ev.preventDefault();
    }

    var hasScheme = UrlHelper.hasScheme(this.settingsDialogHomepageInputArea.value);
    // No scheme, prepend basic protocol and return
    if (!hasScheme) {
      this.settingsDialogHomepageInputArea.value =
          'http://' + this.settingsDialogHomepageInputArea.value;
    }

    this.settingsDialogHomepageInputArea.blur();
  },

  handleDialogHomepageInputAreaFocus: function settings_handleDialogHomepageInputAreaFocus(evt) {
    if( evt ) evt.preventDefault();
    Settings.settingsDialogHomepageInput.classList.add('input');
    Settings.settingsDialogHomepageInput.classList.remove('exfocus');
  },

  handleDialogHomepageInputAreaClick: function settings_handleDialogHomepageInputAreaClick(evt) {
    Browser.switchCursorMode(true);
    Browser.switchCursorMode(false);

    Settings.settingsDialogHomepageInput.classList.add('input');
    Settings.settingsDialogHomepageInput.classList.remove('exfocus');

    Settings.focusPos = 0;
    Settings.focusList[Settings.focusPos].focus();
    Awesomescreen.pointerImg.style.display = 'none';
  },

  handleDialogHomepageInputBlur: function settings_handleDialogHomepageInputBlur(evt) {
    if( evt ) evt.preventDefault();
    if( Awesomescreen.pointerImg.style.display == 'none' ) {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
    }
    // Pointer image to the input area(fucusPos=0)
    Settings.focusPos = 0;
    Settings.settingsDialogHomepageInput.classList.remove('input');
    Settings.focusChange(Settings.focusPos);
    Awesomescreen.pointerImg.style.display = 'block';
  },

  handleDialogHomepageClear: function settings_handleDialogHomepageClear(evt) {
    if( evt ) evt.preventDefault();
    if(( evt.type == 'keyup' ) && ( evt.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    if( evt.keyCode != KeyEvent.DOM_VK_RETURN ) {
      Awesomescreen.pointerImg.style.display = 'none';
      document.activeElement.blur();
      document.activeElement.classList.remove('exfocus');
    }
    document.activeElement.classList.remove('active');
    this.settingsDialogHomepageInputArea.value = '';
  },

  handleDialogHomepageDefault: function settings_handleDialogHomepageDefault(evt) {
    if( evt ) evt.preventDefault();
    if(( evt.type == 'keyup' ) && ( evt.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    if( evt.keyCode != KeyEvent.DOM_VK_RETURN ) {
      Awesomescreen.pointerImg.style.display = 'none';
      document.activeElement.blur();
      document.activeElement.classList.remove('exfocus');
    }
    document.activeElement.classList.remove('active');
    this.getDefaultHomepage((function(result) {
      this.settingsDialogHomepageInputArea.value = result;
    }).bind(this));
  },

  handleDialogHomepageCancel: function settings_handleDialogHomepageCancel(evt) {
    if( evt ) evt.preventDefault();
    if(( evt.type == 'keyup' ) && ( evt.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    // animation end event handler
    var end_event = (function() {
      Settings.settingsDialogHomepageCancel.removeEventListener('transitionend',
          end_event, false);
      Settings.hideDialogHomepage();
    });
    // end animantion event
    Settings.settingsDialogHomepageCancel.addEventListener('transitionend',
      end_event, false);
    document.activeElement.classList.remove('active');
  },

  handleDialogHomepageOk: function settings_handleDialogHomepageOk(evt) {
    if( evt ) evt.preventDefault();
    if(( evt.type == 'keyup' ) && ( evt.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    // animation end event handler
    var end_event = (function() {
      Settings.settingsDialogHomepageOk.removeEventListener('transitionend',
          end_event, false);
      Settings.hideDialogHomepage();
    });
    // end animantion event
    Settings.settingsDialogHomepageOk.addEventListener('transitionend',
        end_event, false);
    document.activeElement.classList.remove('active');
    this.setHomepage(this.settingsDialogHomepageInputArea.value);
    this.settingsHomepageName.textContent =
      this.settingsDialogHomepageInputArea.value;
  },

  /**
   * Handle search engine click.
   */
  handleSearchEngineClick: function settings_handleSearchEngineClick() {
    if( !this.isDialogSearchDisplayed() ) {
      this.focusList = new Array();
      Browser.switchCursorMode(false);
      this.settingsDialog.classList.remove('hidden');
      this.settingsDialogSearch.classList.remove('hidden');

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
    // this.settingsBannerMessage.innerHTML = 'Failed to clear cookies and stored data';
    this.settingsBannerMessage.innerHTML = _('LT_FAILED_');
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

  handleDialogSearchSelected: function settings_handleDialogSearchSelected(ev) {
    if( ev ) ev.preventDefault();
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
    if( ev ) ev.preventDefault();
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
    if( ev ) ev.preventDefault();
    if(( ev.type == 'keyup' ) && ( ev.keyCode != KeyEvent.DOM_VK_RETURN )) {
      return;
    }
    // animation end event handler
    var end_event = (function() {
      Settings.settingsDialogSearchOk.removeEventListener('transitionend',
          end_event, false);
      Settings.hideDialogSearch();
    });
    // end animantion event
    Settings.settingsDialogSearchOk.addEventListener('transitionend',
      end_event, false);
    if( this.currentSearchEngine != this.selectSearchEngine ) {
      for(var i in this.searchEngineList) {
        if( this.selectSearchEngine == this.searchEngineList[i].name ) {
          SearchUtil.setSearchEngineId(this.searchEngineList[i].id, (function() {
            this.currentSearchEngine = this.selectSearchEngine;
            this.settingsSearchEngineName.textContent = this.currentSearchEngine;
            Toolbar.setSearchEngine();
          }).bind(this));
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
    if( !Settings.isDisplayed() ) return false;
    // in the input area focus (= display keyboard)
    if(document.activeElement.nodeName == 'INPUT') {
      return true;
    }
    switch( ev.keyCode ) {
      case KeyEvent.DOM_VK_LEFT :
        ev.preventDefault();
        if( Settings.isDialogHomepageDisplayed() ) {
          if(( Settings.focusPos == 1 ) || ( Settings.focusPos == 4 )) {
            Settings.focusPos --;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
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
        if( Settings.isDialogHomepageDisplayed() ) {
          if(( Settings.focusPos == 0 ) || ( Settings.focusPos == 3 )) {
            Settings.focusPos ++;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
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
        if( Settings.isDialogHomepageDisplayed() ) {
          if(( Settings.focusPos == 2 ) || ( Settings.focusPos == 4 )) {
            Settings.focusPos -= 2;
            Settings.focusChange(Settings.focusPos);
          } else if( Settings.focusPos == 3 ) {
            Settings.focusPos --;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
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
        if( Settings.isDialogHomepageDisplayed() ) {
          if(( Settings.focusPos == 1 ) || ( Settings.focusPos == 2 )) {
            Settings.focusPos ++;
            Settings.focusChange(Settings.focusPos);
          } else if( Settings.focusPos == 0 ) {
            Settings.focusPos += 2;
            Settings.focusChange(Settings.focusPos);
          }
          return true;
        }
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
          if( Settings.focusPos == 0 ) {
            Settings.focusList[Settings.focusPos].focus();
            if( Settings.isDialogHomepageDisplayed() ) {
              Awesomescreen.pointerImg.style.display = 'none';
            }
          }else{
            document.activeElement.classList.remove('active');
            document.activeElement.classList.add('active');
           }
        break;

      case KeyEvent.DOM_VK_BACK_SPACE :
        if( Settings.isDialogHomepageDisplayed() ) {
          Settings.hideDialogHomepage();
          return true;
        }
        if( Settings.isDialogSearchDisplayed() ) {
          Settings.hideDialogSearch();
          return true;
        }
        Settings.hide();
        return true;

      default :
        return false;
    }
    return true;
  }
};
