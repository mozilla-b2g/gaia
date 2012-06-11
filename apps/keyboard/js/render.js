'use strict';

const IMERender = (function() {

  var ime, menu, pendingSymbolPanel, candidatePanel, candidatePanelToggleButton;

  var init = function kr_init() {
    this.ime = document.getElementById('keyboard');
  }

  var setUpperCaseLock = function kr_setUpperCaseLock() {
    // TODO: To control render of shift key
  }
  //
  // Public method that draws the Keyboard
  //
  var draw = function kr_draw(layout, language, scrollHandler) {

    //change scale (Our target screen width is 320px)
    //TODO get document.documentElement.style.fontSize
    //and use it for multipling changeScale deppending on the value of pixel density
    //used in media queries

    var content = '';
    var layoutWidth = layout.width || 10;
    var widthRatio = 10 / layoutWidth;

    resizeUI();

    layout.keys.forEach((function buildKeyboardRow(row, nrow) {
      content += '<div class="keyboard-row">';
      row.forEach((function buildKeyboardColumns(key, ncolumn) {
        var keyChar = key.value;
        var code = key.keyCode || keyChar.charCodeAt(0);
        var className = '';
        var alt = '';
        if (layout.alt) {
          if (layout.alt[keyChar] != undefined) {
            alt = layout.alt[keyChar];
          } else if (layout.alt[key.value] && IMEController.isUpperCase) {
            alt = layout.alt[key.value].toUpperCase();
          }
        }
        var ratio = key.ratio || 1;

        //key with + key separation in rems
        var keyWidth = ratio;
        var dataset = [{'key': 'row', 'value': nrow}];
        dataset.push({'key': 'column', 'value': ncolumn});
        dataset.push({'key': 'keycode', 'value': code});

        if (language && code == -3) {
          dataset.push({'key': 'keyboard', 'value': language});
        }

        content += buildKey(keyChar, className, keyWidth, dataset);

      }));
      content += '</div>';
    }));

    // Append empty accent char menu and key highlight into content HTML
    content += '<span id="keyboard-accent-char-menu-out"><span id="keyboard-accent-char-menu"></span></span>';
    content += '<span id="keyboard-key-highlight"></span>';

    this.ime.innerHTML = content;
    this.menu = document.getElementById('keyboard-accent-char-menu');

    if (layout.needsCandidatePanel) {
      this.ime.insertBefore(candidatePanelToggleButtonCode(), this.ime.firstChild);
      this.ime.insertBefore(candidatePanelCode(scrollHandler), this.ime.firstChild);
      this.ime.insertBefore(pendingSymbolPanelCode(), this.ime.firstChild);
      showPendingSymbols('');
      showCandidates([], true);
    }
  };

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

  var highlightKey = function kr_updateKeyHighlight(key) {
    key.classList.add('highlighted');
  }

  var unHighlightKey = function kr_unHighlightKey(key) {
    key.classList.remove('highlighted');
  };

  var showPendingSymbols = function km_showPendingSymbols(symbols) {
    // TODO: Save the element
    var pendingSymbolPanel = document.getElementById('keyboard-pending-symbol-panel');
    if (pendingSymbolPanel)
      pendingSymbolPanel.textContent = symbols;
  };

  var showCandidates = function km_showCandidates(candidates, noWindowHeightUpdate) {
    var ime = document.getElementById('keyboard');
    // TODO: Save the element
    var candidatePanel = document.getElementById('keyboard-candidate-panel');
    var isFullView = ime.classList.contains('full-candidate-panel');

    candidatePanel.innerHTML = '';

    if (!candidates.length) {
      ime.classList.remove('candidate-panel');
      ime.classList.remove('full-candidate-panel');
      // if (!noWindowHeightUpdate)
      //   updateTargetWindowHeight();
      return;
    }

    if (!isFullView) {
      ime.classList.add('candidate-panel');
    }

    candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

    // if (!noWindowHeightUpdate)
    //   updateTargetWindowHeight();

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
  };

  var showAlternativesCharMenu = function km_showAlternativesCharMenu(key, altChars) {
    // TODO: !!! Fix alternateLayout alt keys

    var target = key;
    var cssWidth = target.style.width;
    var left = (window.innerWidth / 2 > target.offsetLeft);
    var altCharsCurrent = [];

    if (left === true) {
      this.menu.style.left = '-moz-calc(' + target.offsetLeft + 'px - 0.8rem)';
      this.menu.style.right = 'auto';
      this.menu.style.textAlign = 'center';
      altCharsCurrent.push(key.firstChild.innerHTML);
      altCharsCurrent = altCharsCurrent.concat(altChars);
    } else {
      var width = '-moz-calc(' + window.innerWidth + 'px - ' + target.offsetLeft + 'px - 0.8rem - ' + target.style.width + ' )';
      this.menu.style.right = width;
      this.menu.style.left = 'auto';
      this.menu.style.textAlign = 'center';
      altCharsCurrent = altChars.reverse();
      altCharsCurrent.push(key.firstChild.innerHTML);
    }

    var content = '';
    var auxCount = 0;
    altCharsCurrent.forEach(function(keyChar) {
      var keyCode = keyChar.keyCode || keyChar.charCodeAt(0);
      var dataset = [{'key': 'keycode', 'value': keyCode}];
      var label = keyChar.label || keyChar;
      content += buildKey(label, '', cssWidth, dataset);
    });
    this.menu.innerHTML = content;
    this.menu.style.display = 'block';
    this.menu.style.top = '-moz-calc(' + target.offsetTop + 'px - 4.6rem)';
  };

  var hideAlternativesCharMenu = function km_hideAlternativesCharMenu() {
    this.menu = document.getElementById('keyboard-accent-char-menu');
    this.menu.innerHTML = '';
    this.menu.className = '';
    this.menu.style.display = 'none';
  };

  var resizeUI = function() {

     if (window.innerWidth > 0 && window.innerWidth < window.innerHeight) {
        var changeScale = window.innerWidth / 32;
        document.documentElement.style.fontSize = changeScale + 'px';
      }
      if (window.innerWidth > window.innerHeight) {
        var changeScale = window.innerWidth / 64;
        document.documentElement.style.fontSize = changeScale + 'px';
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
  // @dataset: Array of Hash with every { 'key': KEY, 'value': VALUE} to be applied as dataset
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
    //width -= 1;

    var content = '<button class="keyboard-key ' + className + '"';
    dataset.forEach(function(data) {
        content += ' data-' + data.key + '="' + data.value + '" ';
      }
    );
    content += ' style="-moz-box-flex:' + width + '"';
    content += '><span>' + label + '</span></button>';
    return content;

  };

  return {
    'init': init,
    'draw': draw,
    'ime': ime,
    'hideIME': hideIME,
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock,
    'resizeUI': resizeUI,
    'showCandidates': showCandidates,
    'showPendingSymbols': showPendingSymbols
  };
})();
