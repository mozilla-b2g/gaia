'use strict';

function generateFakeData(start, end, sampleRate) {
  start = Math.floor(start.getTime() / sampleRate) * sampleRate;
  end = Math.floor(end.getTime() / sampleRate) * sampleRate;

  var diff = (end - start) / sampleRate;
  var data = [];
  for (var i = 0; i <= diff; i++) {
    data.push({ rxBytes: undefined,
                txBytes: undefined,
                date: new Date(start + sampleRate * i) });
  }

  return data;
}

var NetworkstatsProxy = (function() {
  var stats = window.navigator.mozNetworkStats;

  if (!stats.getNetworkStats) {
    // NetworkStats API 2.0
    return {
      sampleRate: stats.sampleRate,

      maxStorageSamples: stats.maxStorageAge,

      getNetworkStats: function(options) {
        var networks = stats.availableNetworks;
        var network = null;
        var types = { mobile: stats.MOBILE,
                      wifi: stats.WIFI };

        for (var i = 0; i < networks.length; i++) {
          if (types[options.connectionType] == networks[i].type) {
            network = networks[i];
            break;
          }
        }

        if (network) {
          return stats.getSamples(network, options.start, options.end);
        }

        // getSamples function of NetworkStats API 2.0 does not have fixed
        // connectionTypes 'wifi' and 'mobile', it receives the networkType
        // as an object composed by 'id' and 'type'. As current costcontrol
        // version wants to get samples for mobile type and expects a response
        // instead no mobile network is registered, but API 2.0 will return
        // 'invalid network' if using a fake one, is necessary to simulate a
        // response to make costcontrol compilant with API 2.0
        var fakeRequest = {
          onsuccess: function() {}
        };

        var self = this;
        setTimeout(function fireSuccess() {
          // Generate fake data and fire onsucces
          var fakeData = generateFakeData(options.start,
                                          options.end,
                                          self.sampleRate);

          fakeRequest.result = { connectionType: options.connectionType,
                                 start: options.start,
                                 end: options.end,
                                 data: fakeData };

          fakeRequest.onsuccess();
        }, 1000);

        return fakeRequest;
      }
    };
  }

  // NetworkStats API 1.0
  return stats;
})();
