/* global Card, uuid */

(function(exports) {
  'use strict';

  var Folder = function Folder(options) {
    this.cardsInFolder = options.cardsInFolder || [];
    this.name = options.name;
    // folderId is used in cardStore as key
    this.folderId = options.folderId || uuid.v4();
    this.state = options.state || Folder.STATES.NORMAL;
    Card.prototype.constructor.call(this);
  };

  Folder.STATES = Object.freeze({
    // when folder is in DESERIALIZING state, it means we are still in the
    // process of loading its content from datastore
    'DESERIALIZING': 'DESERIALIZING',
    'NORMAL': 'NORMAL',
    // DIRTY state means the folder is out of sync with data store
    'DIRTY': 'DIRTY',
    // DETACHED state means the folder itself is not saved (detached)
    // in card list
    'DETACHED': 'DETACHED'
  });

  Folder.deserialize = function folder_deserialize(cardEntry) {
    var cardInstance;
    if (cardEntry && cardEntry.type === 'Folder') {
      cardInstance = new Folder({
        name: cardEntry.name,
        folderId: cardEntry.folderId,
        // The content of folder is saved in datastore under key of folderId
        // thus we are not complete deserialize it yet, mark its state
        // as 'DESERIALIZING'. Caller needs to put content of the folder
        // back to its structure. Please refer to CardManager#_reloadCardList().
        state: Folder.STATES.DESERIALIZING
      });
    }
    return cardInstance;
  };

  Folder.prototype = Object.create(Card.prototype);

  Folder.prototype.constructor = Folder;

  Folder.prototype._findInFolder = function folder_findInFolder(query) {
    var indexOfFound = -1;
    if (query instanceof Card) {
      this.cardsInFolder.some(function(card, index) {
        if (card === query) {
          indexOfFound = index;
          return true;
        } else {
          return false;
        }
      });
    }
    return indexOfFound;
  };

  Folder.prototype._isInFolder = function folder_isInFolder(cardInSearch) {
    if (cardInSearch) {
      return this._findInFolder(cardInSearch) > -1;
    } else {
      return false;
    }
  };

  Folder.prototype.addCard = function folder_addCard(card) {
    // We don't support folder in folder
    if (!this._isInFolder(card) && !(card instanceof Folder)) {
      this.cardsInFolder.push(card);
      if (this.state !== Folder.STATES.DETACHED) {
        this.state = Folder.STATES.DIRTY;
      }
      this.fire('folder-changed', this);
    }
  };

  Folder.prototype.removeCard = function folder_removeCard(card) {
    var index = this._findInFolder(card);
    if (index > -1) {
      this.cardsInFolder.splice(index, 1);
      if (this.state !== Folder.STATES.DETACHED) {
        this.state = Folder.STATES.DIRTY;
      }
      this.fire('folder-changed', this);
    }
  };

  Folder.prototype.launch = function folder_launch() {
    // fire launch event to inform exterior module
    this.fire('launch', this);
  };

  Folder.prototype.serialize = function folder_serialize() {
    return {
      name: this.name,
      folderId: this.folderId,
      type: 'Folder'
    };
  };

  exports.Folder = Folder;
}(window));
