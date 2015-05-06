/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MessageDB, ParsedProvisioningDoc, ProvisioningAuthentication,
          StoreProvisioning, WapPushManager, Utils */

/* exported CpScreenHelper */

'use strict';

var CpScreenHelper = (function() {
  var _ = null;

  /** Content provisioning screen node */
  var cpScreen = null;

  /** Pin screen node */
  var pinScreen = null;

  /** APN screen node */
  var apnScreen = null;

  /** Details screen node */
  var detailsScreen = null;

  /** Quit app button node */
  var quitButton = null;

  /** Cancel quit app button node */
  var cancelQuitButton = null;

  /** Accept install configuration button node */
  var acceptInstallCfgButton = null;

  /** Cancel install configuration button node */
  var cancelInstallCfgButton = null;

  /** Finish button node */
  var finishButton = null;

  /** PIN input node */
  var pin = null;

  /** Quit app confirm dialog node */
  var quitAppConfirmDialog = null;

  /** Install configuration confirm dialog node */
  var installCfgConfirmDialog = null;

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

  /** Accept button node for each screen */
  var acceptApnButton = null;
  var acceptPinButton = null;
  var acceptDetailsButton = null;

  /** Title of the message, usually holds the sender's number */
  var titleApn = null;
  var titleDetails = null;
  var titlePin = null;

  /** Flag to define the flow of details screen */
  var multipleApns = false;

  /** Header of details screen */
  var headerDetails = null;

  function cpsh_init() {
    _ = navigator.mozL10n.get;

    // Let's consider the message is completely processed once the settings are
    // stored into the database.
    processed = false;

    // Retrieve the various page elements
    titleApn = document.getElementById('title-apn');
    titleDetails = document.getElementById('title-details');
    titlePin = document.getElementById('title-pin');

    quitAppConfirmDialog = document.getElementById('cp-quit-app-confirm');
    quitButton = quitAppConfirmDialog.querySelector('.quit');
    cancelQuitButton = quitAppConfirmDialog.querySelector('.cancel');

    installCfgConfirmDialog =
      document.getElementById('cp-install-configuration-confirm');
    acceptInstallCfgButton = installCfgConfirmDialog.querySelector('.accept');
    cancelInstallCfgButton = installCfgConfirmDialog.querySelector('.cancel');

    authFailureMessage = document.getElementById('cp-auth-failure');
    pinHelp = document.getElementById('cp-done-help');

    finishConfirmDialog = document.getElementById('cp-finish-confirm');
    finishButton = finishConfirmDialog.querySelector('button');

    cpScreen = document.getElementById('cp-screen');

    pinScreen = document.getElementById('cp-pin-screen');
    pin = pinScreen.querySelector('input');

    apnScreen = document.getElementById('cp-apn-screen');
    detailsScreen = document.getElementById('cp-details-screen');

    acceptApnButton = document.getElementById('apn-accept');
    acceptPinButton = document.getElementById('pin-accept');
    acceptDetailsButton = document.getElementById('details-accept');

    var headerApnList = document.getElementById('header-apn-list');
    headerDetails = document.getElementById('header-details');
    var headerPin = document.getElementById('header-pin');

    // Event handlers
    quitButton.addEventListener('click', cpsh_onQuit);
    cancelQuitButton.addEventListener('click', cpsh_onCancelQuit);
    finishButton.addEventListener('click', cpsh_onFinish);
    pin.addEventListener('keyup', cpsh_onPinInput);
    acceptApnButton.addEventListener('click', cpsh_onApnAccept);
    acceptPinButton.addEventListener('click', cpsh_onPinAccept);
    acceptDetailsButton.addEventListener('click', cpsh_onDetailsAccept);
    headerApnList.addEventListener('action', cpsh_onClose);
    headerDetails.addEventListener('action', cpsh_closeDetails);
    headerPin.addEventListener('action', cpsh_closePin);
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
    cpScreen.hidden = false;

    var _title = Utils.prepareMessageTitle(message);
    titleApn.textContent = _title;
    titleDetails.textContent = _title;
    titlePin.textContent = _title;

    iccCardIndex = message.serviceId;
    messageTag = message.timestamp;

    authInfo = message.provisioning.authInfo;
    provisioningDoc = message.provisioning.provisioningDoc;

    // Get the number of APNs to show details or the list of them.
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

    // Make the PIN input visible when the authentication mechanism needs a PIN
    // 0 NETWPIN, there is no need for an user PIN
    // 1 USERPIN, the authentication mechanism needs a PIN from the user
    // 1 USERNETWPIN, the authentication mechanism needs a PIN from the user
    // 1 USERPINMAC, the authentication mechanism needs a PIN from the user
    showPINInput = (authInfo.sec !== 'NETWPIN');
    // 'message.authInfo.checked' property tell us the authentication process
    // was already performed by gecko
    authenticated = authInfo.checked;
    // 'message.authInfo.pass' property tell us the result of the authentication
    // process when this process was performed by gecko
    isDocumentValid = authInfo.pass;

    if (showPINInput) {
      // If the document has not been authenticated yet and the PIN code is
      // needed, show some info and the PIN input element to the user.
      pinHelp.textContent = _('cp-accept-help-pin');
      pin.type = 'number';
      acceptPinButton.disabled = true;
    } else {
      pinHelp.textContent = _('cp-done-help');
      pin.type = 'hidden';
      pin.blur();
      acceptPinButton.disabled = false;
    }

    if (apns.length > 1) {
      multipleApns = true;
      cpsh_showApnList();
      return;
    }

    multipleApns = false;
    cpsh_showDetails(0);
  }

  /**
   * Shows the apn list screen when there are multiple apns in a configuration
   * message populating a list with each apn name.
   */
  function cpsh_showApnList() {
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < apns.length; i++) {
      var list = document.createElement('li');

      var a = document.createElement('a');
      a.addEventListener('click', cpsh_showDetails.bind(null, i));

      var aside = document.createElement('aside');
      aside.className = 'pack-end';
      aside.setAttribute('data-icon', 'forward');

      var p = document.createElement('p');
      p.textContent = apns[i].carrier;

      a.appendChild(aside);
      a.appendChild(p);
      list.appendChild(a);
      fragment.appendChild(list);
    }

    var content = apnScreen.querySelector('.message');
    content.innerHTML = '';

    content.appendChild(fragment);
  }

  /**
   * Handles the application flow when the user clicks on the 'next' button
   * from the apn list screen.
   */
  function cpsh_onApnAccept() {
    if (showPINInput) {
      pinScreen.addEventListener('transitionend', cpsh_setPinFocus);
    }

    apnScreen.classList.add('left');
    pinScreen.classList.remove('right');
  }

  /**
   * Shows the apn details screen.
   */
  function cpsh_showDetails(index) {
    if (multipleApns) {
      acceptDetailsButton.style.visibility = 'hidden';
      headerDetails.setAttribute('action', 'back');
    }

    var details = detailsScreen.querySelector('.message');
    details.innerHTML = '';

    cpsh_createNode(details, 'Name', apns[index].carrier);
    cpsh_createNode(details, 'APN', apns[index].apn);
    cpsh_createNode(details, 'Proxy', apns[index].proxy);
    cpsh_createNode(details, 'Port', apns[index].port);
    cpsh_createNode(details, 'Username', apns[index].user);
    cpsh_createNode(details, 'Password', apns[index].password);
    cpsh_createNode(details, 'MMSC', apns[index].mmsc);
    cpsh_createNode(details, 'MMS Proxy', apns[index].mmsproxy);
    cpsh_createNode(details, 'MMS Port', apns[index].mmsport);
    cpsh_createNode(details, 'Authentication Type', apns[index].authType);
    cpsh_createNode(details, 'APN Type', apns[index].types);

    detailsScreen.classList.remove('right');
    apnScreen.classList.add('left');
  }

  /**
   * Handles the application flow when the user clicks on the 'back'/ 'close'
   * button from the details screen.
   * If there are multiple APNs then back button to go back to apn list screen.
   * If only one APN then shows quit confirm.
   */
  function cpsh_closeDetails(evt) {
    if (!multipleApns) {
      cpsh_onClose(evt);
      return;
    }

    detailsScreen.classList.add('right');
    apnScreen.classList.remove('left');
  }

  /**
   * Handles the application flow when the user clicks on the 'next' button
   * from the details screen.
   */
  function cpsh_onDetailsAccept() {
    if (showPINInput) {
      pinScreen.addEventListener('transitionend', cpsh_setPinFocus);
    }

    detailsScreen.classList.add('left');
    pinScreen.classList.remove('right');
  }

  /**
   * Helper function used to populate the list of the APN details.
   */
  function cpsh_createNode(rootNode, key, value) {
    if (!value) {
      return;
    }

    var element = document.createElement('li');
    var nodeKey = document.createElement('p');
    var nodeValue = document.createElement('p');
    nodeKey.textContent = key;
    nodeValue.textContent = value;
    element.appendChild(nodeKey);
    element.appendChild(nodeValue);
    rootNode.appendChild(element);
  }

  /**
   * Helper function used to set focus to pin input when transition to pin
   * screen has finished.
   */
  function cpsh_setPinFocus() {
    pin.focus();
    pinScreen.removeEventListener('transitionend', cpsh_setPinFocus);
  }

  /**
   * Handles the application flow when the user clicks on the 'back' button
   * from the pin screen.
   */
  function cpsh_closePin() {
    pin.blur();

    if (!multipleApns) {
      pinScreen.classList.add('right');
      detailsScreen.classList.remove('left');
      return;
    }

    pinScreen.classList.add('right');
    apnScreen.classList.remove('left');
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
    quitAppConfirmDialog.hidden = true;
  }

  /**
   * Handles the application flow when the user clicks on the 'Cancel' button
   * from the client install configuration screen.
   */
  function cpsh_onCancelInstallCfg(evt) {
    evt.preventDefault();
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
  function cpsh_onPinAccept() {
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

    processed = true;
    // Store APNs into the database.
    StoreProvisioning.provision(apns, iccCardIndex);

    /* Show finish confirm dialog after having deleted the message, this is
     * done even if the deletion fails for some reason. */
    MessageDB.deleteByTimestamp(messageTag).then(function() {
      finishConfirmDialog.hidden = false;
    }, function(e) {
      console.error('Could not delete message from the database: ', e);
      finishConfirmDialog.hidden = false;
    });
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
   * Handles the application flow when the user clicks on the 'Finish' button
   * from the client provisioning finish confirm dialog.
   */
  function cpsh_onFinish(evt) {
    evt.preventDefault();
    WapPushManager.close();
  }

  /**
   * Enable / disable accept button if pin field is empty.
   */
  function cpsh_onPinInput(evt) {
    acceptPinButton.disabled = (pin.value.length === 0);
  }

  return {
    init: cpsh_init,
    populateScreen: cpsh_populateScreen,
    showConfirmInstallationDialog: cpsh_showConfirmInstallationDialog
  };
})();
