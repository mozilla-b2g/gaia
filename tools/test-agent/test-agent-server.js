var fsPath = require('path');

//all require paths must be absolute -- use __dirname
var Agent = require('test-agent'),
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: fsPath.resolve(__dirname + '/../../'),
      testDir: 'test/',
      libDir: 'lib/'
    });

server.use(Apps.Suite, suite);

