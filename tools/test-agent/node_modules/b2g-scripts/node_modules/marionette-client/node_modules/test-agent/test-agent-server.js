//all require paths must be absolute -- use __dirname
var Agent = require(__dirname + '/lib/node/index'),
    Apps = Agent.server,
    Suite = Agent.Suite,
    suite = new Suite({
      path: __dirname,
      testDir: 'test/test-agent',
      libDir: 'lib/test-agent'
    });

server.use(Apps.Suite, suite);
