!function() {
  function debug(str) {
    //dump('wifi: ' + str + '\n');
  }

  /**
   * fake network list, where each network object looks like:
   * {
   *   ssid              : SSID string (human-readable name)
   *   bssid             : network identifier string
   *   security          : array of strings (supported authentication methods)
   *   relSignalStrength : 0-100 signal level (integer)
   *   connected         : boolean state
   * }
   */

  var fakeNetworks = [
    {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      security: ['WPA-EAP'],
      relSignalStrength: 67,
      connected: false
    },
    {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      security: ['WEP'],
      relSignalStrength: 32,
      connected: false
    },
    {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      security: [],
      relSignalStrength: 98,
      connected: false
    },
    {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      security: ['WPA2-PSK'],
      relSignalStrength: 89,
      connected: false
    }
  ];

  FFOS_RUNTIME.makeNavigatorShim('mozWifiManager', {
    enabled: true,
    macAddress: 'xx:xx:xx:xx:xx:xx',

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
        if (bool) {
          self.onenabled();
        } else {
          self.ondisabled();
        }
      });

      self.enabled = bool;
      return request;
    },

    // returns a list of visible/known networks
    getNetworks: FFOS_RUNTIME.domRequest(fakeNetworks),
    getKnownNetworks: FFOS_RUNTIME.domRequest(fakeNetworks),

    // selects a network
    associate: function fakeAssociate(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function fakeConnecting() {
        self.connection.network = network;
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function fakeAssociated() {
        self.connection.network = network;
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function fakeConnected() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // forgets a network (disconnect)
    forget: function fakeForget(network) {
      var self = this;
      var networkEvent = { network: network };

      setTimeout(function() {
        network.connected = false;
        self.connected = null;
        self.connection.network = null;
        self.connection.status = 'disconnected';
        self.onstatuschange(networkEvent);
      }, 0);
    },

    // event listeners
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onstatuschange: function(event) {},

    // returns a network object for the currently connected network (if any)
    connected: null,

    connection: {
      status: 'disconnected',
      network: null
    }
  }, true);
}();
