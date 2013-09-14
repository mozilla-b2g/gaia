'use strict';

var DraftHelper = {
  db: null,

  init: function dh_init() {

  },

  saveDraft: function dh_saveDraft(id, content) {
    var request = indexedDB.open('DraftTestDB', 2);
    request.onsuccess = (function(event) {
      this.db = request.result;
      var transaction = this.db.transaction(['drafts'], 'readwrite');

      var objectStore = transaction.objectStore('drafts');
      var aRequest = objectStore.add({id: id, message: content});
    }).bind(this);

    request.onupgradeneeded = function(event) {
      this.db = event.target.result;

      this.db.createObjectStore('drafts', { keyPath: 'id' });
    };
  },

  deleteDraft: function dh_saveDraft(id) {
    var request = indexedDB.open('DraftTestDB');
    request.onsuccess = (function(event) {
      var db = request.result;
      db.transaction(['drafts'], 'readwrite').
        objectStore('drafts').
        delete(id);
    }).bind(this);
  },

  getDraft: function dh_getDraft(id, oncomplete) {
    var request = indexedDB.open('DraftTestDB');
    request.onsuccess = (function(event) {
      var db = request.result;
      db.transaction('drafts').
        objectStore('drafts').
        get(id).onsuccess = function(event) {
          oncomplete(event.target.result);
        };
    }).bind(this);
  }
};
