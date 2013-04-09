!function() {
  FFOS_RUNTIME.makeNavigatorShim('mozWifiManager', {
    connection: {
      status: 'disconnected',
      network: null
    },
    onenabled: function() {
      console.log('wifi onenabled');
    },
    ondisabled: function() {
      console.log('wifi onenabled');
    },
    onstatuschange: function() {
      console.log('wifi onenabled');
    },
    forget: function() {
      console.log('wifi forget');
    },
    getNetworks: function() {
      console.log('wifi getNetworks');
    }
  }, true);
}();
