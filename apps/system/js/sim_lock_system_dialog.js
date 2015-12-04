/* global SystemDialog, SIMSlotManager, applications, Service, LazyLoader */
'use strict';

(function(exports) {
  /**
   * @class SimLockSystemDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var SimLockSystemDialog = function(controller) {
    this.instanceID = 'simlock-dialog';
    this.controller = controller;
    this.options = {};
    /**
     * render the dialog
     */
    LazyLoader.load('shared/elements/gaia-component/gaia-component.js')
      .then(() => {
        LazyLoader.load([
          'shared/elements/gaia-dialog/gaia-dialog.js',
          'shared/elements/gaia-text-input/gaia-text-input.js'
          ])
          .then(() => {
            this.render();
        });
      });

    this._dispatchEvent('created');
  };

  var ORIENTATION = 'portrait-primary';

  SimLockSystemDialog.prototype = Object.create(SystemDialog.prototype,
    {
      visible: {
        configurable: false,
        get: function() {
          return this._visible;
        }
      },
    });

  SimLockSystemDialog.prototype.lockType = 'pin';

  SimLockSystemDialog.prototype.lockTypeMap = {
    'pinRequired': 'pin',
    'pukRequired': 'puk',
    'networkLocked': 'nck',
    'corporateLocked': 'cck',
    'serviceProviderLocked': 'spck',
    'network1Locked': 'nck1',
    'network2Locked': 'nck2',
    'hrpdNetworkLocked': 'hnck',
    'ruimCorporateLocked': 'rcck',
    'ruimServiceProviderLocked': 'rspck'
  };

  SimLockSystemDialog.prototype.customID = 'simlock-dialog';

  SimLockSystemDialog.prototype.DEBUG = false;

  SimLockSystemDialog.prototype.name = 'SimLockSystemDialog';

  SimLockSystemDialog.prototype.EVENT_PREFIX = 'simlock';

  SimLockSystemDialog.prototype.view = function spd_view() {
    return `<gaia-dialog id="${this.instanceID}">
              <div class="dialog-content" data-z-index-level="system-dialog">
               <gaia-header>
                 <h1></h1>
               </gaia-header>
               <div class="container">
                 <div id="errorMsg" class="error" hidden>
                   <div id="messageHeader">The PIN was incorrect.</div>
                   <span id="messageBody">3 tries left.</span>
                 </div>
                 <!-- tries left -->
                 <div id="triesLeft" data-l10n-id="inputCodeRetriesLeft" hidden>
                </div>
                 <!-- sim pin input field -->
                 <div id="pinArea" hidden>
                   <div data-l10n-id="simPin"></div>
                   <div class="input-wrapper">
                     <gaia-text-input type="password" x-inputmode="digit"
                      maxlength="8" name="simpin"/>
                   </div>
                 </div>
                 <!-- sim puk input field -->
                 <div id="pukArea" hidden>
                   <div data-l10n-id="pukCode"></div>
                   <div class="input-wrapper">
                     <gaia-text-input type="password" x-inputmode="digit"
                      maxlength="8" name="simpuk"/>
                   </div>
                 </div>
                 <!-- sim nck/cck/spck input field -->
                 <div id="xckArea" hidden>
                   <div name="xckDesc" data-l10n-id="nckCode"></div>
                   <div class="input-wrapper">
                     <gaia-text-input type="password" x-inputmode="digit"
                      maxlength="8" name="xckpin" />
                   </div>
                 </div>
                 <!-- new sim pin input field -->
                 <div id="newPinArea" hidden>
                   <div data-l10n-id="newSimPinMsg"></div>
                   <div class="input-wrapper">
                     <gaia-text-input type="password" x-inputmode="digit"
                      maxlength="8" name="newSimpin"/>
                   </div>
                 </div>
                 <!-- confirm new sim pin input field -->
                 <div id="confirmPinArea" hidden>
                   <div data-l10n-id="confirmNewSimPinMsg"></div>
                   <div class="input-wrapper">
                     <gaia-text-input type="password" x-inputmode="digit"
                      maxlength="8" name="confirmNewSimpin"/>
                   </div>
                 </div>
               </div>
              </div>
              <fieldset>
                <button data-l10n-id="skip" class="cancel">Skip</button>
                <button data-l10n-id="ok" disabled class="submit primary">
                  OK
                </button>
              </fieldset>
            </gaia-dialog>`;
  };

  SimLockSystemDialog.prototype.onHide = function() {
    this._visible = false;
    this.controller && this.controller.onHide();
  };

  SimLockSystemDialog.prototype.updateHeight = function() {
    var height = Service.query('LayoutManager.height');
    this.containerElement.style.height = height + 'px';
    // We need to manually set the gaia-dialog height,
    // as it is fixed positioned
    this.element.style.height = height + 'px';
    this.debug('updateHeight: new height = ' + height);
    document.activeElement.scrollIntoView(false);
  };

  SimLockSystemDialog.prototype._registerEvents = function() {
    this.dialogDone.addEventListener('click', this.verify.bind(this));
    this.dialogSkip.addEventListener('click', this.skip.bind(this));
    [this.dialogDone, this.dialogSkip].forEach((button) => {
      button.addEventListener('mousedown', this._handle_mousedown.bind(this));
    });

    this.header.addEventListener('action', this.back.bind(this));
    this.element.addEventListener('closed', this.hide.bind(this));
    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.xckInput = this.getNumberPasswordInputField('xckpin');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput =
      this.getNumberPasswordInputField('confirmNewSimpin');
  };

  SimLockSystemDialog.prototype._fetchElements = function spl_initElements() {
    this.element = document.getElementById('simlock-dialog');
    this.header = this.element.querySelector('gaia-header');
    this.dialogTitle = this.header.querySelector('h1');

    this.pinArea = document.getElementById('pinArea');
    this.pukArea = document.getElementById('pukArea');
    this.xckArea = document.getElementById('xckArea');
    this.desc = this.element.querySelector('#xckArea div[name="xckDesc"]');
    this.newPinArea = document.getElementById('newPinArea');
    this.confirmPinArea = document.getElementById('confirmPinArea');

    this.triesLeftMsg = document.getElementById('triesLeft');

    this.errorMsg = document.getElementById('errorMsg');
    this.errorMsgHeader = document.getElementById('messageHeader');
    this.errorMsgBody = document.getElementById('messageBody');

    this.containerDiv = this.element.querySelector('.container');
    this.dialogDone = this.element.querySelector('button.submit');
    this.dialogSkip = this.element.querySelector('button.cancel');
  };

  SimLockSystemDialog.prototype.getNumberPasswordInputField = function(name) {
    var selector = 'gaia-text-input[name="' + name + '"]';
    var inputField = document.querySelector(selector);
    var self = this;

    inputField.addEventListener('input', function(evt) {
      if (evt.target !== inputField) {
        return;
      }

      checkDialogDone();
    });

    inputField.addEventListener('focus', function() {
      checkDialogDone();
    });

    function checkDialogDone() {
      if (inputField.value.length >= 4) {
        self.dialogDone.removeAttribute('disabled');
      } else {
        self.dialogDone.setAttribute('disabled', 'disabled');
      }
    }


    return inputField;
  };

  SimLockSystemDialog.prototype.handleCardState = function() {
    var _ = navigator.mozL10n.setAttributes;

    if (!this._currentSlot) {
      return;
    }

    var card = this._currentSlot.simCard;

    var cardState = card.cardState;
    var lockType = this.lockTypeMap[cardState];

    var request = this._currentSlot.getCardLockRetryCount(lockType);
    request.onsuccess = (function() {
      var retryCount = request.result.retryCount;
      if (retryCount) {
        var l10nArgs = { n: retryCount };
        _(this.triesLeftMsg, 'inputCodeRetriesLeft', l10nArgs);
        this.triesLeftMsg.hidden = false;
      }
    }).bind(this);
    request.onerror = function() {
      console.log('Could not fetch CardLockRetryCount', request.error.name);
    };

    switch (lockType) {
      case 'pin':
        this.lockType = lockType;
        this.errorMsg.hidden = true;
        this.inputFieldControl(true, false, false, false);
        break;
      case 'puk':
        this.lockType = lockType;
        _(this.errorMsgHeader, 'simCardLockedMsg');
        _(this.errorMsgBody, 'enterPukMsg');
        this.errorMsg.hidden = false;
        this.inputFieldControl(false, true, false, true);
        break;
      case 'nck':
      case 'cck':
      case 'spck':
      case 'nck1':
      case 'nck2':
      case 'hnck':
      case 'rcck':
      case 'rspck':
        this.lockType = lockType;
        this.errorMsg.hidden = true;
        this.inputFieldControl(false, false, true, false);
        _(this.desc, lockType + 'Code');
        break;
      default:
        this.skip();
        break;
    }
    if (this.lockType !== 'pin' || !SIMSlotManager.isMultiSIM()) {
      _(this.dialogTitle, this.lockType + 'Title');
    } else {
      _(this.dialogTitle, 'multiSIMpinTitle',
        { n: this._currentSlot.index + 1 });
    }
  };

  SimLockSystemDialog.prototype.handleError = function(lockType, retryCount) {
    var retry = (retryCount) ? retryCount : -1;
    this.showErrorMsg(retry, lockType);
    if (retry === -1) {
      this.skip();
      return;
    }
    if (lockType === 'pin') {
      this.pinInput.focus();
    } else if (lockType === 'puk') {
      this.pukInput.focus();
    } else {
      this.xckInput.focus();
    }
  };

  SimLockSystemDialog.prototype.showErrorMsg = function(retry, type) {
    var _ = navigator.mozL10n.setAttributes;
    var l10nArgs = { n: retry };

    _(this.triesLeftMsg, 'inputCodeRetriesLeft', l10nArgs);
    _(this.errorMsgHeader, type + 'ErrorMsg');
    if (retry !== 1) {
      _(this.errorMsgBody, type + 'AttemptMsg2', l10nArgs);
    } else {
      _(this.errorMsgBody, type + 'LastChanceMsg');
    }

    this.errorMsg.hidden = false;
  };

  SimLockSystemDialog.prototype.unlockPin = function() {
    var pin = this.pinInput.value;
    if (pin === '') {
      return;
    }

    var options = { lockType: 'pin', pin: pin };
    this.unlockCardLock(options);
  };

  SimLockSystemDialog.prototype.unlockPuk = function() {
    var _ = navigator.mozL10n.setAttributes;

    var puk = this.pukInput.value;
    var newPin = this.newPinInput.value;
    var confirmPin = this.confirmPinInput.value;
    if (puk === '' || newPin === '' || confirmPin === '') {
      return;
    }

    if (newPin !== confirmPin) {
      _(this.errorMsgHeader, 'newPinErrorMsg');
      _(this.errorMsgBody, '');
      this.errorMsg.hidden = false;
      return;
    }
    var options = {lockType: 'puk', puk: puk, newPin: newPin };
    this.unlockCardLock(options);
    this.clear();
  };

  SimLockSystemDialog.prototype.unlockXck = function() {
    var xck = this.xckInput.value;
    if (xck === '') {
      return;
    }

    var options = {lockType: this.lockType, pin: xck };
    this.unlockCardLock(options);
    this.clear();
  };

  SimLockSystemDialog.prototype.unlockCardLock = function(options) {
    var req = this._currentSlot.unlockCardLock(options);
    this.disableInput();
    req.onsuccess = this.requestClose.bind(this, 'success');
    req.onerror = (function spl_unlockCardLockError(result) {
      this.clear();
      this.handleError(options.lockType, req.error.retryCount);
    }).bind(this);
  };

  SimLockSystemDialog.prototype.focus = function() {
    switch (this.lockType) {
      case 'pin':
        this.pinInput.focus();
        break;
      case 'puk':
        this.pukInput.focus();
        break;
      default:
        this.xckInput.focus();
        break;
    }
  };

  SimLockSystemDialog.prototype.inputFieldControl =
    function(isPin, isPuk, isXck, isNewPin) {
      this.pinArea.hidden = !isPin;
      this.pukArea.hidden = !isPuk;
      this.xckArea.hidden = !isXck;
      this.newPinArea.hidden = !isNewPin;
      this.confirmPinArea.hidden = !isNewPin;
      this.requestFocus();
    };

  SimLockSystemDialog.prototype._handle_mousedown = function(evt) {
    evt.preventDefault();
  };

  SimLockSystemDialog.prototype.verify = function() {
    if (this.lockType === 'pin') {
      this.unlockPin();
    } else if (this.lockType === 'puk') {
      this.unlockPuk();
    } else {
      this.unlockXck();
    }
    return false;
  };

  SimLockSystemDialog.prototype.onHide = function() {
    this.clear();
    if (this.onclose) {
      this.onclose();
    }
  };

  SimLockSystemDialog.prototype.disableInput = function() {
    this.pinInput.disabled = true;
    this.pukInput.disabled = true;
    this.xckInput.disabled = true;
    this.newPinInput.disabled = true;
    this.confirmPinInput.disabled = true;
  };

  SimLockSystemDialog.prototype.enableInput = function() {
    this.pinInput.disabled = false;
    this.pukInput.disabled = false;
    this.xckInput.disabled = false;
    this.newPinInput.disabled = false;
    this.confirmPinInput.disabled = false;
  };

  SimLockSystemDialog.prototype.clear = function() {
    this.enableInput();
    this.errorMsg.hidden = true;
    this.pinInput.clear();
    this.pukInput.clear();
    this.xckInput.clear();
    this.newPinInput.clear();
    this.confirmPinInput.clear();
    this.dialogDone.setAttribute('disabled', 'disabled');
  };

  SimLockSystemDialog.prototype.onclose = null;

  SimLockSystemDialog.prototype._visible = false;

  /**
   * Show the SIM pin dialog
   * @param {Object} slot SIMSlot instance.
   * @param {Boolean} [skipped] If the last slot is skipped or not.
   */
  SimLockSystemDialog.prototype.show = function(slot, skipped) {
    this.clear();
    if (slot) {
      this._currentSlot = slot;
    }

    SystemDialog.prototype.show.apply(this);
    this.element.open();
    var appWindow = Service.query('getTopMostWindow');
    appWindow.lockOrientation(ORIENTATION);
    this._visible = true;
    this.lockType = 'pin';
    this.handleCardState();

    if (skipped) {
      this.header.setAttribute('action', 'back');
      // Force header-text to be repositioned
      // now the action-button is present
      this.dialogTitle.textContent = this.dialogTitle.textContent;
    } else {
      this.header.removeAttribute('action');
    }
  };

  SimLockSystemDialog.prototype.requestClose = function() {
    this._dispatchEvent('requestclose');
  };

  SimLockSystemDialog.prototype.hide = function() {
    this._visible = false;
    SystemDialog.prototype.hide.apply(this);
    var appWindow = Service.query('getTopMostWindow');
    appWindow.lockOrientation();
  };

  SimLockSystemDialog.prototype.close = function() {
    this._dispatchEvent('close');
    this.element.close();
    this._visible = false;
  };

  SimLockSystemDialog.prototype.skip = function(evt) {
    this._dispatchEvent('skip');
  };

  SimLockSystemDialog.prototype.back = function() {
    this._dispatchEvent('back');
  };

  SimLockSystemDialog.prototype.requestFocus = function() {
    this._dispatchEvent('requestfocus');
  };

  SimLockSystemDialog.prototype._dispatchEvent = function _dispatchEvent(name) {
    var self = this;
    if (applications.ready) {
      this.publish(name);
    } else {
      window.addEventListener('applicationready', function onReady() {
        window.removeEventListener('applicationready', onReady);
        self.publish(name);
      });
    }
  };

  exports.SimLockSystemDialog = SimLockSystemDialog;
}(window));
