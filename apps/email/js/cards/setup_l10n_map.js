/**
 * Map error codes to their l10n string id.  This exists because we have
 * revised some of the strings and so a direct transformation is no longer
 * sufficient.  If an error code does not exist in this map, it gets mapped
 * to the "unknown" value's l10n string id.
 */
define({
  'offline': 'setup-error-offline',
  'bad-user-or-pass': 'setup-error-bad-user-or-pass2',
  'not-authorized': 'setup-error-not-authorized',
  'unknown': 'setup-error-unknown2',
  'needs-app-pass': 'setup-error-needs-app-pass',
  'imap-disabled': 'setup-error-imap-disabled',
  'pop3-disabled': 'setup-error-pop3-disabled',
  'bad-security': 'setup-error-bad-security',
  'unresponsive-server': 'setup-error-unresponsive-server',
  'pop-server-not-great': 'setup-error-pop-server-not-great',
  'server-problem': 'setup-error-server-problem',
  'no-config-info': 'setup-error-no-config-info',
  'server-maintenance': 'setup-error-server-maintenance',
  'user-account-exists': 'setup-error-account-already-exists'
});
