/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ParsedProvisioningDoc, ProvisioningAuthentication,
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

  /** Accept button node */
  var acceptButton = null;

  /** Store button node */
  var storeButton = null;

  /** Cancel storebutton node */
  var cancelStoreButton = null;

  /** Try again button node */
  var tryAgainButton = null;

  /** Finish button node */
  var finishButton = null;

  /** Title of the message, usually holds the sender's number */
  var title = null;

  /** PIN input node */
  var pin = null;

  /** Quit app confirm dialog node */
  var quitAppConfirmDialog = null;

  /** Store confirm dialog node */
  var storeConfirmDialog = null;

  /** Auth failures confirm dialog node */
  var authFailureConfirmDialog = null;

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

  /** Authentication parameter for the WAP PUSH message. */
  var authInfo = null;

  /** WAP provisioning document */
  var provisioningDoc = null;

  /** All APNs list */
  var apns = null;

  /** Parsed message, a copy of the one being handled. */
  var parsedMessage = null;

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

    storeConfirmDialog = document.getElementById('cp-store-confirm');
    storeButton = storeConfirmDialog.querySelector('.store');
    cancelStoreButton = storeConfirmDialog.querySelector('.cancel');

    authFailureConfirmDialog =
      document.getElementById('cp-auth-failure-confirm');
    tryAgainButton = authFailureConfirmDialog.querySelector('button');

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
    tryAgainButton.addEventListener('click', cpsh_onTryAgain);
    finishButton.addEventListener('click', cpsh_onFinish);
  }

  /**
   * Makes the client provisioning screen visible and populate it.
   */
  function cpsh_populateScreen(message) {
    screen.hidden = false;

    // Make a copy of the object in order to store it again into the database
    // in case the app goes to background while processing the message.
    parsedMessage = ParsedMessage.copy(message);

    // Set the callback function to be called when the app goes to background
    // while processing a message.
    WapPushManager.setOnVisibilityChangeCallback(cpsh_onVisibilityChange);

    // The close button in the header is shared between screens but sadly the
    // flow differs. Let the WapPushManaget knwo what CpScreenHelper function
    // invoque when the user click on the close button.
    WapPushManager.setOnCloseCallback(cpsh_onClose);

    // Show the accept button.
    acceptButton.hidden = false;

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

    var help = document.getElementById('cp-accept-help');
    if (showPINInput) {
      // If the document has not been authenticated yet and the PIN code is
      // needed, show some info and the PIN input element to the user.
      help.textContent = _('cp-accept-help-pin');
      pin.type = 'text';
      pin.focus();
    } else {
      help.textContent = _('cp-accept-help');
      pin.type = 'hidden';
      pin.blur();
    }

    title.textContent = message.sender;
  }

  /**
   * Handles the application flow when the app receives 'visibilitychange'
   * events. It takes care of storing the message again into the database if
   * the app went to background while processing a message.
   */
  function cpsh_onVisibilityChange() {
    if (processed) {
      return;
    }

    if (document.hidden) {
      WapPushManager._pendingMessages++;
      parsedMessage.save(
        function successCb(status) {
          var req = navigator.mozApps.getSelf();

          req.onsuccess = function onSuccessHandler(event) {
            var _ = navigator.mozL10n.get;
            var app = event.target.result;
            /* We store the message timestamp as a parameter to be able to
             * retrieve the message from the notification code */
            var iconURL = NotificationHelper.getIconURI(app) +
                         '?timestamp=' +
                         encodeURIComponent(parsedMessage.timestamp);

            parsedMessage.text =
              (parsedMessage.type == 'text/vnd.wap.connectivity-xml') ?
                _('cp-message-received-not-processed') : parsedMessage.text;

            var text = parsedMessage.text;

            NotificationHelper.send(parsedMessage.sender, text, iconURL,
              function notificationOnClickCb() {
                app.launch();
                WapPushManager.displayWapPushMessage(parsedMessage.timestamp);
              });
            WapPushManager.finish();
          };
          req.onerror = function onErrorHandler() {
            console.log('Could not get a reference to the WAP PUSH app \n');
            WapPushManager.finish();
          };
        },
        function errorCb(error) {
          console.log('Could not add a message to the database: ' +
            error + '\n');
          WapPushManager.finish();
        }
      );
    }
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
    WapPushManager.close();
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
   * Accepts the message, authenticates the sender and presents the settings to
   * be stored to the user
   */
  function cpsh_onAccept() {
    var message = null;

    if (!authenticated) {
      if (!pin.value) {
        // Need a valid PIN code, show an alert.
        authFailureConfirmDialog.hidden = false;
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
        // The document couldn't be authenticated, alert.
        authenticated = false;
        authFailureConfirmDialog.hidden = false;
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
      StoreProvisioning.provision(apns);

      // Show finish confirm dialog.
      finishConfirmDialog.hidden = false;
      return;
    }
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client provisioning store confirm dialog.
   */
  function cpsh_onCancelStore(evt) {
    evt.preventDefault();
    pin.focus();
    storeConfirmDialog.hidden = true;
  }

  /**
   * Handles the application flow when the user clicks on the 'Try again' button
   * from the client provisioning authentication failure confirm dialog.
   */
  function cpsh_onTryAgain(evt) {
    evt.preventDefault();
    pin.focus();
    authFailureConfirmDialog.hidden = true;
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

  return {
    init: cpsh_init,
    populateScreen: cpsh_populateScreen
  };
})();
