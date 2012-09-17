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

  mobileConnection: null, 

  handleCardState: function spl_handleCardState() {
    var cardState = this.mobileConnection.cardState;
    switch (cardState) {
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
        this.skip();
        break;
    }
    this.title.textContent = _(this.lockType+'Title');
    if (this.lockType === 'pin')
      this.pinInput.focus();
    else
      this.pukInput.focus();
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
        var key = String.fromCharCode(evt.charCode);
        if (key === '.') { // invalid
          return;
        }

        var targetInput = evt.target;
        
        var entered = targetInput.value;
        var display = this.pinDisplay;
        if (targetInput.name === "simpuk") {
          display = this.pukDisplay;
        }

        if (evt.charCode === 0) { // backspace
          entered = entered.substr(0, entered.length - 1);
        } else {
          if (entered.length >= 8)
            return;
          entered += key;
        }
        targetInput.value = entered;
        display.value = (new Array(entered.length + 1)).join('*');
        break;
    }
  },

  verify: function spl_verify() {
    if (this.pinInput.value === '')
      return false;
    if (this.lockType === 'puk' && this.pukInput.value === '')
      return false;

    var option = {lockType: this.lockType};
    if (this.lockType === 'pin') {
      option['pin'] = this.pinInput.value;
    } else {
      option['puk'] = this.pukInput.value;
      option['newPin'] = this.pinInput.value;
    }

    var self = this;
    var req = this.mobileConnection.unlockCardLock(option);
    req.onsuccess = function sp_unlockSuccess() {
      self.activity.postResult({unlock: true});
      return false;
    };

    req.onerror = function sp_unlockError() {
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
      if (self.lockType === 'pin') {
        self.pinInput.focus();
      } else {
        self.pukInput.focus();
      }
    }; 
    this.clear(); 
    return false;
  },

  clear: function spl_clear() {
    this.errorMsg.hidden = true;
    this.pinInput.value = '';
    this.pukInput.value = '';
    this.pinDisplay.value = '';
    this.pukDisplay.value = '';
  },

  skip: function spl_skip() {
    this.clear(); 
    this.activity.postResult({unlock: false});
    return false;
  },

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;
    this.mobileConnection.addEventListener('cardstatechange', this);
    var self = this;
    window.navigator.mozSetMessageHandler('activity', 
      function spl_activityHandler(activityReq) {
        console.debug('In settings app to handle SIM PIN lock');
        self.activity = activityReq;
        self.handleCardState();
      }
    );
    this.pinInput.addEventListener("keypress", this);
    this.pukInput.addEventListener("keypress", this);
    this.dialog.onreset = this.skip.bind(this);
    this.dialog.onsubmit = this.verify.bind(this);
  }

};

window.addEventListener('localized', function showPanel() {
  SimPinLock.init();
});
