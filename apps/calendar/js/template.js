(function(window) {
  var FORMAT_REGEX;
  FORMAT_REGEX = new RegExp('\\{([a-zA-Z0-9\\-\\_\\.]+)\\|?' +
                           '([a-z0-9A-Z]+)?' +
                           '(=([a-z-A-Z0-9\\-_ ]+))?\\}', 'g');

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

  function Template(str) {
    this.template = str;
  }

  Template.handlers = {

    'h': function(arg) {
      //only escape bad looking stuff saves
      //a ton of time
      if (POSSIBLE_HTML.test(arg)) {
        span.textContent = arg;
        return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
      } else {
        return arg.toString();
      }
    },

    bool: function(value, onTrue) {
      if (value) {
        return onTrue;
      } else {
        return '';
      }
    },

    'l10n': function(name, prefix) {
      if (prefix) {
        name = prefix + name;
      }
      return navigator.mozL10n.get(name);
    }

  };

  Template.prototype = {

    compile: function(str) {
      // Split the template string with template placeholders
      // the resulting array is a mix of plain text string
      // and placeholder pieces.
      var chunks = str.split(FORMAT_REGEX);
      return this.processTemplate.bind(this, chunks);
    },

    processTemplate: function processTemplate(chunks, a) {
      if (typeof(a) === 'undefined') {
        a = {};
      } else if (typeof(a) !== 'object') {
        a = { 'value': a };
      }
      var processPlaceholder = this.processPlaceholder.bind(null,
                                            Calendar.Template.handlers,
                                            a);
      var str = [];
      for (var i = 0; i < chunks.length; i++) {
        // Append plain text piece of string
        str.push(chunks[i]);
        // Thanks to `str.split(FORMAT_REGEX)`, `chunks`
        // contains non-placeholder piece of the template
        // followed by the Regexp matching placeholders.
        // FORMAT_REGEX has 4 internal matches.
        // So the next 4 items are FORMAT_REGEX matches.
        if (i < chunks.length-4) {
          var matches = chunks.slice(i+1, i+5);
          var placeholder = processPlaceholder.apply(null,
                                                     matches);
          // Append processed placeholder
          str.push(placeholder);
          i += 4;
        }
      }
      return str.join('');
    },

    processPlaceholder: function processPlaceholder(handlers, a, name, type,
                                                    wrap, value) {
      if (!type) {
        type = 'h';
      }

      if (type === 's') {
        return String((a[name] || ""));
      } else {
        if (value) {
          return handlers[type](a[name] || "", value || '');
        } else {
          return handlers[type](a[name] || "");
        }
      }
    },

    /**
     * Renders template with given slots.
     *
     * @param {Object} object key, value pairs for template.
     */
    render: function() {
      this.render = this.compile(this.template);
      return this.render.apply(this, arguments);
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
  Calendar.Template = Template;

}(this));
