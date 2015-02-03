/* global Components, Services */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;
  var navigator = window.wrappedJSObject.navigator;

  var Today = new Date();

  var NetworkInterfaceType = {
    WIFI: 0,
    MOBILE: 1
  };

  var Networks = new Map([
    ['0', {
      type: NetworkInterfaceType.WIFI,
      id: '0'
    }]
  ].concat(navigator.mozIccManager.iccIds.map(function(id) {
    return [id, {
      type: NetworkInterfaceType.MOBILE,
      id: id
    }];
  })));

  var appManifestURLs = ['app://system.gaiamobile.org/manifest.webapp'];

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

  var Alarms = new Map();

  Object.defineProperty(navigator, 'mozNetworkStats', {
    configurable: false,
    writable: true,
    value: Components.utils.cloneInto({
      WIFI: NetworkInterfaceType.WIFI,

      getAvailableNetworks: function() {
        var returnResult = Cu.waiveXrays(Cu.cloneInto({}, window));

        window.setTimeout(function() {
          var result = [];

          Networks.forEach(function(network) {
            result.push(network);
          });

          returnResult.result = Cu.waiveXrays(Cu.cloneInto(result, window));

          if (typeof returnResult.onsuccess === 'function') {
            returnResult.onsuccess.call(returnResult);
          }
        });

        return returnResult;
      },

      getSamples: function getSamples(networkInterface, start, end, options) {
        var networkSamples = Samples.get(networkInterface.id);
        var returnResult = Cu.waiveXrays(Cu.cloneInto({}, window));

        window.setTimeout(function() {
          var samples = networkSamples.get(
            (options && options.appManifestURL) || null
          ) || { data: [] };

          returnResult.result = Cu.waiveXrays(Cu.cloneInto(
            samples, window, { cloneFunctions: true }
          ));

          if (typeof returnResult.onsuccess === 'function') {
            returnResult.onsuccess.call(returnResult);
          }
        });

        return returnResult;
      },

      getAllAlarms: function(interfaceId) {
        var returnResult = Cu.waiveXrays(Cu.cloneInto({}, window));

        window.setTimeout(function() {
          returnResult.result = Cu.waiveXrays(Cu.cloneInto(
            Alarms.get(interfaceId) || [], window
          ));

          if (typeof returnResult.onsuccess === 'function') {
            returnResult.onsuccess.call(returnResult);
          }
        });

        return returnResult;
      },

      addAlarm: function(interfaceId, alarm) {
        var returnResult = Cu.waiveXrays(Cu.cloneInto({}, window));

        window.setTimeout(() => {
          var interfaceAlarms = Alarms.get(interfaceId) || [];

          interfaceAlarms.push(alarm);
          Alarms.set(interfaceId, interfaceAlarms);

          if (typeof returnResult.onsuccess === 'function') {
            returnResult.onsuccess.call(returnResult);
          }
        });

        return returnResult;
      }
    }, window, { cloneFunctions: true })
  });
}, 'document-element-inserted', false);
