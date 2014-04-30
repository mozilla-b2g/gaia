'use strict';

(function(exports) {

  var NfcConnectSystemDialog = function NfcConnectSystemDialog(options) {
    if (options) {
      this.options = options;
    }
    this.render();
    this.publish('created');
  };

  NfcConnectSystemDialog.prototype.__proto__ = window.SystemDialog.prototype;

  NfcConnectSystemDialog.prototype.customID = 'nfc-connect-dialog';

  NfcConnectSystemDialog.prototype.DEBUG = false;

  NfcConnectSystemDialog.prototype.setMessage = function ncsd_setMessage(name) {
    var msg = null;
    var _ = navigator.mozL10n.get;
    var enabled = window.navigator.mozBluetooth.enabled;
    var l10nArgs = { n: name };

    if (enabled && !name) {
      msg = _('confirmNFCConnectMsg1');
    }
    if (!enabled && !name) {
      msg = _('confirmNFCConnectMsg2');
    }
    if (enabled && name) {
      msg = _('confirmNFCConnectMsg3', l10nArgs);
    }
    if (!enabled && name) {
      msg = _('confirmNFCConnectMsg4', l10nArgs);
    }

    this.confirmNFCConnectMsg.textContent = msg;
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
                'class="generic-dialog"' +
                'data-z-index-level="nfc-connect-dialog" hidden>' +
             '<div id="confirm-nfc-connect-msg" class="container">' +
               'Confirm connect?' +
             '</div>' +
             '<menu data-items="2">' +
               '<button data-l10n-id="cancel" type="cancel">Cancel</button>' +
               '<button data-l10n-id="ok" type="ok">OK</button>' +
             '</menu>' +
           '</div>';
  };

  // Get all elements when inited.
  NfcConnectSystemDialog.prototype._fetchElements =
    function ncsd_fetchElements() {
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
    this.element.hidden = true;
    this.onconfirm();
    return true;
  };

  NfcConnectSystemDialog.prototype.cancelHandler =
    function ncsd_cancelHandler() {
      this.element.hidden = true;
      this.onabort();
      return true;
  };

  exports.NfcConnectSystemDialog = NfcConnectSystemDialog;

}(window));
