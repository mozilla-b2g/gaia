/* globals BaseModule,
           Notification
*/

'use strict';

/**
 * NotificationsSystemMessage module aims at centralizing all uses of system
 * message notifications. We need this, because mozSetMessageHandler() will
 * only allow one use in each application ; hence, if multiple submodules in
 * the System application need to make use of
 * mozSetMessageHandler('notification'), then we need one way to centralize
 * and then dispatch to users.
 *
 * This module is exposed as a Service, and modules that needs to make use of
 * it should call Service.request('handleSystemMessageNotification',ID,target),
 * where ID is a local identifier, defining the module, and target is the
 * object that will receive the notification.
 *
 * The ID will be pulled from the data payload of the notification, and more
 * precisely, this is expected to be stored in the systemMessageTarget
 * property. So a module 'toto' should send the notification as:
 *   new Notification('title', {
 *                      body: 'body',
 *                      data: {
 *                        systemMessageTarget: 'toto'
 *                      }
 *                    });
 * and register as:
 *  Service.request('handleSystemMessageNotification', 'toto', this);
 *
 * The module 'toto' must be implementing a method named
 * 'handleSystemMessageNotification' and this will be called each time a system
 * message notification is being triggered for this module. This method will be
 * passed the notification message object. Modules are responsible for closing
 * the notification via the API.
 **/

(function(exports) {
  var NotificationsSystemMessage = function() {};

  NotificationsSystemMessage.SERVICES = [
    'handleSystemMessageNotification',
    'unhandleSystemMessageNotification'
  ];

  BaseModule.create(NotificationsSystemMessage, {
    name: 'NotificationsSystemMessage',
    EVENT_PREFIX: 'systemMessageNotification',
    DEBUG: false,
    TRACE: false,

    _handlers: {},

    _start: function nsm_start() {
      this.registerHandler();
    },

    registerHandler: function nsm_registerHandler() {
      this.debug('Installing system app notification message handler');
      navigator.mozSetMessageHandler('notification',
        this.processSystemMessage.bind(this));
    },

    processSystemMessage: function(message) {
      this.debug('Received system message notification: ' +
        JSON.stringify(message));

      if (!message.clicked) {
        return;
      }

      if (!message.data) {
        console.warn('No data payload considering legacy and force-closing.');
        this.closeOldNotification(message);
        return;
      }

      var target = message.data.systemMessageTarget;
      if (!target) {
        console.error('System message target seems undefined, force-closing');
        this.closeOldNotification(message);
        return;
      }

      if (!this.hasRegisteredTarget(target)) {
        console.error('No module has subscribed to: ' + target);
        return;
      }

      this.callRegisteredTarget(target, message);
    },

    registerTarget: function(target, obj) {
      if (this.hasRegisteredTarget(target)) {
        this.debug('Already have a handler for target: ' + target);
        return;
      }

      this.debug('Registering a handler for target: ' + target);
      this._handlers[target] = {
        name: target,
        context: obj
      };
    },

    unregisterTarget: function(target, obj) {
      if (!this.hasRegisteredTarget(target)) {
        console.error('No handler to unregister for target: ' + target);
        return;
      }

      var c = this.getTargetContext(target);
      if (c !== obj) {
        console.error('Mismatching object to unregister for target: ' + target);
        return;
      }

      this.debug('Unregistering the handler for target: ' + target);
      this._handlers[target] = null;
      delete this._handlers[target];
    },

    callRegisteredTarget: function(target, payload) {
      var ctx = this.getTargetContext(target);
      if (!ctx) {
        console.error('No registered target for ' + target);
        return;
      }

      ctx.handleSystemMessageNotification.call(ctx, payload);
    },

    closeOldNotification: function(message) {
      this.debug('Will try to close old notification: ' +
                 JSON.stringify(message));

      // Fields from system message notification may be undefined,
      // while the same field in the Notification object will be empty
      message.title = message.title ? message.title : '';
      message.tag   = message.tag   ? message.tag   : '';
      message.body  = message.body  ? message.body  : '';

      Notification.get().then(notifs => {
        notifs.forEach(notif => {
          if (notif.data && notif.data.systemMessageTarget) {
            return;
          }

          if ((notif.body  === message.body) &&
              (notif.tag   === message.tag) &&
              (notif.title === message.title)) {
            console.warn('Found a match for "' + message.title + '": "' +
                         message.body + '". Will force-close this.');
            notif.close();
          }
        });
      });
    },

    getTargetContext: function(target) {
      return this.getRegisteredTarget(target).context;
    },

    getRegisteredTarget: function(target) {
      return this._handlers[target];
    },

    hasRegisteredTarget: function(target) {
      return (target in this._handlers);
    },

    handleSystemMessageNotification:
      function nsm_handleSystemMessageNotification(target, object) {
        if (!('handleSystemMessageNotification' in object)) {
          console.error('Target do not have handleSystemMessageNotification');
          return;
        }

        this.registerTarget(target, object);
      },

    unhandleSystemMessageNotification:
      function nsm_unhandleSystemMessageNotification(target, object) {
        this.unregisterTarget(target, object);
      },
  });
}());
