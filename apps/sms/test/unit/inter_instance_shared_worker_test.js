'use strict';

suite('InterInstanceSharedWorker >', function() {
  var workerContext;
  var ports = [];

  function createPortStub() {
    var port = {
      addEventListener: sinon.stub(),
      removeEventListener: () => {},
      postMessage: sinon.stub(),
      start: () => {}
    };
    ports.push(port);
    return port;
  }

  suiteSetup(function(done) {
    workerContext = window.self = {
      addEventListener: sinon.stub()
    };
    require('/js/iac/shared_worker.js', done);
  });

  suiteTeardown(function() {
    delete window.self;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    // Close all ports
    while (ports.length) {
      var port = ports.pop();
      port.addEventListener.withArgs('message').yield({
        target: port,
        data: { name: 'closed' }
      });
    }
  });

  test('does not re-broadcast event to the same port', function() {
    var port1 = createPortStub();
    var port2 = createPortStub();

    workerContext.addEventListener.withArgs('connect').yield({
      ports: [port1]
    });
    port1.addEventListener.withArgs('message').yield({
      target: port1,
      data: { key: 'value' }
    });

    sinon.assert.notCalled(port1.postMessage);

    // Make second connection
    workerContext.addEventListener.withArgs('connect').yield({
      ports: [port2]
    });
    port1.addEventListener.withArgs('message').yield({
      target: port1,
      data: { key: 'value' }
    });

    sinon.assert.notCalled(port1.postMessage);
    sinon.assert.calledWith(port2.postMessage, { key: 'value' });
    port2.postMessage.reset();

    port2.addEventListener.withArgs('message').yield({
      target: port2,
      data: { key: 'value' }
    });

    sinon.assert.notCalled(port2.postMessage);
    sinon.assert.calledWith(port1.postMessage, { key: 'value' });
  });

  test('disconnects from port on "closed" message', function() {
    var port1 = createPortStub();
    var port2 = createPortStub();

    workerContext.addEventListener.withArgs('connect').yield({
      ports: [port1]
    });
    workerContext.addEventListener.withArgs('connect').yield({
      ports: [port2]
    });

    port1.addEventListener.withArgs('message').yield({
      target: port1,
      data: { key: 'value' }
    });

    sinon.assert.notCalled(port1.postMessage);
    sinon.assert.calledWith(port2.postMessage, { key: 'value' });
    port2.postMessage.reset();

    // Close port
    port2.addEventListener.withArgs('message').yield({
      target: port2,
      data: { name: 'closed' }
    });
    sinon.assert.notCalled(port1.postMessage);
    sinon.assert.notCalled(port2.postMessage);

    port1.addEventListener.withArgs('message').yield({
      target: port1,
      data: { key: 'value' }
    });

    sinon.assert.notCalled(port1.postMessage);
    sinon.assert.notCalled(port2.postMessage);
  });

  test('runs cleanup in case of lots of connected ports', function() {
    var ports = Array.from({ length: 3 }, () => createPortStub());

    ports.forEach((port) => {
      workerContext.addEventListener.withArgs('connect').yield({
        ports: [port]
      });
    });

    // If we have less or equal then 5 active ports, cleanup shouldn't be run
    ports.forEach((port) => sinon.assert.notCalled(port.postMessage));

    var newPort = createPortStub();
    workerContext.addEventListener.withArgs('connect').yield({
      ports: [newPort]
    });

    // We shouldn't ping just connected port
    sinon.assert.notCalled(newPort.postMessage);

    ports.forEach((port) => {
      sinon.assert.calledWith(port.postMessage, { name: 'ping' });
      port.postMessage.reset();
    });

    // Let's say first two ports are still alive, the rest are dead
    var alivePorts = ports.slice(0, 2);
    var deadPorts = ports.slice(2);
    alivePorts.forEach((port) => {
      port.addEventListener.withArgs('message').yield({
        target: port,
        data: { name: 'pong' }
      });
    });

    this.sinon.clock.tick(3000);

    // Only alive ports should react on new message
    newPort.addEventListener.withArgs('message').yield({
      target: newPort,
      data: { key: 'value' }
    });

    alivePorts.forEach((port) => {
      sinon.assert.calledWith(port.postMessage, { key: 'value' });
    });
    deadPorts.forEach((port) => sinon.assert.notCalled(port.postMessage));
  });
});
