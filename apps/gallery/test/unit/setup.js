(function(window) {

  /* require most of the coupled / util objects */

  function l10nLink(href) {
    var resource = document.createElement('link');
    resource.setAttribute('href', href);
    resource.setAttribute('rel', 'resource');
    resource.setAttribute('type', 'application/l10n');
    document.head.appendChild(resource);
  }

  function l10nScript(ast, langs) {
    for (var i = 0, lang; lang = langs[i]; i++) {
      var inline = document.createElement('script');
      inline.setAttribute('type', 'application/l10n');
      inline.setAttribute('lang', lang);
      inline.textContent = JSON.stringify(ast);
      document.head.appendChild(inline);
    }
  }

  l10nLink('/locales/locales.ini');
  l10nLink('/shared/locales/date.ini');

  l10nScript({
    type: 'WebL10n',
    body: {
      'inline-translation-test': {
        value: {
          content: 'static content provided by inlined JSON'
        }
      }
    }
  }, ['fr']);

  // setup localization....
  require('/shared/js/l10n.js', function() {
    // Massive hack to trick l10n to load... (TODO: upstream a fix to l10n.js)
    document.dispatchEvent(new Event('DOMContentLoaded'));

    suiteSetup(function(done) {
      var state = navigator.mozL10n.readyState;
      if (state !== 'complete' && state !== 'interactive') {
        window.addEventListener('localized', function() {
          done();
        });
      } else {
        done();
      }
    });
  });

  require('/shared/js/l10n_date.js');

}(this));
