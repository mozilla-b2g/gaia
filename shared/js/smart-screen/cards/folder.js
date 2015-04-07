/* global Card, uuid */

(function(exports) {
  'use strict';

  var Folder = function Folder(options) {
    this._cardsInFolder = options._cardsInFolder || [];
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

  Folder.prototype.getCardList = function folder_getCardList() {
    return this._cardsInFolder;
  };

  // get index of card in folder
  Folder.prototype._indexOfCard = function folder_indexOfCard(query) {
    return this._cardsInFolder.indexOf(this.findCard(query));
  };

  // TODO: This is almost the same as CardManager.findCardFromCardList()
  // We should merge and generalize them into one
  // There are three types of query:
  // 1. query by cardId
  // 2. query by manifestURL and optionally launchURL
  // 3. query by cardEntry (i.e. serialized card)
  Folder.prototype.findCard = function folder_findCard(query) {
    var found;
    this._cardsInFolder.some(function(card, index) {
      if (card.cardId === query.cardId) {
        found = card;
        return true;
      } else if (query.manifestURL && card.nativeApp &&
          card.nativeApp.manifestURL === query.manifestURL) {
        // if we specify launchURL in query, then we must compare
        // launchURL first
        if (query.launchURL) {
          if (card.launchURL === query.launchURL) {
            found = card;
            return true;
          }
        } else {
          found = card;
          return true;
        }
      } else if (query.cardEntry) {
        // XXX: this could be bad at performance because we serialize card
        // in every loop. We might need improvement on this query.
        if (JSON.stringify(card.serialize()) ===
            JSON.stringify(query.cardEntry)) {
          found = card;
          return true;
        }
      }
    });
    return found;
  };

  Folder.prototype._isInFolder = function folder_isInFolder(card) {
    if (card) {
      return this._indexOfCard(card) > -1;
    } else {
      return false;
    }
  };

  Folder.prototype._setDirty = function folder_setDirty() {
    if (this.state !== Folder.STATES.DETACHED) {
      this.state = Folder.STATES.DIRTY;
    }
    this.fire('folder-changed', this);
  };

  Folder.prototype.addCard = function folder_addCard(card, index) {
    // We don't support folder in folder
    if (!this._isInFolder(card) && !(card instanceof Folder)) {
      if (typeof index !== 'number') {
        index = this._cardsInFolder.length;
      }
      this._cardsInFolder.splice(index, 0, card);
      this._setDirty();
      this.fire('card-inserted', card, index);
    }
  };

  Folder.prototype.removeCard = function folder_removeCard(card) {
    var index = this._indexOfCard(card);
    if (index > -1) {
      this._cardsInFolder.splice(index, 1);
      this._setDirty();
      this.fire('card-removed', [index]);
    }
  };

  Folder.prototype.updateCard = function folder_updateCard(card, index) {
    // The card instance is directly reference to card in '_cardsInFolder'
    // So don't bother to update it again. But we DID need 'folder-changed'
    // event to notify CardManager to write changes to data store.
    this._setDirty();
    this.fire('card-updated', card, index);
  };

  Folder.prototype.swapCard = function folder_swapCard(card1, card2) {
    var index1 = (typeof card1 === 'number') ?
      index1 = card1 : this._indexOfCard(card1);
    var index2 = (typeof card2 === 'number') ?
      index2 = card2 : this._indexOfCard(card2);
    var temp = this._cardsInFolder[index1];
    this._cardsInFolder[index1] = this._cardsInFolder[index2];
    this._cardsInFolder[index2] = temp;
    this._setDirty();
    this.fire('card-swapped',
        this._cardsInFolder[index1], this._cardsInFolder[index2],
        index1, index2);
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
