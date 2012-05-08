/**
 * MochaTask manager.
 * Used to provide generator yields for mocha test.
 */
var MochaTask = (function() {
  var current, done, errorHandler;

  return {

    /**
     * Starts a task this will
     * effect the global state of MochaTask.
     *
     *
     * @param {Function} generator generator function.
     * @param {Function} success success callback.
     * @param {Function} error error callback receives an Error instance.
     */
    start: function(generator, success, error) {
      current = generator;
      if (!current.next) {
        current = generator.call(this);
      }

      done = success;
      errorHandler = error;

      if (current && current.next) {
        current.next();
      }

      return this;
    },

    /**
     * Sends next value to the generator.
     * Function may be passed to functions
     * that normally require a callback.
     *
     *    yield setTimeout(100, MochaTask.next)
     *
     * If next is called with a value it will be passed
     * to the generators send method so you can use it to
     * create this kind of code.
     *
     * var responseText = yield magicXhrMethod('GET', url, Mocha.next);
     *
     * @param {Object} value object to pass to generator.
     */
    next: function(value) {
      try {
        current.send(value);
      } catch (e) {
        if (e instanceof StopIteration) {
          if (done)
            done();
          current = null;
          done = null;
        } else {
          if (errorHandler) {
            errorHandler(e);
          }

          errorHandler = null;
          current = null;
          done = null;
        }
      }
    }
  };
}());
