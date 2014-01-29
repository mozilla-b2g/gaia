/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/** @fileoverview Render is in charge of draw and composite HTML elements
 * under requestion of the IMEController. IMERender is able to read from the
 * layout to improve its performance but is not allowed to communicate with
 * the controller nor manager.
 */
// XXX: The only thing worth to be remebered is the KEY element must be the
// deepest interactive HTML element on the hierarchy or, if none, simply the
// deepest element. This element must contain dataset-keycode and related
// attributes.
const IMERender = (function() {

  var ime, activeIme, menu;
  var getUpperCaseValue, isSpecialKey;

  var _menuKey, _altContainer;

  var layoutWidth = 10;

  var numberOfCandidatesPerRow = 8;
  var candidateUnitWidth;

  var inputMethodName; // used as a CSS class on the candidatePanel

  // Initialize the render. It needs some business logic to determine:
  //   1- The uppercase for a key object
  //   2- When a key is a special key
  var init = function kr_init(uppercaseFunction, keyTest) {
    getUpperCaseValue = uppercaseFunction;
    isSpecialKey = keyTest;
    ime = document.getElementById('keyboard');
    menu = document.getElementById('keyboard-accent-char-menu');
  };

  var setInputMethodName = function(name) {
    var candidatePanel = activeIme &&
      activeIme.querySelector('.keyboard-candidate-panel');
    if (candidatePanel) {
      if (inputMethodName)
        candidatePanel.classList.remove(inputMethodName);
      candidatePanel.classList.add(name);
    }
    var togglebutton = activeIme &&
      activeIme.querySelector('.keyboard-candidate-panel-toggle-button');
    if (togglebutton) {
      if (inputMethodName)
        togglebutton.classList.remove(inputMethodName);
      togglebutton.classList.add(name);
    }

    inputMethodName = name;
  };

  // Accepts three values: true / 'locked' / false
  //   Use 'locked' when caps are locked
  //   Use true when uppercase is enabled
  //   Use false when uppercase if disabled
  var setUpperCaseLock = function kr_setUpperCaseLock(state) {
    var capsLockKey = activeIme.querySelector(
      'button[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
    );

    if (!capsLockKey)
      return;

    if (state === 'locked') {
      capsLockKey.classList.remove('kbr-key-active');
      capsLockKey.classList.add('kbr-key-hold');
    } else if (state) {
      capsLockKey.classList.add('kbr-key-active');
      capsLockKey.classList.remove('kbr-key-hold');
    } else {
      capsLockKey.classList.remove('kbr-key-active');
      capsLockKey.classList.remove('kbr-key-hold');
    }
  };

  // Draw the keyboard and its components. Meat is here.
  var draw = function kr_draw(layout, flags, callback) {
    flags = flags || {};

    var supportsSwitching = 'mozInputMethod' in navigator ?
      navigator.mozInputMethod.mgmt.supportsSwitching() : false;
    var keyboardClass = [
      layout.keyboardName,
      layout.altLayoutName,
      ('' + flags.inputType).substr(0, 1),
      ('' + flags.showCandidatePanel).substr(0, 1),
      ('' + flags.uppercase).substr(0, 1),
      supportsSwitching
    ].join('-');

    // lets see if we have this keyboard somewhere already...
    var container = document.getElementsByClassName(keyboardClass)[0];
    if (!container) {
      container = document.createElement('div');
      container.classList.add('keyboard-type-container');
      container.classList.add(keyboardClass);
      if (layout.specificCssRule) {
        container.classList.add(keyboardName);
      }
      buildKeyboard(container, flags, layout);
      ime.appendChild(container);
    }

    if (activeIme !== container) {
      if (activeIme) {
        activeIme.style.display = 'none';
        delete activeIme.dataset.active;
      }
      container.style.display = 'block';
      container.dataset.active = true;

      activeIme = container;

      // Only resize UI if layout changed
      resizeUI(layout, callback);
    }
    else { // activeIME is already correct
      if (callback) {
        // The callback might be blocking, so we want to process
        // on next tick.
        requestAnimationFrame(callback);
      }
    }
  };

  /**
   * Build keyboard HTML structure
   * Pass a container element
   */
  var buildKeyboard = function kr_build(container, flags, layout) {
    flags = flags || {};

    // change scale (Our target screen width is 320px)
    // TODO get document.documentElement.style.fontSize
    // and use it for multipling changeScale deppending on the value of pixel
    // density used in media queries

    layoutWidth = layout.width || 10;
    var totalWidth = ime.clientWidth;
    var placeHolderWidth = totalWidth / layoutWidth;

    layout.upperCase = layout.upperCase || {};

    var content = document.createDocumentFragment();
    layout.keys.forEach((function buildKeyboardRow(row, nrow) {
      var kbRow = document.createElement('div');
      var rowLayoutWidth = 0;
      kbRow.classList.add('keyboard-row');
      kbRow.classList.add('row' + nrow);

      if (nrow === layout.keys.length - 1) {
        kbRow.classList.add('keyboard-last-row');
      }

      row.forEach((function buildKeyboardColumns(key, ncolumn) {
        var keyChar = key.value;

        // Keys may be hidden if the .hidden property contains the inputType
        if (key.hidden && key.hidden.indexOf(flags.inputType) !== -1)
          return;

        // Keys may be visible if the .visibile property contains the inputType
        if (key.visible && key.visible.indexOf(flags.inputType) === -1)
          return;

        // We will always display keys in uppercase, per request from UX.
        var upperCaseKeyChar = getUpperCaseValue(key);

        // Handle override
        var code = key.keyCode || keyChar.charCodeAt(0);
        // Uppercase keycode
        var upperCode = key.keyCode || getUpperCaseValue(key).charCodeAt(0);

        var className = '';
        if (isSpecialKey(key)) {
          className = 'special-key';
        } else if (layout.keyClassName) {
          className = layout.keyClassName;
        }

        if (key.className) {
          className += ' ' + key.className;
        }

        var ratio = key.ratio || 1;
        rowLayoutWidth += ratio;

        var keyWidth = placeHolderWidth * ratio;
        var dataset = [{'key': 'row', 'value': nrow}];
        dataset.push({'key': 'column', 'value': ncolumn});
        dataset.push({'key': 'keycode', 'value': code});
        dataset.push({'key': 'keycodeUpper', 'value': upperCode});
        if (key.compositeKey) {
          dataset.push({'key': 'compositekey', 'value': key.compositeKey});
        }

        var attributeList = [];
        if (key.disabled) {
          attributeList.push({
            key: 'disabled',
            value: 'true'
          });
        }
        var outputChar = flags.uppercase ? upperCaseKeyChar : keyChar;
        kbRow.appendChild(buildKey(outputChar, className, keyWidth + 'px',
          dataset, key.altNote, attributeList));
      }));

      kbRow.dataset.layoutWidth = rowLayoutWidth;

      content.appendChild(kbRow);
    }));

    container.innerHTML = '';

    container.appendChild(content);

    // Builds candidate panel
    if (flags.showCandidatePanel) {
      container.insertBefore(
        candidatePanelToggleButtonCode(), container.firstChild);
      container.insertBefore(candidatePanelCode(), container.firstChild);
      container.insertBefore(pendingSymbolPanelCode(), container.firstChild);
      showPendingSymbols('');
      showCandidates([], true);

      container.classList.add('candidate-panel');
    } else {
      container.classList.remove('candidate-panel');
    }
  };

  var showIME = function hm_showIME() {
    delete ime.dataset.hidden;
  };

  var hideIME = function km_hideIME() {
    ime.dataset.hidden = 'true';
  };

  // Highlight a key
  var highlightKey = function kr_updateKeyHighlight(key, alternativeKey) {
    key.classList.add('highlighted');

    if (alternativeKey) {
      var spanToReplace = key.querySelector('.visual-wrapper span');
      spanToReplace.textContent = alternativeKey;
    }
  };

  // Unhighlight a key
  var unHighlightKey = function kr_unHighlightKey(key) {
    key.classList.remove('highlighted');
  };

  // Show pending symbols with highlight (selection) if provided
  var showPendingSymbols = function km_showPendingSymbols(symbols,
                                                          highlightStart,
                                                          highlightEnd,
                                                          highlightState) {
    if (!activeIme)
      return;

    var HIGHLIGHT_COLOR_TABLE = {
      'red': 'keyboard-pending-symbols-highlight-red',
      'green': 'keyboard-pending-symbols-highlight-green',
      'blue': 'keyboard-pending-symbols-highlight-blue'
    };

    // TODO: Save the element
    var pendingSymbolPanel =
      activeIme.querySelector('.keyboard-pending-symbol-panel');

    if (pendingSymbolPanel) {

      if (typeof highlightStart === 'undefined' ||
        typeof highlightEnd === 'undefined' ||
        typeof highlightState === 'undefined') {
        pendingSymbolPanel.textContent = symbols;
        return;
      }

      var span = document.createElement('span');
      span.className = HIGHLIGHT_COLOR_TABLE[highlightState];
      span.textContent = symbols.slice(highlightStart, highlightEnd);

      pendingSymbolPanel.innerHTML = '';
      pendingSymbolPanel.appendChild(span);
      pendingSymbolPanel.appendChild(
        document.createTextNode(symbols.substr(highlightEnd)));
    }
  };

  var toggleCandidatePanel = function(expand) {
    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

    if (expand) {
      ime.classList.remove('candidate-panel');
      ime.classList.add('full-candidate-panel');
    } else {
      ime.classList.remove('full-candidate-panel');
      ime.classList.add('candidate-panel');
    }
  };

  var isFullCandidataPanelShown = function() {
    return ime.classList.contains('full-candidate-panel');
  };

  // Show candidates
  // Each candidate is a string or an array of two strings
  var showCandidates = function(candidates, noWindowHeightUpdate) {
    if (!activeIme)
      return;

    // TODO: Save the element
    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    var candidatePanelToggleButton =
      activeIme.querySelector('.keyboard-candidate-panel-toggle-button');

    if (candidatePanel) {
      candidatePanel.dataset.candidateIndicator = 0;

      candidatePanel.innerHTML = '';
      candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

      var docFragment = document.createDocumentFragment();

      if (inputMethodName == 'latin') {
        if (candidates.length) {
          var dismissButton = document.createElement('div');
          dismissButton.classList.add('dismiss-suggestions-button');
          candidatePanel.appendChild(dismissButton);
          var candidateWidth =
            (candidatePanel.clientWidth - dismissButton.clientWidth);
          candidateWidth /= candidates.length;
          candidateWidth -= 6; // 3px margin on each side
        }

        candidates.forEach(function buildCandidateEntry(candidate) {
          // Make sure all of the candidates are defined
          if (!candidate) return;

          // Each candidate gets its own div
          var div = document.createElement('div');

          // Size the div based on the # of candidates
          div.style.width = candidateWidth + 'px';

          candidatePanel.appendChild(div);

          var text, data, correction = false;
          if (typeof candidate === 'string') {
            if (candidate[0] === '*') { // it is an autocorrection candidate
              candidate = candidate.substring(1);
              correction = true;
            }
            data = text = candidate;
          }
          else {
            text = candidate[0];
            data = candidate[1];
          }

          var span = fitText(div, text);
          span.dataset.selection = true;
          span.dataset.data = data;
          if (correction)
            span.classList.add('autocorrect');

          // Put the text in a span and make it fit in the container
          function fitText(container, text) {
            container.textContent = '';
            if (!text)
              return null;
            var span = document.createElement('span');
            span.textContent = text;
            container.appendChild(span);

            var limit = .6;  // Dont use a scale smaller than this
            var scale = IMERender.getScale(span, container);

            // If the text does not fit within the scaling limit,
            // reduce the length of the text by replacing characters in
            // the middle with ...
            if (scale < limit) {
              var charactersReplaced = text.length % 2;
              while (scale < limit && charactersReplaced < text.length - 2) {
                charactersReplaced += 2;
                var halflen = (text.length - charactersReplaced) / 2;
                span.textContent = text.substring(0, halflen) +
                  '…' +
                  text.substring(text.length - halflen);
                scale = IMERender.getScale(span, container);
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

            return span;
          }
        });
      } else {
        candidatePanelToggleButton.style.display = 'none';
        toggleCandidatePanel(false);
        docFragment = candidatesFragmentCode(1, candidates, true);
        candidatePanel.appendChild(docFragment);
      }

    }
  };

  var showMoreCandidates = function(rowLimit, candidates) {
    if (!rowLimit) rowLimit = -1;
    if (!candidates) return;
    activeIme.querySelector('.keyboard-candidate-panel').appendChild(
      candidatesFragmentCode(rowLimit, candidates)
    );
  };

  var getNumberOfCandidatesPerRow = function() {
    return numberOfCandidatesPerRow;
  };

  var candidatesFragmentCode = function(rowLimit, candidates, indentFirstRow) {
    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    var candidatePanelToggleButton =
      activeIme.querySelector('.keyboard-candidate-panel-toggle-button');

    var docFragment = document.createDocumentFragment();
    if (candidates.length == 0) {
      candidatePanel.dataset.rowCount = 0;
      return docFragment;
    }

    var rowDiv = document.createElement('div');
    rowDiv.classList.add('candidate-row');
    if (indentFirstRow) {
      rowDiv.classList.add('candidate-row-first');
    }

    var nowUnit = 0;
    var rowCount = 0;

    if (rowLimit < 0) {
      rowLimit = Number.Infinity;
    }

    var candidatesLength = candidates.length;

    for (var i = 0; i < candidatesLength; i++) {
      var cand = candidates[i][0];
      var data = candidates[i][1];
      var span = document.createElement('span');
      var unit = (cand.length >> 1) + 1;

      span.textContent = cand;
      span.dataset.selection = true;
      span.dataset.data = data;
      span.style.width = (unit * candidateUnitWidth - 2) + 'px';

      nowUnit += unit;

      var needBreak = false;
      if (rowCount == 0 && indentFirstRow &&
          nowUnit == numberOfCandidatesPerRow && i != candidatesLength - 1) {
        needBreak = true;
      }

      if (nowUnit > numberOfCandidatesPerRow || needBreak) {
        if (rowCount == 0) {
          candidatePanelToggleButton.style.display = 'block';
        }

        if (rowCount >= rowLimit - 1) {
          break;
        }

        docFragment.appendChild(rowDiv);
        rowCount++;

        rowDiv = document.createElement('div');
        rowDiv.classList.add('candidate-row');
        nowUnit = unit;
      }

      rowDiv.appendChild(span);
    }

    if (i != candidatesLength) {
      candidatePanel.dataset.truncated = true;
    } else {
      delete candidatePanel.dataset.truncated;
    }

    candidatePanel.dataset.rowCount = rowCount + 1;
    candidatePanel.dataset.candidateIndicator =
      parseInt(candidatePanel.dataset.candidateIndicator) + i;

    docFragment.appendChild(rowDiv);
    rowDiv = null;

    return docFragment;
  };

  // Show char alternatives.
  var showAlternativesCharMenu = function(key, altChars) {
    var content = document.createDocumentFragment();
    var left = (window.innerWidth / 2 > key.offsetLeft);

    // Place the menu to the left
    if (!left) {
      menu.classList.add('kbr-menu-left');
      altChars = altChars.reverse();
    }

    // How wide (in characters) is the key that we're displaying
    // these alternatives for?
    var keycharwidth = key.dataset.compositeKey ?
      key.dataset.compositeKey.length : 1;

    // Build a key for each alternative
    altChars.forEach(function(alt, index) {
      var dataset = alt.length == 1 ?
        [
          { 'key': 'keycode', 'value': alt.charCodeAt(0) },
          { 'key': 'keycodeUpper', 'value': alt.toUpperCase().charCodeAt(0) }
        ] :
        [{'key': 'compositekey', 'value': alt}];

      // Make each of these alternative keys 75% as wide as the key that
      // it is an alternative for, but adjust for the relative number of
      // characters in the original and the alternative
      var width = 0.75 * key.offsetWidth / keycharwidth * alt.length;

      content.appendChild(buildKey(alt, '', width + 'px', dataset));
    });
    menu.innerHTML = '';
    menu.appendChild(content);

    // Replace with the container
    _altContainer = document.createElement('div');
    _altContainer.style.display = 'inline-block';
    _altContainer.style.width = key.style.width;
    _altContainer.innerHTML = key.innerHTML;
    _altContainer.className = key.className;
    _altContainer.classList.add('kbr-menu-on');
    _menuKey = key;
    key.parentNode.replaceChild(_altContainer, key);

    // Adjust menu style
    _altContainer
      .querySelectorAll('.visual-wrapper > span')[0]
      .appendChild(menu);
    menu.style.display = 'block';

    // Adjust offset when alternatives menu overflows
    var alternativesLeft = getWindowLeft(menu);
    var alternativesRight = alternativesLeft + menu.offsetWidth;

    var offset;

    if (alternativesLeft < 0 || alternativesRight > window.innerWidth) {
      if (left) {  // alternatives menu extends to the right
        // Figure out what the current offset is. This is set in CSS to -1.2rem
        offset = parseInt(getComputedStyle(menu).left);
        if (alternativesLeft < 0) {                       // extends past left
          offset += -alternativesLeft;
        }
        else if (alternativesRight > window.innerWidth) { // extends past right
          offset -= (alternativesRight - window.innerWidth);
        }
        menu.style.left = offset + 'px';
      }
      else {       // alternatives menu extends to the left
        // Figure out what the current offset is. This is set in CSS to -1.2rem
        offset = parseInt(getComputedStyle(menu).right);
        if (alternativesRight > window.innerWidth) {      // extends past right
          offset += (alternativesRight - window.innerWidth);
        }
        else if (alternativesLeft < 0) {                  // extends past left
          offset += alternativesLeft;
        }
        menu.style.right = offset + 'px';
      }
    }
  };

  // Hide the alternative menu
  var hideAlternativesCharMenu = function km_hideAlternativesCharMenu() {
    menu.style.display = 'none';
    menu.className = ''; // clear classes except ID
    menu.innerHTML = '';

    if (_altContainer) {
      _altContainer.parentNode.replaceChild(_menuKey, _altContainer);
    }

    menu.style.left = '';
    menu.style.right = '';
  };

  var _keyArray = []; // To calculate proximity info for predictive text

  // Recalculate dimensions for the current render
  var resizeUI = function(layout, callback) {
    var RESIZE_UI_TIMEOUT = 0;

    // This function consists of three actual functions
    // 1. setKeyWidth (sets the correct width for every key)
    // 2. firstAndLastKeyLarger (makes sure all keys fill up available space)
    // 3. getVisualData (stores visual offsets in internal array)
    // these are seperated into separate groups because they do similar
    // operations and minimizing reflow causes because of this

    function setKeyWidth() {
      var ratio, keys;

      for (var r = 0, row; row = rows[r]; r += 1) {
        keys = row.childNodes;
        for (var k = 0, key; key = keys[k]; k += 1) {
          ratio = layout.keys[r][k].ratio || 1;

          key.style.width = Math.floor(placeHolderWidth * ratio) + 'px';
        }
      }

      setTimeout(firstAndLastKeyLarger, RESIZE_UI_TIMEOUT);
    }

    function firstAndLastKeyLarger() {
      for (var r = 0, row = rows[r]; r < rows.length; row = rows[++r]) {
        // Only do rows that have space on left or right side
        var rowLayoutWidth = parseInt(row.dataset.layoutWidth, 10);
        if (rowLayoutWidth === layoutWidth) {
          continue;
        }

        var allKeys = row.childNodes;
        var keys = [allKeys[0], allKeys[allKeys.length - 1]];

        for (var k = 0, key = keys[k]; k < keys.length; key = keys[++k]) {
          var visualKey = key.querySelector('.visual-wrapper');
          var ratio = layout.keys[r][k].ratio || 1;
          // keep visual key width
          visualKey.style.width = visualKey.offsetWidth + 'px';

          // calculate new tap area
          var newRatio = ratio + ((layoutWidth - rowLayoutWidth) / 2);
          key.style.width = Math.floor(placeHolderWidth * newRatio) + 'px';
          key.classList.add('float-key-' + (k === 0 ? 'first' : 'last'));
        }
      }

      setTimeout(getVisualData, RESIZE_UI_TIMEOUT);
    }

    function getVisualData() {
      // Now that key sizes have been set and adjusted for the row,
      // loop again and record the size and position of each. If we
      // do this as part of the loop above, we get bad position data.
      // We do this in a seperate loop to avoid reflowing
      for (var r = 0, row; row = rows[r]; r++) {
        for (var k = 0, key; key = row.childNodes[k]; k++) {
          var visualKey = key.querySelector('.visual-wrapper');
          _keyArray.push({
            code: key.dataset.keycode | 0,
            x: visualKey.offsetLeft,
            y: visualKey.offsetTop,
            width: visualKey.clientWidth,
            height: visualKey.clientHeight
          });
        }
      }

      candidateUnitWidth =
        Math.floor(ime.clientWidth / numberOfCandidatesPerRow);

      [].forEach.call(
        ime.querySelectorAll('.candidate-row span'),
        function(item) {
          var unit = (item.textContent.length >> 1) + 1;
          item.style.width = (unit * candidateUnitWidth - 2) + 'px';
        }
      );

      if (callback) {
        callback();
      }
    }

    var changeScale;

    // Font size recalc
    if (window.innerWidth <= window.innerHeight) {
      changeScale = window.innerWidth / 32;
      document.documentElement.style.fontSize = changeScale + 'px';
      ime.classList.remove('landscape');
      ime.classList.add('portrait');
    } else {
      changeScale = window.innerWidth / 64;
      document.documentElement.style.fontSize = changeScale + 'px';
      ime.classList.remove('portrait');
      ime.classList.add('landscape');
    }

    _keyArray = [];

    // Width calc
    if (!layout || !activeIme) {
      return;
    }

    // Remove inline styles on rotation
    [].forEach.call(ime.querySelectorAll('.visual-wrapper[style]'),
      function(item) {
        item.style.width = '';
      });

    layoutWidth = layout.width || 10;
    // Hack alert! we always use 100% of width so we avoid calling
    // keyboard.clientWidth because that causes a costy reflow...
    var totalWidth = window.innerWidth;
    var placeHolderWidth = totalWidth / layoutWidth;
    var rows = activeIme.querySelectorAll('.keyboard-row');

    setKeyWidth();
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
    pendingSymbolPanel.classList.add('keyboard-pending-symbol-panel');
    return pendingSymbolPanel;
  };

  var candidatePanelCode = function() {
    var candidatePanel = document.createElement('div');
    candidatePanel.classList.add('keyboard-candidate-panel');
    if (inputMethodName)
      candidatePanel.classList.add(inputMethodName);

    return candidatePanel;
  };

  var candidatePanelToggleButtonCode = function() {
    var toggleButton = document.createElement('span');
    toggleButton.classList.add('keyboard-candidate-panel-toggle-button');
    toggleButton.dataset.keycode = -4;
    if (inputMethodName) {
      toggleButton.classList.add(inputMethodName);
    }

    toggleButton.style.width =
      Math.floor(ime.clientWidth /
                 numberOfCandidatesPerRow) + 'px';

    return toggleButton;
  };

  var buildKey = function buildKey(label, className, width, dataset, altNote,
                                   attributeList) {

    var altNoteNode;
    if (altNote) {
      altNoteNode = document.createElement('div');
      altNoteNode.className = 'alt-note';
      altNoteNode.textContent = altNote;
    }

    var contentNode = document.createElement('button');
    contentNode.className = 'keyboard-key ' + className;
    contentNode.setAttribute('style', 'width: ' + width + ';');

    if (attributeList) {
      attributeList.forEach(function(attribute) {
        contentNode.setAttribute(attribute.key, attribute.value);
      });
    }

    dataset.forEach(function(data) {
      contentNode.dataset[data.key] = data.value;
    });

    if (contentNode.dataset.keycode != KeyboardEvent.DOM_VK_RETURN &&
        contentNode.dataset.keycode != KeyboardEvent.DOM_VK_BACK_SPACE) {
      // The 'key' role tells an assistive technology that these buttons
      // are used for composing text or numbers, and should be easier to
      // activate than usual buttons. We keep return and backspace as
      // buttons so that their activation is not performed by mistake.
      contentNode.setAttribute('role', 'key');
    }

    var vWrapperNode = document.createElement('span');
    vWrapperNode.className = 'visual-wrapper';

    var labelNode = document.createElement('span');
    // Using innerHTML here because some labels (so far only the &nbsp; in the
    // space key) can be HTML entities.
    labelNode.innerHTML = label;
    labelNode.dataset.label = label;

    vWrapperNode.appendChild(labelNode);
    if (altNoteNode) {
      vWrapperNode.appendChild(altNoteNode);
    }
    contentNode.appendChild(vWrapperNode);

    return contentNode;
  };

  var getWidth = function getWidth() {
    if (!activeIme)
      return 0;

    return ime.clientWidth;
  };

  var getHeight = function getHeight() {
    if (!activeIme)
      return 0;

    return ime.clientHeight;
  };

  var getKeyArray = function getKeyArray() {
    return _keyArray;
  };

  var getKeyWidth = function getKeyWidth() {
    if (!activeIme)
      return 0;

    return Math.ceil(ime.clientWidth / layoutWidth);
  };

  var getKeyHeight = function getKeyHeight() {
    if (!activeIme)
      return 0;

    var rows = activeIme.querySelectorAll('.keyboard-row');
    var rowCount = rows.length || 3;

    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    var candidatePanelHeight = candidatePanel ? candidatePanel.clientHeight : 0;

    return Math.ceil((ime.clientHeight - candidatePanelHeight) / rowCount);
  };

  // Measure the width of the element, and return the scale that
  // we can use to make it fit in the container. The return values
  // are restricted to a set that matches the standard font sizes
  // we use in Gaia.
  //
  // Note that this only works if the element is display:inline
  var getScale = function(element, container) {
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
  };

  var _t = {};
  function startTime(key) {
    // _t[key] = +new Date;
  }

  function endTime(key) {
    // dump('~' + key + ' ' + (+new Date - _t[key]) + '\n');
  }

  // Exposing pattern
  return {
    'init': init,
    'setInputMethodName': setInputMethodName,
    'draw': draw,
    get ime() {
      return ime;
    },
    get menu() {
      return menu;
    },
    'hideIME': hideIME,
    'showIME': showIME,
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock,
    'resizeUI': resizeUI,
    'showCandidates': showCandidates,
    'showPendingSymbols': showPendingSymbols,
    'getWidth': getWidth,
    'getHeight': getHeight,
    'getKeyArray': getKeyArray,
    'getKeyWidth': getKeyWidth,
    'getKeyHeight': getKeyHeight,
    'getScale': getScale,
    'showMoreCandidates': showMoreCandidates,
    'toggleCandidatePanel': toggleCandidatePanel,
    'isFullCandidataPanelShown': isFullCandidataPanelShown,
    'getNumberOfCandidatesPerRow': getNumberOfCandidatesPerRow,
    get activeIme() {
      return activeIme;
    },
    set activeIme(v) {
      activeIme = v;
    },
    get candidatePanel() {
      return activeIme && activeIme.querySelector('.keyboard-candidate-panel');
    }
  };
})();
