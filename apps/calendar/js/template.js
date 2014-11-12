define(function(require, exports, module) {
'use strict';

var POSSIBLE_HTML = /[&<>"'`]/;

var span = document.createElement('span');

function create(templates) {
  var key, result = {};

  for (key in templates) {
    if (templates.hasOwnProperty(key)) {
      result[key] = new Template(templates[key]);
    }
  }

  return result;
}

function Template(fn) {
  this.template = fn;
}
module.exports = Template;

Template.prototype = {
  arg: function(key) {
    if (typeof(this.data) === 'undefined') {
      return '';
    } else if (typeof(this.data) !== 'object') {
      return this.data;
    }

    return this.data[key];
  },

  h: function(a) {
    var arg = this.arg(a);
    // accept anything that can be converted into a string and we make sure
    // the only falsy values that are converted into empty strings are
    // null/undefined to avoid mistakes
    arg = arg == null ? '' : String(arg);

    //only escape bad looking stuff saves
    //a ton of time
    if (POSSIBLE_HTML.test(arg)) {
      span.textContent = arg;
      return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    } else {
      return arg;
    }
  },

  s: function(a) {
    var arg = this.arg(a);
    return String((arg || ''));
  },

  bool: function(key, onTrue) {
    if (this.data[key]) {
      return onTrue;
    } else {
      return '';
    }
  },

  l10n: function(key, prefix) {
    var value = this.arg(key);

    if (prefix) {
      value = prefix + value;
    }
    return navigator.mozL10n.get(value);
  },

  l10nId: function(a) {
    return this.s(a).replace(/\s/g, '-');
  },

  /**
   * Renders template with given slots.
   *
   * @param {Object} object key, value pairs for template.
   */
  render: function(data) {
    this.data = data;
    return this.template();
  },

  /**
   * Renders template multiple times
   *
   * @param {Array} objects object details to render.
   * @param {String} [join] optional join argument will join the array.
   * @return {String|Array} String if join argument is given array otherwise.
   */
  renderEach: function(objects, join) {
    var i = 0, len = objects.length,
        result = [];

    for (; i < len; i++) {
      result.push(this.render(objects[i]));
    }

    if (typeof(join) !== 'undefined') {
      return result.join(join);
    }

    return result;
  }
};

Template.create = create;

});
