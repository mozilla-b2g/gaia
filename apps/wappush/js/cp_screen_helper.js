/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MessageDB, ParsedProvisioningDoc, ProvisioningAuthentication,
          StoreProvisioning, WapPushManager */

/* exported CpScreenHelper */

'use strict';

var CpScreenHelper = (function() {
  var _ = null;

  /** Screen node */
  var screen = null;

  /** Quit app button node */
  var quitButton = null;

  /** Cancel quit app button node */
  var cancelQuitButton = null;

  /** Accept install configuration button node */
  var acceptInstallCfgButton = null;

  /** Cancel install configuration button node */
  var cancelInstallCfgButton = null;

  /** Accept button node */
  var acceptButton = null;

  /** Store button node */
  var storeButton = null;

  /** Cancel storebutton node */
  var cancelStoreButton = null;

  /** Finish button node */
  var finishButton = null;

  /** Title of the message, usually holds the sender's number */
  var title = null;

  /** PIN input node */
  var pin = null;

  /** Quit app confirm dialog node */
  var quitAppConfirmDialog = null;

  /** Install configuration confirm dialog node */
  var installCfgConfirmDialog = null;

  /** Store confirm dialog node */
  var storeConfirmDialog = null;

  /** Auth failure message */
  var authFailureMessage = null;

  /** Help message */
  var pinHelp = null;

  /** Finish confirm dialog node */
  var finishConfirmDialog = null;

  /** User PIN is needed, show input node */
  var showPINInput = false;

  /** The message has not been authenticated yet */
  var authenticated = false;

  /** Flag that holds the result of the authentication process */
  var isDocumentValid = false;

  /** The message has not been processed yet */
  var processed = false;

  /** Message id for notification management */
  var messageTag = null;

  /** Authentication parameter for the WAP PUSH message. */
  var authInfo = null;

  /** WAP provisioning document */
  var provisioningDoc = null;

  /** All APNs list */
  var apns = null;

  /** Index of the card on which the message was received. */
  var iccCardIndex = 0;

  function cpsh_init() {
    _ = navigator.mozL10n.get;

    // Let's consider the message is completely processed once the settings are
    // stored into the database.
    processed = false;

    // Retrieve the various page elements
    acceptButton = document.getElementById('accept');
    title = document.getElementById('title');

    quitAppConfirmDialog = document.getElementById('cp-quit-app-confirm');
    quitButton = quitAppConfirmDialog.querySelector('.quit');
    cancelQuitButton = quitAppConfirmDialog.querySelector('.cancel');

    installCfgConfirmDialog =
      document.getElementById('cp-install-configuration-confirm');
    acceptInstallCfgButton = installCfgConfirmDialog.querySelector('.accept');
    cancelInstallCfgButton = installCfgConfirmDialog.querySelector('.cancel');

    storeConfirmDialog = document.getElementById('cp-store-confirm');
    storeButton = storeConfirmDialog.querySelector('.store');
    cancelStoreButton = storeConfirmDialog.querySelector('.cancel');

    authFailureMessage = document.getElementById('cp-auth-failure');
    pinHelp = document.getElementById('cp-accept-help');

    finishConfirmDialog = document.getElementById('cp-finish-confirm');
    finishButton = finishConfirmDialog.querySelector('button');

    screen = document.getElementById('cp-screen');
    pin = screen.querySelector('input');

    // Event handlers
    quitButton.addEventListener('click', cpsh_onQuit);
    cancelQuitButton.addEventListener('click', cpsh_onCancelQuit);
    acceptButton.addEventListener('click', cpsh_onAccept);
    storeButton.addEventListener('click', cpsh_onStore);
    cancelStoreButton.addEventListener('click', cpsh_onCancelStore);
    finishButton.addEventListener('click', cpsh_onFinish);
    pin.addEventListener('keyup', cpsh_onPinInput);
  }

  /**
   * Init the application flow showing a warning prompt that asks to the user if
   * wants to install the configuration information.
   */
  function cpsh_showConfirmInstallationDialog(message) {
    installCfgConfirmDialog.hidden = false;
    acceptInstallCfgButton
      .addEventListener('click',cpsh_onAcceptInstallCfg.bind(null, message));
    cancelInstallCfgButton.addEventListener('click', cpsh_onCancelInstallCfg);
  }

  /**
   * Makes the client provisioning screen visible and populate it.
   */
  function cpsh_populateScreen(message) {
    // The close button in the header is shared between screens but sadly the
    // flow differs. Let the WapPushManaget knwo what CpScreenHelper function
    // invoque when the user click on the close button.
    WapPushManager.setOnCloseCallback(cpsh_onClose);

    WapPushManager.enableAcceptButton(true);
    screen.hidden = false;

    authInfo = message.provisioning.authInfo;
    provisioningDoc = message.provisioning.provisioningDoc;
    // Make the PIN input visible when the authentication mechanism needs a PIN
    // 0 NETWPIN, there is no need for an user PIN
    // 1 USERPIN, the authentication mechanism needs a PIN from the user
    // 1 USERNETWPIN, the authentication mechanism needs a PIN from the user
    // 1 USERPINMAC, the authentication mechanism needs a PIN from the user
    showPINInput = (message.provisioning.authInfo.sec !== 'NETWPIN');
    // 'message.authInfo.checked' property tell us the authentication process
    // was already performed by gecko
    authenticated = message.provisioning.authInfo.checked;
    // 'message.authInfo.pass' property tell us the result of the authentication
    // process when this process was performed by gecko
    isDocumentValid = message.provisioning.authInfo.pass;

    if (showPINInput) {
      // If the document has not been authenticated yet and the PIN code is
      // needed, show some info and the PIN input element to the user.
      pinHelp.textContent = _('cp-accept-help-pin');
      pin.type = 'number';
      pin.focus();
      acceptButton.disabled = true;
    } else {
      pinHelp.textContent = _('cp-accept-help');
      pin.type = 'hidden';
      pin.blur();
      acceptButton.disabled = false;
    }

    var _title = message.sender;
    /* If the phone has more than one SIM prepend the number of the SIM on
     * which this message was received */
    if (navigator.mozIccManager &&
        navigator.mozIccManager.iccIds.length > 1) {
      var simName = _('sim', { id: +message.serviceId + 1 });

      _title = _(
        'dsds-notification-title-with-sim',
         { sim: simName, title: _title }
      );
    }
    title.textContent = _title;

    iccCardIndex = message.serviceId;
    messageTag = message.timestamp;
  }

  /**
   * Handles the application flow when the user clicks on the 'close' button
   * from the client provisioning screen.
   */
  function cpsh_onClose(evt) {
    if (processed) {
      WapPushManager.close();
      return;
    }
    quitAppConfirmDialog.hidden = false;
  }

  /**
   * Handles the application flow when the user clicks on the 'Quit' button
   * from the client provisioning quit app confirm dialog.
   */
  function cpsh_onQuit(evt) {
    evt.preventDefault();
    quitAppConfirmDialog.hidden = true;
    WapPushManager.clearNotifications(messageTag);
    MessageDB.deleteByTimestamp(messageTag).then(function() {
      WapPushManager.close();
    }, function() {
      console.error('Could not delete message from the database');
      WapPushManager.close();
    });
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client provisioning quit app confirm dialog.
   */
  function cpsh_onCancelQuit(evt) {
    evt.preventDefault();
    pin.focus();
    quitAppConfirmDialog.hidden = true;
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client install configuration screen.
   */
  function cpsh_onCancelInstallCfg(evt) {
    evt.preventDefault();
    installCfgConfirmDialog.hidden = true;
    WapPushManager.close();
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client install configuration screen.
   */
  function cpsh_onAcceptInstallCfg(message, evt) {
    evt.preventDefault();
    cpsh_populateScreen(message);
    installCfgConfirmDialog.hidden = true;
  }

  /**
   * Accepts the message, authenticates the sender and presents the settings to
   * be stored to the user
   */
  function cpsh_onAccept() {
    var message = null;

    if (!authenticated) {
      if (!pin.value) {
        // Need a valid PIN code, show error.
        cpsh_pinError();
        return;
      }

      try {
        // Need to perform the authentication process.
        isDocumentValid =
          ProvisioningAuthentication.isDocumentValid(pin.value,
                                                     authInfo);
      } catch (e) {
        message = finishConfirmDialog.querySelector('strong');
        message.textContent = _(e.message);
        finishConfirmDialog.hidden = false;
        return;
      }

      authenticated = true;
      if (!isDocumentValid) {
        // The document couldn't be authenticated, show error.
        authenticated = false;
        cpsh_pinError();
        return;
      }
    }

    // The validation process result should come from gecko.
    if (!showPINInput && !isDocumentValid) {
      // Something went wrong (maybe the message the device received could not
      // be authenticated against the SIM card), show an alter.
      message = finishConfirmDialog.querySelector('strong');
      message.textContent = _('cp-finish-confirm-dialog-message-invalid-doc');
      finishConfirmDialog.hidden = false;
      return;
    }

    var parsedProvisioningDoc = ParsedProvisioningDoc.from(provisioningDoc);
    apns = parsedProvisioningDoc.getApns();

    // The provisioning document might not have valid APNs (other ones that
    // those ones in APPLICATION nodes for the Browsing Enabler and AC for the
    // Multimedia Messaging System Enabler). In this case we must not continue.
    if (apns.length === 0) {
      message = finishConfirmDialog.querySelector('strong');
      message.textContent = _('cp-finish-confirm-dialog-message-no-apns');
      finishConfirmDialog.hidden = false;
      return;
    }

    var names = [];
    var i;

    for (i = 0; i < apns.length; i++) {
      names.push(apns[i].carrier);
    }

    // If the document has been already authenticated and there are no errors,
    // show the settings we are about to store into the settings database.
    message = storeConfirmDialog.querySelector('.message');
    var msg = '';
    for (i = 0; i < names.length; i++) {
      msg += '\n' + names[i];
    }
    message.textContent = msg;

    // Let's store the settings or quit the app.
    storeConfirmDialog.hidden = false;
  }

  function cpsh_pinError() {
    authFailureMessage.hidden = false;
    pinHelp.hidden = true;
    pin.focus();
    // Set max to -1 in order to show invalid input.
    pin.setAttribute('max', -1);
    pin.addEventListener('keyup', cpsh_onPinErrorRestore);
  }

  function cpsh_onPinErrorRestore() {
    authFailureMessage.hidden = true;
    pinHelp.hidden = false;
    pin.removeAttribute('max');
    pin.addEventListener('keyup', cpsh_onPinInput);
  }

  /**
   * Handles the application flow when the user clicks on the 'Store' button
   * from the client provisioning store confirm dialog.
   */
  function cpsh_onStore(evt) {
    evt.preventDefault();
    if (authenticated && isDocumentValid) {
      storeConfirmDialog.hidden = true;

      processed = true;
      // Store the APNs into the database.
      StoreProvisioning.provision(apns, iccCardIndex);

      WapPushManager.clearNotifications(messageTag);

      /* Show finish confirm dialog after having deleted the message, this is
       * done even if the deletion fails for some reason. */
      MessageDB.deleteByTimestamp(messageTag).then(function() {
        finishConfirmDialog.hidden = false;
      }, function(e) {
        console.error('Could not delete message from the database: ', e);
        finishConfirmDialog.hidden = false;
      });
    }
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client provisioning store confirm dialog.
   */
  function cpsh_onCancelStore(evt) {
    evt.preventDefault();
    /* When cancelling request authentication again using the original type of
     * authentication that came with the message. */
    authenticated = authInfo.checked;
    pin.focus();
    storeConfirmDialog.hidden = true;
  }

  /**
   * Handles the application flow when the user clicks on the 'Finish' button
   * from the client provisioning finish confirm dialog.
   */
  function cpsh_onFinish(evt) {
    evt.preventDefault();
    finishConfirmDialog.hidden = true;
    WapPushManager.close();
  }

  /**
   * Enable / disable accept button if pin field is empty.
   */
  function cpsh_onPinInput(evt) {
    acceptButton.disabled = (pin.value.length === 0);
  }

  return {
    init: cpsh_init,
    populateScreen: cpsh_populateScreen,
    showConfirmInstallationDialog: cpsh_showConfirmInstallationDialog
  };
})();
