/* global utils, tzSelect, FinishScreen,
          Basket, ConfirmDialog, ScreenLayout,
          DataMobile, SimManager, SdManager,
          Tutorial, TimeManager, WifiManager,
          WifiUI, WifiHelper, FxAccountsIACHelper,
          Navigation */
/* exported UIManager */
'use strict';

var _;

var UIManager = {
  // As in other Gaia apps, we store all the dom selectors in one
  // place and then camelCase them and attach to the main object,
  // eg. instead of calling document.getElementById('splash-screen')
  // we can access this.splashScreen in our code.
  domSelectors: [
    'container',
    'splash-screen',
    'activation-screen',
    'finish-screen',
    'update-screen',
    'main-title',
    'back-button',
    // Unlock SIM Screen
    'unlock-sim-screen',
    'unlock-sim-header',
    'unlock-sim-action',
    // PIN Screen
    'pincode-screen',
    'pin-label',
    'pin-retries-left',
    'pin-input',
    'back-sim-button',
    'pin-error',
    'skip-pin-button',
    'unlock-sim-button',
    // PUK Screen
    'pukcode-screen',
    'puk-label',
    'puk-retries-left',
    'puk-input',
    'puk-info',
    'puk-error',
    'newpin-input',
    'newpin-error',
    'confirm-newpin-input',
    'confirm-newpin-error',
    // XCK Screen
    'xckcode-screen',
    'xck-label',
    'xck-retries-left',
    'xck-input',
    'xck-error',
    // SIM info
    'sim-info-screen',
    'sim-info-back',
    'sim-info-forward',
    'sim-info-1',
    'sim-info-2',
    'sim-number-1',
    'sim-number-2',
    'sim-carrier-1',
    'sim-carrier-2',
    // Import contacts
    'sim-import',
    'sim-import-button',
    'no-sim',
    'sd-import-button',
    'no-memorycard',
    // Fxa Intro
    'fxa-create-account',
    'fxa-intro',
    'fxa-options',
    'fxa-no',
    // Wifi
    'networks',
    'wifi-refresh-button',
    'wifi-join-button',
    'join-hidden-button',
    'no-result-container',
    // Hidden Wifi
    'hidden-wifi-authentication',
    'hidden-wifi-ssid',
    'hidden-wifi-security',
    'hidden-wifi-password',
    'hidden-wifi-identity',
    'hidden-wifi-identity-box',
    'hidden-wifi-show-password',
    'hidden-wifi-join-button',
    //Date & Time
    'date-configuration',
    'time-configuration',
    'date-configuration-label',
    'time-configuration-label',
    'time-form',
    // 3G
    'enable-data',
    'disable-data',
    // Geolocation
    'enable-geolocation',
    'disable-geolocation',
    // Tutorial
    'lets-go-button',
    'update-lets-go-button',
    'skip-tutorial-button',
    'update-skip-tutorial-button',
    // Privacy Settings
    'share-performance',
    'noshare-performance',
    'offline-error-dialog',
    // Browser privacy newsletter subscription
    'newsletter-form',
    'newsletter-input',
    'newsletter-submit',
    'newsletter-success-screen',
    'offline-newsletter-error-dialog',
    'invalid-email-error-dialog'
  ],

  dataConnectionChangedByUsr: false,
  timeZoneNeedsConfirmation: true,
  DARK_THEME: '#242d33',
  LIGHT_THEME: '#eeeeee',

  init: function ui_init() {
    _ = navigator.mozL10n.get;

    // Initialization of the DOM selectors
    this.domSelectors.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }.bind(this));

    var currentDate = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = _('shortTimeFormat');
    this.timeConfigurationLabel.innerHTML = f.localeFormat(currentDate, format);
    this.dateConfigurationLabel.innerHTML = currentDate.
      toLocaleFormat('%Y-%m-%d');

    // Add events to DOM
    this.simImportButton.addEventListener('click', this);
    this.sdImportButton.addEventListener('click', this);
    this.skipPinButton.addEventListener('click', this);
    this.backSimButton.addEventListener('click', this);
    this.unlockSimButton.addEventListener('click', this);
    this.unlockSimAction.addEventListener('action', this);
    this.simInfoBack.addEventListener('click', this);
    this.simInfoForward.addEventListener('click', this);

    this.enableData.addEventListener('click', this);
    this.disableData.addEventListener('click', this);

    this.wifiRefreshButton.addEventListener('click', this);
    this.wifiJoinButton.addEventListener('click', this);
    this.hiddenWifiJoinButton.addEventListener('click', this);
    this.networks.addEventListener('click', this);

    this.joinHiddenButton.addEventListener('click', this);
    this.hiddenWifiSecurity.addEventListener('change', this);
    this.wifiJoinButton.disabled = true;

    this.hiddenWifiPassword.addEventListener('keyup', function() {
      this.wifiJoinButton.disabled = !WifiHelper.isValidInput(
        this.hiddenWifiSecurity.value,
        this.hiddenWifiPassword.value,
        this.hiddenWifiIdentity.value
      );
    }.bind(this));

    this.hiddenWifiShowPassword.onchange = function togglePasswordVisibility() {
      UIManager.hiddenWifiPassword.type = this.checked ? 'text' : 'password';
    };

    this.timeConfiguration.addEventListener('input', this);
    this.dateConfiguration.addEventListener('input', this);

    this.enableGeolocation.addEventListener('click', this);
    this.disableGeolocation.addEventListener('click', this);

    this.fxaCreateAccount.addEventListener('click', this);

    this.newsletterSubmit.addEventListener('click', this);

    // Prevent form submit in case something tries to send it
    this.timeForm.addEventListener('submit', function(event) {
      event.preventDefault();
    });

    // Input scroll workaround
    this.newsletterInput.addEventListener('focus', function() {
      window.addEventListener('resize', function resize() {
        window.removeEventListener('resize', resize);
        // Need to wait till resize is done
        setTimeout(function() {
          var page = document.getElementById('browser_privacy');
          UIManager.scrollToElement(page, UIManager.newsletterInput);
        }, 30);
      });
    });

    this.newsletterInput.addEventListener('input', function(evt) {
      var submitClasses = UIManager.newsletterSubmit.classList;
      if (submitClasses.contains('disabled') ===
          (evt.target.checkValidity() && evt.target.value.length !== 0)) {
        UIManager.toggleNewsletter();
      }
    });

    var skipTutorialAction = function() {
      // Stop Wifi Manager
      WifiManager.finish();
      // For tiny devices
      if (ScreenLayout.getCurrentLayout() === 'tiny') {
        window.close();
      } else {
        // for large devices
        FinishScreen.init();
      }
    };

    var startTutorialAction = function(evt) {
      // Stop Wifi Manager
      WifiManager.finish();

      // Play the tutorial steps as soon as config is done loading
      Tutorial.start(function onTutorialLoaded() {
        UIManager.activationScreen.classList.remove('show');
        UIManager.updateScreen.classList.remove('show');
        UIManager.finishScreen.classList.remove('show');
      });
    };

    this.skipTutorialButton.addEventListener('click', skipTutorialAction);
    this.updateSkipTutorialButton.addEventListener('click', skipTutorialAction);

    this.letsGoButton.addEventListener('click', startTutorialAction);
    this.updateLetsGoButton.addEventListener('click', startTutorialAction);

    // Enable sharing performance data (saving to settings)
    this.sharePerformance.addEventListener('click', this);
    this.nosharePerformance.addEventListener('click', this);
    var button = this.offlineErrorDialog.querySelector('button');
    button.addEventListener('click',
                            this.onOfflineDialogButtonClick.bind(this));

    // Handle activation screen visibility.
    ['confirmdialogshowing',
     'loadingoverlayshowing',
     'tutorialinitialized'].forEach(function(event) {
      window.addEventListener(event,
        this.hideActivationScreenFromScreenReader.bind(this));
    }, this);

    ['confirmdialoghiding',
     'loadingoverlayhiding'].forEach(function(event) {
      window.addEventListener(event,
        this.showActivationScreenToScreenReader.bind(this));
    }, this);
  },

  scrollToElement: function ui_scrollToElement(container, element) {
    container.scrollTop = element.offsetTop;
  },

  sendNewsletter: function ui_sendNewsletter(callback) {
    var self = this;
    var emailValue = self.newsletterInput.value;
    if (emailValue === '') {
      return callback(true);
    } else {
      utils.overlay.show('email-loading', 'spinner');
      if (self.newsletterInput.checkValidity()) {
        if (window.navigator.onLine) {
          Basket.send(emailValue, function emailSent(err, data) {
            if (err) {
              if (err.code && err.code === Basket.errors.INVALID_EMAIL) {
                ConfirmDialog.show('invalid-email-dialog-title',
                                   'invalid-email-dialog-text',
                                   {
                                    title: 'cancel',
                                    callback: function ok() {
                                      ConfirmDialog.hide();
                                    }
                                   });
                utils.overlay.hide();
                return callback(false);
              } else {
                Basket.store(emailValue);
              }
            }
            utils.overlay.hide();
            return callback(true);
          });
        } else {
          Basket.store(emailValue, function stored(errorStoring) {
            utils.overlay.hide();
            return callback(!errorStoring);
          });
        }
      } else {
        utils.overlay.hide();
        ConfirmDialog.show('invalid-email-dialog-title',
                           'invalid-email-dialog-text',
                           {
                            title: 'cancel',
                            callback: function ok() {
                              ConfirmDialog.hide();
                            }
                           });
        return callback(false);
      }
    }
  },

  initTZ: function ui_initTZ() {
    // Initialize the timezone selector, see /shared/js/tz_select.js
    var self = this;
    var tzRegion = document.getElementById('tz-region');
    var tzCity = document.getElementById('tz-city');
    return new Promise(function(resolve) {
      var onchange = self.setTimeZone.bind(self);
      var onload = function() {
        self.setTimeZone.apply(self, arguments);
        resolve();
      };
      tzSelect(tzRegion, tzCity, onchange, onload);
    });
  },

  handleEvent: function ui_handleEvent(event) {
    switch (event.target.id) {
      // SIM
      case 'skip-pin-button':
        SimManager.skip();
        break;
      case 'back-sim-button':
      case 'sim-info-back':
        SimManager.back();
        break;
      case 'unlock-sim-button':
        SimManager.unlock();
        break;
      case 'unlock-sim-action':
        SimManager.simUnlockBack();
        break;
      case 'sim-info-forward':
        SimManager.finish();
        break;
      case 'sim-import-button':
        // Needed to give the browser the opportunity to properly refresh the UI
        // Particularly the button toggling cycle (from inactive to active)
        window.setTimeout(SimManager.importContacts, 0);
        break;
      case 'sd-import-button':
        // Needed to give the browser the opportunity to properly refresh the UI
        // Particularly the button toggling cycle (from inactive to active)
        window.setTimeout(SdManager.importContacts, 0);
        break;
      // 3G
      case 'enable-data':
        this.dataConnectionChangedByUsr = true;
        DataMobile.toggle(true);
        break;
      case 'disable-data':
        this.dataConnectionChangedByUsr = true;
        DataMobile.toggle(false);
        break;
      // WIFI
      case 'wifi-refresh-button':
        WifiManager.scan(WifiUI.renderNetworks);
        break;
      case 'wifi-join-button':
        WifiUI.joinNetwork();
        break;
      case 'hidden-wifi-join-button':
        WifiUI.joinHiddenNetwork();
        break;
      case 'join-hidden-button':
        WifiUI.addHiddenNetwork();
        break;
      case 'hidden-wifi-security':
        var securityType = event.target.value;
        WifiUI.handleHiddenWifiSecurity(securityType);
        break;
      // Date & Time
      case 'time-configuration':
        this.setTime();
        break;
      case 'date-configuration':
        this.setDate();
        break;
      // Geolocation
      case 'enable-geolocation':
        this.updateSetting('geolocation.enabled', true);
        break;
      case 'disable-geolocation':
        this.updateSetting('geolocation.enabled', false);
        break;
      // Privacy
      case 'share-performance':
        this.updateSetting('debug.performance_data.shared', true);
        break;
      case 'noshare-performance':
        this.updateSetting('debug.performance_data.shared', false);
        break;
      // Fxa Intro
      case 'fxa-create-account':
        if (!event.target.classList.contains('disabled')) {
          this.createFirefoxAccount();
        }
        break;
      case 'newsletter-submit':
        // Try to send Newsletter here
        UIManager.sendNewsletter(function newsletterSent(result) {
          if (result) { // sending process ok, we advance
            UIManager.end();
          }
          // error on sending, we stay where we are
        });
        break;
      default:
        // wifi selection
        if (document.getElementById('networks-list').contains(event.target)) {
          WifiUI.chooseNetwork(event);
        }
        break;
    }
  },

  updateSetting: function ui_updateSetting(name, value) {
    var settings = window.navigator.mozSettings;
    if (!name || !settings) {
      return;
    }
    var cset = {}; cset[name] = value;
    settings.createLock().set(cset);
  },

  createFirefoxAccount: function ui_createFirefoxAccount() {
    FxAccountsIACHelper.openFlow(UIManager.fxaShowResponse,
      UIManager.fxaShowError);
  },

  fxaShowResponse: function ui_fxaShowResponse() {
    FxAccountsIACHelper.getAccounts(UIManager.fxaGetAccounts,
      UIManager.fxaShowError);
  },

  fxaGetAccounts: function ui_fxaGetAccounts(acct) {
    if (!acct) {
      return;
    }
    // We were successful and we should move on
    Navigation.forward();
    // Update the email
    UIManager.newsletterInput.value = acct.email;
    UIManager.enableNewsletter();
    // Update the string
    UIManager.fxaIntro.innerHTML = '';
    navigator.mozL10n.setAttributes(
      UIManager.fxaIntro,
      acct.verified ? 'fxa-signed-in' : 'fxa-email-sent',
      {
        email: acct.email
      }
    );
    // Change the navigation
    UIManager.fxaCreateAccount.classList.add('disabled');
    UIManager.fxaNo.setAttribute('data-l10n-id', 'navbar-next');
  },

  fxaShowError: function ui_fxaShowError(response) {
    console.error('Create FxA Error: ' + JSON.stringify(response));
    // Clean fields
    UIManager.newsletterInput.value = '';
    UIManager.disableNewsletter();
    // Update the string
    // Reset the field
    navigator.mozL10n.setAttributes(
      UIManager.fxaIntro,
      'fxa-upsell'
    );
    // Enable the button
    UIManager.fxaCreateAccount.classList.remove('disabled');
    UIManager.fxaNo.setAttribute('data-l10n-id', 'navbar-next');
  },

  displayOfflineDialog: function ui_displayOfflineDialog(href, title) {
    var dialog = this.offlineErrorDialog;
    navigator.mozL10n.setAttributes(dialog.querySelector('small'),
      'offline-dialog-text', { url: href });
    dialog.classList.add('visible');
    this.hideActivationScreenFromScreenReader();
  },

  onOfflineDialogButtonClick: function ui_onOfflineDialogButtonClick(e) {
    this.offlineErrorDialog.classList.remove('visible');
    this.showActivationScreenToScreenReader();
  },

  hideActivationScreenFromScreenReader:
    function ui_hideActivationScreenFromScreenReader() {
      this.activationScreen.setAttribute('aria-hidden', true);
    },

  showActivationScreenToScreenReader:
    function ui_showActivationScreenToScreenReader() {
      this.activationScreen.setAttribute('aria-hidden', false);
    },

  setDate: function ui_sd() {
    if (!!this.lock) {
      return;
    }

    // Current time
    var now = new Date();
    // Format: 2012-09-01
    var currentDate = this.dateConfiguration.value;
    var currentTime = now.toLocaleFormat('%H:%M');
    var timeToSet = new Date(currentDate + 'T' + currentTime);
    TimeManager.set(timeToSet);
    this.dateConfigurationLabel.innerHTML =
      timeToSet.toLocaleFormat('%Y-%m-%d');
  },

  setTime: function ui_st() {
    if (!!this.lock) {
      return;
    }
    var timeLabel = document.getElementById('time-configuration-label');
    // Current time
    var now = new Date();
    // Format: 2012-09-01
    var currentTime = document.getElementById('time-configuration').value;
    if (currentTime.indexOf(':') === 1) {  // Format: 8:05 --> 08:05
      currentTime = '0' + currentTime;
    }
    var currentDate = now.toLocaleFormat('%Y-%m-%d');
    var timeToSet = new Date(currentDate + 'T' + currentTime);
    // Set date through API
    TimeManager.set(timeToSet);
    // Set DATE properly
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = _('shortTimeFormat');
    timeLabel.innerHTML = f.localeFormat(timeToSet, format);
  },

  setTimeZone: function ui_stz(timezone, needsConfirmation) {
    this.timeZoneNeedsConfirmation = !!needsConfirmation;

    var utcOffset = timezone.utcOffset;
    document.getElementById('time_zone_overlay').className =
      'UTC' + utcOffset.replace(/[+:]/g, '');
    var timezoneTitle = document.getElementById('time-zone-title');
    navigator.mozL10n.setAttributes(timezoneTitle, 'timezoneTitle', {
      utcOffset: utcOffset,
      region: timezone.region,
      city: timezone.city
    });
    document.getElementById('tz-region-label').textContent = timezone.region;
    document.getElementById('tz-city-label').textContent = timezone.city;

    var f = new navigator.mozL10n.DateTimeFormat();
    var now = new Date();
    var timeLabel = document.getElementById('time-configuration-label');
    timeLabel.innerHTML = f.localeFormat(now, _('shortTimeFormat'));
  },

  updateDataConnectionStatus: function ui_udcs(status) {
    this.dataConnectionSwitch.checked = status;
  },

  changeStatusBarColor: function ui_csbc(color) {
    var themeMeta = document.head.querySelector('meta[name="theme-color"]');
    themeMeta.setAttribute('content', color);
  },

  enableNewsletter: function ui_enableNewsletter() {
    var button = this.newsletterSubmit;
    button.classList.remove('disabled');
  },

  disableNewsletter: function ui_disableNewsletter() {
    var button = this.newsletterSubmit;
    button.classList.add('disabled');
  },

  toggleNewsletter: function ui_toggleNewsletter() {
    var button = this.newsletterSubmit;
    button.classList.contains('disabled') ?
      this.enableNewsletter() : this.disableNewsletter();
  },

  end: function ui_end() {
    this.activationScreen.classList.remove('show');
    this.finishScreen.classList.add('show');
    this.changeStatusBarColor(this.DARK_THEME);
    this.hideActivationScreenFromScreenReader();
  }
};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
