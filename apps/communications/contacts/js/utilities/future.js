// Copyright (C) 2013:
//    Alex Russell <slightlyoff@chromium.org>
//    Yehuda Katz
//
// Use of this source code is governed by
//    http://www.apache.org/licenses/LICENSE-2.0

// FIXME(slightlyoff):
//    - Document "npm test"
//    - Change global name from "Future" to something less conflicty
(function(global, browserGlobal, underTest) {
  "use strict";

  underTest = !!underTest;

//
// Async Utilities
//

// Borrowed from RSVP.js
  var async;

  var MutationObserver = browserGlobal.MutationObserver ||
    browserGlobal.WebKitMutationObserver;

  if (typeof process !== 'undefined' &&
    {}.toString.call(process) === '[object process]') {
    async = function(callback, binding) {
      process.nextTick(function() {
        callback.call(binding);
      });
    };
  } else if (MutationObserver) {
    var queue = [];

    var observer = new MutationObserver(function() {
      var toProcess = queue.slice();
      queue = [];

      toProcess.forEach(function(tuple) {
        var callback = tuple[0], binding = tuple[1];
        callback.call(binding);
      });
    });

    var element = document.createElement('div');
    observer.observe(element, { attributes: true });

    // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
    window.addEventListener('unload', function(){
      observer.disconnect();
      observer = null;
    });

    async = function(callback, binding) {
      queue.push([callback, binding]);
      element.setAttribute('drainQueue', 'drainQueue');
    };
  } else {
    async = function(callback, binding) {
      setTimeout(function() {
        callback.call(binding);
      }, 1);
    };
  }

//
// Object Model Utilities
//

// defineProperties utilities
  var _readOnlyProperty = function(v) {
    return {
      enumerable: true,
      configurable: false,
      get: v
    };
  };

  var _method = function(v, e, c, w) {
    return {
      enumerable:   !!(e || 0),
      configurable: !!(c || 1),
      writable:     !!(w || 1),
      value:           v || function() {}
    };
  };

  var _pseudoPrivate = function(v) { return _method(v, 0, 1, 0); };
  var _public = function(v) { return _method(v, 1); };

//
// Futures Utilities
//

  var isThenable = function(it) {
    // FIXME(slightlyoff): need a better/standard definition!
    return (
      !!it &&
        (typeof it.then == "function")
      );
  };

  var AlreadyResolved = function(name) {
    Error.call(this, name);
  };
  AlreadyResolved.prototype = Object.create(Error.prototype);

  var Backlog = function() {
    var bl = [];
    bl.pump = function(value) {
      async(function() {
        var l = bl.length;
        var x = 0;
        while(x < l) {
          x++;
          bl.shift()(value);
        }
      });
    };
    return bl;
  };

//
// Resolver Constuctor
//

  var Resolver = function(future,
                          acceptCallbacks,
                          rejectCallbacks,
                          setValue,
                          setError,
                          setState) {
    var isResolved = false;

    var resolver = this;
    var accept = function(value) {
      async(function() {
        setState("accepted");
        setValue(value);
        acceptCallbacks.pump(value);
      });
    };
    var reject = function(reason) {
      async(function() {
        setState("rejected");
        setError(reason);
        rejectCallbacks.pump(reason);
      });
    };
    var resolve = function(value) {
      if (isThenable(value)) {
        var funcName =  (typeof value.done == "function") ? "done" : "then";
        value[funcName](resolve, reject);
        return;
      }
      accept(value);
    };
    var ifNotResolved = function(func) {
      return function(value) {
        if (!isResolved) {
          isResolved = true;
          func(value);
        } else {
          if (typeof console != "undefined") {
            console.error("Cannot resolve a Future mutliple times.");
          }
        }
      }
    };

    // Indirectly resolves the Future, chaining any passed Future's resolution
    this.resolve = ifNotResolved(resolve);

    // Directly accepts the future, no matter what value's type is
    this.accept = ifNotResolved(accept);

    // Rejects the future
    this.reject = ifNotResolved(reject);

    this.cancel  = function() { resolver.reject(new Error("Cancel")); };
    this.timeout = function() { resolver.reject(new Error("Timeout")); };

    if (underTest) {
      Object.defineProperties(this, {
        _isResolved: _readOnlyProperty(function() { return isResolved; }),
      });
    }

    setState("pending");
  };

//
// Future Constuctor
//

  var Future = function(init) {
    var acceptCallbacks = new Backlog();
    var rejectCallbacks = new Backlog();
    var value;
    var error;
    var state = "pending";

    if (underTest) {
      Object.defineProperties(this, {
        _value: _readOnlyProperty(function() { return value; }),
        _error: _readOnlyProperty(function() { return error; }),
        _state: _readOnlyProperty(function() { return state; })
      });
    }

    Object.defineProperties(this, {
      _addAcceptCallback: _pseudoPrivate(
        function(cb) {
          acceptCallbacks.push(cb);
          if (state == "accepted") {
            acceptCallbacks.pump(value);
          }
        }
      ),
      _addRejectCallback: _pseudoPrivate(
        function(cb) {
          rejectCallbacks.push(cb);
          if (state == "rejected") {
            rejectCallbacks.pump(error);
          }
        }
      )
    });
    var r = new Resolver(this,
      acceptCallbacks, rejectCallbacks,
      function(v) { value = v; },
      function(e) { error = e; },
      function(s) { state = s; });
    try {
      if (init) { init(r); }
    } catch(e) {
      r.reject(e);
    }
  };

//
// Consructor
//

  var isCallback = function(any) {
    return (typeof any == "function");
  };

// Used in .then()
  var wrap = function(callback, resolver, disposition) {
    if (!isCallback(callback)) {
      // If we don't get a callback, we want to forward whatever resolution we get
      return resolver[disposition].bind(resolver);
    }

    return function() {
      try {
        var r = callback.apply(null, arguments);
        resolver.resolve(r);
      } catch(e) {
        // Exceptions reject the resolver
        resolver.reject(e);
      }
    };
  };

  var addCallbacks = function(onaccept, onreject, scope) {
    if (isCallback(onaccept)) {
      scope._addAcceptCallback(onaccept);
    }
    if (isCallback(onreject)) {
      scope._addRejectCallback(onreject);
    }
    return scope;
  };

//
// Prototype properties
//

  Future.prototype = Object.create(null, {
    "then": _public(function(onaccept, onreject) {
      // The logic here is:
      //    We return a new Future whose resolution merges with the return from
      //    onaccept() or onerror(). If onaccept() returns a Future, we forward
      //    the resolution of that future to the resolution of the returned
      //    Future.
      var f = this;
      return new Future(function(r) {
        addCallbacks(wrap(onaccept, r, "resolve"),
          wrap(onreject, r, "reject"), f);
      });
    }),
    "done": _public(function(onaccept, onreject) {
      return addCallbacks(onaccept, onreject, this);
    }),
    "catch": _public(function(onreject) {
      return addCallbacks(null, onreject, this);
    })
  });

//
// Statics
//

  Future.isThenable = function(any) {
    try {
      var f = any.then;
      if (typeof f == "function") {
        return true;
      }
    } catch (e) { /*squelch*/ }
    return false;
  };

  Future.some = function() {
    // TODO(slightyoff)
  };

  Future.any = function() {
    // TODO(slightyoff)
  };

  Future.when = function() {
    // TODO(slightyoff)
  };

//
// Export
//

  global.Future = Future;

})(this,
  (typeof window !== 'undefined') ? window : {},
  this.runningUnderTest||false);