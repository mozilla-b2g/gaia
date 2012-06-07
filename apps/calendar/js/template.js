(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  var FORMAT_REGEX = /%([0-9]*)?([a-z]){1,1}/g,
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
      if (arg.match(POSSIBLE_HTML)) {
        span.textContent = arg;
        return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
      } else {
        return arg.toString();
      }

    }
  };

  Template.prototype = {
    _compiled: null,

    compile: function(str) {
      var i = 0, fnStr, fn;

      str = str.replace(/\"/g, '\\"');
      fn = 'var h, a; h = Calendar.Template.handlers;';


      fnStr = str.replace(FORMAT_REGEX, function(match, pos, type) {
        var index;
        if (!pos || pos === '') {
          pos = i++;
        }

        index = parseInt(pos, 10);

        if (type === 's') {
          return '" + String(arguments[' + index + ']) + "';
        } else {
          return '" + h["' + type + '"](arguments[' + index + ']) + "';
        }
      });

      return new Function(fn + 'return "' + fnStr + '"');
    },

    render: function(args) {
      this.render = this.compile(this.template);
      return this.render.apply(this, arguments);
    }

  };


  Template.create = create;
  Calendar.Template = Template;

}(this));
