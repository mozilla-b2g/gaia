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
    'newsletter-button',
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
          // Display 'no connection' dialog on error
          this.offlineNewsletterErrorDialog.classList.add('visible');
        }

        return;
      }
      this.newsletterForm.classList.add('hidden');
      this.newsletterSuccessScreen.classList.add('visible');
    };

    this.newsletterButton.addEventListener('click', function() {
        if (WifiManager.isConnected || DataMobile.isDataAvailable) {
          if (
            this.newsletterInput.checkValidity() &&
            this.newsletterInput.value.length > 0
          ) {
            utils.overlay.show(_('email-loading'));
            Basket.send(this.newsletterInput.value, basketCallback.bind(this));
          } else {
            this.invalidEmailErrorDialog.classList.add('visible');
          }
        } else {
          this.offlineNewsletterErrorDialog.classList.add('visible');
        }
    }.bind(this));

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

  initTZ: function ui_initTZ() {
    // Initialize the timezone selector, see /shared/js/tz_select.js
    var tzRegion = document.getElementById('tz-region');
    var tzCity = document.getElementById('tz-city');
    tzSelect(tzRegion, tzCity, this.setTimeZone);
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
        WifiManager.scan(UIManager.renderNetworks);
        break;
      case 'wifi-join-button':
        this.joinNetwork();
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
        if (event.target.parentNode.id == 'networks') {
          this.chooseNetwork(event);
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

  joinNetwork: function ui_jn() {
    var password = document.getElementById('wifi_password').value;
    if (password == '') {
      // TODO Check with UX if this error is needed
      return;
    }
    var user = document.getElementById('wifi_user').value;
    var ssid = document.getElementById('wifi_ssid').value;
    if (WifiManager.isUserMandatory(ssid)) {
      if (user == '') {
        // TODO Check with UX if this error is needed
        return;
      }
      WifiManager.connect(ssid, password, user);
      window.history.back();
    } else {
      WifiManager.connect(ssid, password);
      window.history.back();
    }
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
    if (currentTime.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
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

  chooseNetwork: function ui_cn(event) {
    // Retrieve SSID from dataset
    var ssid = event.target.dataset.ssid;

    // Do we need to type password?
    if (!WifiManager.isPasswordMandatory(ssid)) {
      WifiManager.connect(ssid);
      return;
    }

    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.innerHTML = ssid;

    // Update network
    var selectedNetwork = WifiManager.getNetwork(ssid);
    var ssidHeader = document.getElementById('wifi_ssid');
    var userLabel = document.getElementById('label_wifi_user');
    var userInput = document.getElementById('wifi_user');
    var passwordInput = document.getElementById('wifi_password');
    var showPassword = document.querySelector('input[name=show_password]');

    // Show / Hide password
    passwordInput.type = 'password';
    passwordInput.value = '';
    showPassword.checked = false;
    showPassword.onchange = function() {
      passwordInput.type = this.checked ? 'text' : 'password';
    };

    // Update form
    passwordInput.value = '';
    ssidHeader.value = ssid;

    // Render form taking into account the type of network
    UIManager.renderNetworkConfiguration(selectedNetwork, function() {
      // Activate secondary menu
      UIManager.navBar.classList.add('secondary-menu');
      // Update changes in form
      if (WifiManager.isUserMandatory(ssid)) {
        userLabel.classList.remove('hidden');
        userInput.classList.remove('hidden');
      } else {
        userLabel.classList.add('hidden');
        userInput.classList.add('hidden');
      }

      // Change hash
      window.location.hash = '#configure_network';
    });
  },

  renderNetworks: function ui_rn(networks) {
    var networksDOM = document.getElementById('networks');
    networksDOM.innerHTML = '';
    var networksShown = [];
    networks.sort(function(a, b) {
      return b.relSignalStrength - a.relSignalStrength;
    });


    // Add detected networks
    for (var i = 0; i < networks.length; i++) {
      // Retrieve the network
      var network = networks[i];
      // Check if is shown
      if (networksShown.indexOf(network.ssid) == -1) {
        // Create dom elements
        var li = document.createElement('li');
        var icon = document.createElement('aside');
        var ssidp = document.createElement('p');
        var small = document.createElement('p');
        // Set Icon
        icon.classList.add('pack-end');
        icon.classList.add('icon');
        var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
        icon.classList.add('wifi-signal' + level);
        // Set SSID
        ssidp.textContent = network.ssid;
        li.dataset.ssid = network.ssid;
        // Show authentication method
        var keys = network.capabilities;
        if (WifiManager.isConnectedTo(network)) {
          small.textContent = _('shortStatus-connected');
        } else {
          if (keys && keys.length) {
            small.textContent = keys.join(', ');
          } else {
            small.textContent = _('securityOpen');
          }
        }
        // Update list of shown netwoks
        networksShown.push(network.ssid);
        // Append the elements to li
        li.setAttribute('id', network.ssid);
        li.appendChild(icon);
        li.appendChild(ssidp);
        li.appendChild(small);
        // Append to DOM
        if (WifiManager.isConnectedTo(network)) {
          networksDOM.insertBefore(li, networksDOM.firstChild);
        } else {
          networksDOM.appendChild(li);
        }
      }
    }
  },

  renderNetworkConfiguration: function uim_rnc(ssid, callback) {
    if (callback) {
      callback();
    }
  },

  updateNetworkStatus: function uim_uns(ssid, status) {
    if (!document.getElementById(ssid))
      return;

    document.getElementById(ssid).
      querySelector('p:last-child').innerHTML = _('shortStatus-' + status);
  },

  updateDataConnectionStatus: function uim_udcs(status) {
    this.dataConnectionSwitch.checked = status;
  }
};

function toCamelCase(str) {
  return str.replace(/\-(.)/g, function replacer(str, p1) {
    return p1.toUpperCase();
  });
}
