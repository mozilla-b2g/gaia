!((define)=>{define((require,exports,module)=>{

  /**
   * Mini Logger
   *
   * @type {Function}
   */

  var debug = 1 ? function(arg1, ...args) {
    var type = `[${self.constructor.name}][${location.pathname}]`;
    console.log(`[DisposableService]${type} - "${arg1}"`, ...args);
  } : () => {};

  module.exports = function(service) {
    debug('attaching plugin');

    service.method('@@requestDisposal', (clientId) => {
      debug('Client %s is requesting to dispose service', clientId);

      let canBeDisposed = true;
      service.eachClient((client) => {
        if (client.id !== clientId) {
          canBeDisposed = false;
        }
      });

      if (canBeDisposed) {
        // Use setTimeout to allow service to respond.
        setTimeout(() => service.emit('dispose'), 0);
      }

      debug('Service can be disposed: %s', canBeDisposed);

      return canBeDisposed;
    });
  };

});})((typeof define)[0]=='f'&&define.amd?define:((n,w)=>{return(typeof
  module)[0]=='o'?c=>{c(require,exports,module);}:(c)=>{var m={exports:{}};
  c(n=>w[n],m.exports,m);w[n]=m.exports;};})('disposableService',this));
