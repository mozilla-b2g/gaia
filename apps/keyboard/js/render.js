const IMERender = (function() {

  var ime;

  var init = function kr_init() {
    this.ime = document.getElementById("keyboard");
  }

  var draw = function kr_draw(currentType, language) {
    var layout;

    switch (currentType) {
      case 'number':
        layout = Keyboards['numberLayout'];
      break;
      case 'tel':
        layout = Keyboards['telLayout'];
      break;
      default:
        layout = Keyboards[language];
      break;
    }

    var content = '';
    var layoutWidth = layout.width || 10;

    layout.keys.forEach((function buildKeyboardRow(row) {
      content += '<div class="keyboard-row">';
      row.forEach((function buildKeyboardColumns(key) {
        var keyChar = key.value;
        var code = key.keyCode || keyChar.charCodeAt(0);
        var className = '';
        var alt = '';
        var ratio = key.ratio || 1;
        var keyWidth =  (ratio * 100) / layoutWidth;
        content += buildKey(code, keyChar, className, keyWidth, alt);
      }));
      content += '</div>';
    }));
    this.ime.innerHTML = content;
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
    'ime': ime
  };
})();
