(function(exports) {
  'use strict';

  exports.MockL10n = {

    get: stringify,

    // XXX Remove in https://bugzil.la/1020136
    translate: function() {},

    translateFragment: function() {},

    // XXX Remove in https://bugzil.la/1020137
    localize: function(element, id, args) {
      if (id) {
        element.setAttribute('data-l10n-id', id);
      } else {
        element.removeAttribute('data-l10n-id');
        element.removeAttribute('data-l10n-args');
        element.textContent = '';
      }
      if (args) {
        element.setAttribute('data-l10n-args', JSON.stringify(args));
      } else {
        element.removeAttribute('data-l10n-args');
      }
      element.textContent = id + (args ? JSON.stringify(args) : '');
    },

    setAttributes: function(element, id, args) {
      element.setAttribute('data-l10n-id', id);
      if (args) {
        element.setAttribute('data-l10n-args', JSON.stringify(args));
      }
    },

    getAttributes: function(element) {
      return {
        id: element.getAttribute('data-l10n-id'),
        args: JSON.parse(element.getAttribute('data-l10n-args'))
      };
    },

    ready: function(handler) {
      setTimeout(handler);
    },

    once: function(handler) {
      setTimeout(handler);
    },

    language: {
      code: 'en-US',
      direction: 'ltr'
    },

    DateTimeFormat: function() {
      // Support navigator.mozL10n.DateTimeFormat() without new the object.
      if (!this.localeFormat) {
        var localeFormat = function mockLocaleFormat(time, strFormat) {
          return '' + time;
        };
        return {
          localeFormat: localeFormat
        };
      }
    }
  };

  // Defining methods on the prototype allows to spy on them in tests
  exports.MockL10n.DateTimeFormat.prototype = {
    localeDateString: stringify,
    localeTimeString: stringify,
    localeString: stringify,
    localeFormat: stringify,
    fromNow: stringify,
    relativeParts: stringify
  };

  function stringify() {
    return Array.prototype.reduce.call(arguments, function(prev, cur) {
      if (typeof cur === 'object') {
        cur = JSON.stringify(cur);
      }
      return prev + cur;
    }, '');
  }

}(this));
