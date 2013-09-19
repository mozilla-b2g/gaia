// This module declares a dependency on the shared "l10n_date" module which
// itself depends on the shared "l10n" module (see the application's "shim"
// configuration for Alameda). Declaring the dependencies in this way ensures
// that this module exports the "l10n" module's global variable only after both
// shared libraries have been loaded in the correct order.
define(['shared/js/l10n_date'], function() {
  return navigator.mozL10n;
});
