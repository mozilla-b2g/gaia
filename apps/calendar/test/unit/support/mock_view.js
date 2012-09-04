Calendar.ns('Test').MockView = (function() {

  function View(options) {
    var self = this;
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.called = 1;
    this.args = arguments;

    this.onactive = function() {
      self.activeWith = arguments;
      self.active = true;
    };

    this.oninactive = function() {
      self.inactiveWith = arguments;
      self.active = false;
    };
  }

  return View;

}());
