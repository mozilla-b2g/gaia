/*global bridge,
         streamService
*/
/*jshint esnext: true */

'use strict';

(function(exports) {

  const priv = Object.freeze({
    methods: Symbol('methods'),
    streams: Symbol('streams'),
    events: Symbol('events'),
    service: Symbol('service')
  });

  /**
   * This mixin allows to expose easily a service from an object.
   *
   * This needs the following properties to work properly:
   *
   * - SERVICE_NAME holds the service name.
   * - METHODS holds the methods that will be exposed by the service.
   * - STREAMS holds the methods that handle streams exposed by the service.
   *
   * EVENTS, METHODS and STREAMS are all optional.
   */
  var serviceMixin = {
    /**
     * Initialize service to listen on the default context and given endpoint.
     * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
     *  The context/thread that service could listen for.
     */
    initService(endpoint) {
      if (!('bridge' in self)) {
        importScripts('/lib/bridge/bridge.js');
      }

      var service = bridge.service(this[priv.name]);

      this[priv.methods].forEach((exposedMethod) => {
        service.method(exposedMethod, this[exposedMethod].bind(this));
      });

      var streams = this[priv.streams];
      if (streams.length > 0) {
        if (!('streamService' in self)) {
          importScripts('/lib/bridge/plugins/stream/service.js');
        }

        service.plugin(streamService);

        streams.forEach((exposedStream) => {
          service.stream(exposedStream, this[exposedStream].bind(this));
        });
      }

      service.listen();

      endpoint && service.listen(endpoint);

      this[priv.service] = service;
    },

    /**
     * Broadcast an event to all listeners.
     * @param {String} eventName The event name to send.
     * @param {any} data Data to send with the event.
     */
    broadcast(eventName, data) {
      if (this[priv.events].indexOf(eventName) < 0) {
        throw new Error('Event "' + eventName + '" is not allowed!');
      }

      this[priv.service].broadcast(eventName, data);
    }
  };

  exports.BridgeServiceMixin = {
    mixin(target, name, { methods, streams, events}) {
      if (!name) {
        throw new Error(
          'A service name is mandatory to define a service.'
        );
      }

      Object.keys(serviceMixin).forEach(function(method) {
        if (typeof this[method] !== 'undefined') {
          throw new Error(
            'Object to mix into already has "' + method + '" property defined!'
          );
        }

        this[method] = serviceMixin[method];
      }, target);

      target[priv.service] = null;
      target[priv.name] = name;
      target[priv.methods] = methods || [];
      target[priv.streams] = streams || [];
      target[priv.events] = events || [];

      return target;
    }
  };
})(self);
