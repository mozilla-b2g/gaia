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
   * An Observable is able to notify its property change. It is initialized by
   * an ordinary object.
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

  return Observable;
});
