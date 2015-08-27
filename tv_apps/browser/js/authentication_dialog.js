/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* exported AuthenticationDialog */

/**
 * Handles mozbrowserusernameandpasswordrequired event and show
 * authentication dialog.
 * @namespace AuthenticationDialog
 */
var AuthenticationDialog = {

  _confirmed: {},
  focusElement: [],
  focusIndex: {x:0, y:0},

  /** Get all DOM elements when inited. */
  getAllElements: function ad_getAllElements() {

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'http-authentication-dialog', 
      'http-authentication-username', 'http-authentication-username-clear',
      'http-authentication-password', 'http-authentication-password-clear',
      'http-authentication-username-area', 'http-authentication-password-area',
      'http-authentication-message',
      'http-authentication-ok', 'http-authentication-cancel'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  currentEvents: {},

  /** Initialization. Get elements and add listeners. */
  init: function ad_init(bindToWindow) {
    // Get all elements initially.
    this.getAllElements();

    this.boundToWindow = bindToWindow || false;

    this.httpAuthenticationUsername.addEventListener('submit',
        this.dialogInputSubmit.bind(this));
    this.httpAuthenticationPassword.addEventListener('submit',
        this.dialogInputSubmit.bind(this));

    this.httpAuthenticationUsernameArea.addEventListener('blur',
        this.dialogInputAreaBlur.bind(this));
    this.httpAuthenticationPasswordArea.addEventListener('blur',
        this.dialogInputAreaBlur.bind(this));

    this.httpAuthenticationUsernameArea.addEventListener('focus',
        this.dialogUsernameAreaFocus.bind(this));
    this.httpAuthenticationPasswordArea.addEventListener('focus',
        this.dialogPasswordAreaFocus.bind(this));

    this.httpAuthenticationUsernameClear.addEventListener('mouseup',
      this.clearUsername.bind(this));
    this.httpAuthenticationUsernameClear.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));
    this.httpAuthenticationUsernameClear.tabIndex = 0;

    this.httpAuthenticationPasswordClear.addEventListener('mouseup',
      this.clearPassword.bind(this));
    this.httpAuthenticationPasswordClear.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));
    this.httpAuthenticationPasswordClear.tabIndex = 0;

    this.httpAuthenticationOk.addEventListener('mouseup', this);
    this.httpAuthenticationOk.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));
    this.httpAuthenticationOk.tabIndex = 0;

    this.httpAuthenticationCancel.addEventListener('mouseup', this);
    this.httpAuthenticationCancel.addEventListener('keyup',
        this.dialogButtonKeyup.bind(this));
    this.httpAuthenticationCancel.tabIndex = 0;
  },

  /**
   * Default event handler for mozbrowser event and click event.
   * @param {Event} evt
   * @param {String} origin Tab ID
   */
  handleEvent: function ad_handleEvent(evt, origin) {
    switch (evt.type) {
      case 'mozbrowserusernameandpasswordrequired':
        evt.preventDefault();
        this.currentEvents[origin] = evt;

        // Show authentication dialog only if
        // the frame is currently displayed.
        this.show(origin);
        break;

      case 'mouseup':
        if (evt.currentTarget === this.httpAuthenticationCancel) {
          this.focusIndex.x = 2;
          this.focusIndex.y = 1;
          this.cancelHandler();
        } else {
          this.focusIndex.x = 2;
          this.focusIndex.y = 0;
          this.confirmHandler();
        }
        break;
    }
  },

  /**
   * Show dialog and set message.
   * @param {String} origin Tab ID
   */
  show: function ad_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];

    this.httpAuthenticationDialog.classList.remove('hidden');

    // XXX: We don't have a better way to detect login failed.
    if (this._confirmed[origin]) {
      //this.httpAuthenticationMessage.setAttribute('data-l10n-id',
        //'the-username-or-password-is-incorrect');
      //this.httpAuthenticationMessage.classList.add('error');
    } else {
      var msg = navigator.mozL10n.get('WB_LT_AUTH_MESSAGE_1_1')
              + ' ' + evt.detail.host + ' '
              + navigator.mozL10n.get('WB_LT_AUTH_MESSAGE_1_2') + '<br>'
              + navigator.mozL10n.get('WB_LT_AUTH_MESSAGE_2') + ' '
              + evt.detail.realm;
      this.httpAuthenticationMessage.innerHTML = msg.trim();
      /*
      navigator.mozL10n.setAttributes(this.httpAuthenticationMessage,
                                      'http-authentication-message',
                                      { host: evt.detail.host });
      */
      this.httpAuthenticationMessage.classList.remove('error');
    }

    Browser.switchCursorMode(false);
    this.httpAuthenticationUsername.classList.remove('exfocus');
    this.httpAuthenticationPassword.classList.remove('exfocus');
    this.httpAuthenticationUsername.classList.remove('input');
    this.httpAuthenticationPassword.classList.remove('input');

    this.httpAuthenticationUsernameArea.value = '';
    this.httpAuthenticationPasswordArea.value = '';
    this.httpAuthenticationUsernameArea.focus();

    this.focusElement[0] = [];
    this.focusElement[0][0] = this.httpAuthenticationUsernameArea;
    this.focusElement[0][1] = this.httpAuthenticationUsernameClear;
    this.focusElement[1] = [];
    this.focusElement[1][0] = this.httpAuthenticationPasswordArea;
    this.focusElement[1][1] = this.httpAuthenticationPasswordClear;
    this.focusElement[2] = [];
    this.focusElement[2][0] = this.httpAuthenticationOk;
    this.focusElement[2][1] = this.httpAuthenticationCancel;
    this.focusIndex.x = 0;
    this.focusIndex.y = 0;
  },

  /** Hide authentication dialog. */
  hide: function ad_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    if (!evt) {
      return;
    }
    this.httpAuthenticationDialog.classList.add('hidden');
    this.currentOrigin = null;
  },

  clearUsername: function ad_clearUsername() {
    this.focusIndex.x = 0;
    this.focusIndex.y = 1;
    this.httpAuthenticationUsernameArea.value = '';
  },

  clearPassword: function ad_clearPassword() {
    this.focusIndex.x = 1;
    this.focusIndex.y = 1;
    this.httpAuthenticationPasswordArea.value = '';
  },

  dialogButtonKeyup: function ad_dialogButtonKeyup(evt) {
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

  dialogInputSubmit: function ad_dialogInputSubmit(evt) {
    if( evt ) evt.preventDefault();
    this.dialogInputAreaBlur(evt);
  },

  dialogInputAreaBlur: function ad_dialogInputBlur(evt) {
    if(Awesomescreen.pointerImg.style.display == 'none') {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
    }
    if (evt.currentTarget === this.httpAuthenticationUsernameArea) {
      this.focusIndex.x = 0;
      this.focusIndex.y = 0;
      this.httpAuthenticationUsername.classList.remove('input');
      this.httpAuthenticationUsername.classList.add('exfocus');
    } else if(evt.currentTarget === this.httpAuthenticationPasswordArea) {
      this.focusIndex.x = 1;
      this.focusIndex.y = 0;
      this.httpAuthenticationPassword.classList.remove('input');
      this.httpAuthenticationPassword.classList.add('exfocus');
    }
    Awesomescreen.focusImgFunc(this.focusElement[this.focusIndex.x][this.focusIndex.y]);
  },

  dialogUsernameAreaFocus: function ad_dialogUsernameAreaFocus(evt) {
    if( evt ) evt.preventDefault();
    this.httpAuthenticationUsername.classList.add('input');
    this.httpAuthenticationUsername.classList.remove('exfocus');
  },

  dialogPasswordAreaFocus: function ad_dialogPasswordAreaFocus(evt) {
    if( evt ) evt.preventDefault();
    this.httpAuthenticationPassword.classList.add('input');
    this.httpAuthenticationPassword.classList.remove('exfocus');
  },

  /**
   * When user clicks OK button on authentication dialog,
   * authenticate user.
   */
  confirmHandler: function ad_confirmHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    evt.detail.authenticate(this.httpAuthenticationUsernameArea.value,
      this.httpAuthenticationPasswordArea.value);
    this.httpAuthenticationUsername.classList.remove('exfocus');
    this.httpAuthenticationPassword.classList.remove('exfocus');
    this.httpAuthenticationDialog.classList.add('hidden');

    // To remember we had ever logged in.
    this._confirmed[this.currentOrigin] = true;

    delete this.currentEvents[this.currentOrigin];
    Browser.switchCursorMode(true);
    Awesomescreen.pointerImg.style.display = 'none';
  },

  /**
   * When user clicks cancel button on authentication dialog or
   * when the user try to escape the dialog with the escape key,
   * cancel authentication.
   */
  cancelHandler: function ad_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];

    evt.detail.cancel();

    if (this._confirmed[this.currentOrigin]) {
      delete this._confirmed[this.currentOrigin];
    }

    delete this.currentEvents[this.currentOrigin];
    this.httpAuthenticationUsername.classList.remove('exfocus');
    this.httpAuthenticationPassword.classList.remove('exfocus');
    this.httpAuthenticationDialog.classList.add('hidden');
    Browser.switchCursorMode(true);
    Awesomescreen.pointerImg.style.display = 'none';
  },

  /**
   * Check if the specified tab currently has any event.
   * @param {String} origin Tab ID
   */
  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  },

  /**
   * Clear events of the specified tab ID.
   * @param {String} origin Tab ID
   */
  clear: function ad_clear(origin) {
    if (this.currentEvents[origin]) {
      delete this.currentEvents[origin];
    }
  },

  /**
   * Authentication dialog displays a confirmation.
   */
  isDisplayed: function is_displayed() {
    return !this.httpAuthenticationDialog.classList.contains('hidden');
  },

  moveFocus: function ad_moveFocus(xd, yd) {
    if(xd < 0 || yd < 0) {
      return;
    }
    if( (!this.focusElement[xd]) || (!this.focusElement[xd][yd]) ) {
      return;
    }

    var opt = null;
    var flg = false;
    this.focusIndex.x = xd;
    this.focusIndex.y = yd;
    if(Awesomescreen.pointerImg.style.display == 'none') {
      Browser.switchCursorMode(true);
      Browser.switchCursorMode(false);
      flg = true;
    }
    document.activeElement.blur();
    if(this.focusElement[this.focusIndex.x][this.focusIndex.y].id == 'http-authentication-username-area') {
      this.httpAuthenticationPassword.classList.remove('exfocus');
      if( !this.httpAuthenticationUsername.classList.contains('exfocus') ) {
        this.httpAuthenticationUsername.classList.add('exfocus');
      }
    } else if(this.focusElement[this.focusIndex.x][this.focusIndex.y].id == 'http-authentication-username-clear') {
      this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
      this.httpAuthenticationPassword.classList.remove('exfocus');
      if( !this.httpAuthenticationUsername.classList.contains('exfocus') ) {
        this.httpAuthenticationUsername.classList.add('exfocus');
      }
      if( flg ) opt = Awesomescreen.DEFAULT_EXCLEAR;
    } else if(this.focusElement[this.focusIndex.x][this.focusIndex.y].id == 'http-authentication-password-area') {
      this.httpAuthenticationUsername.classList.remove('exfocus');
      if( !this.httpAuthenticationPassword.classList.contains('exfocus') ) {
        this.httpAuthenticationPassword.classList.add('exfocus');
      }
    } else if(this.focusElement[this.focusIndex.x][this.focusIndex.y].id == 'http-authentication-password-clear') {
      this.httpAuthenticationUsername.classList.remove('exfocus');
      this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
      if( !this.httpAuthenticationPassword.classList.contains('exfocus') ) {
        this.httpAuthenticationPassword.classList.add('exfocus');
      }
      if( flg ) opt = Awesomescreen.DEFAULT_EXCLEAR;
    } else {
      this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
      this.httpAuthenticationUsername.classList.remove('exfocus');
      this.httpAuthenticationPassword.classList.remove('exfocus');
    }
    Awesomescreen.focusImgFunc(this.focusElement[this.focusIndex.x][this.focusIndex.y], opt);
  },

  handleKeyEvent: function ad_handleKeyEvent(evt) {
    if( !this.isDisplayed() ) return false;
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
        if( this.focusIndex.x == 2 ) {
          this.moveFocus(this.focusIndex.x-1, 0);
        } else {
          this.moveFocus(this.focusIndex.x-1, this.focusIndex.y);
        }
        break;
      case KeyEvent.DOM_VK_DOWN :
        evt.preventDefault();
        if( this.focusIndex.x == 1 ) {
          this.moveFocus(this.focusIndex.x+1, 0);
        } else {
          this.moveFocus(this.focusIndex.x+1, this.focusIndex.y);
        }
        break;
      case KeyEvent.DOM_VK_RETURN :
        evt.preventDefault();
        if((this.focusIndex.x == 0 && this.focusIndex.y == 0) ||
           (this.focusIndex.x == 1 && this.focusIndex.y == 0)) {
          this.focusElement[this.focusIndex.x][this.focusIndex.y].focus();
          Awesomescreen.pointerImg.style.display = 'none';
        } else {
          document.activeElement.classList.remove('active');
          document.activeElement.classList.add('active');
        }
        break;
      case KeyEvent.DOM_VK_BACK_SPACE :
        this.cancelHandler();
        return true;
      default :
        return false;
    }
    return true;
  }
};
