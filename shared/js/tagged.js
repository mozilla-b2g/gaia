'use strict';
/**
 * tagged.js is a simple library to help you escape HTML using template strings
 *
 * It's the counterpart to our eslint "no-unsafe-innerhtml" plugin that helps us
 * avoid unsafe coding practices.
 * A full write-up of the Hows and Whys are documented
 * for developers at
 *  https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation
 * with additional background information and design docs at
 *  https://wiki.mozilla.org/User:Fbraun/Gaia/SafeinnerHTMLRoadmap
 *
 */

var Tagged = {

  _entity: /[&<>"'/]/g,

  _entities: {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;',
    '/': '&#x2F;'
  },

  getEntity: function(s) {
    return Tagged._entities[s];
  },

  /**
   * Escapes HTML for all values in a tagged template string.
   */
  escapeHTML: function(strings, ...values) {
    var result = '';

    for (var i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        result += String(values[i]).replace(Tagged._entity, Tagged.getEntity);
      }
    }

    return result;
  },
  /**
   * Escapes HTML and returns a wrapped object to be used during DOM insertion
   */
  createSafeHTML: function(strings, ...values) {
    var escaped = Tagged.escapeHTML(strings, ...values);
    return {
      __html: escaped,
      toString: function() {
        return '[object WrappedHTMLObject]';
      },
      info: 'This is a wrapped HTML object. See https://developer.mozilla.or'+
        'g/en-US/Firefox_OS/Security/Security_Automation for more.'
    };
  },
  /**
   * Unwrap safe HTML created by createSafeHTML or a custom replacement that
   * underwent security review.
   */
  unwrapSafeHTML: function(htmlObject) {
    return htmlObject.__html;
  }
};
