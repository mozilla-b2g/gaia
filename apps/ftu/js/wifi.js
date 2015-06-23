/* global utils, UIManager, WifiHelper, WifiUI:true */
/* exported WifiManager, WifiUI */
'use strict';

var WifiManager = {
  init: function wn_init() {
    this.api = WifiHelper.getWifiManager();
    this.changeStatus();
    // Ensure that wifi is on.
    if (navigator.mozSettings) {
      var lock = window.navigator.mozSettings.createLock();
      this.enable(lock);
      this.enableDebugging(lock);
    }

    this.gCurrentNetwork = this.api ? this.api.connection.network : null;

    if (this.gCurrentNetwork !== null) {
      this.api.forget(this.gCurrentNetwork);
      this.gCurrentNetwork = null;
    }
  },

  getNetworks: function wn_getNetworks(callback) {
    this.networks ? callback(this.networks) : this.scan(callback);
  },

  scan: function wn_scan(callback) {
    if (this._scanning) {
      return;
    }
    this._scanning = true;
    utils.overlay.show('scanningNetworks', 'spinner');
    var SCAN_TIMEOUT = 10000;

    var self = this;
    self.onScan = callback;

    var req = this.api ? this.api.getNetworks() : null;
    if (!req) {
      // When no wifi API is available (ie. shimless B2G-desktop),
      // we will yield to the event loop before calling the callback
      // to prevent a race condition with the wifi overlay.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=957769#c5
      setTimeout(function() {
        self._scanning = false;
        callback();
      });
      return;
    }

    var handleRequest = function handleRequest() {
      self._scanning = false;
      clearTimeout(self.scanTimeout);
      self.scanTimeout = null;
      self.onScan(self.networks);
      self.onScan = null;
    };

    req.onsuccess = function onScanSuccess() {
      self.networks = req.result;
      handleRequest();
    };

    req.onerror = function onScanError() {
      console.error('Error reading networks: ' + req.error.name);
      self.networks = [];
      handleRequest();
    };

    // Timeout in case of scanning errors not thrown by the API
    // We can't block the user in the screen (bug 889623)
    if (!self.scanTimeout) {
      self.scanTimeout = setTimeout(function() {
        self._scanning = false;
        console.warn('Timeout while reading networks');
        self.onScan();
      }, SCAN_TIMEOUT);
    }
  },

  enable: function wn_enable(lock) {
    lock.set({'wifi.enabled': true});
  },

  enableDebugging: function wn_enableDebugging(lock) {
    // For bug 819947: turn on wifi debugging output to help track down a bug
    // in wifi. We turn on wifi output only while the FTU app is active.
    this._prevDebuggingValue = false;
    var req = lock.get('wifi.debugging.enabled');
    req.onsuccess = function wn_getDebuggingSuccess() {
      this._prevDebuggingValue = req.result['wifi.debugging.enabled'];
    };
    lock.set({ 'wifi.debugging.enabled': true });
  },

  finish: function wn_finish() {
    if (!this._prevDebuggingValue && navigator.mozSettings) {
      var resetLock = window.navigator.mozSettings.createLock();
      resetLock.set({'wifi.debugging.enabled': false});
    }
  },

  getNetwork: function wm_gn(ssid) {
    var list = this.networks;
    for (var i = 0; i < list.length; i++) {
      if (list[i].ssid === ssid) {
        return list[i];
      }
    }

    return null;
  },

  connect: function wn_connect(ssid, password, user) {
    var network = this.getNetwork(ssid);
    if (!network) {
      console.error('Network not found');
      return;
    }
    this.ssid = ssid;
    // TODO: Hardcoded for resolving bug 1019146, replace hardcoded eap
    //       method with user selected eap method after bug 1036829.
    WifiHelper.setPassword(network, password, user, 'PEAP');
    this.gCurrentNetwork = network;
    this.api.associate(network);
  },

  changeStatus: function wn_cs(callback) {
    /**
       * mozWifiManager status
       * see dom/wifi/nsIWifi.idl -- the 4 possible statuses are:
       *  - connecting:
       *        fires when we start the process of connecting to a network.
       *  - associated:
       *        fires when we have connected to an access point but do not yet
       *        have an IP address.
       *  - connected:
       *        fires once we are fully connected to an access point.
       *  - connectingfailed:
       *        fires when we fail to connect to an access point.
       *  - disconnected:
       *        fires when we were connected to a network but have been
       *        disconnected.
    */
    var self = this;
    if (WifiManager.api) {
      WifiManager.api.onstatuschange = function(event) {
        if (event.status === 'disconnected' && self.onScan) {
          self.scan(self.onScan);
        } else {
          WifiUI.updateNetworkStatus(event.network.ssid, event.status);
        }
      };
    }
  }
};

