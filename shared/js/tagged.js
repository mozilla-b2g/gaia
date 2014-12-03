'use strict';

/**
 * tagged.js is a simple library to help you manage tagged template strings.
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
  }
};
