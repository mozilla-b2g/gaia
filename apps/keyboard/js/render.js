const IMERender = (function() {

  var ime, menu;

  var init = function kr_init() {
    this.ime = document.getElementById('keyboard');
  }

  var setUpperCaseLock = function kr_setUpperCaseLock() {
    // TODO: To control render of shift key
  }
  //
  // Public method that draws the Keyboard
  //
  var draw = function kr_draw(layout) {

    //change scale (Our target screen width is 320px)
    //TODO get document.documentElement.style.fontSize
    //and use it for multipling changeScale deppending on the value of pixel density
    //used in media queries

    if(window.innerWidth > 0) {
      var changeScale = window.innerWidth / 32;
      document.documentElement.style.fontSize = changeScale + 'px';
    }

    var content = '';
    var layoutWidth = layout.width || 10;
    var widthRatio = 10 / layoutWidth;

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
        var keyWidth = (((widthRatio * ratio) * 2.6) + ((widthRatio * ratio) - 1) * 0.4);
        content += buildKey(nrow, ncolumn, code, keyChar, className, keyWidth, alt);

      }));
      content += '</div>';
    }));

    // Append empty accent char menu and key highlight into content HTML
    content += '<span id="keyboard-accent-char-menu-out"><span id="keyboard-accent-char-menu"></span></span>';
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

  var showAlternativesCharMenu = function km_showAlternativesCharMenu(key, altChars) {
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
      if ((left && auxCount == 0) || (!left && auxCount == altCharsCurrent.length - 1))
        content += buildKey(-1, -1, keyChar.charCodeAt(0), keyChar, 'first-char', cssWidth);
      else
        content += buildKey(-1, -1, keyChar.charCodeAt(0), keyChar, '', cssWidth);
      auxCount++;
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


  //
  // Private Methods
  //

  var buildKey = function buildKey(row, column, code, label, className, width, alt) {
    //width -= 1;

    return '<button class="keyboard-key ' + className + '"' +
      ' data-row="' + row + '"' +
      ' data-column="' + column + '"' +
      ' data-keycode="' + code + '"' +
      // ' style="width:' + width + 'rem"' +
    '><span>' + label + '</span></button>';
  };

  return {
    'init': init,
    'draw': draw,
    'ime': ime,
    'highlightKey': highlightKey,
    'unHighlightKey': unHighlightKey,
    'showAlternativesCharMenu': showAlternativesCharMenu,
    'hideAlternativesCharMenu': hideAlternativesCharMenu,
    'setUpperCaseLock': setUpperCaseLock
  };
})();
