var debug = require('debug')('test-agent:event mirror'),
    util = require('util');
/**
 * requires: responder
 *
 * When enhancing the server this will provide
 * an event 'mirror' or 'capture' functionality depending
 * on the options sent by the client.
 *
 * Events that occur on the server will be mirrored or captured
 * to the client. Captured events will no longer fire on the server.
 *
 * @constructor
 */
function EventMirror() {
  this.currentId = 0;
  this.listeners = {
    //id: { socket: null, events: [] },
    //...
  };
  this.capturedEvents = {
    //'event': [listenerIds, ...],
    //...
  };
}

EventMirror.prototype = {

  enhance: function enhance(server) {
    this.server = server;
    this.originalEmit = server.emit;

    server.on('mirror events add', this._addListener.bind(this));
    server.on('mirror events remove', this._removeListener.bind(this));
    server.emit = this._captureEmit.bind(this);
  },

  _addListener: function(data, socket) {
    var id = this.currentId++,
        self = this,
        ack;

    if (!data.events) {
      //don't crash if someone is stupid.
      return;
    }

    this.listeners[id] = {
      socket: socket,
      events: data.events,
      capture: data.capture
    };

    debug('asking to  mirror: ' + data.events.join(', '));

    data.events.forEach(function eachEvent(event) {
      if (!self.capturedEvents[event]) {
        self.capturedEvents[event] = [];
      }
      self.capturedEvents[event].push(id);
    });

    ack = {
      id: id,
      //cloned array is required otherwise
      //forEach will not loop correctly in close.
      events: data.events.concat([])
    };

    socket.once('close', function onMirrorSocketClose() {
      self._removeListener(ack, socket, true);
    });

    socket.send(
      this.server.stringify('mirror events ack', ack)
    );
  },

  _removeListener: function(data, socket, debug) {
    var id = data.id,
        events = data.events,
        listenerEvents,
        self = this,
        i;

    if (id in this.listeners) {
      listenerEvents = this.listeners[id].events;

      events.forEach(function(event) {
        var eventList = self.capturedEvents[event],
            eventIndex,
            listenerIndex;

        if (eventList) {
          eventIndex = eventList.indexOf(id);
          if (eventIndex !== -1) {
            eventList.splice(eventIndex, 1);
          }
        }

        listenerIndex = listenerEvents.indexOf(event);
        if (listenerIndex !== -1) {
          listenerEvents.splice(listenerIndex, 1);
        }
       });

      if (listenerEvents.length === 0) {
        delete this.listeners[id];
      }
    }
  },

  _captureEmit: function(event, data) {
    var i = 0, list, mirror, mirrorIndex;

    //check if event is going to be mirrored
    if (event in this.capturedEvents) {
      list = this.capturedEvents[event];

      //loop through all listeners
      for (i; i < list.length; i++) {
        mirror = this.listeners[list[i]];

        //if there is a valid listener still
        if (mirror) {
          //emit event to listener
          this._mirrorEvent(mirror, event, data);
          //if listener is capturing this event prevent propagation
          if (mirror.capture) {
            //by returning
            return this.server;
          }
        }
      }
    }

    return this.originalEmit.apply(this.server, arguments);
  },

  _mirrorEvent: function(mirror, event, data) {
    try {
      mirror.socket.send(
        this.server.stringify(event, data)
      );
    } catch (e) {
      debug('Error trying to send to websocket proxy: ', e.message, e.stack);
    }
  }

};

module.exports = exports = EventMirror;
