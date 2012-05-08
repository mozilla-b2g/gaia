var Marionette = require('marionette-client'),
    fsPath = require('path');

var url = process.argv[3] || 'http://test-agent.trunk.gaiamobile.org/';

/** exports */
module.exports = exports = {

  _closeSession: function() {
    this.client.deleteSession(function() {});
  },

  _loadTestAgent: function() {
    var client = this.client,
        agent = this.agent,
        self = this;

    client.startSession(function() {
      client.goUrl(url, function() {
        agent.test('XUnit', function() {
          agent.stop();
          process.exit(agent.exitStatus);
        });
        self._closeSession();
      });
    });
  },

  run: function() {
    var Agent = require('../test-agent'),
        self = this,
        outputFile = fsPath.resolve(__dirname + '../../../../../test-output.xml'),
        agent = this.agent = new Agent({ testOutputFile: outputFile }),
        backend = new Marionette.Drivers.Tcp();

    agent.start({
      verbose: true
    });

    backend.connect(function() {
      self.client = new Marionette.Client(backend);
      self._loadTestAgent();
    });
  }

};
