Calendar.ns('Controllers').Service = (function() {

  function Service() {
    Calendar.Worker.Manager.call(this);
  };

  Service.prototype = {
    __proto__: Calendar.Worker.Manager.prototype,

    /**
     * Load and initializer workers.
     *
     * @param {Boolean} useWorker false to turn off workers.
     */
    start: function(useWorker) {
      if (typeof(useWorker) === 'undefined') {
        useWorker = true;
      }

      if (useWorker) {
        this.add('caldav', '/caldav_worker.js');
      } else {
        // worker shim until:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=761227
        var workerClient = new Calendar.Responder();
        var worker = new Calendar.Responder();

        workerClient.postMessage = function(data) {
          var send = { data: data };
          worker.emit('message', send);
        };

        worker.postMessage = function(data) {
          if (workerClient.onmessage) {
            workerClient.onmessage({ type: 'message', data: data });
          }

          var args = ['message'].concat(data);
          workerClient.emit.apply(workerClient, args);
        };

        worker.on('message', function prepare(e) {
          var thread = new Calendar.Thread(worker);
          worker.removeEventListener('message', prepare);
          thread.addRole('caldav');
          var caldav = new Calendar.Service.Caldav(
            thread.roles.caldav
          );
          thread.send('ready');
        });

        this.add('caldav', workerClient);

      }
    }
  };

  return Service;
}());
