'use strict';
define(function(require) {
var backFormNode = require('tmpl!./sig/save_signature.html'),
    cards = require('cards'),
    trailingRegExp = /\s+$/;

return [
  require('./base_card')(require('template!./settings_signature.html')),
  require('./editor_mixins'),

  {
    onArgs: function(args) {
      this.account = args.account;
      this.identity = this.account.identities[0];

      this._bindEditor(this.signatureNode);

      this.populateEditor(this.identity.signature || '');
    },

    // Removes any trailing whitespace, since it is just noise, and it also sets
    // up the wrong expectation when the cursor is auto-focused at end of the
    // content -- it will sometimes show up on the far right of the text screen
    // because of phantom \n (that are <br>s in the HTML).
    getTextFromEditor: function() {
      var text = this.fromEditor().replace(trailingRegExp, '');
      return text;
    },

    goBack: function() {
      cards.removeCardAndSuccessors(this, 'animate', 1);
    },

    onBack: function() {
      var signature = this.getTextFromEditor();
      if (signature === this.identity.signature) {
        this.goBack();
        return;
      }
      var menu = backFormNode.cloneNode(true);
      this._savePromptMenu = menu;
      cards.setStatusColor(menu);
      document.body.appendChild(menu);

      var formSubmit = (function(evt) {
        cards.setStatusColor();
        document.body.removeChild(menu);
        this._savePromptMenu = null;

        switch (evt.explicitOriginalTarget.id) {
          case 'sig-save':
            this.identity.modifyIdentity({ signature: signature });
            this.goBack();
            break;
          case 'sig-discard':
            this.goBack();
            break;
          case 'sig-cancel':
            break;
        }
        return false;
      }).bind(this);
      menu.addEventListener('submit', formSubmit);
    },

    onClickDone: function() {
      var signature = this.getTextFromEditor();

      // Only push the signature if it was changed
      if (signature !== this.identity.signature) {
        this.identity.modifyIdentity({ signature: signature });
      }

      this.onBack();
    },

    onCardVisible: function() {
      // Need to wait until the card is shown and animation is done before
      // focusing input in the editable area.

      // Clear any existing selections
      var selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }

      // If there is content, set the cursor at the
      // end of it.
      var node = this.signatureNode.lastChild;
      if (node) {
        var range = document.createRange();

        range.setStartAfter(node);
        range.setEndAfter(node);
        selection.addRange(range);
      }

      // The selection sets up where the cursor will show, this ties it all
      // together and brings up the keyboard.
      this.signatureNode.focus();
    },

    die: function() {
    }
  }
];
});
