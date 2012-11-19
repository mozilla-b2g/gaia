'use strict';

var UIManager = {
  get splashScreen() {
    delete this.splashScreen;
    return this.splashScreen = document.getElementById('splash');
  },
  get progressBar() {
    delete this.progressBar;
    return this.progressBar = document.getElementById('activation_progress');
  },
  get activationScreen() {
    delete this.activationScreen;
    return this.activationScreen = document.getElementById('activation');
  },
  get finishScreen() {
    delete this.finishScreen;
    return this.finishScreen = document.getElementById('finish');
  },
  get navBar() {
    delete this.navBar;
    return this.navBar = document.getElementById('nav-bar');
  },
  get mainTitle() {
    delete this.mainTitle;
    return this.mainTitle = document.getElementById('main_title');
  },
  get pincodeScreen() {
    delete this.pincodeScreen;
    return this.pincodeScreen = document.getElementById('pincode');
  },
  get pinInput() {
    delete this.pinInput;
    return this.pinInput = document.getElementById('pincode');
  },
  get refreshButton() {
    delete this.refreshButton;
    return this.refreshButton = document.getElementById('wifi-refresh');
  },
  get simImportButton() {
    delete this.simImportButton;
    return this.simImportButton = document.getElementById('sim_import');
  },
  get doneButton() {
    delete this.doneButton;
    return this.doneButton = document.getElementById('done');
  },
  get networks() {
    delete this.networks;
    return this.networks = document.getElementById('networks');
  },
  get joinButton() {
    delete this.joinButton;
    return this.joinButton = document.getElementById('join');
  },
  get timezoneConfiguration() {
    delete this.timezoneConfiguration;
    return this.timezoneConfiguration =
      document.getElementById('timezone-configuration');
  },
  get dateConfiguration() {
    delete this.dateConfiguration;
    return this.dateConfiguration = document.getElementById(
      'date-configuration');
  },
  get timeConfiguration() {
    delete this.timeConfiguration;
    return this.timeConfiguration = document.getElementById(
      'time-configuration');
  },
  get dateConfigurationLabel() {
    delete this.dateConfigurationLabel;
    return this.dateConfigurationLabel = document.getElementById(
      'date-configuration-label');
  },
  get timeConfigurationLabel() {
    delete this.timeConfigurationLabel;
    return this.timeConfigurationLabel = document.getElementById(
      'time-configuration-label');
  },
  get dataConnectionSwitch() {
    delete this.dataConnectionSwitch;
    return this.dataConnectionSwitch = document.getElementById(
      'dataSwitch');
  },
  get buttonLetsGo() {
    delete this.buttonLetsGo;
    return this.buttonLetsGo = document.getElementById('end');
  },
  init: function ui_init() {
    var currentDate = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = _('shortTimeFormat');
    this.timeConfigurationLabel.innerHTML = f.localeFormat(currentDate, format);
    this.dateConfigurationLabel.innerHTML = currentDate.
      toLocaleFormat('%Y-%m-%d');
    // Add events to DOM
    this.refreshButton.addEventListener('click', this);
    this.simImportButton.addEventListener('click', this);
    this.doneButton.addEventListener('click', this);
    this.joinButton.addEventListener('click', this);
    this.networks.addEventListener('click', this);
    this.timezoneConfiguration.addEventListener('change', this);
    this.timeConfiguration.addEventListener('input', this);
    this.dateConfiguration.addEventListener('input', this);
    this.buttonLetsGo.addEventListener('click', function() {
      window.close();
    });
   this.dataConnectionSwitch.addEventListener('click', this);
  },
  handleEvent: function ui_handleEvent(event) {
    switch (event.target.id) {
      case 'wifi-refresh':
        WifiManager.scan(UIManager.renderNetworks);
        break;
      case 'sim_import':
        this.importFromSim();
        break;
      case 'done':
        this.unlockSIM();
        break;
      case 'join':
        this.joinNetwork();
        break;
      case 'time-configuration':
        this.setTime();
        break;
      case 'date-configuration':
        this.setDate();
        break;
      case 'timezone-configuration':
        this.setTimeZone();
        break;
      case 'dataSwitch':
        var status = event.target.checked;
        DataMobile.toggle(status);
        break;
      default:
        if (event.target.parentNode.id == 'networks') {
          this.chooseNetwork(event);
        }
        break;
    }
  },
  importFromSim: function ui_ifs() {
    var feedbackMessage = document.getElementById('sim_import_feedback');
    feedbackMessage.innerHTML = _('simContacts-importing');
    importSIMContacts(
      function() {
        feedbackMessage.innerHTML = _('simContacts-reading');
      }, function(n) {
        feedbackMessage.innerHTML = _('simContacts-imported', {n: n});
      }, function() {
        feedbackMessage.innerHTML = _('simContacts-error');
    });
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

    var dateLabel = document.getElementById('date-configuration-label');
     // Current time
    var now = new Date();
    // Format: 2012-09-01
    var currentDate = document.getElementById('date-configuration').value;
    var currentTime = now.toLocaleFormat('%H:%M');
    var timeToSet = new Date(currentDate + 'T' + currentTime);
    TimeManager.set(timeToSet);
    dateLabel.innerHTML = timeToSet.toLocaleFormat('%Y-%m-%d');
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
  setTimeZone: function ui_stz() {
    var tzConfiguration = document.getElementById('timezone-configuration');
    var tzOverlay = document.getElementById('time_zone_overlay');
    var tzInput = document.getElementById('timezone-configuration');
    var tzTitle = document.getElementById('time-zone-title');
    var tzLabel = document.getElementById('timezone-configuration-label');

    var gmt = tzInput.options[tzInput.selectedIndex].value;

    var classes = tzOverlay.classList;
    for (var i = 0; i < classes.length; i++) {
      tzOverlay.classList.remove(classes[i]);
    }
    tzOverlay.classList.add('gmt' + gmt);

    // TODO Include automatic set of time
    // https://bugzilla.mozilla.org/show_bug.cgi?id=796265
    tzLabel.innerHTML = TimeManager.getTimeZone(gmt);
    tzTitle.innerHTML = TimeManager.getTimeZone(gmt);
  },
  unlockSIM: function ui_us() {
    var pinInput = document.getElementById('sim-pin');
    var pin = pinInput.value;
    if (pin === '')
      return;
    pinInput.value = '';

    // Unlock SIM
    var options = {lockType: 'pin', pin: pin };
    var conn = window.navigator.mozMobileConnection;
    var req = conn.unlockCardLock(options);
    req.onsuccess = function sp_unlockSuccess() {
      UIManager.pincodeScreen.classList.remove('show');
      UIManager.activationScreen.classList.add('show');
      window.location.hash = '#languages';

    };
    req.onerror = function sp_unlockError() {
      var retry = (req.result && req.result.retryCount) ?
        parseInt(req.result.retryCount, 10) : -1;
      document.getElementById('pin_error').innerHTML = 'Error ' + retry;
    };
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
        if (network.connected) {
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
        networksDOM.appendChild(li);
      }
    }
  },
  renderNetworkConfiguration: function uim_rnc(ssid, callback) {
    if (callback) {
      callback();
    }
  },
  updateNetworkStatus: function uim_uns(ssid, status) {
    document.getElementById(ssid).
      querySelector('p:last-child').innerHTML = status;
  },
  updateDataConnectionStatus: function uim_udcs(status) {
    this.dataConnectionSwitch.checked = status;
  }
};
