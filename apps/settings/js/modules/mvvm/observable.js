define(function() {
  'use strict';

  var OP_PREFIX = (name) => { return '$OP_' + name; };

  function Observable(obj) {
    this._init(obj);
  }

  Observable.prototype.observe = function o_observe(name, observer) {
    var propertyInfo =
      this._observablePropertiesInfo && this._observablePropertiesInfo[name];
    if (!propertyInfo) {
      throw new Error('Observable property ' + name + ' does not exist');
    }

    if (typeof observer !== 'function') {
      return;
    }

    if (!this._observers) {
      this._observers = {};
    }

    // For read-only properties, the observer should be register on its internal
    // property.
    if (propertyInfo.permission === 'r') {
      name = '_' + name;
    }

    var observers = this._observers[name];
    if (typeof observers === 'undefined') {
      observers = this._observers[name] = [];
    }
    observers.push(observer);
  };

  Observable.prototype.unobserve = function o_unobserve(name, observer) {
    if (typeof name === 'function') {
      // (observer) -- remove from every key in _observers
      Object.keys(this._observers).forEach(
        this._removeObserver.bind(this, name));
    } else {
      var propertyInfo =
      this._observablePropertiesInfo && this._observablePropertiesInfo[name];
      if (!propertyInfo) {
        throw new Error('Observable property ' + name + ' does not exist');
      }

      // For read-only properties, the observer should be register on its
      // internal property.
      if (propertyInfo.permission === 'r') {
        name = '_' + name;
      }

      if (observer) {
        // (prop, observer) -- remove observer from the specific prop
        this._removeObserver(observer, name);
      } else if (name in this._observers) {
        // (prop) -- otherwise remove all observers for property
        this._observers[name] = [];
      }
    }
  };

  Observable.prototype._removeObserver =
    function o__removeObserver(observer, name) {
      // arguments in reverse order to support .bind(observer) for the
      // unbind from all case
      var observers = !!this._observers && this._observers[name];
      if (!observers) {
        return;
      }
      var index = observers.indexOf(observer);
      if (index >= 0) {
        observers.splice(index, 1);
      }
  };

  Observable.prototype._init = function o_init(obj) {
    if (!obj) {
      return;
    }
    for (var name in obj) {
      // If name is a function, simply add it to the observable.
      if (typeof obj[name] === 'function') {
        continue;
      }
      _defineObservableProperty(this, name, {
        value: obj[name]
      });
    }
  };

  function _ctor(obj) {
    return new Observable(obj);
  }

  function _defineObservableProperty(object, name, options) {
    var defaultValue = options && options.value;
    var permission = (options && options.permission) || 'rw';
    var readOnly = permission === 'r';

    var observablePropertiesInfo = object._observablePropertiesInfo;
    if (!observablePropertiesInfo) {
      observablePropertiesInfo = object._observablePropertiesInfo = {};
    }
    observablePropertiesInfo[name] = {
      permission: permission
    };

    // For read only properties, we create a setter for "name" and an internal
    // property called "_name".
    var propName = name;
    if (readOnly) {
      propName = '_' + name;
      Object.defineProperty(object, name, {
        enumerable: true,
        get: function() {
          return this[propName];
        }
      });
    }

    Object.defineProperty(object, propName, {
      enumerable: !readOnly,
      get: function() {
        var value = this[OP_PREFIX(propName)];
        if (typeof value === 'undefined') {
          value = this[OP_PREFIX(propName)] = defaultValue;
        }
        return value;
      },
      set: function(value) {
        var oldValue = this[propName];
        if (oldValue !== value) {
          this[OP_PREFIX(propName)] = value;

          var observers = !!this._observers && this._observers[propName];
          if (!observers) {
            return;
          }
          observers.forEach(function(observer) {
            observer(value, oldValue);
          });
        }
      }
    });
  }

  function _augment(prototype) {
    Object.keys(Observable.prototype).forEach(function(key) {
      prototype[key] = Observable.prototype[key];
    });
  }

  Object.defineProperty(_ctor, 'augment', {
    enumerable: true,
    writable: false,
    value: _augment
  });

  Object.defineProperty(_ctor, 'ctor', {
    enumerable: true,
    writable: false,
    value: function(obj) {
      Observable.call(this, obj);
      return this;
    }
  });

  Object.defineProperty(_ctor, 'defineObservableProperty', {
    enumerable: true,
    writable: false,
    value: _defineObservableProperty
  });

  return _ctor;
});
