var fsPath = require('path');

//all require paths must be absolute -- use __dirname
var Agent = TestAgent,
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: fsPath.resolve(__dirname + '/../../../'),
      includeDirs: ['apps/', 'test_apps/'],
      strictMode: false,
      testDir: 'test/unit',
      libDir: 'js/',
      testSuffix: '_test.js',
      // Blacklist can pass array of relative paths to skip
      // relative path must be included if includeDirs is given
      blacklist: []
    });

server.use(Apps.Suite, suite);
