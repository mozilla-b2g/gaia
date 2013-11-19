importScripts('lib/worker_router.js');
dump('\n\n-----***--- load shared woker *****\n\n');

var router = new WorkerRouter();

function loadEvents(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', '/events.json', false);
  xhr.responseType = 'json';

  xhr.onload = function() {
    callback(null, xhr.response);
  };

  xhr.send(null);
}

router.route('/event', function(id, callback) {
  loadEvents(function(err, events) {
    if (err) return callback(err);

    for (var i = 0; i < events.length; i++) {
      if (events[i].id === id) {
        return callback(null, events[i]);
      }
    }

    // no event found!
    callback();
  });
});

router.route('/events', loadEvents);
