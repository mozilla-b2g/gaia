define({
  load: function(id, require, onload, config) {
    if (config.isBuild)
      return onload();

    require(['l10nbase', 'l10ndate'], function() {
      if (navigator.mozL10n.readyState === 'complete') {
        onload(navigator.mozL10n);
      } else {
        navigator.mozL10n.ready(function() {
          onload(navigator.mozL10n);
        });
      }
    });
  }
});
