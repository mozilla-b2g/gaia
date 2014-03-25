var fsPath = require('path');

//all require paths must be absolute -- use __dirname
var Agent = TestAgent,
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      paths: [fsPath.resolve(__dirname + '/../../../apps/'),
              fsPath.resolve(__dirname + '/../../../test_apps/')],
      strictMode: false,
      testDir: 'test/unit',
      libDir: 'js/',
      testSuffix: '_test.js'
    });

server.use(Apps.Suite, suite);
