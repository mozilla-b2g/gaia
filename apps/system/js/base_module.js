/* global System, SettingsListener, LazyLoader */
'use strict';

(function(exports) {
  var GLOBAL_DEBUG = true;
  var BaseModule = function() {};

  /**
   * The sub modules.
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
   * @type {Array}
   */
  BaseModule.EVENTS = [];

  /**
   * All mozSettings need to be observed.
   * @type {Array}
   */
  BaseModule.SETTINGS = [];

  /**
   * All sub classes which don't need to be stared.
   */
  BaseModule.IMPORTS = [];

  /**
   * All system message this moudle needs to take care.
   * @type {Array}
   */
  BaseModule.SYSTEM_MESSAGES = [];
  BaseModule.mixin = function (prototype, mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        try {
          prototype[prop] = mixin[prop];
        } catch (e) {
          console.log(e);
        }
      }
    }
  };

  BaseModule.prototype = {
    DEBUG: false,

    TRACE: false,

    name: 'BaseModule',

    EVENT_PREFIX: 'base-module-',

    // This value is managed by HomeEventDispatcher
    HOME_EVENT_PRIORITY: -1,

    publish: function(event, detail, noPrefix) {
      var prefix = noPrefix ? '' : this.EVENT_PREFIX;
      var evt = new CustomEvent(prefix + event,
                  {
                    bubbles: true,
                    detail: detail || this
                  });

      this.debug('publishing event: ' + prefix + event +
        JSON.stringify(detail || this));

      window.dispatchEvent(evt);
    },

    handleEvent: function(evt) {
      if (typeof(this['_handle_' + evt.type]) == 'function') {
        this.debug('handling ' + evt.type);
        this['_handle_' + evt.type](evt);
      } else {
        this.debug('handler not found.');
      }
    },

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

    _setSystemMessageHandler: function() {
      if (!this.constructor.SYSTEM_MESSAGES) {
        return;
      }
      this.constructor.SYSTEM_MESSAGES.forEach(function(message) {
        if (typeof(this['_watch_' + message]) == 'function') {
          if (!this._handlerBinded) {
            this['_watch_' + message] = this['_watch_' + message].bind(this);
          }
          navigator.setMessageHandler(message, this['_watch_' + message]);
        }
      }, this);
      this._handlerBinded = true;
    },

    _unsetSystemMessageHandler: function() {
      if (!this.constructor.SYSTEM_MESSAGES) {
        return;
      }
      this.constructor.SYSTEM_MESSAGES.forEach(function(message) {
        navigator.setMessageHandler(message, function() {});
      }, this);
    },

    _observeSettings: function() {
      if (!this.constructor.SETTINGS) {
        return;
      }
      this.constructor.SETTINGS.forEach(function(setting) {
        if (typeof(this['_observe_' + setting]) == 'function') {
          if (!this._observorBinded) {
            this['_observe_' + setting] =
              this['_observe_' + setting].bind(this);
          }
          SettingsListener.observe(setting, null, this['_observe_' + setting]);
        }
      }, this);
      this._observorBinded = true;
    },

    _unobserveSettings: function() {
      if (!this.constructor.SETTINGS) {
        return;
      }
      this.constructor.SETTINGS.forEach(function(setting) {
        SettingsListener.unobserve(setting, this['_observe_' + setting]);
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
      if (this._started) {
        return;
      }
      this.debug('Starting.');
      this.imports();
    },

    __start: function() {
      // Note: submodule has the higher priority on event handling.
      // because they are started before the parent module.
      // We may want to change it for some special case.
      this.startSubModules();
      this.render();
      this._start();
      this._subscribeEvents();
      this._observeSettings();
      this._started = true;
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

      this.debug('lazy loading submodules.');
      System.lazyLoad(this.constructor.SUB_MODULES, function() {
        this.debug('lazy loaded submodules.');
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
        parent[moduleName] = new window[module](this);
        parent[moduleName].start && parent[moduleName].start();
      } else if (window[module]) {
        window[module].init && window[module].init();
      } 
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
      if (!this.started) {
        return;
      }
      this.debug('Stopping.');
      this.stopSubModules();
      this._unsubscribeEvents();
      this._unobserveSettings();
      this._stop();
      this._started = false;
      this.debug('Stopped.');
    },

    imports: function() {
      if (!this.constructor.IMPORTS ||
          typeof(this.constructor.IMPORTS) == 'undefined' ||
          this.constructor.IMPORTS.length === 0) {
        this.debug('No loading imports');
        this.__start();
        return;
      }
      this.debug(this.constructor.IMPORTS);
      this.debug('import loading.');
        LazyLoader.load(this.constructor.IMPORTS, function() {
          this.__start();
        }.bind(this));
    }
  };

  exports.BaseModule = BaseModule;
}(window));
