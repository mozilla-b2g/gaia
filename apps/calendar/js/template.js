(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  var FORMAT_REGEX = /\{([a-zA-Z0-9\-\_\.]+)\|?([a-z]{1,1})?\}/g,
      POSSIBLE_HTML = /[&<>"'`]/,
      BAD_CHARS = /&(?!\w+;)|[<>"'`]/g,
      span = document.createElement('span');

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

    }
  };

  Template.prototype = {
    DEFAULT_KEY: 'value',
    QUOTE: /"/g,
    NEWLINES: /\n/g,

    _compiled: null,

    compile: function(str) {
      var i = 0, fnStr, fn,
          fnInst = '';

      str = str.replace(this.QUOTE, '\\"');
      str = str.replace(this.NEWLINES, '\\n');


      fn = 'var h = Calendar.Template.handlers;';

      fn += 'if (typeof(a) === "undefined") {';
        fn += 'a = {};';
      fn += '} else if(typeof(a) !== "object") {';
        fn += 'a = {"' + this.DEFAULT_KEY + '": a };';
      fn += '}';

      fnStr = str.replace(FORMAT_REGEX, function(match, name, type) {
        if (type === '') {
          type = 'h';
        }

        if (type === 's') {
          return '" + String((a["' + name + '"] || "")) + "';
        } else {
          return '" + h["' + type + '"]((a["' + name + '"] || "")) + "';
        }

      });

      fnStr = fn + 'return "' + fnStr + '";';

      return new Function('a', fnStr);
    },

    render: function(args) {
      this.render = this.compile(this.template);
      return this.render.apply(this, arguments);
    },

    renderEach: function(args) {
      var i = 0, len = args.length,
          result = [];

      for (; i < len; i++) {
        result.push(this.render(args[i]));
      }

      return result;
    }

  };


  Template.create = create;
  Calendar.Template = Template;

}(this));
