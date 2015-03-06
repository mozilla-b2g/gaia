/* global BroadcastChannel,
          EventDispatcher
*/

/* exported InterInstanceEventDispatcher */
(function(exports) {
  'use strict';

  /**
   * Channel that is used to broadcast messages between message app instances.
   * @type {BroadCastChannel}
   */
  var channel = null;

  const BROADCAST_CHANNEL_NAME = 'messages-channel';
  const ALLOWED_EVENTS = ['drafts-changed'];

  function postMessage(name, parameters) {
    if (!channel) {
      throw new Error('Channel is not created!');
    }

    if (!name) {
      throw new Error('Name should be defined!');
    }

    channel.postMessage(parameters !== undefined ?
      { name: name, parameters: parameters } :
      { name: name }
    );
  }

  const Dispatcher = EventDispatcher.mixin({
    connect: function() {
      if (channel) {
        return;
      }

      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.addEventListener('message', onMessage);

      exports.addEventListener('unload', () => this.disconnect());
    },

    disconnect: function() {
      if (!channel) {
        return;
      }

      channel.close();
      channel.removeEventListener('message', onMessage);

      channel = null;
    }
  }, ALLOWED_EVENTS);

  // Save and override original emit method to avoid firing events in the same
  // application instance.
  const originalEmitter = Dispatcher.emit.bind(Dispatcher);

  Dispatcher.emit = function(eventName, parameters) {
    if (ALLOWED_EVENTS.indexOf(eventName) < 0) {
      throw new Error('Event "' + eventName + '" is not allowed!');
    }

    postMessage(eventName, parameters);
  };

  function onMessage(message) {
    try {
      originalEmitter(message.data.name, message.data.parameters);
    } catch (error) {
      console.error(
        'Error while emitting event "%s" with parameters "%s"',
        message.data && message.data.name,
        JSON.stringify(message.data && message.data.parameters),
        error
      );
    }
  }

  exports.InterInstanceEventDispatcher = Dispatcher;
})(window);
