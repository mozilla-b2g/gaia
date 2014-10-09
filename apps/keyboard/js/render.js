/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global AlternativesCharMenuView */

'use strict';

/** @fileoverview Render is in charge of draw and composite HTML elements
 * under requestion of the IMEController. IMERender is able to read from the
 * layout to improve its performance but is not allowed to communicate with
 * the controller nor manager.
 */
// XXX: The only thing worth to be remebered is the KEY element must be the
// deepest interactive HTML element on the hierarchy or, if none, simply the
// deepest element. This element must be mapped in LayoutRenderingManager's
// _domObjectMap in order to retrieve the key object defined and normalized in
// layouts and to access its attributes.
var IMERender = (function() {

  var ime, activeIme;
  var alternativesCharMenu = null;
  var _menuKey = null;
  var renderingManager = null;

  // a WeakMap to map target key object onto the DOM element it's associated
  // with; essentially the revrse mapping of |renderingManager._domObjectMap|.
  // ideally this should only be accessed by this renderer and alt_char_menu's
  // view.
  var targetObjDomMap = null;

  var layoutWidth = 10;

  var numberOfCandidatesPerRow = 8;
  var candidateUnitWidth;

  var inputMethodName; // used as a CSS class on the candidatePanel

  var cachedWindowHeight = -1;
  var cachedWindowWidth = -1;

  var ARIA_LABELS = {
    '⇪': 'upperCaseKey2',
    '⌫': 'backSpaceKey2',
    '&nbsp': 'spaceKey2',
    '↵': 'returnKey2',
    '.': 'periodKey2',
    ',': 'commaKey2',
    ':': 'colonKey2',
    ';': 'semicolonKey2',
    '?': 'questionMarkKey2',
    '!': 'exclamationPointKey2',
    '(': 'leftBracketKey2',
    ')': 'rightBracketKey2',
    '"': 'doubleQuoteKey2',
    '«': 'leftDoubleAngleQuoteKey2',
    '»': 'rightDoubleAngleQuoteKey2'
  };

  window.addEventListener('resize', function kr_onresize() {
    cachedWindowHeight = window.innerHeight;
    cachedWindowWidth = window.innerWidth;
  });

  // Initialize the render. It needs some business logic to determine:
  //   1- The uppercase for a key object
  //   2- When a key is a special key
  var init = function kr_init(layoutRenderingManager) {
    ime = document.getElementById('keyboard');

    renderingManager = layoutRenderingManager;

    cachedWindowHeight = window.innerHeight;
    cachedWindowWidth = window.innerWidth;

    targetObjDomMap = new WeakMap();
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

  // Accepts a state object with two properties.
  //   Set isUpperCaseLocked to true if locked
  //   Set isUpperCase to true when uppercase is enabled
  //   Use false on both of these properties when uppercase is disabled
  var setUpperCaseLock = function kr_setUpperCaseLock(state) {
    var capsLockKey = activeIme.querySelector(
      'button:not([disabled])' +
      '[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
    );

    if (!capsLockKey)
      return;

    if (state.isUpperCaseLocked) {
      capsLockKey.classList.remove('kbr-key-active');
      capsLockKey.classList.add('kbr-key-hold');
    } else if (state.isUpperCase) {
      capsLockKey.classList.add('kbr-key-active');
      capsLockKey.classList.remove('kbr-key-hold');
    } else {
      capsLockKey.classList.remove('kbr-key-active');
      capsLockKey.classList.remove('kbr-key-hold');
    }

    capsLockKey.setAttribute('aria-pressed',
      state.isUpperCaseLocked || state.isUpperCase);
  };

  // Draw the keyboard and its components. Meat is here.
  var draw = function kr_draw(layout, flags, callback) {
    flags = flags || {};

    var supportsSwitching = 'mozInputMethod' in navigator ?
      navigator.mozInputMethod.mgmt.supportsSwitching() : false;
    var keyboardClass = [
      layout.layoutName,
      layout.pageIndex,
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
        container.classList.add(layout.layoutName);
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
    else if ((ime.classList.contains('landscape') && screenInPortraitMode()) ||
             (ime.classList.contains('portrait') && !screenInPortraitMode())) {
      // screen orientation changed since last time, need to resize UI
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

      row.forEach((function buildKeyboardColumns(key) {
        // Keys may be hidden if the .hidden property contains the inputType
        if (key.hidden && key.hidden.indexOf(flags.inputType) !== -1)
          return;

        // Keys may be visible if the .visibile property contains the inputType
        if (key.visible && key.visible.indexOf(flags.inputType) === -1)
          return;

        var attributeList = [];
        var className = '';

        if (key.isSpecialKey) {
          className = 'special-key';
        } else {
          // The 'key' role tells an assistive technology that these buttons
          // are used for composing text or numbers, and should be easier to
          // activate than usual buttons. We keep special keys, like backspace,
          // as buttons so that their activation is not performed by mistake.
          attributeList.push({
            key: 'role',
            value: 'key'
          });

          if (layout.keyClassName) {
            className = layout.keyClassName;
          }
        }

        if (key.className) {
          className += ' ' + key.className;
        }

        var ratio = key.ratio || 1;
        rowLayoutWidth += ratio;

        var outputChar = flags.uppercase ? key.uppercaseValue : key.value;

        var keyWidth = placeHolderWidth * ratio;

        if (key.disabled) {
          attributeList.push({
            key: 'disabled',
            value: 'true'
          });
        }

        if (key.ariaLabel || ARIA_LABELS[key.value]) {
          attributeList.push({
            key: 'data-l10n-id',
            value: key.ariaLabel || ARIA_LABELS[key.value]
          });
        } else {
          attributeList.push({
            key: 'aria-label',
            value: key.ariaLabel || key.value
          });
        }

        var keyElement = buildKey(outputChar, className, keyWidth + 'px',
          key, key.longPressValue, attributeList);

        // a few dataset properties are retained in bug 1044525 because some css
        // and ui/integration tests rely on them.
        // also to not break them we spell keycode instead of keyCode in dataset
        keyElement.dataset.keycode = key.keyCode;
        keyElement.dataset.keycodeUpper = key.keyCodeUpper;
        if ('targetPage' in key) {
          keyElement.dataset.targetPage = key.targetPage;
        }
        if ('compositeKey' in key) {
          keyElement.dataset.compositeKey = key.compositeKey;
        }

        kbRow.appendChild(keyElement);

        setDomElemTargetObject(keyElement, key);
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
      showCandidates([]);

      container.classList.add('candidate-panel');
    } else {
      container.classList.remove('candidate-panel');
    }
  };

  // Highlight the key according to the case.
  var highlightKey = function kr_updateKeyHighlight(key, options) {
    var keyElem = targetObjDomMap.get(key);

    options = options || {};

    keyElem.classList.add('highlighted');

    // Show lowercase pop.
    if (!options.showUpperCase) {
      keyElem.classList.add('lowercase');
    }
  };

  // Unhighlight a key
  var unHighlightKey = function kr_unHighlightKey(key) {
    var keyElem = targetObjDomMap.get(key);
    keyElem.classList.remove('highlighted');
    keyElem.classList.remove('lowercase');
  };

  var toggleCandidatePanel = function(expand) {
    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

    toggleCandidatePanelWithoutResetScroll(expand);
  };

  var toggleCandidatePanelWithoutResetScroll = function(expand) {
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
  var showCandidates = function(candidates) {
    if (!activeIme)
      return;

    if (inputMethodName == 'vietnamese' && candidates.length) {
      // In the Vietnamese IM, the candidates correspond to tones.
      // There will be either 2 or 5. All must appear.
      numberOfCandidatesPerRow = candidates.length;
      candidateUnitWidth =
        Math.floor(ime.clientWidth / numberOfCandidatesPerRow);
    }

    // TODO: Save the element
    var candidatePanel = activeIme.querySelector('.keyboard-candidate-panel');
    var candidatePanelToggleButton =
      activeIme.querySelector('.keyboard-candidate-panel-toggle-button');

    if (candidatePanel) {
      candidatePanel.dataset.candidateIndicator = 0;

      var docFragment = document.createDocumentFragment();

      if (inputMethodName == 'latin') {
        var dismissButton =
          candidatePanel.querySelector('.dismiss-suggestions-button');
        dismissButton.classList.add('hide');

        // hide dismiss button
        if (candidates.length > 0) {
          dismissButton.classList.remove('hide');
        }

        var suggestContainer =
          candidatePanel.querySelector('.suggestions-container');

        // we want to do all width calculation in CSS, so add a class here
        suggestContainer.innerHTML = '';
        for (var i = 0; i < 4; i++) {
          suggestContainer.classList.remove('has' + i);
        }
        suggestContainer.classList.add('has' + candidates.length);

        candidates.forEach(function buildCandidateEntry(candidate) {
          // Make sure all of the candidates are defined
          if (!candidate) return;

          // Each candidate gets its own div
          var div = document.createElement('div');
          div.setAttribute('role', 'presentation');
          suggestContainer.appendChild(div);

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
          span.setAttribute('role', 'option');
          // TODO: the renderer should not be creating a business logic object,
          // let's move it to somewhere else.
          setDomElemTargetObject(span, {
            selection: true,
            text: span.textContent,
            data: data
          });

          // ui/integration test needs this
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
            var scale = IMERender.getScale(span, candidates.length);

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
                scale = IMERender.getScale(span, candidates.length);
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
        candidatePanel.innerHTML = '';

        candidatePanelToggleButton.style.display = 'none';
        toggleCandidatePanelWithoutResetScroll(false);
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
      var cand, data;
      if (typeof candidates[i] == 'string') {
        cand = data = candidates[i];
      } else {
        cand = candidates[i][0];
        data = candidates[i][1];
      }

      var unit = (cand.length >> 1) + 1;
      if (inputMethodName == 'vietnamese') {
        unit = 1;
      }

      var span = document.createElement('span');
      span.textContent = cand;
      // TODO: the renderer should not be creating a business logic object,
      // let's move it to somewhere else.
      setDomElemTargetObject(span, {
        selection: true,
        text: span.textContent,
        data: data
      });
      span.style.width = (unit * candidateUnitWidth - 2) + 'px';

      // ui/integration test needs this
      span.dataset.data = data;

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

    var keyWidth = (cachedWindowWidth / layoutWidth) | 0;
    var renderer = {
      ARIA_LABELS: ARIA_LABELS,
      buildKey: buildKey,
      keyWidth: keyWidth,
      screenInPortraitMode: screenInPortraitMode,
      renderingManager: renderingManager
    };

    alternativesCharMenu = new AlternativesCharMenuView(activeIme,
                                                        altChars,
                                                        renderer);
    alternativesCharMenu.show(key);
    targetObjDomMap.get(key).classList.add('kbr-menu-on');
    _menuKey = key;

    return alternativesCharMenu;
  };

  // Hide the alternative menu
  var hideAlternativesCharMenu = function km_hideAlternativesCharMenu() {
    alternativesCharMenu.hide();
    targetObjDomMap.get(_menuKey).classList.remove('kbr-menu-on');
  };

  var _keyArray = []; // To calculate proximity info for predictive text

  // Recalculate dimensions for the current render
  var resizeUI = function(layout, callback) {
    // This function consists of two actual functions
    // 1. setKeyWidth (sets the correct width for every key)
    // 2. getVisualData (stores visual offsets in internal array)
    // these are seperated into separate groups because they do similar
    // operations and minimizing reflow causes because of this
    function setKeyWidth() {
      [].forEach.call(rows, function(rowEl, rIx) {
        var rowLayoutWidth = parseInt(rowEl.dataset.layoutWidth, 10);
        var keysInRow = rowEl.childNodes.length;

        [].forEach.call(rowEl.childNodes, function(keyEl, kIx) {
          var key = layout.keys[rIx][kIx];
          var wrapperRatio = key.ratio || 1;
          var keyRatio = wrapperRatio;

          // First and last keys should fill up space
          if (kIx === 0) {
            keyEl.classList.add('float-key-first');
            keyRatio = wrapperRatio + ((layoutWidth - rowLayoutWidth) / 2);
          }
          else if (kIx === keysInRow - 1) {
            keyEl.classList.add('float-key-last');
            keyRatio = wrapperRatio + ((layoutWidth - rowLayoutWidth) / 2);
          }

          keyEl.style.width = (placeHolderWidth | 0) * keyRatio + 'px';

          // Default aligns 100%, if they differ set width on the wrapper
          if (keyRatio !== wrapperRatio) {
            var wrapperEl = keyEl.querySelector('.visual-wrapper');
            wrapperEl.style.width =
              (placeHolderWidth * wrapperRatio | 0) + 'px';
          }
        });
      });

      requestAnimationFrame(getVisualData);
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
            code: renderingManager.getTargetObject(key).keyCode,
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
          if (inputMethodName == 'vietnamese') {
            unit = 1;
          }
          item.style.width = (unit * candidateUnitWidth - 2) + 'px';
        }
      );

      if (callback) {
        callback();
      }
    }

    var changeScale;

    // Font size recalc
    if (screenInPortraitMode()) {
      changeScale = cachedWindowWidth / 32;
      document.documentElement.style.fontSize = changeScale + 'px';
      ime.classList.remove('landscape');
      ime.classList.add('portrait');
    } else {
      changeScale = cachedWindowWidth / 64;
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
    var totalWidth = cachedWindowWidth;
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

  var candidatePanelCode = function() {
    var candidatePanel = document.createElement('div');
    candidatePanel.setAttribute('role', 'group');
    candidatePanel.dataset.l10nId = 'wordSuggestions2';

    candidatePanel.classList.add('keyboard-candidate-panel');
    if (inputMethodName)
      candidatePanel.classList.add(inputMethodName);

    var dismissButton = document.createElement('div');
    dismissButton.classList.add('dismiss-suggestions-button');
    dismissButton.classList.add('hide');
    dismissButton.setAttribute('role', 'button');
    dismissButton.dataset.l10nId = 'dismiss2';
    candidatePanel.appendChild(dismissButton);

    var suggestionContainer = document.createElement('div');
    suggestionContainer.classList.add('suggestions-container');
    suggestionContainer.setAttribute('role', 'listbox');
    candidatePanel.appendChild(suggestionContainer);

    // TODO: the renderer should not be creating a business logic object,
    // let's move it to somewhere else.
    setDomElemTargetObject(dismissButton, {isDismissSuggestionsButton: true});

    return candidatePanel;
  };

  var candidatePanelToggleButtonCode = function() {
    var toggleButton = document.createElement('span');
    toggleButton.classList.add('keyboard-candidate-panel-toggle-button');
    // we're not getting reference of LayoutManager, so define this manually
    var KEYCODE_TOGGLE_CANDIDATE_PANEL = -4;

    // TODO: the renderer should not be creating a bussiness logic object,
    // let's move it to somewhere else.
    setDomElemTargetObject(toggleButton, {
      keyCode: KEYCODE_TOGGLE_CANDIDATE_PANEL
    });

    if (inputMethodName) {
      toggleButton.classList.add(inputMethodName);
    }

    toggleButton.style.width =
      Math.floor(ime.clientWidth /
                 numberOfCandidatesPerRow) + 'px';

    return toggleButton;
  };

  var buildKey = function buildKey(label, className, width, key, altNote,
                                   attributeList) {
    var altNoteNode;
    if (altNote) {
      altNoteNode = document.createElement('div');
      altNoteNode.className = 'alt-note';
      altNoteNode.textContent = altNote;
    }

    var contentNode = document.createElement('button');
    contentNode.className = 'keyboard-key ' + className;
    contentNode.style.width = width;

    if (attributeList) {
      attributeList.forEach(function(attribute) {
        contentNode.setAttribute(attribute.key, attribute.value);
      });
    }

    var vWrapperNode = document.createElement('span');
    vWrapperNode.className = 'visual-wrapper';

    var labelNode = document.createElement('span');
    // Using innerHTML here because some labels (so far only the &nbsp; in the
    // space key) can be HTML entities.
    labelNode.innerHTML = label;
    labelNode.className = 'key-element';
    labelNode.dataset.label = label;
    vWrapperNode.appendChild(labelNode);

    // Add uppercase and lowercase pop-up for highlighted key
    labelNode = document.createElement('span');
    labelNode.innerHTML = label;
    labelNode.className = 'uppercase popup';
    vWrapperNode.appendChild(labelNode);

    labelNode = document.createElement('span');
    labelNode.innerHTML = key.lowercaseValue;
    labelNode.className = 'lowercase popup';
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

    return cachedWindowWidth;
  };

  var getHeight = function getHeight() {
    if (!activeIme)
      return 0;

    var scale = screenInPortraitMode() ?
      cachedWindowWidth / 32 :
      cachedWindowWidth / 64;

    var height = (activeIme.querySelectorAll('.keyboard-row').length *
      (5.1 * scale));

    if (activeIme.classList.contains('candidate-panel')) {
      if (activeIme.querySelector('.keyboard-candidate-panel')
          .classList.contains('latin')) {
        height += (3.1 * scale);
      }
      else {
        height += (3.2 * scale);
      }
    }

    return height | 0;
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

  // a helper function to set both rendering manager's forward map,
  // and renderer's reverse map.
  // ideally this should only be used with views (renderer & alt_char_menu.js).
  var setDomElemTargetObject = function setDomElemTargetObject(elem, obj) {
    renderingManager.domObjectMap.set(elem, obj);
    targetObjDomMap.set(obj, elem);
  };

  // Measure the width of the element, and return the scale that
  // we can use to make it fit in the container. The return values
  // are restricted to a set that matches the standard font sizes
  // we use in Gaia.
  //
  // Note that this only works if the element is display:inline
  var scaleContext = null;
  var getScale = function(element, noOfSuggestions) {
    if (!scaleContext) {
      scaleContext = document.createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
      scaleContext.font = '2rem sans-serif';
    }

    var elementWidth = scaleContext.measureText(element.textContent).width;

    // container width is window width - 36 (for the dismiss button) and then
    // depending on the number of suggestions there are
    var cw = (cachedWindowWidth - 36) / noOfSuggestions | 0;
    cw -= 6; // 6 pixels margin on both sides

    var s = cw / elementWidth;
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

  var screenInPortraitMode = function() {
    return cachedWindowWidth <= cachedWindowHeight;
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
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock,
    'resizeUI': resizeUI,
    'showCandidates': showCandidates,
    'getWidth': getWidth,
    'getHeight': getHeight,
    'getKeyArray': getKeyArray,
    'getKeyWidth': getKeyWidth,
    'getKeyHeight': getKeyHeight,
    'getScale': getScale,
    'setDomElemTargetObject': setDomElemTargetObject,
    'showMoreCandidates': showMoreCandidates,
    'toggleCandidatePanel': toggleCandidatePanel,
    'isFullCandidataPanelShown': isFullCandidataPanelShown,
    'getNumberOfCandidatesPerRow': getNumberOfCandidatesPerRow,
    'candidatePanelCode': candidatePanelCode,
    get activeIme() {
      return activeIme;
    },
    set activeIme(v) {
      activeIme = v;
    },
    get candidatePanel() {
      return activeIme && activeIme.querySelector('.keyboard-candidate-panel');
    },
    get targetObjDomMap() {
      return targetObjDomMap;
    },
    setCachedWindowSize: function(width, height) {
      cachedWindowWidth = width;
      cachedWindowHeight = height;
    }
  };
})();
