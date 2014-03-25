'use strict';

(function(exports) {

  function Suggestions(autoCorrect) {
    this._started = false;
    this.autoCorrect = autoCorrect;
  }

  Suggestions.prototype.CONTAINER_CLASS_NAME = 'suggestions';

  Suggestions.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    // Add the suggestions panel to the keyboard display area
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = this.CONTAINER_CLASS_NAME;
    this.autoCorrect.container.appendChild(this.suggestionsContainer);

    // Use touchend events to detect clicks on the word suggestions.
    // If we want to add gesture support to dismiss, we'll need something
    // more sophisticated
    this.suggestionsContainer.addEventListener('touchend', this);
  };

  Suggestions.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    this.suggestionsContainer.removeEventListener('touchend', this);
    this.autoCorrect.container.removeChild(this.suggestionsContainer);

    this.suggestionsContainer = null;
  };

  // EventTarget methods
  Suggestions.prototype.addEventListener =
    function addEventListener(type, handler) {
      this.suggestionsContainer.addEventListener(type, handler);
    };

  Suggestions.prototype.removeEventListener =
    function removeEventListener(type, handler) {
      this.suggestionsContainer.removeEventListener(type, handler);
    };

  Suggestions.prototype.handleEvent = function handleEvent(evt) {
    // handle touchend event from suggestions.

    var target = evt.target;
    // Loop up from the touch target element until we find a suggestion
    // and then dispatch an event about it. Or, if we find the dismiss
    // button, then dismiss the suggestions.
    while (target !== this.suggestionsContainer) {
      var event;
      if (target.classList.contains('suggestion')) {
        var word = target.dataset.word + ' ';
        event = new CustomEvent('suggestionselected', { detail: word });
        this.suggestionsContainer.dispatchEvent(event);

        return;
      }

      if (target.classList.contains('dismiss-suggestions-button')) {
        event = new CustomEvent('suggestionsdismissed');
        this.suggestionsContainer.dispatchEvent(event);

        return;
      }

      target = target.parentNode;
    }
  };

  Suggestions.prototype.display = function display(suggestions) {
    // Clear any previous suggestions
    this.suggestionsContainer.textContent = '';

    if (suggestions.length) {
      // Add a dismiss button to the container
      var dismissButton = document.createElement('div');
      dismissButton.classList.add('dismiss-suggestions-button');
      this.suggestionsContainer.appendChild(dismissButton);

      // Figure out how much room is left for each suggestion
      var width = this.suggestionsContainer.clientWidth -
        dismissButton.clientWidth;
      width /= suggestions.length;
      width -= 6;    // 3px margin on each side
      width += 'px'; // Add CSS units

      // And display the suggesions
      suggestions.forEach(function(word) {
        this._appendSuggestion(word, width);
      }, this);
    }
  };

  Suggestions.prototype._appendSuggestion =
    function _appendSuggestion(word, width) {
      // Each suggestion gets its own div
      var div = document.createElement('div');

      // Give it a class for styling, but explictly set the width
      div.className = 'suggestion';
      div.style.width = width;

      // Add the empty suggestion to the container now so we can measure
      // the word inside it.
      this.suggestionsContainer.appendChild(div);

      if (word[0] === '*') { // it is an autocorrection candidate
        word = word.substring(1);
        div.classList.add('autocorrect');
      }

      this._fitWord(div, word);
      div.dataset.word = word;
    };

  // Remove any existing content of the container and display the
  // specified word in it, adjusting the scaling to make the word
  // fit. The word is placed in a span inside the container.  The
  // container must be in the document for the measurement to work.
  Suggestions.prototype._fitWord = function fitWord(container, word) {
    container.textContent = '';
    if (!word) {
      return null;
    }
    var span = document.createElement('span');
    span.textContent = word;
    container.appendChild(span);

    var limit = 0.6;  // Dont use a scale smaller than this
    var scale = getScale(span, container);

    // If the word does not fit within the scaling limit,
    // reduce the length of the word by replacing characters in
    // the middle with ...
    if (scale < limit) {
      var charactersReplaced = word.length % 2;
      while (scale < limit && charactersReplaced < word.length - 2) {
        charactersReplaced += 2;
        var halflen = (word.length - charactersReplaced) / 2;
        span.textContent = word.substring(0, halflen) +
          '…' +
          word.substring(word.length - halflen);
        scale = getScale(span, container);
      }
    }

    // The scaling and centering we do only works if the span
    // is display:block or inline-block
    span.style.display = 'inline-block';
    if (scale < 1) {
      span.style.width = (100 / scale) + '%';
      span.style.transformOrigin = 'left';
      span.style.transform = 'scale(' + scale + ')';
    }
    else {
      span.style.width = '100%';
    }

    // Measure the width of the element, and return the scale that
    // we can use to make it fit in the container. The return values
    // are restricted to a set that matches the standard font sizes
    // we use in Gaia.
    //
    // Note that this only works if the element is display:inline
    function getScale(element, container) {
      var elementWidth = element.getBoundingClientRect().width;
      var s = container.clientWidth / elementWidth;
      if (s >= 1) {
        return 1;    // 10pt font "Body Large"
      }
      if (s >= 0.8) {
        return 0.8;   // 8pt font "Body"
      }
      if (s >= 0.7) {
        return 0.7;   // 7pt font "Body Medium"
      }
      if (s >= 0.65) {
        return 0.65;  // 6.5pt font "Body Small"
      }
      if (s >= 0.6) {
        return 0.6;   // 6pt font "Body Mini"
      }
      return s;      // Something smaller than 6pt.
    }
  };

  exports.Suggestions = Suggestions;
}(window));
