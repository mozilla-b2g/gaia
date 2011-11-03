
var _ = (function() {
  'use strict';

  var gLocales = {};
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var script = scripts[i];
    if (!script.hasAttribute('data-type') ||
        script.getAttribute('data-type') != 'locale')
      continue;

    var src = script.getAttribute('src');
    var lang = src.split('.')[0];
    gLocales[lang] = window.navigator[lang];
    delete window.navigator[lang];
  }

  function translateString(key) {
    var lang = window.navigator.language;
    if (!gLocales[lang] || !gLocales[lang][key]) 
      return key;
    return gLocales[lang][key];
  };

  window.addEventListener('load', function translate(evt) {
    window.removeEventListener('load', translate);

    var elements = document.getElementsByTagName('*');
    var elementCount = elements.length;
    for (var i = 0; i < elementCount; i++) {
      var element = elements[i];
      if (!element.hasAttribute('data-string'))
        continue;

      var str = translateString(element.getAttribute('data-string'));
      if (str == key || str == element.innerHTML)
        return;

      element.innerHTML = str;
    }
  });

  return translateString;
})();

