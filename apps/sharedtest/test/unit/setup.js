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
    suiteSetup(function(done) {
      navigator.mozL10n.ready(done);
    });
  });

  require('/shared/js/l10n_date.js');

}(this));
