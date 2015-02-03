'use strict';

define(function() {
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
   * An ObservableArray is able to notify its change through four basic
   * operations including 'insert', 'remove', 'replace', 'reset'. It is
   * initialized by an ordinary array.
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

  return ObservableArray;
});
