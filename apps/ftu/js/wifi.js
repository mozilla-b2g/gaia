/* global utils,
          UIManager,
          WifiHelper,
          SimManager */
/* exported WifiManager, WifiUI */
'use strict';

var _;

var WifiManager = {
  init: function wn_init() {
    _ = navigator.mozL10n.get;
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

  scan: function wn_scan(callback) {
    if (this._scanning) {
      return;
    }
    this._scanning = true;
    utils.overlay.show(_('scanningNetworks'), 'spinner');
    var scanTimeout;
    var SCAN_TIMEOUT = 10000;

    var self = this;

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

    req.onsuccess = function onScanSuccess() {
      self._scanning = false;
      self.networks = req.result;
      clearTimeout(scanTimeout);
      callback(self.networks);
    };

    req.onerror = function onScanError() {
      self._scanning = false;
      console.error('Error reading networks: ' + req.error.name);
      clearTimeout(scanTimeout);
      callback();
    };

    // Timeout in case of scanning errors not thrown by the API
    // We can't block the user in the screen (bug 889623)
    scanTimeout = setTimeout(function() {
      self._scanning = false;
      console.warn('Timeout while reading networks');
      callback();
    }, SCAN_TIMEOUT);
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
    var network;
    for (var i = 0; i < this.networks.length; i++) {
      if (this.networks[i].ssid == ssid) {
        network = this.networks[i];
        break;
      }
    }
    return network;
  },

  connect: function wn_connect(ssid, password, user, eap, phase2, certificate) {
    var network = this.getNetwork(ssid);
    this.ssid = ssid;
    WifiHelper.setPassword(network, password, user, eap, phase2, certificate);
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
        WifiUI.updateNetworkStatus(self.ssid, event.status);
        if (event.status === 'connected') {
          if (self.networks && self.networks.length) {
            WifiUI.renderNetworks(self.networks);
          }
        }
      };
    }
  },

  // Return the names of all the imported certificates
  getCertificateNames: function wm_getImportedCertificates() {
    var request = this.api.getImportedCerts();

    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result.ServerCert);
      };
    });
  }
};