var WifiUI = {
  joinNetwork: function wui_jn() {
    var password = document.getElementById('wifi_password').value;
    var user = document.getElementById('wifi_user').value;
    var ssid = document.getElementById('wifi_ssid').value;
    WifiUI.connect(ssid, password, user);
    window.history.back();
  },

  joinHiddenNetwork: function wui_jhn() {
    var password = UIManager.hiddenWifiPassword.value;
    var user = UIManager.hiddenWifiIdentity.value;
    var ssid = UIManager.hiddenWifiSsid.value;
    var security = UIManager.hiddenWifiSecurity.value;
    var network;

    if (ssid.length) {
      if (!Array.isArray(WifiManager.networks)) {
        WifiManager.networks = [];
      }
      network = new window.MozWifiNetwork({
        ssid: ssid,
        capabilities: [],
        security: [security],
        relSignalStrength: 0,
        hidden: true
      });
      WifiManager.networks.push(network);
      this.renderNetworks(WifiManager.networks);
      WifiUI.connect(ssid, password, user);
    }

    // like in Settings: if we don't provide correct
    // network data it just get back to the wifi screen
    window.history.back();
  },

  connect: function wui_connect(ssid, password, user) {
    // First we check if there is a previous selected network
    // and we remove their status
    var networkSelected = document.querySelector('li[data-wifi-selected]');
    if (networkSelected) {
      var icon = networkSelected.querySelector('aside');
      networkSelected.removeAttribute('data-wifi-selected');
      networkSelected.classList.remove('connected');
      icon.classList.remove('connecting');
      icon.classList.remove('connected');

      var security = networkSelected.dataset.security;
      var securityLevelDOM =
        networkSelected.querySelectorAll('p[data-security-level]')[0];
      if (!security || security === '') {
        securityLevelDOM.setAttribute('data-l10n-id', 'securityOpen');
      } else {
        securityLevelDOM.setAttribute('data-l10n-id', security);
      }
    }

    // And then end we update the selected network
    var newWifi = document.getElementById(ssid);
    // We should update the state to 'connecting' in here to show the change
    // to the user, instead of waiting for the api (takes longer). But currently
    // there's no feedback from the api when connecting to a hidden wifi fails
    // so we skip the visual changes
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1107431#c25
    newWifi.setAttribute('data-wifi-selected', true);

    // Finally we try to connect to the network
    WifiManager.connect(ssid, password, user);
  },

  chooseNetwork: function wui_cn(event) {
    // Retrieve SSID from dataset
    var ssid = event.target.dataset.ssid;
    var selectedNetwork = WifiManager.getNetwork(ssid);
    if (!selectedNetwork) {
      console.error('Network not found');
      return;
    }

    // Do we need to type password?
    if (WifiHelper.isOpen(selectedNetwork)) {
      WifiUI.connect(ssid);
      return;
    }

    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.textContent = ssid;

    // Update network values
    var ssidHeader = document.getElementById('wifi_ssid');
    var userInput = document.getElementById('wifi_user');
    var passwordInput = document.getElementById('wifi_password');
    var showPassword = document.querySelector(
      'gaia-checkbox[name=show_password]');
    var joinButton = UIManager.wifiJoinButton;

    joinButton.disabled = true;
    passwordInput.addEventListener('input', function validatePassword() {
      // disable the "Join" button if the password is on wrong format
      joinButton.disabled =
        !WifiHelper.isValidInput(WifiHelper.getKeyManagement(selectedNetwork),
          passwordInput.value, userInput.value);
    });

    // Show / Hide password
    passwordInput.type = 'password';
    passwordInput.value = '';
    showPassword.checked = false;
    showPassword.addEventListener('change', e => {
      passwordInput.type = e.target.checked ? 'text' : 'password';
    });

    // Update form
    passwordInput.value = '';
    ssidHeader.value = ssid;

    // Activate secondary menu
    UIManager.navBar.classList.add('secondary-menu');
    // Update changes in form
    if (WifiHelper.isEap(selectedNetwork)) {
      userInput.parentNode.classList.remove('hidden');
    } else {
      userInput.parentNode.classList.add('hidden');
    }

    // Change hash
    window.location.hash = '#configure_network';
  },

  addHiddenNetwork: function wui_addHiddenNetwork() {
    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.setAttribute('data-l10n-id', 'authentication');
    UIManager.navBar.classList.add('secondary-menu');
    // Clean input contents
    UIManager.hiddenWifiSsid.value = '';
    UIManager.hiddenWifiPassword.value = '';
    UIManager.hiddenWifiIdentity.value = '';
    // Reset join button state
    UIManager.wifiJoinButton.disabled = true;
    window.location.hash = '#hidden-wifi-authentication';
  },

  handleHiddenWifiSecurity: function wui_handleSecurity(securityType) {
    // no need for password if network is open
    if (securityType === '') {
      UIManager.hiddenWifiPasswordBox.classList.add('hidden');
    } else {
      UIManager.hiddenWifiPasswordBox.classList.remove('hidden');
    }

    // need of username is security is WPA-EAP
    if (securityType.indexOf('EAP') !== -1) {
      UIManager.hiddenWifiIdentityBox.classList.remove('hidden');
    } else {
      UIManager.hiddenWifiIdentityBox.classList.add('hidden');
    }
  },

  renderNetworks: function wui_rn(networks) {
    var networksDOM = document.getElementById('networks');
    networksDOM.innerHTML = '';
    var networksList;

    if (!networks || networks.length === 0) {
      var noResult = '<div id="no-result-container">' +
                     '  <div id="no-result-message">' +
                     '    <p data-l10n-id="noWifiFound3"></p>' +
                     '  </div>' +
                     '</div>';
      networksDOM.innerHTML = noResult;
    } else {
      networksList = document.createElement('ul');
      networksList.id = 'networks-list';
      networksList.setAttribute('role', 'listbox');
      networksList.setAttribute('data-l10n-id', 'networksList');
      var networksShown = [];
      networks.sort(function(a, b) {
        return b.relSignalStrength - a.relSignalStrength;
      });
      // Add detected networks
      for (var i = 0, max = networks.length; i < max; i++) {
        // Retrieve the network
        var network = networks[i];
        // Check if is shown
        if (networksShown.indexOf(network.ssid) === -1) {
          // Create dom elements
          var li = document.createElement('li');
          var icon = document.createElement('aside');
          var ssidp = document.createElement('p');
          ssidp.setAttribute('dir', 'auto');
          var small = document.createElement('p');

          small.dataset.securityLevel = true;

          // Set Icon
          icon.classList.add('pack-end');
          icon.classList.add('wifi-icon');
          var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
          icon.classList.add('level-' + level);
          navigator.mozL10n.setAttributes(icon, 'wifiLevel', {level: level});
          icon.setAttribute('role', 'presentation');
          // Set SSID
          ssidp.textContent = network.ssid;
          li.dataset.ssid = network.ssid;
          // Show authentication method
          var keys = WifiHelper.getSecurity(network);

          li.dataset.security = keys;
          if (!WifiHelper.isOpen(network)) {
            small.textContent = keys.join(', ');
            icon.classList.add('secured');
          } else {
            small.setAttribute('data-l10n-id', 'securityOpen');
          }
          // Show connection status
          icon.classList.add('wifi-signal');
          if (WifiHelper.isConnected(network)) {
            small.setAttribute('data-l10n-id', 'shortStatus-connected');
            small.removeAttribute('aria-label');
            icon.classList.add('connected');
            li.classList.add('connected');
            li.dataset.wifiSelected = true;
          }

          // Update list of shown netwoks
          networksShown.push(network.ssid);
          // Append the elements to li
          li.setAttribute('id', network.ssid);
          li.setAttribute('role', 'option');
          li.setAttribute('aria-live', true);
          li.setAttribute('aria-relevant', 'text');
          li.appendChild(ssidp);
          li.appendChild(small);
          li.appendChild(icon);
          // Append to DOM
          if (WifiHelper.isConnected(network)) {
            networksList.insertBefore(li, networksList.firstChild);
          } else {
            networksList.appendChild(li);
          }
        }
      }
      networksList.dataset.type = 'list';
      networksDOM.appendChild(networksList);
    }
    utils.overlay.hide();
  },

  updateNetworkStatus: function wui_uns(ssid, status) {
    var element = document.getElementById(ssid);
    // Check if element exists and it's the selected network
    if (!element) {
      return;
    }
    // Update the element
    if (status !== 'disconnected') {
      element.querySelector('p[data-security-level]').setAttribute(
                          'data-l10n-id', 'shortStatus-' + status);
    } else {
      var security = element.dataset.security || 'Open';

      element.querySelector('p[data-security-level]').setAttribute(
                          'data-l10n-id', 'security' + security);
      element.classList.remove('connected');
    }

    // Animate icon if connecting, stop animation if
    // failed/connected/disconnected
    var icon = element.querySelector('aside');
    if (status === 'connecting' || status === 'associated') {
      icon.classList.add('connecting');
    } else {
      icon.classList.remove('connecting');
      if (status === 'connected') {
        var networksList = document.getElementById('networks-list');
        icon.classList.add('connected');
        element.classList.add('connected');
        networksList.removeChild(element);
        networksList.insertBefore(element, networksList.firstChild);
      }
    }
  }
};
