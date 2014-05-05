define({
  load: function(id, require, onload, config) {
    if (config.isBuild)
      return onload();

    require(['l10nbase', 'l10ndate'], function() {
      navigator.mozL10n.once(function() {
        onload(navigator.mozL10n);
      });
    });
  }
});
