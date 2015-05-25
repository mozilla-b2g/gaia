/* global MockTVChannel */

(function(exports) {
  'use strict';

  function MockTVSource() {

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

    this.getChannels = function() {
      var self = this;
      var promise = {
        then: function(callback) {
          callback(self.channels);
          return promise;
        },
        catch: function() {
          return promise;
        }
      };
      return promise;
    };

    this.setCurrentChannel = function(number) {
      this.currentChannel = number;
      return {
        then: function(callback) {
          callback();
        }.bind(this)
      };
    };
  }

  exports.MockTVSource = MockTVSource;
}(window));
