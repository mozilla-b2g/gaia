var ServiceSupport = (function() {

  var support = testSupport.calendar;

  function request(file, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/test/unit/' + file + '?' + Date.now(), true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
          cb(new Error('file not found or other error (' + file + ')', xhr));
        } else {
          cb(null, xhr.responseText);
        }
      }
    };
    xhr.send(null);
  }

  function camelize(string) {
    var out = string.replace(/(?:^|[-_])(\w)/g, function(_, c) {
      return c ? c.toUpperCase() : '';
    });

    return out[0].toLowerCase() + out.slice(1);
  }

  const ICAL_ROOT = 'fixtures/caldav/ical/';

  var Handlers = {

    /**
     * Load and parse an ical sample
     *
     * @param {String} file location of ical file.
     * @param {Function} node style callback: err, contents.
     */
    ical: function icalLoader(file, callback) {
      request(ICAL_ROOT + file + '.ics', function(err, text) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, text);
      });
    }
  };

  function Fixtures(type) {
    var pending = 0;
    var self = this;
    var handler = Handlers[type];

    function next() {
      if (!(--pending)) {
        if (self._error) {
          throw self._error;
        }
        self.onready();
      }
    };

    this.load = function loadFixture(file) {
      pending++;
      handler(file, function(err, contents) {
        if (err) {
          self._error = err;
        } else {
          self[camelize(file)] = contents;
        }
        next();
      });
    };

    return this;
  }

  var Helper = {
    Fixtures: Fixtures,

    _originalExpansionLimit: null,

    resetExpansionLimit: function() {
      if (!Helper._originalExpansionLimit) {
          Calendar.Service.IcalRecurExpansion.forEachLimit =
            Helper._originalExpansionLimit;
      }
    },

    setExpansionLimit: function(newLimit) {
      if (!Helper._originalExpansionLimit) {
        Helper._originalExpansionLimit =
          Calendar.Service.IcalRecurExpansion.forEachLimit;
      }

      Calendar.Service.IcalRecurExpansion.forEachLimit = newLimit;
    }
  };

  return Helper;

}());
