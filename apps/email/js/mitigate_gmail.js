/*global MozActivity */
define(function(require) {
'use strict';

/**
 * Mitigation support for GMail indicating that one of the following is
 * happening (and it won't tell us which):
 * - The login is suspicious.
 * - The login is being forbidden because the "less secure apps" setting is
 *   set to disabled rather than "enabled" or "default".  ("default" sets itself
 *   to "enabled" when triggered.
 *
 * The second scenario prompted this mitigation fix, the details of which are
 * in bug 1059100. For 2.1+, real oauth2 support is used in the email app and
 * this change is not needed. This is just to help out 2.0 users that may
 * otherwise get stuck not being able to use their gmail account in the app.
 *
 * Intentionally trigger a 'view' web activity so we are using the system cookie
 * jar and if the user has already authenticated themself to Google, then they
 * don't need to reauthenticate. This also keeps any google authentication
 * cookies outside of the email app since we do not have a way to automatically
 * purge them.
 */
return function mitigateGmail() {
  var url = 'https://support.mozilla.org/' +
            'kb/how-fix-password-errors-when-accessing-gmail-firef';

  var activity = new MozActivity({
    name: 'view',
    data: {
      type: 'url',
      url: url
    }
  });

  // This next line is to statisfy linter. Without it get a
  // "'activity' is defined but never used." lint message.
  activity;
};

});

