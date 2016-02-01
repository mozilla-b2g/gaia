var db;

var getCount = new Promise(resolve => {
  console.log('Will open indexedDB');
  var request = indexedDB.open('counter');

  request.onupgradeneeded = event => {
    console.log('Populating indexedDB');
    db = event.target.result;
    var store = db.createObjectStore('count');
    store.add(0, 'count');
  };

  request.onsuccess = () => {
    console.log('Reading count from indexedDB');
    db = request.result;
    var transaction = db.transaction(['count'], 'readonly');
    var store = transaction.objectStore('count');
    var get = store.get('count');
    get.onsuccess = () => resolve(get.result);
  };
});

function setCount(count) {
  var transaction = db.transaction(['count'], 'readwrite');
  var store = transaction.objectStore('count');
  store.put(count, 'count');
}

self.onmessage = event => {
  console.log(`Will call ${event.data.method}`);
  switch (event.data.method) {
    case 'getCount':
      getCount.then(postMessage);
      break;
    case 'setCount':
      setCount(event.data.params[0]);
      break;
  }
}
