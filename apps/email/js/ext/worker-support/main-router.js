define(function() {
  'use strict';

  var listeners = {};
  var modules = [];
  var worker = null;

  function register(module) {
    var action,
        name = module.name;

    modules.push(module);

    if (module.process) {
      action = function(msg) {
        module.process(msg.uid, msg.cmd, msg.args);
      };
    } else if (module.dispatch) {
      action = function(msg) {
        if (module.dispatch[msg.cmd]) {
          module.dispatch[msg.cmd].apply(module.dispatch, msg.args);
        }
      };
    }

    listeners[name] = action;

    module.sendMessage = function(uid, cmd, args, transferArgs) {
    //dump('\x1b[34mM => w: send: ' + name + ' ' + uid + ' ' + cmd + '\x1b[0m\n');
      //debug('onmessage: ' + name + ": " + uid + " - " + cmd);
      worker.postMessage({
        type: name,
        uid: uid,
        cmd: cmd,
        args: args
      }, transferArgs);
    };
  }

  function unregister(module) {
    delete listeners['on' + module.name];
  }

  function shutdown() {
    modules.forEach(function(module) {
      if (module.shutdown)
        module.shutdown();
    });
  }

  function useWorker(_worker) {
    worker = _worker;
    worker.onmessage = function dispatchToListener(evt) {
      var data = evt.data;
//dump('\x1b[37mM <= w: recv: '+data.type+' '+data.uid+' '+data.cmd+'\x1b[0m\n');
      var listener = listeners[data.type];
      if (listener)
        listener(data);
    };
  }

  return {
    register: register,
    unregister: unregister,
    useWorker: useWorker,
    shutdown: shutdown
  };
}); // end define
