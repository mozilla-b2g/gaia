/**
 * Module provides methods to create a new module. Any module created here has
 * the ability of being extended by other modules. Existing properties are
 * overridden.
 *
 * Creating a module
 * @example
 *   var NewModule = Module.create(function() {
 *     this.value = 100;
 *   });
 *   NewModule.prototype.print = function() { console.log(this.value); };
 *
 *   var instance = NewModule();
 *   instance.print(); // 100
 *
 * Extending a module
 * @example
 *   var AnotherModule = Module.create();
 *   AnotherModule.prototype.inc = function() { this.value++; };
 *   var ExtendingModule = NewModule.extend(AnotherModule);
 *
 *   var instance = ExtendingModule();
 *   instance.inc();
 *   instance.print(); // 101
 *
 * @module modules/base/module
 */
define(function() {
  'use strict';

  const LOG_LEVEL = {
    NONE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    ALL: 5
  };

  var _constructorMap = (function() {
    var _ctorMap = new Map();
    var _getConstructor = function(Module) {
      return _ctorMap.get(Module) || function() {};
    };
    var _registerConstructor = function(Module, constructor) {
      _ctorMap.set(Module, constructor || function() {});
    };
    return {
      getConstructor: _getConstructor,
      registerConstructor: _registerConstructor
    };
  })();

  var _emptyFunction = function() {};
  var _createLogger = function(name) {
    switch (name) {
      case 'DEBUG':
        return function(msg) {
          console.log(this._msgPrefix + msg);
        };
      case 'INFO':
        return function(msg) {
          console.info(this._msgPrefix + msg);
        };
      case 'WARN':
        return function(msg) {
          console.warn(this._msgPrefix + msg);
        };
      case 'ERROR':
        return function(msg) {
          console.error(this._msgPrefix + msg);
        };
    }
  };

  var ModulePrototype = {
    get _msgPrefix() {
      return '[' + this.$name + ']: ';
    },
    debug: _emptyFunction,
    info: _emptyFunction,
    warn: _emptyFunction,
    error: _emptyFunction,
    throw: function(msg) {
      throw new Error(this._msgPrefix + msg);
    },
    set _logLevel(value) {
      Object.keys(LOG_LEVEL).forEach((name) => {
        var level = LOG_LEVEL[name];
        if (value >= level && value > 0) {
          this[name.toLowerCase()] = _createLogger(name);
        }
      });
    },
    super: _constructorMap.getConstructor
  };

  var _extend = function() {
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        var Module = arguments[0];
        for (var prop in Module.prototype) {
          if (prop === '$name') {
            continue;
          }
          var pd = Object.getOwnPropertyDescriptor(Module.prototype, prop);
          if (pd) {
            Object.defineProperty(this.prototype, prop, pd);
          }
        }
        break;
      default:
        Array.prototype.forEach.call(arguments, (Module) => {
          _extend.call(this, Module);
        });
        break;
    }
    return this;
  };

  // Returns a module function. The function returns an instance of the
  // module when it is called. The passed constructor is called using the
  // instance as "this".
  function _create(constructor) {
    if (constructor && typeof constructor !== 'function') {
      throw new Error('[Module]: Invalid constructor');
    }

    var ModuleFunc = function() {};
    ModuleFunc.prototype = Object.create(ModulePrototype);
    ModuleFunc.prototype.$name = constructor && constructor.name || '';

    var Module = function() {
      var instance = new ModuleFunc();
      if (constructor) {
        constructor.apply(instance, arguments);
      }
      return instance;
    };
    _constructorMap.registerConstructor(Module, constructor);
    Module.extend = _extend;
    Module.prototype = ModuleFunc.prototype;
    return Module;
  }

  return {
    LOG_LEVEL: LOG_LEVEL,
    create: _create
  };
});