var WifiUI = {

  joinNetwork: function wui_jn() {
    var password = UIManager.wifiPassword.value;
    var user = UIManager.wifiUser.value;
    var ssid = UIManager.wifiSsid.value;
    var eap = UIManager.wifiEapMethod.value;
    var phase2 = UIManager.wifiPhase2Authentication.value;
    var certificate = UIManager.wifiServerCertificate.value;

    WifiUI.connect(ssid, password, user, eap, phase2, certificate);
    window.history.back();
  },

  joinHiddenNetwork: function wui_jhn() {
    var password = UIManager.hiddenWifiPassword.value;
    var user = UIManager.hiddenWifiIdentity.value;
    var ssid = UIManager.hiddenWifiSsid.value;
    var security = UIManager.hiddenWifiSecurity.value;
    var eap = UIManager.hiddenWifiEapMethod.value;
    var phase2 = UIManager.hiddenWifiPhase2Authentication.value;
    var certificate = UIManager.hiddenWifiServerCertificate.value;

    if (ssid.length) {
      if (!Array.isArray(WifiManager.networks)) {
        WifiManager.networks = [];
      }

      WifiManager.networks.push({
          ssid: ssid,
          capabilities: [security],
          relSignalStrength: 0
      });
      this.renderNetworks(WifiManager.networks);
      WifiUI.connect(ssid, password, user, eap, phase2, certificate);
    }

    // like in Settings: if we don't provide correct
    // network data it just get back to the wifi screen
    window.history.back();
  },

  connect:
    function wui_connect(ssid, password, user, eap, phase2, certificate) {

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
        securityLevelDOM.textContent = _('securityOpen');
      } else {
        securityLevelDOM.textContent = security;
      }
    }

    // And then end we update the selected network
    var newWifi = document.getElementById(ssid);
    newWifi.dataset.wifiSelected = true;
    newWifi.querySelector('p[data-security-level]').textContent =
                                                    _('shortStatus-connecting');
    newWifi.querySelector('aside').classList.add('connecting');


    // Finally we try to connect to the network
    WifiManager.connect(ssid, password, user, eap, phase2, certificate);
  },

  chooseNetwork: function wui_cn(event) {
    // Retrieve SSID from dataset
    var ssid = event.target.dataset.ssid;

    // Do we need to type password?
    if (WifiHelper.isOpen(WifiManager.getNetwork(ssid))) {
      WifiUI.connect(ssid);
      return;
    }

    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.textContent = ssid;

    // Update network
    var selectedNetwork = WifiManager.getNetwork(ssid);
    var isEap = WifiHelper.isEap(selectedNetwork);
    var showPassword = document.querySelector('input[name=show_password]');
    var wifiUser = UIManager.wifiUser;
    var wifiPassword = UIManager.wifiPassword;
    var joinButton = UIManager.wifiJoinButton;

    if (isEap) {
      this.renderServerCertificates(UIManager.wifiServerCertificate);
    }

    joinButton.disabled = true;
    wifiPassword.addEventListener('keyup', function validatePassword() {
      var isValidInput = WifiHelper.isValidInput(
        WifiHelper.getKeyManagement(selectedNetwork),
        wifiPassword.value,
        wifiUser.value);

      // disable the "Join" button if the password is too short
      joinButton.disabled = !isValidInput;
    });

    // Show / Hide password
    wifiPassword.type = 'password';
    wifiPassword.value = '';
    showPassword.checked = false;
    showPassword.onchange = function togglePasswordVisibility() {
      wifiPassword.type = this.checked ? 'text' : 'password';
    };

    // Update form
    UIManager.wifiSsid.value = ssid;
    wifiUser.value = '';

    // Activate secondary menu
    UIManager.navBar.classList.add('secondary-menu');

    // If there is no SIM available, switch the selected EAP method to PEAP
    if (!SimManager.simAvailable()) {
      UIManager.wifiEapMethod.querySelector('[value=PEAP]').selected = true;
    }

    // Update changes in form
    UIManager.wifiConfigureNetworkForm.classList.toggle('is-eap', isEap);

    // Change hash
    window.location.hash = '#configure_network';
  },

  addHiddenNetwork: function wui_addHiddenNetwork() {
    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.textContent = _('authentication');
    UIManager.navBar.classList.add('secondary-menu');
    this.renderServerCertificates(UIManager.hiddenWifiServerCertificate);
    window.location.hash = '#hidden-wifi-authentication';
  },

  handleHiddenWifiSecurity: function wui_handleSecurity(securityType) {
    var isEap = securityType.indexOf('EAP') !== -1;

    UIManager.hiddenWifiConfigureNetworkForm.classList
      .toggle('is-eap', isEap);
  },

  renderNetworks: function wui_rn(networks) {
    var networksDOM = document.getElementById('networks');
    networksDOM.innerHTML = '';
    var networksList;

    if (!networks || networks.length === 0) {
      var noResult = '<div id="no-result-container">' +
                     '  <div id="no-result-message">' +
                     '    <p>' + _('noWifiFound3') + '</p>' +
                     '  </div>' +
                     '</div>';
      networksDOM.innerHTML = noResult;
    } else {
      networksList = document.createElement('ul');
      networksList.id = 'networks-list';
      networksList.setAttribute('role', 'listbox');
      networksList.setAttribute('aria-label', _('networksList'));
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
          var small = document.createElement('p');

          small.dataset.securityLevel = true;

          // Set Icon
          icon.classList.add('pack-end');
          icon.classList.add('wifi-icon');
          var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
          icon.classList.add('level-' + level);
          icon.setAttribute('aria-label', _('wifiLevel', {level: level}));
          icon.setAttribute('role', 'presentation');
          // Set SSID
          ssidp.textContent = network.ssid;
          li.dataset.ssid = network.ssid;
          // Show authentication method
          var keys = WifiHelper.getSecurity(network);

          li.dataset.security = keys;

          if (keys && keys.length) {
            small.textContent = keys.join(', ');
            icon.classList.add('secured');
          } else {
            small.textContent = _('securityOpen');
          }
          // Show connection status
          icon.classList.add('wifi-signal');
          if (WifiHelper.isConnected(network)) {
            small.textContent = _('shortStatus-connected');
            small.removeAttribute('aria-label');
            icon.classList.add('connected');
            li.classList.add('connected');
            li.dataset.wifiSelected = true;
          } else {
            small.setAttribute('aria-label', _('security'));
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
    if (!element || !element.dataset.wifiSelected) {
      return;
    }

    // Update the element
    element.querySelector('p[data-security-level]').textContent =
                                                    _('shortStatus-' + status);

    // Animate icon if connecting, stop animation if
    // failed/connected/disconnected
    var icon = element.querySelector('aside');
    if (status === 'connecting' || status === 'associated') {
      icon.classList.add('connecting');
    } else {
      icon.classList.remove('connecting');
    }
  },

  renderServerCertificates: function wui_rsc(element) {
    // Fetch the names of all the imported certificates and insert those as
    // options into the Server Certificate select element
    WifiManager
      .getCertificateNames()
      .then(function(names) {
        if (!names.length) {
          return;
        }

        var fragment = document.createDocumentFragment();

        names.forEach(function(name) {
          var option = document.createElement('option');
          option.value = name;
          option.innerHTML = name;

          fragment.appendChild(option);
        });

        element.appendChild(fragment);
      });
  }

};

