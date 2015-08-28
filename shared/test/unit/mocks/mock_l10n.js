/* globals assert */

(function(exports) {
  'use strict';

  exports.MockL10n = {

    readyState: 'complete',

    get: stringify,
    _stringify: stringify,

    formatValue: function(id, args) {
      return Promise.resolve(stringify(id, args || ''));
    },

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

    qps: {
      'qps-ploc': {
        id: 'qps-ploc',
        name: 'Pseudo English',
        translate: stringify
      }
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
    localeFormat: stringify,
    fromNow: stringify,
    relativeParts: stringify
  };

  /**
   * Helper used to check that an element has been properly localized. This
   * supports all the patterns described on MDN for localization best
   * practices:
   * - If 'expectedL10n' is a string it will check that the node's
   *   'data-l10n-id' attribute is set and matches that id.
   * - If 'expectedL10n' is an object then if it as an id and an args field it
   *   will check if the node's 'data-l10n-id' and 'data-l10n-args' fields
   *   match them.
   * - If 'expectedL10n' is an object with a 'raw' field it will check that the
   *   node doesn't have a 'data-l10n-id' attribute and its 'textContent' field
   *   matches the'raw' field.
   * - If 'expectedL10n' is an object with am 'html' field it will check that
   *   the node doesn't have a 'data-l10n-id' attribute and its 'innerHTML'
   *   field matches the'html' field.
   */
  exports.l10nAssert = function(node, expectedL10n) {
    if (typeof expectedL10n === 'string') {
      assert.isTrue(node.hasAttribute('data-l10n-id'));
      assert.equal(node.getAttribute('data-l10n-id'), expectedL10n);
    } else if (expectedL10n.raw) {
      assert.isFalse(node.hasAttribute('data-l10n-id'));
      assert.equal(node.textContent, expectedL10n.raw);
    } else if (expectedL10n.html) {
      assert.isFalse(node.hasAttribute('data-l10n-id'));
      assert.equal(node.innerHTML, expectedL10n.html);
    } else if (expectedL10n.id) {
      assert.isTrue(node.hasAttribute('data-l10n-id'));
      assert.equal(node.getAttribute('data-l10n-id'), expectedL10n.id); 
      if (expectedL10n.args) {
        assert.isTrue(node.hasAttribute('data-l10n-args'));
        assert.deepEqual(
          JSON.parse(node.getAttribute('data-l10n-id')),
          expectedL10n.args
        );
      }
    }
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
