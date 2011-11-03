
var _ = (function() {
  'use strict';

  function translateString(key) {
    var lang = navigator.language;
    if (!navigator[lang] || !navigator[lang][key]) 
      return key;
    return navigator[lang][key];
  };

  window.addEventListener('load', function translate(evt) {
    window.removeEventListener('load', translate);

    var elements = document.getElementsByTagName('*');
    var elementCount = elements.length;
    for (var i = 0; i < elementCount; i++) {
      var element = elements[i];
      if (!element.hasAttribute('data-string'))
        continue;

      var key = element.getAttribute('data-string');
      var str = translateString(key);
      if (str == key || str == element.innerHTML)
        return;

      element.innerHTML = str;
    }
  });

  return translateString;
})();

