(function(global) {
  'use strict';
  /* global mozIntl */

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
        if (['languagechange', 'moztimechange'].includes(reason)) {
          return true;
        }
        if (reason === 'timeformatchange') {
          return 'hour' in obj.options;
        }
        return false;
      }
    },
    mozdatetime: {
      create: function(options) {
        const customOptions = Object.assign({}, options);
        if (options.hour) {
          customOptions.hour12 = navigator.mozHour12;
        }
        return mozIntl.DateTimeFormat(
          navigator.languages,
          customOptions
        );
      },
      isAffected: function(obj, reason) {
        if (['languagechange', 'moztimechange'].includes(reason)) {
          return true;
        }
        if (reason === 'timeformatchange') {
          return 'hour' in obj.options;
        }
        return false;
      }
    },
    mozduration: {
      create: function(options) {
        return mozIntl.DurationFormat(
          navigator.languages,
          options
        );
      },
      isAffected: function(obj, reason) {
        return reason === 'languagechange';
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

      affectedObjects.forEach(obj =>
        obj.listeners.forEach(cb => affectedCallbacks.add(cb))
      );

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
      // This is a temporary hack to help handling l10n.js' event
      const affectedObjects = resetObjects(evt.type);

      if (evt.type === 'languagechange' && navigator.mozL10n) {
        // We will fire observers only on DOMLocalized
        // We're using DOMLocalized here instead of languagechange because
        // mozIntl formatters would restart before new language is loaded
        // which means they'd be using old strings
        //
        // Once we switch completely to l20n.js, we will remove this
        // limitation which will make IntlHelper useful without mozL10n API
        // We will only have to make sure that mozL10n reacted to
        // languagechange before we fired our observers here.
        waitOnDOMLocalized(() =>
          global.IntlHelper._fireObservers(affectedObjects)
        );
      } else {
        global.IntlHelper._fireObservers(affectedObjects);
      }
    },

    _resetObjectCache: function() {
      helperCache.clear();
    }
  };

  function waitOnDOMLocalized(cb) {
    const resolver = () => {
      document.removeEventListener('DOMRetranslated', resolver);
      window.removeEventListener('localized', resolver);
      cb();
    };
    document.addEventListener('DOMRetranslated', resolver, false);

    // Support for l10n.js until we can remove it
    window.addEventListener('localized', resolver, false);
  }

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
  window.addEventListener('moztimechange', global.IntlHelper, false);
})(this);
