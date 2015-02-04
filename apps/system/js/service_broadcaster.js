/* global BaseModule, BroadcastChannel */
'use strict';

(function() {
  var ServiceBroadcaster = function() {};
  ServiceBroadcaster.EVENTS = [];
  BaseModule.create(ServiceBroadcaster, {
    name: 'ServiceBroadcaster',
    DEBUG: true,
    _start: function() {
      var channelList = ['fxa'];
      this.channels = channelList.map(function(name) {
        var channel = new BroadcastChannel(name);
        channel.addEventListener('message', this);
        return channel;
      }, this);
    },
    _handle_message: function(message) {
      var module = message.data[0].split(':')[0];
      this.debug(module, message);
      BaseModule.lazyLoad([module]).then(() => {
        this.debug('requesting...');
        this.service.request.apply(this.service, message.data);
      });
    }
  });
}());
