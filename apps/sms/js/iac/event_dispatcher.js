/* global EventDispatcher,
          Map
*/

/* exported InterInstanceEventDispatcher */
(function(exports) {
  'use strict';

  var worker = null;

  const ALLOWED_EVENTS = ['drafts-changed'];

  const queries = new Map();

  const queryDispatcher = EventDispatcher.mixin({});

  function ensureConnectedWorker() {
    if (!worker) {
      throw new Error('Worker is not connected!');
    }
  }

  function postMessage(name, parameters) {
    ensureConnectedWorker();

    if (!name) {
      throw new Error('Name should be defined!');
    }

    worker.port.postMessage(parameters !== undefined ?
      { name: name, parameters: parameters } :
      { name: name }
    );
  }

  function postQueryMessage(queryId, name, parameters) {
    ensureConnectedWorker();

    if (!queryId) {
      throw new Error('Query Id should be defined!');
    }

    worker.port.postMessage(parameters !== undefined ?
      { queryId: queryId, name: name, parameters: parameters } :
      { queryId: queryId, name: name }
    );
  }

  function postQuery(name, parameters) {
    return new Promise((resolve) => {
      var queryId = Date.now() + ':' + Math.random();

      queries.set(queryId, resolve);

      postQueryMessage(queryId, name, parameters);
    });
  }

  const Dispatcher = EventDispatcher.mixin({
    connect: function() {
      if (worker) {
        return;
      }

      worker = new SharedWorker('js/iac/shared_worker.js');
      worker.addEventListener('error', function(e) {
        console.error('Worker threw an error: ', e);
      });
      worker.port.addEventListener('message', onMessage);
      worker.port.start();

      exports.addEventListener('unload', () => this.disconnect());
    },

    disconnect: function() {
      if (!worker) {
        return;
      }

      // Since MessagePort doesn't support "onclose" event, SharedWorker won't
      // be notified in case port.close() is called, so we workaround that with
      // plain "closed" message.
      postMessage('closed');
      worker.port.close();
      worker.port.removeEventListener('message', onMessage);

      worker = null;
    },

    query: function(name, parameters) {
      return postQuery(name, parameters);
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
      // Message is sent by SharedWorker to be sure that current port is alive
      if (message.data.name === 'ping') {
        return postMessage('pong');
      }

      if (message.data.name === 'debug') {
        console.log('SharedWorker: ' + message.data.parameters);
        return;
      }

      if (message.data.queryId) {
        var queryResolver = queries.get(message.data.queryId);

        // Message with the query result
        if (queryResolver) {
          queries.delete(message.data.queryId);
          queryResolver(message.data.parameters);
        } else {
          queryDispatcher.emit(message.data.name, Object.freeze({
            parameters: message.data.parameters,
            postResult: (result) => postQueryMessage(
              message.data.queryId, message.data.name, result
            )
          }));
        }

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

  exports.InterInstanceEventDispatcher = Dispatcher;
})(window);
