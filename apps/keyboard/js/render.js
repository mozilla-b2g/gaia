'use strict';

// Render is in charge of draw and composite HTML elements under requestion
// of the IMEController. IMERender is able to read from the layout to improve
// its performance but is not allowed to communicate with the controller nor
// manager.
//
// XXX: The only thing worth to be remebered is the KEY element must be the
// deepest interactive HTML element on the hierarchy or, if none, simply the
// deepest element. This element must contain dataset-keycode and related
// attributes.
const IMERender = (function() {

  var ime, menu, pendingSymbolPanel, candidatePanel, candidatePanelToggleButton;
  var getUpperCaseValue, isSpecialKey;

  var _menuKey, _altContainer;

  // Initiaze the render. It needs some business logic to determine:
  //   1- The uppercase for a key object
  //   2- When a key is a special key
  var init = function kr_init(uppercaseFunction, keyTest) {
    getUpperCaseValue = uppercaseFunction;
    isSpecialKey = keyTest;
    this.ime = document.getElementById('keyboard');
  }

  // Accepts three values: true / 'locked' / false
  //   Use 'locked' when caps are locked
  //   Use true when uppercase is enabled
  //   Use false when uppercase if disabled
  var setUpperCaseLock = function kr_setUpperCaseLock(key, state) {
    if (state === 'locked') {
      key.classList.remove('kbr-key-active');
      key.classList.add('kbr-key-hold');

    } else if (state) {
      key.classList.add('kbr-key-active');
      key.classList.remove('kbr-key-hold');

    } else {
      key.classList.remove('kbr-key-active');
      key.classList.remove('kbr-key-hold');
    }
  }

  // Draw the keyboard and its components. Meat is here.
  var draw = function kr_draw(layout, scrollHandler, flags) {
    flags = flags || {};

    // change scale (Our target screen width is 320px)
    // TODO get document.documentElement.style.fontSize
    // and use it for multipling changeScale deppending on the value of pixel
    // density used in media queries

    var content = '';
    var layoutWidth = layout.width || 10;
    var totalWidth = document.getElementById('keyboard').clientWidth;
    var placeHolderWidth = totalWidth / layoutWidth;

    layout.upperCase = layout.upperCase || {};
    layout.keys.forEach((function buildKeyboardRow(row, nrow) {
      content += '<div class="keyboard-row">';
      row.forEach((function buildKeyboardColumns(key, ncolumn) {

        var keyChar = key.value;
        if (flags.uppercase)
          keyChar = getUpperCaseValue(key);

        var code = key.keyCode || keyChar.charCodeAt(0);
        var className = isSpecialKey(key) ? 'special-key' : '';
        var ratio = key.ratio || 1;

        var keyWidth = placeHolderWidth * ratio;
        var dataset = [{'key': 'row', 'value': nrow}];
        dataset.push({'key': 'column', 'value': ncolumn});
        dataset.push({'key': 'keycode', 'value': code});
        if (key.compositeKey) {
          dataset.push({'key': 'compositekey', 'value': key.compositeKey});
        }

        content += buildKey(keyChar, className, keyWidth, dataset);

      }));
      content += '</div>';
    }));

    // Append empty accent char menu and key highlight into content HTML
    content += '<span id="keyboard-accent-char-menu-out">' +
               '<span id="keyboard-accent-char-menu"></span></span>';
    content += '<span id="keyboard-key-highlight"></span>';

    this.ime.innerHTML = content;
    this.menu = document.getElementById('keyboard-accent-char-menu');

    // Builds candidate panel
    if (layout.needsCandidatePanel) {
      this.ime.insertBefore(
        candidatePanelToggleButtonCode(), this.ime.firstChild);
      this.ime.insertBefore(
        candidatePanelCode(scrollHandler), this.ime.firstChild);
      this.ime.insertBefore(pendingSymbolPanelCode(), this.ime.firstChild);
      showPendingSymbols('');
      showCandidates([], true);
    }
  };

  // Effecto for hide IME
  var hideIME = function km_hideIME(imminent) {
    if (this.ime.dataset.hidden)
      return;

    this.ime.dataset.hidden = 'true';
    var ime = this.ime;

    if (imminent) {
      ime.classList.add('imminent');
      window.setTimeout(function remoteImminent() {
        ime.classList.remove('imminent');
      }, 0);

      ime.innerHTML = '';
    } else {
      ime.classList.add('hide');
    }
  };

  // Highlight a key
  var highlightKey = function kr_updateKeyHighlight(key) {
    key.classList.add('highlighted');
  }

  // Unhighlight a key
  var unHighlightKey = function kr_unHighlightKey(key) {
    key.classList.remove('highlighted');
  };

  // Show pending symbols with highlight (selection) if provided
  var showPendingSymbols = function km_showPendingSymbols(symbols,
                                                            highlightStart,
                                                            highlightEnd,
                                                            highlightState) {
    var HIGHLIGHT_COLOR_TABLE = {
      'red': 'keyboard-pending-symbols-highlight-red',
      'green': 'keyboard-pending-symbols-highlight-green',
      'blue': 'keyboard-pending-symbols-highlight-blue'
    };

    // TODO: Save the element
    var pendingSymbolPanel =
      document.getElementById('keyboard-pending-symbol-panel');

    if (pendingSymbolPanel) {

      if (typeof highlightStart === 'undefined' ||
          typeof highlightEnd === 'undefined' ||
          typeof highlightState === 'undefined') {
        pendingSymbolPanel.textContent = symbols;
        return;
      }

      pendingSymbolPanel.innerHTML = "<span class='" +
                                     HIGHLIGHT_COLOR_TABLE[highlightState] +
                                     "'>" +
                                     symbols.slice(
                                       highlightStart, highlightEnd) +
                                     '</span>' +
                                     symbols.substr(highlightEnd);
    }
  };

  // Show candidates
  var showCandidates = function(candidates, noWindowHeightUpdate) {

    var ime = document.getElementById('keyboard');
    // TODO: Save the element
    var candidatePanel = document.getElementById('keyboard-candidate-panel');
    var isFullView = ime.classList.contains('full-candidate-panel');


    if (candidatePanel) {
      candidatePanel.innerHTML = '';

      if (!candidates.length) {
        ime.classList.remove('candidate-panel');
        ime.classList.remove('full-candidate-panel');
        return;
      }

      if (!isFullView) {
        ime.classList.add('candidate-panel');
      }

      candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

      // If there were too many candidate
      delete candidatePanel.dataset.truncated;
      if (candidates.length > 74) {
        candidates = candidates.slice(0, 74);
        candidatePanel.dataset.truncated = true;
      }

      candidates.forEach(function buildCandidateEntry(candidate) {
        var span = document.createElement('span');
        span.dataset.data = candidate[1];
        span.dataset.selection = true;
        span.textContent = candidate[0];
        candidatePanel.appendChild(span);
      });
    }
  };

  // Show keyboard alternatives
  var showKeyboardAlternatives = function(key, keyboards, current, switchCode) {
    var dataset, className, content = '';
    var menu = this.menu;

    var cssWidth = key.style.width;
    menu.classList.add('kbr-menu-lang');
    key.classList.add('kbr-menu-on');

    for (var i = 0, kbr; kbr = keyboards[i]; i += 1) {
      className = 'keyboard-key';

      dataset = [
        {key: 'keyboard', value: kbr},
        {key: 'keycode', value: switchCode}
      ];
      content += buildKey(
        Keyboards[kbr].menuLabel,
        className, cssWidth,
        dataset
      );
    }
    menu.innerHTML = content;

    // Replace with the container
    _altContainer = document.createElement('div');
    _altContainer.innerHTML = key.innerHTML;
    _altContainer.className = key.className;
    _menuKey = key;
    key.parentNode.replaceChild(_altContainer, key);

    _altContainer.querySelectorAll('.visual-wrapper > span')[0].appendChild(menu);
    menu.style.display = 'block';
  };

  // Show char alternatives. The first element of altChars is ALWAYS the
  // original char.
  var showAlternativesCharMenu = function(key, altChars) {
    var content = '', cssWidth = key.scrollWidth;

    var original = altChars[0];
    altChars = altChars.slice(1);

    var altCharsCurrent = [];
    var left = (window.innerWidth / 2 > key.offsetLeft);

    // Place the menu to the left and adds the original key at the end
    if (left) {
      this.menu.classList.add('kbr-menu-left');
      altCharsCurrent.push(original);
      altCharsCurrent = altCharsCurrent.concat(altChars);

    // Place menu on the right and adds the original key at the beginning
    } else {
      this.menu.classList.add('kbr-menu-right');
      altCharsCurrent = altChars.reverse();
      altCharsCurrent.push(original);
    }

    // Build a key for each alternative
    altCharsCurrent.forEach(function(keyChar) {
      var keyCode = keyChar.keyCode || keyChar.charCodeAt(0);
      var dataset = [{'key': 'keycode', 'value': keyCode}];
      var label = keyChar.label || keyChar;
      if (label.length > 1)
        dataset.push({'key': 'compositekey', 'value': label});
      content += buildKey(label, '', cssWidth, dataset);
    });
    this.menu.innerHTML = content;

    // Replace with the container
    _altContainer = document.createElement('div');
    _altContainer.style.display = 'inline-block';
    _altContainer.style.width = key.style.width;
    _altContainer.innerHTML = key.innerHTML;
    _altContainer.className = key.className;
    _menuKey = key;
    key.parentNode.replaceChild(_altContainer, key);

    // Adjust menu style
    _altContainer
      .querySelectorAll('.visual-wrapper > span')[0]
      .appendChild(this.menu);
    this.menu.style.display = 'block';
  };

  // Hide the alternative menu
  var hideAlternativesCharMenu = function km_hideAlternativesCharMenu() {
    this.menu = document.getElementById('keyboard-accent-char-menu');
    this.menu.innerHTML = '';
    this.menu.className = '';
    this.menu.style.display = 'none';

    if (_altContainer)
      _altContainer.parentNode.replaceChild(_menuKey, _altContainer);
  };

  // Recalculate dimensions for the current render
  var resizeUI = function(layout) {
    var changeScale, scale, kbr;

    // Font size recalc
    if (window.innerWidth > 0 && window.innerWidth < window.innerHeight) {
      changeScale = window.innerWidth / 32;
      document.documentElement.style.fontSize = changeScale + 'px';
    }
    if (window.innerWidth > window.innerHeight) {
      changeScale = window.innerWidth / 64;
      document.documentElement.style.fontSize = changeScale + 'px';
    }

    // Width calc
    var layoutWidth = layout.width || 10;
    var totalWidth = document.getElementById('keyboard').clientWidth;
    var placeHolderWidth = totalWidth / layoutWidth;
    kbr = document.getElementById('keyboard');

    var ratio, keys, rows = document.querySelectorAll('.keyboard-row');
    for (var r = 0, row; row = rows[r]; r += 1) {
      keys = row.childNodes;
      for (var k = 0, key; key = keys[k]; k += 1) {
        ratio = layout.keys[r][k].ratio || 1;
        key.style.width = (placeHolderWidth * ratio) + 'px';
      }
    }
  };

  //
  // Private Methods
  //

  //*
  // Method that generates the HTML markup for each key
  // @label: String inside the key
  // @className: String representing a className to be added to the key
  // @width: Int to be applied as moz-box-flex
  // @dataset: Array of Hash with every { 'key': KEY, 'value': VALUE}
  // to be applied as dataset
  //*

  var pendingSymbolPanelCode = function() {
    var pendingSymbolPanel = document.createElement('div');
    pendingSymbolPanel.id = 'keyboard-pending-symbol-panel';
    return pendingSymbolPanel;
  };

  var candidatePanelCode = function(scrollHandler) {
    var candidatePanel = document.createElement('div');
    candidatePanel.id = 'keyboard-candidate-panel';
    candidatePanel.addEventListener('scroll', scrollHandler);
    return candidatePanel;
  };

  var candidatePanelToggleButtonCode = function() {
    var toggleButton = document.createElement('span');
    toggleButton.innerHTML = '⇪';
    toggleButton.id = 'keyboard-candidate-panel-toggle-button';
    toggleButton.dataset.keycode = -4;
    return toggleButton;
  };

  var buildKey = function buildKey(label, className, width, dataset) {
    var content = '<button class="keyboard-key ' + className + '"';
    dataset.forEach(function(data) {
      content += ' data-' + data.key + '="' + data.value + '" ';
    });
    content +=  ' style="width:' + width + 'px"';
    content += '><span class="visual-wrapper"><span>' + label + '</span></span></button>';
    return content;
  };

  // Exposing pattern
  return {
    'init': init,
    'draw': draw,
    'ime': ime,
    'hideIME': hideIME,
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'showKeyboardAlternatives': showKeyboardAlternatives,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock,
    'resizeUI': resizeUI,
    'showCandidates': showCandidates,
    'showPendingSymbols': showPendingSymbols
  };
})();
