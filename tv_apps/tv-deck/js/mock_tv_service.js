/* global TVSource, TVChannel */

'use strict';

/**
 * This mock service contains 15 mock channels, and set random delay in
 * setCurrentChannel function in TVChannel constructor. Our original Gecko
 * mock service only has 2 channels, and have no delay in setCuurentChannel,
 * which is insufficient to test and build a prototype.
 */
(function(exports) {

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
      number: '5'
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
      number: '10-1'
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
      number: '15'
    }, {
      name: 'AXN',
      number: '19'
    }, {
      name: 'ESON',
      number: '20'
    }, {
      name: 'Mozilla',
      number: '25'
    }
  ];

  var channels = [];
  var randomDelay = ['400', '600', '800'];

  window.TVChannel = function() {
  };

  for(var i = 0; i < channelInfo.length; i++) {
    var channel = new TVChannel();
    channel.name = channelInfo[i].name;
    channel.number = channelInfo[i].number;
    channels.push(channel);
  }

  // Delete native property in order to override it
  delete TVSource.prototype.currentChannel;
  TVSource.prototype.getChannels = function() {
    var lastChannel;
    var lastChannelNumber = localStorage.getItem('_Mock-Channel-Number');
    channels.some(function(channel) {
      if (channel.number === lastChannelNumber) {
        lastChannel = channel;
        return true;
      }
      return false;
    }.bind(this));
    this.currentChannel = lastChannel;
    return {
      then: function(success) {
        setTimeout(function() {
          success(channels);
        }, 500);
      }
    };
  };

  TVSource.prototype.setCurrentChannel = function(channelNumber) {
    var duration = randomDelay[Math.floor(Math.random() * 3)];
    var resolve;
    if (this._lastTimeoutId) {
      clearTimeout(this._lastTimeoutId);
    }
    this._lastTimeoutId = setTimeout(function() {
      this.currentChannel = channels[channelNumber];
      localStorage.setItem('_Mock-Channel-Number', channelNumber);
      if (resolve) {
        resolve();
      }
    }.bind(this), duration);

    return {
      then: function(success) {
        resolve = success;
      }
    };
  };
})(window);
