define(function() {
  'use strict';

  var OP_PREFIX = (name) => { '$OP_' + name; };

  function Observable(obj) {
    this._init(obj);
  }

  Observable.prototype.observe = function o_observe(name, observer) {
    this[name]; // XXX: enforce the setter
    if (!this[OP_PREFIX(name)]) {
      throw new Error('Observable property ' + name + ' does not exist');
    }

    if (typeof observer !== 'function') {
      return;
    }

    if (!this._observers) {
      this._observers = {};
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
    } else if (observer) {
      // (prop, observer) -- remove observer from the specific prop
      this._removeObserver(observer, name);
    } else if (name in this._observers) {
      // (prop) -- otherwise remove all observers for property
      this._observers[name] = [];
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
    Object.defineProperty(object, name, {
      enumerable: true,
      get: function() {
        var value = this[OP_PREFIX(name)];
        if (typeof value === 'undefined') {
          value = this[OP_PREFIX(name)] = defaultValue;
        }
        return value;
      },
      set: function(value) {
        var oldValue = this[name];
        if (oldValue !== value) {
          this[OP_PREFIX(name)] = value;

          var observers = !!this._observers && this._observers[name];
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
