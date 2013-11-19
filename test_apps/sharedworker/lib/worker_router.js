(function(global) {
  'use strict';
  /**
  Wrapper to create a callback which posts a message to the requester.
  */
  function makeCallback(port, id) {
    return function() {
      var payload = [id].concat(Array.slice(arguments));
      port.postMessage(payload);
    }
  }

  function WorkerRouter() {
    this.routes = new Map();

    addEventListener('connect', function(conEvt) {
      // how to enumerate ports?
      conEvt.ports[0].onmessage = function(msgEvt) {
        // incoming arguments for request
        var payload = msgEvt.data;

        // metadata about the request (not passed to the router)
        var id = payload.shift();
        var name = payload.shift();

        // callback to invoke (proxies to post message)
        payload.push(makeCallback(msgEvt.target, id));

        this.handleRoute(name, payload);
      }.bind(this);
    }.bind(this));
  }

  WorkerRouter.prototype = {
    route: function(name, fn) {
      this.routes.set(name, fn);
    },

    handleRoute: function(name, payload) {
      var route = this.routes.get(name);

      if (!route) {
        throw new Error('Non existant route: ' + name);
      }

      route.apply(this, payload);
    }
  };

  global.WorkerRouter = WorkerRouter;
}(this));
