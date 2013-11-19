(function(global) {
  'use strict'

  function WorkerRouterClient(worker) {
    this.nextId = 0;
    this.worker = worker;
    this.requests = new Map();

    console.log(this.worker.port);
    this.worker.port.onmessage = this.handleMessage.bind(this);
  }

  WorkerRouterClient.prototype = {
    handleMessage: function(evt) {
      var data = evt.data,
          id = data.shift();

      var request = this.requests.get(id);
      request.apply(request, data);
    },

    request: function() {
      var id = this.nextId++;
      var args = Array.slice(arguments);
      var callback = args.pop();
      args.unshift(id);

      // send the request to the worker
      this.worker.port.postMessage(args);

      // XXX: this is a perfect spot for a readable stream
      this.requests.set(id, callback);
    }
  };

  global.WorkerRouterClient = WorkerRouterClient;
}(this));
