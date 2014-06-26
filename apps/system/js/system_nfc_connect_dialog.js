'use strict';

(function(exports) {

  var NfcConnectSystemDialog = function NfcConnectSystemDialog(options) {
    this.options = options || {};

    this.render();
    this.publish('created');
  };

  NfcConnectSystemDialog.prototype =
    Object.create(window.SystemDialog.prototype);

  NfcConnectSystemDialog.prototype.customID = 'nfc-connect-dialog';

  NfcConnectSystemDialog.prototype.DEBUG = false;

  NfcConnectSystemDialog.prototype.setMessage = function ncsd_setMessage(name) {
    var enabled = window.navigator.mozBluetooth.enabled;
    var l10nArgs = { deviceName: name };

    var msgId;
    var okayId;
    var cancelId;

    if (enabled && !name) {
      msgId = 'confirmNFCConnectBTenabledNameUnknown';
    } else if (!enabled && !name) {
      msgId = 'confirmNFCConnectBTdisabledNameUnknown';
    } else if (enabled && name) {
      msgId = 'confirmNFCConnectBTenabledNameKnown';
    } else {
      msgId = 'confirmNFCConnectBTdisabledNameKnown';
    }

    if (enabled) {
      okayId = 'yes';
      cancelId = 'no';
    } else {
      okayId = 'confirmNFCConnectBTdisabled';
      cancelId = 'dismissNFCConnectBTdisabled';
    }

    navigator.mozL10n.translate(this.confirmNFCConnectTitle);
    navigator.mozL10n.localize(this.buttonOK, okayId);
    navigator.mozL10n.localize(this.buttonCancel, cancelId);
    navigator.mozL10n.localize(this.confirmNFCConnectMsg, msgId, l10nArgs);
  };

  NfcConnectSystemDialog.prototype.hide = function ncsd_hide(reason) {
    /*
     * If the dialog was hidden because of an external event (e.g.,
     * user pressed the home button), 'reason' will not be undefined.
     * In this case we have to abort the BT connect process.
     */
    if (reason !== undefined && typeof(this.onabort) == 'function') {
      this.onabort();
    }

    window.SystemDialog.prototype.hide.call(this);
  };

  NfcConnectSystemDialog.prototype.show =
    function ncsd_show(localName, onconfirm, onabort) {
      this.onconfirm = onconfirm;
      this.onabort = onabort;
      this.setMessage(localName);
      this.element.hidden = false;
      this.publish('show');
  };

  NfcConnectSystemDialog.prototype.view = function ncsd_view() {
    return '<div id="' + this.instanceID + '" role="dialog" ' +
                'class="generic-dialog" ' +
                'data-z-index-level="nfc-connect-dialog">' +
             '<div class="modal-dialog-message-container inner">' +
               '<h3 data-l10n-id="confirmation">' +
                 'Confirmation' +
               '</h3>' +
               '<p>' +
                 '<span id="confirm-nfc-connect-msg">' +
                   'Do you want to?' +
                 '</span>' +
               '</p>' +
             '</div>' +
             '<menu data-items="2">' +
               '<button type="cancel">' +
                 'No' +
               '</button>' +
               '<button type="ok">' +
                 'Yes' +
               '</button>' +
             '</menu>' +
           '</div>';
  };

  // Get all elements when inited.
  NfcConnectSystemDialog.prototype._fetchElements =
    function ncsd_fetchElements() {
      this.confirmNFCConnectTitle =
        document.querySelector('#nfc-connect-dialog h3');
      this.confirmNFCConnectMsg =
        document.getElementById('confirm-nfc-connect-msg');
      this.buttonOK =
        document.querySelector('#nfc-connect-dialog button[type="ok"]');
      this.buttonCancel =
        document.querySelector('#nfc-connect-dialog button[type="cancel"]');
  };

  // Register events when all elements are got.
  NfcConnectSystemDialog.prototype._registerEvents =
    function ncsd_registerEvents() {
      this.buttonOK.onclick = this.okHandler.bind(this);
      this.buttonCancel.onclick = this.cancelHandler.bind(this);
  };

  NfcConnectSystemDialog.prototype.okHandler = function ncsd_okHandler() {
    this.hide();
    this.onconfirm();
    return true;
  };

  NfcConnectSystemDialog.prototype.cancelHandler =
    function ncsd_cancelHandler() {
      this.hide();
      this.onabort();
      return true;
  };

  exports.NfcConnectSystemDialog = NfcConnectSystemDialog;

}(window));
