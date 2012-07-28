(function(exports) {

  var ErrorHandle = {},
      root = _ROOT,
      rootName = '/',
      regex = {};


  function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  function parseStackLine(line) {
    var parts = regex.stackLine.exec(line),
        lineno,
        file,
        method;


    if (parts) {
      method = parts[1];
      file = parts[2];
      lineno = parts[3];

      if (method === '') {
        method = 'anon';
      }

      return [
        '    at ',
        method,
        ' (' + file + ':' + lineno + ')'
      ].join('');

      return line;

    } else {
      return line;
    }
  };

  regex.stackLine = /(.*)@(.*)\:([0-9]+)/;
  regex.root = new RegExp(escapeRegex(root), 'g');
  regex.file = new RegExp(escapeRegex('file://'), 'g');
  regex.xpcWindpw = new RegExp(escapeRegex(
    rootName + 'lib/loader.js' +
    ' -> ' + rootName +
    'lib/window/import-scripts.js -> '
  ));

  /**
   * Creates a v8/chrome stack trace
   * from an xpcom one.
   *
   *
   * @param {Error} error used to create stack.
   */
  ErrorHandle.format = function(error) {
    var lines = error.stack.split('\n'),
        result = [],
        message;

    message = error.constructor.name + ': ' + error.message;

    result.push(message);

    lines.forEach(function(line) {
      var stackData;

      line = line.replace(regex.file, '').replace(regex.root, rootName);
      line = line.replace(regex.xpcWindpw, '');

      //trim out the xpcwindow stuff
      result.push(parseStackLine(line));
    });

    return result.join('\n');
  };

  window.xpcError = ErrorHandle;

}(window));
