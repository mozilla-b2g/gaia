(function(exports) {
  'use strict';

  const debug = 1 ?
    (arg1, ...args) => console.log(`[ClientDisposer] ${arg1}`, ...args):
    () => {};

  const priv = Object.freeze({
    tasks: Symbol('tasks')
  });

  const ClientDisposer = {
    [priv.tasks]: new WeakMap(),

    dispose(client, timeout = 0) {
      debug('Client %s to be disposed with timeout %s', client.id, timeout);

      if (this.isDisposing(client)) {
        return this[priv.tasks].get(client).promise;
      }

      let task = {
        promise: null,

        canBeCancelled: true,
        cancellationRequested: false
      };

      this[priv.tasks].set(client, task);

      // 1. Let's wait for the pending operations to complete first.
      task.promise = client.whenIdle().then(() => {
        debug('Client is in idle state');

        if (task.cancellationRequested) {
          throw new Error('Cancellation requested');
        }

        return new Promise((resolve, reject) => {
          // 2. Now let's wait for specified amount of time, just in case client
          // will be requested again soon enough.
          setTimeout(() => {
            debug('Disposal timeout fired');

            if (task.cancellationRequested) {
              reject(new Error('Cancellation requested'));
            } else {
              // Until service replies we can't guarantee that disposal can be
              // cancelled.
              task.canBeCancelled = false;

              // 3. Now let's ask service to dispose itself.
              resolve(client.requestServiceDisposal());
            }
          }, timeout);
        });
      }).then((serviceWillBeDisposed) => {
        debug('Service replied to disposal request: ', serviceWillBeDisposed);

        // If service can't be disposed (e.g. it has other clients connected)
        // and disposal cancellation has been requested, we can safely cancel
        // now.
        if (task.cancellationRequested && !serviceWillBeDisposed) {
          throw new Error('Cancellation requested');
        }

        // 4. Otherwise we can safely destroy client, no matter what service
        // replied. We don't return here, cause client use the same timeout
        // for both ordinary method calls and service method calls
        // (connect, disconnect and etc.) and if timeout is disabled and service
        // has been destroyed already client.destroy() will be never resolved.
        client.destroy();
      }).then(
        () => debug('Client is successfully disposed'),
        (e) => {
          debug('Client disposal is failed: ', e);
          throw e;
        }
      );

      return task.promise;
    },

    isDisposing(client) {
      return this[priv.tasks].has(client);
    },

    cancel(client) {
      debug('Cancel disposal of client %s', client.id);

      let task = this[priv.tasks].get(client);

      task.cancellationRequested = true;

      // If we are on the disposal stage where we can safely cancel disposal
      // let's just schedule cancellation and allow consumer to use the same
      // client instance right away, otherwise we should wait for the disposal
      // task to complete to know for sure.
      return (task.canBeCancelled ? Promise.reject() : task.promise).then(
        () => {
          debug('Cancellation failed');
          throw new Error('Cancellation failed');
        },
        (e) => debug('Client disposal is successfully cancelled')
      );
    }
  };

  exports.ClientDisposer = ClientDisposer;
})(self);
