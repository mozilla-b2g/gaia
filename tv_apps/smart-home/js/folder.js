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

  Folder.prototype = Object.create(Card.prototype);

  Folder.prototype.constructor = Folder;

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
  }),

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

  exports.Folder = Folder;
}(window));
