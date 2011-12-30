/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

const RemoteConsole = {
  _server: null,
  init: function rc_init() {
    try {
      // Start the WebSocketServer
      let server = this._server = new WebSocketServer();
      server.start();

      // Configure the hooks to the HUDService
      new HUDHooks({
        'jsterm': {
          'propertyProvider': function autocomplete(scope, inputValue) {
            return {
              matchProp: inputValue,
              matches: ['argh']
            };
          },
          'evalInSandbox': function eval(str) {
            if (str.trim() === 'help' || str.trim() === '?')
              str = 'help()';

            let result = 'urgh!';
            return result;
          }
        }
      });
    } catch (e) {
      dump(e);
    }
  },

  uninit: function rc_uninit() {
    this._server.stop();
    delete this._server;
  }
};

function handlerMaker(obj) {
  return {
    // Fundamental traps
    getOwnPropertyDescriptor: function(name) {
      dump('getOwnPropertyDescriptor: ' + name + '\n');

      let desc = Object.getOwnPropertyDescriptor(obj, name);

      // a trapping proxy's properties must always be configurable
      if (desc !== undefined)
        desc.configurable = true;
      return desc;
    },

    getPropertyDescriptor: function(name) {
      dump('getPropertyDescriptor: ' + name + '\n');

      let index = ~~name;
      if (index == name && index > 1) {
        return {
          get: function() {
            let val = this[index - 1] + this[index - 2];
            Object.defineProperty(this, index, {
              value: val,
              enumerable: true,
              writable: true,
              configurable: true
            });
            return val;
          }
        };
      }
      return Object.getOwnPropertyDescriptor(Object.prototype, name);
    },

    getOwnPropertyNames: function() {
      dump('getOwnPropertyNames\n');

      return Object.getOwnPropertyNames(obj);
    },

    getPropertyNames: function() {
      dump('getPropertyNames\n');

      return Object.getPropertyNames(obj); // not in ES5
    },

    defineProperty: function(name, desc) {
      dump('defineProperty: ' + name + ' = ' + desc + '\n');

      Object.defineProperty(obj, name, desc);
    },

    delete: function(name) {
      dump('delete ' + name + '\n');

      return delete obj[name];
    },

    fix: function() {
      dump('fix\n');

      if (Object.isFrozen(obj)) {
        return Object.getOwnPropertyNames(obj).map(function(name) {
          return Object.getOwnPropertyDescriptor(obj, name);
        });
      }

      // As long as obj is not frozen, the proxy won't allow itself to be fixed
      return undefined; // will cause a TypeError to be thrown
    },

    // derived traps
    has: function(name) {
      dump('has: ' + name + '\n');
      return name in obj;
    },

    hasOwn: function(name) {
      dump('hasOwn: ' + name + '\n');

      return Object.prototype.hasOwnProperty.call(obj, name);
    },

    get: function(receiver, name) {
      dump('get: ' + name + '\n');

      let object = obj[name];
      if (object)
        return Proxy.create(handlerMaker(object));
      return object;
    },

    set: function(receiver, name, val) {
      dump('set: ' + name + ' = ' + val + '\n');

      obj[name] = val;
      return true;
    }, // bad behavior when set fails in non-strict mode

    enumerate: function() {
      dump('enumerate\n');

      let result = [];
      for (name in obj)
        result.push(name);
      return result;
    },

    keys: function() {
      dump('keys\n');

      return Object.keys(obj);
    }
  };
}

