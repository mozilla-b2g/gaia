(function() {
  'use strict';

  /**
   * Max number of port references after which clean up attempt is made.
   * @type {number}
   */
  const MAX_OPEN_PORTS_NUMBER = 3;

  /**
   * Time during which port should reply on "ping" request, otherwise it's
   * considered as dead and reference to it is removed.
   * @type {number}
   */
  const PING_TIMEOUT = 3000;

  /**
   * Currently active ping requests. Key is the port being pinged, value is the
   * setTimeout identifier.
   * @type {Map.<MessagePort, number>}
   */
  const pingRequests = new WeakMap();

  const queries = new Map();

  /**
   * List of connected port references which are used to listen and broadcast
   * events.
   * @type {Set.<MessagePort>}
   */
  const ports = new Set();

  function dump(data) {
    ports.forEach((port) => {
      port.postMessage({ name: 'debug', parameters: data });
    });
  }

  function closePort(port) {
    port.removeEventListener('message', onMessage);
    ports.delete(port);

    discardPingRequest(port);
  }

  function cleanUp() {
    ports.forEach((port) => {
      port.postMessage({ name: 'ping' });

      pingRequests.set(port, setTimeout(() => closePort(port), PING_TIMEOUT));
    });
  }

  function discardPingRequest(port) {
    var pingRequestTimeoutId = pingRequests.get(port);
    if (pingRequestTimeoutId) {
      clearTimeout(pingRequestTimeoutId);
      pingRequests.delete(port);
    }
  }

  function onQueryReply(port, query, replyData) {
    if (replyData !== undefined) {
      query.result.push(replyData);
    }

    var queryTimeout = query.timeouts.get(port);
    if (queryTimeout) {
      clearTimeout(queryTimeout);
      query.timeouts.delete(port);
    }

    // All ports replied
    if (--query.pendingCount === 0) {
      query.port.postMessage({
        queryId: query.id,
        name: query.name,
        parameters: query.result
      });
      queries.delete(query.id);
    }
  }

  function onQueryMessage(message) {
    var targetPort = message.target;
    var query = queries.get(message.data.queryId);

    // Message with the query result
    if (query) {
      onQueryReply(targetPort, query, message.data.parameters);
      return;
    }

    // No other ports to query, just reply immediately
    if (ports.size === 1) {
      targetPort.postMessage({
        queryId: message.data.queryId,
        name: message.data.name,
        parameters: []
      });
      return;
    }

    // Register new query to collect results and respond once all ports replied
    query = {
      id: message.data.queryId,
      port: targetPort,
      result: [],
      pendingCount: ports.size - 1,
      name: message.data.name,
      timeouts: new WeakMap()
    };
    queries.set(query.id, query);

    dump('New query: ' + JSON.stringify(query));

    ports.forEach(function(port) {
      // Don't send message to the same port
      if (port !== targetPort) {
        query.timeouts.set(
          port, setTimeout(() => onQueryReply(port, query), PING_TIMEOUT)
        );
        port.postMessage(message.data);
      }
    });
  }

  function onMessage(message) {
    var targetPort = message.target;

    if (message.data.name === 'closed') {
      return closePort(targetPort);
    }

    // It doesn't matter what exactly message we've received from port - it
    // means that it's still alive, but don't broadcast if it's pong response.
    discardPingRequest(targetPort);
    if (message.data.name === 'pong') {
      return;
    }

    if (message.data.queryId) {
      onQueryMessage(message);
      return;
    }

    ports.forEach(function(port) {
      // Don't send message to the same port
      if (port !== targetPort) {
        port.postMessage(message.data);
      }
    });
  }

  self.addEventListener('connect', function(eConnect) {
    var port = eConnect.ports[0];

    // It's not normal if we have a lot "active" ports, let's check if some of
    // them aren't alive. This mechanism should be removed if eventually we have
    // reliable app-closing event that is fired in all app termination cases:
    // terminated by user via task manager, OOM kill, unexpected crash.
    if (ports.size >= MAX_OPEN_PORTS_NUMBER) {
      cleanUp();
    }

    ports.add(port);

    port.addEventListener('message', onMessage);
    port.start();
  });
})();
