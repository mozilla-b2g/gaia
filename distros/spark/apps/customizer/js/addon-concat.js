(function() {
var result;"use strict";

var _slice = Array.prototype.slice;
var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

//    Copyright 2012 Kap IT (http://www.kapit.fr/)
//
//    Licensed under the Apache License, Version 2.0 (the 'License');
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an 'AS IS' BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//    Author : François de Campredon (http://francois.de-campredon.fr/),

// Object.observe Shim
// ===================

// *See [The harmony proposal page](http://wiki.ecmascript.org/doku.php?id=harmony:observe)*

(function (global) {
  "use strict";
  if (typeof Object.observe === "function") {
    return;
  }

  // Utilities
  // ---------

  // setImmediate shim used to deliver changes records asynchronously
  // use setImmediate if available
  var setImmediate = global.setImmediate || global.msSetImmediate, clearImmediate = global.clearImmediate || global.msClearImmediate;
  if (!setImmediate) {
    // fallback on setTimeout if not
    setImmediate = function (func, args) {
      return setTimeout(func, 0, args);
    };
    clearImmediate = function (id) {
      clearTimeout(id);
    };
  }


  // WeakMap
  // -------

  var PrivateMap;
  if (typeof WeakMap !== "undefined") {
    //use weakmap if defined
    PrivateMap = WeakMap;
  } else {
    //else use ses like shim of WeakMap
    var HIDDEN_PREFIX = "__weakmap:" + (Math.random() * 1000000000 >>> 0), counter = new Date().getTime() % 1000000000, mascot = {};

    PrivateMap = function () {
      this.name = HIDDEN_PREFIX + (Math.random() * 1000000000 >>> 0) + (counter++ + "__");
    };

    PrivateMap.prototype = {
      has: function (key) {
        return key && key.hasOwnProperty(this.name);
      },

      get: function (key) {
        var value = key && key[this.name];
        return value === mascot ? undefined : value;
      },

      set: function (key, value) {
        Object.defineProperty(key, this.name, {
          value: typeof value === "undefined" ? mascot : value,
          enumerable: false,
          writable: true,
          configurable: true
        });
      },

      "delete": function (key) {
        return delete key[this.name];
      }
    };


    var getOwnPropertyName = Object.getOwnPropertyNames;
    Object.defineProperty(Object, "getOwnPropertyNames", {
      value: function fakeGetOwnPropertyNames(obj) {
        return getOwnPropertyName(obj).filter(function (name) {
          return name.substr(0, HIDDEN_PREFIX.length) !== HIDDEN_PREFIX;
        });
      },
      writable: true,
      enumerable: false,
      configurable: true
    });
  }


  // Internal Properties
  // -------------------

  // An ordered list used to provide a deterministic ordering in which callbacks are called.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#observercallbacks)
  var observerCallbacks = [];

  // This object is used as the prototype of all the notifiers that are returned by Object.getNotifier(O).
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#notifierprototype)
  var NotifierPrototype = Object.create(Object.prototype);

  // Used to store immediate uid reference
  var changeDeliveryImmediateUid;

  // Used to schedule a call to _deliverAllChangeRecords
  function setUpChangesDelivery() {
    clearImmediate(changeDeliveryImmediateUid);
    changeDeliveryImmediateUid = setImmediate(_deliverAllChangeRecords);
  }

  Object.defineProperty(NotifierPrototype, "notify", {
    value: function notify(changeRecord) {
      var notifier = this;
      if (Object(notifier) !== notifier) {
        throw new TypeError("this must be an Object, given " + notifier);
      }
      if (!notifier.__target) {
        return;
      }
      if (Object(changeRecord) !== changeRecord) {
        throw new TypeError("changeRecord must be an Object, given " + changeRecord);
      }


      var type = changeRecord.type;
      if (typeof type !== "string") {
        throw new TypeError("changeRecord.type must be a string, given " + type);
      }

      var changeObservers = changeObserversMap.get(notifier);
      if (!changeObservers || changeObservers.length === 0) {
        return;
      }
      var target = notifier.__target, newRecord = Object.create(Object.prototype, {
        object: {
          value: target,
          writable: false,
          enumerable: true,
          configurable: false
        }
      });
      for (var prop in changeRecord) {
        if (prop !== "object") {
          var value = changeRecord[prop];
          Object.defineProperty(newRecord, prop, {
            value: value,
            writable: false,
            enumerable: true,
            configurable: false
          });
        }
      }
      Object.preventExtensions(newRecord);
      _enqueueChangeRecord(notifier.__target, newRecord);
    },
    writable: true,
    enumerable: false,
    configurable: true
  });

  Object.defineProperty(NotifierPrototype, "performChange", {
    value: function performChange(changeType, changeFn) {
      var notifier = this;
      if (Object(notifier) !== notifier) {
        throw new TypeError("this must be an Object, given " + notifier);
      }
      if (!notifier.__target) {
        return;
      }
      if (typeof changeType !== "string") {
        throw new TypeError("changeType must be a string given " + notifier);
      }
      if (typeof changeFn !== "function") {
        throw new TypeError("changeFn must be a function, given " + changeFn);
      }

      _beginChange(notifier.__target, changeType);
      var error, changeRecord;
      try {
        changeRecord = changeFn.call(undefined);
      } catch (e) {
        error = e;
      }
      _endChange(notifier.__target, changeType);
      if (typeof error !== "undefined") {
        throw error;
      }

      var changeObservers = changeObserversMap.get(notifier);
      if (changeObservers.length === 0) {
        return;
      }

      var target = notifier.__target, newRecord = Object.create(Object.prototype, {
        object: {
          value: target,
          writable: false,
          enumerable: true,
          configurable: false
        },
        type: {
          value: changeType,
          writable: false,
          enumerable: true,
          configurable: false
        }
      });
      if (typeof changeRecord !== "undefined") {
        for (var prop in changeRecord) {
          if (prop !== "object" && prop !== "type") {
            var value = changeRecord[prop];
            Object.defineProperty(newRecord, prop, {
              value: value,
              writable: false,
              enumerable: true,
              configurable: false
            });
          }
        }
      }

      Object.preventExtensions(newRecord);
      _enqueueChangeRecord(notifier.__target, newRecord);
    },
    writable: true,
    enumerable: false,
    configurable: true
  });

  // Implementation of the internal algorithm 'BeginChange'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#beginchange)
  function _beginChange(object, changeType) {
    var notifier = Object.getNotifier(object), activeChanges = activeChangesMap.get(notifier), changeCount = activeChangesMap.get(notifier)[changeType];
    activeChanges[changeType] = typeof changeCount === "undefined" ? 1 : changeCount + 1;
  }

  // Implementation of the internal algorithm 'EndChange'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#endchange)
  function _endChange(object, changeType) {
    var notifier = Object.getNotifier(object), activeChanges = activeChangesMap.get(notifier), changeCount = activeChangesMap.get(notifier)[changeType];
    activeChanges[changeType] = changeCount > 0 ? changeCount - 1 : 0;
  }

  // Implementation of the internal algorithm 'ShouldDeliverToObserver'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#shoulddelivertoobserver)
  function _shouldDeliverToObserver(activeChanges, acceptList, changeType) {
    var doesAccept = false;
    if (acceptList) {
      for (var i = 0, l = acceptList.length; i < l; i++) {
        var accept = acceptList[i];
        if (activeChanges[accept] > 0) {
          return false;
        }
        if (accept === changeType) {
          doesAccept = true;
        }
      }
    }
    return doesAccept;
  }


  // Map used to store corresponding notifier to an object
  var notifierMap = new PrivateMap(), changeObserversMap = new PrivateMap(), activeChangesMap = new PrivateMap();

  // Implementation of the internal algorithm 'GetNotifier'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#getnotifier)
  function _getNotifier(target) {
    if (!notifierMap.has(target)) {
      var notifier = Object.create(NotifierPrototype);
      // we does not really need to hide this, since anyway the host object is accessible from outside of the
      // implementation. we just make it unwritable
      Object.defineProperty(notifier, "__target", { value: target });
      changeObserversMap.set(notifier, []);
      activeChangesMap.set(notifier, {});
      notifierMap.set(target, notifier);
    }
    return notifierMap.get(target);
  }



  // map used to store reference to a list of pending changeRecords
  // in observer callback.
  var pendingChangesMap = new PrivateMap();

  // Implementation of the internal algorithm 'EnqueueChangeRecord'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#enqueuechangerecord)
  function _enqueueChangeRecord(object, changeRecord) {
    var notifier = Object.getNotifier(object), changeType = changeRecord.type, activeChanges = activeChangesMap.get(notifier), changeObservers = changeObserversMap.get(notifier);

    for (var i = 0, l = changeObservers.length; i < l; i++) {
      var observerRecord = changeObservers[i], acceptList = observerRecord.accept;
      if (_shouldDeliverToObserver(activeChanges, acceptList, changeType)) {
        var observer = observerRecord.callback, pendingChangeRecords = [];
        if (!pendingChangesMap.has(observer)) {
          pendingChangesMap.set(observer, pendingChangeRecords);
        } else {
          pendingChangeRecords = pendingChangesMap.get(observer);
        }
        pendingChangeRecords.push(changeRecord);
      }
    }
    setUpChangesDelivery();
  }

  // map used to store a count of associated notifier to a function
  var attachedNotifierCountMap = new PrivateMap();

  // Remove reference all reference to an observer callback,
  // if this one is not used anymore.
  // In the proposal the ObserverCallBack has a weak reference over observers,
  // Without this possibility we need to clean this list to avoid memory leak
  function _cleanObserver(observer) {
    if (!attachedNotifierCountMap.get(observer) && !pendingChangesMap.has(observer)) {
      attachedNotifierCountMap["delete"](observer);
      var index = observerCallbacks.indexOf(observer);
      if (index !== -1) {
        observerCallbacks.splice(index, 1);
      }
    }
  }

  // Implementation of the internal algorithm 'DeliverChangeRecords'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#deliverchangerecords)
  function _deliverChangeRecords(observer) {
    var pendingChangeRecords = pendingChangesMap.get(observer);
    pendingChangesMap["delete"](observer);
    if (!pendingChangeRecords || pendingChangeRecords.length === 0) {
      return false;
    }
    try {
      observer.call(undefined, pendingChangeRecords);
    } catch (e) {}

    _cleanObserver(observer);
    return true;
  }

  // Implementation of the internal algorithm 'DeliverAllChangeRecords'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#deliverallchangerecords)
  function _deliverAllChangeRecords() {
    var observers = observerCallbacks.slice();
    var anyWorkDone = false;
    for (var i = 0, l = observers.length; i < l; i++) {
      var observer = observers[i];
      if (_deliverChangeRecords(observer)) {
        anyWorkDone = true;
      }
    }
    return anyWorkDone;
  }


  Object.defineProperties(Object, {
    // Implementation of the public api 'Object.observe'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.observe)
    observe: {
      value: function observe(target, callback, accept) {
        if (Object(target) !== target) {
          throw new TypeError("target must be an Object, given " + target);
        }
        if (typeof callback !== "function") {
          throw new TypeError("observer must be a function, given " + callback);
        }
        if (Object.isFrozen(callback)) {
          throw new TypeError("observer cannot be frozen");
        }

        var acceptList;
        if (typeof accept === "undefined") {
          acceptList = ["add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions"];
        } else {
          if (Object(accept) !== accept) {
            throw new TypeError("accept must be an object, given " + accept);
          }
          var len = accept.length;
          if (typeof len !== "number" || len >>> 0 !== len || len < 1) {
            throw new TypeError("the 'length' property of accept must be a positive integer, given " + len);
          }

          var nextIndex = 0;
          acceptList = [];
          while (nextIndex < len) {
            var next = accept[nextIndex];
            if (typeof next !== "string") {
              throw new TypeError("accept must contains only string, given" + next);
            }
            acceptList.push(next);
            nextIndex++;
          }
        }


        var notifier = _getNotifier(target), changeObservers = changeObserversMap.get(notifier);

        for (var i = 0, l = changeObservers.length; i < l; i++) {
          if (changeObservers[i].callback === callback) {
            changeObservers[i].accept = acceptList;
            return target;
          }
        }

        changeObservers.push({
          callback: callback,
          accept: acceptList
        });

        if (observerCallbacks.indexOf(callback) === -1) {
          observerCallbacks.push(callback);
        }
        if (!attachedNotifierCountMap.has(callback)) {
          attachedNotifierCountMap.set(callback, 1);
        } else {
          attachedNotifierCountMap.set(callback, attachedNotifierCountMap.get(callback) + 1);
        }
        return target;
      },
      writable: true,
      configurable: true
    },

    // Implementation of the public api 'Object.unobseve'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.unobseve)
    unobserve: {
      value: function unobserve(target, callback) {
        if (Object(target) !== target) {
          throw new TypeError("target must be an Object, given " + target);
        }
        if (typeof callback !== "function") {
          throw new TypeError("observer must be a function, given " + callback);
        }
        var notifier = _getNotifier(target), changeObservers = changeObserversMap.get(notifier);
        for (var i = 0, l = changeObservers.length; i < l; i++) {
          if (changeObservers[i].callback === callback) {
            changeObservers.splice(i, 1);
            attachedNotifierCountMap.set(callback, attachedNotifierCountMap.get(callback) - 1);
            _cleanObserver(callback);
            break;
          }
        }
        return target;
      },
      writable: true,
      configurable: true
    },

    // Implementation of the public api 'Object.deliverChangeRecords'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.deliverchangerecords)
    deliverChangeRecords: {
      value: function deliverChangeRecords(observer) {
        if (typeof observer !== "function") {
          throw new TypeError("callback must be a function, given " + observer);
        }
        while (_deliverChangeRecords(observer)) {}
      },
      writable: true,
      configurable: true
    },

    // Implementation of the public api 'Object.getNotifier'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.getnotifier)
    getNotifier: {
      value: function getNotifier(target) {
        if (Object(target) !== target) {
          throw new TypeError("target must be an Object, given " + target);
        }
        if (Object.isFrozen(target)) {
          return null;
        }
        return _getNotifier(target);
      },
      writable: true,
      configurable: true
    }

  });
})(typeof global !== "undefined" ? global : this);



//    Copyright 2012 Kap IT (http://www.kapit.fr/)
//
//    Licensed under the Apache License, Version 2.0 (the 'License');
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an 'AS IS' BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//    Author : François de Campredon (http://francois.de-campredon.fr/),

// ObjectUtils
// ===========

(function (global) {
  "use strict";

  /**
   * @namespace
   */
  var ObserveUtils;
  if (typeof exports !== "undefined") {
    ObserveUtils = exports;
  } else {
    ObserveUtils = global.ObserveUtils = {};
  }

  // Utilities
  // ---------


  // borrowing some array methods
  var arrSlice = Function.call.bind(Array.prototype.slice), arrMap = Function.call.bind(Array.prototype.map);

  // return true if the given property descriptor contains accessor
  function isAccessorDescriptor(desc) {
    if (typeof desc === "undefined") {
      return false;
    }
    return ("get" in desc || "set" in desc);
  }



  // getPropertyDescriptor shim
  // copied from [es6-shim](https://github.com/paulmillr/es6-shim)
  function getPropertyDescriptor(target, name) {
    var pd = Object.getOwnPropertyDescriptor(target, name), proto = Object.getPrototypeOf(target);
    while (typeof pd === "undefined" && proto !== null) {
      pd = Object.getOwnPropertyDescriptor(proto, name);
      proto = Object.getPrototypeOf(proto);
    }
    return pd;
  }



  // egal shim
  // copied from [the ecmascript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:egal)
  function sameValue(x, y) {
    if (x === y) {
      // 0 === -0, but they are not identical
      return x !== 0 || 1 / x === 1 / y;
    }

    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN('foo') => true
    return x !== x && y !== y;
  }

  // cast a value as number, and test if the obtained result
  // is a positive finite integer, throw an error otherwise
  function isPositiveFiniteInteger(value, errorMessage) {
    value = Number(value);
    if (isNaN(value) || !isFinite(value) || value < 0 || value % 1 !== 0) {
      throw new RangeError(errorMessage.replace("$", value));
    }
    return value;
  }

  // defineObservableProperties Implementation
  // ------------------------------------------

  // Uid generation helper
  var uidCounter = 0;

  // Define a property on an object that will call the Notifier.notify method when updated
  function defineObservableProperty(target, property, originalValue) {
    //we store the value in an non-enumerable property with generated unique name
    var internalPropName = "_" + (uidCounter++) + property;

    if (target.hasOwnProperty(property)) {
      Object.defineProperty(target, internalPropName, {
        value: originalValue,
        writable: true,
        enumerable: false,
        configurable: true
      });
    }

    //then we create accessor method for our 'hidden' property,
    // that dispatch changesRecords when the value is updated
    Object.defineProperty(target, property, {
      get: function () {
        return this[internalPropName];
      },
      set: function (value) {
        if (!sameValue(value, this[internalPropName])) {
          var oldValue = this[internalPropName];
          Object.defineProperty(this, internalPropName, {
            value: value,
            writable: true,
            enumerable: false,
            configurable: true
          });
          var notifier = Object.getNotifier(this);
          notifier.notify({ type: "update", name: property, oldValue: oldValue });
        }
      },
      enumerable: true,
      configurable: true
    });
  }


  // call defineObservableProperty for each property name passed as 'rest argument'

  /**
   * Define observable properties on the given object an return it.
   *
   * @param {Object} target
   * @param {...string} properties
   * @returns {Object}
   */
  ObserveUtils.defineObservableProperties = function defineObservableProperties(target, properties) {
    if (Object(target) !== target) {
      throw new TypeError("target must be an Object, given " + target);
    }
    properties = arrSlice(arguments, 1);
    while (properties.length > 0) {
      var property = properties.shift(), descriptor = getPropertyDescriptor(target, property);

      if (!descriptor || !isAccessorDescriptor(descriptor)) {
        var originalValue = descriptor && descriptor.value;
        defineObservableProperty(target, property, originalValue);
      }
    }
    return target;
  };



  // List Implementation
  // ------------------------------------------

  /**
   *
   * @param length
   * @returns {*}
   * @constructor
   * @function
   */
  function List(length) {
    if (arguments.length === 0) {
      length = 0;
    }

    // in this case we create a list with a given length
    if (arguments.length <= 1 && typeof length === "number") {
      if (this instanceof List) {
        this.length = length;
      } else {
        return new List(length);
      }
    } else {
      //here we create a list with initial values
      if (!(this instanceof List)) {
        return List.fromArray(arrSlice(arguments));
      } else {
        for (var i = 0, l = arguments.length; i < l; i++) {
          this[i] = arguments[i];
        }
        this.length = arguments.length;
      }
    }
  }

  /**
   * Observe a list
   * @param {List} list
   * @param {function} observer
   */
  List.observe = function observe(list, observer) {
    Object.observe(list, observer, ["add", "update", "delete", "splice"]);
  };


  /**
   * Unobserve a list
   * @param {List} list
   * @param {function} observer
   */
  List.unobserve = function unobserve(list, observer) {
    Object.unobserve(list, observer);
  };

  /**
   * Create a list from a given array
   * @param array
   * @returns {List}
   */
  List.fromArray = function fromArray(array) {
    if (!Array.isArray(array)) {
      throw new Error();
    }

    var list = new List();
    for (var i = 0, l = array.length; i < l; i++) {
      list[i] = array[i];
    }
    list.length = array.length;
    return list;
  };

  Object.defineProperties(List.prototype, {
    /**
     * hidden value holder for the length property
     * @private
     */
    _length: {
      value: 0,
      enumerable: false,
      configurable: true,
      writable: true
    },
    /**
     * the length of the list
     * @property {number} length
     */
    length: {
      get: function () {
        return this._length;
      },
      set: function (value) {
        value = isPositiveFiniteInteger(value, "Invalid  list length : $");
        var notifier = Object.getNotifier(this), oldValue = this._length, removed = [], self = this;
        if (value !== oldValue) {
          notifier.performChange("splice", function () {
            Object.defineProperty(self, "_length", {
              value: value,
              enumerable: false,
              configurable: true,
              writable: true
            });

            var returnValue;
            if (oldValue > value) {
              //delete values if the length have been decreased
              for (var i = value; i < oldValue; i++) {
                removed.push(self[i]);
                self["delete"](i);
              }
              returnValue = {
                index: value,
                removed: removed,
                addedCount: 0
              };
            } else {
              returnValue = {
                index: oldValue,
                removed: removed,
                addedCount: value - oldValue
              };
            }
            notifier.notify({ type: "update", name: "length", oldValue: oldValue });

            return returnValue;
          });
        }
      },
      enumerable: true,
      configurable: true
    }
  });

  /**
   * Returns an Array copy of the list
   * @returns {Array}
   */
  List.prototype.toArray = function toArray() {
    return arrSlice(this);
  };

  /**
   * Returns an string representation of the list
   * @returns {string}
   */
  List.prototype.toString = function toString() {
    return this.toArray().toString();
  };


  /**
   * Returns an json representation of the list
   * @returns {string}
   */
  List.prototype.toJSON = function toJSON() {
    return this.toArray();
  };

  /**
   * set the givent value at the specified index.
   * @param {number} index
   * @param {*} value
   * @return {*}
   */
  List.prototype.set = function set(index, value) {
    index = isPositiveFiniteInteger(index, "Invalid index : $");

    var notifier = Object.getNotifier(this), len = this.length, self = this;
    if (index >= len) {
      notifier.performChange("splice", function () {
        self[index] = value;
        notifier.notify({ type: "add", name: index });
        Object.defineProperty(self, "_length", {
          value: index + 1,
          enumerable: false,
          configurable: true,
          writable: true
        });
        notifier.notify({ type: "update", name: "length", oldValue: len });

        return {
          index: len,
          removed: [],
          addedCount: self.length - len
        };
      });
    } else if (!sameValue(value, this[index])) {
      var oldValue = this[index];
      this[index] = value;
      notifier.notify({ type: "update", name: index, oldValue: oldValue });
    }
    return value;
  };

  /**
   * delete the value at the specified index.
   * @param {number} index
   * @return {boolean}
   */
  List.prototype["delete"] = function del(index) {
    index = isPositiveFiniteInteger(index, "Invalid index : $");
    if (this.hasOwnProperty(index)) {
      var oldValue = this[index];
      if (delete this[index]) {
        var notifier = Object.getNotifier(this);
        notifier.notify({ type: "delete", name: index, oldValue: oldValue });
        return true;
      }
    }
    return false;
  };

  /**
   * create a new list resulting of the concatenation of all the List and array
   * passed as parameter with the addition of other values passed as parameter
   * @param {...*} args
   * @return {List}
   */
  List.prototype.concat = function concat(args) {
    args = arrMap(arguments, function (item) {
      return (item instanceof List) ? item.toArray() : item;
    });
    return List.fromArray(Array.prototype.concat.apply(this.toArray(), args));
  };

  /**
   * Joins all elements of a List into a string.
   * @param {string} [separator]
   * @return {string}
   */
  List.prototype.join = function join(separator) {
    return this.toArray().join(separator);
  };


  /**
   * Removes the last element from a List and returns that element.
   * @return {*}
   */
  List.prototype.pop = function pop() {
    if (Object(this) !== this) {
      throw new TypeError("this mus be an object given : " + this);
    }
    var len = isPositiveFiniteInteger(this.length, "this must have a finite integer property 'length', given : $");
    if (len === 0) {
      return void (0);
    } else {
      var newLen = len - 1, element = this[newLen], notifier = Object.getNotifier(this), self = this;
      notifier.performChange("splice", function () {
        delete self[newLen];
        notifier.notify({ type: "delete", name: newLen, oldValue: element });
        Object.defineProperty(self, "_length", {
          value: newLen,
          enumerable: false,
          configurable: true,
          writable: true
        });
        notifier.notify({ type: "update", name: "length", oldValue: len });

        return {
          index: newLen,
          removed: [element],
          addedCount: 0
        };
      });


      return element;
    }
  };

  /**
   * Mutates a List by appending the given elements and returning the new length of the array.
   * @param {...*} items
   * @return {number}
   */
  List.prototype.push = function push() {
    if (arguments.length > 0) {
      var argumentsLength = arguments.length, elements = arguments, len = this.length, notifier = Object.getNotifier(this), self = this, i, index;
      notifier.performChange("splice", function () {
        for (i = 0; i < argumentsLength; i++) {
          index = len + i;
          // avoid the usage of the set function and manually
          // set the value and notify the changes to avoid the notification of
          // multiple length modification
          self[index] = elements[i];
          notifier.notify({
            type: "add",
            name: index
          });
        }
        Object.defineProperty(self, "_length", {
          value: len + argumentsLength,
          enumerable: false,
          configurable: true,
          writable: true
        });
        notifier.notify({ type: "update", name: "length", oldValue: len });
        return {
          index: len,
          removed: [],
          addedCount: argumentsLength
        };
      });
    }
    return this.length;
  };

  /**
   * Reverses a List in place.  The first List element becomes the last and the last becomes the first.
   * @return {List}
   */
  List.prototype.reverse = function reverse() {
    var copy = this.toArray(), arr = copy.slice().reverse();

    for (var i = 0, l = arr.length; i < l; i++) {
      this.set(i, arr[i]);
    }

    return this;
  };

  /**
   * Removes the first element from a List and returns that element. This method changes the length of the List.
   * @return {*}
   */
  List.prototype.shift = function () {
    if (this.length === 0) {
      return void (0);
    }

    var arr = this.toArray(), element = arr.shift(), notifier = Object.getNotifier(this), self = this, len = this.length;
    notifier.performChange("splice", function () {
      for (var i = 0, l = arr.length; i < l; i++) {
        self.set(i, arr[i]);
      }
      self["delete"](len - 1);

      Object.defineProperty(self, "_length", {
        value: len - 1,
        enumerable: false,
        configurable: true,
        writable: true
      });
      notifier.notify({ type: "update", name: "length", oldValue: len });

      return {
        index: 0,
        removed: [element],
        addedCount: 0
      };
    });


    return element;
  };

  /**
   * Returns a shallow copy of a portion of an List.
   * @param {number} [start]
   * @param {number} [end]
   * @return {List}
   */
  List.prototype.slice = function (start, end) {
    return List.fromArray(this.toArray().slice(start, end));
  };

  /**
   * Sorts the elements of a List in place and returns the List.
   * @param {function} [compareFn]
   * @return {List}
   */
  List.prototype.sort = function (compareFn) {
    var copy = this.toArray(), arr = copy.slice().sort(compareFn);
    for (var i = 0, l = arr.length; i < l; i++) {
      this.set(i, arr[i]);
    }
    return this;
  };

  /**
   * Changes the content of a List, adding new elements while removing old elements.
   * @return {List}
   */
  List.prototype.splice = function () {
    var returnValue = [], argumentsLength = arguments.length;

    if (argumentsLength > 0) {
      var arr = this.toArray(), notifier = Object.getNotifier(this), len = this.length, self = this, index = arguments[0], i, l;

      returnValue = Array.prototype.splice.apply(arr, arguments);
      notifier.performChange("splice", function () {
        for (i = 0, l = arr.length; i < l; i++) {
          var oldValue = self[i];
          if (!sameValue(oldValue, arr[i])) {
            self[i] = arr[i];
            notifier.notify(i >= len ? { type: "add", name: i } : { type: "update", name: i, oldValue: oldValue });
          }
        }


        if (len !== arr.length) {
          if (len > arr.length) {
            //delete values if the length have been decreased
            for (i = arr.length; i < len; i++) {
              self["delete"](i);
            }
          }

          Object.defineProperty(self, "_length", {
            value: arr.length,
            enumerable: false,
            configurable: true,
            writable: true
          });
          notifier.notify({ type: "update", name: "length", oldValue: len });
        }
        return {
          index: index,
          removed: returnValue,
          addedCount: argumentsLength >= 2 ? argumentsLength - 2 : 0
        };
      });
    }
    return List.fromArray(returnValue);
  };

  /**
   * Adds one or more elements to the beginning of a List and returns the new length of the List.
   * @return {number}
   */
  List.prototype.unshift = function () {
    var argumentsLength = arguments.length;
    if (argumentsLength > 0) {
      var arr = this.toArray(), notifier = Object.getNotifier(this), len = this.length, self = this;

      Array.prototype.unshift.apply(arr, arguments);
      notifier.performChange("splice", function () {
        for (var i = 0, l = arr.length; i < l; i++) {
          var oldValue = self[i];
          if (!sameValue(oldValue, arr[i])) {
            // avoid the usage of the set function and manually
            // set the value and notify the changes to avoid the notification of
            // multiple length modification
            self[i] = arr[i];
            notifier.notify(i >= len ? { type: "add", name: i } : { type: "update", name: i, oldValue: oldValue });
          }
        }

        if (len !== arr.length) {
          if (len > arr.length) {
            //delete values if the length have been decreased
            for (i = arr.length; i < len; i++) {
              self["delete"](i);
            }
          }
          Object.defineProperty(self, "_length", {
            value: arr.length,
            enumerable: false,
            configurable: true,
            writable: true
          });
          notifier.notify({ type: "update", name: "length", oldValue: len });
        }

        return {
          index: 0,
          removed: [],
          addedCount: argumentsLength
        };
      });
    }
    return this.length;
  };

  /**
   * Apply a function against an accumulator and each value of the List (from left-to-right) as to reduce it to a single value.
   * @param {function} callback
   * @param {Object} [initialValue]
   * @return {Object}
   */
  List.prototype.reduce = Array.prototype.reduce;

  /**
   * Apply a function simultaneously against two values of the array (from right-to-left) as to reduce it to a single value.
   * @param {function} callback
   * @param {Object} [initialValue]
   * @return {Object}
   */
  List.prototype.reduceRight = Array.prototype.reduceRight;

  /**
   * Returns the first index at which a given element can be found in the List, or -1 if it is not present.
   * @param {Object} searchElement
   * @param {number} [fromIndex]
   * @return {number}
   */
  List.prototype.indexOf = Array.prototype.indexOf;

  /**
   * Returns the last index at which a given element can be found in the List, or -1 if it is not present. The List is searched backwards, starting at fromIndex.
   * @param {Object} searchElement
   * @param {number} [fromIndex]
   * @return {number}
   */
  List.prototype.lastIndexOf = Array.prototype.lastIndexOf;

  /**
   * Tests whether all elements in the List pass the test implemented by the provided function.
   * @param {function} callback
   * @param {Object} [thisObject]
   * @return {boolean}
   */
  List.prototype.every = Array.prototype.every;

  /**
   * Creates a new List with all elements that pass the test implemented by the provided function
   * @param {function} callback
   * @param {Object} [thisObject]
   * @return {List}
   */
  List.prototype.filter = function (callback, thisObject) {
    return List.fromArray(this.toArray().filter(callback, thisObject));
  };

  /**
   * Executes a provided function once per List element.
   * @param {function} callback
   * @param {Object} [thisObject]
   * @return {void}
   */
  List.prototype.forEach = Array.prototype.forEach;

  /**
   * Creates a new List with the results of calling a provided function on every element in this List.
   * @param {function} callback
   * @param {Object} [thisObject]
   * @return {List}
   */
  List.prototype.map = function (callback, thisObject) {
    return List.fromArray(this.toArray().map(callback, thisObject));
  };

  /**
   * Tests whether some element in the List passes the test implemented by the provided function.
   * @param {function} callback
   * @param {Object} [thisObject]
   * @return {boolean}
   */
  List.prototype.some = Array.prototype.some;

  ObserveUtils.List = List;
})(this);
/**
 * Model
 */
var Model = (function () {
  var Model = function Model(properties) {
    var _this = this;
    properties = properties || {};

    for (var key in properties) {
      this[key] = properties[key];
    }

    this.observableProperties = {};

    Object.observe(this, function (changes) {
      changes.forEach(function (change) {
        var handlers = _this.observableProperties[change.name];
        if (handlers) {
          handlers.forEach(function (handler) {
            handler(change);
          });
        }
      });
    });
  };

  Model.prototype.on = function (property, handler) {
    if (typeof handler !== "function") {
      return;
    }

    if (!this.observableProperties[property]) {
      ObserveUtils.defineObservableProperties(this, property);
      this.observableProperties[property] = [];
    }

    this.observableProperties[property].push(handler);
  };

  return Model;
})();

/**
 * View
 */
var events = {};

var View = (function () {
  var View = function View(options) {
    options = options || {};

    for (var key in options) {
      this[key] = options[key];
    }

    if (!this.el) {
      this.el = document.createElement("div");
    }
  };

  View.prototype.init = function (controller) {
    this.controller = controller;

    return this;
  };

  View.prototype.layout = function (template) {
    return template;
  };

  View.prototype.render = function (params) {
    var innerHTML = "";

    if (params) {
      if (typeof params === "object") {
        for (var index in params) {
          var param = params[index];
          innerHTML += this.template(param);
        }
      } else {
        for (var i = 0; i < params.length; i++) {
          var param = params[i];
          innerHTML += this.template(param);
        }
      }
    } else {
      innerHTML = this.template();
    }

    this.el.innerHTML = this.layout(innerHTML);
  };

  View.prototype.template = function () {
    return "";
  };

  View.prototype.$ = function (selector) {
    return this.el.querySelector(selector);
  };

  View.prototype.$$ = function (selector) {
    return this.el.querySelectorAll(selector);
  };

  View.prototype.on = function (type, selector, handler, scope) {
    var controller = this.controller;
    scope = scope || this.el;

    if (!events[type]) {
      events[type] = [];
      window.addEventListener(type, delegateHandler, true);
    }

    events[type].push({
      selector: selector,
      handler: handler,
      controller: controller,
      scope: scope
    });
  };

  View.prototype.off = function (type, selector, handler) {
    if (!events[type]) {
      return;
    }

    events[type] = events[type].filter(function (delegate) {
      if (typeof handler === "function") {
        return delegate.selector !== selector || delegate.handler !== handler;
      }

      return delegate.selector !== selector;
    });
  };

  return View;
})();

/**
 * Forward an event based on the target's `[data-action]` attr to the controller.
 * e.g. "click" on a `<button data-action="cancel">` goes to controller.cancel()
 */
function handleAction(event, controller) {
  var action = event.target.dataset.action;
  if (controller && controller[action]) {
    controller[action](event);
  }
}

function delegateHandler(event) {
  var target = event.target;

  events[event.type].forEach(function (delegate) {
    if (delegate.scope.contains(target) && target.matches(delegate.selector)) {
      if (delegate.handler) {
        delegate.handler.call(target, event);
      } else {
        handleAction(event, delegate.controller);
      }
    }
  });
}

/**
 * Controller
 */
var Controller = (function () {
  var Controller = function Controller(options) {
    options = options || {};

    for (var key in options) {
      this[key] = options[key];
    }

    // Initialize the view (if applicable) when the
    // controller is instantiated.
    if (this.view && typeof this.view.init === "function") {
      this.view.init(this);
    }
  };

  Controller.prototype.teardown = function () {};

  Controller.prototype.main = function () {};

  return Controller;
})();

var RoutingController = (function (Controller) {
  var RoutingController = function RoutingController(controllers) {
    if (window.routingController) {
      console.error("Document can only contain one RoutingController");
      return;
    }

    Controller.call(this);
    this._controllers = controllers;
    this.activeController = null;
    window.routingController = this;
    window.addEventListener("hashchange", this.route.bind(this));
  };

  _extends(RoutingController, Controller);

  RoutingController.prototype.route = function () {
    var route = window.location.hash.slice(1);
    var controller = this._controllers[route];
    if (controller) {
      if (this.activeController) {
        this.activeController.teardown();
      }

      this.activeController = controller;
      controller.main();
    }
  };

  RoutingController.prototype.controller = function (id) {
    return this._controllers[id];
  };

  return RoutingController;
})(Controller);

/**
 * Service
 */
var Service = (function () {
  var Service = function Service() {
    this._listeners = {};
    this._dispatchedEvents = {};
  };

  Service.prototype.addEventListener = function (name, callback, trigger) {
    var _this2 = this;
    if (!this._listeners[name]) {
      this._listeners[name] = [callback];
    } else {
      this._listeners[name].push(callback);
    }

    if (trigger && this._dispatchedEvents[name] !== undefined) {
      setTimeout(function () {
        callback(_this2._dispatchedEvents[name]);
      });
    }
  };

  Service.prototype.removeEventListener = function (name, callback) {
    if (!this._listeners[name]) {
      return;
    }

    var listenerIndex;
    this._listeners[name].find(function (listener, index) {
      if (listener === callback) {
        listenerIndex = index;
      }

      return listenerIndex !== undefined;
    });

    if (listenerIndex !== undefined) {
      this._listeners[name].splice(listenerIndex, 1);
    }
  };

  Service.prototype._dispatchEvent = function (name, params) {
    if (!this._listeners[name]) {
      return;
    }

    this._dispatchedEvents[name] = params || null;

    this._listeners[name].forEach(function (listener) {
      listener(params);
    });
  };

  return Service;
})();

/*jshint esnext:true*/
;(function (g, n, f) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    define(f);
  } else {
    g[n] = f();
  }
}(this, "Gesture", function () {
  var Gesture = {
    DEBUG: false
  };

  function debug() {
    var args = _slice.call(arguments);

    if (Gesture.DEBUG) {
      console.log.apply(console, ["[Gesture]"].concat(_toArray(args)));
    }
  }

  // Return a promise that will resolve when the specified gesture is
  // detected. Note that the gesture is detected only once. You must call
  // this function again if you want to detect it again. The returned
  // promise will have a cancel() method on it. When called, gesture
  // detection stops and the promise is rejected.
  function detect(gestureSpec) {
    // These are the states of the gesture detector
    var NOT_STARTED = 0; // We have not detected the gesture start yet
    var STARTED = 1; // Gesture has begun but has not finished
    var FINISHED = 2; // Gesture finished or was cancelled

    var state; // Current gesture detection state
    var startEvent; // The touchstart event that started the gesture

    var promise; // The promise we return;
    var promiseResolver; // The resolve function for the promise
    var promiseRejector; // The reject function for the promise

    /*
     * Functions init(), start(), fail(), succeed(), cancel() and cleanup()
     * below handle state transitions between NOT_STARTED, STARTED and
     * FINISHED and also register and unregister event handlers, and
     * resolve or reject the promise.
     */

    // Call this function once to start listening.
    function init() {
      debug("Initializing");
      // Set our initial state
      state = NOT_STARTED;

      // Register a capturing event listener for touchstart events.
      // This is the only event handler that is registered when
      // we are in the NOT_STARTED state.
      window.addEventListener("touchstart", touchstart, true);
    }

    // Called when we detect that the gesture has started because
    // the right number of fingers are in the starting zone.
    // It registers handlers for touchmove and touchend and sets
    // the state to STARTED.
    function start() {
      debug("Start of gesture detected");
      state = STARTED;
      window.addEventListener("touchmove", touchmove, true);
      window.addEventListener("touchend", touchend, true);
    }

    // This is called when the gesture fails (an additional finger
    // is added, for example, or the time limit is exceeded). It
    // unregisters the touchmove and touchend handlers and resets
    // the state to NOT_STARTED where it continues listening for new
    // touches.
    function fail(why) {
      debug("Gesture did not complete:", why);
      state = NOT_STARTED;
      window.removeEventListener("touchmove", touchmove, true);
      window.removeEventListener("touchend", touchend, true);
    }

    // This is called when the gesture is successfully detected.
    // It resolves the promise and cleans up any listeners.
    // The data argument contains information about the gesture that
    // is used to resolve the promise.
    function succeed(data) {
      debug("Gesture completed:", data);
      cleanup();
      promiseResolver(data);
    }

    // This is called if the caller cancels gesture detection.
    // It rejects the promise and cleans up any listeners
    function cancel() {
      cleanup();
      promiseRejector("cancelled");
    }

    // Unregister all currently registered event listeners
    function cleanup() {
      state = FINISHED;
      window.removeEventListener("touchstart", touchstart, true);
      window.removeEventListener("touchmove", touchmove, true);
      window.removeEventListener("touchend", touchend, true);
    }

    /*
     * The touchstart(), touchmove(), touchend() functions below handle
     * touch events and call the state transition functions above as
     * appopriate.
     */

    // This is called whenever the user touches the screen.
    // But it doesn't do anything unless this event looks like the
    // start of a gesture.
    function touchstart(e) {
      debug("touch start", e.touches.length);
      // If a gesture has already started and another finger
      // goes down, then this is not the gesture we thought it was,
      // so we cancel it and go back to the initial state
      if (state === STARTED) {
        fail("already started");
        return;
      }

      // Otherwise, check if the current touches meet the gesture
      // start condition, and switch to STARTED if so
      if (isGestureStart(e)) {
        startEvent = e;
        start();
      }
    }

    function touchmove(e) {
      debug(e.type, e.touches.length, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      var gestureData;
      try {
        gestureData = isGestureEnd(startEvent, e);
      } catch (ex) {
        // If isGestureEnd throws an exception, the gesture fails.
        fail(ex.message);
        return;
      }

      // If isGestureEnd returns a truthy value, the gesture succeeds.
      if (gestureData) {
        succeed(gestureData);
      }

      // Otherwise, we just keep listening for more move events
    }

    // Handle touchend events in the same way that we handle touchmove events
    function touchend(e) {
      touchmove(e);
    }

    // Return true if this event marks the start of the specified gesture
    function isGestureStart(event) {
      return Detectors[gestureSpec.type].isGestureStart(gestureSpec, event);
    }

    function isGestureEnd(startEvent, endEvent) {
      return Detectors[gestureSpec.type].isGestureEnd(gestureSpec, startEvent, endEvent);
    }

    // Make sure we know how to detect the specified gesture
    if (!Detectors[gestureSpec.type]) {
      return Promise.reject("Unsupported gesture: " + gestureSpec.type);
    }

    // If we do, then create the promise that we will return
    // and start detecting gestures when the promise is ready

    promise = new Promise(function (resolve, reject) {
      // Store resolve and reject in the outer scope where we can use them
      promiseResolver = resolve;
      promiseRejector = reject;
      init();
    });

    // Add a method to the returned promise that allows the client to
    // stop listening for the gesture
    promise.cancel = cancel;

    return promise;
  }


  // A utility function to determine whether the Touch t is in the region r.
  // Regions are specified in units relative to the window size.
  // (0,0) is the top-left corner of the window and (1,1) is the bottom right.
  function touchInRegion(t, r) {
    var x = t.clientX / window.innerWidth;
    var y = t.clientY / window.innerHeight;
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  }

  var Detectors = {
    swipe: {
      isGestureStart: function isSwipeStart(spec, event) {
        var touches = event.touches;

        // If the number of touches is not correct, this is not a gesture start
        if (touches.length !== spec.numFingers) {
          return false;
        }

        // If any of the touches is in the wrong place,
        // this is not a gesture start
        if (spec.startRegion) {
          for (var i = 0; i < touches.length; i++) {
            var t = touches[i];
            if (!touchInRegion(t, spec.startRegion)) {
              return false;
            }
          }
        }

        // The gesture has started
        return true;
      },

      //
      // This function tests whether the endEvent marks the end of the specified
      // gesture that started with the startEvent. There are three possible
      // outcomes:
      //
      // - if this is the end of the gesture, this function returns an object
      //   that holds information about the gesture, and that object will be
      //   used to resolve the promise.
      //
      // - if endEvent is not the end of the gesture, this function returns
      //   false
      //
      // - if endEvent is indicates that the gesture has failed (for example
      //   if the user's fingers are moving in the wrong direction) then this
      //   function should throw an error which will cause the gesture detector
      //   to reset to its NOT_STARTED state
      //
      isGestureEnd: function isSwipeEnd(spec, startEvent, endEvent) {
        var dt = endEvent.timeStamp - startEvent.timeStamp;
        var startTouches = startEvent.touches;
        var endTouches = endEvent.touches;

        // The gesture fails if:
        // 1) it has taken too long
        // 2) a finger is lifted before success
        // 3) there are the wrong number of touches (that should not happen).
        if (spec.maxTime && dt > spec.maxTime) {
          throw new Error("timeout:" + dt);
        }
        if (endEvent.type === "touchend") {
          throw new Error("touchend");
        }
        if (endTouches.length !== startTouches.length) {
          // This should not happen, but it does happen for unknown reasons
          // See bug 1139575. If we throw an error here it aborts the gesture
          // and makes it hard for the user to swipe on some devices.
          // So instead we just return false and act like it never happened
          // throw new Error('wrong number of touches');
          return false;
        }

        var data = {
          dt: dt,
          fingers: []
        };

        for (var i = 0; i < startTouches.length; i++) {
          var st = startTouches[i];
          var et = endTouches.identifiedTouch(st.identifier);
          if (!et) {
            // this should not happen
            throw new Error("mismatch");
          }

          // If the gesture spec specifies and endRegion and this touch is
          // not in it, then this is not the end of the gesture
          // (For some types of gestures it might be better to specify
          // a minimum and maximum required distance in each direction
          // instead of a end region.)
          if (spec.endRegion && !touchInRegion(et, spec.endRegion)) {
            return false;
          }

          // This touch passes the test, so record it in the data
          data.fingers.push({
            x0: st.clientX,
            y0: st.clientY,
            x1: et.clientX,
            y1: et.clientY
          });
        }

        // If all the touches were okay, then we've found the end of the gesture
        return data;
      }
    }
  };

  Gesture.detect = detect;
  return Gesture;
}));

/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>
  Parsing improvements for brace-less statements by Liam Newman <bitwiseman@gmail.com>


  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          - indentation size,
    indent_char (default space)      - character to indent with,
    preserve_newlines (default true) - whether existing line breaks should be preserved,
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

            jslint_happy        !jslint_happy
            ---------------------------------
            function ()         function()

            switch () {         switch() {
            case 1:               case 1:
              break;                break;
            }                   }

    space_after_anon_function (default false) - should the space before an anonymous function's parens be added, "function()" vs "function ()",
          NOTE: This option is overriden by jslint_happy (i.e. if jslint_happy is true, space_after_anon_function is true by design)

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.

    space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

    unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

    wrap_line_length (default unlimited) - lines should wrap at next opportunity after this number of characters.
          NOTE: This is not a hard limit. Lines will continue until a point where a newline would
                be preserved if it were present.

    end_with_newline (default false)  - end output with a newline


    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });

*/

(function () {
  var acorn = {};
  (function (exports) {
    // This section of code is taken from acorn.
    //
    // Acorn was written by Marijn Haverbeke and released under an MIT
    // license. The Unicode regexps (for identifiers and whitespace) were
    // taken from [Esprima](http://esprima.org) by Ariya Hidayat.
    //
    // Git repositories for Acorn are available at
    //
    //     http://marijnhaverbeke.nl/git/acorn
    //     https://github.com/marijnh/acorn.git

    // ## Character categories

    // Big ugly regular expressions that match characters in the
    // whitespace, identifier, and identifier-start categories. These
    // are only applied when a character is found to actually have a
    // code point above 128.

    var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
    var nonASCIIidentifierStartChars = "\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
    var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
    var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
    var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

    // Whether a single character denotes a newline.

    var newline = exports.newline = /[\n\r\u2028\u2029]/;

    // Matches a whole line break (where CRLF is considered a single
    // line break). Used to count lines.

    var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

    // Test whether a given character code starts an identifier.

    var isIdentifierStart = exports.isIdentifierStart = function (code) {
      if (code < 65) return code === 36;
      if (code < 91) return true;
      if (code < 97) return code === 95;
      if (code < 123) return true;
      return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
    };

    // Test whether a given character is part of an identifier.

    var isIdentifierChar = exports.isIdentifierChar = function (code) {
      if (code < 48) return code === 36;
      if (code < 58) return true;
      if (code < 65) return false;
      if (code < 91) return true;
      if (code < 97) return code === 95;
      if (code < 123) return true;
      return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
    };
  })(acorn);

  function in_array(what, arr) {
    for (var i = 0; i < arr.length; i += 1) {
      if (arr[i] === what) {
        return true;
      }
    }
    return false;
  }

  function trim(s) {
    return s.replace(/^\s+|\s+$/g, "");
  }

  function ltrim(s) {
    return s.replace(/^\s+/g, "");
  }

  function rtrim(s) {
    return s.replace(/\s+$/g, "");
  }

  function js_beautify(js_source_text, options) {
    "use strict";
    var beautifier = new Beautifier(js_source_text, options);
    return beautifier.beautify();
  }

  var MODE = {
    BlockStatement: "BlockStatement", // 'BLOCK'
    Statement: "Statement", // 'STATEMENT'
    ObjectLiteral: "ObjectLiteral", // 'OBJECT',
    ArrayLiteral: "ArrayLiteral", //'[EXPRESSION]',
    ForInitializer: "ForInitializer", //'(FOR-EXPRESSION)',
    Conditional: "Conditional", //'(COND-EXPRESSION)',
    Expression: "Expression" //'(EXPRESSION)'
  };

  function Beautifier(js_source_text, options) {
    "use strict";
    var output;
    var tokens = [], token_pos;
    var Tokenizer;
    var current_token;
    var last_type, last_last_text, indent_string;
    var flags, previous_flags, flag_store;
    var prefix;

    var handlers, opt;
    var baseIndentString = "";

    handlers = {
      TK_START_EXPR: handle_start_expr,
      TK_END_EXPR: handle_end_expr,
      TK_START_BLOCK: handle_start_block,
      TK_END_BLOCK: handle_end_block,
      TK_WORD: handle_word,
      TK_RESERVED: handle_word,
      TK_SEMICOLON: handle_semicolon,
      TK_STRING: handle_string,
      TK_EQUALS: handle_equals,
      TK_OPERATOR: handle_operator,
      TK_COMMA: handle_comma,
      TK_BLOCK_COMMENT: handle_block_comment,
      TK_INLINE_COMMENT: handle_inline_comment,
      TK_COMMENT: handle_comment,
      TK_DOT: handle_dot,
      TK_UNKNOWN: handle_unknown,
      TK_EOF: handle_eof
    };

    function create_flags(flags_base, mode) {
      var next_indent_level = 0;
      if (flags_base) {
        next_indent_level = flags_base.indentation_level;
        if (!output.just_added_newline() && flags_base.line_indent_level > next_indent_level) {
          next_indent_level = flags_base.line_indent_level;
        }
      }

      var next_flags = {
        mode: mode,
        parent: flags_base,
        last_text: flags_base ? flags_base.last_text : "", // last token text
        last_word: flags_base ? flags_base.last_word : "", // last 'TK_WORD' passed
        declaration_statement: false,
        declaration_assignment: false,
        multiline_frame: false,
        if_block: false,
        else_block: false,
        do_block: false,
        do_while: false,
        in_case_statement: false, // switch(..){ INSIDE HERE }
        in_case: false, // we're on the exact line with "case 0:"
        case_body: false, // the indented case-action block
        indentation_level: next_indent_level,
        line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
        start_line_index: output.get_line_number(),
        ternary_depth: 0
      };
      return next_flags;
    }

    // Some interpreters have unexpected results with foo = baz || bar;
    options = options ? options : {};
    opt = {};

    // compatibility
    if (options.braces_on_own_line !== undefined) {
      //graceful handling of deprecated option
      opt.brace_style = options.braces_on_own_line ? "expand" : "collapse";
    }
    opt.brace_style = options.brace_style ? options.brace_style : (opt.brace_style ? opt.brace_style : "collapse");

    // graceful handling of deprecated option
    if (opt.brace_style === "expand-strict") {
      opt.brace_style = "expand";
    }


    opt.indent_size = options.indent_size ? parseInt(options.indent_size, 10) : 4;
    opt.indent_char = options.indent_char ? options.indent_char : " ";
    opt.eol = options.eol ? options.eol : "\n";
    opt.preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
    opt.break_chained_methods = (options.break_chained_methods === undefined) ? false : options.break_chained_methods;
    opt.max_preserve_newlines = (options.max_preserve_newlines === undefined) ? 0 : parseInt(options.max_preserve_newlines, 10);
    opt.space_in_paren = (options.space_in_paren === undefined) ? false : options.space_in_paren;
    opt.space_in_empty_paren = (options.space_in_empty_paren === undefined) ? false : options.space_in_empty_paren;
    opt.jslint_happy = (options.jslint_happy === undefined) ? false : options.jslint_happy;
    opt.space_after_anon_function = (options.space_after_anon_function === undefined) ? false : options.space_after_anon_function;
    opt.keep_array_indentation = (options.keep_array_indentation === undefined) ? false : options.keep_array_indentation;
    opt.space_before_conditional = (options.space_before_conditional === undefined) ? true : options.space_before_conditional;
    opt.unescape_strings = (options.unescape_strings === undefined) ? false : options.unescape_strings;
    opt.wrap_line_length = (options.wrap_line_length === undefined) ? 0 : parseInt(options.wrap_line_length, 10);
    opt.e4x = (options.e4x === undefined) ? false : options.e4x;
    opt.end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
    opt.comma_first = (options.comma_first === undefined) ? false : options.comma_first;


    // force opt.space_after_anon_function to true if opt.jslint_happy
    if (opt.jslint_happy) {
      opt.space_after_anon_function = true;
    }

    if (options.indent_with_tabs) {
      opt.indent_char = "\t";
      opt.indent_size = 1;
    }

    opt.eol = opt.eol.replace(/\\r/, "\r").replace(/\\n/, "\n");

    //----------------------------------
    indent_string = "";
    while (opt.indent_size > 0) {
      indent_string += opt.indent_char;
      opt.indent_size -= 1;
    }

    var preindent_index = 0;
    if (js_source_text && js_source_text.length) {
      while ((js_source_text.charAt(preindent_index) === " " || js_source_text.charAt(preindent_index) === "\t")) {
        baseIndentString += js_source_text.charAt(preindent_index);
        preindent_index += 1;
      }
      js_source_text = js_source_text.substring(preindent_index);
    }

    last_type = "TK_START_BLOCK"; // last token type
    last_last_text = ""; // pre-last token text
    output = new Output(indent_string, baseIndentString);


    // Stack of parsing/formatting states, including MODE.
    // We tokenize, parse, and output in an almost purely a forward-only stream of token input
    // and formatted output.  This makes the beautifier less accurate than full parsers
    // but also far more tolerant of syntax errors.
    //
    // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
    // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
    // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
    // most full parsers would die, but the beautifier gracefully falls back to
    // MODE.BlockStatement and continues on.
    flag_store = [];
    set_mode(MODE.BlockStatement);

    this.beautify = function () {
      /*jshint onevar:true */
      var local_token, sweet_code;
      Tokenizer = new tokenizer(js_source_text, opt, indent_string);
      tokens = Tokenizer.tokenize();
      token_pos = 0;

      while (local_token = get_token()) {
        for (var i = 0; i < local_token.comments_before.length; i++) {
          // The cleanest handling of inline comments is to treat them as though they aren't there.
          // Just continue formatting and the behavior should be logical.
          // Also ignore unknown tokens.  Again, this should result in better behavior.
          handle_token(local_token.comments_before[i]);
        }
        handle_token(local_token);

        last_last_text = flags.last_text;
        last_type = local_token.type;
        flags.last_text = local_token.text;

        token_pos += 1;
      }

      sweet_code = output.get_code();
      if (opt.end_with_newline) {
        sweet_code += "\n";
      }

      if (opt.eol != "\n") {
        sweet_code = sweet_code.replace(/[\r]?[\n]/mg, opt.eol);
      }

      return sweet_code;
    };

    function handle_token(local_token) {
      var newlines = local_token.newlines;
      var keep_whitespace = opt.keep_array_indentation && is_array(flags.mode);

      if (keep_whitespace) {
        for (i = 0; i < newlines; i += 1) {
          print_newline(i > 0);
        }
      } else {
        if (opt.max_preserve_newlines && newlines > opt.max_preserve_newlines) {
          newlines = opt.max_preserve_newlines;
        }

        if (opt.preserve_newlines) {
          if (local_token.newlines > 1) {
            print_newline();
            for (var i = 1; i < newlines; i += 1) {
              print_newline(true);
            }
          }
        }
      }

      current_token = local_token;
      handlers[current_token.type]();
    }

    // we could use just string.split, but
    // IE doesn't like returning empty strings
    function split_newlines(s) {
      //return s.split(/\x0d\x0a|\x0a/);

      s = s.replace(/\x0d/g, "");
      var out = [], idx = s.indexOf("\n");
      while (idx !== -1) {
        out.push(s.substring(0, idx));
        s = s.substring(idx + 1);
        idx = s.indexOf("\n");
      }
      if (s.length) {
        out.push(s);
      }
      return out;
    }

    function allow_wrap_or_preserved_newline(force_linewrap) {
      force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

      // Never wrap the first token on a line
      if (output.just_added_newline()) {
        return;
      }

      if ((opt.preserve_newlines && current_token.wanted_newline) || force_linewrap) {
        print_newline(false, true);
      } else if (opt.wrap_line_length) {
        var proposed_line_length = output.current_line.get_character_count() + current_token.text.length + (output.space_before_token ? 1 : 0);
        if (proposed_line_length >= opt.wrap_line_length) {
          print_newline(false, true);
        }
      }
    }

    function print_newline(force_newline, preserve_statement_flags) {
      if (!preserve_statement_flags) {
        if (flags.last_text !== ";" && flags.last_text !== "," && flags.last_text !== "=" && last_type !== "TK_OPERATOR") {
          while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
            restore_mode();
          }
        }
      }

      if (output.add_new_line(force_newline)) {
        flags.multiline_frame = true;
      }
    }

    function print_token_line_indentation() {
      if (output.just_added_newline()) {
        if (opt.keep_array_indentation && is_array(flags.mode) && current_token.wanted_newline) {
          output.current_line.push(current_token.whitespace_before);
          output.space_before_token = false;
        } else if (output.set_indent(flags.indentation_level)) {
          flags.line_indent_level = flags.indentation_level;
        }
      }
    }

    function print_token(printable_token) {
      if (opt.comma_first && last_type === "TK_COMMA" && output.just_added_newline()) {
        if (output.previous_line.last() === ",") {
          output.previous_line.pop();
          print_token_line_indentation();
          output.add_token(",");
          output.space_before_token = true;
        }
      }

      printable_token = printable_token || current_token.text;
      print_token_line_indentation();
      output.add_token(printable_token);
    }

    function indent() {
      flags.indentation_level += 1;
    }

    function deindent() {
      if (flags.indentation_level > 0 && ((!flags.parent) || flags.indentation_level > flags.parent.indentation_level)) flags.indentation_level -= 1;
    }

    function set_mode(mode) {
      if (flags) {
        flag_store.push(flags);
        previous_flags = flags;
      } else {
        previous_flags = create_flags(null, mode);
      }

      flags = create_flags(previous_flags, mode);
    }

    function is_array(mode) {
      return mode === MODE.ArrayLiteral;
    }

    function is_expression(mode) {
      return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
    }

    function restore_mode() {
      if (flag_store.length > 0) {
        previous_flags = flags;
        flags = flag_store.pop();
        if (previous_flags.mode === MODE.Statement) {
          output.remove_redundant_indentation(previous_flags);
        }
      }
    }

    function start_of_object_property() {
      return flags.parent.mode === MODE.ObjectLiteral && flags.mode === MODE.Statement && ((flags.last_text === ":" && flags.ternary_depth === 0) || (last_type === "TK_RESERVED" && in_array(flags.last_text, ["get", "set"])));
    }

    function start_of_statement() {
      if ((last_type === "TK_RESERVED" && in_array(flags.last_text, ["var", "let", "const"]) && current_token.type === "TK_WORD") || (last_type === "TK_RESERVED" && flags.last_text === "do") || (last_type === "TK_RESERVED" && flags.last_text === "return" && !current_token.wanted_newline) || (last_type === "TK_RESERVED" && flags.last_text === "else" && !(current_token.type === "TK_RESERVED" && current_token.text === "if")) || (last_type === "TK_END_EXPR" && (previous_flags.mode === MODE.ForInitializer || previous_flags.mode === MODE.Conditional)) || (last_type === "TK_WORD" && flags.mode === MODE.BlockStatement && !flags.in_case && !(current_token.text === "--" || current_token.text === "++") && last_last_text !== "function" && current_token.type !== "TK_WORD" && current_token.type !== "TK_RESERVED") || (flags.mode === MODE.ObjectLiteral && ((flags.last_text === ":" && flags.ternary_depth === 0) || (last_type === "TK_RESERVED" && in_array(flags.last_text, ["get", "set"]))))) {
        set_mode(MODE.Statement);
        indent();

        if (last_type === "TK_RESERVED" && in_array(flags.last_text, ["var", "let", "const"]) && current_token.type === "TK_WORD") {
          flags.declaration_statement = true;
        }

        // Issue #276:
        // If starting a new statement with [if, for, while, do], push to a new line.
        // if (a) if (b) if(c) d(); else e(); else f();
        if (!start_of_object_property()) {
          allow_wrap_or_preserved_newline(current_token.type === "TK_RESERVED" && in_array(current_token.text, ["do", "for", "if", "while"]));
        }

        return true;
      }
      return false;
    }

    function all_lines_start_with(lines, c) {
      for (var i = 0; i < lines.length; i++) {
        var line = trim(lines[i]);
        if (line.charAt(0) !== c) {
          return false;
        }
      }
      return true;
    }

    function each_line_matches_indent(lines, indent) {
      var i = 0, len = lines.length, line;
      for (; i < len; i++) {
        line = lines[i];
        // allow empty lines to pass through
        if (line && line.indexOf(indent) !== 0) {
          return false;
        }
      }
      return true;
    }

    function is_special_word(word) {
      return in_array(word, ["case", "return", "do", "if", "throw", "else"]);
    }

    function get_token(offset) {
      var index = token_pos + (offset || 0);
      return (index < 0 || index >= tokens.length) ? null : tokens[index];
    }

    function handle_start_expr() {
      if (start_of_statement()) {}

      var next_mode = MODE.Expression;
      if (current_token.text === "[") {
        if (last_type === "TK_WORD" || flags.last_text === ")") {
          // this is array index specifier, break immediately
          // a[x], fn()[x]
          if (last_type === "TK_RESERVED" && in_array(flags.last_text, Tokenizer.line_starters)) {
            output.space_before_token = true;
          }
          set_mode(next_mode);
          print_token();
          indent();
          if (opt.space_in_paren) {
            output.space_before_token = true;
          }
          return;
        }

        next_mode = MODE.ArrayLiteral;
        if (is_array(flags.mode)) {
          if (flags.last_text === "[" || (flags.last_text === "," && (last_last_text === "]" || last_last_text === "}"))) {
            // ], [ goes to new line
            // }, [ goes to new line
            if (!opt.keep_array_indentation) {
              print_newline();
            }
          }
        }
      } else {
        if (last_type === "TK_RESERVED" && flags.last_text === "for") {
          next_mode = MODE.ForInitializer;
        } else if (last_type === "TK_RESERVED" && in_array(flags.last_text, ["if", "while"])) {
          next_mode = MODE.Conditional;
        } else {}
      }

      if (flags.last_text === ";" || last_type === "TK_START_BLOCK") {
        print_newline();
      } else if (last_type === "TK_END_EXPR" || last_type === "TK_START_EXPR" || last_type === "TK_END_BLOCK" || flags.last_text === ".") {
        // TODO: Consider whether forcing this is required.  Review failing tests when removed.
        allow_wrap_or_preserved_newline(current_token.wanted_newline);
        // do nothing on (( and )( and ][ and ]( and .(
      } else if (!(last_type === "TK_RESERVED" && current_token.text === "(") && last_type !== "TK_WORD" && last_type !== "TK_OPERATOR") {
        output.space_before_token = true;
      } else if ((last_type === "TK_RESERVED" && (flags.last_word === "function" || flags.last_word === "typeof")) || (flags.last_text === "*" && last_last_text === "function")) {
        // function() vs function ()
        if (opt.space_after_anon_function) {
          output.space_before_token = true;
        }
      } else if (last_type === "TK_RESERVED" && (in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === "catch")) {
        if (opt.space_before_conditional) {
          output.space_before_token = true;
        }
      }

      // Should be a space between await and an IIFE
      if (current_token.text === "(" && last_type === "TK_RESERVED" && flags.last_word === "await") {
        output.space_before_token = true;
      }

      // Support of this kind of newline preservation.
      // a = (b &&
      //     (c || d));
      if (current_token.text === "(") {
        if (last_type === "TK_EQUALS" || last_type === "TK_OPERATOR") {
          if (!start_of_object_property()) {
            allow_wrap_or_preserved_newline();
          }
        }
      }

      set_mode(next_mode);
      print_token();
      if (opt.space_in_paren) {
        output.space_before_token = true;
      }

      // In all cases, if we newline while inside an expression it should be indented.
      indent();
    }

    function handle_end_expr() {
      // statements inside expressions are not valid syntax, but...
      // statements must all be closed when their container closes
      while (flags.mode === MODE.Statement) {
        restore_mode();
      }

      if (flags.multiline_frame) {
        allow_wrap_or_preserved_newline(current_token.text === "]" && is_array(flags.mode) && !opt.keep_array_indentation);
      }

      if (opt.space_in_paren) {
        if (last_type === "TK_START_EXPR" && !opt.space_in_empty_paren) {
          // () [] no inner space in empty parens like these, ever, ref #320
          output.trim();
          output.space_before_token = false;
        } else {
          output.space_before_token = true;
        }
      }
      if (current_token.text === "]" && opt.keep_array_indentation) {
        print_token();
        restore_mode();
      } else {
        restore_mode();
        print_token();
      }
      output.remove_redundant_indentation(previous_flags);

      // do {} while () // no statement required after
      if (flags.do_while && previous_flags.mode === MODE.Conditional) {
        previous_flags.mode = MODE.Expression;
        flags.do_block = false;
        flags.do_while = false;
      }
    }

    function handle_start_block() {
      // Check if this is should be treated as a ObjectLiteral
      var next_token = get_token(1);
      var second_token = get_token(2);
      if (second_token && ((second_token.text === ":" && in_array(next_token.type, ["TK_STRING", "TK_WORD", "TK_RESERVED"])) || (in_array(next_token.text, ["get", "set"]) && in_array(second_token.type, ["TK_WORD", "TK_RESERVED"])))) {
        // We don't support TypeScript,but we didn't break it for a very long time.
        // We'll try to keep not breaking it.
        if (!in_array(last_last_text, ["class", "interface"])) {
          set_mode(MODE.ObjectLiteral);
        } else {
          set_mode(MODE.BlockStatement);
        }
      } else {
        set_mode(MODE.BlockStatement);
      }

      var empty_braces = !next_token.comments_before.length && next_token.text === "}";
      var empty_anonymous_function = empty_braces && flags.last_word === "function" && last_type === "TK_END_EXPR";

      if (opt.brace_style === "expand" || (opt.brace_style === "none" && current_token.wanted_newline)) {
        if (last_type !== "TK_OPERATOR" && (empty_anonymous_function || last_type === "TK_EQUALS" || (last_type === "TK_RESERVED" && is_special_word(flags.last_text) && flags.last_text !== "else"))) {
          output.space_before_token = true;
        } else {
          print_newline(false, true);
        }
      } else {
        // collapse
        if (last_type !== "TK_OPERATOR" && last_type !== "TK_START_EXPR") {
          if (last_type === "TK_START_BLOCK") {
            print_newline();
          } else {
            output.space_before_token = true;
          }
        } else {
          // if TK_OPERATOR or TK_START_EXPR
          if (is_array(previous_flags.mode) && flags.last_text === ",") {
            if (last_last_text === "}") {
              // }, { in array context
              output.space_before_token = true;
            } else {
              print_newline(); // [a, b, c, {
            }
          }
        }
      }
      print_token();
      indent();
    }

    function handle_end_block() {
      // statements must all be closed when their container closes
      while (flags.mode === MODE.Statement) {
        restore_mode();
      }
      var empty_braces = last_type === "TK_START_BLOCK";

      if (opt.brace_style === "expand") {
        if (!empty_braces) {
          print_newline();
        }
      } else {
        // skip {}
        if (!empty_braces) {
          if (is_array(flags.mode) && opt.keep_array_indentation) {
            // we REALLY need a newline here, but newliner would skip that
            opt.keep_array_indentation = false;
            print_newline();
            opt.keep_array_indentation = true;
          } else {
            print_newline();
          }
        }
      }
      restore_mode();
      print_token();
    }

    function handle_word() {
      if (current_token.type === "TK_RESERVED" && flags.mode !== MODE.ObjectLiteral && in_array(current_token.text, ["set", "get"])) {
        current_token.type = "TK_WORD";
      }

      if (current_token.type === "TK_RESERVED" && flags.mode === MODE.ObjectLiteral) {
        var next_token = get_token(1);
        if (next_token.text == ":") {
          current_token.type = "TK_WORD";
        }
      }

      if (start_of_statement()) {} else if (current_token.wanted_newline && !is_expression(flags.mode) && (last_type !== "TK_OPERATOR" || (flags.last_text === "--" || flags.last_text === "++")) && last_type !== "TK_EQUALS" && (opt.preserve_newlines || !(last_type === "TK_RESERVED" && in_array(flags.last_text, ["var", "let", "const", "set", "get"])))) {
        print_newline();
      }

      if (flags.do_block && !flags.do_while) {
        if (current_token.type === "TK_RESERVED" && current_token.text === "while") {
          // do {} ## while ()
          output.space_before_token = true;
          print_token();
          output.space_before_token = true;
          flags.do_while = true;
          return;
        } else {
          // do {} should always have while as the next word.
          // if we don't see the expected while, recover
          print_newline();
          flags.do_block = false;
        }
      }

      // if may be followed by else, or not
      // Bare/inline ifs are tricky
      // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
      if (flags.if_block) {
        if (!flags.else_block && (current_token.type === "TK_RESERVED" && current_token.text === "else")) {
          flags.else_block = true;
        } else {
          while (flags.mode === MODE.Statement) {
            restore_mode();
          }
          flags.if_block = false;
          flags.else_block = false;
        }
      }

      if (current_token.type === "TK_RESERVED" && (current_token.text === "case" || (current_token.text === "default" && flags.in_case_statement))) {
        print_newline();
        if (flags.case_body || opt.jslint_happy) {
          // switch cases following one another
          deindent();
          flags.case_body = false;
        }
        print_token();
        flags.in_case = true;
        flags.in_case_statement = true;
        return;
      }

      if (current_token.type === "TK_RESERVED" && current_token.text === "function") {
        if (in_array(flags.last_text, ["}", ";"]) || (output.just_added_newline() && !in_array(flags.last_text, ["[", "{", ":", "=", ","]))) {
          // make sure there is a nice clean space of at least one blank line
          // before a new function definition
          if (!output.just_added_blankline() && !current_token.comments_before.length) {
            print_newline();
            print_newline(true);
          }
        }
        if (last_type === "TK_RESERVED" || last_type === "TK_WORD") {
          if (last_type === "TK_RESERVED" && in_array(flags.last_text, ["get", "set", "new", "return", "export", "async"])) {
            output.space_before_token = true;
          } else if (last_type === "TK_RESERVED" && flags.last_text === "default" && last_last_text === "export") {
            output.space_before_token = true;
          } else {
            print_newline();
          }
        } else if (last_type === "TK_OPERATOR" || flags.last_text === "=") {
          // foo = function
          output.space_before_token = true;
        } else if (!flags.multiline_frame && (is_expression(flags.mode) || is_array(flags.mode))) {} else {
          print_newline();
        }
      }

      if (last_type === "TK_COMMA" || last_type === "TK_START_EXPR" || last_type === "TK_EQUALS" || last_type === "TK_OPERATOR") {
        if (!start_of_object_property()) {
          allow_wrap_or_preserved_newline();
        }
      }

      if (current_token.type === "TK_RESERVED" && in_array(current_token.text, ["function", "get", "set"])) {
        print_token();
        flags.last_word = current_token.text;
        return;
      }

      prefix = "NONE";

      if (last_type === "TK_END_BLOCK") {
        if (!(current_token.type === "TK_RESERVED" && in_array(current_token.text, ["else", "catch", "finally"]))) {
          prefix = "NEWLINE";
        } else {
          if (opt.brace_style === "expand" || opt.brace_style === "end-expand" || (opt.brace_style === "none" && current_token.wanted_newline)) {
            prefix = "NEWLINE";
          } else {
            prefix = "SPACE";
            output.space_before_token = true;
          }
        }
      } else if (last_type === "TK_SEMICOLON" && flags.mode === MODE.BlockStatement) {
        // TODO: Should this be for STATEMENT as well?
        prefix = "NEWLINE";
      } else if (last_type === "TK_SEMICOLON" && is_expression(flags.mode)) {
        prefix = "SPACE";
      } else if (last_type === "TK_STRING") {
        prefix = "NEWLINE";
      } else if (last_type === "TK_RESERVED" || last_type === "TK_WORD" || (flags.last_text === "*" && last_last_text === "function")) {
        prefix = "SPACE";
      } else if (last_type === "TK_START_BLOCK") {
        prefix = "NEWLINE";
      } else if (last_type === "TK_END_EXPR") {
        output.space_before_token = true;
        prefix = "NEWLINE";
      }

      if (current_token.type === "TK_RESERVED" && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ")") {
        if (flags.last_text === "else" || flags.last_text === "export") {
          prefix = "SPACE";
        } else {
          prefix = "NEWLINE";
        }
      }

      if (current_token.type === "TK_RESERVED" && in_array(current_token.text, ["else", "catch", "finally"])) {
        if (last_type !== "TK_END_BLOCK" || opt.brace_style === "expand" || opt.brace_style === "end-expand" || (opt.brace_style === "none" && current_token.wanted_newline)) {
          print_newline();
        } else {
          output.trim(true);
          var line = output.current_line;
          // If we trimmed and there's something other than a close block before us
          // put a newline back in.  Handles '} // comment' scenario.
          if (line.last() !== "}") {
            print_newline();
          }
          output.space_before_token = true;
        }
      } else if (prefix === "NEWLINE") {
        if (last_type === "TK_RESERVED" && is_special_word(flags.last_text)) {
          // no newline between 'return nnn'
          output.space_before_token = true;
        } else if (last_type !== "TK_END_EXPR") {
          if ((last_type !== "TK_START_EXPR" || !(current_token.type === "TK_RESERVED" && in_array(current_token.text, ["var", "let", "const"]))) && flags.last_text !== ":") {
            // no need to force newline on 'var': for (var x = 0...)
            if (current_token.type === "TK_RESERVED" && current_token.text === "if" && flags.last_text === "else") {
              // no newline for } else if {
              output.space_before_token = true;
            } else {
              print_newline();
            }
          }
        } else if (current_token.type === "TK_RESERVED" && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ")") {
          print_newline();
        }
      } else if (flags.multiline_frame && is_array(flags.mode) && flags.last_text === "," && last_last_text === "}") {
        print_newline(); // }, in lists get a newline treatment
      } else if (prefix === "SPACE") {
        output.space_before_token = true;
      }
      print_token();
      flags.last_word = current_token.text;

      if (current_token.type === "TK_RESERVED" && current_token.text === "do") {
        flags.do_block = true;
      }

      if (current_token.type === "TK_RESERVED" && current_token.text === "if") {
        flags.if_block = true;
      }
    }

    function handle_semicolon() {
      if (start_of_statement()) {
        // The conditional starts the statement if appropriate.
        // Semicolon can be the start (and end) of a statement
        output.space_before_token = false;
      }
      while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
        restore_mode();
      }
      print_token();
    }

    function handle_string() {
      if (start_of_statement()) {
        // The conditional starts the statement if appropriate.
        // One difference - strings want at least a space before
        output.space_before_token = true;
      } else if (last_type === "TK_RESERVED" || last_type === "TK_WORD") {
        output.space_before_token = true;
      } else if (last_type === "TK_COMMA" || last_type === "TK_START_EXPR" || last_type === "TK_EQUALS" || last_type === "TK_OPERATOR") {
        if (!start_of_object_property()) {
          allow_wrap_or_preserved_newline();
        }
      } else {
        print_newline();
      }
      print_token();
    }

    function handle_equals() {
      if (start_of_statement()) {}

      if (flags.declaration_statement) {
        // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
        flags.declaration_assignment = true;
      }
      output.space_before_token = true;
      print_token();
      output.space_before_token = true;
    }

    function handle_comma() {
      if (flags.declaration_statement) {
        if (is_expression(flags.parent.mode)) {
          // do not break on comma, for(var a = 1, b = 2)
          flags.declaration_assignment = false;
        }

        print_token();

        if (flags.declaration_assignment) {
          flags.declaration_assignment = false;
          print_newline(false, true);
        } else {
          output.space_before_token = true;
          // for comma-first, we want to allow a newline before the comma
          // to turn into a newline after the comma, which we will fixup later
          if (opt.comma_first) {
            allow_wrap_or_preserved_newline();
          }
        }
        return;
      }

      print_token();
      if (flags.mode === MODE.ObjectLiteral || (flags.mode === MODE.Statement && flags.parent.mode === MODE.ObjectLiteral)) {
        if (flags.mode === MODE.Statement) {
          restore_mode();
        }
        print_newline();
      } else {
        // EXPR or DO_BLOCK
        output.space_before_token = true;
        // for comma-first, we want to allow a newline before the comma
        // to turn into a newline after the comma, which we will fixup later
        if (opt.comma_first) {
          allow_wrap_or_preserved_newline();
        }
      }
    }

    function handle_operator() {
      if (start_of_statement()) {}

      if (last_type === "TK_RESERVED" && is_special_word(flags.last_text)) {
        // "return" had a special handling in TK_WORD. Now we need to return the favor
        output.space_before_token = true;
        print_token();
        return;
      }

      // hack for actionscript's import .*;
      if (current_token.text === "*" && last_type === "TK_DOT") {
        print_token();
        return;
      }

      if (current_token.text === ":" && flags.in_case) {
        flags.case_body = true;
        indent();
        print_token();
        print_newline();
        flags.in_case = false;
        return;
      }

      if (current_token.text === "::") {
        // no spaces around exotic namespacing syntax operator
        print_token();
        return;
      }

      // Allow line wrapping between operators
      if (last_type === "TK_OPERATOR") {
        allow_wrap_or_preserved_newline();
      }

      var space_before = true;
      var space_after = true;

      if (in_array(current_token.text, ["--", "++", "!", "~"]) || (in_array(current_token.text, ["-", "+"]) && (in_array(last_type, ["TK_START_BLOCK", "TK_START_EXPR", "TK_EQUALS", "TK_OPERATOR"]) || in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === ","))) {
        // unary operators (and binary +/- pretending to be unary) special cases

        space_before = false;
        space_after = false;

        // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
        // if there is a newline between -- or ++ and anything else we should preserve it.
        if (current_token.wanted_newline && (current_token.text === "--" || current_token.text === "++")) {
          print_newline(false, true);
        }

        if (flags.last_text === ";" && is_expression(flags.mode)) {
          // for (;; ++i)
          //        ^^^
          space_before = true;
        }

        if (last_type === "TK_RESERVED") {
          space_before = true;
        } else if (last_type === "TK_END_EXPR") {
          space_before = !(flags.last_text === "]" && (current_token.text === "--" || current_token.text === "++"));
        } else if (last_type === "TK_OPERATOR") {
          // a++ + ++b;
          // a - -b
          space_before = in_array(current_token.text, ["--", "-", "++", "+"]) && in_array(flags.last_text, ["--", "-", "++", "+"]);
          // + and - are not unary when preceeded by -- or ++ operator
          // a-- + b
          // a * +b
          // a - -b
          if (in_array(current_token.text, ["+", "-"]) && in_array(flags.last_text, ["--", "++"])) {
            space_after = true;
          }
        }

        if ((flags.mode === MODE.BlockStatement || flags.mode === MODE.Statement) && (flags.last_text === "{" || flags.last_text === ";")) {
          // { foo; --i }
          // foo(); --bar;
          print_newline();
        }
      } else if (current_token.text === ":") {
        if (flags.ternary_depth === 0) {
          // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
          space_before = false;
        } else {
          flags.ternary_depth -= 1;
        }
      } else if (current_token.text === "?") {
        flags.ternary_depth += 1;
      } else if (current_token.text === "*" && last_type === "TK_RESERVED" && flags.last_text === "function") {
        space_before = false;
        space_after = false;
      }
      output.space_before_token = output.space_before_token || space_before;
      print_token();
      output.space_before_token = space_after;
    }

    function handle_block_comment() {
      var lines = split_newlines(current_token.text);
      var j; // iterator for this case
      var javadoc = false;
      var starless = false;
      var lastIndent = current_token.whitespace_before;
      var lastIndentLength = lastIndent.length;

      // block comment starts with a new line
      print_newline(false, true);
      if (lines.length > 1) {
        if (all_lines_start_with(lines.slice(1), "*")) {
          javadoc = true;
        } else if (each_line_matches_indent(lines.slice(1), lastIndent)) {
          starless = true;
        }
      }

      // first line always indented
      print_token(lines[0]);
      for (j = 1; j < lines.length; j++) {
        print_newline(false, true);
        if (javadoc) {
          // javadoc: reformat and re-indent
          print_token(" " + ltrim(lines[j]));
        } else if (starless && lines[j].length > lastIndentLength) {
          // starless: re-indent non-empty content, avoiding trim
          print_token(lines[j].substring(lastIndentLength));
        } else {
          // normal comments output raw
          output.add_token(lines[j]);
        }
      }

      // for comments of more than one line, make sure there's a new line after
      print_newline(false, true);
    }

    function handle_inline_comment() {
      output.space_before_token = true;
      print_token();
      output.space_before_token = true;
    }

    function handle_comment() {
      if (current_token.wanted_newline) {
        print_newline(false, true);
      } else {
        output.trim(true);
      }

      output.space_before_token = true;
      print_token();
      print_newline(false, true);
    }

    function handle_dot() {
      if (start_of_statement()) {}

      if (last_type === "TK_RESERVED" && is_special_word(flags.last_text)) {
        output.space_before_token = true;
      } else {
        // allow preserved newlines before dots in general
        // force newlines on dots after close paren when break_chained - for bar().baz()
        allow_wrap_or_preserved_newline(flags.last_text === ")" && opt.break_chained_methods);
      }

      print_token();
    }

    function handle_unknown() {
      print_token();

      if (current_token.text[current_token.text.length - 1] === "\n") {
        print_newline();
      }
    }

    function handle_eof() {
      // Unwind any open statements
      while (flags.mode === MODE.Statement) {
        restore_mode();
      }
    }
  }


  function OutputLine(parent) {
    var _character_count = 0;
    // use indent_count as a marker for lines that have preserved indentation
    var _indent_count = -1;

    var _items = [];
    var _empty = true;

    this.set_indent = function (level) {
      _character_count = parent.baseIndentLength + level * parent.indent_length;
      _indent_count = level;
    };

    this.get_character_count = function () {
      return _character_count;
    };

    this.is_empty = function () {
      return _empty;
    };

    this.last = function () {
      if (!this._empty) {
        return _items[_items.length - 1];
      } else {
        return null;
      }
    };

    this.push = function (input) {
      _items.push(input);
      _character_count += input.length;
      _empty = false;
    };

    this.pop = function () {
      var item = null;
      if (!_empty) {
        item = _items.pop();
        _character_count -= item.length;
        _empty = _items.length === 0;
      }
      return item;
    };

    this.remove_indent = function () {
      if (_indent_count > 0) {
        _indent_count -= 1;
        _character_count -= parent.indent_length;
      }
    };

    this.trim = function () {
      while (this.last() === " ") {
        var item = _items.pop();
        _character_count -= 1;
      }
      _empty = _items.length === 0;
    };

    this.toString = function () {
      var result = "";
      if (!this._empty) {
        if (_indent_count >= 0) {
          result = parent.indent_cache[_indent_count];
        }
        result += _items.join("");
      }
      return result;
    };
  }

  function Output(indent_string, baseIndentString) {
    baseIndentString = baseIndentString || "";
    this.indent_cache = [baseIndentString];
    this.baseIndentLength = baseIndentString.length;
    this.indent_length = indent_string.length;

    var lines = [];
    this.baseIndentString = baseIndentString;
    this.indent_string = indent_string;
    this.previous_line = null;
    this.current_line = null;
    this.space_before_token = false;

    this.get_line_number = function () {
      return lines.length;
    };

    // Using object instead of string to allow for later expansion of info about each line
    this.add_new_line = function (force_newline) {
      if (this.get_line_number() === 1 && this.just_added_newline()) {
        return false; // no newline on start of file
      }

      if (force_newline || !this.just_added_newline()) {
        this.previous_line = this.current_line;
        this.current_line = new OutputLine(this);
        lines.push(this.current_line);
        return true;
      }

      return false;
    };

    // initialize
    this.add_new_line(true);

    this.get_code = function () {
      var sweet_code = lines.join("\n").replace(/[\r\n\t ]+$/, "");
      return sweet_code;
    };

    this.set_indent = function (level) {
      // Never indent your first output indent at the start of the file
      if (lines.length > 1) {
        while (level >= this.indent_cache.length) {
          this.indent_cache.push(this.indent_cache[this.indent_cache.length - 1] + this.indent_string);
        }

        this.current_line.set_indent(level);
        return true;
      }
      this.current_line.set_indent(0);
      return false;
    };

    this.add_token = function (printable_token) {
      this.add_space_before_token();
      this.current_line.push(printable_token);
    };

    this.add_space_before_token = function () {
      if (this.space_before_token && !this.just_added_newline()) {
        this.current_line.push(" ");
      }
      this.space_before_token = false;
    };

    this.remove_redundant_indentation = function (frame) {
      // This implementation is effective but has some issues:
      //     - can cause line wrap to happen too soon due to indent removal
      //           after wrap points are calculated
      // These issues are minor compared to ugly indentation.

      if (frame.multiline_frame || frame.mode === MODE.ForInitializer || frame.mode === MODE.Conditional) {
        return;
      }

      // remove one indent from each line inside this section
      var index = frame.start_line_index;
      var line;

      var output_length = lines.length;
      while (index < output_length) {
        lines[index].remove_indent();
        index++;
      }
    };

    this.trim = function (eat_newlines) {
      eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

      this.current_line.trim(indent_string, baseIndentString);

      while (eat_newlines && lines.length > 1 && this.current_line.is_empty()) {
        lines.pop();
        this.current_line = lines[lines.length - 1];
        this.current_line.trim();
      }

      this.previous_line = lines.length > 1 ? lines[lines.length - 2] : null;
    };

    this.just_added_newline = function () {
      return this.current_line.is_empty();
    };

    this.just_added_blankline = function () {
      if (this.just_added_newline()) {
        if (lines.length === 1) {
          return true; // start of the file and newline = blank
        }

        var line = lines[lines.length - 2];
        return line.is_empty();
      }
      return false;
    };
  }


  var Token = function (type, text, newlines, whitespace_before, mode, parent) {
    this.type = type;
    this.text = text;
    this.comments_before = [];
    this.newlines = newlines || 0;
    this.wanted_newline = newlines > 0;
    this.whitespace_before = whitespace_before || "";
    this.parent = null;
  };

  function tokenizer(input, opts, indent_string) {
    var whitespace = "\n\r\t ".split("");
    var digit = /[0-9]/;

    var punct = ("+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>" + " <%= <% %> <?= <? ?>").split(" "); // try to be a good boy and try not to break the markup language identifiers

    // words which should always start on new line.
    this.line_starters = "continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,import,export".split(",");
    var reserved_words = this.line_starters.concat(["do", "in", "else", "get", "set", "new", "catch", "finally", "typeof", "yield", "async", "await"]);

    var n_newlines, whitespace_before_token, in_html_comment, tokens, parser_pos;
    var input_length;

    this.tokenize = function () {
      // cache the source's length.
      input_length = input.length;
      parser_pos = 0;
      in_html_comment = false;
      tokens = [];

      var next, last;
      var token_values;
      var open = null;
      var open_stack = [];
      var comments = [];

      while (!(last && last.type === "TK_EOF")) {
        token_values = tokenize_next();
        next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
        while (next.type === "TK_INLINE_COMMENT" || next.type === "TK_COMMENT" || next.type === "TK_BLOCK_COMMENT" || next.type === "TK_UNKNOWN") {
          comments.push(next);
          token_values = tokenize_next();
          next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
        }

        if (comments.length) {
          next.comments_before = comments;
          comments = [];
        }

        if (next.type === "TK_START_BLOCK" || next.type === "TK_START_EXPR") {
          next.parent = last;
          open_stack.push(open);
          open = next;
        } else if ((next.type === "TK_END_BLOCK" || next.type === "TK_END_EXPR") && (open && ((next.text === "]" && open.text === "[") || (next.text === ")" && open.text === "(") || (next.text === "}" && open.text === "{")))) {
          next.parent = open.parent;
          open = open_stack.pop();
        }

        tokens.push(next);
        last = next;
      }

      return tokens;
    };

    function tokenize_next() {
      var i, resulting_string;
      var whitespace_on_this_line = [];

      n_newlines = 0;
      whitespace_before_token = "";

      if (parser_pos >= input_length) {
        return ["", "TK_EOF"];
      }

      var last_token;
      if (tokens.length) {
        last_token = tokens[tokens.length - 1];
      } else {
        // For the sake of tokenizing we can pretend that there was on open brace to start
        last_token = new Token("TK_START_BLOCK", "{");
      }


      var c = input.charAt(parser_pos);
      parser_pos += 1;

      while (in_array(c, whitespace)) {
        if (c === "\n") {
          n_newlines += 1;
          whitespace_on_this_line = [];
        } else if (n_newlines) {
          if (c === indent_string) {
            whitespace_on_this_line.push(indent_string);
          } else if (c !== "\r") {
            whitespace_on_this_line.push(" ");
          }
        }

        if (parser_pos >= input_length) {
          return ["", "TK_EOF"];
        }

        c = input.charAt(parser_pos);
        parser_pos += 1;
      }

      if (whitespace_on_this_line.length) {
        whitespace_before_token = whitespace_on_this_line.join("");
      }

      if (digit.test(c)) {
        var allow_decimal = true;
        var allow_e = true;
        var local_digit = digit;

        if (c === "0" && parser_pos < input_length && /[Xx]/.test(input.charAt(parser_pos))) {
          // switch to hex number, no decimal or e, just hex digits
          allow_decimal = false;
          allow_e = false;
          c += input.charAt(parser_pos);
          parser_pos += 1;
          local_digit = /[0123456789abcdefABCDEF]/;
        } else {
          // we know this first loop will run.  It keeps the logic simpler.
          c = "";
          parser_pos -= 1;
        }

        // Add the digits
        while (parser_pos < input_length && local_digit.test(input.charAt(parser_pos))) {
          c += input.charAt(parser_pos);
          parser_pos += 1;

          if (allow_decimal && parser_pos < input_length && input.charAt(parser_pos) === ".") {
            c += input.charAt(parser_pos);
            parser_pos += 1;
            allow_decimal = false;
          }

          if (allow_e && parser_pos < input_length && /[Ee]/.test(input.charAt(parser_pos))) {
            c += input.charAt(parser_pos);
            parser_pos += 1;

            if (parser_pos < input_length && /[+-]/.test(input.charAt(parser_pos))) {
              c += input.charAt(parser_pos);
              parser_pos += 1;
            }

            allow_e = false;
            allow_decimal = false;
          }
        }

        return [c, "TK_WORD"];
      }

      if (acorn.isIdentifierStart(input.charCodeAt(parser_pos - 1))) {
        if (parser_pos < input_length) {
          while (acorn.isIdentifierChar(input.charCodeAt(parser_pos))) {
            c += input.charAt(parser_pos);
            parser_pos += 1;
            if (parser_pos === input_length) {
              break;
            }
          }
        }

        if (!(last_token.type === "TK_DOT" || (last_token.type === "TK_RESERVED" && in_array(last_token.text, ["set", "get"]))) && in_array(c, reserved_words)) {
          if (c === "in") {
            // hack for 'in' operator
            return [c, "TK_OPERATOR"];
          }
          return [c, "TK_RESERVED"];
        }

        return [c, "TK_WORD"];
      }

      if (c === "(" || c === "[") {
        return [c, "TK_START_EXPR"];
      }

      if (c === ")" || c === "]") {
        return [c, "TK_END_EXPR"];
      }

      if (c === "{") {
        return [c, "TK_START_BLOCK"];
      }

      if (c === "}") {
        return [c, "TK_END_BLOCK"];
      }

      if (c === ";") {
        return [c, "TK_SEMICOLON"];
      }

      if (c === "/") {
        var comment = "";
        // peek for comment /* ... */
        var inline_comment = true;
        if (input.charAt(parser_pos) === "*") {
          parser_pos += 1;
          if (parser_pos < input_length) {
            while (parser_pos < input_length && !(input.charAt(parser_pos) === "*" && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === "/")) {
              c = input.charAt(parser_pos);
              comment += c;
              if (c === "\n" || c === "\r") {
                inline_comment = false;
              }
              parser_pos += 1;
              if (parser_pos >= input_length) {
                break;
              }
            }
          }
          parser_pos += 2;
          if (inline_comment && n_newlines === 0) {
            return ["/*" + comment + "*/", "TK_INLINE_COMMENT"];
          } else {
            return ["/*" + comment + "*/", "TK_BLOCK_COMMENT"];
          }
        }
        // peek for comment // ...
        if (input.charAt(parser_pos) === "/") {
          comment = c;
          while (input.charAt(parser_pos) !== "\r" && input.charAt(parser_pos) !== "\n") {
            comment += input.charAt(parser_pos);
            parser_pos += 1;
            if (parser_pos >= input_length) {
              break;
            }
          }
          return [comment, "TK_COMMENT"];
        }
      }

      if (c === "`" || c === "'" || c === "\"" || // string
      ((c === "/") || // regexp
      (opts.e4x && c === "<" && input.slice(parser_pos - 1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])(\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{.*?}))*\s*(\/?)\s*>/)) // xml
      ) && ( // regex and xml can only appear in specific locations during parsing
      (last_token.type === "TK_RESERVED" && in_array(last_token.text, ["return", "case", "throw", "else", "do", "typeof", "yield"])) || (last_token.type === "TK_END_EXPR" && last_token.text === ")" && last_token.parent && last_token.parent.type === "TK_RESERVED" && in_array(last_token.parent.text, ["if", "while", "for"])) || (in_array(last_token.type, ["TK_COMMENT", "TK_START_EXPR", "TK_START_BLOCK", "TK_END_BLOCK", "TK_OPERATOR", "TK_EQUALS", "TK_EOF", "TK_SEMICOLON", "TK_COMMA"])))) {
        var sep = c, esc = false, has_char_escapes = false;

        resulting_string = c;

        if (sep === "/") {
          //
          // handle regexp
          //
          var in_char_class = false;
          while (parser_pos < input_length && ((esc || in_char_class || input.charAt(parser_pos) !== sep) && !acorn.newline.test(input.charAt(parser_pos)))) {
            resulting_string += input.charAt(parser_pos);
            if (!esc) {
              esc = input.charAt(parser_pos) === "\\";
              if (input.charAt(parser_pos) === "[") {
                in_char_class = true;
              } else if (input.charAt(parser_pos) === "]") {
                in_char_class = false;
              }
            } else {
              esc = false;
            }
            parser_pos += 1;
          }
        } else if (opts.e4x && sep === "<") {
          //
          // handle e4x xml literals
          //
          var xmlRegExp = /<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])(\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{.*?}))*\s*(\/?)\s*>/g;
          var xmlStr = input.slice(parser_pos - 1);
          var match = xmlRegExp.exec(xmlStr);
          if (match && match.index === 0) {
            var rootTag = match[2];
            var depth = 0;
            while (match) {
              var isEndTag = !!match[1];
              var tagName = match[2];
              var isSingletonTag = (!!match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
              if (tagName === rootTag && !isSingletonTag) {
                if (isEndTag) {
                  --depth;
                } else {
                  ++depth;
                }
              }
              if (depth <= 0) {
                break;
              }
              match = xmlRegExp.exec(xmlStr);
            }
            var xmlLength = match ? match.index + match[0].length : xmlStr.length;
            xmlStr = xmlStr.slice(0, xmlLength);
            parser_pos += xmlLength - 1;
            return [xmlStr, "TK_STRING"];
          }
        } else {
          //
          // handle string
          //
          // Template strings can travers lines without escape characters.
          // Other strings cannot
          while (parser_pos < input_length && (esc || (input.charAt(parser_pos) !== sep && (sep === "`" || !acorn.newline.test(input.charAt(parser_pos)))))) {
            resulting_string += input.charAt(parser_pos);
            // Handle \r\n linebreaks after escapes or in template strings
            if (input.charAt(parser_pos) === "\r" && input.charAt(parser_pos + 1) === "\n") {
              parser_pos += 1;
              resulting_string += "\n";
            }
            if (esc) {
              if (input.charAt(parser_pos) === "x" || input.charAt(parser_pos) === "u") {
                has_char_escapes = true;
              }
              esc = false;
            } else {
              esc = input.charAt(parser_pos) === "\\";
            }
            parser_pos += 1;
          }
        }

        if (has_char_escapes && opts.unescape_strings) {
          resulting_string = unescape_string(resulting_string);
        }

        if (parser_pos < input_length && input.charAt(parser_pos) === sep) {
          resulting_string += sep;
          parser_pos += 1;

          if (sep === "/") {
            // regexps may have modifiers /regexp/MOD , so fetch those, too
            // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
            while (parser_pos < input_length && acorn.isIdentifierStart(input.charCodeAt(parser_pos))) {
              resulting_string += input.charAt(parser_pos);
              parser_pos += 1;
            }
          }
        }
        return [resulting_string, "TK_STRING"];
      }

      if (c === "#") {
        if (tokens.length === 0 && input.charAt(parser_pos) === "!") {
          // shebang
          resulting_string = c;
          while (parser_pos < input_length && c !== "\n") {
            c = input.charAt(parser_pos);
            resulting_string += c;
            parser_pos += 1;
          }
          return [trim(resulting_string) + "\n", "TK_UNKNOWN"];
        }



        // Spidermonkey-specific sharp variables for circular references
        // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
        // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
        var sharp = "#";
        if (parser_pos < input_length && digit.test(input.charAt(parser_pos))) {
          do {
            c = input.charAt(parser_pos);
            sharp += c;
            parser_pos += 1;
          } while (parser_pos < input_length && c !== "#" && c !== "=");
          if (c === "#") {} else if (input.charAt(parser_pos) === "[" && input.charAt(parser_pos + 1) === "]") {
            sharp += "[]";
            parser_pos += 2;
          } else if (input.charAt(parser_pos) === "{" && input.charAt(parser_pos + 1) === "}") {
            sharp += "{}";
            parser_pos += 2;
          }
          return [sharp, "TK_WORD"];
        }
      }

      if (c === "<" && input.substring(parser_pos - 1, parser_pos + 3) === "<!--") {
        parser_pos += 3;
        c = "<!--";
        while (input.charAt(parser_pos) !== "\n" && parser_pos < input_length) {
          c += input.charAt(parser_pos);
          parser_pos++;
        }
        in_html_comment = true;
        return [c, "TK_COMMENT"];
      }

      if (c === "-" && in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === "-->") {
        in_html_comment = false;
        parser_pos += 2;
        return ["-->", "TK_COMMENT"];
      }

      if (c === ".") {
        return [c, "TK_DOT"];
      }

      if (in_array(c, punct)) {
        while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
          c += input.charAt(parser_pos);
          parser_pos += 1;
          if (parser_pos >= input_length) {
            break;
          }
        }

        if (c === ",") {
          return [c, "TK_COMMA"];
        } else if (c === "=") {
          return [c, "TK_EQUALS"];
        } else {
          return [c, "TK_OPERATOR"];
        }
      }

      return [c, "TK_UNKNOWN"];
    }


    function unescape_string(s) {
      var esc = false, out = "", pos = 0, s_hex = "", escaped = 0, c;

      while (esc || pos < s.length) {
        c = s.charAt(pos);
        pos++;

        if (esc) {
          esc = false;
          if (c === "x") {
            // simple hex-escape \x24
            s_hex = s.substr(pos, 2);
            pos += 2;
          } else if (c === "u") {
            // unicode-escape, \u2134
            s_hex = s.substr(pos, 4);
            pos += 4;
          } else {
            // some common escape, e.g \n
            out += "\\" + c;
            continue;
          }
          if (!s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
            // some weird escaping, bail out,
            // leaving whole string intact
            return s;
          }

          escaped = parseInt(s_hex, 16);

          if (escaped >= 0 && escaped < 32) {
            // leave 0x00...0x1f escaped
            if (c === "x") {
              out += "\\x" + s_hex;
            } else {
              out += "\\u" + s_hex;
            }
            continue;
          } else if (escaped === 34 || escaped === 39 || escaped === 92) {
            // single-quote, apostrophe, backslash - escape these
            out += "\\" + String.fromCharCode(escaped);
          } else if (c === "x" && escaped > 126 && escaped <= 255) {
            // we bail out on \x7f..\xff,
            // leaving whole string escaped,
            // as it's probably completely binary
            return s;
          } else {
            out += String.fromCharCode(escaped);
          }
        } else if (c === "\\") {
          esc = true;
        } else {
          out += c;
        }
      }
      return out;
    }
  }


  if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([], function () {
      return { js_beautify: js_beautify };
    });
  } else if (typeof exports !== "undefined") {
    // Add support for CommonJS. Just put this file somewhere on your require.paths
    // and you will be able to `var js_beautify = require("beautify").js_beautify`.
    exports.js_beautify = js_beautify;
  } else if (typeof window !== "undefined") {
    // If we're running a web page and don't have either of the above, add our one global
    window.js_beautify = js_beautify;
  } else if (typeof global !== "undefined") {
    // If we don't even have window, try global.
    global.js_beautify = js_beautify;
  }
}());

/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline
        newline_between_rules (true)      - add a new line after every css rule

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
      'newline_between_rules': true
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

(function () {
  function css_beautify(source_text, options) {
    options = options || {};
    var indentSize = options.indent_size || 4;
    var indentCharacter = options.indent_char || " ";
    var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
    var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
    var newline_between_rules = (options.newline_between_rules === undefined) ? true : options.newline_between_rules;

    // compatibility
    if (typeof indentSize === "string") {
      indentSize = parseInt(indentSize, 10);
    }

    if (options.indent_with_tabs) {
      indentCharacter = "\t";
      indentSize = 1;
    }

    // tokenizer
    var whiteRe = /^\s+$/;
    var wordRe = /[\w$\-_]/;

    var pos = -1, ch;
    var parenLevel = 0;

    function next() {
      ch = source_text.charAt(++pos);
      return ch || "";
    }

    function peek(skipWhitespace) {
      var result = "";
      var prev_pos = pos;
      if (skipWhitespace) {
        eatWhitespace();
      }
      result = source_text.charAt(pos + 1) || "";
      pos = prev_pos - 1;
      next();
      return result;
    }

    function eatString(endChars) {
      var start = pos;
      while (next()) {
        if (ch === "\\") {
          next();
        } else if (endChars.indexOf(ch) !== -1) {
          break;
        } else if (ch === "\n") {
          break;
        }
      }
      return source_text.substring(start, pos + 1);
    }

    function peekString(endChar) {
      var prev_pos = pos;
      var str = eatString(endChar);
      pos = prev_pos - 1;
      next();
      return str;
    }

    function eatWhitespace() {
      var result = "";
      while (whiteRe.test(peek())) {
        next();
        result += ch;
      }
      return result;
    }

    function skipWhitespace() {
      var result = "";
      if (ch && whiteRe.test(ch)) {
        result = ch;
      }
      while (whiteRe.test(next())) {
        result += ch;
      }
      return result;
    }

    function eatComment(singleLine) {
      var start = pos;
      singleLine = peek() === "/";
      next();
      while (next()) {
        if (!singleLine && ch === "*" && peek() === "/") {
          next();
          break;
        } else if (singleLine && ch === "\n") {
          return source_text.substring(start, pos);
        }
      }

      return source_text.substring(start, pos) + ch;
    }


    function lookBack(str) {
      return source_text.substring(pos - str.length, pos).toLowerCase() === str;
    }

    // Nested pseudo-class if we are insideRule
    // and the next special character found opens
    // a new block
    function foundNestedPseudoClass() {
      for (var i = pos + 1; i < source_text.length; i++) {
        var ch = source_text.charAt(i);
        if (ch === "{") {
          return true;
        } else if (ch === ";" || ch === "}" || ch === ")") {
          return false;
        }
      }
      return false;
    }

    // printer
    var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
    var singleIndent = new Array(indentSize + 1).join(indentCharacter);
    var indentLevel = 0;
    var nestedLevel = 0;

    function indent() {
      indentLevel++;
      basebaseIndentString += singleIndent;
    }

    function outdent() {
      indentLevel--;
      basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
    }

    var print = {};
    print["{"] = function (ch) {
      print.singleSpace();
      output.push(ch);
      print.newLine();
    };
    print["}"] = function (ch) {
      print.newLine();
      output.push(ch);
      print.newLine();
    };

    print._lastCharWhitespace = function () {
      return whiteRe.test(output[output.length - 1]);
    };

    print.newLine = function (keepWhitespace) {
      if (output.length) {
        if (!keepWhitespace && output[output.length - 1] !== "\n") {
          print.trim();
        }

        output.push("\n");

        if (basebaseIndentString) {
          output.push(basebaseIndentString);
        }
      }
    };
    print.singleSpace = function () {
      if (output.length && !print._lastCharWhitespace()) {
        output.push(" ");
      }
    };

    print.trim = function () {
      while (print._lastCharWhitespace()) {
        output.pop();
      }
    };


    var output = [];
    /*_____________________--------------------_____________________*/

    var insideRule = false;
    var enteringConditionalGroup = false;
    var top_ch = "";
    var last_top_ch = "";

    while (true) {
      var whitespace = skipWhitespace();
      var isAfterSpace = whitespace !== "";
      var isAfterNewline = whitespace.indexOf("\n") !== -1;
      last_top_ch = top_ch;
      top_ch = ch;

      if (!ch) {
        break;
      } else if (ch === "/" && peek() === "*") {
        /* css comment */
        var header = indentLevel === 0;

        if (isAfterNewline || header) {
          print.newLine();
        }

        output.push(eatComment());
        print.newLine();
        if (header) {
          print.newLine(true);
        }
      } else if (ch === "/" && peek() === "/") {
        // single line comment
        if (!isAfterNewline && last_top_ch !== "{") {
          print.trim();
        }
        print.singleSpace();
        output.push(eatComment());
        print.newLine();
      } else if (ch === "@") {
        // pass along the space we found as a separate item
        if (isAfterSpace) {
          print.singleSpace();
        }
        output.push(ch);

        // strip trailing space, if present, for hash property checks
        var variableOrRule = peekString(": ,;{}()[]/='\"");

        if (variableOrRule.match(/[ :]$/)) {
          // we have a variable or pseudo-class, add it and insert one space before continuing
          next();
          variableOrRule = eatString(": ").replace(/\s$/, "");
          output.push(variableOrRule);
          print.singleSpace();
        }

        variableOrRule = variableOrRule.replace(/\s$/, "");

        // might be a nesting at-rule
        if (variableOrRule in css_beautify.NESTED_AT_RULE) {
          nestedLevel += 1;
          if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
            enteringConditionalGroup = true;
          }
        }
      } else if (ch === "{") {
        if (peek(true) === "}") {
          eatWhitespace();
          next();
          print.singleSpace();
          output.push("{}");
          print.newLine();
          if (newline_between_rules && indentLevel === 0) {
            print.newLine(true);
          }
        } else {
          indent();
          print["{"](ch);
          // when entering conditional groups, only rulesets are allowed
          if (enteringConditionalGroup) {
            enteringConditionalGroup = false;
            insideRule = (indentLevel > nestedLevel);
          } else {
            // otherwise, declarations are also allowed
            insideRule = (indentLevel >= nestedLevel);
          }
        }
      } else if (ch === "}") {
        outdent();
        print["}"](ch);
        insideRule = false;
        if (nestedLevel) {
          nestedLevel--;
        }
        if (newline_between_rules && indentLevel === 0) {
          print.newLine(true);
        }
      } else if (ch === ":") {
        eatWhitespace();
        if ((insideRule || enteringConditionalGroup) && !(lookBack("&") || foundNestedPseudoClass())) {
          // 'property: value' delimiter
          // which could be in a conditional group query
          output.push(":");
          print.singleSpace();
        } else {
          // sass/less parent reference don't use a space
          // sass nested pseudo-class don't use a space
          if (peek() === ":") {
            // pseudo-element
            next();
            output.push("::");
          } else {
            // pseudo-class
            output.push(":");
          }
        }
      } else if (ch === "\"" || ch === "'") {
        if (isAfterSpace) {
          print.singleSpace();
        }
        output.push(eatString(ch));
      } else if (ch === ";") {
        output.push(ch);
        print.newLine();
      } else if (ch === "(") {
        // may be a url
        if (lookBack("url")) {
          output.push(ch);
          eatWhitespace();
          if (next()) {
            if (ch !== ")" && ch !== "\"" && ch !== "'") {
              output.push(eatString(")"));
            } else {
              pos--;
            }
          }
        } else {
          parenLevel++;
          if (isAfterSpace) {
            print.singleSpace();
          }
          output.push(ch);
          eatWhitespace();
        }
      } else if (ch === ")") {
        output.push(ch);
        parenLevel--;
      } else if (ch === ",") {
        output.push(ch);
        eatWhitespace();
        if (!insideRule && selectorSeparatorNewline && parenLevel < 1) {
          print.newLine();
        } else {
          print.singleSpace();
        }
      } else if (ch === "]") {
        output.push(ch);
      } else if (ch === "[") {
        if (isAfterSpace) {
          print.singleSpace();
        }
        output.push(ch);
      } else if (ch === "=") {
        // no whitespace before or after
        eatWhitespace();
        ch = "=";
        output.push(ch);
      } else {
        if (isAfterSpace) {
          print.singleSpace();
        }

        output.push(ch);
      }
    }


    var sweetCode = "";
    if (basebaseIndentString) {
      sweetCode += basebaseIndentString;
    }

    sweetCode += output.join("").replace(/[\r\n\t ]+$/, "");

    // establish end_with_newline
    if (end_with_newline) {
      sweetCode += "\n";
    }

    return sweetCode;
  }

  // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
  css_beautify.NESTED_AT_RULE = {
    "@page": true,
    "@font-face": true,
    "@keyframes": true,
    // also in CONDITIONAL_GROUP_RULE below
    "@media": true,
    "@supports": true,
    "@document": true
  };
  css_beautify.CONDITIONAL_GROUP_RULE = {
    "@media": true,
    "@supports": true,
    "@document": true
  };

  /*global define */
  if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([], function () {
      return {
        css_beautify: css_beautify
      };
    });
  } else if (typeof exports !== "undefined") {
    // Add support for CommonJS. Just put this file somewhere on your require.paths
    // and you will be able to `var html_beautify = require("beautify").html_beautify`.
    exports.css_beautify = css_beautify;
  } else if (typeof window !== "undefined") {
    // If we're running a web page and don't have either of the above, add our one global
    window.css_beautify = css_beautify;
  } else if (typeof global !== "undefined") {
    // If we don't even have window, try global.
    global.css_beautify = css_beautify;
  }
}());

/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline
    extra_liners (default [head,body,/html]) -List of tags that should have an extra newline before them.

    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false,
      'extra_liners': ['/html']
    });
*/

(function () {
  function trim(s) {
    return s.replace(/^\s+|\s+$/g, "");
  }

  function ltrim(s) {
    return s.replace(/^\s+/g, "");
  }

  function rtrim(s) {
    return s.replace(/\s+$/g, "");
  }

  function style_html(html_source, options, js_beautify, css_beautify) {
    //Wrapper function to invoke all the necessary constructors and deal with the output.

    var multi_parser, indent_inner_html, indent_size, indent_character, wrap_line_length, brace_style, unformatted, preserve_newlines, max_preserve_newlines, indent_handlebars, wrap_attributes, wrap_attributes_indent_size, end_with_newline, extra_liners;

    options = options || {};

    // backwards compatibility to 1.3.4
    if ((options.wrap_line_length === undefined || parseInt(options.wrap_line_length, 10) === 0) && (options.max_char !== undefined && parseInt(options.max_char, 10) !== 0)) {
      options.wrap_line_length = options.max_char;
    }

    indent_inner_html = (options.indent_inner_html === undefined) ? false : options.indent_inner_html;
    indent_size = (options.indent_size === undefined) ? 4 : parseInt(options.indent_size, 10);
    indent_character = (options.indent_char === undefined) ? " " : options.indent_char;
    brace_style = (options.brace_style === undefined) ? "collapse" : options.brace_style;
    wrap_line_length = parseInt(options.wrap_line_length, 10) === 0 ? 32786 : parseInt(options.wrap_line_length || 250, 10);
    unformatted = options.unformatted || ["a", "span", "img", "bdo", "em", "strong", "dfn", "code", "samp", "kbd", "var", "cite", "abbr", "acronym", "q", "sub", "sup", "tt", "i", "b", "big", "small", "u", "s", "strike", "font", "ins", "del", "pre", "address", "dt", "h1", "h2", "h3", "h4", "h5", "h6"];
    preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
    max_preserve_newlines = preserve_newlines ? (isNaN(parseInt(options.max_preserve_newlines, 10)) ? 32786 : parseInt(options.max_preserve_newlines, 10)) : 0;
    indent_handlebars = (options.indent_handlebars === undefined) ? false : options.indent_handlebars;
    wrap_attributes = (options.wrap_attributes === undefined) ? "auto" : options.wrap_attributes;
    wrap_attributes_indent_size = (options.wrap_attributes_indent_size === undefined) ? indent_size : parseInt(options.wrap_attributes_indent_size, 10) || indent_size;
    end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
    extra_liners = Array.isArray(options.extra_liners) ? options.extra_liners.concat() : (typeof options.extra_liners === "string") ? options.extra_liners.split(",") : "head,body,/html".split(",");

    if (options.indent_with_tabs) {
      indent_character = "\t";
      indent_size = 1;
    }

    function Parser() {
      this.pos = 0; //Parser position
      this.token = "";
      this.current_mode = "CONTENT"; //reflects the current Parser mode: TAG/CONTENT
      this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
        parent: "parent1",
        parentcount: 1,
        parent1: ""
      };
      this.tag_type = "";
      this.token_text = this.last_token = this.last_text = this.token_type = "";
      this.newlines = 0;
      this.indent_content = indent_inner_html;

      this.Utils = { //Uilities made available to the various functions
        whitespace: "\n\r\t ".split(""),
        single_token: "br,input,link,meta,source,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?=".split(","), //all the single tags for HTML
        extra_liners: extra_liners, //for tags that need a line of whitespace before them
        in_array: function (what, arr) {
          for (var i = 0; i < arr.length; i++) {
            if (what === arr[i]) {
              return true;
            }
          }
          return false;
        }
      };

      // Return true if the given text is composed entirely of whitespace.
      this.is_whitespace = function (text) {
        for (var n = 0; n < text.length; text++) {
          if (!this.Utils.in_array(text.charAt(n), this.Utils.whitespace)) {
            return false;
          }
        }
        return true;
      };

      this.traverse_whitespace = function () {
        var input_char = "";

        input_char = this.input.charAt(this.pos);
        if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
          this.newlines = 0;
          while (this.Utils.in_array(input_char, this.Utils.whitespace)) {
            if (preserve_newlines && input_char === "\n" && this.newlines <= max_preserve_newlines) {
              this.newlines += 1;
            }

            this.pos++;
            input_char = this.input.charAt(this.pos);
          }
          return true;
        }
        return false;
      };

      // Append a space to the given content (string array) or, if we are
      // at the wrap_line_length, append a newline/indentation.
      this.space_or_wrap = function (content) {
        if (this.line_char_count >= this.wrap_line_length) {
          //insert a line when the wrap_line_length is reached
          this.print_newline(false, content);
          this.print_indentation(content);
        } else {
          this.line_char_count++;
          content.push(" ");
        }
      };

      this.get_content = function () {
        //function to capture regular content between tags
        var input_char = "", content = [], space = false; //if a space is needed

        while (this.input.charAt(this.pos) !== "<") {
          if (this.pos >= this.input.length) {
            return content.length ? content.join("") : ["", "TK_EOF"];
          }

          if (this.traverse_whitespace()) {
            this.space_or_wrap(content);
            continue;
          }

          if (indent_handlebars) {
            // Handlebars parsing is complicated.
            // {{#foo}} and {{/foo}} are formatted tags.
            // {{something}} should get treated as content, except:
            // {{else}} specifically behaves like {{#if}} and {{/if}}
            var peek3 = this.input.substr(this.pos, 3);
            if (peek3 === "{{#" || peek3 === "{{/") {
              // These are tags and not content.
              break;
            } else if (peek3 === "{{!") {
              return [this.get_tag(), "TK_TAG_HANDLEBARS_COMMENT"];
            } else if (this.input.substr(this.pos, 2) === "{{") {
              if (this.get_tag(true) === "{{else}}") {
                break;
              }
            }
          }

          input_char = this.input.charAt(this.pos);
          this.pos++;
          this.line_char_count++;
          content.push(input_char); //letter at-a-time (or string) inserted to an array
        }
        return content.length ? content.join("") : "";
      };

      this.get_contents_to = function (name) {
        //get the full content of a script or style to pass to js_beautify
        if (this.pos === this.input.length) {
          return ["", "TK_EOF"];
        }
        var input_char = "";
        var content = "";
        var reg_match = new RegExp("</" + name + "\\s*>", "igm");
        reg_match.lastIndex = this.pos;
        var reg_array = reg_match.exec(this.input);
        var end_script = reg_array ? reg_array.index : this.input.length; //absolute end of script
        if (this.pos < end_script) {
          //get everything in between the script tags
          content = this.input.substring(this.pos, end_script);
          this.pos = end_script;
        }
        return content;
      };

      this.record_tag = function (tag) {
        //function to record a tag and its parent in this.tags Object
        if (this.tags[tag + "count"]) {
          //check for the existence of this tag type
          this.tags[tag + "count"]++;
          this.tags[tag + this.tags[tag + "count"]] = this.indent_level; //and record the present indent level
        } else {
          //otherwise initialize this tag type
          this.tags[tag + "count"] = 1;
          this.tags[tag + this.tags[tag + "count"]] = this.indent_level; //and record the present indent level
        }
        this.tags[tag + this.tags[tag + "count"] + "parent"] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
        this.tags.parent = tag + this.tags[tag + "count"]; //and make this the current parent (i.e. in the case of a div 'div1')
      };

      this.retrieve_tag = function (tag) {
        //function to retrieve the opening tag to the corresponding closer
        if (this.tags[tag + "count"]) {
          //if the openener is not in the Object we ignore it
          var temp_parent = this.tags.parent; //check to see if it's a closable tag.
          while (temp_parent) {
            //till we reach '' (the initial value);
            if (tag + this.tags[tag + "count"] === temp_parent) {
              //if this is it use it
              break;
            }
            temp_parent = this.tags[temp_parent + "parent"]; //otherwise keep on climbing up the DOM Tree
          }
          if (temp_parent) {
            //if we caught something
            this.indent_level = this.tags[tag + this.tags[tag + "count"]]; //set the indent_level accordingly
            this.tags.parent = this.tags[temp_parent + "parent"]; //and set the current parent
          }
          delete this.tags[tag + this.tags[tag + "count"] + "parent"]; //delete the closed tags parent reference...
          delete this.tags[tag + this.tags[tag + "count"]]; //...and the tag itself
          if (this.tags[tag + "count"] === 1) {
            delete this.tags[tag + "count"];
          } else {
            this.tags[tag + "count"]--;
          }
        }
      };

      this.indent_to_tag = function (tag) {
        // Match the indentation level to the last use of this tag, but don't remove it.
        if (!this.tags[tag + "count"]) {
          return;
        }
        var temp_parent = this.tags.parent;
        while (temp_parent) {
          if (tag + this.tags[tag + "count"] === temp_parent) {
            break;
          }
          temp_parent = this.tags[temp_parent + "parent"];
        }
        if (temp_parent) {
          this.indent_level = this.tags[tag + this.tags[tag + "count"]];
        }
      };

      this.get_tag = function (peek) {
        //function to get a full tag and parse its type
        var input_char = "", content = [], comment = "", space = false, first_attr = true, tag_start, tag_end, tag_start_char, orig_pos = this.pos, orig_line_char_count = this.line_char_count;

        peek = peek !== undefined ? peek : false;

        do {
          if (this.pos >= this.input.length) {
            if (peek) {
              this.pos = orig_pos;
              this.line_char_count = orig_line_char_count;
            }
            return content.length ? content.join("") : ["", "TK_EOF"];
          }

          input_char = this.input.charAt(this.pos);
          this.pos++;

          if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
            //don't want to insert unnecessary space
            space = true;
            continue;
          }

          if (input_char === "'" || input_char === "\"") {
            input_char += this.get_unformatted(input_char);
            space = true;
          }

          if (input_char === "=") {
            //no space before =
            space = false;
          }

          if (content.length && content[content.length - 1] !== "=" && input_char !== ">" && space) {
            //no space after = or before >
            this.space_or_wrap(content);
            space = false;
            if (!first_attr && wrap_attributes === "force" && input_char !== "/") {
              this.print_newline(true, content);
              this.print_indentation(content);
              for (var count = 0; count < wrap_attributes_indent_size; count++) {
                content.push(indent_character);
              }
            }
            for (var i = 0; i < content.length; i++) {
              if (content[i] === " ") {
                first_attr = false;
                break;
              }
            }
          }

          if (indent_handlebars && tag_start_char === "<") {
            // When inside an angle-bracket tag, put spaces around
            // handlebars not inside of strings.
            if ((input_char + this.input.charAt(this.pos)) === "{{") {
              input_char += this.get_unformatted("}}");
              if (content.length && content[content.length - 1] !== " " && content[content.length - 1] !== "<") {
                input_char = " " + input_char;
              }
              space = true;
            }
          }

          if (input_char === "<" && !tag_start_char) {
            tag_start = this.pos - 1;
            tag_start_char = "<";
          }

          if (indent_handlebars && !tag_start_char) {
            if (content.length >= 2 && content[content.length - 1] === "{" && content[content.length - 2] === "{") {
              if (input_char === "#" || input_char === "/" || input_char === "!") {
                tag_start = this.pos - 3;
              } else {
                tag_start = this.pos - 2;
              }
              tag_start_char = "{";
            }
          }

          this.line_char_count++;
          content.push(input_char); //inserts character at-a-time (or string)

          if (content[1] && content[1] === "!") {
            //if we're in a comment, do something special
            // We treat all comments as literals, even more than preformatted tags
            // we just look for the appropriate close tag
            content = [this.get_comment(tag_start)];
            break;
          }

          if (indent_handlebars && content[1] && content[1] === "{" && content[2] && content[2] === "!") {
            //if we're in a comment, do something special
            // We treat all comments as literals, even more than preformatted tags
            // we just look for the appropriate close tag
            content = [this.get_comment(tag_start)];
            break;
          }

          if (indent_handlebars && tag_start_char === "{" && content.length > 2 && content[content.length - 2] === "}" && content[content.length - 1] === "}") {
            break;
          }
        } while (input_char !== ">");

        var tag_complete = content.join("");
        var tag_index;
        var tag_offset;

        if (tag_complete.indexOf(" ") !== -1) {
          //if there's whitespace, thats where the tag name ends
          tag_index = tag_complete.indexOf(" ");
        } else if (tag_complete[0] === "{") {
          tag_index = tag_complete.indexOf("}");
        } else {
          //otherwise go with the tag ending
          tag_index = tag_complete.indexOf(">");
        }
        if (tag_complete[0] === "<" || !indent_handlebars) {
          tag_offset = 1;
        } else {
          tag_offset = tag_complete[2] === "#" ? 3 : 2;
        }
        var tag_check = tag_complete.substring(tag_offset, tag_index).toLowerCase();
        if (tag_complete.charAt(tag_complete.length - 2) === "/" || this.Utils.in_array(tag_check, this.Utils.single_token)) {
          //if this tag name is a single tag type (either in the list or has a closing /)
          if (!peek) {
            this.tag_type = "SINGLE";
          }
        } else if (indent_handlebars && tag_complete[0] === "{" && tag_check === "else") {
          if (!peek) {
            this.indent_to_tag("if");
            this.tag_type = "HANDLEBARS_ELSE";
            this.indent_content = true;
            this.traverse_whitespace();
          }
        } else if (this.is_unformatted(tag_check, unformatted)) {
          // do not reformat the "unformatted" tags
          comment = this.get_unformatted("</" + tag_check + ">", tag_complete); //...delegate to get_unformatted function
          content.push(comment);
          tag_end = this.pos - 1;
          this.tag_type = "SINGLE";
        } else if (tag_check === "script" && (tag_complete.search("type") === -1 || (tag_complete.search("type") > -1 && tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/) > -1))) {
          if (!peek) {
            this.record_tag(tag_check);
            this.tag_type = "SCRIPT";
          }
        } else if (tag_check === "style" && (tag_complete.search("type") === -1 || (tag_complete.search("type") > -1 && tag_complete.search("text/css") > -1))) {
          if (!peek) {
            this.record_tag(tag_check);
            this.tag_type = "STYLE";
          }
        } else if (tag_check.charAt(0) === "!") {
          //peek for <! comment
          // for comments content is already correct.
          if (!peek) {
            this.tag_type = "SINGLE";
            this.traverse_whitespace();
          }
        } else if (!peek) {
          if (tag_check.charAt(0) === "/") {
            //this tag is a double tag so check for tag-ending
            this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
            this.tag_type = "END";
          } else {
            //otherwise it's a start-tag
            this.record_tag(tag_check); //push it on the tag stack
            if (tag_check.toLowerCase() !== "html") {
              this.indent_content = true;
            }
            this.tag_type = "START";
          }

          // Allow preserving of newlines after a start or end tag
          if (this.traverse_whitespace()) {
            this.space_or_wrap(content);
          }

          if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) {
            //check if this double needs an extra line
            this.print_newline(false, this.output);
            if (this.output.length && this.output[this.output.length - 2] !== "\n") {
              this.print_newline(true, this.output);
            }
          }
        }

        if (peek) {
          this.pos = orig_pos;
          this.line_char_count = orig_line_char_count;
        }

        return content.join(""); //returns fully formatted tag
      };

      this.get_comment = function (start_pos) {
        //function to return comment content in its entirety
        // this is will have very poor perf, but will work for now.
        var comment = "", delimiter = ">", matched = false;

        this.pos = start_pos;
        input_char = this.input.charAt(this.pos);
        this.pos++;

        while (this.pos <= this.input.length) {
          comment += input_char;

          // only need to check for the delimiter if the last chars match
          if (comment[comment.length - 1] === delimiter[delimiter.length - 1] && comment.indexOf(delimiter) !== -1) {
            break;
          }

          // only need to search for custom delimiter for the first few characters
          if (!matched && comment.length < 10) {
            if (comment.indexOf("<![if") === 0) {
              //peek for <![if conditional comment
              delimiter = "<![endif]>";
              matched = true;
            } else if (comment.indexOf("<![cdata[") === 0) {
              //if it's a <[cdata[ comment...
              delimiter = "]]>";
              matched = true;
            } else if (comment.indexOf("<![") === 0) {
              // some other ![ comment? ...
              delimiter = "]>";
              matched = true;
            } else if (comment.indexOf("<!--") === 0) {
              // <!-- comment ...
              delimiter = "-->";
              matched = true;
            } else if (comment.indexOf("{{!") === 0) {
              // {{! handlebars comment
              delimiter = "}}";
              matched = true;
            }
          }

          input_char = this.input.charAt(this.pos);
          this.pos++;
        }

        return comment;
      };

      this.get_unformatted = function (delimiter, orig_tag) {
        //function to return unformatted content in its entirety

        if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) !== -1) {
          return "";
        }
        var input_char = "";
        var content = "";
        var min_index = 0;
        var space = true;
        do {
          if (this.pos >= this.input.length) {
            return content;
          }

          input_char = this.input.charAt(this.pos);
          this.pos++;

          if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
            if (!space) {
              this.line_char_count--;
              continue;
            }
            if (input_char === "\n" || input_char === "\r") {
              content += "\n";
              /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
              for (var i=0; i<this.indent_level; i++) {
              content += this.indent_string;
              }
              space = false; //...and make sure other indentation is erased
              */
              this.line_char_count = 0;
              continue;
            }
          }
          content += input_char;
          this.line_char_count++;
          space = true;

          if (indent_handlebars && input_char === "{" && content.length && content[content.length - 2] === "{") {
            // Handlebars expressions in strings should also be unformatted.
            content += this.get_unformatted("}}");
            // These expressions are opaque.  Ignore delimiters found in them.
            min_index = content.length;
          }
        } while (content.toLowerCase().indexOf(delimiter, min_index) === -1);
        return content;
      };

      this.get_token = function () {
        //initial handler for token-retrieval
        var token;

        if (this.last_token === "TK_TAG_SCRIPT" || this.last_token === "TK_TAG_STYLE") {
          //check if we need to format javascript
          var type = this.last_token.substr(7);
          token = this.get_contents_to(type);
          if (typeof token !== "string") {
            return token;
          }
          return [token, "TK_" + type];
        }
        if (this.current_mode === "CONTENT") {
          token = this.get_content();
          if (typeof token !== "string") {
            return token;
          } else {
            return [token, "TK_CONTENT"];
          }
        }

        if (this.current_mode === "TAG") {
          token = this.get_tag();
          if (typeof token !== "string") {
            return token;
          } else {
            var tag_name_type = "TK_TAG_" + this.tag_type;
            return [token, tag_name_type];
          }
        }
      };

      this.get_full_indent = function (level) {
        level = this.indent_level + level || 0;
        if (level < 1) {
          return "";
        }

        return Array(level + 1).join(this.indent_string);
      };

      this.is_unformatted = function (tag_check, unformatted) {
        //is this an HTML5 block-level link?
        if (!this.Utils.in_array(tag_check, unformatted)) {
          return false;
        }

        if (tag_check.toLowerCase() !== "a" || !this.Utils.in_array("a", unformatted)) {
          return true;
        }

        //at this point we have an  tag; is its first child something we want to remain
        //unformatted?
        var next_tag = this.get_tag(true /* peek. */);

        // test next_tag to see if it is just html tag (no external content)
        var tag = (next_tag || "").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

        // if next_tag comes back but is not an isolated tag, then
        // let's treat the 'a' tag as having content
        // and respect the unformatted option
        if (!tag || this.Utils.in_array(tag, unformatted)) {
          return true;
        } else {
          return false;
        }
      };

      this.printer = function (js_source, indent_character, indent_size, wrap_line_length, brace_style) {
        //handles input/output and some other printing functions

        this.input = js_source || ""; //gets the input for the Parser
        this.output = [];
        this.indent_character = indent_character;
        this.indent_string = "";
        this.indent_size = indent_size;
        this.brace_style = brace_style;
        this.indent_level = 0;
        this.wrap_line_length = wrap_line_length;
        this.line_char_count = 0; //count to see if wrap_line_length was exceeded

        for (var i = 0; i < this.indent_size; i++) {
          this.indent_string += this.indent_character;
        }

        this.print_newline = function (force, arr) {
          this.line_char_count = 0;
          if (!arr || !arr.length) {
            return;
          }
          if (force || (arr[arr.length - 1] !== "\n")) {
            //we might want the extra line
            if ((arr[arr.length - 1] !== "\n")) {
              arr[arr.length - 1] = rtrim(arr[arr.length - 1]);
            }
            arr.push("\n");
          }
        };

        this.print_indentation = function (arr) {
          for (var i = 0; i < this.indent_level; i++) {
            arr.push(this.indent_string);
            this.line_char_count += this.indent_string.length;
          }
        };

        this.print_token = function (text) {
          // Avoid printing initial whitespace.
          if (this.is_whitespace(text) && !this.output.length) {
            return;
          }
          if (text || text !== "") {
            if (this.output.length && this.output[this.output.length - 1] === "\n") {
              this.print_indentation(this.output);
              text = ltrim(text);
            }
          }
          this.print_token_raw(text);
        };

        this.print_token_raw = function (text) {
          // If we are going to print newlines, truncate trailing
          // whitespace, as the newlines will represent the space.
          if (this.newlines > 0) {
            text = rtrim(text);
          }

          if (text && text !== "") {
            if (text.length > 1 && text[text.length - 1] === "\n") {
              // unformatted tags can grab newlines as their last character
              this.output.push(text.slice(0, -1));
              this.print_newline(false, this.output);
            } else {
              this.output.push(text);
            }
          }

          for (var n = 0; n < this.newlines; n++) {
            this.print_newline(n > 0, this.output);
          }
          this.newlines = 0;
        };

        this.indent = function () {
          this.indent_level++;
        };

        this.unindent = function () {
          if (this.indent_level > 0) {
            this.indent_level--;
          }
        };
      };
      return this;
    }

    /*_____________________--------------------_____________________*/

    multi_parser = new Parser(); //wrapping functions Parser
    multi_parser.printer(html_source, indent_character, indent_size, wrap_line_length, brace_style); //initialize starting values

    while (true) {
      var t = multi_parser.get_token();
      multi_parser.token_text = t[0];
      multi_parser.token_type = t[1];

      if (multi_parser.token_type === "TK_EOF") {
        break;
      }

      switch (multi_parser.token_type) {
        case "TK_TAG_START":
          multi_parser.print_newline(false, multi_parser.output);
          multi_parser.print_token(multi_parser.token_text);
          if (multi_parser.indent_content) {
            multi_parser.indent();
            multi_parser.indent_content = false;
          }
          multi_parser.current_mode = "CONTENT";
          break;
        case "TK_TAG_STYLE":
        case "TK_TAG_SCRIPT":
          multi_parser.print_newline(false, multi_parser.output);
          multi_parser.print_token(multi_parser.token_text);
          multi_parser.current_mode = "CONTENT";
          break;
        case "TK_TAG_END":
          //Print new line only if the tag has no content and has child
          if (multi_parser.last_token === "TK_CONTENT" && multi_parser.last_text === "") {
            var tag_name = multi_parser.token_text.match(/\w+/)[0];
            var tag_extracted_from_last_output = null;
            if (multi_parser.output.length) {
              tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/(?:<|{{#)\s*(\w+)/);
            }
            if (tag_extracted_from_last_output === null || (tag_extracted_from_last_output[1] !== tag_name && !multi_parser.Utils.in_array(tag_extracted_from_last_output[1], unformatted))) {
              multi_parser.print_newline(false, multi_parser.output);
            }
          }
          multi_parser.print_token(multi_parser.token_text);
          multi_parser.current_mode = "CONTENT";
          break;
        case "TK_TAG_SINGLE":
          // Don't add a newline before elements that should remain unformatted.
          var tag_check = multi_parser.token_text.match(/^\s*<([a-z-]+)/i);
          if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
            multi_parser.print_newline(false, multi_parser.output);
          }
          multi_parser.print_token(multi_parser.token_text);
          multi_parser.current_mode = "CONTENT";
          break;
        case "TK_TAG_HANDLEBARS_ELSE":
          multi_parser.print_token(multi_parser.token_text);
          if (multi_parser.indent_content) {
            multi_parser.indent();
            multi_parser.indent_content = false;
          }
          multi_parser.current_mode = "CONTENT";
          break;
        case "TK_TAG_HANDLEBARS_COMMENT":
          multi_parser.print_token(multi_parser.token_text);
          multi_parser.current_mode = "TAG";
          break;
        case "TK_CONTENT":
          multi_parser.print_token(multi_parser.token_text);
          multi_parser.current_mode = "TAG";
          break;
        case "TK_STYLE":
        case "TK_SCRIPT":
          if (multi_parser.token_text !== "") {
            multi_parser.print_newline(false, multi_parser.output);
            var text = multi_parser.token_text, _beautifier, script_indent_level = 1;
            if (multi_parser.token_type === "TK_SCRIPT") {
              _beautifier = typeof js_beautify === "function" && js_beautify;
            } else if (multi_parser.token_type === "TK_STYLE") {
              _beautifier = typeof css_beautify === "function" && css_beautify;
            }

            if (options.indent_scripts === "keep") {
              script_indent_level = 0;
            } else if (options.indent_scripts === "separate") {
              script_indent_level = -multi_parser.indent_level;
            }

            var indentation = multi_parser.get_full_indent(script_indent_level);
            if (_beautifier) {
              // call the Beautifier if avaliable
              text = _beautifier(text.replace(/^\s*/, indentation), options);
            } else {
              // simply indent the string otherwise
              var white = text.match(/^\s*/)[0];
              var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
              var reindent = multi_parser.get_full_indent(script_indent_level - _level);
              text = text.replace(/^\s*/, indentation).replace(/\r\n|\r|\n/g, "\n" + reindent).replace(/\s+$/, "");
            }
            if (text) {
              multi_parser.print_token_raw(text);
              multi_parser.print_newline(true, multi_parser.output);
            }
          }
          multi_parser.current_mode = "TAG";
          break;
        default:
          // We should not be getting here but we don't want to drop input on the floor
          // Just output the text and move on
          if (multi_parser.token_text !== "") {
            multi_parser.print_token(multi_parser.token_text);
          }
          break;
      }
      multi_parser.last_token = multi_parser.token_type;
      multi_parser.last_text = multi_parser.token_text;
    }
    var sweet_code = multi_parser.output.join("").replace(/[\r\n\t ]+$/, "");
    if (end_with_newline) {
      sweet_code += "\n";
    }
    return sweet_code;
  }

  if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define(["require", "./beautify", "./beautify-css"], function (requireamd) {
      var js_beautify = requireamd("./beautify");
      var css_beautify = requireamd("./beautify-css");

      return {
        html_beautify: function (html_source, options) {
          return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
        }
      };
    });
  } else if (typeof exports !== "undefined") {
    // Add support for CommonJS. Just put this file somewhere on your require.paths
    // and you will be able to `var html_beautify = require("beautify").html_beautify`.
    var js_beautify = require("./beautify.js");
    var css_beautify = require("./beautify-css.js");

    exports.html_beautify = function (html_source, options) {
      return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
    };
  } else if (typeof window !== "undefined") {
    // If we're running a web page and don't have either of the above, add our one global
    window.html_beautify = function (html_source, options) {
      return style_html(html_source, options, window.js_beautify, window.css_beautify);
    };
  } else if (typeof global !== "undefined") {
    // If we don't even have window, try global.
    global.html_beautify = function (html_source, options) {
      return style_html(html_source, options, global.js_beautify, global.css_beautify);
    };
  }
}());

(function (window) {
  "use strict";

  var proto = Object.create(HTMLElement.prototype);

  var template = "<style>\n  .container {\n    position: relative;\n    width: 100%;\n    height: 100%;\n  }\n  .line-numbers {\n    background: #95368c;\n    color: #fff;\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n    position: absolute;\n    padding: 0 2px;\n    top: 0;\n    left: 0;\n    width: 28px;\n    height: 100%;\n    overflow: hidden;\n  }\n  textarea {\n    background: #000;\n    border: none;\n    color: #fff;\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n    position: absolute;\n    top: 0;\n    left: 32px;\n    width: calc(100% - 32px);\n    height: 100%;\n    margin: 0;\n    padding: 0;\n    -moz-user-select: text !important;\n  }\n  .line-numbers,\n  textarea {\n    font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n    font-size: 14px;\n    line-height: 1.2em;\n  }\n</style>\n<div class=\"container\">\n  <div class=\"line-numbers\">\n    <div>1</div>\n  </div>\n  <textarea wrap=\"off\"></textarea>\n</div>";

  proto.createdCallback = function () {
    var _this3 = this;
    var value = this.innerHTML;

    this.shadow = this.createShadowRoot();
    this.shadow.innerHTML = template;

    this.lineNumbers = this.shadow.querySelector(".line-numbers");

    this.textarea = this.shadow.querySelector("textarea");
    this.textarea.value = value;

    this.textarea.addEventListener("keyup", function () {
      _this3.dispatchEvent(new CustomEvent("change"));
      updateLineNumbers(_this3);
    });

    this.textarea.addEventListener("scroll", function () {
      _this3.lineNumbers.scrollTop = _this3.textarea.scrollTop;
    });
  };

  Object.defineProperty(proto, "value", {
    get: function () {
      return this.textarea.value;
    },

    set: function (value) {
      this.textarea.value = value;
      updateLineNumbers(this);
    }
  });

  function updateLineNumbers(element) {
    var html = "";

    var lines = element.value.split("\n").length;
    if (lines === element.lineNumbers.childElementCount) {
      return;
    }

    for (var i = 1; i <= lines; i++) {
      html += "<div>" + i + "</div>";
    }

    element.lineNumbers.innerHTML = html;
    element.lineNumbers.scrollTop = element.textarea.scrollTop;
  }

  try {
    document.registerElement("fxos-code-editor", { prototype: proto });
  } catch (e) {
    if (e.name !== "NotSupportedError") {
      throw e;
    }
  }
})(window);

(function (window) {
  "use strict";

  var shadowHTML = "<style scoped>\n.overlay {\n  display: none;\n  position: absolute;\n  box-sizing: border-box;\n  pointer-events: none;\n  z-index: 9999999; /* above the app, but below the other customizer elements */\n  background-color: #00caf2;\n  border: 2px dotted #fff;\n  outline: 1px solid #00caf2;\n  opacity: 0.75;\n}\n.label {\n  background-color: rgba(0, 0, 0, 0.5);\n  border-bottom-right-radius: 2px;\n  color: #fff;\n  font-family: 'FiraSans';\n  font-size: 10px;\n  line-height: 1.2em;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  display: inline-block;\n  position: absolute;\n  padding: 0 2px;\n  top: 0;\n  left: 0;\n  max-width: 100%;\n  overflow: hidden;\n}\n</style>\n<div class=\"overlay\">\n  <div class=\"label\"></div>\n</div>";

  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function () {
    this.shadow = this.createShadowRoot();
    this.shadow.innerHTML = shadowHTML;
    this.overlay = this.shadow.querySelector(".overlay");
    this.label = this.shadow.querySelector(".label");
  };

  proto.highlight = function (element) {
    // Figure out where the element is
    var rect = element && element.getBoundingClientRect();

    // If the element has zero size, hide the highlight
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      this.overlay.style.display = "none";
    } else {
      // Otherwise, highlight the element.
      // Note that we use add the document scroll offsets to the element
      // coordinates to get document coordinates instead of screen coordinates.
      this.overlay.style.left = (rect.left + window.pageXOffset) + "px";
      this.overlay.style.top = (rect.top + window.pageYOffset) + "px";
      this.overlay.style.width = rect.width + "px";
      this.overlay.style.height = rect.height + "px";
      this.overlay.style.display = "block";

      // Set the label to properly identify the element.
      this.label.textContent = element.tagName;
      if (element.id) {
        this.label.textContent += "#" + element.id;
      }

      // And try to move the element so that it is on screen
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  proto.hide = function () {
    this.overlay.style.display = "none";
  };

  try {
    document.registerElement("fxos-customizer-highlighter", { prototype: proto });
  } catch (e) {
    if (e.name !== "NotSupportedError") {
      throw e;
    }
  }
})(window);

(function (window) {
  "use strict";

  var proto = Object.create(HTMLElement.prototype);

  var template = "<style>\n[data-icon]:before {\n  font-family: \"customizer-gaia-icons\";\n  content: attr(data-icon);\n  display: inline-block;\n  font-weight: 500;\n  font-style: normal;\n  text-decoration: inherit;\n  text-transform: none;\n  text-rendering: optimizeLegibility;\n  font-size: 30px;\n}\n[data-customizer-icon]:before {\n  font-family: \"customizer-icons\";\n  content: attr(data-customizer-icon);\n  display: inline-block;\n  font-weight: 500;\n  font-style: normal;\n  text-decoration: inherit;\n  text-transform: none;\n  text-rendering: optimizeLegibility;\n  font-size: 30px;\n}\ncustomizer-gaia-dom-tree {\n  width: 100%;\n  height: calc(100% - 46px);\n}\n.pin {\n  position: absolute;\n  top: 0;\n  right: 0;\n  margin: 1rem !important;\n  opacity: 1;\n  transition: opacity 0.5s ease-in-out;\n}\n.pin.scrolling {\n  pointer-events: none;\n  opacity: 0;\n}\n</style>\n<customizer-gaia-button circular class=\"pin\" data-action=\"settings\">\n  <i data-icon=\"settings\"></i>\n</customizer-gaia-button>\n<customizer-gaia-dom-tree></customizer-gaia-dom-tree>\n<customizer-gaia-toolbar>\n  <button data-customizer-icon=\"edit\" data-action=\"edit\" disabled></button>\n  <button data-customizer-icon=\"copy\" data-action=\"copyOrMove\" disabled></button>\n  <button data-customizer-icon=\"append\" data-action=\"append\" disabled></button>\n  <button data-customizer-icon=\"remove\" data-action=\"remove\" disabled></button>\n  <button data-customizer-icon=\"source\" data-action=\"viewSource\" disabled></button>\n</customizer-gaia-toolbar>";

  proto.createdCallback = function () {
    this.shadow = this.createShadowRoot();
    this.shadow.innerHTML = template;

    this.settingsButton = this.shadow.querySelector("[data-action=\"settings\"]");
    this.gaiaDomTree = this.shadow.querySelector("customizer-gaia-dom-tree");
    this.gaiaToolbar = this.shadow.querySelector("customizer-gaia-toolbar");

    this.settingsButton.addEventListener("click", this._handleMenuAction.bind(this));
    this.gaiaDomTree.addEventListener("click", this._handleSelected.bind(this));
    this.gaiaToolbar.addEventListener("click", this._handleAction.bind(this));

    this._watchScrolling();

    this.gaiaDomTree.addEventListener("contextmenu", function (evt) {
      evt.stopPropagation();
    });

    this._rootNodeClickHandler = this._handleClick.bind(this);
  };

  proto.setRootNode = function (rootNode) {
    // If we already have a root node defined, disconnect from it first
    if (this._root) {
      this.unwatchChanges();
      this.gaiaDomTree.setRoot(null);
      this.gaiaDomTree.render();
      this._root.removeEventListener("click", this._rootNodeClickHandler);
      this._root = null;
    }

    // If we've got a new root node, set that one up
    if (rootNode) {
      this._root = rootNode;
      rootNode.addEventListener("click", this._rootNodeClickHandler);
      this.gaiaDomTree.setRoot(rootNode);
      this.gaiaDomTree.render();
      this.watchChanges();
    }
  };

  proto._watchScrolling = function () {
    var _this4 = this;
    this.gaiaDomTree.shadowRoot.addEventListener("scroll", function (evt) {
      if (_this4._scrollTimeout) {
        clearTimeout(_this4._scrollTimeout);
      }

      _this4._scrollTimeout = setTimeout(function () {
        _this4.settingsButton.classList.remove("scrolling");
      }, 500);

      _this4.settingsButton.classList.add("scrolling");
    }, true);
  };

  proto._shadowContains = function (el) {
    var customizerRootView = document.body.querySelector(".fxos-customizer-main-view");

    if (!el || el == document.documentElement) {
      return false;
    } else if (el == customizerRootView) {
      return true;
    }

    return this._shadowContains(el.parentNode || el.host);
  };

  proto.watchChanges = function () {
    var _this5 = this;
    var OBSERVER_CONFIG = {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true
    };

    this._observer = new MutationObserver(function (mutations) {
      // Only re-render if a mutation occurred in the app itself, and is
      // outside of the customizer addon. This depends on the customizer
      // root element having the class "fxos-customizer-main-view"
      for (var i = mutations.length - 1; i >= 0; i--) {
        if (!_this5._shadowContains(mutations[i].target)) {
          var selectedNode = _this5.gaiaDomTree.selectedNode;
          _this5.gaiaDomTree.render();
          _this5.select(selectedNode);
          return;
        }
      }
    });

    this._observer.observe(this._root, OBSERVER_CONFIG);
  };

  proto.unwatchChanges = function () {
    this._observer.disconnect();
    this._observer = null;
  };

  proto.select = function (node) {
    this.gaiaDomTree.select(node);
  };

  proto._handleMenuAction = function (e) {
    var action = e.target.dataset.action;
    if (action) {
      this.dispatchEvent(new CustomEvent("menu", {
        detail: action
      }));
    }
  };

  proto._handleSelected = function (e) {
    e.stopPropagation();

    var selectedNode = this.gaiaDomTree.selectedNode;
    if (!selectedNode) {
      return;
    }

    var selected = this._selected = (selectedNode.nodeType === Node.TEXT_NODE) ? selectedNode.parentNode : selectedNode;

    [].forEach.call(this.gaiaToolbar.querySelectorAll("button"), function (button) {
      button.disabled = !selected;
    });

    this.gaiaToolbar.querySelector("[data-action=\"viewSource\"]").disabled = (selected.tagName !== "SCRIPT" || !selected.hasAttribute("src")) && (selected.tagName !== "LINK" || !selected.hasAttribute("href"));

    this.dispatchEvent(new CustomEvent("selected", {
      detail: this._selected
    }));
  };

  proto._handleAction = function (e) {
    this.dispatchEvent(new CustomEvent("action:" + e.target.dataset.action, {
      detail: this._selected
    }));
  };

  proto._handleClick = function (e) {
    if (e.target === this.gaiaDomTree) {
      return;
    }

    this.select(e.target);
  };

  try {
    document.registerElement("fxos-customizer", { prototype: proto });
  } catch (e) {
    if (e.name !== "NotSupportedError") {
      throw e;
    }
  }
})(window);

(function (window) {
  "use strict";

  var HTML_ESCAPE_CHARS = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
    "/": "&#x2F;"
  };

  var CONSTANT_PROPERTY_REGEX = /^[A-Z_]+$/;

  var proto = Object.create(HTMLElement.prototype);

  var template = "<style scoped>\n  [data-icon]:before {\n    font-family: \"customizer-gaia-icons\";\n    content: attr(data-icon);\n    display: inline-block;\n    font-weight: 500;\n    font-style: normal;\n    text-decoration: inherit;\n    text-transform: none;\n    text-rendering: optimizeLegibility;\n    font-size: 30px;\n  }\n  [flex] {\n    display: flex;\n    justify-content: space-between;\n    padding: 0 5px;\n  }\n  [flex] > * {\n    flex: 1 1 auto;\n    margin-right: 5px;\n    margin-left: 5px;\n  }\n  #container {\n    box-sizing: border-box;\n    position: relative;\n    width: 100%;\n    height: 100%;\n    overflow-x: hidden;\n    overflow-y: auto;\n  }\n  customizer-gaia-list a {\n    position: relative;\n    text-decoration: none;\n  }\n  customizer-gaia-list [hidden] {\n    display: none;\n  }\n  customizer-gaia-list h3 {\n    font-size: 18px;\n    max-width: calc(100% - 2em);\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  customizer-gaia-list [data-icon] {\n    position: absolute;\n    padding: 1.6em 1em;\n    top: 0;\n    right: 0;\n  }\n  customizer-gaia-list .value {\n    color: #00aac5;\n  }\n  fxos-code-editor {\n    display: block;\n    width: 100%;\n    height: calc(100% - 100px);\n  }\n</style>\n<div id=\"container\"></div>\n<customizer-gaia-dialog-prompt id=\"new-attribute-name\">\n  Enter new attribute name\n</customizer-gaia-dialog-prompt>";

  proto.createdCallback = function () {
    var _this6 = this;
    this.shadow = this.createShadowRoot();
    this.shadow.innerHTML = template;

    this.container = this.shadow.querySelector("#container");
    this.newAttributeName = this.shadow.querySelector("#new-attribute-name");

    this.keyPath = [];

    // Handle all clicks within this component.
    this.container.addEventListener("click", function (evt) {
      // Handle case where <a href> was clicked.
      var target = evt.target.closest("a");
      if (target) {
        evt.preventDefault();

        // Handle case where <i data-action="remove"> was clicked.
        if (evt.target.dataset.action === "remove") {
          _this6._handleRemoveAttributeClick(target);
        }

        // Otherwise, treat as regular list item click.
        else {
          _this6._handleListItemClick(target);
        }
        return;
      }

      // Handle case where <customizer-gaia-button> was clicked.
      target = evt.target.closest("customizer-gaia-button");
      if (target) {
        evt.preventDefault();
        _this6._handleButtonClick(target);
        return;
      }
    });

    // Filter the list of properties 500ms after a keypress
    // in the <customizer-gaia-text-input> search box.
    this.container.addEventListener("keyup", function (evt) {
      var textInput = evt.target.closest("customizer-gaia-text-input");
      if (!textInput) {
        return;
      }

      clearTimeout(_this6._searchTimeout);
      _this6._searchTimeout = setTimeout(function () {
        var value = textInput.value.toLowerCase();
        var items = [].slice.apply(_this6.container.querySelectorAll("customizer-gaia-list a[data-search]"));

        // Toggle each list items' [hidden] attribute if the search text
        // isn't blank and the items' [data-search] value contains the
        // current search text.
        items.forEach(function (i) {
          return i.hidden = value && i.dataset.search.indexOf(value) === -1;
        });
      }, 500);
    });

    // Automatically set focus to the input box when the
    // <customizer-gaia-dialog-prompt> is opened.
    this.newAttributeName.addEventListener("opened", function () {
      _this6.newAttributeName.els.input.focus();
    });

    // Reset the <customizer-gaia-dialog-prompt> value when closed.
    this.newAttributeName.addEventListener("closed", function () {
      _this6.newAttributeName.els.input.value = "";
    });

    // Create a new attribute when the <customizer-gaia-dialog-prompt>
    // is submitted.
    this.newAttributeName.els.submit.addEventListener("click", function () {
      try {
        var name = _this6.newAttributeName.els.input.value;
        var attribute = document.createAttribute(name);

        _this6.target.setNamedItem(attribute);

        _this6.dispatchEvent(new CustomEvent("createattribute", {
          detail: JSON.stringify({
            keyPath: _this6.keyPath,
            expression: "['" + _this6.keyPath.join("']['") + "']",
            name: name
          })
        }));
      } catch (e) {
        window.alert("Invalid attribute name");
        return;
      }

      _this6.render();
    });
  };

  proto.render = function () {
    var _this7 = this;
    clearTimeout(this._searchTimeout);

    this.target = this.rootTarget;
    this.keyPath.forEach(function (key) {
      return _this7.target = _this7.target[key];
    });

    this.container.innerHTML = renderTargetPage(this.target, this.keyPath.length === 0).innerHTML;
    this.container.scrollTo(0, 0);
  };

  proto.setRootTarget = function (rootTarget) {
    this.rootTarget = rootTarget;
    this.target = this.rootTarget;

    this.keyPath = [];
    this.render();
  };

  proto._handleButtonClick = function (target) {
    var _this8 = this;
    switch (target.dataset.action) {
      case "cancel":
        this.keyPath.pop();
        break;
      case "save":
        (function () {
          var value = _this8.container.querySelector("fxos-code-editor").value;
          var target = _this8.rootTarget;

          _this8.keyPath.forEach(function (key, index) {
            if (index < _this8.keyPath.length - 1) {
              target = target[key];
              return;
            }

            target[key] = value;
          });

          _this8.dispatchEvent(new CustomEvent("save", {
            detail: JSON.stringify({
              keyPath: _this8.keyPath,
              expression: "['" + _this8.keyPath.join("']['") + "']",
              value: value
            })
          }));

          _this8.keyPath.pop();
        })();
        break;
      default:
        break;
    }

    this.render();
  };

  proto._handleRemoveAttributeClick = function (target) {
    var name = target.getAttribute("href");
    this.target.removeNamedItem(name);

    this.dispatchEvent(new CustomEvent("removeattribute", {
      detail: JSON.stringify({
        keyPath: this.keyPath,
        expression: "['" + this.keyPath.join("']['") + "']",
        name: name
      })
    }));

    this.render();
  };

  proto._handleListItemClick = function (target) {
    // If the link clicked has an `href` pointing
    // to "../", go back to the previous level in
    // the key path.
    var href = target.getAttribute("href");
    if (href === "../") {
      this.keyPath.pop();
    }

    // Show "Create New Attribute" prompt.
    else if (href === "#add-attribute") {
      this.newAttributeName.open();
    }

    // Otherwise, push the next part of the key path.
    else {
      this.keyPath.push(href);
    }

    this.render();
  };

  /**
   * Helper function for determining the type of
   * page to render for the current target (editor
   * or list).
   */
  function renderTargetPage(target, isRoot) {
    // If the target is not an object, assume that
    // it is editable and render the editor page.
    if (typeof target !== "object") {
      return renderTargetEditor(target);
    }

    // Otherwise, the target is an enumerable object
    // and we can render the list page.
    return renderTargetList(target, isRoot);
  }

  /**
   * Helper for rendering the editor page.
   */
  function renderTargetEditor(target) {
    var page = document.createElement("section");
    page.innerHTML = "<fxos-code-editor>" + target + "</fxos-code-editor>\n<section flex>\n  <customizer-gaia-button data-action=\"cancel\">Cancel</customizer-gaia-button>\n  <customizer-gaia-button data-action=\"save\">Save</customizer-gaia-button>\n</section>";

    return page;
  }

  /**
   * Helper for rendering the list page.
   */
  function renderTargetList(target, isRoot) {
    var list = document.createElement("customizer-gaia-list");

    if (!isRoot) {
      list.appendChild(renderBackItem());
    }

    if (target instanceof window.NamedNodeMap) {
      list.appendChild(renderAddAttributeItem());
    }

    getSortedProperties(target).forEach(function (property) {
      list.appendChild(renderTargetListItem(target, property));
    });

    var page = document.createElement("section");
    page.innerHTML = "<section flex>\n  <customizer-gaia-text-input type=\"search\" placeholder=\"Search Properties\"></customizer-gaia-text-input>\n</section>\n" + list.outerHTML;

    return page;
  }

  /**
   * Helper for rendering a list item.
   */
  function renderTargetListItem(target, property) {
    var value = target[property];
    if (value instanceof window.Attr) {
      value = "'" + escapeHTML(value.value) + "'";
    } else if (typeof value === "string") {
      value = "'" + escapeHTML(value) + "'";
    }

    var a = document.createElement("a");
    a.href = property;
    a.dataset.search = property.toLowerCase();
    a.innerHTML = "<h3>" + property + " = <span class=\"value\">" + value + "</span></h3>";

    // Append "X" button to remove attributes.
    if (target instanceof window.NamedNodeMap) {
      a.innerHTML += "<i data-icon=\"close\" data-action=\"remove\"></i>";
    }

    return a;
  }

  /**
   * Helper for rendering the "Up One Level [..]" list item.
   */
  function renderBackItem() {
    var a = document.createElement("a");
    a.href = "../";
    a.innerHTML = "<h3>Up One Level [..]</h3>";

    return a;
  }

  /**
   * Helper for rendering the "Create New Attribute"
   * list item.
   */
  function renderAddAttributeItem() {
    var a = document.createElement("a");
    a.href = "#add-attribute";
    a.innerHTML = "<h3>Create New Attribute</h3>\n<i data-icon=\"add\"></i>";

    return a;
  }

  /**
   * Helper for enumerating and sorting all direct
   * properties for the specified target object.
   * This also handles an `attributes` object as a
   * special case and returns a sorted array of
   * attribute names instead of an array-indexed
   * list of `Attr` objects.
   */
  function getSortedProperties(target) {
    var properties = [];

    // If the `target` is a `NamedNodeMap` (attributes),
    // enumerate the attributes and push their names
    // instead of treating it as properties.
    if (target instanceof window.NamedNodeMap) {
      for (var _iterator = target[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
        var attr = _step.value;
        properties.push(attr.name);
      }

      properties = properties.sort();
    }

    // Otherwise, emumerate the properties as usual.
    else {
      for (var property in target) {
        // Omit invalid properties.
        if (!isValidProperty(target, property)) {
          continue;
        }

        // Omit constants.
        if (CONSTANT_PROPERTY_REGEX.test(property)) {
          continue;
        }

        // Omit native functions unless the target object
        // directly contains them (e.g. `Element.prototype`).
        if (!target.hasOwnProperty(property) && isNativeFunction(target[property])) {
          continue;
        }

        properties.push(property + "");
      }

      // Explicitly add the `nodeValue`, `textContent` and
      // `value` properties for empty attributes so their
      // values can be set.
      if (target instanceof window.Attr && !target.value) {
        properties.push("nodeValue");
        properties.push("textContent");
        properties.push("value");
      }

      properties = properties.sort();

      // Append `__proto__` property to end of array after
      // sorting (if the object has one).
      if (target.__proto__) {
        properties.push("__proto__");
      }
    }

    return properties;
  }

  /**
   * Escapes HTML strings so that <, > and quotation
   * characters are properly rendered in the list items.
   */
  function escapeHTML(html) {
    return html.replace(/[&<>"'\/]/g, function (s) {
      return HTML_ESCAPE_CHARS[s];
    });
  }

  /**
   * Determines if the specified property is valid for
   * the target object.
   * NOTE: The `try`/`catch` is necessary to catch
   * exceptions for properties that cannot be directly
   * accessed.
   */
  function isValidProperty(target, property) {
    try {
      return !!target[property];
    } catch (e) {
      return false;
    }
  }

  /**
   * Determines if a function is native. Native functions
   * are filtered from the list items unless they are direct
   * members of the current target object. This is to
   * provide consistency with object/property inspection on
   * desktop DevTools.
   */
  function isNativeFunction(value) {
    return typeof value === "function" && !! ~value.toString().indexOf("[native code]");
  }

  try {
    document.registerElement("fxos-inspector", { prototype: proto });
  } catch (e) {
    if (e.name !== "NotSupportedError") {
      throw e;
    }
  }
})(window);

/* global Controller */

/* global AddonService */

var AppendChildController = (function (Controller) {
  var AppendChildController = function AppendChildController(options) {
    Controller.call(this, options);
  };

  _extends(AppendChildController, Controller);

  AppendChildController.prototype.open = function (target) {
    this.target = target;

    this.view.open();
  };

  AppendChildController.prototype.submit = function (tagName) {
    var child = document.createElement(tagName);
    if (!child) {
      window.alert("Error creating " + tagName);
      return;
    }

    AddonService.generate(this.target, function (generator) {
      generator.opAppendChild(tagName);
    });
  };

  return AppendChildController;
})(Controller);

/* global Controller */

/* global AddonService */

var CopyMoveController = (function (Controller) {
  var CopyMoveController = function CopyMoveController(options) {
    Controller.call(this, options);
  };

  _extends(CopyMoveController, Controller);

  CopyMoveController.prototype.open = function (target) {
    this.target = target;

    this.view.domTree.filter = "#" + this.mainController.view.el.id;
    this.view.domTree.setRoot(document.documentElement);
    this.view.domTree.render();

    this.view.modal.open();
  };

  CopyMoveController.prototype.cancel = function () {
    this.view.modal.close();
  };

  CopyMoveController.prototype.select = function () {
    this.destination = this.view.domTree.selectedNode;
    this.view.dialog.open();
  };

  CopyMoveController.prototype.setMode = function (mode) {
    this.mode = mode;
  };

  CopyMoveController.prototype.before = function () {
    var _this9 = this;
    AddonService.generate(this.target, function (generator) {
      var op = generator["op" + _this9.mode + "Before"];
      op.call(generator, _this9.destination);

      _this9.view.dialog.close();
      _this9.view.modal.close();
    });
  };

  CopyMoveController.prototype.after = function () {
    var _this10 = this;
    AddonService.generate(this.target, function (generator) {
      var op = generator["op" + _this10.mode + "After"];
      op.call(generator, _this10.destination);

      _this10.view.dialog.close();
      _this10.view.modal.close();
    });
  };

  CopyMoveController.prototype.prepend = function () {
    var _this11 = this;
    AddonService.generate(this.target, function (generator) {
      var op = generator["op" + _this11.mode + "Prepend"];
      op.call(generator, _this11.destination);

      _this11.view.dialog.close();
      _this11.view.modal.close();
    });
  };

  CopyMoveController.prototype.append = function () {
    var _this12 = this;
    AddonService.generate(this.target, function (generator) {
      var op = generator["op" + _this12.mode + "Append"];
      op.call(generator, _this12.destination);

      _this12.view.dialog.close();
      _this12.view.modal.close();
    });
  };

  return CopyMoveController;
})(Controller);

/* global Controller */

/* global AddonService */

var EditController = (function (Controller) {
  var EditController = function EditController(options) {
    Controller.call(this, options);
  };

  _extends(EditController, Controller);

  EditController.prototype.open = function (target) {
    this.target = target;

    this.changes = {};

    this.view.setTarget(target);
    this.view.open();
  };

  EditController.prototype.close = function () {
    this.view.close();
  };

  EditController.prototype.save = function () {
    var _this13 = this;
    AddonService.generate(this.target, function (generator) {
      if (_this13.changes.innerHTML) {
        generator.opInnerHTML(_this13.changes.innerHTML);
      }

      if (_this13.changes.script) {
        generator.opScript(_this13.changes.script);
      }

      if (_this13.changes.createAttributes) {
        generator.opCreateAttributes(_this13.changes.createAttributes);
      }

      if (_this13.changes.removeAttributes) {
        generator.opRemoveAttributes(_this13.changes.removeAttributes);
      }

      if (_this13.changes.properties) {
        generator.opSetProperties(_this13.changes.properties);
      }

      _this13.close();
    });
  };

  return EditController;
})(Controller);

/*global MozActivity*/

/*global EditView*/
/*global ViewSourceView*/
/*global AppendChildView*/
/*global CopyMoveView*/
/*global MainView*/

/*global EditController*/
/*global ViewSourceController*/
/*global AppendChildController*/
/*global CopyMoveController*/

/*global Controller*/
/*global Gesture*/

var MainController = (function (Controller) {
  var MainController = function MainController(options) {
    var _this14 = this;
    Controller.call(this, options);

    this._checkOpenFromLauncher();
    this._waitToBeOpened();

    window.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        _this14._checkOpenFromLauncher();
      }
    });

    console.log("[Customizer] Initialized MainController", this);
  };

  _extends(MainController, Controller);

  MainController.prototype._lazyLoadModules = function () {
    var _this15 = this;
    this._loadedModules = this._loadedModules || new Promise(function (resolve, reject) {
      /*jshint evil:true*/
      var source = window.localStorage.getItem("__CUSTOMIZER__componentsSource");
      if (!source) {
        reject();
        return;
      }

      eval.call(window, source);

      var editView = new EditView();
      var viewSourceView = new ViewSourceView();
      var appendChildView = new AppendChildView();
      var copyMoveView = new CopyMoveView();
      var mainView = new MainView({
        editView: editView,
        viewSourceView: viewSourceView,
        appendChildView: appendChildView,
        copyMoveView: copyMoveView
      });

      _this15.editController = new EditController({
        view: editView
      });

      _this15.viewSourceController = new ViewSourceController({
        view: viewSourceView
      });

      _this15.appendChildController = new AppendChildController({
        view: appendChildView
      });

      _this15.copyMoveController = new CopyMoveController({
        view: copyMoveView
      });

      _this15.view = mainView;
      mainView.init(_this15);

      _this15.editController.mainController = _this15;
      _this15.viewSourceController.mainController = _this15;
      _this15.appendChildController.mainController = _this15;
      _this15.copyMoveController.mainController = _this15;

      console.log("[Customizer] Lazy-initialized modules");
      resolve();
    });

    return this._loadedModules;
  };

  MainController.prototype._waitToBeOpened = function () {
    var _this16 = this;
    Gesture.detect(this.openGesture).then(function () {
      return _this16.open();
    });
  };

  MainController.prototype._waitToBeClosed = function () {
    var _this17 = this;
    Gesture.detect(this.closeGesture).then(function () {
      return _this17.close();
    });
  };

  MainController.prototype._checkOpenFromLauncher = function () {
    var _this18 = this;
    var requestXHR = new XMLHttpRequest();
    requestXHR.open("GET", "http://localhost:3215/request", true);
    requestXHR.onload = function () {
      if (requestXHR.responseText !== _this18.manifestURL) {
        return;
      }

      _this18.open();

      var confirmXHR = new XMLHttpRequest();
      confirmXHR.open("GET", "http://localhost:3215/confirm?url=" + _this18.manifestURL, true);

      console.log("Sending HTTP request confirmation to Customizer Launcher");
      confirmXHR.send();
    };

    console.log("Sending HTTP request check to Customizer Launcher");
    requestXHR.send();
  };

  MainController.prototype.open = function () {
    var _this19 = this;
    if (this._isOpen) {
      return;
    }

    this._isOpen = true;

    this._lazyLoadModules().then(function () {
      return _this19.view.open();
    }).then(function () {
      _this19.view.customizer.setRootNode(document.documentElement);
      _this19._waitToBeClosed();
    });
  };

  MainController.prototype.close = function () {
    var _this20 = this;
    if (!this._isOpen) {
      return;
    }

    this.view.close().then(function () {
      return _this20._waitToBeOpened();
    });

    this._isOpen = false;
  };

  MainController.prototype.openAddonManager = function () {
    var activity = new MozActivity({
      name: "configure",
      data: {
        target: "device",
        section: "addons",
        options: {
          manifestURL: this.manifestURL
        }
      }
    });

    activity.onerror = function (e) {
      console.error("Error opening \"Settings > Add-ons\" panel", e);
    };
  };

  _classProps(MainController, null, {
    openGesture: {
      get: function () {
        return {
          type: "swipe", // Swipe:
          numFingers: 2, // with two fingers,
          startRegion: { // from bottom 30% of the screen (10% for SHB),
            x0: 0, y0: 0.8, x1: 1, y1: 1.1
          },
          endRegion: { // up into the top 75% of the screen,
            x0: 0, y0: 0, x1: 1, y1: 0.75
          },
          maxTime: 1000 };
      }
    },
    closeGesture: {
      get: function () {
        return {
          type: "swipe", // Swipe:
          numFingers: 2, // with two fingers,
          startRegion: { // from the middle ~half of the screen
            x0: 0, y0: 0.3, x1: 1, y1: 0.7
          },
          endRegion: { // down into the bottom quarter of the screen
            x0: 0, y0: 0.75, x1: 1, y1: 1
          },
          maxTime: 1000 };
      }
    }
  });

  return MainController;
})(Controller);

/*global Controller*/

// When injected in the System app, this selector can identify
// the currently-focused <iframe> (app window).
var ACTIVE_WINDOW_SELECTOR = "#windows > .active iframe";

var TouchForwarderController = (function (Controller) {
  var TouchForwarderController = function TouchForwarderController(options) {
    Controller.call(this, options);

    var firstTouchStartEvt = null;
    var isForwarding = false;

    window.addEventListener("touchstart", function (evt) {
      if (evt.touches.length === 1) {
        firstTouchStartEvt = evt;
        return;
      }

      if (evt.touches.length !== 2) {
        return;
      }

      var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
      iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(firstTouchStartEvt));
      iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));

      isForwarding = true;
    });

    window.addEventListener("touchmove", function (evt) {
      if (!isForwarding) {
        return;
      }

      var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
      iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));
    });

    window.addEventListener("touchend", function (evt) {
      if (!isForwarding) {
        return;
      }

      if (evt.touches.length === 0) {
        isForwarding = false;
      }

      var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
      iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));
    });

    console.log("[Customizer] Initialized TouchForwarderController", this);
  };

  _extends(TouchForwarderController, Controller);

  return TouchForwarderController;
})(Controller);

/**
 * Taken from System app:
 * https://github.com/mozilla-b2g/gaia/blob/600fd8249960b8256af9de67d9171025bb9a3ff3/apps/system/js/touch_forwarder.js#L93
 */
function unsynthesizeEvent(e) {
  var type = e.type;
  var relevantTouches = (e.type === "touchend") ? e.changedTouches : e.touches;
  var identifiers = [];
  var xs = [];
  var ys = [];
  var rxs = [];
  var rys = [];
  var rs = [];
  var fs = [];
  var modifiers = 0;

  for (var i = 0; i < relevantTouches.length; i++) {
    var t = relevantTouches[i];

    identifiers.push(t.identifier);
    xs.push(t.pageX);
    ys.push(t.pageY);
    rxs.push(t.radiusX);
    rys.push(t.radiusY);
    rs.push(t.rotationAngle);
    fs.push(t.force);
  }

  return [type, identifiers, xs, ys, rxs, rys, rs, fs, xs.length, modifiers];
}

/* global Controller */

var ViewSourceController = (function (Controller) {
  var ViewSourceController = function ViewSourceController(options) {
    Controller.call(this, options);
  };

  _extends(ViewSourceController, Controller);

  ViewSourceController.prototype.open = function (target) {
    console.log("view source controller open");
    this.target = target;
    var url = target.src || target.href;
    var filename = url.substring(url.lastIndexOf("/") + 1);
    this.view.setTitle(filename);
    this.view.setSource("Loading...");
    this.fetchAndDisplay(url);
    this.view.open();
  };

  ViewSourceController.prototype.close = function () {
    this.view.close();
    this.view.setSource("");
  };

  ViewSourceController.prototype.fetchAndDisplay = function (url) {
    var self = this;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.responseType = "text";
      xhr.send();
      xhr.onload = function () {
        if (xhr.status === 200) {
          self.view.setSource(xhr.response);
        } else {
          self.view.setSource(xhr.status + ":" + xhr.statusText);
        }
      };
      xhr.onerror = function () {
        self.view.setSource(xhr.error.name);
      };
    } catch (e) {
      // Surprisingly, the xhr.send() call above can throw an exception
      // if the URL is malformed.
      self.view.setSource(e.toString());
    }
  };

  return ViewSourceController;
})(Controller);

/*global Model*/

/*global JSZip*/

var AddonGenerator = (function (Model) {
  var AddonGenerator = function AddonGenerator(properties) {
    Model.call(this, properties);

    this.operations = [];

    this.id = this.id || ("addon" + Math.round(Math.random() * 100000000));
    this.name = this.name || this.id;

    this.packageMetadata = {
      installOrigin: "http://gaiamobile.org",
      manifestURL: "app://" + this.id + ".gaiamobile.org/update.webapp",
      version: 1
    };

    this.packageManifest = {
      name: this.name,
      package_path: "/application.zip"
    };

    this.manifest = {
      name: this.name,
      description: "Generated by Customizer",
      role: "addon",
      type: "certified",
      origin: "app://" + this.id + ".gaiamobile.org",
      customizations: [{
        filter: window.location.origin,
        scripts: ["main.js"]
      }]
    };
  };

  _extends(AddonGenerator, Model);

  AddonGenerator.prototype.generate = function () {
    var script = "/*=AddonGenerator*/\nvar selector = '" + this.getSelector() + "';\nvar el = document.querySelector(selector);\nvar mo = new MutationObserver(function() {\n  var newEl = document.querySelector(selector);\n  if (newEl !== el) {\n    el = newEl;\n    setTimeout(exec, 1);\n    mo.disconnect();\n  }\n});\nmo.observe(document.documentElement, {\n  childList: true,\n  attributes: true,\n  characterData: true,\n  subtree: true\n});\nexec();\nfunction exec() {\n" + this.operations.join("\n") + "\n}\n/*==*/";

    console.log("******** Generated SCRIPT ********", script);

    var applicationZip = new JSZip();
    applicationZip.file("manifest.webapp", JSON.stringify(this.manifest));
    applicationZip.file("main.js", script);

    var packageZip = new JSZip();
    packageZip.file("metadata.json", JSON.stringify(this.packageMetadata));
    packageZip.file("update.webapp", JSON.stringify(this.packageManifest));
    packageZip.file("application.zip", applicationZip.generate({ type: "arraybuffer" }));

    return packageZip.generate({ type: "arraybuffer" });
  };

  AddonGenerator.prototype.getSelector = function () {
    return getSelector(this.target);
  };

  AddonGenerator.prototype.opAddEventListener = function (eventName, callback) {
    this.operations.push("/*=AddonGenerator::addEventListener*/\nel.addEventListener('" + eventName + "', " + callback + ");\n/*==*/");
  };

  AddonGenerator.prototype.opAppendChild = function (childNodeName) {
    this.operations.push("/*=AddonGenerator::appendChild*/\nel.appendChild(document.createElement('" + childNodeName + "');\n/*==*/");
  };

  AddonGenerator.prototype.opInnerHTML = function (html) {
    this.operations.push("/*=AddonGenerator::innerHTML*/\nel.innerHTML = " + JSON.stringify(html) + ";\nif (el.tagName === 'SCRIPT') {\n  eval(el.innerHTML);\n}\nelse {\n  Array.prototype.forEach.call(el.querySelectorAll('script'), function(script) {\n    eval(script.innerHTML);\n  });\n}\n/*==*/");
  };

  AddonGenerator.prototype.opScript = function (script) {
    this.operations.push("/*=AddonGenerator::innerHTML*/\n" + script + "\n/*==*/");
  };

  AddonGenerator.prototype.opRemove = function () {
    this.operations.push("/*=AddonGenerator::remove*/\nel.parentNode.removeChild(el);\n/*==*/");
  };

  AddonGenerator.prototype.opCreateAttributes = function (attributes) {
    for (var expression in attributes) {
      this.createAttributeHelper(expression, attributes[expression]);
    }
  };

  AddonGenerator.prototype.opRemoveAttributes = function (attributes) {
    for (var expression in attributes) {
      this.removeAttributeHelper(expression, attributes[expression]);
    }
  };

  AddonGenerator.prototype.opSetProperties = function (properties) {
    for (var expression in properties) {
      this.setPropertyHelper(expression, properties[expression]);
    }
  };

  AddonGenerator.prototype.opCopyAppend = function (destination) {
    this.operations.push("/*=AddonGenerator::copyAppend*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nvar template = document.createElement('template');\ntemplate.innerHTML = `" + this.target.outerHTML.replace(/\`/g, "\\`") + "`;\nif (destination) {\n  destination.appendChild(template.content);\n}\n/*==*/");
  };

  AddonGenerator.prototype.opCopyPrepend = function (destination) {
    this.operations.push("/*=AddonGenerator::copyPrepend*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nvar template = document.createElement('template');\ntemplate.innerHTML = `" + this.target.outerHTML.replace(/\`/g, "\\`") + "`;\nif (destination) {\n  destination.insertBefore(template.content, destination.firstChild);\n}\n/*==*/");
  };

  AddonGenerator.prototype.opCopyAfter = function (destination) {
    this.operations.push("/*=AddonGenerator::copyAfter*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nvar template = document.createElement('template');\ntemplate.innerHTML = `" + this.target.outerHTML.replace(/\`/g, "\\`") + "`;\nif (destination && destination.parentNode) {\n  if (destination.parentNode.lastChild === destination) {\n    destination.parentNode.appendChild(template.content);\n  }\n  else {\n    destination.parentNode.insertBefore(template.content, destination.nextSibling);\n  }\n}\n/*==*/");
  };

  AddonGenerator.prototype.opCopyBefore = function (destination) {
    this.operations.push("/*=AddonGenerator::copyBefore*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nvar template = document.createElement('template');\ntemplate.innerHTML = `" + this.target.outerHTML.replace(/\`/g, "\\`") + "`;\nif (destination && destination.parentNode) {\n  destination.parentNode.insertBefore(template.content, destination);\n}\n/*==*/");
  };

  AddonGenerator.prototype.opMoveAppend = function (destination) {
    this.operations.push("/*=AddonGenerator::moveAppend*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nif (destination) {\n  destination.appendChild(el);\n}\n/*==*/");
  };

  AddonGenerator.prototype.opMovePrepend = function (destination) {
    this.operations.push("/*=AddonGenerator::movePrepend*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nif (destination) {\n  destination.insertBefore(el, destination.firstChild);\n}\n/*==*/");
  };

  AddonGenerator.prototype.opMoveAfter = function (destination) {
    this.operations.push("/*=AddonGenerator::moveAfter*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nif (destination && destination.parentNode) {\n  if (destination.parentNode.lastChild === destination) {\n    destination.parentNode.appendChild(el);\n  }\n  else {\n    destination.parentNode.insertBefore(el, destination.nextSibling);\n  }\n}\n/*==*/");
  };

  AddonGenerator.prototype.opMoveBefore = function (destination) {
    this.operations.push("/*=AddonGenerator::moveBefore*/\nvar destination = document.querySelector('" + getSelector(destination) + "');\nif (destination && destination.parentNode) {\n  destination.parentNode.insertBefore(el, destination);\n}\n/*==*/");
  };

  AddonGenerator.prototype.createAttributeHelper = function (expression, name) {
    var assignment = (expression[0] === "[") ? "el" + expression : "el." + expression;

    this.operations.push("/*=AddonGenerator::createAttribute*/\n" + assignment + ".setNamedItem(document.createAttribute(" + JSON.stringify(name) + "));\n/*==*/");
  };

  AddonGenerator.prototype.removeAttributeHelper = function (expression, name) {
    var assignment = (expression[0] === "[") ? "el" + expression : "el." + expression;

    this.operations.push("/*=AddonGenerator::removeAttribute*/\n" + assignment + ".removeNamedItem(" + JSON.stringify(name) + ");\n/*==*/");
  };

  AddonGenerator.prototype.setPropertyHelper = function (expression, value) {
    var assignment = (expression[0] === "[") ? "el" + expression : "el." + expression;

    this.operations.push("/*=AddonGenerator::setProperty*/\n" + assignment + " = " + JSON.stringify(value) + ";\n/*==*/");
  };

  return AddonGenerator;
})(Model);

function getSelector(element) {
  var current = element;
  var path = [getSpecificSelector(current)];

  while (!current.id && current.nodeName !== "HTML") {
    current = current.parentNode;
    path.push(getSpecificSelector(current));
  }

  return path.reverse().join(">");
}

function getSpecificSelector(element) {
  var selector = element.nodeName;

  if (element.id) {
    selector += "#" + element.id;
    return selector;
  }

  Array.prototype.forEach.call(element.classList, function (item) {
    selector += "." + item;
  });

  return selector;
}

/*global Model*/

/*global JSZip*/

var AddonMerger = (function (Model) {
  var AddonMerger = function AddonMerger(properties) {
    Model.call(this, properties);

    this.blobs = [];

    this.id = this.id || ("addon" + Math.round(Math.random() * 100000000));
    this.name = this.name || this.id;

    this.packageMetadata = {
      installOrigin: "http://gaiamobile.org",
      manifestURL: "app://" + this.id + ".gaiamobile.org/update.webapp",
      version: 1
    };

    this.packageManifest = {
      name: this.name,
      package_path: "/application.zip"
    };

    this.manifest = {
      name: this.name,
      role: "addon",
      type: "certified",
      origin: "app://" + this.id + ".gaiamobile.org"
    };
  };

  _extends(AddonMerger, Model);

  AddonMerger.prototype.merge = function (callback) {
    var _this21 = this;
    if (typeof callback !== "function") {
      return;
    }

    var scripts = [];
    var error = false;

    this.blobs.forEach(function (blob) {
      blobToArrayBuffer(blob, function (arrayBuffer) {
        if (error) {
          return;
        }

        var zip = new JSZip();
        zip.load(arrayBuffer);

        var applicationZipFile = zip.file("application.zip");
        if (!applicationZipFile) {
          error = true;
          callback();
          return;
        }

        var applicationZip = new JSZip();
        applicationZip.load(applicationZipFile.asArrayBuffer());

        var scriptFile = applicationZip.file("main.js");
        if (!scriptFile) {
          error = true;
          callback();
          return;
        }

        scripts.push(scriptFile.asText());

        if (scripts.length === _this21.blobs.length) {
          callback(bundle(_this21, scripts.join("\n")));
        }
      });
    });
  };

  AddonMerger.prototype.add = function (blob) {
    this.blobs.push(blob);
  };

  return AddonMerger;
})(Model);

function bundle(merger, script) {
  var applicationZip = new JSZip();
  applicationZip.file("manifest.webapp", JSON.stringify(merger.manifest));
  applicationZip.file("main.js", script);

  var packageZip = new JSZip();
  packageZip.file("metadata.json", JSON.stringify(merger.packageMetadata));
  packageZip.file("update.webapp", JSON.stringify(merger.packageManifest));
  packageZip.file("application.zip", applicationZip.generate({ type: "arraybuffer" }));

  return packageZip.generate({ type: "arraybuffer" });
}

function blobToArrayBuffer(blob, callback) {
  var fileReader = new FileReader();
  fileReader.onload = function () {
    if (typeof callback === "function") {
      callback(fileReader.result);
    }
  };
  fileReader.readAsArrayBuffer(blob);

  return fileReader.result;
}

/* global MozActivity */

/* global AddonGenerator */

var GENERATED_ADDON_COUNT_KEY = "__CUSTOMIZER__generatedAddonCount";

var AddonService = {};

AddonService.getGenerator = function (target) {
  return new Promise(function (resolve, reject) {
    var number = parseInt(localStorage.getItem(GENERATED_ADDON_COUNT_KEY), 10) || 0;
    var name = window.prompt("Enter a name for this add-on", "Addon " + (number + 1));
    if (!name) {
      reject();
      return;
    }

    var generator = new AddonGenerator({
      target: target,
      name: name
    });

    resolve(generator);
  });
};

AddonService.generate = function (target, callback) {
  if (typeof callback !== "function") {
    return;
  }

  return AddonService.getGenerator(target).then(function (generator) {
    callback(generator);

    var addonBlob = new Blob([generator.generate()], { type: "application/zip" });
    AddonService.install(addonBlob);
  });
};

AddonService.install = function (blob) {
  return new Promise(function (resolve, reject) {
    var activity = new MozActivity({
      name: "import-app",
      data: {
        blob: blob
      }
    });

    activity.onsuccess = function () {
      var number = parseInt(localStorage.getItem(GENERATED_ADDON_COUNT_KEY), 10) || 0;
      localStorage.setItem(GENERATED_ADDON_COUNT_KEY, number + 1);

      resolve();
    };

    activity.onerror = function (error) {
      console.error("Unable to install the addon", error);
      reject(error);
    };
  });
};

/* global View */

var appendChildViewTemplate = "\n<style scoped>\n.shadow-host {\n  z-index: 10000001;\n}\n</style>\n<customizer-gaia-dialog-prompt>Enter new element name, e.g. \"div\"</customizer-gaia-dialog-prompt>\n";

var AppendChildView = (function (View) {
  var AppendChildView = function AppendChildView(options) {
    View.call(this, options);

    this.el.className = "fxos-customizer-append-child-view";

    this.render();
  };

  _extends(AppendChildView, View);

  AppendChildView.prototype.init = function (controller) {
    var _this22 = this;
    View.prototype.init.call(this, controller);

    this.dialog = this.$("customizer-gaia-dialog-prompt");

    // Automatically set focus to the input box when the
    // <customizer-gaia-dialog-prompt> is opened.
    this.dialog.addEventListener("opened", function () {
      _this22.dialog.els.input.focus();
    });

    // Reset the <customizer-gaia-dialog-prompt> value when closed.
    this.dialog.addEventListener("closed", function () {
      _this22.dialog.els.input.value = "";
    });

    // Submit the new element tag name when the
    // <customizer-gaia-dialog-prompt> is submitted.
    this.dialog.els.submit.addEventListener("click", function () {
      _this22.controller.submit(_this22.dialog.els.input.value);
    });
  };

  AppendChildView.prototype.template = function () {
    return appendChildViewTemplate;
  };

  AppendChildView.prototype.open = function () {
    this.dialog.open();
  };

  return AppendChildView;
})(View);

/* global View */

var copyMoveViewTemplate = "<customizer-gaia-modal>\n  <customizer-gaia-header>\n    <button type=\"button\" data-action=\"cancel\">Cancel</button>\n    <h1>Copy/Move</h1>\n    <button type=\"button\" data-action=\"select\">Select</button>\n  </customizer-gaia-header>\n  <customizer-gaia-tabs selected=\"0\">\n    <a href=\"#\" data-mode=\"Copy\">Copy</a>\n    <a href=\"#\" data-mode=\"Move\">Move</a>\n  </customizer-gaia-tabs>\n  <section>\n    <customizer-gaia-dom-tree></customizer-gaia-dom-tree>\n  </section>\n  <customizer-gaia-dialog>\n    <button type=\"button\" data-action=\"before\">Insert Before</button>\n    <button type=\"button\" data-action=\"after\">Insert After</button>\n    <button type=\"button\" data-action=\"prepend\">Prepend</button>\n    <button type=\"button\" data-action=\"append\">Append</button>\n  </customizer-gaia-dialog>\n</customizer-gaia-modal>";

var CopyMoveView = (function (View) {
  var CopyMoveView = function CopyMoveView(options) {
    View.call(this, options);

    this.el.className = "fxos-customizer-copy-move-view";

    this.render();
  };

  _extends(CopyMoveView, View);

  CopyMoveView.prototype.init = function (controller) {
    View.prototype.init.call(this, controller);

    this.modal = this.$("customizer-gaia-modal");
    this.tabs = this.$("customizer-gaia-tabs");
    this.domTree = this.$("customizer-gaia-dom-tree");
    this.dialog = this.$("customizer-gaia-dialog");

    this.tabs.addEventListener("change", this._handleModeChange.bind(this));

    this.on("click", "button", this._handleClick.bind(this));
    this.on("contextmenu", "customizer-gaia-dom-tree", function (evt) {
      evt.stopPropagation();
    });
  };

  CopyMoveView.prototype.template = function () {
    return copyMoveViewTemplate;
  };

  CopyMoveView.prototype._handleModeChange = function (evt) {
    this.controller.setMode(this.tabs.selectedChild.dataset.mode);
  };

  CopyMoveView.prototype._handleClick = function (evt) {
    var action = this.controller[evt.target.dataset.action];
    if (typeof action === "function") {
      action.call(this.controller, evt.target.dataset);
    }
  };

  return CopyMoveView;
})(View);

/* global View */

/* global esprima */
/* global html_beautify */

var editViewTemplate = "<customizer-gaia-modal>\n  <style scoped>\n    .customizer-gaia-modal {\n      background: var(--background, #fff);\n      display: none;\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n    }\n    .customizer-gaia-modal.active {\n      display: block;\n    }\n    .tab-pane {\n      box-sizing: padding-box;\n      display: none;\n      position: absolute;\n      top: 96px;\n      bottom: 0;\n      left: 0;\n      width: 100%;\n      height: auto;\n    }\n    .tab-pane.active {\n      display: block;\n    }\n    textarea,\n    input {\n      -moz-user-select: text !important;\n    }\n    textarea,\n    customizer-gaia-tabs,\n    .tab-pane {\n      background: #000;\n      color: #fff;\n    }\n    fxos-code-editor {\n      display: block;\n      width: 100%;\n      height: 100%;\n    }\n    .errors {\n      background: #e51e1e;\n      color: #fff;\n      position: absolute;\n      bottom: 0;\n      left: 0;\n      width: 100%;\n      height: 20px;\n      overflow: hidden;\n      z-index: 2;\n      opacity: 0;\n      transition: opacity 0.2s ease;\n      pointer-events: none;\n    }\n    .errors.active {\n      opacity: 1;\n    }\n    .errors.active + fxos-code-editor {\n      height: calc(100% - 20px);\n    }\n  </style>\n  <customizer-gaia-header>\n    <button data-action=\"cancel\" data-icon=\"close\"></button>\n    <h1>Edit</h1>\n    <button data-action=\"save\">Save</button>\n  </customizer-gaia-header>\n  <customizer-gaia-tabs selected=\"0\">\n    <a href=\"#\">HTML</a>\n    <a href=\"#\">Script</a>\n    <a href=\"#\">Properties</a>\n  </customizer-gaia-tabs>\n  <section class=\"tab-pane active\" data-id=\"html\">\n    <fxos-code-editor></fxos-code-editor>\n  </section>\n  <section class=\"tab-pane\" data-id=\"script\">\n    <div class=\"errors\"></div>\n    <fxos-code-editor></fxos-code-editor>\n  </section>\n  <section class=\"tab-pane\" data-id=\"properties\">\n    <fxos-inspector></fxos-inspector>\n  </section>\n</customizer-gaia-modal>";

var EditView = (function (View) {
  var EditView = function EditView(options) {
    View.call(this, options);

    this.el.className = "fxos-customizer-edit-view";

    this.render();
  };

  _extends(EditView, View);

  EditView.prototype.init = function (controller) {
    var _this23 = this;
    View.prototype.init.call(this, controller);

    this.modal = this.$("customizer-gaia-modal");
    this.header = this.$("customizer-gaia-header");
    this.tabs = this.$("customizer-gaia-tabs");

    this.htmlCodeEditor = this.$("section[data-id=\"html\"] > fxos-code-editor");
    this.scriptCodeEditor = this.$("section[data-id=\"script\"] > fxos-code-editor");
    this.propertyInspector = this.$("section[data-id=\"properties\"] > fxos-inspector");

    this.scriptErrors = this.$("section[data-id=\"script\"] > .errors");

    this.tabPanes = [].slice.apply(this.$$(".tab-pane"));

    this.on("click", "button[data-action=\"cancel\"]", function () {
      _this23.controller.close();
    });

    this.on("click", "button[data-action=\"save\"]", function () {
      _this23.controller.save();
    });

    this.tabs.addEventListener("change", function () {
      _this23.tabPanes.forEach(function (tabPane, index) {
        if (index === _this23.tabs.selected) {
          tabPane.classList.add("active");
        } else {
          tabPane.classList.remove("active");
        }
      });
    });

    this.htmlCodeEditor.addEventListener("change", function () {
      _this23.controller.changes.innerHTML = _this23.htmlCodeEditor.value;
    });

    this.scriptCodeEditor.addEventListener("change", function () {
      _this23.controller.changes.script = _this23.scriptCodeEditor.value;

      clearTimeout(_this23.validateScriptTimeout);
      _this23.validateScriptTimeout = setTimeout(_this23.validateScript.bind(_this23), 2000);
    });

    this.scriptCodeEditor.addEventListener("touchstart", function () {
      clearTimeout(_this23.validateScriptTimeout);
    });

    this.scriptCodeEditor.addEventListener("touchend", function () {
      clearTimeout(_this23.validateScriptTimeout);
      _this23.validateScriptTimeout = setTimeout(_this23.validateScript.bind(_this23), 2000);
    });

    this.propertyInspector.addEventListener("createattribute", function (evt) {
      var detail = JSON.parse(evt.detail);

      _this23.controller.changes.createAttributes = _this23.controller.changes.createAttributes || {};
      _this23.controller.changes.createAttributes[detail.expression] = detail.name;
    });

    this.propertyInspector.addEventListener("removeattribute", function (evt) {
      var detail = JSON.parse(evt.detail);

      _this23.controller.changes.removeAttributes = _this23.controller.changes.removeAttributes || {};
      _this23.controller.changes.removeAttributes[detail.expression] = detail.name;
    });

    this.propertyInspector.addEventListener("save", function (evt) {
      var detail = JSON.parse(evt.detail);

      _this23.controller.changes.properties = _this23.controller.changes.properties || {};
      _this23.controller.changes.properties[detail.expression] = detail.value;
    });

    this.el.addEventListener("contextmenu", function (evt) {
      evt.stopPropagation();
    });
  };

  EditView.prototype.template = function () {
    return editViewTemplate;
  };

  EditView.prototype.open = function () {
    this.modal.open();
  };

  EditView.prototype.close = function () {
    this.modal.close();
  };

  EditView.prototype.setTarget = function (target) {
    var clonedTarget = target.cloneNode(true);
    var html = html_beautify(clonedTarget.innerHTML.trim(), {
      indent_size: 2
    });

    this.htmlCodeEditor.value = html;
    this.scriptCodeEditor.value = "/**\n * You can edit a script to be inserted\n * in the generated add-on here.\n *\n * Globals:\n *   selector [String]\n *   el       [HTMLElement]\n *   mo       [MutationObserver]\n */\n\n//el.addEventListener('click', function(evt) {\n//  alert('Clicked!');\n//});\n";

    this.propertyInspector.setRootTarget(clonedTarget);
  };

  EditView.prototype.validateScript = function () {
    var error;

    try {
      var syntax = esprima.parse(this.controller.changes.script);
      if (syntax.errors && syntax.errors.length > 0) {
        error = syntax.errors[0];
      }
    } catch (e) {
      error = e;
    }

    if (error) {
      this.scriptErrors.textContent = error.message;
      this.scriptErrors.classList.add("active");
    } else {
      this.scriptErrors.textContent = "";
      this.scriptErrors.classList.remove("active");
    }
  };

  return EditView;
})(View);

/* global View */

/* global AddonService */

var mainViewTemplate = "<style scoped>\n  .fxos-customizer-main-view {\n    font-size: 14px;\n\n    /** Grey Colors\n     ---------------------------------------------------------*/\n\n    --color-alpha: #333333;\n    --color-beta: #ffffff;\n    --color-gamma: #4d4d4d;\n    --color-delta: #5f5f5f;\n    --color-epsilon: #858585;\n    --color-zeta: #a6a6a6;\n    --color-eta: #c7c7c7;\n    --color-theta: #e7e7e7;\n    --color-iota: #f4f4f4;\n\n  /** Brand Colors\n   ---------------------------------------------------------*/\n\n    --color-darkblue: #00539f;\n    --color-blue: #00caf2;\n    --color-turquoise: #27c8c2;\n    --color-darkorange: #e66000;\n    --color-orange: #ff9500;\n    --color-yellow: #ffcb00;\n    --color-violet: #c40c84;\n\n    --color-warning: #fbbd3c;\n    --color-destructive: #e2443a;\n    --color-preffered: #00ba91;\n\n    /** Background\n     ---------------------------------------------------------*/\n\n    --background: var(--color-alpha);\n    --background-plus: var(--color-gamma);\n    --background-minus: #2B2B2B;\n    --background-minus-minus: #1a1a1a;\n\n    /** Borders\n     ---------------------------------------------------------*/\n\n    --border-color: var(--color-gamma);\n\n    /** Highlight Color\n     ---------------------------------------------------------*/\n\n    --highlight-color: var(--color-blue);\n\n    /** Text Color\n     ---------------------------------------------------------*/\n\n    --text-color: var(--color-beta);\n    --text-color-minus: var(--color-eta);\n\n    /** Button\n     ---------------------------------------------------------*/\n\n    --button-background: var(--background-plus);\n\n    /** Links\n     ---------------------------------------------------------*/\n\n    --link-color: var(--highlight-color);\n\n    /** Inputs\n     ---------------------------------------------------------*/\n\n    --input-background: var(--background-plus);\n    --input-color: var(--color-alpha);\n    --input-clear-background: #909ca7;\n\n    /** Buttons\n     ---------------------------------------------------------*/\n\n     --button-box-shadow: none;\n     --button-box-shadow-active: none;\n\n    /** Header\n     ---------------------------------------------------------*/\n\n    --header-background: var(--background);\n    --header-icon-color: var(--text-color);\n    --header-button-color: var(--highlight-color);\n    --header-disabled-button-color: rgba(255,255,255,0.3);\n\n    /** Text Input\n     ---------------------------------------------------------*/\n\n    --text-input-background: var(--background-minus);\n\n    /** Switch\n     ---------------------------------------------------------*/\n\n    --switch-head-border-color: var(--background-minus-minus);\n    --switch-background: var(--background-minus-minus);\n\n    /** Checkbox\n     ---------------------------------------------------------*/\n\n    --checkbox-border-color: var(--background-minus-minus);\n  }\n\n  div.fxos-customizer-container {\n    background-color: var(--background);\n    position: fixed;\n    left: 0;\n    right: 0;\n    top: 100%; /* off-screen by default, animated translate to show and hide */\n    height: 50vh;\n    border-top: 1px solid #ccc;\n    /*\n     * this needs to go on top of the regular app, but below\n     * customizer-gaia-modal and customizer-gaia-dialog which we override elsewhere.\n     */\n    z-index: 10000000;\n\n    /* We show and hide this with an animated transform */\n    transition: transform 150ms;\n  }\n\n  /*\n   * Add this show class to animate the container onto the screen,\n   * and remove it to animate the container off.\n   */\n  .fxos-customizer-container.show {\n    transform: translateY(-100%);\n  }\n</style>\n<style>\n/*\n * These styles need to be applied globally to the app when the customizer\n * is displayed so that the user can scroll to see all of the app even\n * with the customizer taking up the bottom half of the screen.\n *\n * Note that this stylesheet is not scoped and is disabled by default.\n */\nhtml, body {\n  overflow-y: initial !important;\n}\n\nbody {\n  padding-bottom: 50vh !important;\n}\n</style>\n<div class=\"fxos-customizer-container\"><fxos-customizer></fxos-customizer></div>\n<div class=\"fxos-customizer-child-views\">\n<fxos-customizer-highlighter></fxos-customizer-highlighter>\n</div>";

var MainView = (function (View) {
  var MainView = function MainView(options) {
    View.call(this, options);

    // Give this view a unique ID.
    this.el.id = "customizer-" + Date.now();
    this.el.className = "fxos-customizer-main-view";

    this.render();
  };

  _extends(MainView, View);

  MainView.prototype.init = function (controller) {
    var _this24 = this;
    View.prototype.init.call(this, controller);

    this.container = this.$("div.fxos-customizer-container");
    this.childViews = this.$("div.fxos-customizer-child-views");
    this.customizer = this.$("fxos-customizer");
    this.highlighter = this.$("fxos-customizer-highlighter");

    // We put all of the other view elements that the app needs into the
    // childViews container, so that we can add and remove them all at once.
    this.childViews.appendChild(this.editView.el);
    this.childViews.appendChild(this.viewSourceView.el);
    this.childViews.appendChild(this.appendChildView.el);
    this.childViews.appendChild(this.copyMoveView.el);

    // Hide this view from the DOM tree.
    this.customizer.gaiaDomTree.filter = "#" + this.el.id;

    this.on("menu", "fxos-customizer", function () {
      return _this24.controller.openAddonManager();
    });

    this.on("action:edit", "fxos-customizer", function (evt) {
      _this24.controller.editController.open(evt.detail);
    });

    this.on("action:copyOrMove", "fxos-customizer", function (evt) {
      _this24.controller.copyMoveController.open(evt.detail);
    });

    this.on("action:append", "fxos-customizer", function (evt) {
      _this24.controller.appendChildController.open(evt.detail);
    });

    this.on("action:remove", "fxos-customizer", function (evt) {
      AddonService.generate(evt.detail, function (generator) {
        generator.opRemove();
      });
    });

    this.on("action:viewSource", "fxos-customizer", function (evt) {
      _this24.controller.viewSourceController.open(evt.detail);
    });

    this.on("selected", "fxos-customizer", function (evt) {
      _this24.highlighter.highlight(evt.detail);
    });
  };

  MainView.prototype.template = function () {
    return mainViewTemplate;
  };

  MainView.prototype._addToBody = function () {
    document.body.appendChild(this.el);
  };

  MainView.prototype._removeFromBody = function () {
    document.body.removeChild(this.el);
  };

  MainView.prototype.open = function () {
    var _this25 = this;
    // Add the fxos-customizer element and the other elements we need
    this._addToBody();

    return new Promise(function (resolve, reject) {
      window.requestAnimationFrame(function () {
        // Start the opening animation for the customizer
        _this25.container.classList.add("show");
      });

      // Wait for the animation to end, then:
      var listener = function () {
        _this25.container.removeEventListener("transitionend", listener);
        // Resolve the promise
        resolve();
      };

      _this25.container.addEventListener("transitionend", listener);
    });
  };

  MainView.prototype.close = function () {
    var _this26 = this;
    return new Promise(function (resolve, reject) {
      window.requestAnimationFrame(function () {
        // Start hiding the customizer with an animated transition
        _this26.container.classList.remove("show");
        // Erase any highlight right away
        _this26.highlighter.highlight(null);
        // Scroll the app to the top before beginning the transition
        // so we don't see the blank white padding as the panel slides down
        document.body.scrollIntoView();
      });

      // Wait for the transition to end, then:
      var listener = function () {
        _this26.container.removeEventListener("transitionend", listener);
        // Remove all the unnecessary elements from the document
        _this26._removeFromBody();
        // And resolve the promise
        resolve();
      };

      _this26.container.addEventListener("transitionend", listener);
    });
  };

  return MainView;
})(View);

/* global View */

var viewSourceViewTemplate = "\n<style scoped>\ncustomizer-gaia-modal {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n}\ncustomizer-gaia-header {\n  height: 40px;\n  border-bottom: solid white 1px;\n}\npre {\n  background: #000;\n  color: #fff;\n  font-family: Consolas,Monaco,\"Andale Mono\",monospace;\n  font-size: 14px;\n  line-height: 1.2em;\n  position: absolute;\n  top: 50px;\n  left: 0;\n  width: 100%;\n  height: calc(100% - 50px);\n  overflow: scroll;\n  padding: 5px;\n}\n</style>\n<customizer-gaia-modal>\n  <customizer-gaia-header>\n    <button data-action=\"close\">Close</button>\n    <h1>Source View</h1>\n  </customizer-gaia-header>\n  <pre>\n  </pre>\n</customizer-gaia-modal>";

var ViewSourceView = (function (View) {
  var ViewSourceView = function ViewSourceView(options) {
    View.call(this, options);
    this.el.className = "fxos-customizer-view-source-view";
    this.render();
  };

  _extends(ViewSourceView, View);

  ViewSourceView.prototype.init = function (controller) {
    var _this27 = this;
    View.prototype.init.call(this, controller);

    this.modal = this.$("customizer-gaia-modal");
    this.title = this.$("h1");
    this.pre = this.$("pre");

    this.on("click", "button", function (evt) {
      var action = _this27.controller[evt.target.dataset.action];
      if (typeof action === "function") {
        action.call(_this27.controller, evt.target.dataset);
      }
    });
  };

  ViewSourceView.prototype.template = function () {
    return viewSourceViewTemplate;
  };

  ViewSourceView.prototype.setTitle = function (title) {
    this.title.textContent = title;
  };

  ViewSourceView.prototype.setSource = function (source) {
    this.pre.textContent = source;
  };

  ViewSourceView.prototype.open = function () {
    this.modal.open();
  };

  ViewSourceView.prototype.close = function () {
    this.modal.close();
  };

  return ViewSourceView;
})(View);

/*global MainController*/
/*global TouchForwarderController*/

var BLOCKED_APPS = ["app://keyboard.gaiamobile.org/manifest.webapp"];

var SYSTEM_APP = "app://system.gaiamobile.org/manifest.webapp";

// If injecting into an app that was already running at the time
// the Customizer was enabled, simply initialize it.
if (document.documentElement) {
  initialize();
}

// Otherwise, we need to wait for the DOM to be ready before
// starting initialization since add-ons are usually (always?)
// injected *before* `document.documentElement` is defined.
else {
  window.addEventListener("DOMContentLoaded", initialize);
}

function initialize() {
  if (document.documentElement.dataset.customizerInit) {
    console.log("[Customizer] Customizer already initialized; Aborting");
    return;
  }

  var request = navigator.mozApps.getSelf();
  request.onsuccess = function () {
    var manifestURL = request.result && request.result.manifestURL;
    if (BLOCKED_APPS.find(function (a) {
      return a === manifestURL;
    })) {
      console.log("[Customizer] BLOCKING injection into " + manifestURL);
      return;
    }

    console.log("[Customizer] Injecting into " + manifestURL);
    boot(manifestURL);
  };
  request.onerror = function () {
    console.error("[Customizer] An error occurred getting the manifestURL");
  };

  /**
   * TODO: Bug 1148218 - [Customizer] Undo inline stylesheets from Bug 1148139
   */
  function styleHack() {
    /*jshint maxlen:false*/
    var style = document.createElement("style");
    style.innerHTML = "@font-face {\n  font-family: \"customizer-gaia-icons\";\n  src: url(\"data:application/x-font-ttf;charset=utf-8;base64,AAEAAAAQAQAABAAARkZUTW5k7JgAAI80AAAAHEdERUYAfAD8AAB9LAAAACZHUE9T4BjvnAAAjvwAAAA2R1NVQhT4IUcAAH1UAAARpk9TLzJQZV66AAABiAAAAGBjbWFwkwHJagAABawAAAFqY3Z0IAARAUQAAAcYAAAABGdhc3D//wADAAB9JAAAAAhnbHlmIETmNAAACQAAAGfEaGVhZAMIikcAAAEMAAAANmhoZWEDswKzAAABRAAAACRobXR4Xt0ADQAAAegAAAPEbG9jYdru9bQAAAccAAAB5G1heHABRgEJAAABaAAAACBuYW1lFAG0pQAAcMQAAAKacG9zdE8OvSMAAHNgAAAJwwABAAAAAQAApW9TmF8PPPUACwIAAAAAANETpOQAAAAA0ROk5P/F/8IB/QHAAAAACAACAAAAAAAAAAEAAAHA/8IALgIA/8X//wH9AAEAAAAAAAAAAAAAAAAAAADxAAEAAADxANgAEwAAAAAAAgAAAAEAAQAAAEAALgAAAAAABAF3AfQABQAAAUwBZgAAAEcBTAFmAAAA9QAZAIQAAAIABgMAAAAAAAAAAAABEAAAAAAAAAAAAAAAUGZFZADAAC3xywHA/8AALgHAAD4AAAABAAAAAAAAAAAAAAAgABkAuwARAAAAAACqAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAGaAAABlQAAAagAAAGMAAABSgAAASQAAgGPAAABkgAAAeP/8wFMAAABOgABAXMABgGdAAABIgAAASIAAwGXAAUBgwABAHEAAACrAAABmgAAAZoAAAGaAAABmgAAAZoAAAGaAAABmgAAAZoAAAGaAAABmgAAAZoAAABsAAABmgAAAd0AAgGaAAABmgAAAZkAAADnAAABvAABAZ8AAAG8AAABmgAAAZcAAAHeAAAB2QAAAfYAAAFbAAABmAAAAL4AAAGYAAABmAAAAXMAAAGK/8UBjAAAAZwABwGwAAABQwAAAXwAAADsAAABgwAAAZgAAAFCAAABRAAAAVsAAAERAAABMQAAAUoAAAGHAAABXgAAAQcAAAGTAAMBmgAAAW4AAAC0AAABhQAAAf8AAAGUAAABwwAAAeEAAAHhAAABqgAAAYgAAAFVAAAAWwAAAJoAAACpAAABQwAAAXcABQGpAAABBgAAAScAAAErAAAAtQAAAZ8AAAGfAAAAcQAAAKoAAAF3AAABlwAAAZcAAAFVAAAA8gAAAWQAAAFjAAABnQAAAZoAAAEdAAABvAAAAOMAAAGaAAABoAAAAWYAAAGaAAABmgAAAeAAAAF3AAABRwAAAR4AAAEzAAAAogAAAWcAAADxAAAA/wADAW0AAAFPAAAB1AAAAQkAAAG8AAABZgAAATMAAAGcAAABrwAAATMAAAEmAAAB3gAAAVMAAAGwAAABqgAAAfsAAAF3AAABeAAAAXgAAAFcAAUA7wAAAYcAAwGXAAABHwAAAVYAAAHeAAAB3gAAAZgAAAFSAAABRgAAAX0AAAFKAAABqwAAAOYAAAA7AAAAkgAAAOoAAAFCAAABmgAAAMEAAQGmAAABIQAAAREAAAEAAAAA8QAAAZEAAAD6AAABeQABAXoAAQF3AAABmgAAAWcAAAFlAAYBywAAAWYABAGqAAYBZgAAAZoAAAGrAAABXgAAAV4AAAGIAAABMgAAAVUAAAEIAAABPgAAAdUAAAFhAAAAyQAAAPUAAACJAAIBUwAAAYAAAAHPAAABkAAAAbwAAAA0AAAAtAAAASYAAAGUAAABmQAAAAAAAwAAAAMAAAAcAAEAAAAAAGQAAwABAAAAHAAEAEgAAAAOAAgAAgAGAC0AOQBpAHAAevHL//8AAAAtADAAYQBrAHLxAf///9b/1P+t/6z/qw8lAAEAAAAAAAAAAAAAAAAAAAAAAQYAAAEAAAAAAAAAAQIAAAACAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAMAAAQFBgcICQoLDA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODxAREhMUFRYAFxgZGhscAB0eHyAhIiMkJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARAUQAAAAqACoAKgAyADoAQgBKAFIAWgBiAGoAcgB6AIIAigCSAJoAogCqALIAugDCAMoA0gDaAOIA6gDyAPoBAgEKARIBGgEiASoBMgE6AUIBhAHUAg4CUAKKAqYDEgNGA+QEQAR6BKwFOAVWBXQFtAXmBfwGGgY+BmIGgAakBsgG7AcQBzQHWAd8B6AHsAfyCGwIugkkCX4JvgpSC0ALjAvMDBoMZgysDN4NGg1WDXwNxg4ADiQOdg6cDtIPBA9CD4IPqg/eEB4QRBCaENIQ+hE0EbQSEBKgEzwTohPaFAgUHhRUFKIU3BUkFaQWEBZEFogWrhbMFuQXAhcyF3gYrBjGGPIZMhlQGYgZwhnYGfQaWhqCGswbEhs4G7YcGhxmHModYB2EHZod3h4YHj4ewh8+H7IgCiAwIGAgkiDAINwhwiHSIfIiHCJ6IqgjAiMyI1AjiCPQI/QkKiRSJGQkniVSJaIl0CYMJjgmeCa8JvQnGidWJ4QnsCfWKCYoWihyKOIpHilqKYopmCmwKdAp+CoqKkAquCsQKzIrUiuAK8Qr7iwwLGQsgCysLMws9C0yLZ4uJi5ILmIuwi8YL2Av3jAWMFowhjCuMN4xCDFQMXIxwjIYMlgyfjK2Muwy/jMeM0wzijPiAAIAEQAAAJkBVQADAAcALrEBAC88sgcEAO0ysQYF3DyyAwIA7TIAsQMALzyyBQQA7TKyBwYB/DyyAQIA7TIzETMRJzMRIxGId2ZmAVX+qxEBMwAAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAQAAAAAAAAAAAAAAADEAAAEAAAAAAAAAAAAAAAAxAAABAAAAAAAAAAAAAAAAMQAAAgAAACYBmgFDABMALgAANxQGBzMHIzU+ATU0IyIHJzYzMhYXMTMVBiMiJjU0NjMyFwcmIyIGFRQWMzI3NSO1L0J3Bq1KLCgcGSEjNyoxg2IpNzk+SDUzJR0aHyAoICEYFCn0IkM/KidMOxwoHRkuLU6GG0lGQ0sgHRYzNDcwC0cAAAAAAgAAACYBlQFCACEAOgAANx4BFRQGIyInNxYzMjY1NCsBNzMyNTQmIyIHJzYzMhYVFBczFQYjIiY1NDYzMhcHJiMiBhUUMzI3NSN9GyM2LTggHhggFhoxFgYPLBYSHhkbIzMpLYJhKTY5Pkg1MiUcGh8gKEEXFCm9AiMeJDAoHBsZFSwlKRAUGB0iJx4zBIUbSkVCSyAdFjI0ZwtHAAAAAAIAAAAmAagBQwAPACkAADcxFTMVIxUjNSM1NxcHMzcXMxUGIyImNTQ2MzIXByYjIgYVFBYzMjc1I6oiIjR2US1HQAXKYik3OT1HNTMlHRoeICgfIRoSKdVGKUBAJbcRokYOhhtJRkNLIB0WMzQ3MAtHAAAAAgAA/+sBjAGcACAAKAAAJTMUBg8BFhceAQcGJicOAScmNjc+ATcuAScuATU0NjIWJiImNDYyFhQBiwFSQBAECikpDAtFKChGCwwqKQMJAQMKAkBSdKRzrTAiIjAh+QoPAiAHEEduBwdTRENUBwduRwURAQYWBAIPCgwRESQiMCEhMAAAAwAAABkBSAFdAA8AFwAkAAAlIxUGJzUjJjczNTYXFTMWBiImNDYyFhQHNx4BFRQHIyY1NDY3AUgrCworAgIrCgsrArQ6KCg6KEU1HyUSzhIlH90rAgIrCworAgIrCxQpOCkpOHA0CygYMSsrMRgoCwAAAAABAAIAKQEiAUkADwAAJRYHIxUGJzUjJjczNTYXFQEiBQV1Ght2BQV2GxrTGxp1BQV1Ght2BQV2AAEAAAAnAY8BrABTAAAlMhYUBiMiJyMmIyIGHQEUIzMGIyInMyI9ATQ2MhcxFjI2NCYjIgcGIyImPQE0OwEWFzI2NTQnNSY1NDYyFhUUBzMGFRQWMyM2NzMyFh0BFBYyNzYBYxIaGhIRDAEGCQgMEgRLL0FLAxEMEAYMJBkZEhENBwcIDBEHGTQIDAgOHiweDgEIDAgBJhYLCAoMEAcN7B8sHg4IDAhIEQUFEUgIDAgOHiwfDwcMCEcSAgIMCAcIAQwREhoaEhEMBgoIDAICCwdHCAwHDwAAAAEAAAAeAZIBcwAgAAAkFAYPAQ4BBysBNyYnBw4BKwI3JzMyHwE2NyczMh8BFgGSSDdqAwcCAi9DPiAqAgcCAhohIRkJBSciQUUYHwZsNtQaFQN7BAQBhwcMOgQETk4JNQ4High/AwAACf/zABYB4wHAAAAACgAUAB4AKABEAFMAXQBnAAADHwEGFRQXByY1NB8BBhUUFwcmNTQlFhUUByc2NTQnBzcWFRQHJzY1NAcXFgcGIyIvAQYjIicHBiInJj8BJjU0NjIWFRQnNiYPAScmBwYfARYzMjcnBg8BJjY3NhYXMz4BFx4BBycmJw0gEhAQEhM5EAYGEAcBnxISExAQIw8HBw8FQSMLCwQGBwQlJzAvJiYEDgQKCiUnVnpXSwcOBz4tBwcHCDQCBAUCPDogAxAEFBQyEW0RMhQUBBADIDoBwMUKHiIjHgomJScCBw0REQ4HERUUNiEpJyQKHiMiHiIHERQVEQcLFBNuIwsLBAQlHRsmBAQKCyUqOj1XVz03agcOBzslBwgGCCsCArAXNAIUMhEQBBQUBBARMhQCNBcAAAQAAAAOAUwBgQARABgAMwA+AAAlNRYVFAYrATc7ASY9ATcVFBcHNzMOASMiExYXASYnNyMiJjU0NzU2PQE0Njc+ATIWFxYXBzcmIyIGFSMVFAcBOwsOCqEiRSUlISbGB1kCHBMlsw8L/s4PCx8FCg4LJiQdBBokGgQgE8auEzghLgEleAEIDQsOIh0lAiIXJxxHCBIaAVALD/7OCw8fDgsMCAEcJ0wbKwsRFxYRCxzGrSchGFklHQACAAEABgE5AYQABQAkAAA2IiYnMwY3ISImPwE2NzUzNjc0JzU0NjIWHQEWFzMVFh8BFgYjsCYcAWABWP7yDwsIBCQBAQU6AR0oHDoFAQEkBAgLDwYaExMqJwUGGSVKMhcCAgIVHBwVBhYzSiUZBAUqAAAAAAIABgANAW0BdAASABwAADcGJzcHJicmNjc2Fwc3FhcWBgcnIgYUFjMyNjQm50hAOYELBhNOSkdBOIANBRNOSi8QGBgQERgYDRIjgDgVF0qEFBIkgDgYFEqEE9wYIhgZIBkAAAAHAAD/8wGdAY0AAwAHAAsAGgBCAFgAXAAAATcXByc3FwcnNxcPATMVIxUjNSM1NxcHMzczByM1Njc2NzY3NjU0JyYiBwYHJzY3NjMyFxYXFhcWFRQHBgcGBwYHMzciBhQWMzI2NxcOASMiJjQ2MzIXByYfAQcnAWYqCiotIRUiShUdFRMQEBI1JQ8iIwIQWUsVBgMPAwUDBwoMCAYHCwkICg0GCggFBgIDAwUFAw0GFDkNR2ZmRzRVFSAYZkBVeHhVEhkEFpMsAyoBAQweDVIcGRs8Jg4npA8gIA1XBk8jUQ8VCAMSBAwIBwwEBgMEBwkLBAUEAwUGBQcHCQkMBgMSBxPpZo5mOS8HOkd4qngFIAWrBSAEAAAAAQAAABUBHwFsAA8AACU1FgcjFwYHJyY0PwEWFwcBHwYGy1cICowNDYwLB1bcARwcViIYjA0lDYwdHFcAAQADABYBIgFsAA8AACU1FhQPASYnNyMmNzMnNjcBFQ0NjAsHV8sGBspWBwvgAQ0lDYwdHFYcHFYcHQAAAgAFABMBlQF4ABkAJQAAARYGBwYnBxUGIyInNQcnBiY3NCY1JTY3NhYHNzQnLgE1BxYXHgEBjw4RGR0eVAkJCAmPBRsaEgIBBgccGjbCMwUBBjMBBAEGAVYZOA0PDC2yAwOgTgUDMBQBBQGOIQ8NEJgcAgkCBwEbBAgCBwAAAAABAAEAHgGDAX4AHgAAARcHIwYiJyY0PwE2MhYUDwEnNzY0JiIPAQYUFjI/AQEzEcsBFTkVFBTLHE84HKsSqxUqORXMDhwmDcsBEBLLFRUVOhXLHDhPHKsRrBU5KhXLDSYcDswAAQAAAFYAcQE0AAkAADcOAQcnNTcWFwdxAg0BYWEHCVdwBhEDYRxhBxBWAAABAAAAFQCrAWsADgAAEw8BBh8BBgcnJjQ/ARYXq2cBCQloBwuMDQ2MCwcBMmcBCQtoIBmLDSUNjBweAAACAAAAawGaARUAEAAUAAAlMxYVFAcjBgchIiY0NjMhFgc1IRUBdSEEAyEGDf62Cg8PCgFJDQn+tOsRGh4NJQUyRjIFlIiIAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IRUBlgQDIQYN/rYKDw8KAUkNBg/+3usRGh4NJQUyRjIFJW+IiAABAAAAawGaARUAEAAAJRYVFAcjBgchIiY0NjMhFhcBlgQDIQYN/rYKDw8KAUkNBusRGh4NJQUyRjIFJQACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IRUBlgQDIQYN/rYKDw8KAUkNBg/+7+sRGh4NJQUyRjIFJW+IiAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg/v6xEaHg0lBTJGMgUlb4iIAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg/M6xEaHg0lBTJGMgUlb4iIAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg+q6xEaHg0lBTJGMgUlb4iIAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg+I6xEaHg0lBTJGMgUlb4iIAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg9m6xEaHg0lBTJGMgUlb4iIAAACAAAAawGaARUAEQAVAAAlMxYVFAcjBgchIiY0NjsCFgc1IxUBdSEEAyEGDf62Cg8PCrCZDQlE6xEaHg0lBTJGMgWUiIgAAAACAAAAawGaARUAEAAUAAAlFhUUByMGByEiJjQ2MyEWFwc1IxUBlgQDIQYN/rYKDw8KAUkNBg8i6xEaHg0lBTJGMgUlb4iIAAABAAAAWgBsASYABQAANwc3IzcHbGkwM2YvwGZmZmYAAAQAAABrAZoBFQASABgAKQAtAAA3NjMyFhUUBh0BIzU0NjU0IyIHFzIUIyI0NxYVFAcjBgchIiY0NjMhFhcHNSEVrwsVDhAZExYKCQcODAwN2AQDIQYN/rYKDw8KAUkNBg/+vOEPDgsMEgcDBA4QBAkJMRoaRxEaHg0lBTJGMgUlb4iIAAQAAv/FAdwBrwAZAB4AIwBPAAAlFg8BFxYUDwE1DwIuASc3Jz4CNx8CNRMnFTc2JzYvARUXHgEHDgEnLgE3Nj8BNjU0JiIGFRQfARYXFgYHBi4BNjcnJjU0NjMyFhUUBwEpEhQxMQcHVT8CAgIFAUlIAQMEAQIBPzkcHAQDCAkcxhQWBAUmFBYWBQUPCgRjimICCg8EBRYWFCYKFhQFA3lXVnoD8xYYODkKGwlhn0oBAgYYBlJSBgwOBAICSZ7+8R9PIQiYCAYgTiYFNyIkLgICOCQhFjsNFElnZ0kXCj8XHCU5AgQxSDcEHxITW4CAWxMSAAAEAAD/8wGaAY0ABQAKABIAMAAAExYPATUXBzUXFgcCMhYUBiImNAUnNzY0LwEVLwEjNSYjBgcXBxYXMzc1Mz8BFTc2NPkGBhsbGxsGBoGqeHiqeAEQLi4ICE9BAQEBAQYDSEgHAgEBAQFBTwgBDAYHHEUbtkYcBgcBGXiqeHiqhzIyCBgIVYxAAQEBFAtHRxsEAQEBQIxVCBgAAAAGAAD/8wGaAY0ABQAKABIAMQA7AEQAABMWDwE1Fwc1FxYHAjIWFAYiJjQXJzc2NC8BFS8BIzUiNCMGBxcHFhc3NTM0MzcVNzY0Nz0BJg8BBh8BFj8BNi8BJgcVFsIGBhsaGhsGBkqqeHiqeNkuLggIT0EBAQEBAwZISAcCAgEBQU8IPQcFJgkJJgYtJgkJJgUHBwENBgcdRhy1RRwGBwEZeKp4eKqHMjIIGAhVjEABAQEGGEhHGwQBAQFAjFUIGAcBZQIFJwkJJgYGJgkJJwUCZQIAAAUAAP/WAZMBqgAIABEALQAyADcAACUWDwEGJzU2FyM2FxUGLwEmNycWFA8BFxYUDwE1DwEWIyYnNyc+ATcyFjMfATUTJxU3Nic2LwEVAZMNDTcICgoIQAgJCQg4Dg4WCgo7OQoKaFQCAQIKA15eAggDAQEBAlZHIyMJBwUFI84ODTkIA5gDCAgDmAMIOQ0OagogC0NDDB8LcbpWAgEZEGBgBhsHAgJUuv7BJVwmCLMJCiReAAMAAP/TAOcBrQAcACEAKAAANxcWFA8BNQ8BIwcmJzcnNjcWMRQ7AR8BNRcWFAcnFTc2JxcxNic1JxWYRAsLc1cCAQIHBmFhBwYBAQECV3MLC0wnCQoBCAkmwEQLIAtzvlcCAhIXYWEbDwECAla9cwsgC0ldJggKzwgJASVeAAAACQAB/+QBuwGdAAkAEwAdACcAMQA7AEUATwBXAAABJic3NhcWFwcGBycmNzY3FxYHBgcWFxYPASYnJj8BBi8BNjc2HwEGAxYXBwYnJic3NjcmJyY/ARYXFgcVFgcGBycmNzY3BzYfAQYHBi8BNgIyFhQGIiY0ARcKAxwNBwoDHAvbQgUEBQtBBgQFCwsFBAZCCwUEBqIHDRsFCAkLGwMKCgMbDAgLAxwL2wsFBAZCDAQEBgUEBQpCBwUEDGAJCxsDCgkLGwNhZEVFZEUBSQULQgYEBQtCBlkcDAgKAxwLCQpbAwoHDRsDCgkL0AQGQwsEBAZCC/7pBQpDBQQGCkEGsQMKBw0bBQgJC44MCAoDGwwJCQNdAwVCCgUEBkELAQVFZEVFZAAAAAADAAD/7gGfAZUAZgCCAKkAACUyFhQGIiY1NDcyFxYGFRQfARYXFhceAQcGFhcWFRQGMxYXMhcWNicmNz4EPwMmJyYnNCYnJg8BJy4CNzYXHgE2Nz4BMzI2PwEyNicmBw4BLgEjIjc2NzYnJgcGIi4BJzYXMjY3NCYnJgYXFhcGBw4BBwYfARYzMjYzMjcyBzI3FhcjIiY1ETQ2OwEyFh0BBgc1NCYrASIGHQEUFjsBFhcOARQWARg4T09wTzwBAwIHBQUFBRIDBwwDBwoFCwIBBgQCBAYBAQwHAQoFBAUCAgUFBBAIARIHAwIPDAMHCgQOBgMCAwIDEQUDBQIBBgcFExICBQMFAQYIAwQJDxAFAwQCAQEZewEGARIKBwgFAgEFAQIIAQYBAQEFAwoCCQQI9AYHBQ+CCw8QCswKDxUQCgeTBwoKB0ACAgkMDfxPcE9POEgoAwMQAxwGCAkEDAECBgIDIAYNBgIfFgEDAgECFAcBBwgKBwEBDwoMBQIEAwgHAwEFCgEEDAUTCgUCBAYIEwUDAgIGCxgDAgECBQMBAwQEAwEIBQQMXQMCAxgGBQgEAQEKAQMJAQkDAQECAXMFCRQPCgFUCw8PC2UDB1QHCgoH6QcKDAgBDBINAAEAAP/zAbwBjQA6AAATMxU2Mhc1MxUjFRYXMxUjNSMWFzMVIzUjBgczFSM1IwYjIicjFSM1MyYnIxUjNTM2NyMVIzUzNjc1I3dWDAoMVTMoGlgiIw0DRiIjAgpAIjEnU1QnMCJACgIjIkUDDSIiVhoqNAGNNQICNSIdEidEIiEjRCIqGkUiMzMiRRoqIkQjISJEJhMdAAAAAgAA/+sBmgGVAB8ALwAAEjIWHQEzNTQ2MzIdATMyFh0BFAYjISImPQE0NjsBNTQHIgYdARQWMyEyNj0BNCYjYA4LqQsHEBEdKCgd/u8cKCgcEREOFBQOAREOFhYOAZUPChoaCg8ZGigc7xwoKBzvHCgaClcUDt4OFBQO3g4UAAAEAAAAAgGXAX8AFAAaAB8ALwAAJRcWFA8BNQ8BJic3JzY3HwE1FxYPATc2LwEVNycVNzYFIyImPQE0NjsBNzY3ESYnAWYqBwdEOQMFAzw8AwUDOUQQEC4XBQUYGBcYBf7ZNwsWFgs3WA0QDw7BKgcUB0R2OQMPCzw8Cw8DOXZFEBGCGAUGFzqYGDsYBZMQCn4KD1gNAf6DAQ4AAAADAAD/1AHeAbIABwAeADIAACQiJjQ2MhYUJwYVFBczFRYzMjc1MzY1NCcjNSYiBxUfAQYHLgMnNjcXBgcGHgI3NgGKcFFRcFDoBgY+DhQLFz0HBz0OKA49cR4vN4R8TwsUH2cOCgklTEsUEp5QcFFRcFsMFxYMPQcHPQ4UFQ49Bwc93WQcGAtPfIQ4JyVyEhIUS0wmCQoAAAIAAP/PAdQBrAAWACsAAAEWDwEGJzUjIgYVFBcjJjU0NjsBNTYXAz4BNxcGByYnJic2NxcGBwYWFx4BAdIPDUEIC0MqPAoHElA4LgoJZQcaAmggKG53dhQTG1wIDggjIiRFAWYPEEEIAzY8KhcUHic4UDkDCf6fAxEBXRsTFHd2biggaAkYEkYiIyIAAgAAAFkB9gEEABgAHgAAJSY1NDEjNS4BIgYHIx0BBg8BNjc2IBcWFwcjIichBgF4BgEGQ1pCBgEDBH4DDVUBLFUNA6yeLRcBJheHHgIBAhEWFhECAQoWCCkiOjoiKSYoKAAAAAMAAAATAVsBbgASABwAJAAAJQYHLgEnNjcXBgcVBh4CNzY3JyInNTYzMhcVBjcGIic1NjIXAVsbHVi6EQ0YSQ8CBxs4Nw4DFzoNBgYNDAYGRwYaBgYaBjgYDRG6WB0bUhcDAQ42OBwHAg8+AY8BAY8BAQEBjwEBAAIAAP/hAZgBeQANACIAAAEVBi8BJj8BNhcVMxYPARU2NxcGBy4BJzY3FwYHFQYWFx4BAQ0KBjMMDDMGCngFBW0RDmEbJ2beEhMYVg4GCCAhIEEBGC0CBjQMDDQGAi4XFskBCgpWGBMS3mYnG2EUCgERQCEgIAAAAAEAAABcAL4BSQAVAAA3ByYnBgcnNjc1IyY/ATYfARYHIxUWvhA0Gxs0EEQDJgIGLwsLLwYCJgJtERswMBsRN1gPCQYvCwsvBgkNWgACAAD/4QGYAXkAFQAqAAABFwYHJwcmJz8BIi8BNjcXNxYXDwEXBxc2NxcGByYnJic2NxcGBxcGHgIBZSgECTIzBwUoAQEBJwQJMjIJBCgBAU0BFAphGydmb20UExhWDgYBCCBAQQEuKBAQMzMNEygBASgQEDMzEBAoAQHfAQwIVhgTEm9taCcbYRQKARFBQCAAAAAAAgAA/+EBmAF5AA0AIgAAJQYnNSMmNzM1Nh8BFg8BFTY3FwYHJicmJzY3FwYHFwYeAgFUBgp4BAR4CQczDAxvEQ5hHSVkcW8SExhWDgYBCB9CQO8GAi0WFy4CBzMMDNQBCgpWGhESb29mJxthFAoBET9CIAABAAD/9gFzAWgAEgAANwYHJic3FhcWPgInJic3FhcG/WRdIBxYCxEPOzwcBwkJThoOEGtkEQ8YTgkJBx08Og8RC1gfHVsAAAAF/8X/+gGKAcAAAAAUAB4AJgAuAAADATY3FwYHLgEnNjcXBgcVBh4CPwEmJyYnNxYXFhcHLgEnNx4BFwcuASc3HgEXOwE3Dg1XGiFbyBAQF00KCAcdOjoPchIoJzwIQi4vE18NNCgHLEAOXAgYEgcWHgoBwP6cCApNFxAQyFshGlcNDgEPOjodB3M8KCcSHBMuL0EWKTIOGA5ALBQSGAgTCh4WAAEAAAAEAYwBkAATAAAlNjcXBgcmJyYnNjcXBgcGHgI3ARAKFF4fIWNsaxIQGlMHDAggPj8QbgYOVBoQEmxrYyEfXgoUED8+IAgAAAACAAf/8QGVAX0ACwAdAAAlFgYjISImNxM2MhcTNjcnBgcGJyY3NjcnBgcWFxYBjxciLv7xLyIXiRdCFz8bCzgNBhcsKQkFBzIOCwtAQ1QpOjopAQApKf7KDQ4yCgIMLCkaCgg5ERY9QEAAAAADAAAAEAGwAXAABwAXAB8AABIyFhQGIiY0JTIWHQEUBiMhIiY9ATQ2MxIyNjQmIgYUrVY8PFY8AQoXHh4X/roXHh4XbmpLS2pLASc8Vjw8VoUeF/YXHh4X9hce/tBLaktLagAABQAAAF0BQQEmAA8AEgAXAB4AKAAAExUzByMiPQE0OwEyHQEHNQc1HwEjNxUUNxYPASc3NgcUBiMiJjQ2MhYedhpwCgr6ChtSH0QZIyoSCXUidArCDwoLDw8WDgEJkhoKtQoKKxszqh4eAiMZCpURCXUjdAoqCw8QFA8PAAIAAABAAXwBQAAQACcAACUjIi8DNzY7ATIWHQEUBi8BMj8BJicHJwYHHwEHIwcWFzcXNjcnATzAHxMCAkZKEx/AGiYmZAEBAScFBzIyCQQoAQEBJwUHMjMHBShAGAMCY2gYJhqAGiZ/AQEnEw0yMhAQJwEBJxMNMjINEycAAAAAAQAAADoA7AFHABUAADcjBh8BBgcnByYnNzU2LwE2Nxc3FheoAQoKRQgNYWENCEYJCkUIDWFhDQjLCgtFHhhgYRgeRgEKCkUgF2FgGB4AAAACAAAABgGBAYcAHQAgAAAAHgEPARUUBiMhIiY9ATcVFDMhMj0BByc3IzczNzYDIzUBYhoKBywMCf7XCQwbCQELCaNCorYbti0Hv0IBghoeByz8CQwMCeQb8AkJ0qNDoRwsB/69QgAAAAMAAAACAZYBgAAZACEAKgAAJRYGLwEGIyInIyY1MTQ3FzcWFzYzMhYVFAcmIgYUFjI2NCYiJjQ2MhYVFAGWCB4HPhocFxLKEkU1NQwFHicpOhA0Pi0sQCy6OikqOCofBx4IPhAJLDA0GDU1BAMcOikcGoItPiwsPkMpOCoqHB0AAgAA/+MBQgGSAA0AFQAAJTEUByEmNTQ2Nxc3HgEmIiY0NjIWFAFCGP7uGDIpRkcpMXtMNjZMNlxBODhBITYORkYONl02TDY2TAAAAAQAAAA3AUQBSQAYACMANAA+AAABMh0BFCMhIj0BNDMjMjY3NjU2OwEyFxYzByMUFjI2NTQmIgYXMjU0LgEiDgEVFDMyNjMyFiYyNjU0JiIGFRQBPAgI/swICAgMBwEBBBc0FwQEF1kBEhwSEhoTmQ0JIjYjCQ0DHBsaHAMaExMaEwEuCOYJCeYIBAYDAQ0NDl0NExMNDhMTgg0GDQ0NDQYNExNUEw0OExMODQADAAAAEwFbAW8AHgAhACQAAAEWHQEzFhUjFSInNSMiJj0BIyY1MzUyFxUzMhc3FhcFFTcHMzUBIQI0AjYKErwJDDUBNgkSvQQCOggF/vapnKkBKAQDvBIJNwI1DAm8CRI3AjUBOgUIR6mptqkAAAAAAgAAADkBEQFJAAwAGAAAEyMyFh0BJzU0JisBJwczFyMiJj0BFxUUFvIBDRMiCQWFJAWCJLkNEyYIAUkSDbokgQUJJu8hEw25I4UGCgAAAAADAAD/9gExAYsACQAdACcAADcnIQcOASsBIiYTMhYdASE1NDY7ATU0NjsBMhYdASM1NCYrASIGHQEuFwEDFgEUDJUME9QTG/7PGxMWGhJREhoYDQpLCg0U5uYNEREBTRsTHx8TGwsSGhoSCwoKDQ0KCgAAAAQAAP/uAUoBqAAIABAAHABVAAA2MhYUBiMiJjQ2IiY0NjIWFBcxFAchJjUxNDYyFgc2NycmNTQ/ASYnBwYmPwEmJwcGIi8BBgcXFgYvAQYHFxYUDwEWFzc2Fg8BFhc3NjIfATY3JyY2F5EoHh0VFB5ZTjc3TjdHGf7oGVyKZFUJAwcHBwcDCQYHGAQDEgoDBB4EAwgTAwMYBwYKAgcHBwcDCQYHGAMEEgoDBB4EAw8NBAMYB5YeKB4eKHM3Tjg4TrhAPDxAMD9AZg8NAgMQEQIDDQ8DBBgHBgoCBwcHBwIKBgcYBAMSCgIEIAMCDQ8DAxgGBwoCBwgIBgMIBwYYAwAFAAD/5AGHAY0AFAAiADEANQBEAAA3MhYUBiMiJyMiJjURNDY7ATIWHQEHNS4CJyMiHQEUOwEyNzU0KwEiFREUOwEiNTQ2FzUjFTc2NTQmIyIHBhUUFxYzMv44UVE4NSWICxEQDMcLD3QCAwMBFgQEHANYC6gMDE0DO18kIQYMCQoGBQUHCQj0UHBQIBELAVQLDg4LgNwOAwYIAgMdBNxwCwv+8wsjMErSenqNBggJDAYFCgkFBwAACQAAABUBXgFrAAoAFQAgACsANgBBAEwAVwBiAAATBisBIicjJiczBhcGKwEiJyYnMwYHMyMGKwEiJyYnMwYFBisBIicjJiczBhcGKwEiJyYnMwYHMyMGKwEiJyYnMwYFBisBIicjJiczBhcGKwEiJyYnMwYHMyMGKwEiJyYnMwZRAw4pDQMBBAJXAn8EDCoMBAQCVwIEgwEDDSkOAwQCVwL+9QMOKQ0DAQQCVwJ/Aw0qDQMEAlcCBIMBAw0pDgMEAlcC/vUDDikNAwEEAlcCfwQMKgwEBAJXAgSDAQMNKQ4DBAJXAgE0Dg4YHx8YDg4YHx8YDg4YHx+hDQ0YHx8YDQ0YHx8YDQ0YHx+gDg4YHx8YDg4YHx8YDg4YHx8AAAAACgAA/9QBBwGeAAsAFgAhAC0AOgBGAFIAXQBoAG4AABMxJiczBgcjBisBIjcjJiczBgcGKwEiNzEmJzMGBwYrASIHNSYnMwYPAQYrASI3IzUmJzMGBxUGKwEiNzUmJzMGBxUGKwEiBzEmJzMGByMGKwEiNyMmJzMGBwYrASI3MSYnMwYHBisBIgchBwYiJw0EAT4CAgECCR4JWwECAj0CAgIKHQlaAgI9AgICCh0KuwQBPgICAQIJHglbAQICPQICAgodCVoCAj0CAgIKHQq7BAE+AgIBAgkeCVsBAgI9AgICCh0JWgICPQICAgodCsgBB2sKHAoBeBURGgwJCQwaGgwJCQwaGgwJXQEZDBcOAQkJAQ4XFw4BCQkBDhcXDgEJXRkMFw4JCQ4XFw4JCQ4XFw4JWWwKCgAABQAD/+sBkwGwAAgAFAApADEAPwAANzYzMhcOASImNjIWFRQHBiInJjU0HwEGBycHJic/AS8BNjcXNxYXDwEyBDYzFgYHBic3MwYnJicmPgEWFxYHBnoXGBcXBRkgGhEyIg0VMhUO/igDCjMyCQQoAQEoBAkyMwcFKAEB/tAoEwIMDRsZGgEVFA8IChAoKwoFBgzTBQUdJCT6Py0qGwwMHict3CgMFDIyEBAoAQEnEBAyMw0TKAF3DBgkBAgzLQYGEhwlOworJRIiDQAAAwAA//MBmgGNAAcAGwAhAAASMhYUBiImNDcGBxYfARYyPwE2NyYnByMHBi8BFzI3IxYzeKp4eKp4fBoMAgVeCRkJXQUCDBoJAUYEBEenFwn5CRcBjXiqeHiqAgQDBwVdCQldBQgCBApHBARHqxoaAAIAAABAAW4BQQAFABoAADUhBiMhIjcnJic2Nx8CFj8DFhcGDwEGIgFuCyT+8SWNiQcDFCMOAWcGBmcBDiMUAweJDiViImGFBgsFBQ4BZAYGZAEOBQULBoUNAAAAAQAAACYAtAFaAAsAADcjFTMVIxEzByMVM51iebSyBnFirVssATQsVgAAAAADAAD/9QGEAYYABwAVACAAADYiJjQ2MhYUFzceAQ8BIzUXNyc3NhYHFhcHIyY1NDY3F6I+LCw+K6gBCgcFuzMzDTOuBRauLhKEZRMoIjnxKz4sLD5GAQoYBbszMw0zrgUHBRAghC40GywLOQAEAAAABAH9AVoABQAIACwANAAAJTcVFAYjJzUXEh4BDwEnNzU0JiMhIgYdARQWOwEVIyImPQE0NjMhMhYdATc2BDQ2MhYUBiIBaEMeFYk6uBgIBsM6iwoH/rsHCgoHq6sVHh4VAUUVHhYG/pEcKBwcKARCDxUeATo6AQoYGgbEOotPBwoKB+8HCyIeFfAVHh4VLRcGZygcHCgcAAAEAAAAEQGUAV8ABwASABwAJAAANjIWFAYiJjQXNxUHBi8BNxczFgc1MhYUBiImNDYQMhYUBiImNBIaEhIaEvCklBMXQxg0AQjJDRISGhISGhISGhLWEhoREhpJwTuwEw5aHEYIJwESGhIRGhIBERIaEhIaAAIAAAAoAb4BfAAgADMAACUHBic1IyIGFRQXJjU0NjsBNTQrATczMhYdATM1Nh8BFgc1MxUUBiMhIiY9ATcVFDMhMjUBvjUGCncUGwEGMyMVCfEb5QkMJQkHNQySHAwJ/tYJDBwIAQwJ2zYGAikcEwYCEgsjMlMIHA0JYSkCBzUMnFNiCQwMCeQc8QkJAAAAAAYAAP/4AeEBjgAUABkAHgArAEAAWgAABSMiJj0BMxcWMj8BMzI2PQE3FRQGJzMyFw8BJzMHBjcjIj0BFxYyPwEVFAYnNTQrASIdASczIz8CNh8BFh8BIxcdAQc1NyYrARUGLwEjNScmPwE2FxUzMhYXATb1BghgFAgYCBQnCQ0kCBwWBwQhcgwyDA1I9Q50CBgIdQkqBaIFMAECBARxDg5wBAIDAtRZTRAXRwkGIwENCwsxBwhHFBwCCAkFWBQICBQOCSYjuAUJ2AYgVwsLDSoNt3IICHS5BQijDgYGDy8DAkgJCUcCAgI5LhZiRFQTJwIGIwENCwwwBwIwHBQAAAAHAAD/8wHhAYkADQAZABwAKQA0AEIATAAAARUHFwYrASImPQE0NxcHBiIvASM2OwEyFwc3FSM3NTQrASIdASc3Nh8BByIGHQEjIj0BFyMXFjI/ARUUBisBIiY9ASUjNTMyFh0BNCYB4TEZBgdFBwoIIMUFEQV4AQMJ9QYFeUlWJAaiBTF5Dg551QoOFA5VG20IGAh1CAb1BggBe3p6FR4eAQlEORkICgdFBwYgYAUFdgcGd+NWMw8FBRAwTAkJTGINCVoNuFSXCAh0uAUJCQW3VioeFSsVHwACAAAAOQGqAVoAEwAhAAAlISImPQE3NjQvATU0OwEXMxUUBiU2HwEWFA8BBic1IzUzAZT+xwoNTgoKThc5NOIN/qgIBjEEBDEGCEVFOQ4JEk4KHAtOFxQ01gkO0AIGMQQOBTEGAiI8AAIAAAAXAYgBagAdAC8AACUUBzU0JisBFQYvASY/ATYXFTM1NCsBNzMyFh0BFgc1MxUUBiMhIiY9ATcVFDMhMgGIBRwTdwoGNQwMNQYKWwjxG+QJDTRQHAwJ/tYJDBsJAQwIjQ0PBxQcKQIGNg0MNQYCKGMJGwwJeRaLQlEJDAwJ5BzxCQAAAAACAAAAOQFVAUoACAAWAAA3Bi8BNjMhMhcHFjI/ARUUBiMhIiY9AbkPDpcFBwEzBwW8CRsJlAoH/s0HCq4ODpcFBb8JCZXQBwsLB9AAAgAA//MAWwGNAAMADwAANyMDMwIWFAcGIyInJjQ2M0s8BE0XGg0OExIODRoThQEI/sEaJg0ODg0mGgAAAQAAAGsAmgEVAA4AABMVHAMOBSsBN5oBAQICBAQDiZoBFIgCBwMHAgUCAwEBqgAAAQAAAAQAqQE1ABMAADc1IzUzNTQ2MzIXFSMiHQEzByMVMjIyLyIWDyUeRAk7BIkzKCMqAy4fJTOJAAAAAgAA//wBQwGSABMAGwAAExYXFAcGBwYjIic1PgE3FTUwFxYBNTcUBwYHBtw5LgMMMCAjKkItQBAMIv8AQRQIHQMBCwUUFhZsPQYYugdYSgEBAhP+f+4Fgl0HDAEAAAAAAgAFAB4BdAFzAC4ANAAAAR4BBwYrASImPQEjFRQGKwEiJyY3NjsBNTQ2OwEyFh0BMRYzNTQ2OwEyFh0BMzIHNSMxJxUBSCITCgELZwUMZwsFZwsBEjwFCRgLBDkECRATCgQ5BAoZCHYREgEkOn5DCwgFWVkFCAuWZQo2BAsNBDMBNgQLCwQ2jXABcAABAAD/9QGkAZMA1wAAJRYHNQYHBgcGBw4BKwEWFyImLwEWFyYnLgEnJicmJwYVJjcHNjc2PwE1Jjc0NzY3FTQ2NTcVND8CFRYXMTcWFzYXNTcVNjcVNjcHNjcXFAYHFjcGBxQfARY7ASMzMhUGBwYPAQYPARYVBiMWFxYHLgEjFh0BJicmJxcmJwYVFBceAT4BNzYXFgYnKgEOAgcGJxYzHgEXJgcWNzY3BgcWPwEUFQYXFj4BNz4BNTcWFzYnFhc2JxYXJyYjIg8BLgInNjIXJxYXJxcnHgEXFgcUFhU3FTUWAZUDAQQVFBAEDBE5FBMCCAwfCgkHCigwAQgCHBQZAgQDCQoGDAIHAQEBAgICAgMBBAUCBAEGCxcaBgIKCwkEBQUMBgEBARIGAgIHCxUBCgcDAgQDEBACAQIBAQEBAQIBBQEGAQQJAgICAwgWCRMLEAMaDwQFBgQCCAQKAxomFgICFQMGCiEaEQUEAQIMDAEDAgcKBAUHAQMCCQYICAQuEA8FM0k5LB4BAgIBOp45AhEMAQICChcDBQIBBxOFBwgCHhUSCQ0IDQ0FAQUDAwYDBSQBBQIUIyotEAcwHBclFwYKAgILCQUICgQCAQMBBgMCAggGAg4HAQkJBwcBBgIEBwIKAQQDAQEBAgEBAQ8WAgICCwUNAgYCCQkEAQIBAQIEBwYBAgMCAwICAwEDAQEFCRQMBgEDBwEHEgUKAgQDBwIRCRMBAwMEAxAFAwUGAQEMCgEDAwEBBQ0JDBYFBgULJDQGEUgjAgwFMyABAQQDATUzCQkSBwICBiASGRkBAwEWAQE2AAAAAQAAAAUBBgF3AA0AADc1IxEjJicRHgE7ATcGLQwKFQIthk8CAlOjcf7xCAEBaTM8AU8AAAMAAP/1AScBiwAHAAoAGAAAExcjJyMHIzcHMycXFg8BNwYiJyY/AQc2MkkpGwksCBopAiIRzREKmk0IHwQQCplNCB8Bf4MeHoNSPpEJFMixAgIIFcixAgACAAD/9QErAYsAFgAkAAATNRcGBycHLgEnNzYvATY3FzceARcHBhcWDwE3BiInJj8BBzYyVSIDBzEyAQcCJAUFJAMHMjMBBwIkBbkQCplNByAEEQqaTQcgATcBJA4NMTEEEQYkBQUkEAsyMgQRBiQGYggVyLECAgkUyLECAAAAAAEAAP/1ALUBiwAOAAA3HgEPATcGIicmPwEHNjKTCQQGmk0IHwQRCppNCB/aBBIHyLECAgkUyLECAAAAAAQAAP/wAZ8BkAAIABAAGAAfAAATFQYHBgcjPgE3FhcjJicmJwIWFxUuASczIQYHNT4BN4EnHR4PEBFEylwkEA8eHSb/OicsRBEQAY8jXSU8DwGQERAdHiUsRBEkXSUeHRD+zDoQERBELV0kEQ88JQAEAAD/8AGfAZAABgAPABYAHwAAJDY3MwYHNQE+ATcVBgcGByEuASc1FhcFFhcWFxUuAScBSUARBSRc/uEQRC0sHx4SAZQRQCpdI/5nEh4fLC1EEAdAKl0kBgEZLEQRBhIfHiwqQBEGJF2eLB4fEgYRRCwAAAEAAABWAHEBNAAJAAA1Nyc2NxcVBy4BVlYJB2FhAQ1wV1YQB2EcYQMRAAAAAQAAABYAqgFsAA0AABE2NxcWFA8BJic3NTYnCAqLDQ2LCghoCQoBMiIYjA0lDYsaH2cBCgoAAAADAAAADQF3AYQAFAAtAEoAADcWNxUUKwEiNRE0OwEyHQEmDwEGFyUyFhURFAYrASImPQEjJjU0Nj8BMzU0NjMTMjY1AzQmKwEiBh0BMzU2HwEWDwEGJzUjFRQWM2sFBxVOFBNQFAcFKQ0NAR8HDw0HqwcQECgVCgsODgeZBwoBCgeDBwovBwUtCwstBQcvCgeTBQFxERIBVBESaAEFLgsLwgsG/qsHCgsGmwUPBwoCAZIGC/6gCgcBJwcKCgd7KAEFLQsLLQUBKIQHCgAFAAAAJwGXAVYAAwAGAAkADAATAAARIREhJTUHNyMXBycVFyE1JwcnBwGX/mkBZWpO/n8vagcBIncZG3cBVv7RPKZXl20oVqUuGFgUFlgAAAkAAP/1AZcBiwAFAAkAEAAUABgAHAAiACYALQAAPAE3MxUjNzY3FRM1MxUGIyInJiczExYXIwc1MxU3FhQHIzUVNTMGAzYzMhcVIwxsbAYfRxCHJCAjMEcfZqZIH2eWh3wMDG1nH94kHyUfh5xIIIiXSB9n/u5sbAwRH0gBDR9Il4iIiCBIIIj+Z0gBWgwMbAAAAAAJAAAAFQFVAWsAAwAKAA4AEgAZACAAJAAoAC8AADcjNTM1FSM1NDYzFyM1Mwc1MxUHMxUjIiY1ATIWHQEjNRU1MxUHMxUjMzUzFRQGI2ZmZmYKB81nZ2dn3mZVBwoBRAcKZmbeZ2d4ZgoHjWZ4Z1YHCmdn3mZmEWcKBwFFCgdWZ95mZhFnZ1YHCgAAAAEAAAAQAPIBXwAZAAA3NTMVBiMiJjU0NjMyFwcmIyIGFRQzMjc1I4drNTg+R1I6NSwZIyUnNVkhHDrJAZ0dVlFOWiQbGT9Dgw9iAAAGAAAADgFkAXIADQAdACkAPABMAFgAADcyFxYVFAcGBw4BKwE/ATIWHQEUBisBIiY9ATQ2Mxc3IwcjNyMHMzczBzczNjU0JyYnJicmKwEHMzI2NzYXJzY3NjU0JyYrAQczNzMXLwEWFRQHBisBNzMysAwGBwIDBAQMBwoJYyU0NCWyJTQ0JSUMEwUjBRMMEwUjBm8BAwMEBQYICQoaDB0OEggGVxYMBgcJCBUcDBMFDBMBAQUFBwgNBAoJ4wYHDA8GCAYFBkePNCWyJTQ0JbIlNORkKChkLCwjCg8KBwkEBAMDZAgIBhYrAwgJCgwIB2QoKFIBAwcKBAUgAAAFAAAAeQFjAQcACwAdACsAOgBEAAA/ATMHIzcjByM3Mwc3FhcWFRQHBgcOASsBNzMyFxYHNjU0JisBBzMyNzY3NjcGBxcjJyMHIzczMhYVFAcyNzY1NCYrAQdWBxsRGwgxCBsRGwe5BwUFBQQLCxoUKRElChALBQMSEQwNDgsIBwcHjggSHx0bEQcbESgcGjkOBwgODQ4FzjmOPz+OOSoGCwwNEhERCgsMjgQDTwwRExJmBAQICSALBT05OY4UEg8NBwgMCQouAAMAAP/zAZ0BlAAJACQALgAAPgEWFxYOASYnJiUUDwEGBzc2NTQmIgYVFB8BJi8BJjU0NjMyFgYeAQcOAScuATZPKCQFBRYoJQUFAWUCEhMfGgNgimEDHB8TEwN5VlV5dSgWBQUkFBQXCpwELSQjNwQtJCJcGApjFxeTDxFHZGRHEQ+VFxdjEhJYfH15BDYkIi0CBDZEAAAAAwAA//MBmgGNAAcAFQBEAAASMhYUBiImNBc2NTQnJiMiBhUUFjMyPgE1NCcmJyYnJiMiBwYHFzY3NjMyFxYVFAcGByIGBwYHBgcGHQEzNTQ3Njc2NzZ4qnh4qnjUBgYFCAkKCgkIMgwDAgkLCgkQFQ4LFRQKDQ4HDwgMBwYEAQkDAwoFBQQcBAMHCAUKAY14qnh4qsQGCAcGBQoICQqJFAsQCQcJCQQEBwUYDw0GBgcICw0JCAMIAgELBQoIDQsJDAcFBwgDBgANAAAACgEdAY0ABwAPABcAHwAnAC8ANwA/AEcATwBXAF8AZwAAEjIWFAYiJjQ2MhYUBiImNDYyFhQGIiY0BjIWFAYiJjQ2MhYUBiImNDYyFhQGIiY0BjIWFAYiJjQ2MhYUBiImNDYyFhQGIiY0BjIWFAYiJjQ2MhYUBiImNDYyFhQGIiY0EzIUIyEiNDMZGhERGhJ4GhISGhF4GhERGhK7GhERGhJ4GhISGhF4GhERGhK7GhERGhJ4GhISGhF4GhERGhK7GhERGhJ4GhISGhF4GhERGhI+Cwv++QsLAUcRGhISGhERGhISGhERGhISGkQSGhERGhISGhERGhISGhERGkQRGhERGhERGhERGhERGhERGkQRGhISGhERGhISGhERGhISGgFXIiIAAAACAAAAJgG8AVoACwAXAAA3NTMRIzUjFSMRMxUlMxUjFSM1IzUzNTOoOzttOzsBP0JCMUJCMd58/syKigE0fAItREQtRAAAAAABAAAAJgDjAVoACwAANzM1MxEjNSMVIxEzO207O207O958/syKigE0AAAAAAcAAAAgAZoBkgADAAYACgAOABIAKQAtAAATMxUjBzcXJxUjNRc1MxUnMxUjJjIWFRQGBxE0JisBIgYdARQGHQEmNTQ3FSM1qg8PFjk6LA9EEDIQEHaqeC4oEguiCxIkRJcPAT9AsktL8kBAQEBAQECTeFUyVxwBIgwSEgx5AxkCfT1aVSVAQAACAAAABAGdAYQADQAjAAABIxUGLwEmPwE2FxUzFgcWNzUWFRQGIyInBzcmNTQ2MzIXBhcBnXgKBjMMDDMHCXgFhAoNEF9DLytJHBtfQw4aAgkBKS0CBjQMDDMHAi4WXwoDEyIlRF4cHEgpMURfBg0JAAAAAAIAAAAfAWYBggANABUAABIyFhUUBiM3IwcuATU0FjY0JiIGFBZplGljShQnFz5RzQ4OGA4OAYJpSktloaANYUFKKw4WDg4WDgAAAAATAAD/8wGaAY0ABwAXABsAHwAjACcAKwAvADMANwA7AD8AQwBHAEsATwBTAFcAWwAAEjIWFAYiJjQ3IgYdARQWMyEyNj0BNCYjBTMVIzczFSM3MxUjNzMVIzczFSM3MxUjNzMVIwczFSM3MxUjNzMVIzczFSM3MxUjNzMVIzczFSMHMxUHNzMVIzczFSN4qnh4qnhMCg8OCwEBCw8PC/7/GhonGhomGhomGxsnGxsmGxsnGhrnGhomGxomGhonGhomGhonGhomGhrnMzNAgYGOMzMBjXiqeHiqEQ8JmQwPDwqaCg8lGxsbGxsbGxsbGxsbGxkaGhoaGhoaGhoaGhoaGRoBGxsbGwASAAAAQAGaAVAADwATABcAGwAfACMAJwArAC8AMwA3ADsAPwBDAEcASwBPAFMAAAEyFh0BFAYjISImPQE0NjMFBzM1ByMVMycHMzcVIxUzJxUzNRUjFTMnFTM1BxUzNScjFTMVIxUzJxUzNQcVMzUXNScVOwE1JwU1JxU3NSMVNTM3IwF3DhUVDv6rDhQUDgEAASQBIiJVASMBIyNXIyIiViMjIzMjIyMjVyMjJCFEVaurAQBERCIiASMBUBQOzA4UFRDLDRMxJCRFI2gkJEUjaCQkRSNoJCRFIyNFJCEjaCQkRSMjZyIBJCMBIyIBJEUjI0QkAAAAAAYAAP/oAeABpgAYAB0AOgA+AEYATgAAEyMGBxYXBgcmJwYHJic2NyYnIzUzNTMVMwc2NyMWFzI2MxQGFBYVIgYjIiY0NjMyFhcGBy4BIyIGFBY3MxcjJjIWFAYiJjQXMycjBzM3M+0cCh0IDQMHDwwWMQgEKxoeChxJFkZTGghDCRcBCAEBAQEIAT9aWj85VggHDgdKMTZNTeYBHj0ffFhYfFjJHD4iPhsPSQEwKx4GBQMPCAcREQ4FCxIgKREcHE4XJiWBAQIJBAYBAVp+Wks4AQQwQk1sTTtWpVh8WFh8iqioKgAAAAADAAAAFgF3AUgAEwAgADcAACUHDgEnBwYiJjQ/AT4BFzc2MhYUDwEGFBYyPwEmNj8BJjYmIg8EBhc3NDY1FzcWDwEWPwE2AWNiEC4TOhQ6KBRiEC4TOhQ6KOhiCxYcCjgNBBIOEbgUHAs4GRECDAYRAgEnChwOEgxiCtJiEAcLOhQoOhRiEAcLOhQoOhBiChwWCzgUMRIOAy0WCzgaEAMPEhABAgEBJyYcDgMMYgoAAAIAAP/pAUcBlwANABUAACUUBxcHJzUmNTQ2MzIWBjI2NCYiBhQBRyABhYQfYENEYMZEMDBEL/Q1KwGqqgEqNkRfYJUwRC8vRAAAAAACAAD//AEeAZUAGAAhAAAFIyImPQE0NjsBNTQ2MzIWHQEzMhYdARQGAzQmIgYdATM1AQr2CAwMCAtBLzBBBQgRDDcqPiuTBAwIwQgMPi9DPi8+EQjACA0BJx8rKx8+PgADAAAADAEzAYIACQAXAB8AABMHMxQGIiY0NjI3FxEUBisBIiY1ETQ2MxIyNjQmIgYU3kdhNEo0NEomSREM+wsQEAtXWkBAWkABC0MkMTRKNF1H/u4MEREMATwMEf7dP1xAQFwAAwAAABUAogFaAAsAEwAfAAATIiY1NDsBMhUUBiMVMhQrASI0MxcyFRQGKwEiJjU0Mw0FCA2IDQgFDQ2IDQ2IDQgFiAUIDQEmEAsZGQsQVTIyiBkLEBALGQAAAAABAAAAHgFnAYwADgAAExUyFhQGIyInBzcmNTQ2tEppaUo4LFAfHmkBjAFolGkeJlgsN0ppAAAAAA4AAP/CAPEBhwABAAsAGwApAC0ANwA5AEkATwBVAFoAbAB+AKMAABcVNzUGIyInFRYzMicUFyY9ATQ2MzIXJiMiBhUTIiYnHgEzMjY9ARUUBjcXMyMHFRQXJj0BNjcGFxU3NS4BJx4BFxUUBgcVNT4BJxQXJj0BMx4BFy4BBxYXFSYTNCYnHgEdARQGIyInFjMyNjUnNDYzMhceAR0BFAYjIiYnJjUzNRQGBxUGIyInNTEmJyY9ATY3FRQXHgEzMjY9AR4BHwEzHgEXXDkUChIJCRIKUAYGKh0FCgoEHStIHjELCzEeKTg4QgEBAeUHBwoNDVKVAgcCAgcCNCgoNNoICMMCBgICBtUWPz6iIRgZICodMBITLx0qjysdBAoYISodFSUIBsA0KBQKCRI/FgcQBwgLMR4pOAIGAgEBAgcCPAEBAQIBAQGqDg4ODtMdKwICKx3+zCEbGyE5KH19KDnYAQhuFhISFm4IBwfrM6huAQUCAgUBbipBCjIyCkEqExMTE30BBAEBBKQ8EAEQATgZKAUFJxrTHSorKyod0x0rAgUoGdMdKhgTDg4BKkEKMwICMxA8EhZuDAN9ExMbIDkofQEEAQECBQEAAAABAAMAngD8ANEABQAANzMWByMmA/kEBPkF0RkaGgAAAAEAAAACAW0BbwAQAAAlNjUGBwYiJjQ3NjcHBhQWMgFrAg0kNppsNiQ1Ai5cgo8BATUkNmyaNiQNAi6CXAAAAAADAAAAoQFPAN8ABwARABkAADYyFhQGIiY0NzMyFhQGIiY0NjoBFhQGIiY0EhoSEhoSpwENEhIaEhGJGhISGhLfEhoSEhoSEhoSEhoSEhoSEhoAAAAEAAD/6QHUAZcAEwAVACkAPAAAJRcGBycHJic3Ni8BNjcXNxYXBwYHIxMyFxEUByYvASMiJj0BNDY7ATc2AzMRJg8BBisBIh0BFDsBMh8BFgGiMgQMRkYKBTMGBjEEC0ZEDAQyBrwEBBUEGw8eUzUQGRgRNVIgAwIDCVQDBzIKCjIDB1IJpjMSFUZGEhUzCgYxFhJGRhQUMQrBAawU/nkLCAIeTxsRexEYVBv+lQElCwlUBQpgCgdTCQAAAAIAAAASAQkBgQAOAB4AABMeAh0BFAYrASIvATUXJzEVJxEuAj0BNDY7ATIX3gUOGBEMAQ0Iho4elQUOGBUMAQ0IAYEDDCoX/gwSCIo+kpk+kv7SAw0qF/0NFAgACAAA/9MBvAGvAAgADAAaACQALAAwADQAPgAAJDIWFRQGIiY0NyMnMyUzFxEUBisBIiY1ETQ2EzUjIgYdARQWMzc1IxUzNSM1FzUjFTc1IxU3NCYrARUzMjY1AYwcFBQcFTosBzr+aMBRFA7vDRMSMggLERELTTIyI2cyMjJ0EAsWFgsQWxUNDhQUHEG2cVL+mA4UFA4BmA4U/kTvEAu4CxGHaO9nIIdnZ4doaE0LEO8RCwAABAAAABQBZgF6AAcADQATABkAABIyFhQGIiY0BTYnIwYXNzYnIwYXNzYnIwYXaZRpaZRpARICA7oDA7sDA7sDA7sDA7sDAwF6aZRpaZSgCAwKCkUKCwsKQwsLCwsAAAAAAgAAACYBMwFaAAcADwAAEjIWFAYiJjQWMjY0JiIGFFqAWVmAWm1aQEBaQAFaWoBaWoDAQFpAQFoAAAAAAgAAAAQBmAGEAA4AIgAAAQcGJzUjJjczNTYfARYPATMWFRQGIyInBzcmNTQ2MzIXIwYBlzMGCnsFBXsJBzQMDNVULl9DMCtIHBtfQxIUBgUBNDQGAi0XFi4CBzMMDB0wQUReHBxIKTFEXwUWAAAAAAUAAP/zAa8BngAHABAAHAAgADAAACUjJzUzMhYVBzM2MRUUKwE1ByImNDc2MzIWFRQGBxE3EQMGFRQXFjMyNzY1NCcmIyIBMAMekQQLhQl8F4mPDRAIBw8NEBCO/aYQDxAZGREQDw4bGtoTVQsHdlScGHM4GioODRoWFRp1AU0x/lUBCBQkIxMUFRQkIRUUAAIAAAACATMBfgAJABMAACUiJxE2MzIXEQYlETYzMhcRBiMiAQIcGRkcGRgQ/t0iFBgYECAlAgMBdgMD/okCAgF2BAP+iQIAAAEAAP/8ASYBhAAnAAABMhYVERQGKwE1MzI1ETQrASIdATMyFh0BFAYrASImPQI3IzU0NjMBCA0REQ1HNwgIywdSBgoKBmkGCQEBEQ0BhBEN/rQNESYHAS4HB6YJBpcGCQkGlwICwA0RAAAAAAMAAP/RAd4BrwAHAA8AFwAABCImNDYyFhQCIgYUFjI2NAcVBzUXFRYUAVLGjIzGjJW0f3+0f2qurgsvjMaMjMYBPH+0f3+0bQFk8GQBBhoAAQAA/+QBUwGcAAUAACQUBwURBQFTFP7BAT/YMAy4Abi4AAAAAgAAABYBsAGHACAAJwAAJRUUBiMhIiY9ATcVFDMhMj0BLgE1NDcjNzM2MzIWFRQGNycVNzY1NAFVDAn+1QkMIggBAQgqNwykIpwfKi5BNANhYQargAkMDQniIvEICGwFPioXGiIcQS4oPnI8jzwDCAkAAAAEAAD/+AGqAXgAVABXAGcAeAAAAD4BPwEGBxUOAgcOBSIjBiYjIgYnKgEuBCcmJxcWFRQHHwEWFQcXBiMvASY0NycmNTQ2PwEGFycuATQ1JxYXFj4BNzYWHwE+AhceAQE0Jzc2LgEnJg4CDwEWFx4BPwE+AT8BJicuAwcOARUXFgF6FhIEBAYCAQQPDgkSEQ8OCQkBIR8PEB8gAQkJDg8REgkKCAQFBAQBBgUBAwYJAgcGAQcDAgEBAQICAQgNGAsSJxMaKAwLBA8wFhMn/rsBkAEBGBgJFQgQAhYCHw0vEbQOEAEBCwsCEAgVCRgYAT4BWQIKBQUhHxcWESgTDBILBwMCAwoKAwIDBwsSDA0RRQcICwQ8AQgMFg8DAzUJJAkmBw0GCgICEwNbCRMVBUATAgEFDwUHAgUEAgUGCQYO/qwNBsAFEB8FBAMDBwEGEg8HBAIJBxAFBQIEAQcDAwQFHQwLCAAAAAADAAD/4gH5AYQADgAcADEAACUjFQYvASY/ATYXFTMWBycGJzUjJjczNTYfARYPATY3FwYHJicmJzY3FwYHFQYWFx4BAfleCQczDQ0zBwleBQXIBgleBAReCQY0DAxNEQ5gHCVmb20UExhWDgYIISAhQKIuAgczCw0zBwIuFhdgBgItFhctAgY0DAzlCgpWGRISb21nJxthFAoBEUAgISAAAQAAABYBdwFnABwAACUWFwcGLwE2Ny4BIyIGFBYzMjcXBiMiJjQ2MzIWAUoYFTYNDDYVGwlFLjRKSjQzJhwxREVhYUU+XdcDCDcNDTcJAyw6S2pLJh0xYoxjUwACAAD/8wF4AZ4ACwAoAAA3NDY1BwYHJzczFSM3FhUUBiImNTQ2NzM1FxYVFA8BNSIGFBYyNjU0J7gBBQIRCiQRFJgobpxubU0CYAYGYEBaWoBaJLwGDgMFAw0NHX24M0FObm5OTW4BMzkDCAkDOTRagFpaQDcsAAABAAD/8wF4AZ4AHAAAARYVFAYiJjU0NjczNRcWFRQPATUiBhQWMjY1NCcBUChunG5tTQJgBgZgQFpagFokASMzQU5ubk5NbgEzOQMICQM5NFqAWlpANywAAgAFAD4BXAFQABQAKwAANzU0JisBFQYvASY/ATYXFTMyFhUUNzQ2NTQmKwEVBi8BJj8BNhcVMzIWFRTwGxN4CgY1DQ01BgpVIzNhARsUdwkHNQwMNQcJVSMzPgcUHCkCBjUNDDYGAigzIw1oAQUCExwpAgc1DQw1BwIpMiMLAAADAAD/8wDvAXwAEQAjAC0AADczFhUUBiImNTQ3MwYUFjI2NDcXFSMnBgcjJicHIzU3PgEyFgczMhcmIyIGBzaFEwMaEBsDEgMMCAxAJxgwCgY9BgoxGSgLNCI0RAEUCRAOBhIGDUoMDhcmJhcODAYUEREUpzKBMAoDAwowgTI1XFwdAi8dEwMAAgADACwBhwF6AAsAIQAAExcWDwEGLwEmPwE2FwYvATY3LgEjIgciNCM+ATMyFhcWF4N1BgZ1BgZ0BgZ0BuMJCScNFwJALUMgAQEPPSUySAIWDQEhdQYGdAYGdAYGdQZUCQknBQItPzsBICdHMgIFAAIAAAAkAZcBiQAMABYAABIyFhUUBycmDwEmNTQXIzI2NCYiBhQWd6h4EHEKC7tGlwETGxsmGhsBiXdUKiZxCwu7PF5UTRomGhomGgAGAAD/8wEfAZsAEwAXABsAHwAkACgAABMyFhURFAYrASImPQE0Nj0BNDYzFxUzNSMVMzUjFTM1EzsBJwc3NSMV/Q0VFQ3eDRIhFQ1mIlYiVSIzAURFRKsiAZsVDf6cDRUUDrwDHAOGDRUiT09PT09P/uFVVdBPTwACAAAAHAFVAXUAEQAbAAAlFg4CLwEGIyImNDYyFhUUDwEyNjQmIyIGFBYBUwUGFBUERyQoPVVVelUVfSw+PiwrPj5MBBYSBwVEFVZ8VlY+KCQfP1g/P1g/AAAAAAMAAAA1Ad4BTQAFAAsAFwAAJSY0PwERJSY0PwERJREyNjMyFxEGIyImAR4NDcD+YAwMwv8AAggCCgwMCgIIqQgeCHb+6nIHIAd0/uoEAQ4BA/72AwEAAAADAAAANQHeAU0ABQAMABMAACURNjMRIicHERcWFAcjBxEXFhQHAbwUDhYowsIMDODAwA0NPgEHBP7xb3QBFnQHIAdyARZ2CB4IAAAACAAA//QBmAGMAAMADgASAB0AIQAsADAAOwAAJTUzFSc0KwE1MzIWHQEjJzMVIwcVIzU0NjsBFSMiFSM1Mx0BFDsBFSMiJj0BBSM1Mzc1MxUUBisBNTMyAX0bGwgyQAgNG+RmZn8aDAhAMQkaGgkxQAgMAP9mZn4bDQhAMgiNZmbcCRoMCEFVGgkyQQgMGuVmqjIIGw0IQFUbCDJACA0bAAEAAAAXAVIBaQAhAAATMhYUBiImNTQ3FwYVFBYyNjQmIyIHFxYXFhQGIi8BNxc2qUZjY4xjDBwCTG5MTDctI2ECAwkSGgmTCTIxAWljjGNjRiIcIwkSN0xMbkwbTgEDCRoSCbYJKSkAAQAAABcBRgFaAAoAACUFNjU3NS8BBRYUATv+xTiLjDcBOwumj5UDCAMImI4IFgAAAgAAAAMBfQF/AD8ARwAAJTMUHwEGBycmBgcGHwEGBycmIg8BJic3NiYnJg8BJic3NjQvATY3FxY3Ni8BNjcXFjI/ARYXBwYXFj8BFhcHDgEyNjQmIgYUAV8BDw4HEQ4GFwoYBwYcHQUFRgUFHxsGAwoKGg0OEQcODw8OBxEODBoZBwYcHQUFRgUFHxsGBxgZDg4RBw8PzFY9PVY8wSMFBR8bBwMLChoNDREHDg8PDgcRDQYXChgGBxsfBQVGBQUfGwcGGBcQDREHDg8PDgcRDQ8YGQcHGx8FBYo8Vjw8VgABAAAADQFIAXUAJAAAJR4BBw4BJyY3JwYjIiY0NjMyFzcmNzYeAQYHBicHFBYUBhUXNgEuFAsLCywUHwOCDhMXISAXEw6DBB8ULRYLFCEcgwEBgx1zCy4TFAsLESVLCyEuIAtMJRELCygtCxIVSwEEAgQBTBYAAAACAAAAFQGrAWsAEAAzAAAlIi8BNxcWOwE1FxYVFA8BNSciDwEGKwEmJzMyPwEnJisBNjczMh8BNzY7ATUXFhUUDwE1AT83JCMYKBsjBmAGBmAGJBqMJDYWBAEbJBo7OxokGwEEFjYkNzgkNwZgBgZgRykjGCcbNTkDCAkDOTLQGowpFQ4aOzwaDBYpNzgpMjkDCQgDOTUAAAEAAAAJAOYA7gAPAAA3FhcHFwYHJwcmJzcnNjcXwRAVTk4OF01NFBFNTwwYTu4LGU5PFBBNTQwYTU8UEU4AAAABAAAAFAA7AGwABQAANT4BMxUjAiIXOzMYIVgAAgAAABQAkgCnAAUACwAANzQ2MxUjJz4BMxUjWCIYOlgCIhc7aRokkx8YIVgAAAAAAwAAABQA6gDhAAUACwARAAA3FSM1NDYHNDYzFSMnPgEzFSPqOiJ6Ihg6WAIiFzvhzZAZJHgaJJMfGCFYAAAAAAQAAAAUAUIBHAAFAAsAEQAXAAABESM1NDYHFSM1NDYHNDYzFSMnPgEzFSMBQjsjQDoieiIYOlgCIhc7ARz++MoZJTvNkBkkeBokkx8YIVgABQAAABQBmgFWAAUACwARABcAHQAAAREjNTQ2BxUjNTQ2BzQ2MxUjJz4BMxUjAREjETQ2AUI7I0A6InoiGDpYAiIXOwGaOyMBHP74yhklO82QGSR4GiSTHxghWAFC/r4BBRkkAAEAAQEmAMEBjgAJAAATFhUjJj8BNjIXuwbAAwhJBxQHAT0GEQ8ISQgIAAAACgAA/+QBpgGVAAwAEAAUABsAIQAlACkAMQA4AFMAABMzFxEUKwEiJjURNDYXFTM1IxUzNQcVMzUjIgYXNSMXFDM3NSMVMycjFzcnBxUzBzMyJzQmKwEVMzceARUUDwIWFRQGIyImLwE1JicmNTQ3HwE3Hr1FKuIEEBKFJFcjVSIIChAiIwEVQCNXASMBVgG8mgEJGwMPCgghkRIYEg4BAQ4KBgwCAw0BEhcEHBcBlUL+uCAVCwFrDRKyPT09PRkkPQ+3NCAUATMzMzMRZwEzRKwKDz2qBSAUGBISEMMNCg0MBgXgEAESGh0SKhMcAAAACQAA//wBIQGmAA4AEgAWAB0AJAAoACwAOAA/AAATFxEUBisBIiY1ETQ2OwEHFTM1IxUzNQcVFzUjIgYXNSMVFBY7ATUjFTM1IxU3NSsBMRUzHQEzMjY9ATQmKwEV2kcSDecMDxAMwUQjViNWIwsKDiMjDwo9I1YjViOZmQoKDw4KCwGjSP6/DRERDQFtDRK7NDQ0NBgbATQOrzQdCg00NDQ0F2I0EDUNfBwKDjQAAAACAAAANgERAUsABQARAAA3JjQ/ARElETI2MzIXEQYjIiY/DQ3S/u8DBwIOCBAGAgepCB4IdP7rAwEOAQL+9AIBAAAAAAIAAAA1AQABSwALABEAADciJxE2MzIWMxEiBicHERcWFPQOCAgOAgkBAQk0wsIMOAIBDAIB/vIBcXQBFnQHIAABAAAABQDxAYgAGwAAEzMeARUUBgc1NjU0JicRFAYHBicuAT4BFxYXEYoBLTknIC8iGxURFBkgKwQxIRUSAYMLSC8mPhIJIjkfNQ/+2QwTBAYDBB8mFAQDCAE1AAQAAAARAZEBeQAPABgAIQAqAAATNzY3ESYvASMiJj0BNDYzJRYVFAcnNjQnBzcWFAcnNjU0JzcWFAcnNjU0R1gMEBELWC8KDg4KAVseHhcaGj0TExMTEEwPCAgPBwETWAwC/pgCC1kOCmwKDjpCRkdCDTyAPC0KLFosCSgoJwEGGCwYBRcSEQACAAAAFAD6AXwACAAYAAA3FhQHJzY1NC8BNzY3ESYvASMiJj0BNDYz8ggIDwcHl1MLERAMUzQKDg4K9hgsGAUXEhEXLFMLAv6YAgxSDwp2Cg8AAAACAAEAEAF4AXcAHQAnAAAlMQcXFgcGLwEHBicmPwEnJjY/AjYzMh8CFhcWBzcvAQ8BFwc3FwF1VRYCBwYIZ2YIBgcCFlUGBgd0MgQHCQMydAcDBHxHYSopYUcSVVbgUHIIBQUEODgEBQUIc1AFEAEPaQgIaQ8BCAlJQwxYWAxDYC4uAAABAAEAEAF5AXYAHwAAJTEHFxYHBi8BBwYmPwEnJjc2NzU/ATYzMh8CFRYXFgF1VBUCBwYIZmcIDAEWVQcEAwd0MgMJBwQzcwgDA+BQcwgFBAQ3NwQKB3NQBQkHAQEPaQcHaQ8BAgYIAAEAAAAFAXcBfAAPAAATITIWFREUBiMhIiY1ETQ2MwERFB8bE/7mFBsfAXwcE/7mExsbEwEaExwAAwAA//MBmgGNAAoAEgAaAAA3MxQGIyImNDYyFyYyFhQGIiY0FjI2NCYiBhTPeUcyMUdHYiSsqnh4qniRfFhYfFjAMUdGZEckeHiqeHiq61h8WVl8AAAAAAIAAAAMAWcBdAAHABIAABIyFhQGIiY0FjI2NSM3JiMiBhRplGpqlGl2elWSaCk/PVUBdGqUamqU3Fc9ZStVegABAAYAaAFlAQ0AFgAAJQcGJzUjFQYvASY/ATYXFTM1Nh8BFhQBXz8HC7YMBz8ODj8HDLYLBz8GrD8HAjY2Agc/Dg8/BwI8PAIHPwYRAAAAAAIAAAAIAcsBfAASACUAADcyNxcGIyImJyYnNzYfAQYHHgE3FhcHBi8BNjcuASMiByc2MzIW5jwrHDZNRmkJGRU3DQw4FB4JUe4YFTcMDTcSHwlRNT0qHTdNRmkwKx02XEUDCDcNDTcJAzNFqwMIOAwMOAgDNEQqHDdcAAACAAQAIQFiAXEAHgBGAAABHgEOAScmJxY3FhcWPgEmJyYnBgcOAS4BPgEXFhcWBzY1BgcGBwYnNjc2NyYnJicmIiciJisDDgEVFBYzMjY3NTY0MjUBJi4bNGYuIRESFwsQIUomFCEIDgIPGmZcGzRmLjAMFjwGLRcDBBUPBwUePwscCQ0CBgEBBAEKBQIkMjcmHS0LAQEBCBplWhsaEyEDBA4JExNCSRMEBCEZLRs0ZVobGhwxAz0PDwUoBQoCBBYJNQgfEAUEAQEBAjUlJjcfGgEBAgEAAAADAAYAAwGqAZUADQBNAFwAADcmJzY3PgEzMhcWBgcGFxYVFAcGIyInLgInIgcVHgEXHgEXFgcGBwYjIicuAScmNjc2OwEOAQcGBwYHBh8CMzIWMzI3Nj0BNjc2NxYHFhcWFRQHBiMnJjc2MzLQCxMZHSpJDQQBBzkwHbUHDQwRCAQKBAsDAgIDCwIEDQMMBw5PIyUiJjNKDQ0dJj9dBgMHARwWHhImCgMSAwMLBjceFBoZIBU53hEIAgwUGxwIGgwRAdkVCh4dKjgBB04wHQ0PEhANDAEEAgQBAgYEDgMFEwUSFCYVCQoOPSgpVR8zAgkBGxoCEiZFEwMBHhQeARYaIBkeKgoOBAoQDBQBMhoMAAIAAAAeAWYBhAAHABEAABIyFhQGIiY0BScHBi8BBxcWN2mUaWmUaQEFBXQCASUVLxAOAYRplGlplB0xiQICMhpACg4AAQAA//wBmgGDAAsAADcOAS8BNx8BFjcBFa4OJhBqJ1IBDA0BBw0OBQqQLXABDAwBM14AAAQAAP/ZAasBwAAiAC4ANgBCAAATMh0BMzU0MzIdATcyFh0BHgEVFAYjIicjIiY1ETQ2OwE1NBcHFzY/AR0BMzY3NRYiBhQWMjY0BxcWPwEWFwcGLwE2PgycDAsfCQ4zRVU8YSd8CQ0NCR1aLg0TBQYKAg+qaktLakunIgUGIgEHIg4OIQcBwAwpKQwMKQENCX8MTDU8VW4OCQEYCQ0oDIonEA8FBh1cBhZ6TEtqS0tqGiEGBiEBDiIODiIOAAAAAAQAAP/DAV4BvQAOAB4AKgA6AAAXNxcHNy4BNDcVBhUUFjMDHgEVFAc1NjU0JicjByc3BjIWHQEOASImLwE0FzU0JisBIgYdARQWOwEyNrgNKk0NSWY0KGRHCElmNChfQwoNKk02SDIBMkYyAQGcCgdnBwoKB2cHCgseKCgeAkFcIgYdJCo7Aa4CNiYnHAUYHiIyARkiIW4RDNoMEBAM2gzOqwcKCgerBwoKAAAEAAD/wwFeAb0ADgAeACoALgAAFzcXBzcuATQ3FQYVFBYzAx4BFRQHNTY1NCYnIwcnNwYyFh0BDgEiJi8BNBYyNCK4DSpNDUlmNChkRwhJZjQoX0MKDSpNNkgyATJGMgEBIiYmCx4oKB4CQVwiBh0kKjsBrgI2JiccBRgeIjIBGSIhbhEM2gwQEAzaDEYmAAAFAAAAFQGIAWEAFQAkADMAQwBTAAABMhYdAQYHNTQmKwEiBh0BJic1NDYzHwEWByMVBic1IyY/ATYyBzMHNxcHFwcnByc3JzcXNzEzBzcXBxcHJwcnNyc3FzcxMwc3FwcXBycHJzcnNxcBPw0SBw4KB+cHCQ4HEg2JQQcCIjMzIgIHQQYSoh8FLQQpGxsTEB0bKQUsgyAFLQQpGxwSERwaKQUshCAFLQMoGhsTEB0bKQUsAWESDQIDBAMHCgoHAwQDAg0SOkAHDUYGBkYNB0AGpC0NHgMkDyYlDiQDHg0tLQ0eAyQPJiUOJAMeDS0sDB4DJA4lJQ4kAx4NAAACAAAAFQEyAWQAFQAkAAABMhYdAQYHNTQmKwEiBh0BJic1NDYzHwEWByMVBic1IyY/ATYyARMNEgcOCgfmBwoOBxINiUEHAiIzMyICB0EGEgFkEw4DAwQDBwsLBwMEAwMOEz1ABw2+Bga+DQdABgAAAQAAADUBVQFLACwAAAEGBxQWFRQGIyInFjMyNyYnFjMyNy4BPQEWMyY1NDcWFyY1NDYzMhc2NwYHNgFVDhUBbVs5MgUMMSYzDwQJDQYYIBAQIAo5VwIpHSAUGBQHGBcBKhYPAQYCTHsgAR4CLgECBScZAQkWJRIRRQQKBh0pFgQNGA8DAAAAAAEAAAA8AQgBXwAaAAA2IiY1NDcXBhQWMjY0JiMGBycmPwEWFzUyFhS7bk0nFB48Vjw8KwIFJwgIJwUCN008TTc2JxQeVjw8VjwZDicJCCcNFghNbgAAAAABAAAAJgE+AXIAGAAANysBJiczMjY0JisBBgcnJj8BFhczMhYUBrWaAQ0NtSs7OytaAwk/Dg4/CQNaOFFRJg0WO1Y7JhU+Dg4+FSZQcFEAAAEAAP/jAdUBlgAhAAAlIzIWHQEUBiMhIiY9ATQ2OwE1NCYjIgYdASM1NDYyFh0BAcABCQ0NCf75CQwMCQwtHyAtK0ZkReIMCdQJDQ0J1AkMPSAtLh9GRjFGRjE9AAAAAAEAAAAmAWEBWgAYAAAlFhcHBi8BNjcuASMiBhQWMxUiJjQ2MzIWATMdETgNDDcSHgRAKy9BQi5AWlpAPVjKAwc4DAw4CAMqOkFcQipagFpUAAAAAAQAAP/qAMkBpgAYABwAKAA0AAA3Mh0BFCMOAgcGBxUGIic1JyYnIj0BNDM3FSM1FzU0IwciHQEUOwEyNzU0KwEiHQEUOwEywQgHBQ8VBhYJCgoIIAskCQnAyVMHFQcHFQdEBxQICBQH/AlgCAUQFgcYCE0CAk8jDCEIYAmqmZlPFgcBBxUHCBQIBxQIAAAAAAIAAAAVAPUBXQALABMAADcjFAcjJjU0Nxc3FiYiJjQ2MhYU9QES0BJFNTZFXjooKDopcjUoLDE0GDU1GCspOikpOgAAAgACADIAiAFPABoAMgAANwcGHwEVJyY0PwE2LwImPwEVBwYfAhYUDwEGHwEVJyY/ATYvAiY/ARUHBh8CFgd2JgICNUQBATcCAgI1AwNENQICAjUBAXYBATRDBAQ3AgICNQMDQzQBAQE2BASqKQECOBRJAQYCOwICATkFBUgTOAIBAjoBBgI7AQI4E0gFBDsCAgE5BQVIEzgCAQI6BQQAAAQAAAA2AVMBWAALABUAHwA8AAASMhYdARQGIiY9ATQHMzIWHQEUBisBNjQ/ATYXFQYvATc1FRQWMjY9ARcWFxUUBgcVMxUjNTM1LgE9AT4B9iQaGiQa3BgLEBELFzMHSQkNDghJkSQyIwYGAyAZGlgaGSADCQFYGxKDEhoaEoMSFRELiAsRVhQGRQkDtgIIRT4BThkkJBlNBAMCRRooBiIICCIGKBpFAgYAAAADAAD//AGAAYQAFQAbACoAAAEyFhURFAYrASImIy4BNTQ2NzU0NjMTNjQvARUXETQrASIdAR4BFRQHMzIBYg0REQ3qAQMBMEMzJxENPwUFW/4Hywg0SCR7BwGEEQ3+tA0RAQVHMSpEC3MNEf7sAhADN4MQAS4HB18BSTQyJgAAAAEAAAAfAc8BYQAXAAABNjMRIi8BFRQGKwEiJj0BNDY7ATIWHQEBtQsPDwt8LyCbIC8vIJsgLwFWC/6+C3szIC8uIZwgLy8gMwAAAAADAAAAawGQARwAEgAcACQAACUjIiY0NjIWFRQHMyY0NjIWFAYlIgYUFjI2NCYjMiIGFBYyNjQBN94lNDRKMxlgGjRKNDT+/RkiIjIiIxn4MiIiMiJrNEozMyUmGRpKMzNKNJQiMiIiMiIiMiIiMgAABAAAABUBvAFrAAMACwAbACAAADc1IRUmIgYUFjI2NDcyFhURFAYjISImNRE0NjMTMyEDITMBVuUmHBwmHOsHCgoH/mYHCgoHEAEBeQH+iEnu7sAbKBsbKH0NB/7SBw0NBwEuBw3+zAESAAAAAQAAACkANABeAAcAADYyFhQGIiY0DxYPDxYPXhAWDw8WAAAAAgAAACkAtACuAAkAEQAANzIXByYjIgcnNhYyFhQGIiY0WjweHhIqLBAeHzAWDw8WD641HikpHjVQEBYPDxYAAAMAAAApASYA/QAJABMAGwAANzIXByYjIgcnNhcyFwcmIyIHJzYWMhYUBiImNJJdNx0qTUksHTZcPB4eEiosEB4fMBYPDxYP/UwdPz4dS081HikpHjVQEBYPDxYABAAAACkBlAFNAAkAEwAdACUAADcyFwcmIyIHJzYXMhcHJiMiByc2NzIXByYjIgcnNhYyFhQGIiY0yl03HSpNSSwdNlw8Hh4SKiwQHh87elAdQmtpRB1PcBYPDxYP/UwdPz4dS081HikpHjWfYR1WVh1h7xAWDw8WAAAAAAUAAP/9AZkBTAAdACEAKgAzADsAACUeARUUBiImNTQ3JiMiByc2MzIXNjcmIyIHJzYyFwc1IxU+ATU0IyIVFDM3JiIHJzYzMhcGMhYUBiImNAFMICwwQi8HFB0tER0ePSsgEBcsRk0rHDi4OA4YFAoSERE2Q9pDHVF8fU/XFg8PFhCeAi4gITAwIRMOFyoeNCAMAzg/HUpKrFlZXgoIERESalVVHGFhjQ8WEBAWAAAAAAAOAK4AAQAAAAAAAABEAIoAAQAAAAAAAQAKAOUAAQAAAAAAAgAFAPwAAQAAAAAAAwAmAVAAAQAAAAAABAAKAY0AAQAAAAAABQAQAboAAQAAAAAABgAKAeEAAwABBAkAAACIAAAAAwABBAkAAQAUAM8AAwABBAkAAgAKAPAAAwABBAkAAwBMAQIAAwABBAkABAAUAXcAAwABBAkABQAgAZgAAwABBAkABgAUAcsAQwByAGUAYQB0AGUAZAAgAGIAeQAgAEcAdQBpAGwAbABhAHUAbQBlACwALAAsACAAdwBpAHQAaAAgAEYAbwBuAHQARgBvAHIAZwBlACAAMgAuADAAIAAoAGgAdAB0AHAAOgAvAC8AZgBvAG4AdABmAG8AcgBnAGUALgBzAGYALgBuAGUAdAApAABDcmVhdGVkIGJ5IEd1aWxsYXVtZSwsLCB3aXRoIEZvbnRGb3JnZSAyLjAgKGh0dHA6Ly9mb250Zm9yZ2Uuc2YubmV0KQAAZwBhAGkAYQAtAGkAYwBvAG4AcwAAZ2FpYS1pY29ucwAAaQBjAG8AbgBzAABpY29ucwAARgBvAG4AdABGAG8AcgBnAGUAIAAyAC4AMAAgADoAIABnAGEAaQBhAC0AaQBjAG8AbgBzACAAOgAgADIANQAtADIALQAyADAAMQA1AABGb250Rm9yZ2UgMi4wIDogZ2FpYS1pY29ucyA6IDI1LTItMjAxNQAAZwBhAGkAYQAtAGkAYwBvAG4AcwAAZ2FpYS1pY29ucwAAVgBlAHIAcwBpAG8AbgAgADAAMAAxAC4AMAAwADAAIAAAVmVyc2lvbiAwMDEuMDAwIAAAZwBhAGkAYQAtAGkAYwBvAG4AcwAAZ2FpYS1pY29ucwAAAAACAAAAAAAA/8AAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAPEAAAABAAIBAgEDAQQBBQEGAQcBCAEJAQoBCwEMAEQARQBGAEcASABJAEoASwBMAE4ATwBQAFEAUgBTAFUAVgBXAFgAWQBaAFsAXABdAQ0BDgEPARABEQESARMBFAEVARYBFwEYARkBGgEbARwBHQEeAR8BIAEhASIBIwEkASUBJgEnASgBKQEqASsBLAEtAS4BLwEwATEBMgEzATQBNQE2ATcBOAE5AToBOwE8AT0BPgE/AUABQQFCAUMBRAFFAUYBRwFIAUkBSgFLAUwBTQFOAU8BUAFRAVIBUwFUAVUBVgFXAVgBWQFaAVsBXAFdAV4BXwFgAWEBYgFjAWQBZQFmAWcBaAFpAWoBawFsAW0BbgFvAXABcQFyAXMBdAF1AXYBdwF4AXkBegF7AXwBfQF+AX8BgAGBAYIBgwGEAYUA7wGGAYcBiAGJAYoBiwBSAYwBjQGOAY8BkAGRAZIBkwGUAZUBlgGXAZgBmQGaAZsBnAGdAZ4BnwGgAaEBogGjAaQBpQGmAacBqAGpAaoBqwGsAa0BrgGvAbABsQGyAbMBtAG1AbYBtwG4AbkBugG7AbwBvQG+Ab8BwAHBAcIBwwHEAcUBxgHHAcgByQHKAcsBzAHNAc4BzwHQAdEB0gHTAdQB1QEtATABMQEyATMBNAE1ATYBNwE4ATkCMmcCM2cCNGcNYWNjZXNzaWJpbGl0eQthZGQtY29udGFjdANhZGQGYWRkb25zCGFpcnBsYW5lC2FsYXJtLWNsb2NrCmFsYXJtLXN0b3AFYWxhcm0FYWxidW0HYWxsLWRheQphcnJvdy1iYWNrDWFycm93LWZvcndhcmQGYXJ0aXN0CmF0dGFjaG1lbnQKYmFjay1saWdodARiYWNrCWJhdHRlcnktMAliYXR0ZXJ5LTEKYmF0dGVyeS0xMAliYXR0ZXJ5LTIJYmF0dGVyeS0zCWJhdHRlcnktNAliYXR0ZXJ5LTUJYmF0dGVyeS02CWJhdHRlcnktNwliYXR0ZXJ5LTgJYmF0dGVyeS05EGJhdHRlcnktY2hhcmdpbmcPYmF0dGVyeS11bmtub3duDmJsdWV0b290aC1hMmRwEGJsdWV0b290aC1jaXJjbGUZYmx1ZXRvb3RoLXRyYW5zZmVyLWNpcmNsZRJibHVldG9vdGgtdHJhbnNmZXIJYmx1ZXRvb3RoCmJyaWdodG5lc3MIYnJvd3NpbmcDYnVnCGNhbGVuZGFyDmNhbGwtYmx1ZXRvb3RoDmNhbGwtZW1lcmdlbmN5D2NhbGwtZm9yd2FyZGluZwxjYWxsLWhhbmctdXAJY2FsbC1ob2xkDWNhbGwtaW5jb21pbmcKY2FsbC1tZXJnZQtjYWxsLW1pc3NlZA1jYWxsLW91dGdvaW5nDWNhbGwtcmV2ZXJzZWQMY2FsbC1yaW5naW5nBGNhbGwSY2FsbGJhY2stZW1lcmdlbmN5BmNhbWVyYRBjaGFuZ2Utd2FsbHBhcGVyC2NsZWFyLWlucHV0BWNsb3NlB2NvbXBvc2UMY29udGFjdC1maW5kCGNvbnRhY3RzB2NyYXNoZWQEY3JvcARkYXRhBmRlbGV0ZQlkZXZlbG9wZXILZGV2aWNlLWluZm8HZGlhbHBhZBBkaXNtaXNzLWtleWJvYXJkDGRvLW5vdC10cmFjaw9kb3dubG9hZC1jaXJjbGUIZG93bmxvYWQEZWRnZQxlZGl0LWNvbnRhY3QKZWRpdC1pbWFnZQRlZGl0DWVtYWlsLWZvcndhcmQPZW1haWwtbWFyay1yZWFkEWVtYWlsLW1hcmstdW5yZWFkCmVtYWlsLW1vdmULZW1haWwtcmVwbHkFZW1haWwLZXhjbGFtYXRpb24GZXhwYW5kCGZhY2Vib29rCGZlZWRiYWNrBGZpbmQHZmlyZWZveARmbGFnCmZsYXNoLWF1dG8JZmxhc2gtb2ZmCGZsYXNoLW9uDGZvY3VzLWxvY2tlZA1mb2N1cy1sb2NraW5nDWZvcndhcmQtbGlnaHQHZm9yd2FyZAdnZXN0dXJlBWdtYWlsDWdyaWQtY2lyY3VsYXIEZ3JpZANnc20JaGRyLWJveGVkA2hkcgpoZWFkcGhvbmVzBGhlbHAKaG9tZXNjcmVlbgloc3BhLXBsdXMEaHNwYRhpbXBvcnQtbWVtb3J5Y2FyZC1jaXJjbGUMaW5jb21pbmctc21zBGluZm8Pa2V5Ym9hcmQtY2lyY2xlCGtleWJvYXJkCWxhbmd1YWdlcwRsaW5rCGxvY2F0aW9uBGxvY2sNbWVkaWEtc3RvcmFnZQRtZW51CG1lc3NhZ2VzA21pYwRtb29uBG1vcmUEbXV0ZQNuZmMGbm8tc2ltDW5vdGlmaWNhdGlvbnMMb3V0Z29pbmctc21zB291dGxvb2sFcGF1c2UMcGljdHVyZS1zaXplC3BsYXktY2lyY2xlBHBsYXkIcGxheWxpc3QHcHJpdmFjeQxyZWNlbnQtY2FsbHMGcmVsb2FkC3JlcGVhdC1vbmNlBnJlcGVhdAlyZXBseS1hbGwGcm9ja2V0BnJvdGF0ZQVzY2VuZQdzZC1jYXJkBnNlYXJjaAlzZWVrLWJhY2sMc2Vlay1mb3J3YXJkBnNlbGVjdApzZWxmLXRpbWVyBHNlbmQIc2V0dGluZ3MFc2hhcmUHc2h1ZmZsZQhzaWduYWwtMAhzaWduYWwtMQhzaWduYWwtMghzaWduYWwtMwhzaWduYWwtNAhzaWduYWwtNQ5zaWduYWwtcm9hbWluZwtzaW0tdG9vbGtpdANzaW0Jc2tpcC1iYWNrDHNraXAtZm9yd2FyZAVzb25ncwlzb3VuZC1tYXgJc291bmQtbWluCnN0YXItZW1wdHkJc3Rhci1mdWxsBHN0b3AOc3RvcmFnZS1jaXJjbGUHc3RvcmFnZQZzd2l0Y2gEc3luYwl0ZXRoZXJpbmcGdGhlbWVzC3RpY2stY2lyY2xlBHRpY2sEdGltZRN0b2dnbGUtY2FtZXJhLWZyb250EnRvZ2dsZS1jYW1lcmEtcmVhcg90b3B1cC13aXRoLWNvZGUFdG9wdXAHdHdpdHRlcg11bmRvLWNpcmN1bGFyBHVuZG8GdW5sb2NrDnVwZGF0ZS1iYWxhbmNlA3VzYgR1c2VyB3ZpYnJhdGUJdmlkZW8tbWljCnZpZGVvLXNpemUFdmlkZW8Jdm9pY2VtYWlsCXdhbGxwYXBlcgZ3aWZpLTEGd2lmaS0yBndpZmktMwZ3aWZpLTQQd2lmaS1wZXJtaXNzaW9ucwAAAAAB//8AAgABAAAADgAAAB4AAAAAAAIAAgADACUAAQAmAPAAAgAEAAAAAgAAAAAAAQAAAAoAHgAsAAFsYXRuAAgABAAAAAD//wABAAAAAWxpZ2EACAAAAAEAAAABAAQABAAAAAEACAABEV4AGAA2AEAASgBUAXoDyAYKBuAH/gj+CVQJ1AoyCmoKrgsqC2QLmgwSDKAPHBAKEHwQ4gABAAQAJgACABQAAQAEACcAAgAUAAEABAAoAAIAFAAOAB4AOgBWAG4AhgCcALIAyADaAOoA+AEGARIBHgA0AA0AHQAdABsAIgADABMAGwAdACIADgAdABEAKQANABAAEAASAB4AHgAWAA8AFgAYABYAHwAkACoACwARABEAAwAQABsAGgAfAA4AEAAfAC4ACwAYAA4AHQAZAAMAEAAYABsAEAAXADYACgAfAB8ADgAQABUAGQASABoAHwAzAAoAHQAdABsAIgADAA8ADgAQABcALwAKABgADgAdABkAAwAeAB8AGwAcAC0ACAAWAB0AHAAYAA4AGgASADIABwAYABgAAwARAA4AJAA1AAYAHQAfABYAHgAfACwABgARABEAGwAaAB4AMQAFABgADwAgABkAMAAFABgADgAdABkAKwADABEAEQAXADAAZACKAKwAzgDuAQwBIgE4AU4BYgF2AYoBngGyAcYB2gHuAgICFgIqAjwCRgBIABkAGAAgABIAHwAbABsAHwAVAAMAHwAdAA4AGgAeABMAEgAdAAMAEAAWAB0AEAAYABIASQASABgAIAASAB8AGwAbAB8AFQADAB8AHQAOABoAHgATABIAHQBHABAAGAAgABIAHwAbABsAHwAVAAMAEAAWAB0AEAAYABIARAAQAA4AHwAfABIAHQAkAAMAEAAVAA4AHQAUABYAGgAUAEUADwAOAB8AHwASAB0AJAADACAAGgAXABoAGwAiABoARgAOABgAIAASAB8AGwAbAB8AFQADAA4ABgARABwASwAKAB0AFgAUABUAHwAaABIAHgAeADsACgAOAB8AHwASAB0AJAADAAUABAA3AAoADgAQABcAAwAYABYAFAAVAB8AQgAJAA4AHwAfABIAHQAkAAMADABBAAkADgAfAB8AEgAdACQAAwALAEAACQAOAB8AHwASAB0AJAADAAoAPwAJAA4AHwAfABIAHQAkAAMACQA+AAkADgAfAB8AEgAdACQAAwAIAD0ACQAOAB8AHwASAB0AJAADAAcAPAAJAA4AHwAfABIAHQAkAAMABgBKAAkAGAAgABIAHwAbABsAHwAVADoACQAOAB8AHwASAB0AJAADAAUAOQAJAA4AHwAfABIAHQAkAAMABABDAAkADgAfAB8AEgAdACQAAwANAEwACAAdABsAIgAeABYAGgAUADgABAAOABAAFwBNAAMAIAAUABcAMABWAHgAmAC2ANQA8AEMASgBQgFcAXYBjgGmAbwB0AHiAfQCBAIUAiICLgI4AFsAEgAOABgAGAAPAA4AEAAXAAMAEgAZABIAHQAUABIAGgAQACQAXQAQABUADgAaABQAEgADACIADgAYABgAHAAOABwAEgAdAFEADwAOABgAGAADABMAGwAdACIADgAdABEAFgAaABQAUAAOAA4AGAAYAAMAEgAZABIAHQAUABIAGgAQACQATwAOAA4AGAAYAAMADwAYACAAEgAfABsAGwAfABUAWAANAA4AGAAYAAMAHQASACEAEgAdAB4AEgARAFcADQAOABgAGAADABsAIAAfABQAGwAWABoAFABUAA0ADgAYABgAAwAWABoAEAAbABkAFgAaABQAWQAMAA4AGAAYAAMAHQAWABoAFAAWABoAFABhAAwAGwAaAB8ADgAQAB8AAwATABYAGgARAFIADAAOABgAGAADABUADgAaABQAAwAgABwAVgALAA4AGAAYAAMAGQAWAB4AHgASABEAXgALABgAEgAOAB0AAwAWABoAHAAgAB8AVQAKAA4AGAAYAAMAGQASAB0AFAASAFMACQAOABgAGAADABUAGwAYABEAYgAIABsAGgAfAA4AEAAfAB4ATgAIAA4AGAASABoAEQAOAB0AYAAHABsAGQAcABsAHgASAGMABwAdAA4AHgAVABIAEQBcAAYADgAZABIAHQAOAF8ABQAYABsAHgASAGQABAAdABsAHABaAAQADgAYABgACQAUADYAVgBwAIgAnACuAL4AzABqABAAFgAeABkAFgAeAB4AAwAXABIAJAAPABsADgAdABEAbAAPABsAIgAaABgAGwAOABEAAwAQABYAHQAQABgAEgBrAAwAGwADABoAGwAfAAMAHwAdAA4AEAAXAGgACwASACEAFgAQABIAAwAWABoAEwAbAGcACQASACEAEgAYABsAHAASAB0AbQAIABsAIgAaABgAGwAOABEAaQAHABYADgAYABwADgARAGYABgASABgAEgAfABIAZQAEAA4AHwAOAAwAGgA+AF4AegCUAKwAxADaAPAA/gEKARQAdAARABkADgAWABgAAwAZAA4AHQAXAAMAIAAaAB0AEgAOABEAcwAPABkADgAWABgAAwAZAA4AHQAXAAMAHQASAA4AEQByAA0AGQAOABYAGAADABMAGwAdACIADgAdABEAbwAMABEAFgAfAAMAEAAbABoAHwAOABAAHwB4AAsAIwAQABgADgAZAA4AHwAWABsAGgB2AAsAGQAOABYAGAADAB0AEgAcABgAJABwAAoAEQAWAB8AAwAWABkADgAUABIAdQAKABkADgAWABgAAwAZABsAIQASAHkABgAjABwADgAaABEAdwAFABkADgAWABgAcQAEABEAFgAfAG4ABAARABQAEgAMABoANgBSAGwAggCWAKgAugDMANwA7AD2AIQADQAbAB0AIgAOAB0AEQADABgAFgAUABUAHwCDAA0AGwAQACAAHgADABgAGwAQABcAFgAaABQAggAMABsAEAAgAB4AAwAYABsAEAAXABIAEQB/AAoAGAAOAB4AFQADAA4AIAAfABsAgAAJABgADgAeABUAAwAbABMAEwCBAAgAGAAOAB4AFQADABsAGgB7AAgAEgASABEADwAOABAAFwB6AAgADgAQABIADwAbABsAFwCFAAcAGwAdACIADgAdABEAfQAHABYAHQASABMAGwAjAH4ABAAYAA4AFAB8AAQAFgAaABEABQAMACgAOABEAE4AiAANAB0AFgARAAMAEAAWAB0AEAAgABgADgAdAIYABwASAB4AHwAgAB0AEgCHAAUAGQAOABYAGACJAAQAHQAWABEAigADAB4AGQAHABAAJgA8AFAAZABuAHgAjwAKABsAGQASAB4AEAAdABIAEgAaAI0ACgASAA4AEQAcABUAGwAaABIAHgCQAAkAHgAcAA4AAwAcABgAIAAeAIsACQARAB0AAwAPABsAIwASABEAkQAEAB4AHAAOAI4ABAASABgAHACMAAMAEQAdAAMACAA6AFQAkgAYABkAHAAbAB0AHwADABkAEgAZABsAHQAkABAADgAdABEAAwAQABYAHQAQABgAEgCTAAwAGgAQABsAGQAWABoAFAADAB4AGQAeAJQABAAaABMAGwACAAYAJgCVAA8AEgAkAA8AGwAOAB0AEQADABAAFgAdABAAGAASAJYACAASACQADwAbAA4AHQARAAQACgAeADAAOgCXAAkADgAaABQAIAAOABQAEgAeAJkACAAbABAADgAfABYAGwAaAJgABAAWABoAFwCaAAQAGwAQABcACAASAC4AQABMAFYAYABqAHQAmwANABIAEQAWAA4AAwAeAB8AGwAdAA4AFAASAJ0ACAASAB4AHgAOABQAEgAeAJ8ABQAWABoAIAAeAKIABAAgAB8AEgChAAQAGwAdABIAnAAEABIAGgAgAKAABAAbABsAGgCeAAMAFgAQAAMACAAkADIApQANABsAHwAWABMAFgAQAA4AHwAWABsAGgAeAKQABgAbAAMAHgAWABkAowADABMAEAADAAgAIgAyAKcADAAgAB8AFAAbABYAGgAUAAMAHgAZAB4AqAAHACAAHwAYABsAGwAXAKYAAQAGAA4AKABAAFIAYgBuAKoADAAWABAAHwAgAB0AEgADAB4AFgAlABIAqwALABgADgAkAAMAEAAWAB0AEAAYABIArQAIABgADgAkABgAFgAeAB8ArgAHAB0AFgAhAA4AEAAkAKkABQAOACAAHgASAKwABAAYAA4AJAAHABAAKgBCAFYAZAByAIAArwAMABIAEAASABoAHwADABAADgAYABgAHgCxAAsAEgAcABIADgAfAAMAGwAaABAAEgCzAAkAEgAcABgAJAADAA4AGAAYALIABgASABwAEgAOAB8AtAAGABsAEAAXABIAHwCwAAYAEgAYABsADgARALUABgAbAB8ADgAfABIAIABCAGAAfgCYALIAygDgAPYBCgEeATIBRgFaAWwBfgGQAaIBtAHGAdgB6AH4AggCFgIkAjICPgJKAlYCYAJqAnQA0gAOAB8AGwAdAA4AFAASAAMAEAAWAB0AEAAYABIAxwAOABYAFAAaAA4AGAADAB0AGwAOABkAFgAaABQAywAMABcAFgAcAAMAEwAbAB0AIgAOAB0AEQC6AAwAEgASABcAAwATABsAHQAiAA4AHQARAMgACwAWABkAAwAfABsAGwAYABcAFgAfALwACgASABgAEwADAB8AFgAZABIAHQDPAAoAHwAOAB0AAwASABkAHAAfACQAzgAJABsAIAAaABEAAwAZABYAGgDNAAkAGwAgABoAEQADABkADgAjANAACQAfAA4AHQADABMAIAAYABgAygAJABcAFgAcAAMADwAOABAAFwC5AAkAEgASABcAAwAPAA4AEAAXAMMACAAWABQAGgAOABgAAwAGAMIACAAWABQAGgAOABgAAwAFAMEACAAWABQAGgAOABgAAwAEAL4ACAASAB8AHwAWABoAFAAeAMYACAAWABQAGgAOABgAAwAJAMUACAAWABQAGgAOABgAAwAIAMQACAAWABQAGgAOABgAAwAHANMABwAfABsAHQAOABQAEgDAAAcAFQAgABMAEwAYABIAtwAHABEAAwAQAA4AHQARALsABgASABgAEgAQAB8AuAAGABIADgAdABAAFQDUAAYAIgAWAB8AEAAVAL8ABQAVAA4AHQASAMwABQAbABoAFAAeALYABQAQABIAGgASANEABAAfABsAHAC9AAQAEgAaABEA1QAEACQAGgAQAMkAAwAWABkACgAWAD4AZACEAJwAsADAAM4A2gDkANsAEwAbABQAFAAYABIAAwAQAA4AGQASAB0ADgADABMAHQAbABoAHwDcABIAGwAUABQAGAASAAMAEAAOABkAEgAdAA4AAwAdABIADgAdAN0ADwAbABwAIAAcAAMAIgAWAB8AFQADABAAGwARABIA2AALABYAEAAXAAMAEAAWAB0AEAAYABIA1gAJABIAHwAVABIAHQAWABoAFADfAAcAIgAWAB8AHwASAB0A1wAGABUAEgAZABIAHgDeAAUAGwAcACAAHADZAAQAFgAQABcA2gAEABYAGQASAAYADgAsAEgAVgBgAGoA4wAOABwAEQAOAB8AEgADAA8ADgAYAA4AGgAQABIA4AANABoAEQAbAAMAEAAWAB0AEAAgABgADgAdAOIABgAaABgAGwAQABcA4QAEABoAEQAbAOUABAAeABIAHQDkAAMAHgAPAAUADAAiADYASgBaAOgACgAWABEAEgAbAAMAHgAWACUAEgDqAAkAGwAWABAAEgAZAA4AFgAYAOcACQAWABEAEgAbAAMAGQAWABAA5gAHABYADwAdAA4AHwASAOkABQAWABEAEgAbAAYADgAwAEQAUgBgAG4A8AAQABYAEwAWAAMAHAASAB0AGQAWAB4AHgAWABsAGgAeAOsACQAOABgAGAAcAA4AHAASAB0A7gAGABYAEwAWAAMABwDtAAYAFgATABYAAwAGAOwABgAWABMAFgADAAUA7wAGABYAEwAWAAMACAACAAIABgAIAAAADgAiAAMAAAABAAAACgAeADQAAWxhdG4ACAAEAAAAAP//AAEAAAABc2l6ZQAIAAQAAACgAAAAAAAAAAAAAAAAAAAAAQAAAADMPaLPAAAAANETpOQAAAAA0ROk5A==\") format(\"truetype\");\n  font-weight: 500;\n  font-style: normal;\n}\n[data-icon]:before {\n  font-family: \"customizer-gaia-icons\";\n  content: attr(data-icon);\n  display: inline-block;\n  font-weight: 500;\n  font-style: normal;\n  text-decoration: inherit;\n  text-transform: none;\n  text-rendering: optimizeLegibility;\n  font-size: 30px;\n}\n@font-face {\n  font-family: \"customizer-icons\";\n  src: url(\"data:application/x-font-ttf;charset=utf-8;base64,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WbEuARQrLbBFLLA4Ky6xLgEUKy2wRiywOSshIyAgPLAEI0IjOLEuARQrsARDLrAuKy2wRyywABUgR7AAI0KyAAEBFRQTLrA0Ki2wSCywABUgR7AAI0KyAAEBFRQTLrA0Ki2wSSyxAAEUE7A1Ki2wSiywNyotsEsssAAWRSMgLiBGiiNhOLEuARQrLbBMLLAII0KwSystsE0ssgAARCstsE4ssgABRCstsE8ssgEARCstsFAssgEBRCstsFEssgAARSstsFIssgABRSstsFMssgEARSstsFQssgEBRSstsFUssgAAQSstsFYssgABQSstsFcssgEAQSstsFgssgEBQSstsFkssgAAQystsFossgABQystsFsssgEAQystsFwssgEBQystsF0ssgAARistsF4ssgABRistsF8ssgEARistsGAssgEBRistsGEssgAAQistsGIssgABQistsGMssgEAQistsGQssgEBQistsGUssDorLrEuARQrLbBmLLA6K7A+Ky2wZyywOiuwPystsGgssAAWsDorsEArLbBpLLA7Ky6xLgEUKy2waiywOyuwPistsGsssDsrsD8rLbBsLLA7K7BAKy2wbSywPCsusS4BFCstsG4ssDwrsD4rLbBvLLA8K7A/Ky2wcCywPCuwQCstsHEssD0rLrEuARQrLbByLLA9K7A+Ky2wcyywPSuwPystsHQssD0rsEArLbB1LLMJBAIDRVghGyMhWUIrsAhlsAMkUHixBQEVRVgwWS0AAEu4AMhSWLEBAY5ZsAG5CAAIAGNwsQAGQrIUAQAqsQAGQrMLBgEIKrEABkKzEwQBCCqxAAdCugMAAAEACSqxAAhCugBAAAEACSqxAwBEsSQBiFFYsECIWLEDZESxJgGIUVi6CIAAAQRAiGNUWLEDAERZWVlZsw0GAQwquAH/hbAEjbECAESxBWREAAA=\") format(\"truetype\");\n  font-weight: 500;\n  font-style: normal;\n}\n[data-customizer-icon]:before {\n  font-family: \"customizer-icons\";\n  content: attr(data-customizer-icon);\n  display: inline-block;\n  font-weight: 500;\n  font-style: normal;\n  text-decoration: inherit;\n  text-transform: none;\n  text-rendering: optimizeLegibility;\n  font-size: 30px;\n}\ncustomizer-gaia-dialog {\n  z-index: 10000002 !important;\n}\ncustomizer-gaia-modal {\n  z-index: 10000001 !important;\n  background: white;\n}";
    document.head.appendChild(style);
  }

  function boot(manifestURL) {
    document.documentElement.dataset.customizerInit = true;

    if (manifestURL === SYSTEM_APP) {
      return new TouchForwarderController();
    }

    styleHack();

    return new MainController({
      manifestURL: manifestURL
    });
  }
}}).call(window);
console.log('Injected addon-concat.js');