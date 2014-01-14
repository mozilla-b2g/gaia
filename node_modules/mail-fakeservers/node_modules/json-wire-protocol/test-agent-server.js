//all require paths must be absolute -- use __dirname
var Agent = require('test-agent'),
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: __dirname,
      testDir: 'test/',
      libDir: 'lib/',
      testSuffix: '-test.js'
    });

server.use(Apps.Suite, suite);
