define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var DependencyGraph = require('modules/base/dependency_graph');

  var OP_PREFIX = (name) => { return '$OP_' + name; };

  /**
   * Observable provides ways of defining properties that the value changes of
   * them can be observed. In addition to normal properties, it allows to
   * create read-only properties and dependency properties. 
   *
   * Observable creation:
   * There are two ways of defining an Observable: object literal or extending
   * from Observable. Object literal is useful when defining a singleton or you
   * want to create an observable easily.
   *
   * @example
   *   var observable = Observable({
   *     prop: 10,
   *     func: function() {}
   *   });
   *
   * Extending from Observable allow you to define a class of Observable. The
   * advantage of this compared to object literal is that the accessers are
   * shared across all instances of the class. The syntax compatible with the
   * javascript prototype definition.
   *
   * @example
   *   var ExtendedObservable = Module.create(function ExtendedObservable() {
   *     this.super(Observable).call(this);
   *   }).extend(Observable);
   *   Observable.defineObservableProperty(ExtendedObservable.prototype, 'prop',
   *   {
   *     value: 10
   *   });
   *   ExtendedObservable.prototype.func = function() {};
   *
   *   // Extend from NewObservable
   *   var ExtendedObservable2 = Module.create(function() {
   *     // constructor
   *   }).extend(ExtendedObservable);
   *   Observable.defineObservableProperty(
   *     ExtendedObservable2.prototype, 'prop2',
   *   {
   *     value: 20
   *   });
   *
   *   var observable = ExtendedObservable2();
   *   console.log(observable.prop);  // 10
   *   console.log(observable.prop2); // 20
   *
   * Defining a read-only property:
   * This is only supported when extending from Observable. When you define a
   * read-only property, an internal property with a '_' prefix is defined at
   * the same time so you can still change the value inside the observable.
   *
   * @example
   *   Observable.defineObservableProperty(ExtendedObservable.prototype, 'prop',
   *   {
   *     readonly: true,
   *     value: 10
   *   });
   *   ExtendedObservable.prototype.inc = function() {
   *     this._prop = 100;
   *   };
   *   var observable = new ExtendedObservable();
   *   observable.prop = 100; // throws an exception
   *   observable.inc();      // observers on "prop" are called
   *
   * Defining a dependency property:
   * This is only supported when extending from Observable. You provide a list
   * of the dependent properties and when each of them changes, the observsers
   * on the defined property are called. Dependency properties are read-only.
   *
   * @example
   *   Observable.defineObservableProperty(ExtendedObservable.prototype, 'prop',
   *   {
   *     value: 10
   *   });
   *   Observable.defineObservableProperty(
   *     ExtendedObservable.prototype, 'prop2',
   *   {
   *     value: 20
   *   });
   *   Observable.defineObservableProperty(
   *     ExtendedObservable.prototype, 'dependencyProp',
   *   {
   *     dependncy: ['prop', 'prop2']
   *   });
   *   var observable = new ExtendedObservable();
   *   observable.prop = 100;  // observers on "dependencyProp" are called
   *   observable.prop2 = 200; // observers on "dependencyProp" are called
   *
   * @class Observable
   * @requires module:modules/base/module
   * @requires module:modules/base/dependency_graph
   * @returns {Observable}
   */
  var Observable = Module.create(function Observable(object) {
    this._observers = {};
    if (object) {
      this._initWithObject(object);
    }
  });

  /**
   * Initialize the observable with a prototype object. This is not required
   * for objects that are defined using prototype as everything should be
   * defined via Observable.defineObservableProperty explicitly.
   *
   * @access private
   * @memberOf Observable.prototype
   * @param {Object} object
   */
  Observable.prototype._initWithObject = function o_init(object) {
    for (var name in object) {
      // If name is a function, simply add it to the observable.
      if (typeof object[name] === 'function') {
        this[name] = object[name];
      } else {
        _defineObservableProperty(this, name, {
          value: object[name]
        });
      }
    }
  };

  /**
   * Notify the value change of a property.
   *
   * @access private
   * @memberOf Observable.prototype
   * @param {String} name
   * @param {Object} newValue
   * @param {Object} oldValue
   */
  Observable.prototype._notify = function o__notify(name, newValue, oldValue) {
    var observers = this._observers[name];
    if (observers) {
      observers.forEach(function(observer) {
        observer(newValue, oldValue);
      });
    }
  };

  /**
   * Remove an observer from a property.
   *
   * @access private
   * @memberOf Observable.prototype
   * @param {Function} observer
   * @param {String} name
   */
  Observable.prototype._removeObserver =
    function o__removeObserver(observer, name) {
      // arguments in reverse order to support .bind(observer) for the
      // unbind from all case
      var observers = this._observers[name];
      if (observers) {
        var index = observers.indexOf(observer);
        if (index >= 0) {
          observers.splice(index, 1);
        }
      }
  };

  /**
   * Observe a property with an observer. The observer is called when the
   * property changes.
   *
   * @access public
   * @memberOf Observable.prototype
   * @param {String} name
   * @param {Function} observer
   */
  Observable.prototype.observe = function o_observe(name, observer) {
    if (typeof observer !== 'function') {
      return;
    }
    (this._observers[name] = this._observers[name] || []).push(observer);
  };

  /**
   * Unobserve a property
   *
   * @access public
   * @memberOf Observable.prototype
   * @param {String} name
   * @param {Function} observer
   */
  Observable.prototype.unobserve = function o_unobserve(name, observer) {
    if (typeof name === 'function') {
      // (observer) -- remove from every key in _observers
      Object.keys(this._observers).forEach(
        this._removeObserver.bind(this, name));
    } else {
      if (observer) {
        // (prop, observer) -- remove observer from the specific prop
        this._removeObserver(observer, name);
      } else if (name in this._observers) {
        // (prop) -- otherwise remove all observers for property
        this._observers[name] = [];
      }
    }
  };

  // Static functions
  var _dependencyGraphs = new Map();
  /**
   * Each module should have its own dependency graph that decides what
   * observers to called when a property changes. The function returns the
   * dependency graph of a module. It creates one if the map does not exist.
   *
   * @param {Object} modulePrototype
   */
  function _getDependencyGraph(modulePrototype) {
    var dependencyGraph = _dependencyGraphs.get(modulePrototype);
    if (!dependencyGraph) {
      // register a new dependency graph of the module based on the existing
      // dependency graph on the module.
      dependencyGraph = DependencyGraph(modulePrototype._dependencyGraph);
      modulePrototype._dependencyGraph = dependencyGraph;
      _dependencyGraphs.set(modulePrototype, dependencyGraph);
    }
    return dependencyGraph;
  }

  /**
   * The function helps query the values of all dependent properties of a
   * specified property.
   *
   * @param {Observable} observable
   * @param {String} sourceProperty
   *                 The source property name.
   */
  function _getAllDependentValues(observable, sourceProperty) {
    var dependentList = observable._dependencyGraph &&
      observable._dependencyGraph.getAllDependent(sourceProperty);
    if (dependentList && dependentList.length) {
      return dependentList.map((name) => {
        return {
          name: name,
          value: observable[name]
        };
      });
    } else {
      return null;
    }
  }

  function _getterTemplate(name, defaultValue) {
    return function() {
      var value = this[OP_PREFIX(name)];
      if (typeof value === 'undefined') {
        value = this[OP_PREFIX(name)] = defaultValue;
      }
      return value;
    };
  }

  function _setterTemplate(name) {
    return function(value) {
      var oldValue = this[name];
      if (oldValue !== value) {
        // cache the old values of all dependent
        var dependentValues = _getAllDependentValues(this, name);
        // change the value
        this[OP_PREFIX(name)] = value;
        // notify the changes
        this._notify(name, value, oldValue);
        if (dependentValues) {
          dependentValues.forEach((obj) => {
            this._notify(obj.name, this[obj.name], obj.value);
          });
        }
      }
    };
  }

  function _defineObservablePropertyCore(object, name, options) {
    var dependency = options && options.dependency;

    // Update dependency information
    if (dependency) {
      var dependencyGraph = _getDependencyGraph(object);
      dependency.forEach((dependentName) => {
        // name depends on dependentName
        dependencyGraph.addDependency(name, dependentName);
      });
    }

    Object.defineProperty(object, name, {
      enumerable: true,
      get: options.get,
      set: options.set
    });
  }

  function _defineObservableProperty(object, name, options) {
    if (options && options.readonly) {
      var internalName = '_' + name;
      _defineObservablePropertyCore(object, name, {
        dependency: [internalName],
        get: function() {
          return this[internalName];
        }
      });
      _defineObservablePropertyCore(object, internalName, {
        get: _getterTemplate(internalName, options && options.value),
        set: _setterTemplate(internalName)
      });
    } else if (options && options.dependency && options.dependency.length) {
      if (typeof options.get !== 'function') {
        throw new Error('Observable: getter of ' + name + ' is invalid');
      }
      _defineObservablePropertyCore(object, name, {
        dependency: options.dependency,
        get: options.get
      });
    } else {
      _defineObservablePropertyCore(object, name, {
        get: _getterTemplate(name, options && options.value),
        set: _setterTemplate(name)
      });
    }
  }

  /**
   * Observe a property with an observer. The observer is called when the
   * property changes.
   *
   * @access public
   * @memberOf Observable
   * @param {Object} object
   * @param {String} name
   * @param {Object} options
   * @param {Boolean} options.readonly
   *                  Indicating if the property is read-only.
   * @param {Array.<String>} options.dependency
   *                         List of the dependent properties.
   * @param {Function} options.get
   *                   Getter of the property.
   */
  Object.defineProperty(Observable, 'defineObservableProperty', {
    get: function() {
      return _defineObservableProperty;
    }
  });
  return Observable;
});
