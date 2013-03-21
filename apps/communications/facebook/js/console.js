var _ConsoleObject = function() {

  function getString(a) {
    var out = '';
    for (var c = 0; c < a.length; c++) {
      out += a[c];
    }

    return out;
  }

  this.error = function() {

    self.postMessage({
      type: 'error',
      data: getString(arguments)
    }, fb.CONTACTS_APP_ORIGIN);
  };

  this.log = function() {
    self.postMessage({
      type: 'trace',
      data: getString(arguments)
    }, fb.CONTACTS_APP_ORIGIN);
  };
};

this.console = this.console || new _ConsoleObject();
