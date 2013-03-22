'use strict';

var UIManager = {

  // As in other Gaia apps, we store all the dom selectors in one
  // place and then camelCase them and attach to the main object,
  // eg. instead of calling document.getElementById('splash-screen')
  // we can access this.splashScreen in our code.
  domSelectors: [
    'splash-screen',
    'activation-screen',
    'progress-bar',
    'finish-screen',
    'nav-bar',
    'main-title',
    // Unlock SIM Screen
    'unlock-sim-screen',
    'unlock-sim-header',
    // PIN Screen
    'pincode-screen',
    'pin-label',
    'pin-input',
    'fake-pin-input',
    'pin-error',
    'skip-pin-button',
    'unlock-sim-button',
    // PUK Screen
    'pukcode-screen',
    'puk-label',
    'puk-input',
    'puk-info',
    'fake-puk-input',
    'puk-error',
    'newpin-input',
    'fake-newpin-input',
    'newpin-error',
    'confirm-newpin-input',
    'fake-confirm-newpin-input',
    'confirm-newpin-error',
    // XCK Screen
    'xckcode-screen',
    'xck-label',
    'xck-input',
    'fake-xck-input',
    'xck-error',
    // Import contacts
    'sim-import-button',
    'no-sim',
    // Wifi
    'networks',
    'wifi-refresh-button',
    'wifi-join-button',
    //Date & Time
    'date-configuration',
    'time-configuration',
    'date-configuration-label',
    'time-configuration-label',
    'time-form',
    // 3G
    'data-connection-switch',
    // Tutorial
    'tutorial-screen',
    'tutorial-progress',
    'lets-go-button',
    'skip-tutorial-button',
    // Privacy Settings
    'share-performance',
    'offline-error-dialog',
    // Browser privacy newsletter subscription
    'newsletter-form',
    'newsletter-input',
    'newsletter-success-screen',
    'offline-newsletter-error-dialog',
    'invalid-email-error-dialog'
  ],

  init: function ui_init() {
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
    this.fakePinInput.addEventListener('keypress',
                                       this.fakeInputValues.bind(this));
    this.fakePukInput.addEventListener('keypress',
                                       this.fakeInputValues.bind(this));
    this.fakeNewpinInput.addEventListener('keypress',
                                          this.fakeInputValues.bind(this));
    this.fakeConfirmNewpinInput.addEventListener('keypress',
                                              this.fakeInputValues.bind(this));
    this.fakeXckInput.addEventListener('keypress',
                                       this.fakeInputValues.bind(this));

    this.simImportButton.addEventListener('click', this);
    this.skipPinButton.addEventListener('click', this);
    this.unlockSimButton.addEventListener('click', this);

    this.dataConnectionSwitch.addEventListener('click', this);

    this.wifiRefreshButton.addEventListener('click', this);
    this.wifiJoinButton.addEventListener('click', this);
    this.networks.addEventListener('click', this);

    this.timeConfiguration.addEventListener('input', this);
    this.dateConfiguration.addEventListener('input', this);
    this.initTZ();

    // Prevent form submit in case something tries to send it
    this.timeForm.addEventListener('submit', function(event) {
      event.preventDefault();
    });

    // Input scroll workaround
    var top = this.newsletterInput.offsetTop;
    this.newsletterInput.addEventListener('focus', function() {
      window.addEventListener('resize', function resize() {
        window.removeEventListener('resize', resize);
        // Need to wait till resize is done
        setTimeout(function() {
          document.getElementById('browser_privacy').scrollTop = top;
        }, 30);
      });
    });

    // Browser privacy newsletter subscription
    var basketCallback = function(err, data) {
      utils.overlay.hide();
      if (err || data.status !== 'ok') {
        // We don't have any error numbers etc, so we are looking for
        // 'email address' string in the error description.
        if (err.desc.indexOf('email address') > -1) {
          this.invalidEmailErrorDialog.classList.add('visible');
        } else {
          // Store locally
          Basket.store(this.newsletterInput.value, function stored() {
            UIManager.newsletterSuccessScreen.classList.add('visible');
          });
        }
        return;
      }
      // if properly sent, remove stored email (in case of any)
      window.asyncStorage.removeItem('newsletter_email');
      this.newsletterForm.classList.add('hidden');
      this.newsletterSuccessScreen.classList.add('visible');
    };

    this.offlineNewsletterErrorDialog
      .querySelector('button')
      .addEventListener('click',
        function offlineDialogClick() {
          this.offlineNewsletterErrorDialog.classList.remove('visible');
        }.bind(this));

    this.invalidEmailErrorDialog
      .querySelector('button')
      .addEventListener('click',
        function invalidEmailDialogClick() {
          this.invalidEmailErrorDialog.classList.remove('visible');
        }.bind(this));

    this.skipTutorialButton.addEventListener('click', function() {
      WifiManager.finish();
      window.close();
    });
    this.letsGoButton.addEventListener('click', function() {
      UIManager.activationScreen.classList.remove('show');
      UIManager.finishScreen.classList.remove('show');
      UIManager.tutorialScreen.classList.add('show');
    });

    // Enable sharing performance data (saving to settings)
    this.sharePerformance.addEventListener('click', this);
    var button = this.offlineErrorDialog.querySelector('button');
    button.addEventListener('click',
                            this.onOfflineDialogButtonClick.bind(this));
  },

  sendNewsletter: function ui_sendNewsletter(callback) {
    var self = this;
    var emailValue = self.newsletterInput.value;
    if (emailValue == '') {
      return callback(true);
    } else {
      utils.overlay.show(_('email-loading'), 'spinner');
      if (self.newsletterInput.checkValidity()) {
        if (window.navigator.onLine) {
          Basket.send(emailValue, function emailSent(err, data) {
            if (err) {
              if (err.desc && err.desc.indexOf('email address') > -1) {
                ConfirmDialog.show(_('invalid-email-dialog-title'),
                                   _('invalid-email-dialog-text'),
                                   {
                                    title: _('cancel'),
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
          Basket.store(emailValue);
          utils.overlay.hide();
          return callback(true);
        }
      } else {
        utils.overlay.hide();
        ConfirmDialog.show(_('invalid-email-dialog-title'),
                           _('invalid-email-dialog-text'),
                           {
                            title: _('cancel'),
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
    var tzRegion = document.getElementById('tz-region');
    var tzCity = document.getElementById('tz-city');
    tzSelect(tzRegion, tzCity, this.setTimeZone, this.setTimeZone);
  },

  fakeInputValues: function ui_fakeInputValues(event) {
    var fakeInput = event.target;
    var code = event.charCode;
    if (code === 0 || (code >= 0x30 && code <= 0x39)) {
      var displayInput =
              document.getElementById(fakeInput.id.substr(5, fakeInput.length));
      var content = displayInput.value;
      if (code === 0) { // backspace
        content = content.substr(0, content.length - 1);
      } else {
        content += String.fromCharCode(code);
      }
      displayInput.value = content;
    }
    fakeInput.value = '';
  },

  handleEvent: function ui_handleEvent(event) {
    switch (event.target.id) {
      // SIM
      case 'skip-pin-button':
        SimManager.skip();
        break;
      case 'unlock-sim-button':
        Navigation.skipped = false;
        SimManager.unlock();
        break;
      case 'sim-import-button':
        // Needed to give the browser the opportunity to properly refresh the UI
        // Particularly the button toggling cycle (from inactive to active)
        window.setTimeout(SimManager.importContacts, 0);
        break;
      // 3G
      case 'data-connection-switch':
        var status = event.target.checked;
        DataMobile.toggle(status);
        break;
      // WIFI
      case 'wifi-refresh-button':
        WifiManager.scan(WifiUI.renderNetworks);
        break;
      case 'wifi-join-button':
        WifiUI.joinNetwork();
        break;
      // Date & Time
      case 'time-configuration':
        this.setTime();
        break;
      case 'date-configuration':
        this.setDate();
        break;
      // Privacy
      case 'share-performance':
        this.updateSetting(event.target.name, event.target.value);
        break;
      default:
        // wifi selection
        if (event.target.parentNode.id === 'networks-list') {
          WifiUI.chooseNetwork(event);
        }
        break;
    }
  },

  updateSetting: function ui_updateSetting(name, value) {
    var settings = window.navigator.mozSettings;
    if (!name || !settings)
      return;
    var cset = {}; cset[name] = value;
    settings.createLock().set(cset);
  },

  displayOfflineDialog: function ui_displayOfflineDialog(href, title) {
    var dialog = this.offlineErrorDialog,
        text = _('offline-dialog-text', { url: href });
    dialog.querySelector('small').textContent = text;
    dialog.classList.add('visible');
  },

  onOfflineDialogButtonClick: function ui_onOfflineDialogButtonClick(e) {
    this.offlineErrorDialog.classList.remove('visible');
  },

  setDate: function ui_sd() {
    if (!!this.lock) {
      return;
    }

    var dateLabel = document.getElementById('this.dateConfigurationLabel');
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

  setTimeZone: function ui_stz(timezone) {
    var utc = 'UTC' + timezone.utcOffset;
    document.getElementById('time_zone_overlay').className =
      utc.replace(/[+:]/g, '');
    document.getElementById('time-zone-title').textContent =
      utc + ' ' + timezone.id;
    document.getElementById('tz-region-label').textContent = timezone.region;
    document.getElementById('tz-city-label').textContent = timezone.city;

    var f = new navigator.mozL10n.DateTimeFormat();
    var now = new Date();
    var timeLabel = document.getElementById('time-configuration-label');
    timeLabel.innerHTML = f.localeFormat(now, _('shortTimeFormat'));
  },

  updateDataConnectionStatus: function ui_udcs(status) {
    this.dataConnectionSwitch.checked = status;
  }

};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
