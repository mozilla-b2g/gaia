(function(global) {
  'use strict';

  /*************************

  IntlHelper.define('shortDate', 'datetime', {
    year: 'numeric',
    month: 'long',
  });

  function setValue() {
    const formatter = IntlHelper.get('shortDate');
    console.log(formatter.format(new Date()));
  }

  setValue();

  IntlHelper.observe('shortDate', setValue);
  
   ****************************/
  const helperCache = new Map();

  const knownObjects = {
    datetime: {
      create: function(options) {
        const customOptions = Object.assign({}, options);
        if (options.hour) {
          customOptions.hour12 = navigator.mozHour12;
        }
        return Intl.DateTimeFormat(
          navigator.languages,
          customOptions
        );
      },
      isAffected: function(obj, reason) {
        if (reason === 'languagechange') {
          return true;
        }
        if (reason === 'timeformatchange') {
          return 'hour' in obj.options;
        }
        return false;
      }
    },
    number: {
      create: function(options) {
        return Intl.NumberFormat(
          navigator.languages,
          options
        );
      },
      isAffected: function(obj, reason) {
        return reason === 'languagechange';
      }
    },
    collator: {
      create: function(options) {
        return Intl.Collator(
          navigator.languages,
          options
        );
      },
      isAffected: function(obj, reason) {
        return reason === 'languagechange';
      }
    },
  };

  global.IntlHelper = {
    define: function(name, type, options) {
      if (!knownObjects.hasOwnProperty(type)) {
        throw new Error('Unknown type: ' + type);
      }

      if (helperCache.has(name)) {
        throw new Error(
          'Intl Object with name "' + name + '" already exists');
      }

      helperCache.set(name, {
        options,
        type,
        intlObject: undefined,
        listeners: new Set()
      });
    },

    get: function(name) {
      if (!helperCache.has(name)) {
        throw new Error('Intl Object with name "' + name + '" is not defined');
      }
      const obj = helperCache.get(name);
      
      if (!knownObjects.hasOwnProperty(obj.type)) {
        throw new Error('Unknown type: ' + obj.type);
      }

      if (obj.intlObject === undefined) {
        obj.intlObject = knownObjects[obj.type].create(obj.options);
      }
      return obj.intlObject;
    },

    observe: function(names, cb) {
      if (typeof names === 'string') {
        names = [names];
      }
      for (var name of names) {
        if (!helperCache.has(name)) {
          throw new Error(
            'Intl Object with name "' + name + '" is not defined');
        }

        const obj = helperCache.get(name);

        obj.listeners.add(cb);
      }
    },

    unobserve: function(name, cb) {
      const obj = helperCache.get(name);
      obj.listeners.delete(cb);
    },

    _fireObservers: function(affectedObjects, ...args) {
      const affectedCallbacks = new Set();

      affectedObjects.forEach((obj, name) => {
        obj.listeners.forEach(cb => affectedCallbacks.add(cb));
      });

      affectedCallbacks.forEach(cb => {
        try {
          cb(...args);
        } catch(e) {
          console.error('Error in callback: ' + e.toString());
          console.error(e.stack);
        }
      });
    },

    handleEvent: function(evt) {
      const affectedObjects = resetObjects(evt.type);

      global.IntlHelper._fireObservers(affectedObjects);
    },

    _resetObjectCache: function() {
      helperCache.clear();
    }
  };

  function resetObjects(reason) {
    const affectedObjects = new Set();

    helperCache.forEach((obj, name) => {
      if (knownObjects[obj.type].isAffected(obj, reason)) {
        obj.intlObject = undefined;
        affectedObjects.add(obj);
      }
    });

    return affectedObjects;
  }

  window.addEventListener('timeformatchange', global.IntlHelper, false);
  window.addEventListener('languagechange', global.IntlHelper, false);
})(this);
