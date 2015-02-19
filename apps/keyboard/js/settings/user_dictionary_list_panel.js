'use strict';

/* global BaseView, UserDictionary */

/*
 * The panel for the list of user dictionary words. When there is no word,
 * display a placeholder.
 *
 * We want to keep the list in alphabetical order. The view does not do the
 * sorting job -- the model keeps the list sorted, while the view merely
 * reflects the order of the list and displays as such.
 *
 * Thus, the model is expected to return a full, sorted word list for each
 * modification to the list. This includes adding a word, removing a word, and
 * replacing a word. (The list isn't really used for removing a word, though).
 *
 * We use two-way mapping:
 * - From user interaction of a word DOM element, to a word string value:
 *   This is kept with an ES6 WeakMap.
 * - From a word string value to a word DOM element (used to re-order a
 *   displayed list according to the order returned from model):
 *   This is kept with an object.
 *
 * When we're talking about "a word's DOM element", we're always referring to
 * the <li> element, and never its inner child, the <a> element.
 */

(function(exports) {

var UserDictionaryListPanel = function(app) {
  BaseView.apply(this);

  this.app = app;

  this._model = new UserDictionary(this);
  this._populated = false;

  this._listContainer = null;

  // a WeakMap from word list's each <li> element to an actual word.
  this._domWordMap = null;
  // an object from an actual word to a word list's <li> element.
  this._wordDomMap = null;
};

UserDictionaryListPanel.prototype = Object.create(BaseView.prototype);

UserDictionaryListPanel.prototype.CONTAINER_ID = 'panel-ud-wordlist';
                    
UserDictionaryListPanel.prototype.start = function() {
  BaseView.prototype.start.call(this);

  this._listContainer = this.container.querySelector('#ud-wordlist-list');

  this._model.start();

  this._domWordMap = new WeakMap();
  this._wordDomMap = {};
};

UserDictionaryListPanel.prototype.stop = function() {
  BaseView.prototype.stop.call(this);

  this._populated = false;
  this._listContainer = null;
  this._model.stop();
  this._domWordMap = null;
  this._wordDomMap = null;
};

UserDictionaryListPanel.prototype.beforeShow = function(options) {
  if (!this._populated) {
    this._populated = true;

    return this._model.getList().then(words => {
      if (!words || words.size === 0) {
        this.container.classList.add('empty');
      } else {
        this.container.classList.remove('empty');
        this._rearrangeList(words);
      }
    }).catch(e => console.error(e));
  }
};

UserDictionaryListPanel.prototype.show = function() {
  this.container.querySelector('#ud-addword-btn')
    .addEventListener('click', this);

  this._listContainer.addEventListener('click', this);

  this.container.querySelector('gaia-header').addEventListener('action', this);
};

UserDictionaryListPanel.prototype.beforeHide = function() {
  this.container.querySelector('#ud-addword-btn')
    .removeEventListener('click', this);

  this._listContainer.removeEventListener('click', this);

  this.container.querySelector('gaia-header')
    .removeEventListener('action', this);
};

UserDictionaryListPanel.prototype.handleEvent = function(evt) {
  var target = evt.target;

  switch (evt.type) {
    case 'click':
      if ('ud-addword-btn' === target.id) {
        this._showAddDialog();
      } else if ('li' === target.tagName.toLowerCase()) {
        this._showEditDialog(target);
        evt.preventDefault();
      }
      break;

    case 'action':
      this.app.panelController.navigateToRoot();
      break;
  }
};

// Re-arrange the DOM elements for the list of words. Create related dom element
// if needed.
UserDictionaryListPanel.prototype._rearrangeList = function(wordList) {
  wordList.forEach(word => {
    word = word.trim();

    var wordElem;

    if (word in this._wordDomMap) {
      wordElem = this._wordDomMap[word];
    } else {
      wordElem = this._createWordElem(word);
    }

    // DOM spec says we don't need to removeChild() before calling appendChild
    // so we merely call appendChild regardless whether we created a LI or not.
    this._listContainer.appendChild(wordElem);
  });
};

UserDictionaryListPanel.prototype._createWordElem = function(word) {
  var innerAnchor = document.createElement('a');
  innerAnchor.href = '#' + word;
  innerAnchor.textContent = word;

  var elem = document.createElement('li');
  elem.appendChild(innerAnchor);

  this._domWordMap.set(elem, word);
  this._wordDomMap[word] = elem;

  return elem;
};

UserDictionaryListPanel.prototype._showAddDialog = function() {
  this.app.dialogController.openDialog(
    this.app.dialogController.userDictionaryEditDialog)
  .then(
    result => {
      if ('commit' === result.action) {
        this._addWord(result.word);
      }
    })
  .catch(e => e && console.error(e));
};

UserDictionaryListPanel.prototype._showEditDialog = function(wordElem) {
  var word = this._domWordMap.get(wordElem);

  this.app.dialogController.openDialog(
    this.app.dialogController.userDictionaryEditDialog, {
      word: word
  })
  .then(
    result => {
      switch (result.action) {
        case 'remove':
          this._removeWord(word, wordElem);
          break;
        case 'commit':
          this._replaceWord(word, result.word, wordElem);
          break;
      }
    })
  .catch(e => e && console.error(e));
};

UserDictionaryListPanel.prototype._addWord = function(word) {
  word = word.trim();

  if (word.length > 0) {
    var awakeLock = this.app.closeLockManager.requestLock('stayAwake');
    this._model.addWord(word).then(wordList => {
      awakeLock.unlock();
      this.container.classList.remove('empty');
      this._rearrangeList(wordList);
    }).catch(e => {
      awakeLock.unlock();
      if ('existing' === e) {
        return;
      } else {
        console.error(e);
      }
    });
  }
};

UserDictionaryListPanel.prototype._removeWord = function(word, wordElem) {
  var awakeLock = this.app.closeLockManager.requestLock('stayAwake');
  this._model.removeWord(word).then(() => {
    awakeLock.unlock();

    this._domWordMap.delete(wordElem);
    delete this._wordDomMap[word];

    this._listContainer.removeChild(wordElem);

    if (0 === this._listContainer.childNodes.length) {
      this.container.classList.add('empty');
    }
  }).catch(e => {
    awakeLock.unlock();
    console.error(e);
  });
};

UserDictionaryListPanel.prototype._replaceWord =
function(oldWord, newWord, wordElem){
  newWord = newWord.trim();

  if (newWord.length > 0 && oldWord !== newWord) {
    var awakeLock = this.app.closeLockManager.requestLock('stayAwake');
    this._model.updateWord(oldWord, newWord).then(wordList => {
      awakeLock.unlock();

      this._domWordMap.set(wordElem, newWord);
      delete this._wordDomMap[oldWord];
      this._wordDomMap[newWord] = wordElem;

      wordElem.childNodes[0].textContent = newWord;

      this._rearrangeList(wordList);
    }).catch(e => {
      awakeLock.unlock();

      if ('existing' === e) {
        this._domWordMap.delete(wordElem);
        delete this._wordDomMap[oldWord];
        this._listContainer.removeChild(wordElem);
      } else {
        console.error(e);
      }
    });
  }
};

exports.UserDictionaryListPanel = UserDictionaryListPanel;

})(window);
