(function(window) {

  /* require most of the coupled / util objects */

  function l10nLink(href) {
    var resource = document.createElement('link');
    resource.setAttribute('href', href);
    resource.setAttribute('rel', 'resource');
    resource.setAttribute('type', 'application/l10n');
    document.head.appendChild(resource);
  }

  l10nLink('/locales/locales.ini');
  l10nLink('/shared/locales/date.ini');

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
