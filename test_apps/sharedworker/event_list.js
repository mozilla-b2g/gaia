(function(window) {
  'use strict';

  // BIG Hacks!
  document.body.addEventListener('click', function(e) {
    var target = e.target;

    if (target.getAttribute('target') && target.href) {
      window.open(target.href);
      e.preventDefault();
    }
  });

  // cry no ES6 modules
  var view = new EventList(document.querySelector(
    '.event-list-view'
  ));

  // establish a connection with a worker (?=time for cache bust)
  var worker = new SharedWorker('/worker.js', 'controller');
  worker.onerror = function(evt) {
    console.log(evt);
    throw new Error(
      evt.message + '@' + evt.filename + ':' + evt.lineno
    );
  };

  var client = new WorkerRouterClient(worker);

  // XXX: This should really be a stream
  client.request('/events', function(err, list) {
    list.forEach(view.addItem, view);
  });
}(this));
