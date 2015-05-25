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
    'use strict';

    // Utilities
    // ---------

    // setImmediate shim used to deliver changes records asynchronously
    // use setImmediate if available
    var setImmediate = global.setImmediate || global.msSetImmediate,
        clearImmediate = global.clearImmediate || global.msClearImmediate;
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
    if (typeof WeakMap !== 'undefined')  {
        //use weakmap if defined
        PrivateMap = WeakMap;
    } else {
        //else use ses like shim of WeakMap
        /* jshint -W016 */
        var HIDDEN_PREFIX = '__weakmap:' + (Math.random() * 1e9 >>> 0),
            counter = new Date().getTime() % 1e9,
            mascot = {};

        PrivateMap = function () {
            this.name = HIDDEN_PREFIX + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
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
                    value : typeof value === 'undefined' ? mascot : value,
                    enumerable: false,
                    writable : true,
                    configurable: true
                });
            },

            'delete': function (key) {
                return delete key[this.name];
            }
        };


        var getOwnPropertyName = Object.getOwnPropertyNames;
        Object.defineProperty(Object, 'getOwnPropertyNames', {
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

    Object.defineProperty(NotifierPrototype, 'notify', {
        value: function notify(changeRecord) {
            var notifier = this;
            if (Object(notifier) !== notifier) {
                throw new TypeError('this must be an Object, given ' + notifier);
            }
            if (!notifier.__target) {
                return;
            }
            if (Object(changeRecord) !== changeRecord) {
                throw new TypeError('changeRecord must be an Object, given ' + changeRecord);
            }


            var type = changeRecord.type;
            if (typeof type !== 'string') {
                throw new TypeError('changeRecord.type must be a string, given ' + type);
            }

            var changeObservers = changeObserversMap.get(notifier);
            if (!changeObservers || changeObservers.length === 0) {
                return;
            }
            var target = notifier.__target,
                newRecord = Object.create(Object.prototype, {
                    'object': {
                        value: target,
                        writable : false,
                        enumerable : true,
                        configurable: false
                    }
                });
            for (var prop in changeRecord) {
                if (prop !== 'object') {
                    var value = changeRecord[prop];
                    Object.defineProperty(newRecord, prop, {
                        value: value,
                        writable : false,
                        enumerable : true,
                        configurable: false
                    });
                }
            }
            Object.preventExtensions(newRecord);
            _enqueueChangeRecord(notifier.__target, newRecord);
        },
        writable: true,
        enumerable: false,
        configurable : true
    });

    Object.defineProperty(NotifierPrototype, 'performChange', {
        value: function performChange(changeType, changeFn) {
            var notifier = this;
            if (Object(notifier) !== notifier) {
                throw new TypeError('this must be an Object, given ' + notifier);
            }
            if (!notifier.__target) {
                return;
            }
            if (typeof changeType !== 'string') {
                throw new TypeError('changeType must be a string given ' + notifier);
            }
            if (typeof changeFn !== 'function') {
                throw new TypeError('changeFn must be a function, given ' + changeFn);
            }

            _beginChange(notifier.__target, changeType);
            var error, changeRecord;
            try {
                changeRecord = changeFn.call(undefined);
            } catch (e) {
                error = e;
            }
            _endChange(notifier.__target, changeType);
            if (typeof error !== 'undefined') {
                throw error;
            }

            var changeObservers = changeObserversMap.get(notifier);
            if (changeObservers.length === 0) {
                return;
            }

            var target = notifier.__target,
                newRecord = Object.create(Object.prototype, {
                    'object': {
                        value: target,
                        writable : false,
                        enumerable : true,
                        configurable: false
                    },
                    'type': {
                        value: changeType,
                        writable : false,
                        enumerable : true,
                        configurable: false
                    }
                });
            if (typeof changeRecord !== 'undefined') {
                for (var prop in changeRecord) {
                    if (prop !== 'object' && prop !== 'type') {
                        var value = changeRecord[prop];
                        Object.defineProperty(newRecord, prop, {
                            value: value,
                            writable : false,
                            enumerable : true,
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
        configurable : true
    });

    // Implementation of the internal algorithm 'BeginChange'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#beginchange)
    function _beginChange(object, changeType) {
        var notifier = Object.getNotifier(object),
            activeChanges = activeChangesMap.get(notifier),
            changeCount = activeChangesMap.get(notifier)[changeType];
        activeChanges[changeType] = typeof changeCount === 'undefined' ? 1 : changeCount + 1;
    }

    // Implementation of the internal algorithm 'EndChange'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#endchange)
    function _endChange(object, changeType) {
        var notifier = Object.getNotifier(object),
            activeChanges = activeChangesMap.get(notifier),
            changeCount = activeChangesMap.get(notifier)[changeType];
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
    var notifierMap = new PrivateMap(),
        changeObserversMap = new PrivateMap(),
        activeChangesMap = new PrivateMap();

    // Implementation of the internal algorithm 'GetNotifier'
    // described in the proposal.
    // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#getnotifier)
    function _getNotifier(target) {
        if (!notifierMap.has(target)) {
            var notifier = Object.create(NotifierPrototype);
            // we does not really need to hide this, since anyway the host object is accessible from outside of the
            // implementation. we just make it unwritable
            Object.defineProperty(notifier, '__target', { value : target });
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
        var notifier = Object.getNotifier(object),
            changeType = changeRecord.type,
            activeChanges = activeChangesMap.get(notifier),
            changeObservers = changeObserversMap.get(notifier);

        for (var i = 0, l = changeObservers.length; i < l; i++) {
            var observerRecord = changeObservers[i],
                acceptList = observerRecord.accept;
            if (_shouldDeliverToObserver(activeChanges, acceptList, changeType)) {
                var observer = observerRecord.callback,
                    pendingChangeRecords = [];
                if (!pendingChangesMap.has(observer))  {
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
            attachedNotifierCountMap.delete(observer);
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
        pendingChangesMap.delete(observer);
        if (!pendingChangeRecords || pendingChangeRecords.length === 0) {
            return false;
        }
        try {
            observer.call(undefined, pendingChangeRecords);
        }
        catch (e) { }

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
        'observe': {
            value: function observe(target, callback, accept) {
                if (Object(target) !== target) {
                    throw new TypeError('target must be an Object, given ' + target);
                }
                if (typeof callback !== 'function') {
                    throw new TypeError('observer must be a function, given ' + callback);
                }
                if (Object.isFrozen(callback)) {
                    throw new TypeError('observer cannot be frozen');
                }

                var acceptList;
                if (typeof accept === 'undefined') {
                    acceptList = ['add', 'update', 'delete', 'reconfigure', 'setPrototype', 'preventExtensions'];
                } else {
                    if (Object(accept) !== accept) {
                        throw new TypeError('accept must be an object, given ' + accept);
                    }
                    var len = accept.length;
                    if (typeof len !== 'number' || len >>> 0 !== len || len < 1) {
                        throw new TypeError('the \'length\' property of accept must be a positive integer, given ' + len);
                    }

                    var nextIndex = 0;
                    acceptList = [];
                    while (nextIndex < len) {
                        var next = accept[nextIndex];
                        if (typeof next !== 'string') {
                            throw new TypeError('accept must contains only string, given' + next);
                        }
                        acceptList.push(next);
                        nextIndex++;
                    }
                }


                var notifier = _getNotifier(target),
                    changeObservers = changeObserversMap.get(notifier);

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

                if (observerCallbacks.indexOf(callback) === -1)  {
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
        'unobserve': {
            value: function unobserve(target, callback) {
                if (Object(target) !== target) {
                    throw new TypeError('target must be an Object, given ' + target);
                }
                if (typeof callback !== 'function') {
                    throw new TypeError('observer must be a function, given ' + callback);
                }
                var notifier = _getNotifier(target),
                    changeObservers = changeObserversMap.get(notifier);
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
        'deliverChangeRecords': {
            value: function deliverChangeRecords(observer) {
                if (typeof observer !== 'function') {
                    throw new TypeError('callback must be a function, given ' + observer);
                }
                while (_deliverChangeRecords(observer)) {}
            },
            writable: true,
            configurable: true
        },

        // Implementation of the public api 'Object.getNotifier'
        // described in the proposal.
        // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.getnotifier)
        'getNotifier': {
            value: function getNotifier(target) {
                if (Object(target) !== target) {
                    throw new TypeError('target must be an Object, given ' + target);
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

})(typeof global !== 'undefined' ? global : this);



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
    'use strict';

    /**
     * @namespace
     */
    var ObserveUtils;
    if (typeof exports !== 'undefined') {
        ObserveUtils = exports;
    } else {
        ObserveUtils = global.ObserveUtils = {};
    }

    // Utilities
    // ---------


    // borrowing some array methods
    var arrSlice = Function.call.bind(Array.prototype.slice),
        arrMap = Function.call.bind(Array.prototype.map);

    // return true if the given property descriptor contains accessor
    function isAccessorDescriptor(desc) {
        if (typeof desc === 'undefined') {
            return false;
        }
        return ('get' in desc || 'set' in desc);
    }



    // getPropertyDescriptor shim
    // copied from [es6-shim](https://github.com/paulmillr/es6-shim)
    function getPropertyDescriptor(target, name) {
        var pd = Object.getOwnPropertyDescriptor(target, name),
            proto = Object.getPrototypeOf(target);
        while (typeof pd === 'undefined' && proto !== null) {
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
            throw new RangeError(errorMessage.replace('$', value));
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
        var internalPropName = '_' + (uidCounter++) + property;

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
                    notifier.notify({ type: 'update', name: property, oldValue: oldValue });
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
            throw new TypeError('target must be an Object, given ' + target);
        }
        properties = arrSlice(arguments, 1);
        while (properties.length > 0) {
            var property = properties.shift(),
                descriptor = getPropertyDescriptor(target, property);

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
        if (arguments.length <= 1 && typeof length === 'number') {
            if (this instanceof List) {
                this.length = length;
            }
            else {
                return new List(length);
            }
        }
        else {
            //here we create a list with initial values
            if (!(this instanceof List)) {
                return List.fromArray(arrSlice(arguments));
            }
            else {
                for (var i = 0, l = arguments.length ; i < l ; i++) {
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
        Object.observe(list, observer, ['add', 'update', 'delete', 'splice']);
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
        for (var i = 0, l = array.length ; i < l ; i++) {
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
        '_length' : {
            value : 0,
            enumerable: false,
            configurable: true,
            writable: true
        },
        /**
         * the length of the list
         * @property {number} length
         */
        'length' : {
            get : function () {
                return this._length;
            },
            set : function (value) {
                value = isPositiveFiniteInteger(value, 'Invalid  list length : $');
                var notifier = Object.getNotifier(this),
                    oldValue = this._length,
                    removed = [],
                    self = this;
                if (value !== oldValue) {
                    notifier.performChange('splice', function () {
                        Object.defineProperty(self, '_length', {
                            value : value,
                            enumerable: false,
                            configurable: true,
                            writable: true
                        });

                        var returnValue;
                        if (oldValue > value) {
                            //delete values if the length have been decreased
                            for (var i = value; i < oldValue; i++) {
                                removed.push(self[i]);
                                self.delete(i);
                            }
                            returnValue = {
                                index : value,
                                removed : removed,
                                addedCount: 0
                            };
                        } else {
                            returnValue = {
                                index : oldValue,
                                removed : removed,
                                addedCount: value - oldValue
                            };
                        }
                        notifier.notify({ type: 'update', name: 'length', oldValue: oldValue });

                        return returnValue;
                    });
                }

            },
            enumerable: true,
            configurable : true
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
        index = isPositiveFiniteInteger(index, 'Invalid index : $');

        var notifier = Object.getNotifier(this),
            len = this.length,
            self = this;
        if (index >= len) {
            notifier.performChange('splice', function () {
                self[index] = value;
                notifier.notify({ type: 'add', name: index});
                Object.defineProperty(self, '_length', {
                    value : index + 1,
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
                notifier.notify({ type: 'update', name: 'length', oldValue: len });

                return {
                    index : len,
                    removed : [],
                    addedCount: self.length - len
                };
            });
        }
        else if (!sameValue(value, this[index])) {
            var oldValue = this[index];
            this[index] = value;
            notifier.notify({ type: 'update', name: index, oldValue: oldValue });
        }
        return value;
    };

    /**
     * delete the value at the specified index.
     * @param {number} index
     * @return {boolean}
     */
    List.prototype.delete = function del(index) {
        index = isPositiveFiniteInteger(index, 'Invalid index : $');
        if (this.hasOwnProperty(index)) {
            var oldValue = this[index];
            if (delete this[index]) {
                var notifier = Object.getNotifier(this);
                notifier.notify({ type: 'delete', name: index, oldValue: oldValue });
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
            return (item instanceof List) ?  item.toArray() : item;
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
            throw new TypeError('this mus be an object given : ' + this);
        }
        var len = isPositiveFiniteInteger(this.length, 'this must have a finite integer property \'length\', given : $');
        if (len === 0) {
            return void(0);
        } else {
            var newLen = len - 1,
                element = this[newLen],
                notifier =  Object.getNotifier(this),
                self = this;
            notifier.performChange('splice', function () {
                delete self[newLen];
                notifier.notify({ type: 'delete', name: newLen, oldValue: element });
                Object.defineProperty(self, '_length', {
                    value : newLen,
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
                notifier.notify({ type: 'update', name: 'length', oldValue: len });

                return {
                    index : newLen,
                    removed : [element],
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
            var argumentsLength = arguments.length,
                elements = arguments,
                len = this.length,
                notifier = Object.getNotifier(this),
                self = this,
                i, index;
            notifier.performChange('splice', function () {
                for (i = 0; i < argumentsLength; i++) {
                    index =  len + i;
                    // avoid the usage of the set function and manually
                    // set the value and notify the changes to avoid the notification of
                    // multiple length modification
                    self[index] = elements[i];
                    notifier.notify({
                        type : 'add',
                        name : index
                    });
                }
                Object.defineProperty(self, '_length', {
                    value : len + argumentsLength,
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
                notifier.notify({ type: 'update', name: 'length', oldValue: len });
                return {
                    index : len,
                    removed : [],
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
        var copy = this.toArray(),
            arr = copy.slice().reverse();

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
            return void(0);
        }

        var arr = this.toArray(),
            element = arr.shift(),
            notifier = Object.getNotifier(this),
            self = this, len = this.length;
        notifier.performChange('splice', function () {
            for (var i = 0, l = arr.length; i < l; i++) {
                self.set(i, arr[i]);
            }
            self.delete(len - 1);

            Object.defineProperty(self, '_length', {
                value : len - 1,
                enumerable: false,
                configurable: true,
                writable: true
            });
            notifier.notify({ type: 'update', name: 'length', oldValue: len });

            return {
                index : 0,
                removed : [element],
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
        var copy = this.toArray(),
            arr = copy.slice().sort(compareFn);
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
        var returnValue = [],
            argumentsLength = arguments.length;

        if (argumentsLength > 0) {
            var arr = this.toArray(),
                notifier = Object.getNotifier(this),
                len = this.length,
                self = this,
                index = arguments[0],
                i, l;

            returnValue = Array.prototype.splice.apply(arr, arguments);
            notifier.performChange('splice', function () {
                for (i = 0, l = arr.length; i < l; i++) {
                    var oldValue = self[i];
                    if (!sameValue(oldValue, arr[i])) {
                        self[i] = arr[i];
                        notifier.notify(
                            i >= len ?
                                {type : 'add', name : i}:
                                {type : 'update', name : i, oldValue : oldValue}
                        );
                    }
                }


                if (len !== arr.length) {
                    if (len > arr.length) {
                        //delete values if the length have been decreased
                        for (i = arr.length; i < len; i++) {
                            self.delete(i);
                        }
                    }

                    Object.defineProperty(self, '_length', {
                        value : arr.length,
                        enumerable: false,
                        configurable: true,
                        writable: true
                    });
                    notifier.notify({ type: 'update', name: 'length', oldValue: len });
                }
                return {
                    index : index,
                    removed : returnValue,
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
        var argumentsLength  = arguments.length;
        if (argumentsLength > 0) {
            var arr = this.toArray(),
                notifier = Object.getNotifier(this),
                len = this.length,
                self = this;

            Array.prototype.unshift.apply(arr, arguments);
            notifier.performChange('splice', function () {
                for (var i = 0, l = arr.length; i < l; i++)  {
                    var oldValue = self[i];
                    if (!sameValue(oldValue, arr[i])) {
                        // avoid the usage of the set function and manually
                        // set the value and notify the changes to avoid the notification of
                        // multiple length modification
                        self[i] = arr[i];
                        notifier.notify(
                            i >= len ?
                                {type : 'add', name : i}:
                                {type : 'update', name : i, oldValue : oldValue}
                        );
                    }
                }

                if (len !== arr.length) {
                    if (len > arr.length) {
                        //delete values if the length have been decreased
                        for (i = arr.length; i < len; i++) {
                            self.delete(i);
                        }
                    }
                    Object.defineProperty(self, '_length', {
                        value : arr.length,
                        enumerable: false,
                        configurable: true,
                        writable: true
                    });
                    notifier.notify({ type: 'update', name: 'length', oldValue: len });
                }

                return {
                    index : 0,
                    removed : [],
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
    List.prototype.reduce =  Array.prototype.reduce;

    /**
     * Apply a function simultaneously against two values of the array (from right-to-left) as to reduce it to a single value.
     * @param {function} callback
     * @param {Object} [initialValue]
     * @return {Object}
     */
    List.prototype.reduceRight =  Array.prototype.reduceRight;

    /**
     * Returns the first index at which a given element can be found in the List, or -1 if it is not present.
     * @param {Object} searchElement
     * @param {number} [fromIndex]
     * @return {number}
     */
    List.prototype.indexOf =  Array.prototype.indexOf;

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
define(["exports"], function (exports) {
  "use strict";

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

  exports.Model = Model;


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

  exports.View = View;


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

  exports.Controller = Controller;
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

  exports.RoutingController = RoutingController;
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

  exports.Service = Service;
});