(function(exports) {
  'use strict';

  // Add the suggestions panel to the keyboard display area
  var suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'suggestions';
  document.getElementById('keyboardContainer')
    .appendChild(suggestionsContainer);

  function display(suggestions) {
    suggestionsContainer.textContent = '';
    // Each suggestion gets this much width (-2% for margins)
    var width = (100 / suggestions.length - 2) + '%';
    suggestions.forEach(function(word) {
      appendSuggestion(word, width);
    });
  }

  function appendSuggestion(word, width) {
    // Each suggestion gets its own div
    var div = document.createElement('div');

    // Give it a class for styling, but explictly set the width
    div.className = 'suggestion';
    div.style.width = width;

    // Add the empty suggestion to the container now so we can measure
    // the word inside it.
    suggestionsContainer.appendChild(div);

    if (word[0] === '*') { // it is an autocorrection candidate
      word = word.substring(1);
      div.classList.add('autocorrect');
    }

    fitWord(div, word);
    div.dataset.word = word;
  }

  // Remove any existing content of the container and display the
  // specified word in it, adjusting the scaling to make the word
  // fit. The word is placed in a span inside the container.  The
  // container must be in the document for the measurement to work.
  function fitWord(container, word) {
    container.textContent = '';
    if (!word)
      return null;
    var span = document.createElement('span');
    span.textContent = word;
    container.appendChild(span);

    var limit = .6;  // Dont use a scale smaller than this
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
      if (s >= 1)
        return 1;    // 10pt font "Body Large"
      if (s >= .8)
        return .8;   // 8pt font "Body"
      if (s >= .7)
        return .7;   // 7pt font "Body Medium"
      if (s >= .65)
        return .65;  // 6.5pt font "Body Small"
      if (s >= .6)
        return .6;   // 6pt font "Body Mini"
      return s;      // Something smaller than 6pt.
    }

  }

  // Use touchend events to detect clicks on the word suggestions.
  // If we want to add gesture support to dismiss, we'll need something
  // more sophisticated
  suggestionsContainer.ontouchend = function(e) {
    var target = e.target;
    // Loop up from the touch target element until we find a suggestion
    // Then dispatch an event about it
    while (target !== suggestionsContainer) {
      if (target.classList.contains('suggestion')) {
        var word = target.dataset.word + ' ';
        var event = new CustomEvent('suggestionselected', { detail: word });
        suggestionsContainer.dispatchEvent(event);
        return;
      }
      target = target.parentNode;
    }
  };

  // EventTarget methods
  function addEventListener(type, handler) {
    suggestionsContainer.addEventListener(type, handler);
  }

  function removeEventListener(type, handler) {
    suggestionsContainer.removeEventListener(type, handler);
  }

  exports.Suggestions = {
    display: display,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener
  };

}(window));
