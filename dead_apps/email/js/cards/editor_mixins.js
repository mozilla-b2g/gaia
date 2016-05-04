'use strict';

define(function(require) {

  return {

    _bindEditor: function(textNode) {
      this._editorNode = textNode;

      // Prevent pastes of rich HTML, since it has encoding, security and
      // sanitation issues.
      textNode.addEventListener('paste', function(event) {
        event.preventDefault();
        var text = event.clipboardData.getData('text/plain');

        // Only insert if text. If no text, the execCommand fails with an
        // error.
        if (text) {
          document.execCommand('insertText', false, text);
        }
      });
    },

    /**
     * Inserts an email into the contenteditable element
     */
    populateEditor: function(value) {
      var lines = value.split('\n');
      var frag = document.createDocumentFragment();
      for (var i = 0, len = lines.length; i < len; i++) {
        if (i) {
          frag.appendChild(document.createElement('br'));
        }

        if (lines[i]) {
          frag.appendChild(document.createTextNode(lines[i]));
        }
      }

      // Need at least one text node for tapping and keyboard display to work.
      if (!frag.childNodes.length) {
        frag.appendChild(document.createTextNode(''));
      }

      this._editorNode.appendChild(frag);
    },

    /**
     * Gets the raw value from a contenteditable div
     */
    fromEditor: function(value) {
      var content = '';
      var len = this._editorNode.childNodes.length;
      for (var i = 0; i < len; i++) {
        var node = this._editorNode.childNodes[i];
        if (node.nodeName === 'BR' &&
            // Gecko's contenteditable implementation likes to create a
            // synthetic trailing BR with type="_moz".  We do not like/need
            // this synthetic BR, so we filter it out.  Check out
            // nsTextEditRules::CreateTrailingBRIfNeeded to find out where it
            // comes from.
            node.getAttribute('type') !== '_moz') {
          content += '\n';
        } else {
          content += node.textContent;
        }
      }

      return content;
    }

  };


});