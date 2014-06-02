/* exported ToneList */
/* global Template */
'use strict';

var ToneList = (function() {

  var listTemplate = new Template('sound-list-template');
  var itemTemplate = new Template('sound-item-template');

  // Make sure to keep this in sync with the value in null_ringtone.js!
  // (We copy the value here so that you don't need to load null_ringtone.js
  // if you don't need it.)
  var NONE_ID = 'none:none';

  /**
   * Compare two tone objects, sorting first on their title, and then their
   * subtitle. Note: The empty ringtone is always the "smallest".
   *
   * @param {Tone} a The first tone.
   * @param {Tone} b The second tone.
   * @param {Number} <0 if a < b, 0 if a == b, and >0 if a > b.
   */
  function toneCompare(a, b) {
    // Make sure the empty ringtone is always first.
    if (a.id === NONE_ID && b.id === NONE_ID) {
      return 0;
    } else if (a.id === NONE_ID) {
      return -1;
    } else if (b.id === NONE_ID) {
      return 1;
    }

    var aName = a.name.toLocaleLowerCase();
    var bName = b.name.toLocaleLowerCase();
    var cmp = aName.localeCompare(bName);
    if (cmp) {
      return cmp;
    }

    var aSubtitle = (a.subtitle || '').toLocaleLowerCase();
    var bSubtitle = (b.subtitle || '').toLocaleLowerCase();
    return aSubtitle.localeCompare(bSubtitle);
  }

  /**
   * Convert a string of HTML to a DOM node and translate any l10n IDs as
   * appropriate. Assumes that mozL10n has already been fully initialized.
   *
   * @param {String} htmlText The HTML text to turn into a proper DOM node.
   * @return {Node} The converted DOM node.
   */
  function domify(htmlText) {
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;
    var element = dummyDiv.firstElementChild;
    navigator.mozL10n.translate(element);

    return element;
  }

  /**
   * Create a new list of tones. Assumes that mozL10n has already been fully
   * initialized. This class is meant to be subclassed by consumers; feel free
   * to extend makeItem() to do whatever you need!
   *
   * @param {String} titleID The l10n ID of the list's header
   * @param {Node} parent (optional) The parent node to append this list to.
   */
  function ToneList(titleID, parent) {
    this.element = domify(listTemplate.interpolate({l10nID: titleID}));
    if (parent) {
      parent.appendChild(this.element);
    }

    this._ul = this.element.querySelector('ul');
    // This maps tone IDs to an object containing the tone object and the DOM
    // node for it. We have to keep the tone objects around anyway, so we're
    // not wasting (much) memory with this.
    this._toneMap = {};
  }

  ToneList.prototype = {
    /**
     * Create and return a list item for a tone.
     *
     * @param {Object} tone The tone to use for the list item.
     * @return {Node} The list item.
     */
    makeItem: function(tone) {
      var templateArgs = {};
      if (tone.l10nID) {
        templateArgs.l10nID = tone.l10nID;
      } else {
        templateArgs.name = tone.name;
      }

      var item = domify(itemTemplate.interpolate(templateArgs));
      item.dataset.id = tone.id;

      if (tone.subtitle) {
        var subtitle = document.createElement('p');
        subtitle.classList.add('subtitle');
        subtitle.textContent = tone.subtitle;
        item.querySelector('.name').parentNode.appendChild(subtitle);
      }

      return item;
    },

    /**
     * Insert a tone or array of tones in sorted order into the list.
     *
     * @param {Object} tones A single tone object or an array thereof.
     */
    add: function(tones) {
      // If we have no children yet, we can be speedy and sort our new tones
      // first, and then append them to the end of the list.
      if (this._ul.children.length === 0) {
        if (Array.isArray(tones)) {
          tones.sort(toneCompare);
          tones.forEach(this._append.bind(this));
        } else {
          this._append(tones); // tones is really just a single tone here!
        }
      } else {
        if (Array.isArray(tones)) {
          tones.forEach(this._insertSorted.bind(this));
        } else {
          this._insertSorted(tones); // tones is really just a single tone here!
        }
      }
    },

    /**
     * Remove an item from the list.
     *
     * @param {Tone} tone The tone to remove.
     */
    remove: function(tone) {
      this._ul.removeChild(this._toneMap[tone.id].element);
      if (!this._ul.firstChild) {
        this.element.hidden = true;
      }
    },

    /**
     * Append a tone object to the end of the list. Useful when we know it
     * belongs at the end.
     *
     * @param {Tone} tone The tone to append.
     */
    _append: function(tone) {
      if (tone.id in this._toneMap) {
        throw new Error('A tone with this ID is already in the list: ' +
                        tone.id);
      }

      var newItem = this.makeItem(tone);
      this._toneMap[tone.id] = {tone: tone, element: newItem};
      this.element.hidden = false;
      this._ul.appendChild(newItem);
    },

    /**
     * Insert a tone object into the list based on its sort order.
     *
     * @param {Tone} tone The tone to insert.
     */
    _insertSorted: function(tone) {
      if (tone.id in this._toneMap) {
        throw new Error('A tone with this ID is already in the list: ' +
                        tone.id);
      }

      var newItem = this.makeItem(tone);
      this._toneMap[tone.id] = {tone: tone, element: newItem};
      this.element.hidden = false;

      var items = this._ul.querySelectorAll('li');
      for (var i = 0; i < items.length; i++) {
        var currTone = this._toneMap[items[i].dataset.id].tone;
        if (toneCompare(tone, currTone) < 0) {
          this._ul.insertBefore(newItem, items[i]);
          return;
        }
      }
      this._ul.appendChild(newItem);
    }
  };

  return ToneList;
})();
