define(function() {
  'use strict';

  function debug(str) {
    //dump('ConfigParser: ' + str + '\n');
  }

  function nsResolver(prefix) {
    var baseUrl = 'http://schemas.microsoft.com/exchange/autodiscover/';
    var ns = {
      rq: baseUrl + 'mobilesync/requestschema/2006',
      ad: baseUrl + 'responseschema/2006',
      ms: baseUrl + 'mobilesync/responseschema/2006',
    };
    return ns[prefix] || null;
  }

  function parseAccountCommon(uid, cmd, text) {
    var doc = new DOMParser().parseFromString(text, 'text/xml');
    var getNode = function(xpath, rel) {
      return doc.evaluate(xpath, rel || doc, null,
                          XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                            .singleNodeValue;
    };

    var provider = getNode('/clientConfig/emailProvider');
    // Get the first incomingServer we can use (we assume first == best).
    var incoming = getNode('incomingServer[@type="imap"] | ' +
                           'incomingServer[@type="activesync"] | ' +
                           'incomingServer[@type="pop3"]', provider);
    var outgoing = getNode('outgoingServer[@type="smtp"]', provider);

    var config = null;
    var status = null;
    if (incoming) {
      config = { type: null, incoming: {}, outgoing: {} };
      for (var iter in Iterator(incoming.children)) {
        var child = iter[1];
        config.incoming[child.tagName] = child.textContent;
      }

      if (incoming.getAttribute('type') === 'activesync') {
        config.type = 'activesync';
      } else if (outgoing) {
        var isImap = incoming.getAttribute('type') === 'imap';

        config.type = isImap ? 'imap+smtp' : 'pop3+smtp';
        for (var iter in Iterator(outgoing.children)) {
          var child = iter[1];
          config.outgoing[child.tagName] = child.textContent;
        }

        var ALLOWED_SOCKET_TYPES = ['SSL', 'STARTTLS'];

        // We do not support unencrypted connections outside of unit tests.
        if (ALLOWED_SOCKET_TYPES.indexOf(config.incoming.socketType) === -1 ||
            ALLOWED_SOCKET_TYPES.indexOf(config.outgoing.socketType) === -1) {
          config = null;
          status = 'unsafe';
        }
      } else {
        config = null;
        status = 'no-outgoing';
      }
    } else {
      status = 'no-incoming';
    }

    self.sendMessage(uid, cmd, [config, status]);
  }

  function parseActiveSyncAccount(uid, cmd, text) {
    var doc = new DOMParser().parseFromString(text, 'text/xml');

    var getNode = function(xpath, rel) {
      return doc.evaluate(xpath, rel, nsResolver,
                          XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                  .singleNodeValue;
    };
    var getNodes = function(xpath, rel) {
      return doc.evaluate(xpath, rel, nsResolver,
                          XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    };
    var getString = function(xpath, rel) {
      return doc.evaluate(xpath, rel, nsResolver, XPathResult.STRING_TYPE,
                          null).stringValue;
    };

    var postResponse = function(error, config, redirectedEmail) {
      self.sendMessage(uid, cmd, [config, error, redirectedEmail]);
    };

    var error = null;
    if (doc.documentElement.tagName === 'parsererror') {
      error = 'Error parsing autodiscover response';
      return postResponse(error);
    }

    var responseNode = getNode('/ad:Autodiscover/ms:Response', doc);
    if (!responseNode) {
      error = 'Missing Autodiscover Response node';
      return postResponse(error);
    }

    var error = getNode('ms:Error', responseNode) ||
                getNode('ms:Action/ms:Error', responseNode);
    if (error) {
      error = getString('ms:Message/text()', error);
      return postResponse(error);
    }

    var redirect = getNode('ms:Action/ms:Redirect', responseNode);
    if (redirect) {
      if (aNoRedirect) {
        error = 'Multiple redirects occurred during autodiscovery';
        return postResponse(error);
      }

      var redirectedEmail = getString('text()', redirect);
      return postResponse(null, null, redirectedEmail);
    }

    var user = getNode('ms:User', responseNode);
    var config = {
      culture: getString('ms:Culture/text()', responseNode),
      user: {
        name:  getString('ms:DisplayName/text()',  user),
        email: getString('ms:EMailAddress/text()', user),
      },
      servers: [],
    };

    var servers = getNodes('ms:Action/ms:Settings/ms:Server', responseNode);
    var server;
    while ((server = servers.iterateNext())) {
      config.servers.push({
        type:       getString('ms:Type/text()',       server),
        url:        getString('ms:Url/text()',        server),
        name:       getString('ms:Name/text()',       server),
        serverData: getString('ms:ServerData/text()', server),
      });
    }

    // Try to find a MobileSync server from Autodiscovery.
    for (var iter in Iterator(config.servers)) {
      var server = iter[1];
      if (server.type === 'MobileSync') {
        config.mobileSyncServer = server;
        break;
      }
    }

    if (!config.mobileSyncServer) {
      error = 'No MobileSync server found';
      return postResponse(error, config);
    }

    postResponse(null, config);
  };

  var self = {
    name: 'configparser',
    sendMessage: null,
    process: function(uid, cmd, args) {
      debug('process ' + cmd);
      switch (cmd) {
        case 'accountcommon':
          parseAccountCommon(uid, cmd, args[0]);
          break;
        case 'accountactivesync':
          parseActiveSyncAccount(uid, cmd, args[0]);
          break;
      }
    }
  };
  return self;
});
