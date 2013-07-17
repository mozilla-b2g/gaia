requireApp('email/test/unit/mock_l10n.js', function() {

  var nativeMozL10n;

  nativeMozL10n = navigator.mozL10n;
  navigator.mozL10n = MockL10n;

});
