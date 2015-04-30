/* global TVSource, TVChannel */

'use strict';

/**
 * This mock service contains 15 mock channels, and set random delay in
 * setCurrentChannel function in TVChannel constructor. Our original Gecko
 * mock service only has 2 channels, and have no delay in setCuurentChannel,
 * which is insufficient to test and build a prototype.
 */
(function(exports) {
  var channels = [];
  var channelInfo = [
    {
      name: 'HBO',
      number: '1'
    }, {
      name: 'TVBS',
      number: '2'
    }, {
      name: 'Discovery',
      number: '3'
    }, {
      name: 'Fox',
      number: '25'
    }, {
      name: 'ABC',
      number: '8'
    }, {
      name: 'CNN',
      number: '9'
    }, {
      name: 'AXS TV',
      number: '10'
    }, {
      name: 'MTV',
      number: '15'
    }, {
      name: 'TNT',
      number: '10-2'
    }, {
      name: 'Disney',
      number: '13'
    }, {
      name: 'Oxygen',
      number: '14'
    }, {
      name: 'Lifetime',
      number: '10-1'
    }, {
      name: 'AXN',
      number: '19'
    }, {
      name: 'ESON',
      number: '20'
    }, {
      name: 'Mozilla',
      number: '5'
    }
  ];

  var randomDelay = ['400', '600', '800'];

  var proto = {};

  window.TVChannel = function() {
  };

  TVChannel.prototype = proto;

  for(var i = 0; i < channelInfo.length; i++) {
    var channel = new TVChannel();
    channel.name = channelInfo[i].name;
    channel.number = channelInfo[i].number;
    channels.push(channel);
  }

  TVSource.prototype.getChannels = function() {
    return {
      then: function(success) {
        setTimeout(function() {
          success(channels);
        }, 2000);
      }
    };
  };

  TVSource.prototype.setCurrentChannel = function() {
    var duration = randomDelay[Math.floor(Math.random() * 3)];
    var resolve;
    setTimeout(function() {
      if (resolve) {
        resolve();
      }
    }, duration);

    return {
      then: function(success) {
        resolve = success;
      }
    };
  };
})(window);
