'use strict';
var EventEmitter = require('events').EventEmitter;

var MESSAGE_PREFIX = 'mocha-proxy';

// runnable events which need a runnable wrapper
var RUNNABLE_EVENTS = [
  'pending',
  'pass',
  'fail',
  'test',
  'test end',
  'suite',
  'suite end'
];

function Runnable(event) {
  for (var key in event) {
    this[key] = event[key];
  }
}

Runnable.prototype = {
  slow: function() {
    return this._slow;
  },

  fullTitle: function() {
    var title = '';
    if (this.parent) {
      title = this.parent.fullTitle();
      if (title) {
        title += ' ';
      }
    }
    title += this.title;
    return title;
  }
};

/**
 * Consumer for a mocha runner process using the mocha-json-proxy reporter.
 *
 *
 *    var consumer = new Consumer(
 *      forkedMochaProcess // should use _mocha NOT mocha (which spawns another
 *      process)
 *    );
 *
 *    // consumer is also an event emitter which emits standard mocha events.
 *    consumer.on('start', function() {
 *    });
 *
 *    consumer.on('pass', function() {
 *    });
 *
 * @param {ChildProcess} child to listen to messages on.
 */
function Consumer(child) {
  EventEmitter.call(this);

  this._suiteStack = [];
  this._objects = {};

  child.on('message', function(content) {
    if (Array.isArray(content) && content[0] === MESSAGE_PREFIX) {
      this.transformEvent(content[1]);
    }
  }.bind(this));
}

Consumer.prototype = {
  __proto__: EventEmitter.prototype,

  referenceObject: function(event, object) {
    // objects without the _id property don't need to be a single reference.
    if (!object || !object._id) {
      return object;
    }
    // find the original reference or create it.
    var ref = this._objects[object._id];

    if (!ref) {
      // convert the object into an instanceof Runnable if its event is a suite
      // or test.
      if (RUNNABLE_EVENTS.indexOf(event) !== -1) {
        object = new Runnable(object);
      }
      // when no reference is found this is the correct object.
      ref = this._objects[object._id] = object;
    } else {
      // otherwise we need to update the reference
      Object.keys(object).forEach(function(key) {
        var value = object[key];
        ref[key] = value;
      });
    }

    // Re-create the parent based on the referenced ID.
    if (ref._parentId) {
      ref.parent = this.referenceObject('suite', { _id: ref._parentId });
      delete ref._parentId;
    }

    return ref;
  },

  transformEvent: function(event) {
    var name = event[0];
    var runnable = event[1] = this.referenceObject(name, event[1]);

    if (name === 'suite') {
      this._suiteStack.push(runnable);
      // add the root .suite
      if (!this.suite) {
        this.suite = runnable;
      }
    }

    this.emit.apply(this, event);
  }

};

module.exports = Consumer;
