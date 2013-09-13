'use strict';

var DraftHelper = {
  db:null,

  init: function dh_init(){
    
  },

  saveDraft: function dh_saveDraft(id, content){
   
   	var request = indexedDB.open("DraftTestDB", 2);
  	request.onsuccess = (function(event) {
  	  this.db = request.result;
  	  var transaction = this.db.transaction(["drafts"], "readwrite");
  	  // Do something when all the data is added to the database.
  	  transaction.oncomplete = function(event) {
  	    window.alert("Sucess!");
  	  };
  	  transaction.onerror = function(event) {
  	    window.alert("error!");
  	  };

  	  var objectStore = transaction.objectStore("drafts");
  	  var aRequest = objectStore.add({id: id, message: content});
  	  aRequest.onsuccess = function(event) {
  	    window.alert("Draft saved with success!");
  	  };
  	  aRequest.onerror = function(event) {
  	    window.alert("Deu merda!");
  	  };
  	}).bind(this);

  	request.onupgradeneeded = function(event) {
  	  this.db = event.target.result;

  	  this.db.createObjectStore("drafts", { keyPath: "id" });
  	  window.alert("DB created!");
  	}
  	request.onerror = (function(event) {
  	  window.alert("Error to open the DataBase");
  	}).bind(this);
  },

  getDraft: function dh_getDraft(id, oncomplete){
  	var request = indexedDB.open("DraftTestDB", 2);
  	request.onsuccess = (function(event) {
  	  var db = request.result;
  	  db.transaction("drafts").
  	    objectStore("drafts").
  	    get(id).onsuccess = function(event) {
  	    alert("draft saved " + event.target.result.message);
  	  };
  	}).bind(this);
  }

};