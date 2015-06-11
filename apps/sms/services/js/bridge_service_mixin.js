/*global bridge */
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
    initService() {
      if (!('bridge' in self)) {
        importScripts('/lib/bridge.js');
      }

      var service = bridge.service(this[priv.name]);

      this[priv.methods].forEach((exposedMethod) => {
        service.method(exposedMethod, this[exposedMethod].bind(this));
      });

      this[priv.streams].forEach((exposedStream) => {
        service.stream(exposedStream, this[exposedStream].bind(this));
      });

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

        this[priv.name] = name;
        this[priv.methods] = methods || [];
        this[priv.streams] = streams || [];
        this[priv.events] = events || [];
      }, target);

      return target;
    }
  };
})(self);
