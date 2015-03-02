define(function(require) {
  'use strict';

  var EventEmitter = require('modules/base/event_emitter');
  var Observable = require('modules/mvvm/observable');

  var Events = ['insert', 'remove', 'replace', 'reset'];
  var ReadOnlyMethods = ['forEach', 'map', 'every', 'some', 'indexOf',
                         'lastIndexOf', 'reduce', 'reduceRight'];

  function ObservableArray(array) {
    this.EventEmitter.call(this, Events);
    this._array = array || [];
    this._length = this._array.length;
  }

  EventEmitter.augment(ObservableArray.prototype);
  Observable.augment(ObservableArray.prototype);
  Observable.defineObservableProperty(ObservableArray.prototype, 'length', {
    permission: 'r'
  });
  Observable.defineObservableProperty(ObservableArray.prototype, 'array', {
    permission: 'r'
  });

  ReadOnlyMethods.forEach(function(op) {
    ObservableArray.prototype[op] = function() {
      return this._array[op].apply(this._array, arguments);
    };
  });

  ObservableArray.prototype.push = function oa_push(item) {
    this._array.push(item);
    this._length = this._array.length;

    this._emitEvent('insert', {
      index: this._array.length - 1,
      count: 1,
      items: [item]
    });
  };

  ObservableArray.prototype.pop = function oa_pop() {
    if (!this._array.length) {
      return;
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

  ObservableArray.prototype.splice = function oa_splice(index, count) {
    if (arguments.length < 2) {
      return;
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

  ObservableArray.prototype.set = function oa_set(index, value) {
    if (index < 0 || index >= this._array.length) {
      return;
    }

    var oldValue = this._array[index];
    this._array[index] = value;
    this._emitEvent('replace', {
      index: index,
      oldValue: oldValue,
      newValue: value
    });
  };

  ObservableArray.prototype.get = function oa_get(index) {
    return this._array[index];
  };

  ObservableArray.prototype.reset = function oa_reset(array) {
    this._array = array;
    this._length = this._array.length;
    this._emitEvent('reset', {
      items: this._array
    });
  };

  // constructor and static functions
  function _ctor(array) {
    return new ObservableArray(array);
  }

  function _augment(prototype) {
    Object.keys(ObservableArray.prototype).forEach(function(key) {
      prototype[key] = ObservableArray.prototype[key];
    });
    prototype.ObservableArray = ObservableArray;
  }

  Object.defineProperty(_ctor, 'augment', {
    value: _augment
  });

  return _ctor;
});
