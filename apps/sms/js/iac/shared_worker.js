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

  /**
   * List of connected port references which are used to listen and broadcast
   * events.
   * @type {Set.<MessagePort>}
   */
  const ports = new Set();

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
