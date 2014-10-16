/* global SystemDialog, SIMSlotManager */
'use strict';

(function(exports) {
  /**
   * @class SimLockSystemDialog
   * @param {options} object for attributes `onShow`, `onHide` callback.
   * @extends SystemDialog
   */
  var SimLockSystemDialog = function(controller) {
    this.controller = controller;
    this.options = {};
    /**
     * render the dialog
     */
    this.render();
    this.publish('created');
  };

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

  SimLockSystemDialog.prototype.EVENT_PREFIX = 'simpin';

  SimLockSystemDialog.prototype.view = function spd_view() {
    return '<div id="' + this.instanceID + '" role="dialog" ' +
           'class="generic-dialog" data-z-index-level="system-dialog" hidden>' +
           '<section role="region">' +
             '<gaia-header>' +
               '<h1></h1>' +
             '</gaia-header>' +
             '<div class="container">' +
             '<div id="errorMsg" class="error" hidden>' +
               '<div id="messageHeader">The PIN was incorrect.</div>' +
               '<span id="messageBody">3 tries left.</span>' +
             '</div>' +
             //<!-- tries left -->
             '<div id="triesLeft" data-l10n-id="inputCodeRetriesLeft" hidden>' +
               '3 tries left</div>' +
             //<!-- sim pin input field -->
             '<div id="pinArea" hidden>' +
               '<div data-l10n-id="simPin">SIM PIN</div>' +
               '<div class="input-wrapper">' +
                 '<input name="simpin" type="password" x-inputmode="digit" ' +
                 'size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- sim puk input field -->
             '<div id="pukArea" hidden>' +
               '<div data-l10n-id="pukCode">PUK Code</div>' +
               '<div class="input-wrapper">' +
                 '<input name="simpuk" type="password" x-inputmode="digit" ' +
                 'size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- sim nck/cck/spck input field -->
             '<div id="xckArea" hidden>' +
               '<div name="xckDesc" data-l10n-id="nckCode">NCK Code</div>' +
               '<div class="input-wrapper">' +
                 '<input name="xckpin" type="number" size="16" ' +
                 'maxlength="16" />' +
               '</div>' +
             '</div>' +
             //<!-- new sim pin input field -->
             '<div id="newPinArea" hidden>' +
               '<div data-l10n-id="newSimPinMsg">' +
                 'Create PIN (must contain 4 to 8 digits)' +
               '</div>' +
               '<div class="input-wrapper">' +
                 '<input name="newSimpin" type="password" ' +
                 'x-inputmode="digit" size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             //<!-- confirm new sim pin input field -->
             '<div id="confirmPinArea" hidden>' +
               '<div data-l10n-id="confirmNewSimPinMsg">' +
                 'Confirm New PIN' +
               '</div>' +
               '<div class="input-wrapper">' +
                 '<input name="confirmNewSimpin" type="password" ' +
                 'x-inputmode="digit" size="8" maxlength="8" />' +
               '</div>' +
             '</div>' +
             '</div>' +
           '</section>' +
           '<menu data-items="2">' +
             '<button type="reset" data-l10n-id="skip">Skip</button>' +
             '<button data-l10n-id="ok" type="submit">Done</button>' +
           '</menu>' +
           '</div>';
  };

  SimLockSystemDialog.prototype.onHide = function() {
    this.controller && this.controller.onHide();
  };

  SimLockSystemDialog.prototype.updateHeight = function() {
    SystemDialog.prototype.updateHeight.apply(this, arguments);
    document.activeElement.scrollIntoView(false);
  };

  SimLockSystemDialog.prototype._registerEvents = function() {
    this.dialogDone.onclick = this.verify.bind(this);
    this.dialogSkip.onclick = this.skip.bind(this);
    this.header.addEventListener('action', this.back.bind(this));
    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.xckInput = this.getNumberPasswordInputField('xckpin');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput =
      this.getNumberPasswordInputField('confirmNewSimpin');

    this.ensureFocusInView(this.pinInput, this.containerDiv);
    this.ensureFocusInView(this.pukInput, this.containerDiv);
  };

  SimLockSystemDialog.prototype._fetchElements = function spl_initElements() {
    this.dialogTitle =
      document.querySelector('#simlock-dialog gaia-header h1');
    this.dialogDone =
      document.querySelector('#simlock-dialog button[type="submit"]');
    this.dialogSkip =
      document.querySelector('#simlock-dialog button[type="reset"]');
    this.header = document.querySelector('#simlock-dialog gaia-header');

    this.pinArea = document.getElementById('pinArea');
    this.pukArea = document.getElementById('pukArea');
    this.xckArea = document.getElementById('xckArea');
    this.desc = document.querySelector('#xckArea div[name="xckDesc"]');
    this.newPinArea = document.getElementById('newPinArea');
    this.confirmPinArea = document.getElementById('confirmPinArea');

    this.triesLeftMsg = document.getElementById('triesLeft');

    this.errorMsg = document.getElementById('errorMsg');
    this.errorMsgHeader = document.getElementById('messageHeader');
    this.errorMsgBody = document.getElementById('messageBody');

    this.containerDiv = document.querySelector('#simlock-dialog .container');
  };

  SimLockSystemDialog.prototype.getNumberPasswordInputField = function(name) {
    var inputField = document.querySelector('input[name="' + name + '"]');
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
        self.dialogDone.disabled = false;
      } else {
        self.dialogDone.disabled = true;
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
      console.error('Could not fetch CardLockRetryCount', request.error.name);
    };

    switch (lockType) {
      case 'pin':
        this.lockType = lockType;
        this.errorMsg.hidden = true;
        this.inputFieldControl(true, false, false, false);
        this.pinInput.focus();
        break;
      case 'puk':
        this.lockType = lockType;
        _(this.errorMsgHeader, 'simCardLockedMsg');
        _(this.errorMsgBody, 'enterPukMsg');
        this.errorMsg.hidden = false;
        this.inputFieldControl(false, true, false, true);
        this.pukInput.focus();
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
        this.xckInput.focus();
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

  SimLockSystemDialog.prototype.handleError = function(evt) {
    var retry = (evt.retryCount) ? evt.retryCount : -1;
    this.showErrorMsg(retry, evt.lockType);
    if (retry === -1) {
      this.skip();
      return;
    }
    if (evt.lockType === 'pin') {
      this.pinInput.focus();
    } else if (evt.lockType === 'puk') {
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
    this.clear();
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
    req.onsuccess = this.requestClose.bind(this, 'success');
    req.onerror = (function spl_unlockCardLockError(result) {
      this.handleError(req.error);
    }).bind(this);
  };

  SimLockSystemDialog.prototype.inputFieldControl =
    function(isPin, isPuk, isXck, isNewPin) {
      this.pinArea.hidden = !isPin;
      this.pukArea.hidden = !isPuk;
      this.xckArea.hidden = !isXck;
      this.newPinArea.hidden = !isNewPin;
      this.confirmPinArea.hidden = !isNewPin;
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

  SimLockSystemDialog.prototype.onHide = function(reason) {
    this.clear();
    if (this.onclose) {
      this.onclose(reason);
    }
  };

  SimLockSystemDialog.prototype.clear = function() {
    this.errorMsg.hidden = true;
    this.pinInput.value = '';
    this.pinInput.blur();
    this.pukInput.value = '';
    this.pukInput.blur();
    this.xckInput.value = '';
    this.xckInput.blur();
    this.newPinInput.value = '';
    this.newPinInput.blur();
    this.confirmPinInput.value = '';
    this.confirmPinInput.blur();
  };

  SimLockSystemDialog.prototype.onclose = null;

  SimLockSystemDialog.prototype._visible = false;

  /**
   * Show the SIM pin dialog
   * @param {Object} slot SIMSlot instance.
   * @param {Boolean} [skipped] If the last slot is skipped or not.
   */
  SimLockSystemDialog.prototype.show = function(slot, skipped) {
    if (slot) {
      this._currentSlot = slot;
    }

    SystemDialog.prototype.show.apply(this);
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

  SimLockSystemDialog.prototype.requestClose = function(reason) {
    window.dispatchEvent(new CustomEvent('simpinrequestclose', {
      detail: {
        dialog: this,
        reason: reason
      }
    }));
  };

  SimLockSystemDialog.prototype.close = function(reason) {
    this.publish('close');
    this.hide(reason);
    this._visible = false;
  };

  SimLockSystemDialog.prototype.skip = function() {
    this.publish('skip');
  };

  SimLockSystemDialog.prototype.back = function() {
    this.publish('back');
  };

  // With the keyboard active the inputs, ensure they get scrolled
  // into view
  SimLockSystemDialog.prototype.ensureFocusInView =
    function(element, container) {
      element.addEventListener('focus', function(e) {
        window.addEventListener('system-resize', function resize() {
          window.removeEventListener('system-resize', resize);
          // The layout always has the input at the bottom, so
          // just always ensure we scroll to the bottom
          container.scrollTop = container.offsetHeight;
        });
      });
    };

  exports.SimLockSystemDialog = SimLockSystemDialog;
}(window));
