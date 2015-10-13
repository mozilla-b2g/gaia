!((define)=>{define((require,exports,module)=>{

  /**
   * Logger
   * @type {Function}
   * @const
   */
  const debug = 0 ? function(arg1, ...args) {
    var type = `[${self.constructor.name}][${location.pathname}]`;
    console.log(`[FinalizeClient]${type} - "${arg1}"`, ...args);
  } : () => {};

  const priv = {
    pendingOperations: Symbol('pendingOperations'),
    registerOperation: Symbol('registerOperation'),
    method: Symbol('method'),
    stream: Symbol('stream')
  };

  /**
   * Exports
   */

  module.exports = (client) => {
    client[priv.pendingOperations] = new Set();

    client[priv.method] = client.method.bind(client);
    client.method = function(...args) {
      var methodPromise = this[priv.method](...args);

      this[priv.registerOperation](methodPromise);

      return methodPromise;
    };

    if (client.stream) {
      client[priv.stream] = client.stream.bind(client);
      client.stream = function(...args) {
        var stream = this[priv.stream](...args);

        this[priv.registerOperation](stream.closed);

        return stream;
      };
    }

    client[priv.registerOperation] = function(operation) {
      var pendingOperations = this[priv.pendingOperations];
      pendingOperations.add(
        operation.then((result) => {
          pendingOperations.delete(operation);
          return result;
        }, (e) => {
          pendingOperations.delete(operation);
          throw e;
        })
      );
    };

    client.finalize = function() {
      var pendingOperations = client[priv.pendingOperations];

      debug(
        'Number of pending operations to complete before client is destroyed',
        pendingOperations.size
      );

      return Promise.all(pendingOperations).then(() => {
        pendingOperations.clear();

        return client.destroy();
      });
    };
  };
});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof
  module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};
  c(n=>w[n],m.exports,m);w[n]=m.exports;};})('finalizeClient',this));
