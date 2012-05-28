const IMERender = (function() {

  var ime, menu;

  var init = function kr_init() {
    this.ime = document.getElementById('keyboard');
  }

  var draw = function kr_draw(layoutId) {
    var layout = Keyboards[layoutId];

    var content = '';
    var layoutWidth = layout.width || 10;

    layout.keys.forEach((function buildKeyboardRow(row) {
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
    var altChars = target.dataset.alt.split('');
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

  var buildKey = function buildKey(code, label, className, width, alt) {
    return '<button class="keyboard-key ' + className + '"' +
      ' data-keycode="' + code + '"' +
      ' style="width:' + width + '%"' +
      ((alt) ? ' data-alt=' + alt : '') +
    '>' + label + '</button>';
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
