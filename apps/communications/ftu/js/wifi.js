'use strict';

var WifiManager = {
  init: function wn_init() {
    if ('mozWifiManager' in window.navigator) {
      this.api = window.navigator.mozWifiManager;
      this.changeStatus();
      // Ensure that wifi is on.
      var lock = window.navigator.mozSettings.createLock();
      this.enable(lock);
      this.enableDebugging(lock);

      this.gCurrentNetwork = this.api.connection.network;
      if (this.gCurrentNetwork !== null) {
        this.api.forget(this.gCurrentNetwork);
        this.gCurrentNetwork = null;
      }
    }
  },

  isConnectedTo: function wn_isConnectedTo(network) {
    /**
     * XXX the API should expose a 'connected' property on 'network',
     * and 'gWifiManager.connection.network' should be comparable to 'network'.
     * Until this is properly implemented, we just compare SSIDs and
     * capabilities to tell wether the network is already connected or not.
     */
    if (!this.api) {
      return false;
    }
    var currentNetwork = this.api.connection.network;
    if (!currentNetwork || this.api.connection.status != 'connected')
      return false;
    var key = network.ssid + '+' + network.capabilities.join('+');
    var curkey = currentNetwork.ssid + '+' +
        currentNetwork.capabilities.join('+');
    return (key == curkey);
  },

  scan: function wn_scan(callback) {
    utils.overlay.show(_('scanningNetworks'), 'spinner');
    if ('mozWifiManager' in window.navigator) {
      var req = WifiManager.api.getNetworks();
      var self = this;
      req.onsuccess = function onScanSuccess() {
        self.networks = req.result;
        callback(self.networks);
      };
      req.onerror = function onScanError() {
        console.log('Error reading networks: ' + req.error.name);
        callback();
      };
    } else {
      var fakeNetworks = [
        {
          ssid: 'Mozilla-G',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WPA-EAP'],
          relSignalStrength: 67,
          connected: false
        },
        {
          ssid: 'Livebox 6752',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WEP'],
          relSignalStrength: 32,
          connected: false
        },
        {
          ssid: 'Mozilla Guest',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: [],
          relSignalStrength: 98,
          connected: false
        },
        {
          ssid: 'Freebox 8953',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WPA2-PSK'],
          relSignalStrength: 89,
          connected: false
        }
      ];
      this.networks = fakeNetworks;
      callback(fakeNetworks);
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
    if (!this._prevDebuggingValue) {
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
  connect: function wn_connect(ssid, password, user) {
    if (!this.api) { // Desktop
      return;
    }
    var network = this.getNetwork(ssid);
    this.ssid = ssid;
    var key = this.getSecurityType(network);
    switch (key) {
      case 'WEP':
        network.wep = password;
        break;
      case 'WPA-PSK':
        network.psk = password;
        break;
      case 'WPA-EAP':
        network.password = password;
        if (user && user.length) {
          network.identity = user;
        }
        break;
      default:
        // Connect directly
        this.gCurrentNetwork = network;
        this.api.associate(network);
        return;
    }
    network.keyManagement = key;
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
    WifiManager.api.onstatuschange = function(event) {
      WifiUI.updateNetworkStatus(self.ssid, event.status);
      if (event.status === 'connected') {
        if (self.networks && self.networks.length) {
          WifiUI.renderNetworks(self.networks);
        }
      }
    };
  },

  getSecurityType: function wn_gst(network) {
    var key = network.capabilities[0];
    if (/WEP$/.test(key))
      return 'WEP';
    if (/PSK$/.test(key))
      return 'WPA-PSK';
    if (/EAP$/.test(key))
      return 'WPA-EAP';
    return false;
  },
  isUserMandatory: function wn_ium(ssid) {
    var network = this.getNetwork(ssid);
    return (this.getSecurityType(network).indexOf('EAP') != -1);
  },
  isPasswordMandatory: function wn_ipm(ssid) {
    var network = this.getNetwork(ssid);
    if (!this.getSecurityType(network)) {
      return false;
    }
    return true;
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
        securityLevelDOM.textContent = _('securityOpen');
      } else {
        securityLevelDOM.textContent = security;
      }
    }

    // And then end we update the selected network
    var newWifi = document.getElementById(ssid);
    newWifi.dataset.wifiSelected = true;
    newWifi.querySelector('p:last-child').textContent =
                                                    _('shortStatus-connecting');
    newWifi.querySelector('aside').classList.add('connecting');


    // Finally we try to connect to the network
    WifiManager.connect(ssid, password, user);
  },

  chooseNetwork: function wui_cn(event) {
    // Retrieve SSID from dataset
    var ssid = event.target.dataset.ssid;

    // Do we need to type password?
    if (!WifiManager.isPasswordMandatory(ssid)) {
      WifiUI.connect(ssid);
      return;
    }

    // Remove refresh option
    UIManager.activationScreen.classList.add('no-options');
    // Update title
    UIManager.mainTitle.textContent = ssid;

    // Update network
    var selectedNetwork = WifiManager.getNetwork(ssid);
    var ssidHeader = document.getElementById('wifi_ssid');
    var userLabel = document.getElementById('label_wifi_user');
    var userInput = document.getElementById('wifi_user');
    var passwordInput = document.getElementById('wifi_password');
    var showPassword = document.querySelector('input[name=show_password]');
    var joinButton = UIManager.wifiJoinButton;

    joinButton.disabled = true;
    passwordInput.addEventListener('keyup', function validatePassword() {
      // disable the "Join" button if the password is too short
      var disabled = false;
      switch (WifiManager.getSecurityType(selectedNetwork)) {
        case 'WPA-PSK':
          disabled = disabled || passwordInput.value.length < 8;
          break;
        case 'WPA-EAP':
          disabled = disabled || userInput.value.length < 1;
        case 'WEP':
          disabled = disabled || passwordInput.value.length < 1;
          break;
      }
      joinButton.disabled = disabled;
    });

    // Show / Hide password
    passwordInput.type = 'password';
    passwordInput.value = '';
    showPassword.checked = false;
    showPassword.onchange = function togglePasswordVisibility() {
      passwordInput.type = this.checked ? 'text' : 'password';
    };

    // Update form
    passwordInput.value = '';
    ssidHeader.value = ssid;

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
  },

  renderNetworks: function wui_rn(networks) {
    var networksDOM = document.getElementById('networks');
    networksDOM.innerHTML = '';
    var networksList;
    if (!networks) {
      var noResult = '<div id="no-result-container">' +
                     '  <div id="no-result-message">' +
                     '    <p>' + _('noWifiFound2') + '</p>' +
                     '  </div>' +
                     '</div>';
      networksDOM.innerHTML = noResult;
    } else {
      networksList = document.createElement('ul');
      networksList.id = 'networks-list';
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
          // Set SSID
          ssidp.textContent = network.ssid;
          li.dataset.ssid = network.ssid;
          // Show authentication method
          var keys = network.capabilities;

          li.dataset.security = keys;

          if (keys && keys.length) {
            small.textContent = keys.join(', ');
            icon.classList.add('secured');
          } else {
            small.textContent = _('securityOpen');
          }
          // Show connection status
          icon.classList.add('wifi-signal');
          if (WifiManager.isConnectedTo(network)) {
            small.textContent = _('shortStatus-connected');
            icon.classList.add('connected');
            li.classList.add('connected');
            li.dataset.wifiSelected = true;
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
    element.querySelector('p:last-child').textContent =
                                                    _('shortStatus-' + status);

    // Animate icon if connecting, stop animation if
    // failed/connected/disconnected
    var icon = element.querySelector('aside');
    if (status === 'connecting' || status === 'associated') {
      icon.classList.add('connecting');
    } else {
      icon.classList.remove('connecting');
    }
  }

};

