var fsPath = require('path');

//all require paths must be absolute -- use __dirname
var Agent = TestAgent,
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: fsPath.resolve(__dirname + '/../../apps/'),
      strictMode: false,
      testDir: 'test/unit',
      libDir: 'js/',
      testSuffix: '_test.js'
    });

server.use(Apps.Suite, suite);

