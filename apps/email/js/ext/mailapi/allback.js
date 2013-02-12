/**
 * Simple coordination logic that might be better handled by promises, although
 * we probably have the edge in comprehensibility for now.
 **/

define('mailapi/allback',
  [
    'exports'
  ],
  function(
    exports
  ) {

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

}); // end define
