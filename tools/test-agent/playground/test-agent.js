var TestAgent = require('../lib/test-agent');

agent = new TestAgent({
  testOutputFile: __dirname + '/test.out',
  verbose: false
});

agent.start();

setTimeout(function() {
  agent.test(function() {
    agent.stop();
    process.exit(agent.exitStatus);
  });
}, 3100);
