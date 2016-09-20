!((define)=>{define((require,exports,module)=>{

  /**
   * Logger
   * @type {Function}
   * @const
   */
  const debug = 1 ? function(arg1, ...args) {
    var type = `[${self.constructor.name}][${location.pathname}]`;
    console.log(`[DisposableClient]${type} - "${arg1}"`, ...args);
  } : () => {};

  /**
   * Exports
   */
  module.exports = (client) => {
    var pendingOperationManager = {
      operations: new Set(),
      registerOperation(operation) {
        operation = operation.then(
          () => this.operations.delete(operation),
          () => this.operations.delete(operation)
        );
        this.operations.add(operation);
      }
    };

    var originalMethod = client.method;
    client.method = function(...args) {
      var methodPromise = originalMethod.apply(client, args);
      pendingOperationManager.registerOperation(methodPromise);
      return methodPromise;
    };

    if (client.stream) {
      var originalStream = client.stream;
      client.stream = function(...args) {
        var stream = originalStream.apply(client, args);
        pendingOperationManager.registerOperation(stream.closed);
        return stream;
      };
    }

    client.whenIdle = function() {
      debug(
        'Number of pending operations to complete',
        pendingOperationManager.operations.size
      );

      return Promise.all(pendingOperationManager.operations);
    };

    client.requestServiceDisposal = function() {
      return client.method('@@requestDisposal', client.id);
    };
  };
});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof
  module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};
  c(n=>w[n],m.exports,m);w[n]=m.exports;};})('disposableClient',this));
