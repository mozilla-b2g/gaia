'use strict';

/*
 * This is a temporary shim library for communication between
 * haida-sheets. It will probably not be needed once we will
 * have proper broadcasting messages
 */

(function(exports) {

  function MessageBroadcaster(windowObj) {
    this.window = windowObj || window;
    this.urlString = this.window.location.toString();
    this.isListening = false;
    this.listeners = {};
    this.childViews = null;
    this.isTopWindow = !!(
      ~this.urlString.indexOf('index') &&
      ~this.urlString.indexOf('contacts')
    );
    this.appTopWindow = this.isTopWindow ?
     this.window : this.window.parent;

    if (this.isTopWindow) {
      this.isListening = true;
      this.childViews = document.getElementsByTagName('iframe');
      this.window.addEventListener('message', msgToEvent.bind(this));
    }
  }

  // we use .on() to subscribe for the event
  MessageBroadcaster.prototype.on = function on(message, cb) {
    // probably some of the views will not need any broadcasting events,
    // so for performance reasons we shouldn't listen to any event inside
    // those iframes.
    //
    // XXX: it would be great to set a data-flag or class on the iframe
    // and exclude it from the childViews, but for now it's not so
    // important - we have only one iframe with child view.
    if (!this.isListening) {
      this.window.addEventListener('message', msgToEvent.bind(this));
      this.isListening = true;
    }
    // If we don't have any listeners for this message, create an array
    // of listeners (callback function). Like in DOM, every event can fire
    // multiple listeners so Array is good solution in here
    if (typeof this.listeners[message] === 'undefined') {
      this.listeners[message] = [];
    }
    // Add another callback function to this event
    this.listeners[message].push(cb);
  };

  // .fire() emits event
  MessageBroadcaster.prototype.fire = function fire(message,
   data, calledFromOutside) {
    // if it's not called from outside, it means the event fired in this
    // window. We need to go to the top level then (window.top) and send
    // event to all the child iframes
    if (!calledFromOutside) {
      this.appTopWindow.postMessage({
        broadcasted_message: message,
        broadcasted_data: data
      }, this.window.location.origin);
    } else {
      // If we received the event by post message (so it didn't started in
      // here) and we are in the top window, then we iterate through all the
      // iframes and send them post messages with given data
      var i, len;
      if (this.isTopWindow && this.childViews) {
        for (i = 0, len = this.childViews.length; i < len; i++) {
          this.childViews[i].contentWindow.postMessage({
            broadcasted_message: message,
            broadcasted_data: data
          }, '*');
        }
      }
      // And then we evecute all the callback assigned to the given event
      // with broadcasted data
      if (Array.isArray(this.listeners[message])) {
        var currentListeners = this.listeners[message];
        for (i = 0, len = currentListeners.length; i < len; i++) {
          if(currentListeners[i]) {
            currentListeners[i](data);
          }
        }
      }
    }
  };

  // We call .out() to unsuscribe from the event.
  MessageBroadcaster.prototype.out = function out(message, cb) {
    if (Array.isArray(this.listeners[message])) {
      var i, len;
      var currentListeners = this.listeners[message];
      for (i = 0, len = currentListeners.length; i < len; i++){
        if (currentListeners[i] === cb){
          currentListeners.splice(i, 1);
          break;
        }
      }

      // If we don't have any more events, we don't want to listen to the
      // post message. Except when we are in the top window, then even if
      // we are not interested in any messages, we need somehow send them
      // deeper.
      if (listenersLength(this.listeners) === 0 && !this.isTopWindow) {
        this.window.removeEventListener('message', msgToEvent.bind(this));
        this.isListening = false;
      }
    }
  };

  function listenersLength(listeners) {
    if (!listeners) {
      return 0;
    }

    var result = 0;
    for(var i in listeners) {
      if (Array.isArray(listeners[i])) {
        result += listeners[i].length;
      }
    }

    return result;
  }

  function msgToEvent(msg) {
    // When the message we receive has expected structure...
    if (
      msg &&
      msg.data &&
      msg.data.broadcasted_message &&
      msg.data.broadcasted_data
    ) {
      // it means it's our broadcasting event and we fire it here
      /*jshint validthis:true */
      this.fire(msg.data.broadcasted_message,
       msg.data.broadcasted_data, true);
    }
  }


  exports.MessageBroadcaster = MessageBroadcaster;
})(window);
