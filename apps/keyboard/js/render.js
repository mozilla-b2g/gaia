/*
  Render is in charge of depicting the input method and manipulate HTML to
  perform visual feedback.
*/

const IMERender = {
  // TODO: IMERender should only receive messages from the controller.
  // So, all the references to IMEController or IMEManager should be provided
  // as parameters.

  get ime() {
    delete this.ime;
    return this.ime = document.getElementById('keyboard');
  },

  get pendingSymbolPanel() {
    delete this.pendingSymbolPanel;
    var pendingSymbolPanel = document.createElement('div');
    pendingSymbolPanel.id = 'keyboard-pending-symbol-panel';
    return this.pendingSymbolPanel = pendingSymbolPanel;
  },

  get candidatePanel() {
    delete this.candidatePanel;
    var candidatePanel = document.createElement('div');
    candidatePanel.id = 'keyboard-candidate-panel';
    candidatePanel.addEventListener('scroll', this);
    return this.candidatePanel = candidatePanel;
  },

  get candidatePanelToggleButton() {
    delete this.candidatePanelToggleButton;
    var toggleButton = document.createElement('span');
    toggleButton.innerHTML = '⇪';
    toggleButton.id = 'keyboard-candidate-panel-toggle-button';
    toggleButton.dataset.keycode = IMEController.TOGGLE_CANDIDATE_PANEL;
    return this.candidatePanelToggleButton = toggleButton;
  },

  updateKeyHighlight: function km_updateKeyHighlight() {
    var keyHighlight = this.keyHighlight;
    var target = this.currentKey;

    keyHighlight.classList.remove('show');

    if (!target || target.dataset.keyboard)
      return;

    keyHighlight.textContent = target.textContent;
    keyHighlight.classList.add('show');

    var width = keyHighlight.offsetWidth;
    var top = target.offsetTop;
    var left = target.offsetLeft + target.offsetWidth / 2 - width / 2;

    var menu = this.menu;
    if (target.parentNode === menu) {
      top += menu.offsetTop;
      left += menu.offsetLeft;
    }

    var candidatePanel = this.candidatePanel;
    if (target.parentNode === candidatePanel) {
      top += candidatePanel.offsetTop - candidatePanel.scrollTop;
      left += candidatePanel.offsetLeft - candidatePanel.scrollLeft;
    }

    left = Math.max(left, 5);
    left = Math.min(left, window.innerWidth - width - 5);

    keyHighlight.style.top = top + 'px';
    keyHighlight.style.left = left + 'px';
  },

  // TODO: This probably should be moved to controller
  currentKey: null,

  showAccentCharMenu: function km_showAccentCharMenu() {
    var target = this.currentKey;
    if (!target)
      return;

    var keyCode = parseInt(this.currentKey.dataset.keycode);
    var content = '';

    if (!target.dataset.alt && keyCode !== IMEController.SWITCH_KEYBOARD)
      return;

    clearTimeout(this._hideMenuTimeout);

    var cssWidth = target.style.width;

    var menu = this.menu;
    if (keyCode == IMEController.SWITCH_KEYBOARD) {

      this.keyHighlight.classList.remove('show');

      menu.className = 'show menu';

      for (var i in IMEManager.keyboards) {
        var keyboard = IMEManager.keyboards[i];
        var className = 'keyboard-key keyboard-key-special';

        if (IMEController.currentKeyboard == keyboard)
          className += ' current-keyboard';

        content += '<span class="' + className + '" ' +
          'data-keyboard="' + keyboard + '" ' +
          'data-keycode="' + IMEController.SWITCH_KEYBOARD + '" ' +
          '>' +
          Keyboards[keyboard].menuLabel +
          '</span>';
      }

      menu.innerHTML = content;
      menu.style.top = (target.offsetTop - menu.offsetHeight) + 'px';
      menu.style.left = '10px';

      return;
    }

    var before = (window.innerWidth / 2 > target.offsetLeft);
    var dataset = target.dataset;

    if (before) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    var altChars = target.dataset.alt.split('');
    if (!before)
      altChars = altChars.reverse();

    altChars.forEach(function(keyChar) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + keyChar.charCodeAt(0) + '"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        keyChar +
        '</span>';
    });

    if (!before) {
      content += '<span class="keyboard-key" ' +
        'data-keycode="' + dataset.keycode + '" ' +
        'data-active="true"' +
        'style="width:' + cssWidth + '"' +
        '>' +
        target.innerHTML +
        '</span>';
    }

    menu.innerHTML = content;
    menu.className = 'show';

    menu.style.top = target.offsetTop + 'px';

    var left = target.offsetLeft;
    left += (before) ? -7 : (7 - menu.offsetWidth + target.offsetWidth);
    menu.style.left = left + 'px';

    delete target.dataset.active;

    var redirectMouseOver = function redirectMouseOver(target) {
      this.redirect = function km_menuRedirection(ev) {
        ev.stopPropagation();

        var event = document.createEvent('MouseEvent');
        event.initMouseEvent(
          'mouseover', true, true, window, 0,
          ev.screenX, ev.screenY, ev.clientX, ev.clientY,
          false, false, false, false, 0, null
        );
        target.dispatchEvent(event);
      };
      this.addEventListener('mouseover', this.redirect);
    };

    var sibling = target;
    if (before) {
      var index = 0;

      while (menu.childNodes.item(index)) {
        redirectMouseOver.call(sibling, menu.childNodes.item(index));
        sibling = sibling.nextSibling;
        index++;
      }
    } else {
      var index = menu.childNodes.length - 1;

      while (menu.childNodes.item(index)) {
        redirectMouseOver.call(sibling, menu.childNodes.item(index));
        sibling = sibling.previousSibling;
        index--;
      }
    }

    this._currentMenuKey = target;

    this.currentKey = (before) ? menu.firstChild : menu.lastChild;

    this.updateKeyHighlight();

  },

  hideAccentCharMenu: function km_hideAccentCharMenu() {
    if (!this._currentMenuKey)
      return;

    var menu = this.menu;
    menu.className = '';
    menu.innerHTML = '';

    var siblings = this._currentMenuKey.parentNode.children;
    for (var i = 0; i < siblings.length; i++) {
      siblings[i].removeEventListener('mouseover', siblings[i].redirect);
    }

    delete this._currentMenuKey;
  },

  // TODO: This property is very local. We should avoid its use from the controller
  menu: null,
  updateLayout: function km_updateLayout(keyboard) {
    var layout;

    switch (IMEController.currentType) {
      case 'number':
        layout = Keyboards['numberLayout'];
      break;
      case 'tel':
        layout = Keyboards['telLayout'];
      break;
      default:
        layout = Keyboards[keyboard] || Keyboards[IMEController.currentKeyboard];
      break;
    }

    var content = '';
    var width = window.innerWidth;

    if (!layout.upperCase)
      layout.upperCase = {};
    if (!layout.alt)
      layout.alt = {};
    if (!layout.textLayoutOverwrite)
      layout.textLayoutOverwrite = {};

    // Append each row of the keyboard into content HTML

    var size = (width / (layout.width || 10));

    var buildKey = function buildKey(code, label, className, ratio, alt) {
      return '<span class="keyboard-key ' + className + '"' +
        ' data-keycode="' + code + '"' +
        ' style="width:' + (size * ratio - 4) + 'px"' +
        ((alt) ? ' data-alt=' + alt : '') +
      '>' + label + '</span>';
    };

    layout.keys.forEach((function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';

      row.forEach((function buildKeyboardColumns(key) {
        var specialCodes = [
          KeyEvent.DOM_VK_BACK_SPACE,
          KeyEvent.DOM_VK_CAPS_LOCK,
          KeyEvent.DOM_VK_RETURN,
          KeyEvent.DOM_VK_ALT
        ];
        var keyChar = key.value;

        // This gives layout author the ability to rewrite toUpperCase()
        // for languages that use special mapping, e.g. Turkish.
        var hasSpecialCode = specialCodes.indexOf(key.keyCode) > -1;
        if (!(key.keyCode < 0 || hasSpecialCode) && IMEController.isUpperCase)
          keyChar = layout.upperCase[keyChar] || keyChar.toUpperCase();

        // This gives layout author the ability to rewrite AlternateLayoutKeys
        var hasSpecialCode = specialCodes.indexOf(key.keyCode) > -1;
        if (!(key.keyCode < 0 || hasSpecialCode) && IMEController.isAlternateLayout) {
          var current = Keyboards[IMEController.currentKeyboard];
          if (current['alternateLayoutOverwrite'])
            keyChar = current['alternateLayoutOverwrite'][keyChar];
        }

        var code = key.keyCode || keyChar.charCodeAt(0);

        if (code == KeyboardEvent.DOM_VK_SPACE) {
          // space key: replace/append with control and type keys

          var ratio = key.ratio || 1;

          if (IMEManager.keyboards.length > 1 && !layout['hidesSwitchKey']) {
            // Switch keyboard key
            ratio -= 1;
            content += buildKey(
              IMEController.SWITCH_KEYBOARD,
              '&#x1f310;',
              'keyboard-key-special',
              1
            );
          }

          // Alternate layout key
          // This gives the author the ability to change the alternate layout
          // key contents
          var alternateLayoutKey = '?123';
          var current = Keyboards[IMEController.currentKeyboard];
          if (current['alternateLayoutKey']) {
            alternateLayoutKey = current['alternateLayoutKey'];
          }

          // This gives the author the ability to change the basic layout
          // key contents
          var basicLayoutKey = 'ABC';
          if (current['basicLayoutKey']) {
            basicLayoutKey = current['basicLayoutKey'];
          }

          if (!layout['disableAlternateLayout']) {
            ratio -= 2;
            if (IMEController.currentKeyboardMode == '') {
              content += buildKey(
                IMEController.ALTERNATE_LAYOUT,
                alternateLayoutKey,
                'keyboard-key-special',
                2
              );
            } else {
              content += buildKey(
                IMEController.BASIC_LAYOUT,
                basicLayoutKey,
                'keyboard-key-special',
                2
              );
            }
          }

          if (!layout['typeInsensitive']) {
            switch (IMEController.currentType) {
              case 'url':
                var size = Math.floor(ratio / 3);
                ratio -= size * 2;
                content += buildKey(46, '.', '', size);
                content += buildKey(47, '/', '', size);
                content += buildKey(IMEController.DOT_COM, '.com', '', ratio);
              break;
              case 'email':
                ratio -= 2;
                content += buildKey(
                  KeyboardEvent.DOM_VK_SPACE, key.value, 'spacekey', ratio);
                content += buildKey(64, '@', '', 1);
                content += buildKey(46, '.', '', 1);
              break;
              case 'text':
                if (layout.textLayoutOverwrite['.'] !== false)
                  ratio -= 1;
                if (layout.textLayoutOverwrite[','] !== false)
                  ratio -= 1;

                if (layout.textLayoutOverwrite[',']) {
                  content += buildKey(
                    layout.textLayoutOverwrite[','].charCodeAt(0),
                    layout.textLayoutOverwrite[','],
                    '',
                    1
                  );
                } else if (layout.textLayoutOverwrite[','] !== false) {
                  content += buildKey(44, ',', '', 1);
                }

                content += buildKey(
                  KeyboardEvent.DOM_VK_SPACE, key.value, 'spacekey', ratio);

                if (layout.textLayoutOverwrite['.']) {
                  content += buildKey(
                    layout.textLayoutOverwrite['.'].charCodeAt(0),
                    layout.textLayoutOverwrite['.'],
                    '',
                    1
                  );
                } else if (layout.textLayoutOverwrite['.'] !== false) {
                  content += buildKey(46, '.', '', 1);
                }
              break;
            }
          } else {
            content += buildKey(
              KeyboardEvent.DOM_VK_SPACE, key.value, 'spacekey', ratio);
          }

          return;
        }

        var className = '';

        if (code < 0 || specialCodes.indexOf(code) > -1)
          className += ' keyboard-key-special';

        if (code == KeyEvent.DOM_VK_CAPS_LOCK)
          className += ' toggle';

        var alt = '';
        if (layout.alt[keyChar] != undefined) {
          alt = layout.alt[keyChar];
        } else if (layout.alt[key.value] != undefined && IMEController.isUpperCase) {
          alt = layout.alt[key.value].toUpperCase();
        }

        content += buildKey(code, keyChar, className, key.ratio || 1, alt);

      }).bind(this));
      content += '</div>';
    }).bind(this));

    // Append empty accent char menu and key highlight into content HTML

    content += '<span id="keyboard-accent-char-menu"></span>';
    content += '<span id="keyboard-key-highlight"></span>';

    // Inject the HTML and assign this.menu & this.keyHighlight

    this.ime.innerHTML = content;

    if (IMEController.isUpperCaseLocked && IMEController.isUpperCase) {
      var shiftKey = document.querySelector(
        'span[data-keycode="' + KeyEvent.DOM_VK_CAPS_LOCK + '"]');
      if (shiftKey)
        shiftKey.dataset.enabled = 'true';
    }

    this.menu = document.getElementById('keyboard-accent-char-menu');
    this.keyHighlight = document.getElementById('keyboard-key-highlight');

    // insert candidate panel if the keyboard layout needs it

    var ime = this.ime;
    if (layout.needsCandidatePanel) {
      ime.insertBefore(this.candidatePanelToggleButton, ime.firstChild);
      ime.insertBefore(this.candidatePanel, ime.firstChild);
      ime.insertBefore(this.pendingSymbolPanel, ime.firstChild);
      this.showPendingSymbols('');
      this.showCandidates([], true);
      IMEController.currentEngine.empty();
    }
  },

  getTargetWindowMetrics: function km_getTargetWindowMetrics() {

  },

  showPendingSymbols: function km_showPendingSymbols(symbols) {
    var pendingSymbolPanel = this.pendingSymbolPanel;
    pendingSymbolPanel.textContent = symbols;
  },

  showCandidates: function km_showCandidates(candidates, noWindowHeightUpdate) {
    var ime = this.ime;
    var candidatePanel = this.candidatePanel;
    var isFullView = this.ime.classList.contains('full-candidate-panel');

    candidatePanel.innerHTML = '';

    if (!candidates.length) {
      ime.classList.remove('candidate-panel');
      ime.classList.remove('full-candidate-panel');
      if (!noWindowHeightUpdate)
        IMEController.updateTargetWindowHeight();
      this.updateKeyHighlight();
      return;
    }

    if (!isFullView) {
      ime.classList.add('candidate-panel');
    }

    candidatePanel.scrollTop = candidatePanel.scrollLeft = 0;

    if (!noWindowHeightUpdate)
      IMEController.updateTargetWindowHeight();

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
