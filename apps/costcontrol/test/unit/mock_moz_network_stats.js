/* global MockAllNetworkInterfaces */
/* exported MockMozNetworkStats */
'use strict';

var MockMozNetworkStats;

requireApp('costcontrol/test/unit/mock_all_network_interfaces.js', function() {

  MockMozNetworkStats = (function() {
    var system_manifest = 'app://system.gaiamobile.org/manifest.webapp';
    var samples1 = {
      'manifestURL': null,
      'network': {'type': 0, 'id': '0'},
      'start': {'__date__': '2013-11-14T05:00:00.000Z'},
      'end': {'__date__': '2013-11-30T05:00:00.000Z'},
      'data': [
        {'rxBytes': 1130089, 'txBytes': 54931883,
          'date': {'__date__': '2013-11-14T05:00:00.000Z'}},
        {'rxBytes': 1130089, 'txBytes': 54931883,
          'date': {'__date__': '2013-11-15T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-16T05:00:00.000Z'}}
      ]
    };

    var samples2 = {
      'manifestURL': null,
      'network': {'type': 1, 'id': '8100075100210526976'},
      'start': {'__date__': '2013-11-14T05:00:00.000Z'},
      'end': {'__date__': '2013-11-30T05:00:00.000Z'},
      'data': [
        {'rxBytes': 3454523454, 'txBytes': 111111,
          'date': {'__date__': '2013-11-14T05:00:00.000Z'}},
        {'rxBytes': 1345345089, 'txBytes': 563483,
          'date': {'__date__': '2013-11-15T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-16T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-17T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-18T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-19T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-20T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-21T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-22T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-23T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-24T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-25T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-26T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-27T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-28T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-29T05:00:00.000Z'}},
        {'date': {'__date__': '2013-11-30T05:00:00.000Z'}}
      ]
    };

    var APP_MANIFEST_1 = 'manifest_url_1';
    var APP_MANIFEST_2 = 'manifest_url_2';
    var appSamples = {
      'manifest_url_1': {
        'appManifestURL': APP_MANIFEST_1,
        'network': {'type': 1, 'id': '45678'},
        'start': {'__date__': '2014-08-14T05:00:00.000Z'},
        'end': {'__date__': '2014-08-31T05:00:00.000Z'},
        'data': [
          {'rxBytes': 123, 'txBytes': 234,
           'date': {'__date__': '2014-08-14T05:00:00.000Z'}},
          {'rxBytes': 234, 'txBytes': 456,
           'date': {'__date__': '2014-08-15T05:00:00.000Z'}},
        ]
      },
      'manifest_url_2': {
        'appManifestURL': APP_MANIFEST_2,
        'network': {'type': 1, 'id': '45678'},
        'start': {'__date__': '2014-08-14T05:00:00.000Z'},
        'end': {'__date__': '2014-08-31T05:00:00.000Z'},
        'data': [
          {'rxBytes': 456, 'txBytes': 567,
           'date': {'__date__': '2014-08-14T05:00:00.000Z'}},
          {'rxBytes': 567, 'txBytes': 678,
           'date': {'__date__': '2014-08-15T05:00:00.000Z'}},
        ]
      },
      'app://system.gaiamobile.org/manifest.webapp': {
        browsingTrafficOnly: true,
        'appManifestURL': system_manifest,
        'network': {'type': 1, 'id': '45678'},
        'start': {'__date__': '2014-08-14T05:00:00.000Z'},
        'end': {'__date__': '2014-08-31T05:00:00.000Z'},
        'data': [
          {'rxBytes': 121, 'txBytes': 111,
           'date': {'__date__': '2014-08-14T05:00:00.000Z'}},
          {'rxBytes': 141, 'txBytes': 222,
           'date': {'__date__': '2014-08-15T05:00:00.000Z'}},
        ]
      }
    };

    var allInterfacesFake = MockAllNetworkInterfaces;

    var FAILING_ALARM_ID = 99;

    var alarms1 = [{
      'alarmId' : 1,
      'network' : {'type' : 1, 'id' : allInterfacesFake[1] }
    }];

    var alarms2 = [{
      'alarmId' : FAILING_ALARM_ID,
      'network' : {'type' : 1, 'id' : allInterfacesFake[2] }
    }];

    function MockFakeRequest(config) {
      this.init(config || {});
    }

    MockFakeRequest.prototype = {
      init: function mgs_init(config) {
        setTimeout((function() {
          this.call(config.error, config.result);
        }).bind(this), 0);
      },

      call: function mgs_call(error, result) {
        if (!error) {
          this.result = result;
          this.onsuccess && this.onsuccess();
        } else {
          this.onerror && this.onerror();
        }
      }
    };

    return {
      sampleRate: 86400000,
      maxStorageSamples: 15552000000,
      WIFI: 0,
      MOBILE: 1,
      APP_MANIFEST_1: 'manifest_url_1',
      APP_MANIFEST_2: 'manifest_url_2',
      clearAllStats: {},
      clearStats: function clearStats(networkInterface) {
        return new MockFakeRequest({
          error: samples1
        });
      },
      getSamples: function getSamples(networkInterface, start, end, options) {
        if (networkInterface.type === 0) {
          return new MockFakeRequest({
            result: samples1
          });
        }

        if (options && options.appManifestURL in appSamples) {
          return new MockFakeRequest({
            result: appSamples[options.appManifestURL]
          });
        }

        return new MockFakeRequest({
          result: samples2
        });
      },
      getAvailableNetworks: function getAvailableNetworks() {
        return new MockFakeRequest({
          result: allInterfacesFake
        });
      },
      removeAlarms: function(alarmId) {
        var result = { result: {} };
        if (alarmId === FAILING_ALARM_ID) {
          result = { error: {} };
        }
        return new MockFakeRequest(result);
      },
      addAlarm: function(networkInterface, limitValue) {
        var result = { result: {} };
        if (networkInterface === allInterfacesFake[3]) {
          result = { error: {} };
        }
        return new MockFakeRequest(result);
      },
      getAllAlarms: function(networkInterface) {
        if (networkInterface === allInterfacesFake[2]) {
          return new MockFakeRequest({
            result: alarms2
          });
        }
        return new MockFakeRequest({
          result: alarms1
        });
      }
    };
  }());
});
