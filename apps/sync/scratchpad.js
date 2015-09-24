'use strict';

/* global
  SYNC_DEBUG
*/

/* exported
  dsSync,
  listBookmarks,
  listTitle,
  updateHistoryId
*/

var placesStore;
var bookmarksStore;
var fxBookmarksStore;

(function (){
  console.log('scratchpad init.');
  getPlacesStore();
  getBookmarksStore();
  getFxBookmarksStore();
  //listTitle();
})();

function history(){
  return SYNC_DEBUG.syncEngine._getCollection('history');
}

function syncLocalWins() {
  var collection = history();
  return collection.sync()
  .then(res => {
    console.log(res);
    if (res.ok) {
      return res;
    }

    // If conflicts, take remote version and sync again.
    return Promise.all(res.conflicts.map(conflict => {
      return collection.resolve(conflict, conflict.local);
    }));
    //.then(_ => sync());
  })
  .catch(error => {
    console.error(error);
  });
}

function updateHistoryId(fxsyncId){
  var collection = history();

  return collection.get(fxsyncId).then((result) => {
    console.log(result);
    result.data.payload.id = fxsyncId;
    collection.update(result.data).then(updatedResult => {
      console.log(updatedResult);
      return syncLocalWins();
    });
  }).then(console.log.bind(console))
  .catch(console.error.bind(console));
}

function listTitle() {
  history().list().then(list => {
    list.data.forEach((item, index) => {
      /*console.log(item);*/
      if(item.payload.title){
        console.log(index, item.payload.title);
      }
    });
  });
}

function bookmarks(){
  return SYNC_DEBUG.syncEngine._getCollection('bookmarks');
}

function listBookmarks() {
  bookmarks().list().then(list => {
    console.log(list);
  });
}

function getPlacesStore() {
  navigator.getDataStores('places').then(stores => {
    placesStore = stores[0];
  });
}

function getBookmarksStore() {
  navigator.getDataStores('bookmarks_store').then(stores => {
    bookmarksStore = stores[0];
  });
}

function getFxBookmarksStore() {
  navigator.getDataStores('firefox-sync-bookmarks').then(stores => {
    fxBookmarksStore = stores[0];
  });
}

function dsSync(store, revisionId) {
  var cursor = store.sync(revisionId);
  runNextTask(cursor);

  function runNextTask(cursor) {
   cursor.next().then(function(task) {
     manageTask(cursor, task);
   });
  }

  function manageTask(cursor, task) {
    console.log(task);
    if (task.operation == 'done') {
      // Finished adding contacts!
      return;
    }
/*
    if (task.operation == 'add') {
      // Add the contacts that are different to how it was before
      displayExisting(task.id, task.data);
    }
*/
    runNextTask(cursor);
  }
}
