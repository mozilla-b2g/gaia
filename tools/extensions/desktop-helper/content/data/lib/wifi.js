!function() {
  function debug(str) {
    //dump('wifi: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozWifiManager', {
    connection: {
      status: 'disconnected',
      network: null
    },
    onenabled: function() {
      debug('onenabled');
    },
    ondisabled: function() {
      debug('onenabled');
    },
    onstatuschange: function() {
      debug('onenabled');
    },
    forget: function() {
      debug('forget');
    },
    getNetworks: function() {
      debug('getNetworks');
    }
  }, true);
}();
