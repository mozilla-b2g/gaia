/* global LazyLoader, DUMP */
'use strict';

(function(exports) {
  /**
   * Turn of this flag to debug all BaseModule based modules.
   * @type {Boolean}
   */
  var GLOBAL_DEBUG = false;

  /**
   * This is used to store the constructors which are created
   * via BaseModule.create().
   * constructor.name => constructor
   * @type {Object}
   */
  var AVAILABLE_MODULES = {};

  /**
   * BaseModule is a class skeleton which helps you to build a module with
   * * Centralized event handler
   * * Centralized settings observation
   * * Sub modules management including loading and starting
   * * Import preload files
   * * DOM rendering
   * * Consistent logging function with System boot time and module name
   * * Common publishing interface
   * @class BaseModule
   */
  var BaseModule = function() {};

  /**
   * The sub modules belong to this module.
   * BaseModule will load and then start these sub modules automatically.
   * The expressions can include path (e.g. 'path/to/ModuleName'). BaseModule
   * will load them from specified subdirectory. However, the module names
   * (without path) should be unique even they're under different folders.
   * @type {Array}
   */
  BaseModule.SUB_MODULES = [];

  /**
   * All events of need to be listened.
   * BaseModule will add/remove the event listener in start/stop functions.
   * The function of '_handle_' form in this module will be invoked
   * when the event is caught.
   * @type {Array}
   */
  BaseModule.EVENTS = [];

  /**
   * All mozSettings need to be observed.
   * BaseModule will observe and invoke the responsive
   * this['_observe_' + key] function.
   * @type {Array}
   */
  BaseModule.SETTINGS = [];

  /**
   * This defines a list of file path needs to be imported
   * before the real start of this module.
   */
  BaseModule.IMPORTS = [];

  /**
   * This tells System the sandbox what methods you are going to
   * register and let the other to request.
   *
   * @example
   * var MyModule = function() {};
   * MyModule.SERVICES = ['unlock'];
   * MyModule.prototype = Object.create(BaseModule.prototype);
   * MyModule.prototype.constructor = MyModule;
   * MyModule.prototype.name = 'MyModule';
   * var m = new MyModule();
   * m.start();
   * // other module
   * Service.request('MyModule:unlock').then(function(result) {
   * });
   * Service.request('unlock').then(function(result) {
   *   // if the request is registered by only one module.
   * });
   */
  BaseModule.SERVICES = [];

  /**
   * The function or property exported here will be
   * synchronously queried by other module in system app.
   * If we are not started yet, they will get undefined.
   *
   * @example
   * var MyModule = function() {};
   * MyModule.STATES = ['isActive'];
   * MyModule.prototype = Object.create(BaseModule.prototype);
   * MyModule.prototype.constructor = MyModule;
   * MyModule.prototype.name = 'MyModule';
   * var m = new MyModule();
   * m.start();
   * // other module
   * console.log(Service.query('MyModule.isActive'));
   * // if the method name is unique.
   * console.log(Service.query('isActive'));
   * @type {Array}
   */
  BaseModule.STATES = [];

  var SubmoduleMixin = {
    loadWhenIdle: function(modules) {
      return this.service.request('schedule', () => {
        this.constructor.SUB_MODULES =
          this.constructor.SUB_MODULES.concat(modules);
        return this._startSubModules();
      });
    },
    /**
     * Helper function to load and start the submodules defined in
     * |this.constructor.SUB_MODULES|.
     */
    _startSubModules: function() {
      if (!this.constructor.SUB_MODULES ||
          this.constructor.SUB_MODULES.length === 0) {
        return Promise.resolve();
      }

      var submodules = this.constructor.SUB_MODULES.slice();
      var unloaded = [];
      submodules.forEach(function(submodule) {
        if (BaseModule.defined(submodule) || window[submodule]) {
          var name = BaseModule.lowerCapital(submodule);
          if (!this[name]) {
            this._initializeSubModule(name, submodule);
          }
        } else {
          unloaded.push(submodule);
        }
      }, this);

      if (unloaded.length === 0) {
        this.baseSubModuleLoaded && this.baseSubModuleLoaded();
        return;
      }

      this.debug('lazy loading submodules: ' +
        unloaded.concat());
      return BaseModule.lazyLoad(unloaded).then(() => {
        this.debug('lazy loaded submodules: ' +
          unloaded.concat());
        return Promise.all(
          unloaded
            .map(BaseModule.parsePath)
            .map(function(module) {
              var moduleName = BaseModule.lowerCapital(module.name);
              if (!this[moduleName]) {
                return this._initializeSubModule(moduleName, module.name);
              } else {
                return Promise.resolve();
              }
            }, this));
      });
    },

    _initializeSubModule: function(moduleName, module) {
      var constructor = AVAILABLE_MODULES[module] || window[module];
      if (typeof(constructor) == 'function') {
        this.debug('instantiating submodule: ' + moduleName);
        this[moduleName] = new constructor(this);
        // If there is a custom submodule loaded handler, call it.
        // Otherwise we will start the submodule right away.
        if (typeof(this['_' + moduleName + '_loaded']) == 'function') {
          return this['_' + moduleName + '_loaded']();
        } else if (this.lifeCycleState !== 'stopped') {
          return this[moduleName].start && this[moduleName].start();
        }
      } else {
        this[moduleName] = constructor;
        // For the module which does not become class yet
        if (this[moduleName] && this[moduleName].start) {
          return this[moduleName].start();
        } else if (this[moduleName] && this[moduleName].init) {
          // backward compatibility with init.
          return this[moduleName].init();
        } else {
          return undefined;
        }
      }
    },

    _stopSubModules: function() {
      if (!this.constructor.SUB_MODULES) {
        return;
      }
      this.constructor.SUB_MODULES.map(BaseModule.parsePath)
        .forEach(function(module) {
        var moduleName = BaseModule.lowerCapital(module.name);
        if (this[moduleName]) {
          this.debug('Stopping submodule: ' + moduleName);
          this[moduleName].stop && this[moduleName].stop();
        }
      }, this);
    }
  };

  /**
   * SettingsMixin will provide you the ability to watch
   * and store the settings in this._settings
   * @type {Object}
   */
  var SettingMixin = {
    observe: function(name, value) {
      this.debug('observing ' + name + ' : ' + value);
      this._settings[name] = value;
      if (typeof(this['_observe_' + name]) == 'function') {
        this.debug('observer for ' + name + ' found, invoking.');
        this['_observe_' + name](value);
      }
    },

    _observeSettings: function() {
      if (!this.constructor.SETTINGS) {
        this.debug('No settings needed, skipping.');
        return;
      }
      this._settings = {};
      this.debug('~observing following settings: ' +
        this.constructor.SETTINGS.concat());
      this.constructor.SETTINGS.forEach(function(setting) {
        this.service.request('SettingsCore:addObserver', setting, this);
      }, this);
    },

    _unobserveSettings: function() {
      if (!this.constructor.SETTINGS) {
        return;
      }
      this.constructor.SETTINGS.forEach(function(setting) {
        this.service.request('SettingsCore:removeObserver', setting, this);
      }, this);
    }
  };

  var EventMixin = {
    /**
     * Custom global event handler before the event is handled
     * by a specific handler.
     * Override it if necessary.
     */
    _pre_handleEvent: function() {

    },

    /**
     * Custom global event handler after the event is handled.
     * Override it if necessary.
     */
    _post_handleEvent: function() {

    },

    _subscribeEvents: function() {
      if (!this.constructor.EVENTS) {
        this.debug('No events wanted, skipping.');
        return;
      }
      this.debug('event subcribing stage..');
      this.constructor.EVENTS.forEach(function(event) {
        this.debug('subscribing ' + event);
        window.addEventListener(event, this);
      }, this);
    },

    _unsubscribeEvents: function() {
      if (!this.constructor.EVENTS) {
        return;
      }
      this.constructor.EVENTS.forEach(function(event) {
        window.removeEventListener(event, this);
      }, this);
    },

    handleEvent: function(evt) {
      if (typeof(this._pre_handleEvent) == 'function') {
        var shouldContinue = this._pre_handleEvent(evt);
        if (shouldContinue === false) {
          return;
        }
      } else {
        this.debug('no handle event pre found. skip');
      }
      if (typeof(this['_handle_' + evt.type]) == 'function') {
        this.debug('handling ' + evt.type);
        this['_handle_' + evt.type](evt);
      }
      if (typeof(this._post_handleEvent) == 'function') {
        this._post_handleEvent(evt);
      }
    }
  };

  var ServiceMixin = {
    _registerServices: function() {
      if (!this.constructor.SERVICES) {
        return;
      }
      this.constructor.SERVICES.forEach(function(service) {
        this.service.register(service, this);
      }, this);
    },

    _unregisterServices: function() {
      if (!this.constructor.SERVICES) {
        return;
      }
      this.constructor.SERVICES.forEach(function(service) {
        this.service.unregister(service, this);
      }, this);
    }
  };

  var StateMixin = {
    _registerStates: function() {
      if (!this.constructor.STATES) {
        return;
      }
      this.constructor.STATES.forEach(function(state) {
        this.service.registerState(state, this);
      }, this);
    },

    _unregisterStates: function() {
      if (!this.constructor.STATES) {
        return;
      }
      this.constructor.STATES.forEach(function(state) {
        this.service.unregisterState(state, this);
      }, this);
    }
  };

  BaseModule.defined = function(name) {
    return !!AVAILABLE_MODULES[name];
  };

  BaseModule.__clearDefined = function() {
    AVAILABLE_MODULES = [];
  };

  /**
   * Mixin the prototype with give mixin object.
   * @param  {Object} prototype The prototype of a class
   * @param  {Object} mixin     An object will be mixed into the prototype
   */
  BaseModule.mixin = function (prototype, mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        prototype[prop] = mixin[prop];
      }
    }
  };

  /**
   * Create a module based on base module and give properties.
   * The constructor will be placed in AVAILABLE_MODULES if you
   * specify an unique name in the prototype.
   * @example
   * var MyModule = function() {};
   * BaseModule.create(MyModule, {
   *   name: 'MyModule'
   * });
   * var myModule = BaseModule.instantiate('MyModule');
   *
   * @param  {Function} constructor The constructor function.
   * @param  {Object} prototype
   *                  The prototype which will be injected into the class.
   * @param  {Object} properties
   *                  The property object which includes getter/setter.
   */
  BaseModule.create = function(constructor, prototype, properties) {
    constructor.prototype = Object.create(BaseModule.prototype, properties);
    constructor.prototype.constructor = constructor;
    if (constructor.SETTINGS) {
      BaseModule.mixin(constructor.prototype, SettingMixin);
    }
    if (constructor.EVENTS) {
      BaseModule.mixin(constructor.prototype, EventMixin);
    }
    if (constructor.SERVICES) {
      BaseModule.mixin(constructor.prototype, ServiceMixin);
    }
    if (constructor.STATES) {
      BaseModule.mixin(constructor.prototype, StateMixin);
    }
    // Inject this anyway.
    BaseModule.mixin(constructor.prototype, SubmoduleMixin);
    if (prototype) {
      BaseModule.mixin(constructor.prototype, prototype);
      if (prototype.name) {
        AVAILABLE_MODULES[prototype.name] = constructor;
      } else {
        console.warn('No name give, impossible to instantiate without name.');
      }
    }
    return constructor;
  };

  /**
   * Create a new instance based on the module name given.
   * It will look up |AVAILABLE_MODULES|.
   * Note: this will instante multiple instances if called more than once.
   * Also it's impossible to pass arguments now.
   * @param  {String} moduleName The module name
   *                             which comes from the prototype of the module.
   * @return {Object}            Created instance.
   */
  BaseModule.instantiate = function(moduleName) {
    if (moduleName in AVAILABLE_MODULES) {
      var args = Array.prototype.slice.call(arguments, 1);
      var constructor = function() {
        AVAILABLE_MODULES[moduleName].apply(this, args);
      };
      constructor.prototype = AVAILABLE_MODULES[moduleName].prototype;
      return new constructor();
    }
    return undefined;
  };

  /**
   * Lazy load an list of modules
   * @param  {Array} array A list of module names
   * @return {Promise} The promise of lazy loading;
   *                   it will be invoked once lazy loading is done.
   */
  BaseModule.lazyLoad = function(array) {
    var self = this;
    return new Promise(function(resolve) {
      var fileList = [];
      array.forEach(function(module) {
        fileList.push(BaseModule.object2fileName(module));
      }, self);
      LazyLoader.load(fileList, function() {
        resolve();
      });
    });
  };

  /**
   * A helper function to lowercase only the capital character.
   * @example
   * Service.lowerCapital('AppWindowManager');
   * // appWindowManager
   * @param  {String} str String to be lowercased on capital
   * @return {String}     Captital lowerred string
   */
  BaseModule.lowerCapital = function(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  };

  /**
   * A helper function to split module expressions into "path" and "name".
   * @example
   * Service.parsePath('path/to/ModuleName');
   * // {path: 'path/to/', name: 'ModuleName'}
   * @param  {String} str String to be splitted
   * @return {Object}     The result object with members: "path" and "name".
   */
  BaseModule.parsePath = function(str) {
    var [, path, name] = /^(.*\/|)(.+)$/.exec(str);
    return {
      path: path,
      name: name
    };
  };

  /**
   * A helper function to transform object name to file name
   * @example
   * Service.object2fileName('AppWindowManager');
   * // 'js/app_window_manager.js'
   * Service.object2fileName('path/to/ModuleName');
   * // 'js/path/to/module_name.js'
   *
   * @param  {String} string Module name
   * @return {String}        File name
   */
  BaseModule.object2fileName = function(string) {
    var i = 0;
    var ch = '';

    var module = BaseModule.parsePath(string);
    var moduleName = module.name;

    while (i <= moduleName.length) {
      var character = moduleName.charAt(i);
      if (character !== character.toLowerCase()) {
        if (ch === '') {
          ch += character.toLowerCase();
        } else {
          ch += '_' + character.toLowerCase();
        }
      } else {
        ch += character;
      }
      i++;
    }
    return '/js/' + module.path + ch + '.js';
  };

  BaseModule.prototype = {
    service: window.Service,

    DEBUG: false,

    TRACE: false,

    /**
     * The name of this module which is usually the constructor function name
     * and could be converted to the file name.
     * For example, AppWindowManager will be mapped to app_window_manager.js
     * This should be unique.
     * @type {String}
     */
    name: '(Anonymous)',

    EVENT_PREFIX: '',

    /**
     * We are having three states:
     * * starting
     * * started
     * * stopped
     * @type {String}
     */
    lifeCycleState: 'stopped',

    publish: function(event, detail, noPrefix) {
      var prefix = noPrefix ? '' : this.EVENT_PREFIX;
      var evt = new CustomEvent(prefix + event,
                  {
                    bubbles: true,
                    detail: detail || this
                  });

      this.debug('publishing: ' + prefix + event);

      window.dispatchEvent(evt);
    },

    /**
     * Basic log.
     */
    debug: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.log('[' + this.name + ']' +
          '[' + this.service.currentTime() + '] ' +
            Array.slice(arguments).concat());
        if (this.TRACE) {
          console.trace();
        }
      } else if (window.DUMP) {
        DUMP('[' + this.name + ']' +
          '[' + this.service.currentTime() + '] ' +
            Array.slice(arguments).concat());
      }
    },

    /**
     * Log some infomation.
     */
    info: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.info('[' + this.name + ']' +
          '[' + this.service.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * Log some warning message.
     */
    warn: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.warn('[' + this.name + ']' +
          '[' + this.service.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * Log some error message.
     */
    error: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.error('[' + this.name + ']' +
          '[' + this.service.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    writeSetting: function(settingObject) {
      this.debug('writing ' + JSON.stringify(settingObject) +
        ' to settings db');
      return this.service.request('SettingsCore:set', settingObject);
    },

    readSetting: function(name) {
      if (this._settings && this._settings[name]) {
        return Promise.resolve(this._settings[name]);
      } else {
        this.debug('reading ' + name + ' from settings db');
        return this.service.request('SettingsCore:get', name);
      }
    },

    /**
     * Custom start function, override it if necessary.
     * If you want to block the start process of this module,
     * return a promise here.
     */
    _start: function() {},

    /**
     * Custom stop function. Override it if necessary.
     */
    _stop: function() {},

    /**
     * The starting progress of a module has these steps:
     * * import javascript files
     * * lazy load submodules and instantiate once loaded.
     * * custom start function
     * * attach event listeners
     * * observe settings
     * * register services to System
     * * DOM elements rendering (not implemented)
     * The import is guranteed to happen before anything else.
     * The service registration is expected to happen after everything is done.
     * The ordering of the remaining parts should not depends each other.
     *
     * The start function will return a promise to let you know
     * when the module is started.
     * @example
     * var a = BaseModule.instantiate('A');
     * a.start().then(() => {
     *   console.log('started');
     * });
     *
     * Note: a module start promise will only be resolved
     * after all the steps are resolved, including
     * the custom start promise and the promises from all the submodules.
     * So when you see a module is started, that means all of its
     * submodules are started as well.
     *
     * @memberOf BaseModule.prototype
     */
    start: function() {
      if (this.lifeCycleState !== 'stopped') {
        this.warn('already started');
        return Promise.reject('already started');
      }
      this.switchLifeCycle('starting');
      return this.imports();
    },

    __imported: function() {
      // Do nothing if we are stopped.
      if (this.lifeCycleState === 'stopped') {
        this.warn('already stopped');
        return Promise.resolve();
      }
      this.debug('in imported');
      return Promise.all([
        // Parent module needs to know the events from the submodule.
        this._subscribeEvents && this._subscribeEvents(),
        this._startSubModules && this._startSubModules(),
        this._start(),
        this._observeSettings && this._observeSettings(),
        this._registerServices && this._registerServices(),
        this._registerStates && this._registerStates()]).then(() => {
        this.switchLifeCycle('started');
      });
    },

    /**
     * The stopping of a module has these steps:
     * * unregister services to System sandbox
     * * lazy load submodules and instantiate once loaded.
     * * attach event listeners
     * * observe settings
     * * custom stop function
     */
    stop: function() {
      if (this.lifeCycleState === 'stopped') {
        this.warn('already stopped');
        return;
      }
      this._unregisterServices && this._unregisterServices();
      this._unregisterStates && this._unregisterStates();
      this._stopSubModules && this._stopSubModules();
      this._unsubscribeEvents && this._unsubscribeEvents();
      this._unobserveSettings && this._unobserveSettings();
      this._stop();
      this.switchLifeCycle('stopped');
    },

    switchLifeCycle: function(state) {
      if (this.lifeCycleState === state) {
        return;
      }

      this.debug('life cycle state change: ' +
        this.lifeCycleState + ' -> ' + state);
      this.lifeCycleState = state;
      this.publish(state);
    },

    imports: function() {
      if (!this.constructor.IMPORTS ||
          typeof(this.constructor.IMPORTS) == 'undefined' ||
          this.constructor.IMPORTS.length === 0) {
        return this.__imported();
      }
      this.debug(this.constructor.IMPORTS);
      this.debug('import loading.');
      return LazyLoader.load(this.constructor.IMPORTS)
        .then(() => {
          this.debug('imported..');
          return this.__imported();
        });
    }
  };

  exports.BaseModule = BaseModule;
}(window));
