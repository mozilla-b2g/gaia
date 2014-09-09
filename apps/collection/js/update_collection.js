'use strict';

/* global BaseCollection, Icon, GridIconRenderer */
/* exported CollectionEditor */

var CollectionEditor = {
  init: function (options) {
    this.collection = BaseCollection.create(options.data);

    this.onsaved = options.onsaved;
    this.oncancelled = options.oncancelled;

    this.collectionTitle = document.getElementById('collection-title');
    this.collectionTitle.value = this.collection.name || '';

    this.collectionIcon = document.getElementById('collection-icon');
    this._renderIcon();
    
    this.header = document.getElementById('header');
    this.header.addEventListener('action', this.close.bind(this));

    this.saveButton = document.getElementById('done-button');
    this.saveListener = this.save.bind(this);
    this.saveButton.addEventListener('click', this.saveListener);

    this.form = document.querySelector('form');
    this.form.addEventListener('input', this._checkDoneButton.bind(this));
    
    this.clearButton = document.getElementById('collection-title-clear');
    this.clearButton.addEventListener('touchstart',
                                       this._clearTitle.bind(this));
  },

  close: function() {
    this.oncancelled();
  },

  _renderIcon: function() {
    var icon = new Icon(this.collectionIcon, this.collection.icon);
    icon.render({
      type: GridIconRenderer.TYPE.CLIP
    });
  },

  _clearTitle: function(event) {
    event.preventDefault();
    this.collectionTitle.value = '';
    this._checkDoneButton();
  },

  _checkDoneButton: function() {
    // If name ﬁeld is blank, the “Done” button should be dimmed and inactive
    var title = this.collectionTitle.value.trim();
    this.saveButton.disabled = title === '';
  },

  save: function() {
    this.saveButton.removeEventListener('click', this.saveListener);
    var newName = this.collectionTitle.value;
    this.collection.rename(newName).then(() => this.onsaved());
  }
};
