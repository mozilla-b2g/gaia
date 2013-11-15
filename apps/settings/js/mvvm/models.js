// start outer IIFE - exports === window
(function(exports) {
'use strict';

function unobserve(_eventHandlers, prop, handler) {

  // arguments in reverse order to support .bind(handler) for the
  // unbind from all case
  function removeHandler(handler, prop) {
    var handlers = _eventHandlers[prop];
    if (!handlers) {
      return;
    }
    var index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }

  if (typeof prop === 'function') {
    // (handler) -- remove from every key in _eventHandlers
    Object.keys(_eventHandlers).forEach(removeHandler.bind(null, prop));
  } else if (handler) {
    // (prop, handler) -- remove handler from the specific prop
    removeHandler(handler, prop);
  } else if (prop in _eventHandlers) {
    // (prop) -- otherwise remove all handlers for property
    _eventHandlers[prop] = [];
  }
}

/*
 * An Observable is able to notify its property change. It is initialized by an
 * ordinary object.
 */
function Observable(obj) {
  var _eventHandlers = {};
  var _observable = {
    observe: function o_observe(p, handler) {
      /*
       * We should check if _observable[_p] exists. Since _observable[_p] is
       * created along with _eventHandlers[p], here we simply check
       * _eventHandlers[p].
       */
      var handlers = _eventHandlers[p];
      if (handlers) {
        handlers.push(handler);
      }
    },
    /**
     * unobserve([prop], handler) - remove handler from observeable callbacks
     */
    unobserve: unobserve.bind(null, _eventHandlers)
  };

  var _getFunctionTemplate = function(p) {
    return function() {
      return _observable['_' + p];
    };
  };

  var _setFunctionTemplate = function(p) {
    return function(value) {
      var oldValue = _observable['_' + p];
      if (oldValue !== value) {
        _observable['_' + p] = value;
        var handlers = _eventHandlers[p];
        handlers.forEach(function(handler) {
          handler(value, oldValue);
        });
      }
    };
  };

  /*
   * Iterate all properties in the object and create corresponding getter and
   * setter for them.
   */
  for (var p in obj) {
    // XXX: We need to support function in the future. Filter it out for now.
    if (typeof obj[p] === 'function') {
      continue;
    }

    _eventHandlers[p] = [];

    Object.defineProperty(_observable, '_' + p, {
      value: obj[p],
      writable: true
    });

    Object.defineProperty(_observable, p, {
      enumerable: true,
      get: _getFunctionTemplate(p),
      set: _setFunctionTemplate(p)
    });
  }

  return _observable;
}

/*
 * An ObservableArray is able to notify its change through four basic operations
 * including 'insert', 'remove', 'replace', 'reset'. It is initialized by an
 * ordinary array.
 */
function ObservableArray(array) {
  var _array = array || [];
  var _eventHandlers = {
    'insert': [],
    'remove': [],
    'replace': [],
    'reset': []
  };

  var _notify = function(eventType, data) {
    var handlers = _eventHandlers[eventType];
    handlers.forEach(function(handler) {
      handler({
        type: eventType,
        data: data
      });
    });
  };

  return {
    get length() {
      return _array.length;
    },

    get array() {
      return _array;
    },

    forEach: function oa_foreach(func) {
      _array.forEach(func);
    },

    observe: function oa_observe(eventType, handler) {
      var handlers = _eventHandlers[eventType];
      if (handlers) {
        handlers.push(handler);
      }
    },

    unobserve: unobserve.bind(null, _eventHandlers),

    push: function oa_push(item) {
      _array.push(item);

      _notify('insert', {
        index: _array.length - 1,
        count: 1,
        items: [item]
      });
    },

    pop: function oa_pop() {
      if (!_array.length) {
        return;
      }

      var item = _array.pop();

      _notify('remove', {
        index: _array.length,
        count: 1
      });

      return item;
    },

    splice: function oa_splice(index, count) {
      if (arguments.length < 2) {
        return;
      }

      var addedItems = Array.prototype.slice.call(arguments, 2);
      _array.splice.apply(_array, arguments);

      if (count) {
        _notify('remove', {
          index: index,
          count: count
        });
      }

      if (addedItems.length) {
        _notify('insert', {
          index: index,
          count: addedItems.length,
          items: addedItems
        });
      }
    },

    set: function oa_set(index, value) {
      if (index < 0 || index >= _array.length) {
        return;
      }

      var oldValue = _array[index];
      _array[index] = value;
      _notify('replace', {
        index: index,
        oldValue: oldValue,
        newValue: value
      });
    },

    get: function oa_get(index) {
      return _array[index];
    },

    reset: function oa_reset(array) {
      _array = array;
      _notify('reset', {
        items: _array
      });
    }
  };
}

exports.Observable = Observable;
exports.ObservableArray = ObservableArray;

// end outer IIFE
}(window));
