/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var _ = navigator.mozL10n.get;

var SimPinLock = {
  dialog: document.getElementById('simpin-unlock'),
  title: document.querySelector('form header h2'),
  pinInput: document.querySelector('input[name="simpin"]'),
  pinDisplay: document.querySelector('input[name="simpinVis"]'),
  pukArea: document.getElementById('pukArea'),
  pukInput: document.querySelector('input[name="simpuk"]'),
  pukDisplay: document.querySelector('input[name="simpukVis"]'),
  errorMsg: document.getElementById('errorMsg'),
  errorMsgHeader: document.getElementById('messageHeader'),
  errorMsgBody: document.getElementById('messageBody'),
  
  lockType: 'pin',

  activity: null,

  pinEntered: '',

  pukEntered: '',

  mobileConnection: null,  

  handleCardState: function spl_handleCardState() {
    switch (this.mobileConnection.cardState) {
      case 'pinRequired':
        this.lockType = 'pin';
        this.errorMsg.hidden = true;
        this.pinInput.focus();
        break;
      case 'pukRequired':
        this.lockType = 'puk';
        this.errorMsgHeader.textContent = _('simCardLockedMsg');
        this.errorMsgBody.textContent = _('enterPukMsg');
        this.errorMsg.hidden = false;
        this.pukArea.hidden = false;
        this.pukInput.focus();
        break;
      case 'absent':
      case 'ready':
      default:
        this.skip();
        break;
    }
    this.title.textContent = _(this.lockType+'Title');
  },

  handleEvent: function spl_handleInput(evt) {
    switch (evt.type) {
      case 'cardstatechange':
        this.handleCardState();
        break;
      case 'click':
        break;
      case 'keypress':
        evt.preventDefault();
        dump("=== key press target: "+ evt.target.name);
        var key = String.fromCharCode(evt.charCode);
        if (key === '.') { // invalid
          return;
        }

        if (evt.charCode === 0) { // backspace
          this.pinEntered = this.pinEntered.substr(0, this.pinEntered.length - 1);
        } else {
          if (this.pinEntered.length >= 8)
            return;
          this.pinEntered += key;
        }
        dump("=== pinEntered: " + this.pinEntered);
        var len = this.pinEntered.length;
        this.pinDisplay.value = (new Array(len+1)).join('*');
        break;
    }
  },

  verify: function spl_verify() {
    dump('==== verify sim pin: '+this.pinEntered);
    if (this.pinEntered === '')
      return false;
    var self = this;
    var option = {lockType: this.lockType};
    if (this.lockType === 'pin') {
      option['pin'] = this.pinEntered;
    } else {
      option['puk'] = this.pukEntered;
      option['newPin'] = this.pinEntered;
    }

    var req = this.mobileConnection.unlockCardLock(option);
    req.onsuccess = function sp_unlockSuccess() {
      dump('==== correct sim pin!!');
      self.activity.postResult({unlock: true});
    };

    req.onerror = function sp_unlockError() {
      dump('==== wrong sim pin!!');
      var retry = -1;
      if (req.result && req.result.retryCount)
        retry = req.result.retryCount;

      self.errorMsgHeader.textContent = _(self.lockType+'ErrorMsg');
      if (retry === 1) {
        self.errorMsgBody.textContent = _(self.lockType+'LastChanceMsg');
      } else {
        self.errorMsgBody.textContent = _(self.lockType+'AttemptMsg', {n: retry});
      }

      self.errorMsg.hidden = false;
      self.pinInput.focus();
    }; 
    this.clear(); 
    return false;
  },

  clear: function spl_clear() {
    this.errorMsg.hidden = true;
    this.pinDisplay.value = '';
    this.pinEntered = '';
  },

  skip: function spl_skip() {
    dump('==== skip unlock!!');
    this.clear(); 
    this.activity.postResult({unlock: false});
    return false;
  },

  init: function spl_init() {
    dump("==== unlock init");
    this.mobileConnection = window.navigator.mozMobileConnection;
    this.mobileConnection.addEventListener('cardstatechange', this);
    var self = this;
    window.navigator.mozSetMessageHandler('activity', 
      function spl_activityHandler(activityReq) {
        dump("==== in activity");
        self.activity = activityReq;
      }
    );
    document.addEventListener('mozvisibilitychange', 
      function visibilityChange() {
        dump("==== am I visible? "+ !document.mozHidden);
      }
    );
    this.pinInput.addEventListener("keypress", this);
    this.dialog.onreset = this.skip.bind(this);
    this.dialog.onsubmit = this.verify.bind(this);
    this.handleCardState();
  }

};

SimPinLock.init();
