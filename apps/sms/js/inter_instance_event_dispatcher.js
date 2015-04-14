/* global BroadcastChannel,
          EventDispatcher,
          Map
*/

/* exported InterInstanceEventDispatcher */
(function(exports) {
  'use strict';

  /**
   * Channel that is used to broadcast messages between message app instances.
   * @type {BroadcastChannel}
   */
  var channel = null;
  var activeInstances = null;
  var instanceId = null;

  /**
   * Time during which instance should reply on query, otherwise it's considered
   * as dead and reference to it is removed.
   * @type {number}
   */
  const QUERY_TIMEOUT = 3000;

  const BROADCAST_CHANNEL_NAME = 'messages-channel';
  const ALLOWED_EVENTS = ['drafts-changed'];

  const SERVICE_MESSAGE_TYPE = {
    ACTIVATED: 'activated',
    DEACTIVATED: 'deactivated',
    ALIVE: 'alive'
  };

  const QUERY_TYPE = {
    REQUEST: 'request',
    RESPONSE: 'response'
  };

  const queries = new Map();

  const queryDispatcher = EventDispatcher.mixin({});

  function generateUniqueId() {
    return Date.now() + ':' + Math.random();
  }

  function ensureChannelCreated() {
    if (!channel) {
      throw new Error('Channel is not created!');
    }
  }

  function ensureNameDefined(name) {
    if (!name) {
      throw new Error('Name should be defined!');
    }
  }

  function postMessage(name, parameters) {
    ensureChannelCreated();
    ensureNameDefined(name);

    channel.postMessage(parameters !== undefined ?
      { instanceId: instanceId, name: name, parameters: parameters } :
      { instanceId: instanceId, name: name }
    );
  }

  function postQueryMessage(id, type, name, parameters) {
    ensureChannelCreated();
    ensureNameDefined(name);

    if (!id) {
      throw new Error('Query id should be defined!');
    }

    if (!type) {
      throw new Error('Query type should be defined!');
    }

    channel.postMessage(parameters !== undefined ?
      {
        instanceId: instanceId,
        queryId: id,
        type: type,
        name: name,
        parameters: parameters
      } : {
        instanceId: instanceId,
        queryId: id,
        type: type,
        name: name
      }
    );
  }

  const Dispatcher = EventDispatcher.mixin({
    connect: function() {
      if (channel) {
        return;
      }

      instanceId = generateUniqueId();

      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.addEventListener('message', onMessage);

      postMessage(SERVICE_MESSAGE_TYPE.ACTIVATED);

      activeInstances = new Set();

      exports.addEventListener('unload', () => this.disconnect());
    },

    disconnect: function() {
      if (!channel) {
        return;
      }

      activeInstances.clear();
      activeInstances = null;

      postMessage(SERVICE_MESSAGE_TYPE.DEACTIVATED);

      channel.close();
      channel.removeEventListener('message', onMessage);

      channel = null;
      instanceId = null;
    },

    query: function(name, parameters) {
      if (activeInstances.size === 0) {
        return Promise.resolve([]);
      }

      return new Promise((resolve) => {
        var queryId = generateUniqueId();
        var query = {
          timeouts: new Map(),
          resolve: resolve,
          result: []
        };

        activeInstances.forEach(function(instanceId) {
          query.timeouts.set(instanceId, setTimeout(() => onQueryMessage({
            instanceId: instanceId,
            queryId: queryId,
            type: QUERY_TYPE.RESPONSE
          }), QUERY_TIMEOUT));
        });

        queries.set(queryId, query);

        postQueryMessage(queryId, QUERY_TYPE.REQUEST, name, parameters);
      });
    },

    onQuery: function(name, handler) {
      queryDispatcher.on(name, handler);
    },

    offQuery: function(name, handler) {
      queryDispatcher.off(name, handler);
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
      // If new instance is activated, let's register it and reply back with
      // "alive" to let this instance know that we exist
      if (message.data.name === SERVICE_MESSAGE_TYPE.ACTIVATED) {
        // We know that now every instance will reply with alive, so let's
        // use that change to refresh our list of instances
        activeInstances.clear();
        activeInstances.add(message.data.instanceId);

        postMessage(SERVICE_MESSAGE_TYPE.ALIVE);
        return;
      }

      // If some instance replied that it's alive, register it
      if (message.data.name === SERVICE_MESSAGE_TYPE.ALIVE) {
        activeInstances.add(message.data.instanceId);
        return;
      }

      if (message.data.name === SERVICE_MESSAGE_TYPE.DEACTIVATED) {
        activeInstances.delete(message.data.instanceId);
        return;
      }

      if (message.data.queryId) {
        onQueryMessage(message.data);
        return;
      }

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

  function onQueryMessage(queryMessage) {
    if (queryMessage.type === QUERY_TYPE.REQUEST) {
      return queryDispatcher.emit(queryMessage.name, Object.freeze({
        parameters: queryMessage.parameters,
        postResult: (result) => postQueryMessage(
          queryMessage.queryId, QUERY_TYPE.RESPONSE, queryMessage.name, result
        )
      }));
    }

    var query = queries.get(queryMessage.queryId);

    // Unknown query, let's log and skip
    if (!query) {
      console.warn('Broadcast: unknown query id - ' + queryMessage.queryId);
      return;
    }

    // Deal with timeout
    var queryTimeout = query.timeouts.get(queryMessage.instanceId);
    if (queryTimeout) {
      clearTimeout(queryTimeout);
      query.timeouts.delete(queryMessage.instanceId);
    }

    // Aggregate response
    if (queryMessage.parameters !== undefined) {
      query.result.push(queryMessage.parameters);
    }

    // If all instances replied then return result
    if (query.timeouts.size === 0) {
      queries.delete(queryMessage.queryId);
      query.resolve(query.result);
    }
  }

  exports.InterInstanceEventDispatcher = Dispatcher;
})(window);
