(function() {
  'use strict';

  if (navigator.mozNetworkStats) {
    return;
  }

  const Today = new Date();

  const NetworkInterfaceType = {
    WIFI: 0,
    MOBILE: 1
  };

  const Networks = new Map([
    ['0', {
      type: NetworkInterfaceType.WIFI,
      id: '0'
    }]
  ].concat(navigator.mozIccManager.iccIds.map((id) => [id, {
    type: NetworkInterfaceType.MOBILE,
    id: id
  }])));

  // If we run app in Mulet with the direct URL, then we won't have API for
  // navigator.mozApps.mgmt available, but if we run entire gaia in Mulet (aka
  // from HomeScreen) then this API will be provided, so it's better to not have
  // dependency on the mock navigator.mozApps.mgmt here and just hard code known
  // app manifest URLs.
  const appManifestURLs = ['app://system.gaiamobile.org/manifest.webapp'];

  function generateSample(interfaceId, manifestURL, startValueInMb) {
    return {
      appManifestURL: manifestURL,
      network: Networks.get(interfaceId),
      start: new Date('2014-08-14T05:00:00.000Z'),
      end: new Date('2014-08-31T05:00:00.000Z'),
      data: [{
        rxBytes: startValueInMb * 100000,
        txBytes: (startValueInMb + 100) * 100000,
        date: new Date(
          Today.getFullYear(),
          Today.getMonth(),
          Today.getDate() - 15
        )
      }, {
        rxBytes: startValueInMb * 200000,
        txBytes: (startValueInMb + 100) * 200000,
        date: Today
      }]
    };
  }

  const Samples = new Map([
    ['0', new Map([
      [null, generateSample('0', null, 457)],
      [appManifestURLs[0], generateSample('0', appManifestURLs[0], 457)]
    ])],
    [navigator.mozIccManager.iccIds[0], new Map([
      [null, generateSample(navigator.mozIccManager.iccIds[0], null, 257)],
      [
        appManifestURLs[0],
        generateSample(
          navigator.mozIccManager.iccIds[0],
          appManifestURLs[0],
          257
        )
      ]
    ])]
  ]);

  const Alarms = new Map();

  navigator.mozNetworkStats = {
    WIFI: NetworkInterfaceType.WIFI,

    getAvailableNetworks: function() {
      var returnResult = {};

      setTimeout(() => {
        returnResult.result = [];

        Networks.forEach((network) => {
          returnResult.result.push(network);
        });

        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult);
        }
      });

      return returnResult;
    },

    getSamples: function getSamples(networkInterface, start, end, options) {
      var networkSamples = Samples.get(networkInterface.id);
      var returnResult = {};

      setTimeout(() => {
        if (options && options.appManifestURL) {
          returnResult.result = networkSamples.get(options.appManifestURL);
        } else {
          returnResult.result = networkSamples.get(null);
        }

        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult);
        }
      });

      return returnResult;
    },

    getAllAlarms: function(interfaceId) {
      var returnResult = {};

      setTimeout(() => {
        returnResult.result = Alarms.get(interfaceId) || [];

        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult);
        }
      });

      return returnResult;
    },

    addAlarm: function(interfaceId, alarm) {
      var returnResult = {};

      setTimeout(() => {
        var interfaceAlarms = Alarms.get(interfaceId) || [];

        interfaceAlarms.push(alarm);
        Alarms.set(interfaceId, interfaceAlarms);

        if (typeof returnResult.onsuccess === 'function') {
          returnResult.onsuccess.call(returnResult);
        }
      });

      return returnResult;
    }
  };
})();
