/**
 * REQUIRES: responder, mocha-test-events
 *
 * Provides growl enhancement for server.
 * Will growl a notification each time a test
 * passes/fails
 */
function Growl() {}

Growl.prototype = {

  notify: require('growl'),

  images: {
    fail: __dirname + '/../../../images/error.png',
    pass: __dirname + '/../../../images/ok.png'
  },

  enhance: function enhance(server) {
    server.on('test runner end', this.reportOnTests.bind(this, server));
    server.on('error', this.reportOnError.bind(this, server));
  },

  reportOnError: function reportOnError(server, data) {
    var file = data.filename,
        line = data.lineno,
        message = data.message,
        details,
        notification;

    notification = [
      message, 'in file',
      file, '#' + line
    ].join(' ');

    this.notify(
      notification, {
        title: 'Syntax Error',
        image: this.images.fail
      }
    );
  },

  reportOnTests: function reportOnTests(server, proxy) {
    var notify = this.notify,
        images = this.images,
        runner = proxy.runner,
        reporter = proxy.reporter,
        stats = reporter.stats;

    if (stats.failures) {
      var msg = stats.failures + ' of ' + runner.tests + ' tests failed';
      notify(msg, { title: 'Failed', image: images.fail });
    } else {
      notify(stats.passes + ' tests passed in ' + stats.duration + 'ms', {
          title: 'Passed',
          image: images.pass
      });
    }
  }


};


module.exports = exports = Growl;
