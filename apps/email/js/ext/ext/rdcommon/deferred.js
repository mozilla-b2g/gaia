define(function() {

  var nextId = 1;
  var activeDeferreds = {};
  var unhandledRejectionHandler = null;

  /**
   * Simulate a Deferred in the style of the Q async library, so that
   * we don't need to depend on the full Q library. Tracks unhandled
   * rejections and unresolved deferreds for debugging.
   *
   * @param {String} name
   *   Optional name for debugging.
   */
  var Deferred = function(name) {
    var self = this;
    this.id = nextId++;
    this.name = name;
    this.stack = new Error().stack;
    this.promise = new Promise(function(resolve, reject) {
      self.resolve = function(val) {
        delete activeDeferreds[self.id];
        self.resolved = true;
        self.value = val;
        resolve(val);
      };
      self.reject = function(val) {
        self.promise.catch(function(e) {
          if (unhandledRejectionHandler) {
            unhandledRejectionHandler(e);
          }
        });
        delete activeDeferreds[self.id];
        self.rejected = true;
        self.value = val;
        reject(val);
      };
    });

    activeDeferreds[this.id] = this;

    this.value = null;
    this.resolved = false;
    this.rejected = false;
  };

  Deferred.prototype.toString = function() {
    return '<Deferred ' + (this.name || '') + '>';
  };

  Deferred.setUnhandledRejectionHandler = function(rejectionHandler) {
    unhandledRejectionHandler = rejectionHandler;
  };

  Deferred.getAllActiveDeferreds = function() {
    var vals = [];
    for (var key in activeDeferreds) {
      vals.push(activeDeferreds[key]);
    }
    return vals;
  }

  Deferred.clearActiveDeferreds = function() {
    activeDeferreds = {};
  }

  return Deferred;
});
