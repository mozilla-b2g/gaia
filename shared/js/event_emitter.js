/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * Unit tests in: app/gallery/test/unit
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
*/


/**
 * This file defines an Pub/Sub API for pusblishing and subscribing to events.
 * It creates a global EventEmitter object which has Pub/Sub methods.
 *
 * Subscribing to an event:
 * EventEmitter.on(evt, callback);
 * evt: The event you want to subscribe to.
 * callback: The function to be called when that event occurs.
 * Example:
 * var sub = EventEmitter.on('login', function(evt, args) {
 *  console.log(evt + 'occured, arguemnts supplied: ' + args);
 * });
 * Note: 'sub' is later used to unsubscribe from the event.
 *
 * Publishing an event:
 * EventEmitter.trigger(evt, args);
 * evt: The event you want to publish.
 * args: Message to be passed to the listener
 * Example: EventEmitter.trigger('login', {
 *  'user': 'rolls'
 * });
 * The argument can be any valid JavaScript argument.
 *
 *
 * Unsubscribing from an event:
 * EventEmitter uses a token based unsubscription mechanism.
 * EvenEmitter.off(token);
 * Example: EventEmitter.off(sub);
 * where sub is defined when subscribing to the event (See subscribe example)
 **/

var EventEmitter = (function() {

  var events = {};
  var UUID = -1;

  // Function to publish/trigger events
  function trigger(evt, args) {

    if (!events[evt]) {
      return false;
    }

    var subscribers = events[evt];
    var len = 0;
    if (subscribers) {
      len = subscribers.length;
    }

    while (len--) {
      subscribers[len].callback(evt, args);
    }
    return true;
  }

  // Function to subscribe to events
  function on(evt, callback) {

    if (!events[evt]) {
      events[evt] = [];
    }

    var token = (++UUID).toString();
    events[evt].push({
      token: token,
      callback: callback
    });

    return token;
  }

  // Function to Unsubscribe
  // Token based unsubscription
  function off(token) {
    for (var evt in events) {
      if (events[evt]) {
        for (var i = 0; i < events[evt].length; i++) {
          if (events[evt][i].token === token) {
            events[evt].splice(i, 1);
            return token;
          }
        }
      }
    }
    return false;
  }

  return {
    trigger: trigger,
    on: on,
    off: off
  };
}());

