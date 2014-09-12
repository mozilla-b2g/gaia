/*global define, MozActivity */
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
 * In both cases the IMAP errors we get are a WEBALERT with a URL we can log
 * into that dumps us at https://www.google.com/settings/personalinfo, at least
 * when we weren't a suspicious login.  The URL includes a huge unique
 * identifier that might immediately bless us or might not.  Not sure what that
 * URL does exactly if we were suspicious.
 *
 * We also get an ALERT with the URL
 * http://support.google.com/mail/accounts/bin/answer.py?answer=78754 which is
 * a support page.  Unfortunately the "less secure apps" thing is mentioned
 * third and going there won't actually authorize us either.
 *
 * A very notable/useful thing is that if the "less secure apps" setting
 * triggers, then gmail will send the account an automated mail that explains
 * what is going on and quite usefully links to the actual suspicious mail
 * handling mechanism.
 *
 * So what we do is to direct the user to login to the Gmail UI.  The UI should
 * tell them about the suspicious login attempt if there is one and let them
 * explicitly authorize us from that IP.  And if it was a "less secure apps"
 * situation, the user should be able to see the email at the top of their
 * inbox, click on it to read it, etc.
 *
 * Intentional things we do related to this:
 * - Trigger a 'view' web activity so we are using the system cookie jar and if
 *   the user has already authenticated themself to Google, then they don't need
 *   to reauthenticate.
 * - Direct the user to accounts.google.com with service=mail and passive=true
 *   specified so that if the user is already logged in they will be directly
 *   bounced to the gmail UI.
 * - Pass Email=blah@blah for accounts.google.com since this will pre-fill the
 *   form if needed.
 */
return function mitigateGmailForceLogin(emailAddress) {
  var url =
    'https://accounts.google.com/ServiceLogin?service=mail&passive=true&Email='+
        encodeURIComponent(emailAddress) + '&continue=https://mail.google.com/';

  var activity = new MozActivity({
    name: 'view',
    data: {
      type: 'url',
      url: url
    }
  });
  activity;
};

});
