/* global _ */

'use strict';

/**
 * The dialog listen to mozbrowsershowmodalprompt event.
 * (alert/confirm/prompt)
 *
 * @namespace Dialog
 */
var BrowserDialog = {
  // Dialog Event
  dialogEvt: null,
  browserDialogInputArea: null,
  PORT_MIN: 0,
  PORT_MAX: 65535,
  focusElement: [],
  focusIndex: {x:0, y:0},
  defaultFocusIndex: {x:0, y:0},

  /** Get all elements when inited. */
  getAllElements: function dialog_getAllElements() {
    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'browser-dialog-base', 'browser-dialog',
      'browser-dialog-title', 'browser-dialog-msg',
      'browser-dialog-input',
      'browser-dialog-input-area',
      'browser-dialog-input-clear',
      'browser-dialog-button', 'browser-dialog-button-margin',
      'browser-dialog-button1', 'browser-dialog-button2',
    ];

    // Loop and add element with camel style name to Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  /** Initialization. Get DOM elements and add listeners. */
  init: function dialog_init() {
    // Get all elements initially.
    this.getAllElements();

    this.browserDialogBase.addEventListener('mouseup',
        this.dialogBaseClick.bind(this));

    // Add event listener(dialog)
    this.browserDialogButton1.addEventListener('mouseup',
        this.dialogButton1.bind(this));
    this.browserDialogButton1.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));

    this.browserDialogButton2.addEventListener('mouseup',
        this.dialogButton2.bind(this));
    this.browserDialogButton2.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));

    this.browserDialogInput.addEventListener('submit',
        this.dialogInput.bind(this));
    this.browserDialogInputClear.addEventListener('mouseup',
        this.dialogInputClear.bind(this));
    this.browserDialogInputClear.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));

    this.browserDialogInputArea.addEventListener('blur',
        this.dialogInputAreaBlur.bind(this));
    this.browserDialogInputArea.addEventListener('focus',
        this.dialogInputAreaFocus.bind(this));
    this.browserDialogInputArea.addEventListener('mousedown',
        this.dialogInputAreaClick.bind(this));
  },

  /**
   * create Dialog
   */
  createDialog: function dialog_createDialog(type, evt) {
    var opt;

    this.cancelDialog();
    if( evt != null ) {
      evt.preventDefault();
    }
    this.dialogEvt = evt;
    this.browserDialogBase.style.display = 'block';

    switch(type) {
      case 'del_cookie':
        opt = {
          title: null,
          msg: _('WB_LT_CONFIRM_DELETE_COOKIES'),
          bt1: _('LT_CANCEL'),
          bt2: _('WB_LT_CLEAR')
        };
        break;

      case 'clear_history':
        opt = {
          title: null,
          msg: _('WB_LT_CLEAR_ALL_HISTORY'),
          bt1: _('LT_CANCEL'),
          bt2: _('WB_LT_CLEAR')
        };
        break;

      case 'close_browser':
        opt = {
          title: null,
          msg: _('LT_BROWSER_CONFIRM_EXIT2'),
          bt1: _('LT_CANCEL'),
          bt2: _('LT_WB_OK')
        };
        break;

      case 'error_browser':
        var msg_str = (evt.detail.type === 'certerror')?
          _('WB_LT_CONNECTION_IS_UNTRUSTED'): _('WB_LT_PAGE_CANNOT_BE_DISPLAYED');
        opt = {
          title: null,
          msg: msg_str,
          bt1: _('LT_WB_OK'),
          bt2: null
        };
        break;

      case 'max_bookmark':
        opt = {
          title: null,
          msg: _('WB_LT_BOOKMARK_ERROR_1'),
          bt1: _('LT_CANCEL'),
          bt2: null
        };
        break;

      case 'alert':
        opt = {
          title: null,
          msg: evt.detail.message,
          bt1: _('LT_WB_OK'),
          bt2: null
        };
        break;

      case 'prompt':
        opt = {
          title: null,
          msg: evt.detail.message,
          bt1: _('LT_CANCEL'),
          bt2: _('LT_WB_OK')
        };
        break;

      case 'confirm':
        opt = {
          title: null,
          msg: evt.detail.message,
          bt1: _('LT_CANCEL'),
          bt2: _('LT_WB_OK')
        };
        break;

      default:
        return;
    }
    Browser.switchCursorMode(false);

    // title
    this.browserDialogTitle.textContent = opt.title;

    // msg
    if(opt.msg) {
      var msg = opt.msg.replace(/\\n/g, '<br>');
      this.browserDialogMsg.innerHTML = msg;
    }

    var countIndex = 0;
    this.focusElement = [];
    this.focusElement[0] = [];
    this.focusElement[1] = [];
    this.defaultFocusIndex = {x:0, y:0};
    // button1
    if(opt.bt1) {
      this.browserDialogButton1.blur();
      this.browserDialogButton1.textContent = opt.bt1;
      this.browserDialogButton1.dataset.type = type;
      this.browserDialogButton1.classList.add('visible');
    }

    // button2
    if(opt.bt2) {
      this.browserDialogButton2.blur();
      this.browserDialogButton2.textContent = opt.bt2;
      this.browserDialogButton2.dataset.type = type;
      this.browserDialogButton2.classList.add('visible');
    }

    var width = Browser.SCREEN_WIDTH;
    if( Browser.sideBlock.dataset.sidebar == 'true' ) {
      width -= Browser.SIDE_WINDOW_WIDTH;
    }

    if(type == 'prompt') {
      this.browserDialogInput.style.display = 'block';
      this.browserDialogInput.classList.remove('exfocus');
      this.browserDialogInput.classList.remove('input');
      this.browserDialogInputClear.tabIndex = 0;
      countIndex = 0;
      this.focusElement[1][countIndex++] = this.browserDialogInputArea;
      this.focusElement[1][countIndex++] = this.browserDialogInputClear;
      //this.browserDialogInput.insertBefore(this.browserDialogInputArea,
      //                                     this.browserDialogInputClear);
      this.browserDialogInputArea.type = 'text';
      this.browserDialogInputArea.value = '';
    } else {
      this.browserDialogInput.style.display = 'none';
    }

    // initiarlize position
    countIndex = 0;
    if(opt.bt1 && opt.bt2) {
      this.defaultFocusIndex.x = 0;
      this.defaultFocusIndex.y = 0;
      this.focusIndex.x = 0;
      this.focusIndex.y = 1;
      this.focusElement[0][countIndex++] = this.browserDialogButton2;
      this.focusElement[0][countIndex++] = this.browserDialogButton1;
    } else if(opt.bt1) {
      this.defaultFocusIndex.x = 0;
      this.defaultFocusIndex.y = 0;
      this.focusIndex.x = 0;
      this.focusIndex.y = 0;
      this.focusElement[0][countIndex++] = this.browserDialogButton1;
    }
    Awesomescreen.focusImgFunc(this.focusElement[this.focusIndex.x][this.focusIndex.y]);
    this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
  },

  isDisplayed: function dialog_isDisplayed() {
    if( this.browserDialogBase.style.display == 'block' ) {
      return true;
    } else {
      return false;
    }
  },

  dialogBaseClick: function dialog_dialogBaseClick(evt) {
    if( evt ) evt.stopPropagation();
  },

  dialogButtonKeyup: function dialog_dialogButton1Keyup(evt) {
    if( evt ) evt.preventDefault();
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

  dialogButton1: function dialog_dialogButton1(evt) {
    if( evt ) evt.preventDefault();
    switch(this.browserDialogButton1.dataset.type) {
      case 'del_cookie':
      case 'clear_history':
      case 'close_browser':
      case 'error_browser':
      case 'max_bookmark':
      case 'alert':
      case 'prompt':
      case 'confirm':
        this.dialogButton2End(evt.currentTarget);
        break;

      default:
        break;
    }
  },

  dialogButton2End: function dialog_dialogButton2End(target) {
    // Animation end event
    var end_event = (function() {
      target.removeEventListener('transitionend', end_event, false);
      BrowserDialog.cancelDialog();
    });
    target.addEventListener('transitionend', end_event, false);
  },

  dialogButton2: function dialog_dialogButton2(evt) {
    if( evt ) evt.preventDefault();
    this.argEvt = evt.currentTarget;
    switch(this.browserDialogButton2.dataset.type) {
      case 'del_cookie':
        var request = navigator.mozApps.getSelf();
        request.onsuccess = function() {
          var rtn = request.result.clearBrowserData();
          rtn.onsuccess = function() {
            //BrowserDialog.cancelDialog();
            BrowserDialog.dialogButton2End(BrowserDialog.argEvt);
          };
          rtn.onerror = function() {
            //BrowserDialog.cancelDialog();
            BrowserDialog.dialogButton2End(BrowserDialog.argEvt);
            Settings.clearCookieFailed();
          };
        };
        request.onerror = function() {
          //BrowserDialog.cancelDialog();
          BrowserDialog.dialogButton2End(BrowserDialog.argEvt);
          Settings.clearCookieFailed();
        };
        break;

      case 'clear_history':
        //BrowserDB.clearHistory(this.cancelDialog.bind(this));
        BrowserDB.clearHistory(
            function(){
              BrowserDialog.dialogButton2End(BrowserDialog.argEvt)
            }.bind(this));
        Awesomescreen.selectTopSites();
        break;

      case 'close_browser':
        if (Browser.returnApp && Browser.returnApp == 'Search') {
          var activity;
          activity = new MozActivity({
            name: 'search',
            data: { keyword: '' }
          });
          activity.onsuccess == function () {
            //console.log ('browser moaActivity succeeded');
          };
          activity.onerror == function () {
            console.error ('browser launch search by moaActivity failed');
          };
        }
        Browser.returnApp = null;
        Browser.returnOpt = null;
        self.close();
        break;

      case 'prompt':
        if( this.dialogEvt != null ) {
          this.dialogEvt.detail.returnValue = this.browserDialogInputArea.value;
          if (this.dialogEvt.detail.unblock) {
            this.dialogEvt.detail.unblock();
          }
          this.dialogEvt = null;
        }
        //this.cancelDialog();
        this.dialogButton2End(this.argEvt);
        break;

      case 'confirm':
        if( this.dialogEvt != null ) {
          this.dialogEvt.detail.returnValue = true;
          if (this.dialogEvt.detail.unblock) {
            this.dialogEvt.detail.unblock();
          }
          this.dialogEvt = null;
        }
        //this.cancelDialog();
        this.dialogButton2End(this.argEvt);
        break;

      default:
        break;
    }
  },

  dialogInput: function dialog_dialogInput(evt) {
    if( evt ) evt.preventDefault();
    this.browserDialogInputArea.blur();
  },

  dialogInputAreaFocus: function dialog_dialogInputAreaFocus(evt) {
    if( evt ) evt.preventDefault();
    this.browserDialogInput.classList.add('input');
    this.browserDialogInput.classList.remove('exfocus');
  },

  dialogInputClear: function dialog_dialogInputClear() {
    this.browserDialogInputArea.value = '';
  },

  dialogInputAreaKeydown: function dialog_dialogInputKeydown() {
    if( evt ) evt.preventDefault();
    switch( evt.keyCode ) {
      case KeyEvent.DOM_VK_RETURN :
        this.moveFocus(this.focusIndex.x+1, 0);
        break;
    }
  },
  dialogInputAreaClick: function dialog_dialogInputAreaClick(evt) {
    Browser.switchCursorMode(true);
    Browser.switchCursorMode(false);

    this.dialogInputAreaFocus();

    this.focusIndex.x = 1;
    this.focusIndex.y = 0;
    this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
    Awesomescreen.pointerImg.style.display = 'none';
  },
  dialogInputAreaBlur: function dialog_dialogInputBlur() {
    if(Awesomescreen.pointerImg.style.display == 'none') {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
    }
    BrowserDialog.browserDialogInput.classList.remove('input');
    BrowserDialog.browserDialogInput.classList.add('exfocus');
    var self = this;
    setTimeout( function() {
      self.focusIndex.x = 1;
      self.focusIndex.y = 0;
      Awesomescreen.focusImgFunc(self.browserDialogInputArea);
    }, 1000);
  },

  /**
   * cancel confirm dialog
   */
  cancelDialog: function dialog_cancelDialog() {
    if( !BrowserDialog.isDisplayed() ) {
      return;
    }
    switch( BrowserDialog.browserDialogButton1.dataset.type ) {
      case 'alert':
      case 'prompt':
        if( BrowserDialog.dialogEvt != null ) {
          BrowserDialog.dialogEvt.detail.returnValue = null;
          if( BrowserDialog.dialogEvt.detail.unblock ) {
            BrowserDialog.dialogEvt.detail.unblock();
          }
        }
        break;

      case 'confirm':
        if( BrowserDialog.dialogEvt != null ) {
          BrowserDialog.dialogEvt.detail.returnValue = false;
          if( BrowserDialog.dialogEvt.detail.unblock ) {
            BrowserDialog.dialogEvt.detail.unblock();
          }
        }
        break;
    }
    if( BrowserDialog.dialogEvt != null ) {
      BrowserDialog.dialogEvt = null;
    }
    // hide dialog
    if( BrowserDialog.browserDialogInputArea ) {
      BrowserDialog.browserDialogInput.classList.remove('exfocus');
      BrowserDialog.browserDialogInput.classList.remove('input');
    }
    BrowserDialog.browserDialogBase.style.display = 'none';
    BrowserDialog.browserDialogButton1.classList.remove('visible');
    BrowserDialog.browserDialogButton2.classList.remove('visible');
    Browser.switchCursorMode(true);
    Awesomescreen.pointerImg.style.display = 'none';
  },

  moveFocus: function dialog_moveFocus(xd, yd) {
    if(!this.focusElement[xd]) return;
    if(( xd < 0 || yd < 0 ) || ( !this.focusElement[xd][yd] )) {
      if(( !this.browserDialogButton2.classList.contains('visible') ) &&
         ( Awesomescreen.pointerImg.style.display !== 'block' )) {
        Browser.switchCursorMode(true);
        Browser.switchCursorMode(false);
        var x = this.defaultFocusIndex.x;
        var y = this.defaultFocusIndex.y;
        this.focusIndex.x = x;
        this.focusIndex.y = y;
        Awesomescreen.focusImgFunc(this.focusElement[x][y]);
        this.focusElement[x][y].focus();
      }
      return;
    }

    this.focusIndex.x = xd;
    this.focusIndex.y = yd;
    var opt = null;
    var flg = false;
    if(Awesomescreen.pointerImg.style.display == 'none') {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
      flg = true;
    }
    document.activeElement.blur();
    Awesomescreen.focusImgFunc(this.focusElement[this.focusIndex.x][this.focusIndex.y], opt);
    if(this.focusElement[this.focusIndex.x][this.focusIndex.y].nodeName == 'INPUT') {
      if( !this.browserDialogInput.classList.contains('exfocus') ) {
        this.browserDialogInput.classList.add('exfocus');
      }
    } else if(this.focusElement[this.focusIndex.x][this.focusIndex.y].id == 'browser-dialog-input-clear') {
      this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
      if( !this.browserDialogInput.classList.contains('exfocus') ) {
        this.browserDialogInput.classList.add('exfocus');
      }
      if( flg ) opt = Awesomescreen.DEFAULT_EXCLEAR;
    } else {
      this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
      this.browserDialogInput.classList.remove('exfocus');
    }
  },

  handleKeyEvent: function dialog_handleKeyEvent(evt) {
    if( !BrowserDialog.isDisplayed() ) return false;
    if( document.activeElement.nodeName == 'INPUT' ) {
      return true;
    }
    switch( evt.keyCode ) {
      case KeyEvent.DOM_VK_LEFT :
        evt.preventDefault();
        this.moveFocus(this.focusIndex.x, this.focusIndex.y-1);
        break;
      case KeyEvent.DOM_VK_RIGHT :
        evt.preventDefault();
        this.moveFocus(this.focusIndex.x, this.focusIndex.y+1);
        break;
      case KeyEvent.DOM_VK_UP :
        evt.preventDefault();
        this.moveFocus(this.focusIndex.x+1, 0);
        break;
      case KeyEvent.DOM_VK_DOWN :
        evt.preventDefault();
        this.moveFocus(this.focusIndex.x-1, this.defaultFocusIndex.y);
        break;
      case KeyEvent.DOM_VK_RETURN :
        evt.preventDefault();
        if(this.focusIndex.x == 1 && this.focusIndex.y == 0) {
          this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
          Awesomescreen.pointerImg.style.display = 'none';
        } else {
          document.activeElement.classList.remove('active');
          document.activeElement.classList.add('active');
        }
        break;
      case KeyEvent.DOM_VK_BACK_SPACE :
        BrowserDialog.cancelDialog();
        return true;
      default :
        return false;
    }
    return true;
  }
};
