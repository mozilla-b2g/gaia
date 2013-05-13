(function(window) {

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var FF_STACK_LINE = /(\w+)?\@(.*):(\d+)/;
  var TIME_REGEX = /\?time\=(\d+)/g;

  /**
   * Returns a formatted stack trace.
   *
   * @param {String} error error inst Formats a stacktrace.
   * @return {String} stack trace.
   */
  window.TestAgent.formatStack = function formatStack(err) {
    //split stack into lines
    var lines,
        stack = err.stack,
        lineNo,
        i = 0,
        matches,
        stackFunc,
        errType,
        buffer = '',
        stackFile;


    if (!err.stack) {
      return err.stack;
    }


    errType = err.type || err.constructor.name || 'Error:';

    stack = stack.replace(TIME_REGEX, '');
    lines = stack.split('\n');

    if (lines[0].match(FF_STACK_LINE)) {
      buffer += errType + ': ' + err.message + '\n';
      //we are in a firefox stack trace
      for (i; i < lines.length; i++) {
        matches = FF_STACK_LINE.exec(lines[i]);
        if (!matches) {
          continue;
        }
        stackFunc = matches[1] || '(anonymous)';
        stackFile = matches[2] || '';
        lineNo = matches[3] || '';

        buffer += '    at ' + stackFunc +
                 ' (' + stackFile + ':' + lineNo + ')\n';
      }

      stack = buffer;
    }

    return stack;
  };

  /**
   * Accepts an instance of error and
   * creates a object that can be sent
   * to the test agent server to be used
   * in error reporting.
   *
   *
   * @param {Error|Object} err error instance.
   */
  window.TestAgent.exportError = function(err) {
    var errorObject = {};

    errorObject.stack = this.formatStack(err) || '';
    errorObject.message = err.message || err.toString();
    errorObject.type = err.type || 'Error';
    errorObject.constructorName = err.constructor.name || '';
    errorObject.expected = err.expected || null;
    errorObject.actual = err.actual || null;

    if (typeof(err) === 'object' && 'uncaught' in err) {
      errorObject.uncaught = err.uncaught;
    }

    return errorObject;
  };

}(this));
