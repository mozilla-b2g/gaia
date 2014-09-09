/* global System, LazyLoader */
'use strict';

(function(exports) {
  var GLOBAL_DEBUG = true;
  /**
   * BaseModule is a class skeletion which helps you to build a module with
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
   * BaseModule will load and then start these sub modules
   * automatically.
   * @type {Array}
   */
  BaseModule.SUB_MODULES = [];

  /**
   * Where the sub module should be put.
   * @type {Object}
   */
  BaseModule.SUB_MODULE_PARENT = window;

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

  BaseModule.mixin = function (prototype, mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        // We are having a handleEvent function already,
        // so if the mixed prototype has another handleEvent,
        // we will put it in _handleEvent and execute it before our handleEvent.
        if ('handleEvent' === prop) {
          prototype._handleEvent = mixin.handleEvent;
        } else {
          prototype[prop] = mixin[prop];
        }
      }
    }
  };

  BaseModule.prototype = {
    DEBUG: false,

    TRACE: false,

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

    // This value is managed by HomeEventDispatcher
    // HOME_EVENT_PRIORITY: -1,

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

    handleEvent: function(evt) {
      if (typeof(this._handleEvent) == 'function') {
        this._handleEvent(evt);
      }
      if (typeof(this['_handle_' + evt.type]) == 'function') {
        this.debug('handling ' + evt.type);
        this['_handle_' + evt.type](evt);
      } else {
        this.debug('handler not found.');
      }
    },

    /**
     * Basic log.
     */
    debug: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.log('[' + this.name + ']' +
          '[' + System.currentTime() + '] ' +
            Array.slice(arguments).concat());
        if (this.TRACE) {
          console.trace();
        }
      }
    },

    /**
     * Log some infomation.
     */
    info: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.info('[' + this.name + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * Log some warning message.
     */
    warn: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.warn('[' + this.name + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    /**
     * Log some error message.
     */
    error: function() {
      if (this.DEBUG || GLOBAL_DEBUG) {
        console.error('[' + this.name + ']' +
          '[' + System.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    },

    observe: function(name, value) {
      if (typeof(this._pre_observe) == 'function') {
        this._pre_observe(name, value);
      }
      if (typeof(this['_observe_' + name]) == 'function') {
        this['_observe_' + name](value);
      }
      if (typeof(this._post_observe) == 'function') {
        this._post_observe(name, value);
      }
    },

    _observeSettings: function() {
      if (!this.constructor.SETTINGS) {
        this.debug('No settings needed, skipping.');
        return;
      }
      this.debug('~observing following settings: ' +
        this.constructor.SETTINGS.concat());
      this.constructor.SETTINGS.forEach(function(setting) {
        System.addObserver(setting, this);
      }, this);
    },

    _unobserveSettings: function() {
      if (!this.constructor.SETTINGS) {
        return;
      }
      this.constructor.SETTINGS.forEach(function(setting) {
        System.removeObserver(setting, this);
      }, this);
    },

    _subscribeEvents: function() {
      if (!this.constructor.EVENTS) {
        this.debug('No events wanted, skipping.');
        return;
      }
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

    _start: function() {},

    _stop: function() {},

    start: function() {
      if (this.lifeCycleState !== 'stopped') {
        return;
      }
      this.lifeCycleState = 'starting';
      this.publish('starting');
      this.debug('Starting.');
      this.imports();
    },

    __onImported: function() {
      // Note: submodule has the higher priority on event handling.
      // because they are started before the parent module.
      // We may want to change it for some special case.
      this.startSubModules();
      this.debug('render stage..');
      this.render();
      this.debug('custom init stage..');
      this._start();
      this.debug('event subcribing stage..');
      this._subscribeEvents();
      this.debug('setting observing stage..');
      this._observeSettings();
      this.lifeCycleState = 'started';
      this.publish('started');
      this.debug('Started.');
    },

    render: function() {
      var view = this.view();
      if (view === '' || !this.containerElement) {
        return;
      }
      this.containerElement.insertAdjacentHTML('beforeend', view);
    },

    view: function() {
      return '';
    },

    containerElement: document.body,

    startSubModules: function() {
      if (!this.constructor.SUB_MODULES ||
          this.constructor.SUB_MODULES.length === 0) {
        this.debug('No submodules defined.');
        return;
      }

      this.debug('lazy loading submodules: ' +
        this.constructor.SUB_MODULES.concat());
      System.lazyLoad(this.constructor.SUB_MODULES, function() {
        this.debug('lazy loaded submodules: ' +
          this.constructor.SUB_MODULES.concat());
        this.constructor.SUB_MODULES.forEach(function(module) {
          var moduleName = System.lowerCapital(module);
          var parent = this.constructor.SUB_MODULE_PARENT || this;
          if (!parent[moduleName]) {
            this.initialSubModule(moduleName, module);
          }
        }, this);
      }.bind(this));
    },

    initialSubModule: function(moduleName, module) {
      var parent = this.constructor.SUB_MODULE_PARENT || this;
      if (typeof(window[module]) == 'function') {
        this.debug('instantiating submodule: ' + moduleName);
        parent[moduleName] = new window[module](this);
        parent[moduleName].start && parent[moduleName].start();
      } else if (window[module]) {
        this.debug('initing submodule: ' + moduleName);
        window[module].init && window[module].init();
      }
      this.onSubModuleInited(moduleName);
    },

    onSubModuleInited: function() {

    },

    stopSubModules: function() {
      if (!this.constructor.SUB_MODULES) {
        return;
      }
      this.constructor.SUB_MODULES.forEach(function(module) {
        var moduleName = System.lowerCapital(module);
        var parent = this.constructor.SUB_MODULE_PARENT || this;
        if (parent[moduleName]) {
          this.debug('Stopping submodule: ' + moduleName);
          parent[moduleName].stop && parent[moduleName].stop();
        }
      }, this);
    },

    stop: function() {
      if (this.lifeCycleState === 'stopped') {
        return;
      }
      this.debug('Stopping.');
      this.stopSubModules();
      this._unsubscribeEvents();
      this._unobserveSettings();
      this._stop();
      this.lifeCycleState = 'stopped';
      this.publish('stopped');
      this.debug('Stopped.');
    },

    imports: function() {
      if (!this.constructor.IMPORTS ||
          typeof(this.constructor.IMPORTS) == 'undefined' ||
          this.constructor.IMPORTS.length === 0) {
        this.debug('No loading imports');
        this.__onImported();
        return;
      }
      this.debug(this.constructor.IMPORTS);
      this.debug('import loading.');
        LazyLoader.load(this.constructor.IMPORTS, function() {
          this.__onImported();
        }.bind(this));
    }
  };

  exports.BaseModule = BaseModule;
}(window));
