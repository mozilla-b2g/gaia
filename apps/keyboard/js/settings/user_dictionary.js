'use strict';

/* global PromiseStorage */

(function(exports) {

// The "model" of user dictionary (controller logic is currently kept at app)

var UserDictionary = function UserDictionary() {
  this._wordSet = null;
  this._saveQueue = null;
  this._dbStore = null;
  this._started = false;
};

UserDictionary.prototype.start = function() {
  if (this._started) {
    console.error('UserDictionary: attempting to start twice');
    return;
  }

  this._started = true;
  this._saveQueue = Promise.resolve();
  this._dbStore = new PromiseStorage(this.DB_NAME);
  this._dbStore.start();
};

UserDictionary.prototype.stop = function() {
  if (this._started) {
    this._wordSet = null;
    this._saveQueue = null;
    this._dbStore.stop();
  }
};

UserDictionary.prototype.DB_NAME = 'UserDictLatin';

// Get the list of words from indexedDB
UserDictionary.prototype.getList = function() {
  if (!this._started) {
    return Promise.reject('UserDictionary not started');
  }

  return this._dbStore.getItem('wordlist').then(list => {
    list = list || [];
    this._wordSet = new Set(list);
    return this._wordSet;
  }).catch(e => {
    e && console.error(e);
    this._wordSet = new Set([]);
    return this._wordSet;
  });
};

// Save the list of words to indexedDB. We queue the saves such that firing
// successive saves won't easily break. Meanwhile, the queued save has to
// resolve back to the view to update the UI accordingly.
// XXX: implement abortable queue for successive saves such that we skip
//      not-yet-executed intermediate saves.
UserDictionary.prototype._saveList = function() {
  var p = this._saveQueue.then(
    () => this._dbStore.setItem('wordlist', Array.from(this._wordSet))
  ).catch(e => {
    console.error(e);
  });

  this._saveQueue = p;

  return p;
};

UserDictionary.prototype.addWord = function(word) {
  if (!this._started) {
    return Promise.reject('UserDictionary not started');
  }

  word = word.trim();

  if (this._wordSet.has(word)) {
    return Promise.reject('existing');
  }

  this._wordSet.add(word);

  return this._saveList();
};

UserDictionary.prototype.updateWord = function(oldWord, word) {
  if (!this._started) {
    return Promise.reject('UserDictionary not started');
  }

  word = word.trim();

  if (oldWord === word) {
    return Promise.resolve();
  }

  // if new word already exists, delete the old and save,
  // but tell view about this scenario
  this._wordSet.delete(oldWord);
  if (this._wordSet.has(word)) {
    return this._saveList().then(() => Promise.reject('existing'));
  } else {
    this._wordSet.add(word);
    return this._saveList();
  }
};

UserDictionary.prototype.removeWord = function(word) {
  if (!this._started) {
    return Promise.reject('UserDictionary not started');
  }

  this._wordSet.delete(word);

  return this._saveList();
};

exports.UserDictionary = UserDictionary;

})(window);
