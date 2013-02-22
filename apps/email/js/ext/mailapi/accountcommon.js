/**
 * Common code for creating and working with various account types.
 **/

define('mailapi/accountcommon',
  [
    'rdcommon/log',
    './a64',
    'require',
    'module',
    'exports'
  ],
  function(
    $log,
    $a64,
    require,
    $module,
    exports
  ) {

// The number of milliseconds to wait for various (non-ActiveSync) XHRs to
// complete during the autoconfiguration process. This value is intentionally
// fairly large so that we don't abort an XHR just because the network is
// spotty.
var AUTOCONFIG_TIMEOUT_MS = 30 * 1000;

var Configurators = {
  'imap+smtp': './composite/configurator',
  'fake': './fake/configurator',
  'activesync': './activesync/configurator'
};

function accountTypeToClass(type, callback) {
  var configuratorId = Configurators[type] || null;

  if (typeof configuratorId === 'string') {
    //A dynamically loaded account.
    require([configuratorId], function(mod) {
      callback(mod.account.Account);
    });
  } else {
    // Preserve next turn semantics that happen with
    // the require call.
    setTimeout(function () {
      callback(null);
    }, 4);
  }
}
exports.accountTypeToClass = accountTypeToClass;

// Simple hard-coded autoconfiguration by domain...
var autoconfigByDomain = exports._autoconfigByDomain = {
  'localhost': {
    type: 'imap+smtp',
    incoming: {
      hostname: 'localhost',
      port: 143,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 25,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
  },
  'slocalhost': {
    type: 'imap+smtp',
    incoming: {
      hostname: 'localhost',
      port: 993,
      socketType: 'SSL',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 465,
      socketType: 'SSL',
      username: '%EMAILLOCALPART%',
    },
  },
  'aslocalhost': {
    type: 'activesync',
    displayName: 'Test',
    incoming: {
      // This string may be clobbered with the correct port number when
      // running as a unit test.
      server: 'http://localhost:8880',
      username: '%EMAILADDRESS%',
    },
  },
  // Mapping for a nonexistent domain for testing a bad domain without it being
  // detected ahead of time by the autoconfiguration logic or otherwise.
  'nonesuch.nonesuch': {
    type: 'imap+smtp',
    imapHost: 'nonesuch.nonesuch',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'nonesuch.nonesuch',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: false,
  },
  'example.com': {
    type: 'fake',
  },
};

/**
 * Recreate the array of identities for a given account.
 *
 * @param universe the MailUniverse
 * @param accountId the ID for this account
 * @param oldIdentities an array of the old identities
 * @return the new identities
 */
function recreateIdentities(universe, accountId, oldIdentities) {
  let identities = [];
  for (let [,oldIdentity] in Iterator(oldIdentities)) {
    identities.push({
      id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
      name: oldIdentity.name,
      address: oldIdentity.address,
      replyTo: oldIdentity.replyTo,
      signature: oldIdentity.signature,
    });
  }
  return identities;
}
exports.recreateIdentities = recreateIdentities;

/**
 * The Autoconfigurator tries to automatically determine account settings, in
 * large part by taking advantage of Thunderbird's prior work on autoconfig:
 * <https://developer.mozilla.org/en-US/docs/Thunderbird/Autoconfiguration>.
 * There are some important differences, however, since we support ActiveSync
 * whereas Thunderbird does not.
 *
 * The process is as follows:
 *
 *  1) Get the domain from the user's email address
 *  2) Check hardcoded-into-GELAM account settings for the domain (useful for
 *     unit tests)
 *  3) Check locally stored XML config files in Gaia for the domain at
 *     `/autoconfig/<domain>`
 *  4) Look on the domain for an XML config file at
 *     `http://autoconfig.<domain>/mail/config-v1.1.xml` and
 *     `http://<domain>/.well-known/autoconfig/mail/config-v1.1.xml`, passing
 *     the user's email address in the query string (as `emailaddress`)
 *  5) Query the domain for ActiveSync Autodiscover at
 *     `https://<domain>/autodiscover/autodiscover.xml` and
 *     `https://autodiscover.<domain>/autodiscover/autodiscover.xml`
 *     (TODO: perform a DNS SRV lookup on the server)
 *  6) Check the Mozilla ISPDB for an XML config file for the domain at
 *     `https://live.mozillamessaging.com/autoconfig/v1.1/<domain>`
 *  7) Perform an MX lookup on the domain, and, if we get a different domain,
 *     check the Mozilla ISPDB for that domain too.
 *
 * If the process is successful, we pass back a JSON object that looks like
 * this for IMAP/SMTP:
 *
 * {
 *   type: 'imap+smtp',
 *   incoming: {
 *     hostname: <imap hostname>,
 *     port: <imap port number>,
 *     socketType: <one of 'plain', 'SSL', 'STARTTLS'>,
 *     username: <imap username>,
 *   },
 *   outgoing: {
 *     hostname: <smtp hostname>,
 *     port: <smtp port>,
 *     socketType: <one of 'plain', 'SSL', 'STARTTLS'>,
 *     username: <smtp username>,
 *   },
 * }
 *
 * And like this for ActiveSync:
 *
 * {
 *   type: 'activesync',
 *   displayName: <display name>, (optional)
 *   incoming: {
 *     server: 'https://<activesync hostname>'
 *   },
 * }
 */
function Autoconfigurator(_LOG) {
  this._LOG = _LOG;
  this.timeout = AUTOCONFIG_TIMEOUT_MS;
}
exports.Autoconfigurator = Autoconfigurator;
Autoconfigurator.prototype = {
  /**
   * The list of fatal error codes.
   *
   * What's fatal and why:
   * - bad-user-or-pass: We found a server, it told us the credentials were
   *     bogus.  There is no point going on.
   * - not-authorized: We found a server, it told us the credentials are fine
   *     but the access rights are insufficient.  There is no point going on.
   *
   * Non-fatal and why:
   * - unknown: If something failed we should keep checking other info sources.
   * - no-config-info: The specific source had no details; we should keep
   *     checking other sources.
   */
  _fatalErrors: ['bad-user-or-pass', 'not-authorized'],

  /**
   * Check the supplied error and return true if it's really a "success" or if
   * it's a fatal error we can't recover from.
   *
   * @param error the error code
   * @return true if the error is a "success" or if it's a fatal error
   */
  _isSuccessOrFatal: function(error) {
    return !error || this._fatalErrors.indexOf(error) !== -1;
  },

  // XXX: Go through these functions and make sure the callbacks provide
  // sufficiently useful error strings.

  /**
   * Get an XML config file from the supplied url. The format is defined at
   * <https://wiki.mozilla.org/Thunderbird:Autoconfiguration:ConfigFileFormat>.
   *
   * @param url the URL to fetch the config file from
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getXmlConfig: function getXmlConfig(url, callback) {
    let xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', url, true);
    xhr.timeout = this.timeout;

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300) {
        // Non-fatal failure to get the config info.  While a 404 is the
        // expected case, this is the appropriate error for weirder cases too.
        callback('no-config-info', null, { status: xhr.status });
        return;
      }
      // XXX: For reasons which are currently unclear (possibly a platform
      // issue), trying to use responseXML results in a SecurityError when
      // running XPath queries. So let's just do an end-run around the
      // "security".
      let doc = new DOMParser().parseFromString(xhr.responseText, 'text/xml');
      function getNode(xpath, rel) {
        return doc.evaluate(xpath, rel || doc, null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                  .singleNodeValue;
      }

      let provider = getNode('/clientConfig/emailProvider');
      // Get the first incomingServer we can use (we assume first == best).
      let incoming = getNode('incomingServer[@type="imap"] | ' +
                             'incomingServer[@type="activesync"]', provider);
      let outgoing = getNode('outgoingServer[@type="smtp"]', provider);

      if (incoming) {
        let config = { type: null, incoming: {}, outgoing: {} };
        for (let [,child] in Iterator(incoming.children))
          config.incoming[child.tagName] = child.textContent;

        if (incoming.getAttribute('type') === 'activesync') {
          config.type = 'activesync';
        }
        else if (outgoing) {
          config.type = 'imap+smtp';
          for (let [,child] in Iterator(outgoing.children))
            config.outgoing[child.tagName] = child.textContent;

          // We do not support unencrypted connections outside of unit tests.
          if (config.incoming.socketType !== 'SSL' ||
              config.outgoing.socketType !== 'SSL') {
            callback('no-config-info', null, { status: 'unsafe' });
            return;
          }
        }
        else {
          callback('no-config-info', null, { status: 'no-outgoing' });
          return;
        }

        callback(null, config, null);
      }
      else {
        callback('no-config-info', null, { status: 'no-incoming' });
      }
    };

    xhr.ontimeout = xhr.onerror = function() {
      // The effective result is a failure to get configuration info, but make
      // sure the status conveys that a timeout occurred.
      callback('no-config-info', null, { status: 'timeout' });
    };
    xhr.onerror = function() {
      // The effective result is a failure to get configuration info, but make
      // sure the status conveys that a timeout occurred.
      callback('no-config-info', null, { status: 'error' });
    };

    // Gecko currently throws in send() if the file we're opening doesn't exist.
    // This is almost certainly wrong, but let's just work around it for now.
    try {
      xhr.send();
    }
    catch(e) {
      callback('no-config-info', null, { status: 404 });
    }
  },

  /**
   * Attempt to get an XML config file locally.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromLocalFile: function getConfigFromLocalFile(domain, callback) {
    this._getXmlConfig('/autoconfig/' + encodeURIComponent(domain), callback);
  },

  /**
   * Attempt ActiveSync Autodiscovery for this email address
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromAutodiscover: function getConfigFromAutodiscover(userDetails,
                                                                 callback) {

    var self = this;
    require([Configurators.activesync], function (configurator) {
      var protocol = configurator.protocol;
      protocol.autodiscover(userDetails.emailAddress, userDetails.password,
                            self.timeout, function(error, config) {
        if (error) {
          var failureType = 'no-config-info',
              failureDetails = {};

          if (error instanceof protocol.HttpError) {
            if (error.status === 401)
              failureType = 'bad-user-or-pass';
            else if (error.status === 403)
              failureType = 'not-authorized';
            else
              failureDetails.status = error.status;
          }
          callback(failureType, null, failureDetails);
          return;
        }

        let autoconfig = {
          type: 'activesync',
          displayName: config.user.name,
          incoming: {
            server: config.mobileSyncServer.url,
            username: config.user.email
          },
        };
        callback(null, autoconfig, null);
      });
    });
  },

  /**
   * Attempt to get an XML config file from the domain associated with the
   * user's email address. If that fails, attempt ActiveSync Autodiscovery.
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromDomain: function getConfigFromDomain(userDetails, domain,
                                                     callback) {
    let suffix = '/mail/config-v1.1.xml?emailaddress=' +
                 encodeURIComponent(userDetails.emailAddress);
    let url = 'http://autoconfig.' + domain + suffix;
    let self = this;

    this._getXmlConfig(url, function(error, config, errorDetails) {
      if (self._isSuccessOrFatal(error)) {
        callback(error, config, errorDetails);
        return;
      }

      // See <http://tools.ietf.org/html/draft-nottingham-site-meta-04>.
      let url = 'http://' + domain + '/.well-known/autoconfig' + suffix;
      self._getXmlConfig(url, function(error, config, errorDetails) {
        if (self._isSuccessOrFatal(error)) {
          callback(error, config, errorDetails);
          return;
        }

        console.log('  Trying domain autodiscover');
        self._getConfigFromAutodiscover(userDetails, callback);
      });
    });
  },

  /**
   * Attempt to get an XML config file from the Mozilla ISPDB.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromDB: function getConfigFromDB(domain, callback) {
    this._getXmlConfig('https://live.mozillamessaging.com/autoconfig/v1.1/' +
                       encodeURIComponent(domain), callback);
  },

  /**
   * Look up the DNS MX record for a domain. This currently uses a web service
   * instead of querying it directly.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the MX
   *        domain
   */
  _getMX: function getMX(domain, callback) {
    let xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', 'https://live.mozillamessaging.com/dns/mx/' +
             encodeURIComponent(domain), true);
    xhr.timeout = this.timeout;

    xhr.onload = function() {
      if (xhr.status === 200)
        callback(null, xhr.responseText.split('\n')[0], null);
      else
        callback('no-config-info', null, { status: 'mx' + xhr.status });
    };

    xhr.ontimeout = function() {
      callback('no-config-info', null, { status: 'mxtimeout' });
    };
    xhr.onerror = function() {
      callback('no-config-info', null, { status: 'mxerror' });
    };

    xhr.send();
  },

  /**
   * Attempt to get an XML config file by checking the DNS MX record and
   * querying the Mozilla ISPDB.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromMX: function getConfigFromMX(domain, callback) {
    let self = this;
    this._getMX(domain, function(error, mxDomain, errorDetails) {
      if (error)
        return callback(error, null, errorDetails);

      // XXX: We need to normalize the domain here to get the base domain, but
      // that's complicated because people like putting dots in TLDs. For now,
      // let's just pretend no one would do such a horrible thing.
      mxDomain = mxDomain.split('.').slice(-2).join('.').toLowerCase();
      console.log('  Found MX for', mxDomain);

      if (domain === mxDomain)
        return callback('no-config-info', null, { status: 'mxsame' });

      // If we found a different domain after MX lookup, we should look in our
      // local file store (mostly to support Google Apps domains) and, if that
      // doesn't work, the Mozilla ISPDB.
      console.log('  Looking in local file store');
      self._getConfigFromLocalFile(mxDomain, function(error, config,
                                                      errorDetails) {
        // (Local XML lookup should not have any fatal errors)
        if (!error) {
          callback(error, config, errorDetails);
          return;
        }

        console.log('  Looking in the Mozilla ISPDB');
        self._getConfigFromDB(mxDomain, callback);
      });
    });
  },

  /**
   * Attempt to get the configuration details for an email account by any means
   * necessary.
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  getConfig: function getConfig(userDetails, callback) {
    let [emailLocalPart, emailDomainPart] = userDetails.emailAddress.split('@');
    let domain = emailDomainPart.toLowerCase();
    console.log('Attempting to get autoconfiguration for', domain);

    var placeholderFields = {
      incoming: ['username', 'hostname', 'server'],
      outgoing: ['username', 'hostname'],
    };

    function fillPlaceholder(value) {
      return value.replace('%EMAILADDRESS%', userDetails.emailAddress)
                  .replace('%EMAILLOCALPART%', emailLocalPart)
                  .replace('%EMAILDOMAIN%', emailDomainPart)
                  .replace('%REALNAME%', userDetails.displayName);
    }

    function onComplete(error, config, errorDetails) {
      console.log(error ? 'FAILURE' : 'SUCCESS');

      // Fill any placeholder strings in the configuration object we retrieved.
      if (config) {
        for (let [serverType, fields] in Iterator(placeholderFields)) {
          if (!config.hasOwnProperty(serverType))
            continue;

          let server = config[serverType];
          for (let [,field] in Iterator(fields)) {
            if (server.hasOwnProperty(field))
              server[field] = fillPlaceholder(server[field]);
          }
        }
      }

      callback(error, config, errorDetails);
    }

    console.log('  Looking in GELAM');
    if (autoconfigByDomain.hasOwnProperty(domain)) {
      onComplete(null, autoconfigByDomain[domain]);
      return;
    }

    let self = this;
    console.log('  Looking in local file store');
    this._getConfigFromLocalFile(domain, function(error, config, errorDetails) {
      if (self._isSuccessOrFatal(error)) {
        onComplete(error, config, errorDetails);
        return;
      }

      console.log('  Looking at domain');
      self._getConfigFromDomain(userDetails, domain, function(error, config,
                                                              errorDetails) {
        if (self._isSuccessOrFatal(error)) {
          onComplete(error, config, errorDetails);
          return;
        }

        console.log('  Looking in the Mozilla ISPDB');
        self._getConfigFromDB(domain, function(error, config, errorDetails) {
          if (self._isSuccessOrFatal(error)) {
            onComplete(error, config, errorDetails);
            return;
          }

          console.log('  Looking up MX');
          self._getConfigFromMX(domain, onComplete);
        });
      });
    });
  },

  /**
   * Try to create an account for the user's email address by running through
   * autoconfigure and, if successful, delegating to the appropriate account
   * type.
   *
   * @param universe the MailUniverse object
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  tryToCreateAccount: function(universe, userDetails, callback) {
    let self = this;
    this.getConfig(userDetails, function(error, config, errorDetails) {
      if (error)
        return callback(error, null, errorDetails);

      require([Configurators[config.type]], function (mod) {
        mod.configurator.tryToCreateAccount(universe, userDetails, config,
                                      callback, self._LOG);
      });
    });
  },
};

/**
 * Recreate an existing account, e.g. after a database upgrade.
 *
 * @param universe the MailUniverse
 * @param oldVersion the old database version, to help with migration
 * @param accountInfo the old account info
 * @param callback a callback to fire when we've completed recreating the
 *        account
 */
function recreateAccount(universe, oldVersion, accountInfo, callback) {
  require([Configurators[accountInfo.def.type]], function (mod) {
    mod.configurator.recreateAccount(universe, oldVersion,
                                     accountInfo, callback);
  });
}
exports.recreateAccount = recreateAccount;

function tryToManuallyCreateAccount(universe, userDetails, domainInfo, callback,
                                    _LOG) {
  require([Configurators[domainInfo.type]], function (mod) {
    mod.configurator.tryToCreateAccount(universe, userDetails, domainInfo,
                                        callback, _LOG);
  });
}
exports.tryToManuallyCreateAccount = tryToManuallyCreateAccount;

}); // end define
