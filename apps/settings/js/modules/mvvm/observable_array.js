/**
 * ObservableArray is able to notify its change through events of four basic
 * operations including 'insert', 'remove', 'replace', 'reset'.
 * ObservableArray implements most used methods including 'push', 'pop', and
 * 'splice'. Due to the syntax limitation it provides 'get' and 'set' for
 * manuplication values stored in the array. 'reset' is also provided for
 * replacing te entire array with another one. In addition to these methods,
 * methods including 'forEach', 'map', 'every', 'some', 'indexOf',
 * 'lastIndexOf', 'reduce', and 'reduceRight'.
 *
 * ObservableArray creation:
 * It can be initialized by an ordinary array. If the array is not given, an
 * empty is used by default.
 *
 * @example
 *   var observableArray = ObservableArray([1, 2, 3]);
 *
 * Events:
 * Information regarding the operation is provided in the event detail. Please
 * check the following example:
 *
 * @example
 *   var observableArray = ObservableArray([1, 2, 3]);
 *   var handler = {
 *     handleEvent: function(event) { console.log(JSON.stringify(event)); }
 *   }
 *   observableArray.addEventListener('insert', handler);
 *   observableArray.addEventListener('remove', handler);
 *   observableArray.addEventListener('replace', handler);
 *   observableArray.addEventListener('reset', handler);
 *
 *   observableArray.push(4);
 *   // observableArray is [1, 2, 3, 4]
 *   // event.type is 'insert'
 *   // event.detail is {index: 3, count: 1, items: [4]}
 *
 *   observableArray.pop();
 *   // observableArray is [1, 2, 3]
 *   // event.type is 'remove'
 *   // event.detail is {index: 3, count: 1, items: [4]}
 *
 *   observableArray.set(2, 4);
 *   // observableArray is [1, 2, 4]
 *   // event.type is 'replace'
 *   // event.detail is {index: 2, oldValue: 3, newValue: 4}
 *
 *   observableArray.reset([1, 2, 3]);
 *   // observableArray is [1, 2, 3]
 *   // event.type is 'reset'
 *   // event.detail is {items: [1, 2, 3]}
 *
 *   observableArray.splice(2, 1, [4, 5, 6]);
 *   // observableArray is [1, 2, 4, 5, 6]
 *   // First event:
 *   // event.type is 'remove'
 *   // event.detail is {index: 2, count: 1, items: [3]}
 *   // Second event:
 *   // event.type is 'insert'
 *   // event.detail is {index: 2, count: 3, items: [4, 5, 6]}
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var EventEmitter = require('modules/base/event_emitter');
  var Observable = require('modules/mvvm/observable');

  var Events = ['insert', 'remove', 'replace', 'reset'];
  var ReadOnlyMethods = ['forEach', 'map', 'every', 'some', 'indexOf',
                         'lastIndexOf', 'reduce', 'reduceRight'];

  /**
   * @class ObservableArray
   * @requires module:modules/base/module
   * @requires module:modules/base/event_emitter
   * @requires module:modules/mvvm/observable
   * @returns {ObservableArray}
   */
  var ObservableArray = Module.create(function ObservableArray(array) {
    this.super(Observable).call(this);
    this.super(EventEmitter).call(this, Events);

    this._array = array || [];
    this._length = this._array.length;
  }).extend(Observable, EventEmitter);

  /**
   * An observable property indicating the length of the array.
   *
   * @access public
   * @type {Number}
   */
  Observable.defineObservableProperty(ObservableArray.prototype, 'length', {
    readonly: true
  });

  /**
   * An observable property representing the inner array.
   *
   * @access public
   * @type {Array}
   */
  Observable.defineObservableProperty(ObservableArray.prototype, 'array', {
    readonly: true
  });

  ReadOnlyMethods.forEach(function(op) {
    ObservableArray.prototype[op] = function() {
      return this._array[op].apply(this._array, arguments);
    };
  });

  ObservableArray.prototype.push = function(item) {
    this._array.push(item);
    this._length = this._array.length;

    this._emitEvent('insert', {
      index: this._array.length - 1,
      count: 1,
      items: [item]
    });
  };

  ObservableArray.prototype.pop = function() {
    if (!this._array.length) {
      return null;
    }

    var item = this._array.pop();
    this._length = this._array.length;

    this._emitEvent('remove', {
      index: this._array.length,
      count: 1,
      items: [item]
    });

    return item;
  };

  ObservableArray.prototype.splice = function(index, count) {
    if (arguments.length < 2) {
      return [];
    }

    // Fix the arguments based on the behavior of the real spice function.
    if (index >= this._length) {
      index = this._length - 1;
    } else if (index < 0) {
      index = this._length + index;
    }
    if (count < 0) {
      count = 0;
    }

    var addedItems = Array.prototype.slice.call(arguments, 2);
    var removedItems = this._array.splice.apply(this._array, arguments);
    this._length = this._array.length;

    if (removedItems.length) {
      this._emitEvent('remove', {
        index: index,
        count: count,
        items: removedItems
      });
    }

    if (addedItems.length) {
      this._emitEvent('insert', {
        index: index,
        count: addedItems.length,
        items: addedItems
      });
    }

    return removedItems;
  };

  /**
   * Set a value to the field of a specfied index.
   *
   * @access public
   * @param {Number} index
   * @param {Object} value
   */
  ObservableArray.prototype.set = function(index, value) {
    if (index < 0 || index >= this._array.length) {
      this.throw('set: out of range');
    }

    var oldValue = this._array[index];
    this._array[index] = value;
    this._emitEvent('replace', {
      index: index,
      oldValue: oldValue,
      newValue: value
    });
  };

  /**
   * Get the value from the field of a specfied index.
   *
   * @access public
   * @param {Number} index
   * @returns {Object}
   */
  ObservableArray.prototype.get = function(index) {
    return this._array[index];
  };

  /**
   * Replace the entire array with another one.
   *
   * @access public
   * @param {Array} array
   */
  ObservableArray.prototype.reset = function(array) {
    this._array = array || [];
    this._length = this._array.length;
    this._emitEvent('reset', {
      items: this._array
    });
  };

  return ObservableArray;
});
