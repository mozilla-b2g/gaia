requireApp('costcontrol/test/unit/mock_all_network_interfaces.js');

var MockMozNetworkStats = (function() {
  var result1 = {
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

  var result2 = {
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

  function MockGetSamples(config) {
    this.init(config || {});
  }

  MockGetSamples.prototype = {
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
    clearAllStats: {},
    clearStats: function clearStats(networkInterface) {
      return new MockGetSamples({
        error: result1
      });
    },
    getSamples: function getSamples(networkInterface, start, end, url) {
      if (networkInterface.type === 0) {
        return new MockGetSamples({
          result: result1
        });
      }
      return new MockGetSamples({
        result: result2
      });
    },
    getAvailableNetworks: function getAvailableNetworks() {
      return new MockGetSamples({
        result: MockAllNetworkInterfaces
      });
    }
  };
}());
