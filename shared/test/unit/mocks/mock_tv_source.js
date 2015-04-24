/* global MockTVChannel */

(function(exports) {
  'use strict';

  function MockTVSource() {

    var handlers = {};

    this.channels = [];
    this.currentChannel = null;

    var channel = new MockTVChannel();
    channel.name = 'name0';
    channel.number = '0';
    this.channels.push(channel);

    channel = new MockTVChannel();
    channel.name = 'name1';
    channel.number = '1';
    this.channels.push(channel);

    channel = new MockTVChannel();
    channel.name = 'name2';
    channel.number = '2';
    this.channels.push(channel);

    channel = new MockTVChannel();
    channel.name = 'name3';
    channel.number = '3';
    this.channels.push(channel);

    channel = new MockTVChannel();
    channel.name = 'name4';
    channel.number = '4';
    this.channels.push(channel);

    this.startScanning = function() {
      var handler = handlers.scanningstatechanged;
      var name;
      for (name in handler) {
        if (handler[name]) {
          handler[name]({
            state: 'completed'
          });
        }
      }
    };

    this.getChannels = function() {
      return {
        then: function(callback) {
          callback(this.channels);
        }.bind(this)
      };
    };

    this.setCurrentChannel = function(number) {
      this.currentChannel = number;
      return {
        then: function(callback) {
          callback();
        }.bind(this)
      };
    };

    this.addEventListener = function(name, fn) {
      if (!handlers[name]) {
        handlers[name] = {};
      }
      handlers[name][fn.name] = fn;
    };

    this.removeEventListener = function(name, fn) {
      if (handlers[name]) {
        handlers[name][fn.name] = null;
      }
    };
  }

  exports.MockTVSource = MockTVSource;
}(window));
