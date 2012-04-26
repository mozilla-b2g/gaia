var fsPath = require('path');

//all require paths must be absolute -- use __dirname
var Agent = TestAgent,
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: fsPath.resolve(__dirname + '/../../apps/'),
      strictMode: false,
      testDir: 'test/',
      libDir: 'js/'
    });

server.use(Apps.Suite, suite);

