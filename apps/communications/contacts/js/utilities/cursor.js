'use strict';

var contacts = window.contacts || {};
contacts.Cursor = Cursor;

// Provide a simple object providing cursor style interfaces.  This is very
// much inspired by the node.js EventEmitter and streams interface.
//
// Data to return from the cursor is passed using the `push()` function.  This
// will then fire the `'data'` event.
//
// Clients call the `next()` function to request the next data item.  The
// service providing the cursor should then listen for the `'next'` event and
// `push()` the appropriate item into the cursor.
//
// The end of the cursor iteration is triggered by calling `end()`.  If the
// cursor is cancelled prematurely, you can call `cancel()` instead.  In both
// cases the `'end'` event is emitted.  For `cancel()` an additional `'cancel'`
// event is provided as well.
//
// Note, `next()` must be called to receive the initial item.  The service
// may do this or may require the client code to call it.
//
// Example service code:
//
// var cursor = new contacts.Cursor();
// cursor.on('next', function() {
//   loadSomeDataFromAResource(function(result) {
//     if (!result) {
//       cursor.end();
//       return;
//     }
//     cursor.push(result);
//   });
// });
//
// // return cursor to client
// return cursor;
//
// Example client code:
//
// var cursor = service.getCursor();
// cursor.on('data', function(result) {
//   processResultSomehow(result);
//   cursor.next();
// });
//
// cursor.on('end', function() {
//   finalizeProcessing();
// });

function Cursor(opts) {
  var self = (this instanceof Cursor) ? this : Object.create(Cursor.prototype);

  opts = opts || {};

  self._callbacks = {};

  return self;
}

Cursor.prototype.next = function next() {
  // NOTE: next is emitted synchronously since we really only need
  //       either next or data to be asynchronous.  Doing both is
  //       overkill and introduces a bit too much delay.
  this.emit('next');
};

Cursor.prototype.cancel = function cancel() {
  setImmediate(this.emit.bind(this, 'cancel'));
  this.end();
};

Cursor.prototype.end = function end() {
  var self = this;
  setImmediate(function() {
    self.emit('end');

    // kill this cursor after emitting the final end event
    self._callbacks = {};
  });
};

Cursor.prototype.push = function push() {
  var args = Array.prototype.slice.call(arguments);
  setImmediate(this.emit.bind(this, 'data', args));
};

Cursor.prototype.error = function error(err) {
  setImmediate(this.emit.bind(this, 'error', err));
  this.end();
};

Cursor.prototype.on = function on(evt, cb) {
  if (typeof cb !== 'function') {
    throw new Error('Cursor callback for event ' + evt + ' is not a function!');
  }
  this._callbacks[evt] = this._callbacks[evt] || [];
  this._callbacks[evt].push(cb);
};

Cursor.prototype.emit = function emit(evt, result) {
  var cbList = this._callbacks[evt];
  if (!cbList || !cbList.length) {
    return;
  }

  for (var i = 0, n = cbList.length; i < n; ++i) {
    var cb = cbList[i];
    if (typeof cb !== 'function') {
      continue;
    }

    if (Array.isArray(result)) {
      cb.apply(null, result);
    } else {
      cb(result);
    }
  }
};
