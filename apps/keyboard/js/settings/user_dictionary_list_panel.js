'use strict';

/* global UserDictionary */

/*
 * The panel for the list of user dictionary words. When there is no word,
 * display a placeholder.
 *
 * We use a ES6 WeakMap to conveniently map a DOM element to the word it
 * contains. The architecture design is you never need to query a DOM element
 * from a word (a little funtional-programming sense).
 *
 * When we're talking about "a word's DOM element", we're always referring to
 * the <a> element, and never its parent, the <li> element.
 */

(function(exports) {

var UserDictionaryListPanel = function(app) {
  this.app = app;

  this._model = new UserDictionary(this);
  this._initialized= false;

  this._container = null;
  this._listContainer = null;

  // a WeakMap from word list's each <a> element to an actual word.
  this._domWordMap = null;
};

UserDictionaryListPanel.prototype.CONTAINER_ID = 'panel-ud-wordlist';
                    
UserDictionaryListPanel.prototype.init = function() {
  this._initialized = true;

  this._container = document.getElementById(this.CONTAINER_ID);
  this._listContainer = this._container.querySelector('#ud-wordlist-list');

  this._model.start();

  this._domWordMap = new WeakMap();
};

UserDictionaryListPanel.prototype.uninit = function() {
  this._initialized = false;
  this._container = null;
  this._listContainer = null;
  this._model.stop();
  this._domWordMap = null;
};

UserDictionaryListPanel.prototype.beforeShow = function(options) {
  if (!this._initialized) {
    this.init();

    return this._model.getList().then(words => {
      if (!words || words.size === 0) {
        this._container.classList.add('empty');
      } else {
        this._container.classList.remove('empty');
        words.forEach(word => this._appendList(word.trim()));
      }
    }).catch(e => console.error(e));
  }
};

UserDictionaryListPanel.prototype.show = function() {
  this._container.querySelector('#ud-addword-btn')
    .addEventListener('click', this);

  this._listContainer.addEventListener('click', this);

  this._container.querySelector('gaia-header').addEventListener('action', this);
};

UserDictionaryListPanel.prototype.beforeHide = function() {
  this._container.querySelector('#ud-addword-btn')
    .removeEventListener('click', this);

  this._listContainer.removeEventListener('click', this);

  this._container.querySelector('gaia-header')
    .removeEventListener('action', this);
};

UserDictionaryListPanel.prototype.hide = function(evt) {

};

UserDictionaryListPanel.prototype.handleEvent = function(evt) {
  var target = evt.target;

  switch (evt.type) {
    case 'click':
      if ('ud-addword-btn' === target.id) {
        this._showAddDialog();
      } else if ('a' === target.tagName.toLowerCase()) {
        this._showEditDialog(target);
        evt.preventDefault();
      }
      break;

    case 'action':
      this.app.panelController.navigateToRoot();
      break;
  }
};

UserDictionaryListPanel.prototype._appendList = function(word) {
  var wordElem = document.createElement('a');
  wordElem.href = '#' + word;
  wordElem.textContent = word;

  var li = document.createElement('li');
  li.appendChild(wordElem);
  this._listContainer.appendChild(li);

  this._domWordMap.set(wordElem, word);
};

UserDictionaryListPanel.prototype._showAddDialog = function() {
  this.app.panelController.openDialog(this.app.userDictionaryEditPanel)
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

  this.app.panelController.openDialog(this.app.userDictionaryEditPanel, {
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
    this._model.addWord(word).then(() => {
      awakeLock.unlock();
      this._container.classList.remove('empty');
      this._appendList(word);
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

    this._listContainer.removeChild(wordElem.parentNode);

    if (0 === this._listContainer.childNodes.length) {
      this._container.classList.add('empty');
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
    this._model.updateWord(oldWord, newWord).then(() => {
      awakeLock.unlock();

      this._domWordMap.set(wordElem, newWord);
      wordElem.textContent = newWord;
    }).catch(e => {
      awakeLock.unlock();

      if ('existing' === e) {
        this._domWordMap.delete(wordElem);
        this._listContainer.removeChild(wordElem.parentNode);
      } else {
        console.error(e);
      }
    });
  }
};

exports.UserDictionaryListPanel = UserDictionaryListPanel;

})(window);
