const IMERender = (function() {

  var ime, menu;

  var init = function kr_init() {
    this.ime = document.getElementById('keyboard');
  }

  //
  // Public method that draws the Keyboard
  //
  var draw = function kr_draw(layoutId, currentType) {
    var layout = Keyboards[layoutId];

    var content = '';
    var layoutWidth = layout.width || 10;
    var layoutKeys;

    if (currentType) {
      var specialKeys = addSpecialKeys(layout);
      layoutKeys = layout.keys.concat([specialKeys]);
    } else {
      layoutKeys = layout.keys;
    }

    layoutKeys.forEach((function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';
      row.forEach((function buildKeyboardColumns(key) {
        var keyChar = key.value;
        var code = key.keyCode || keyChar.charCodeAt(0);
        var className = '';
        var alt = '';
        if (layout.alt[keyChar] != undefined) {
          alt = layout.alt[keyChar];
        } else if (layout.alt[key.value] && IMEController.isUpperCase) {
          alt = layout.alt[key.value].toUpperCase();
        }

        var ratio = key.ratio || 1;
        var keyWidth = (ratio * 100) / layoutWidth;
        content += buildKey(code, keyChar, className, keyWidth, alt);

      }));
      content += '</div>';
    }));

    // Append empty accent char menu and key highlight into content HTML
    content += '<span id="keyboard-accent-char-menu"></span>';
    content += '<span id="keyboard-key-highlight"></span>';

    this.ime.innerHTML = content;
    this.menu = document.getElementById('keyboard-accent-char-menu');
  };

  var highlightKey = function kr_updateKeyHighlight(key) {
    key.classList.add('highlighted');
  }

  var unHighlightKey = function kr_unHighlightKey(key) {
    key.classList.remove('highlighted');
  };

  var showAccentCharMenu = function km_showAccentCharMenu(key) {
    var target = key;
    var cssWidth = target.style.width;
    var altChars = target.dataset.alt ? target.dataset.alt.split('') : [];
    if (!altChars.length)
      return;

    console.log(this.menu.innerHTML);

    var content = '';
    altChars.forEach(function(keyChar) {
      content += buildKey(keyChar.charCodeAt(0), keyChar, '', cssWidth);
    });

    this.menu.innerHTML = content;
    this.menu.className = 'show';

    this.menu.style.top = target.offsetTop + 'px';

    var left = target.offsetLeft;

  };

  var hideAccentCharMenu = function km_hideAccentCharMenu() {
    this.menu = document.getElementById('keyboard-accent-char-menu');
    console.log(this.menu);
    console.log(this.menu.innerHTML);
    this.menu.innerHTML = '';
    this.menu.className = '';
    console.log('hide ' + this.menu.innerHTML);
  };


  // 
  // Private Methods
  // 

  var buildKey = function buildKey(code, label, className, width, alt) {
    return '<button class="keyboard-key ' + className + '"' +
      ' data-keycode="' + code + '"' +
      ' style="width:' + width + '%"' +
      ((alt) ? ' data-alt=' + alt : '') +
    '>' + label + '</button>';
  };

  var addSpecialKeys = function kr_addSpecialKeys(layout) {
    var newKeys = [];
    var ratio = 8;
    var width = layout.width ? layout.width : 10;

    // Alternate Keyboards
    if (!layout['disableAlternateLayout']) {
      ratio -=2;
      var alternateKey = addAlternateKeys(IMEController.currentKeyboardMode);
      newKeys.push(alternateKey);
    }

    // Text specific Keys
    if (!layout['typeInsensitive']) {
      addTypeSensitiveKeys(IMEController.currentType, ratio, newKeys, layout.textLayoutOverwrite);
    }

    // Return Key
    newKeys.push({ value: '↵', ratio: ratio, keyCode: KeyEvent.DOM_VK_RETURN });

    return newKeys;
  };


  var addAlternateKeys = function kr_addAlternateKeys(currentKeyboardMode) {
    var alternateLayoutKey, alternateKey = '';
    if (currentKeyboardMode == '') {
      alternateLayoutKey = '?123';
      alternateKey = { value: alternateLayoutKey, ratio: 2, keyCode: IMEController.ALTERNATE_LAYOUT };
    } else {
      alternateLayoutKey = 'ABC';
      alternateKey = { value: alternateLayoutKey, ratio: 2, keyCode: IMEController.BASIC_LAYOUT };
    }
    return alternateKey;
  };

  var addTypeSensitiveKeys = function kr_addTypeSensitiveKeys(type, ratio, newKeys, overwrites) {
    switch (type) {
      case 'url':
        var size = Math.floor(ratio / 3);
        ratio -= size * 2;
        newKeys.push({ value: '.', ratio: size, keyCode: 46 });
        newKeys.push({ value: '/', ratio: size, keyCode: 47 });
        newKeys.push({ value: '.com', ratio: ratio, keyCode: IMEController.DOT_COM });
      break;
      case 'email':
        ratio -= 2;
        newKeys.push({ value: ' ', ratio: ratio, keyCode: KeyboardEvent.DOM_VK_SPACE });
        newKeys.push({ value: '@', ratio: 1, keyCode: 64 });
        newKeys.push({ value: '.', ratio: 1, keyCode: 46 });
      break;
      case 'text':

        // TODO: Refactor
        if (overwrites) {
          if (overwrites['.'] !== false)
            ratio -= 1;
          if (overwrites[','] !== false)
            ratio -= 1;
          if (overwrites[',']) {
            newKeys.push({ value: overwrites[','], ratio: 1, keyCode: overwrites[','].charCodeAt(0) });
          } else if (overwrites[','] !== false) {
            newKeys.push({ value: overwrites[','], ratio: 1, keyCode: 44 });
          }

          if (overwrites['.']) {
            newKeys.push({ value: overwrites['.'], ratio: 1, keyCode: overwrites['.'].charCodeAt(0) });
          } else if (overwrites['.'] !== false) {
            newKeys.push({ value: '.', ratio: 1, keyCode: 46 });
          }
        }
        newKeys.push({ value: ' ', ratio: ratio, keyCode: KeyboardEvent.DOM_VK_SPACE });

      break;
    }
  };

  return {
    'init': init,
    'draw': draw,
    'ime': ime,
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAccentCharMenu': showAccentCharMenu,
    'hideAccentCharMenu': hideAccentCharMenu
  };
})();
