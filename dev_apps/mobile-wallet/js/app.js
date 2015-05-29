/* globals AppView, ERRORS, SIMAccess, SettingsController, PinController,
   AppletListView, AppletListController, HCIView, SEUtils, PAYMENT_IMG_SRC,
   NONPAYMENT_IMG_SRC, PAYMENT_APPLET_FILTER, NONPAYMENT_APPLET_FILTER,
   SIM_UPDATE, SIM_REFRESH */

window.addEventListener('DOMContentLoaded', function() {
  'use strict';

  var log = (msg) => console.log('[main-ctrl] ' + msg);
  var appState = { initialised: false, sentToBackground: false };
  var appView = new AppView('main', 'global-error');

  if(!window.navigator.seManager) {
    log('Secure Element API not available. Exiting.');
    appView.showErrorView(ERRORS.GLOBAL.NO_API);
    return;
  }

  // components and views instantiation
  var pin = new PinController(SIMAccess, 'pin-ctrl', 'pin');

  var settingsPin = new PinController(SIMAccess, 'settings-pin-ctrl',
                                      'settings-pin-view', 'pin-template');
  var settings = new SettingsController('settings-ctrl', 'settings',
                                        settingsPin);

  var paymentsView = new AppletListView('payments-view', PAYMENT_IMG_SRC);
  var hciView = new HCIView('hci-notification', PAYMENT_IMG_SRC);
  var payments = new AppletListController(SIMAccess,'payments-ctrl',
                                          paymentsView, PAYMENT_APPLET_FILTER);

  var nonPaymentsView = new AppletListView('nonpayments-view',
                                           NONPAYMENT_IMG_SRC);
  var nonPayments =
    new AppletListController(SIMAccess, 'nonpayments-ctrl', nonPaymentsView,
                             NONPAYMENT_APPLET_FILTER, true);

  // updating SIMAccess with settings read from localStorage
  SIMAccess.crsAid = settings.crsAid;
  SIMAccess.uiccAid = settings.uiccAid;
  SIMAccess.pinP2 = settings.pinP2;

  // pin verification
  var performPinCheck = function performPinCheck() {
    if(settings.pinEnabled && !pin.pinCheckInProgress) {
      appView.hideMainView();
      return pin.verifyPin().then((verified) => {
        if(!verified) {
          return Promise.reject('Pin verification failed');
        }

        appView.showMainView();
      });
    }

    return Promise.resolve();
  };

  // app starting point
  var initApp = function intitApp() {
    appView.showMainView();
    SIMAccess.start()
    .then(performPinCheck)
    .then(() => payments.init())
    .then(() => nonPayments.init())
    .then(() => { appState.initialised = true; })
    .catch((error) => {
      log('Init promise chain broken. Reason: ' + error);
      appView.showErrorView(error);
      SIMAccess.stop();
    });
  };

  // global events, system-messages handlers
  document.addEventListener('visibilitychange', () => {
    log('Visibility change');
    if(!document.hidden && appState.initialised) {
      performPinCheck().catch((e) => appView.showErrorView(e));
    }

    appState.sentToBackground = document.hidden;
  });

  window.navigator.mozSetMessageHandler('nfc-hci-event-transaction', (msg) => {
    var shouldClose = !appState.initialised || appState.sentToBackground;
    var aid = SEUtils.byteToHexString(msg.aid);
    log('Got HCI EVT_TRANSACTION from AID ' + aid);

    // SIM card is not accessible for the first 1.5s after HCI
    setTimeout(() => payments.handleHCIEvt(msg, settings.fastpayEnabled), 2000);
    hciView.show(aid, shouldClose);
  });

  // coponent specific event handlers
  appView.addListener({ onEvent: (id, data) => {
    if(data.action === 'open-settings') {
      settings.show();
      appView.hideErrorView();
    }
  }});

  settings.addListener({ onEvent: (id, data) => {
    log('Settings event: ' + JSON.stringify(data));
    if(data.error) {
      appView.showErrorView(data.error);
      return;
    }

    if(data.action === 'settings-updated') {
      var refreshNeeded = false;
      Object.keys(data.changes).forEach(key => {
        refreshNeeded = refreshNeeded || SIM_REFRESH.indexOf(key) !== -1;

        if(SIM_UPDATE.indexOf(key) !== -1) {
          SIMAccess[key] = data.changes[key];
        }
      });

      if(refreshNeeded) {
        initApp();
      }
    }
  }});

  log('Init access, getting applets from CRS');
  initApp();
});
