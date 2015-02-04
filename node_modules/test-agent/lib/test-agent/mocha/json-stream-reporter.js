(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  if (typeof(window.TestAgent.Mocha) === 'undefined') {
    window.TestAgent.Mocha = {};
  }

  var Base = TestAgent.Mocha.ReporterBase,
      exports = window.TestAgent.Mocha;

  MochaReporter.console = window.console;
  MochaReporter.send = function mochaReporterSend() {};

  //TODO -- Buffer console.log calls

  function MochaReporter(runner) {
    Base.call(this, runner);

    var self = this,
        stats = this.stats,
        total = runner.total,
        indentation = -1,
        suiteTitle,
        currentTest;

    function consoleShim(type) {
      var args = Array.prototype.slice.call(arguments, 1),
          messages = args,
          stack = new Error().stack;

      if (stack) {
        // Re-organize the stack to exlude the above
        stack = stack.split('\n').map(function(e) {
          return e.trim().replace(/^at /, '');
        });

        stack.splice(0, 1);
        stack = stack.join('\n');
      }

      if (type === 'trace') {
        messages = [stack];
        type = 'log';
      }

      var logDetails = { messages: messages, stack: stack };

      if (MochaReporter.testAgentEnvId) {
        logDetails.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(
        JSON.stringify([type, logDetails])
      );
    };

    MochaReporter.console.debug = consoleShim.bind(null, 'log');
    MochaReporter.console.log = consoleShim.bind(null, 'log');
    MochaReporter.console.info = consoleShim.bind(null, 'info');
    MochaReporter.console.warn = consoleShim.bind(null, 'warn');
    MochaReporter.console.error = consoleShim.bind(null, 'error');
    MochaReporter.console.dir = consoleShim.bind(null, 'dir');
    MochaReporter.console.trace = consoleShim.bind(null, 'trace');

    runner.on('suite', function onSuite(suite) {
      indentation++;
      MochaReporter.send(
        JSON.stringify(
          ['suite', jsonExport(suite, { indentation: indentation })]
        )
      );
    });

    runner.on('suite end', function onSuiteEnd(suite) {
      MochaReporter.send(
        JSON.stringify(
          ['suite end', jsonExport(suite, { indentation: indentation })]
        )
      );
      indentation--;
    });

    runner.on('test', function onTest(test) {
      MochaReporter.send(JSON.stringify(['test', jsonExport(test)]));
    });

    runner.on('test end', function onTestEnd(test) {
      MochaReporter.send(JSON.stringify(['test end', jsonExport(test)]));
    });

    runner.on('start', function onStart() {
      var obj = {
        total: total
      };

      if (MochaReporter.testAgentEnvId) {
        obj.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(JSON.stringify(['start', obj]));
    });

    runner.on('pass', function onPass(test) {
      MochaReporter.send(JSON.stringify(['pass', jsonExport(test)]));
    });

    runner.on('fail', function onFail(test, err) {
      MochaReporter.send(
        JSON.stringify(
          ['fail', jsonExport(test, {err: TestAgent.exportError(err) })]
        )
      );
    });

    runner.on('end', function onEnd() {
      if (MochaReporter.testAgentEnvId) {
        self.stats.testAgentEnvId = MochaReporter.testAgentEnvId;
      }

      MochaReporter.send(JSON.stringify(['end', self.stats]));
    });
  }

  var exportKeys = [
    'title',
    'getTitle',
    'fullTitle',
    'root',
    'duration',
    'state',
    'type',
    'slow',
    'speed'
  ];

  function jsonExport(object, additional) {
    var result = {}, key;

    exportKeys.forEach(function(key) {
      var value;

      if(object.fn) {
        result.fn = object.fn.toString();
      }

      if (key in object) {
        value = object[key];

        if (typeof(value) === 'function') {
          result[key] = object[key]();
        } else {
          result[key] = value;
        }
      }
    });

    if (typeof(additional) !== 'undefined') {
      for (key in additional) {
        if (additional.hasOwnProperty(key)) {
          result[key] = additional[key];
        }
      }
    }

    if (MochaReporter.testAgentEnvId) {
      result.testAgentEnvId = MochaReporter.testAgentEnvId;
    }

    return result;
  }

  //export
  exports.JsonStreamReporter = MochaReporter;

}(this));

