/**
 * Simple coordination logic that might be better handled by promises, although
 * we probably have the edge in comprehensibility for now.
 **/

define(['exports'], function(exports) {

/**
 * Create multiple named callbacks whose results are aggregated and a single
 * callback invoked once all the callbacks have returned their result.  This
 * is intended to provide similar benefit to $Q.all in our non-promise world
 * while also possibly being more useful.
 *
 * Example:
 * @js{
 *   var callbacks = allbackMaker(['foo', 'bar'], function(aggrData) {
 *       console.log("Foo's result was", aggrData.foo);
 *       console.log("Bar's result was", aggrData.bar);
 *     });
 *   asyncFooFunc(callbacks.foo);
 *   asyncBarFunc(callbacks.bar);
 * }
 *
 * Protection against a callback being invoked multiple times is provided as
 * an anti-foot-shooting measure.  Timeout logic and other protection against
 * potential memory leaks is not currently provided, but could be.
 */
exports.allbackMaker = function allbackMaker(names, allDoneCallback) {
  var aggrData = {}, callbacks = {}, waitingFor = names.concat();

  names.forEach(function(name) {
    // (build a consistent shape for aggrData regardless of callback ordering)
    aggrData[name] = undefined;
    callbacks[name] = function anAllback(callbackResult) {
      var i = waitingFor.indexOf(name);
      if (i === -1) {
        console.error("Callback '" + name + "' fired multiple times!");
        throw new Error("Callback '" + name + "' fired multiple times!");
      }
      waitingFor.splice(i, 1);
      if (arguments.length > 1)
        aggrData[name] = arguments;
      else
        aggrData[name] = callbackResult;
      if (waitingFor.length === 0 && allDoneCallback)
        allDoneCallback(aggrData);
    };
  });

  return callbacks;
};


/**
 * A lightweight deferred 'run-all'-like construct for waiting for
 * multiple callbacks to finish executing, with a final completion
 * callback at the end. Neither promises nor Q provide a construct
 * quite like this; Q.all and Promise.all tend to either require all
 * promises to be created up front, or they return when the first
 * error occurs. This is designed to allow you to wait for an unknown
 * number of callbacks, with the knowledge that they're going to
 * execute anyway -- no sense trying to abort early.
 *
 * Results passed to each callback can be passed along to the final
 * result by adding a `name` parameter when calling latch.defer().
 *
 * Example usage:
 *
 * var latch = allback.latch();
 * setTimeout(latch.defer('timeout1'), 200);
 * var cb = latch.defer('timeout2');
 * cb('foo');
 * latch.then(function(results) {
 *   console.log(results.timeout2[0]); // => 'foo'
 * });
 *
 * The returned latch is an A+ Promises-compatible thennable, so you
 * can chain multiple callbacks to the latch.
 *
 * The promise will never fail; it will always succeed. Each
 * `.defer()` call can be passed a `name`; if a name is provided, that
 * callback's arguments will be made available as a key on the result
 * object.
 *
 * NOTE: The latch will not actually fire completion until you've
 * attached a callback handler. This way, you can create the latch
 * before you know how many callbacks you'll need; when you've called
 * .defer() as many times as necessary, you can call `then()` to
 * actually fire the completion function (when they have all
 * completed).
 */
exports.latch = function() {
  var ready = false;
  var deferred = {};
  var results = {};
  var count = 0;

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  function defer(name) {
    count++;
    var resolved = false;
    return function resolve() {
      if (resolved) {
        var err = new Error("You have already resolved this deferred!");
        // Exceptions aren't always readily visible, but this is a
        // serious error and needs to be addressed.
        console.error(err + '\n' + err.stack);
        throw err;
      }
      resolved = true;
      // 'name' might be the integer zero (among other integers) if
      // the callee is doing array processing, so we pass anything not
      // equalling null and undefined, even the poor falsey zero.
      if (name != null) {
        results[name] = Array.slice(arguments);
      }
      if (--count === 0) {
        setZeroTimeout(function() {
          deferred.resolve(results);
        });
      }
    };
  }
  var unlatch = defer();
  return {
    defer: defer,
    then: function () {
      var ret = deferred.promise.then.apply(deferred.promise, arguments);
      if (!ready) {
        ready = true;
        unlatch();
      }
      return ret;
    }
  };
}

}); // end define
