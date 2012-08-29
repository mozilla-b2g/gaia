function enhance(mocha) {
  //Hack to format errors
  mocha.reporters.Base.list = function(failures) {
    failures.forEach(function(test, i) {
      // format
      var fmt = this.color('error title', '  %s) %s:\n') +
          this.color('error message', '     %s') +
          this.color('error stack', '\n%s\n');

      // msg
      var err = test.err,
          message = err.message || '',
          stack = window.xpcError.format(err),
          index = stack.indexOf(message) + message.length,
          msg = stack.slice(0, index),
          actual = err.actual,
          expected = err.expected;

      // actual / expected diff
      if ('string' == typeof actual && 'string' == typeof expected) {
        var len = Math.max(actual.length, expected.length);

        if (len < 20) msg = errorDiff(err, 'Chars');
        else msg = errorDiff(err, 'Words');

        // linenos
        var lines = msg.split('\n');
        if (lines.length > 4) {
          var width = String(lines.length).length;
          msg = lines.map(function(str, i) {
            return pad(++i, width) + ' |' + ' ' + str;
          }).join('\n');
        }

        msg = [
          '\n', this.color('diff removed', 'actual'),
          ' ', this.color('diff added', 'expected'),
          '\n\n',
          msg,
          '\n'
        ].join('');

        // indent
        msg = msg.replace(/^/gm, '      ');

        fmt = this.color('error title', '  %s) %s:\n%s') +
              this.color('error stack', '\n%s\n');
      }

      // indent stack trace without msg
      stack = stack.slice(index ? index + 1 : index)
        .replace(/^/gm, '  ');

      console.error(fmt, (i + 1), test.fullTitle(), msg, stack);
    }.bind(this));

  };
}

module.exports.enhance = enhance;
