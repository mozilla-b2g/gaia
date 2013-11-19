(function(window) {
  'use strict';

  // cry no ES6 modules
  var view = new Event(document.querySelector(
    '.event-view'
  ));

  var worker = new SharedWorker('/worker.js', 'controller');
  worker.onerror = function(evt) {
    console.log(evt);
    throw new Error(
      evt.message + '@' + evt.filename + ':' + evt.lineno
    );
  };

  var client = new WorkerRouterClient(worker);
  var id = parseInt(document.location.search.slice(4));

  // XXX: This should really be a stream
  client.request('/event', id, function(err, event) {
    view.setEvent(event);
  });
}(this));

