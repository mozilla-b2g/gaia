'use strict';

var restify = require('restify'),
    ecstatic = require('ecstatic'),
    config = require('./config.json');

var server = restify.createServer({
  name: 'Mock Firefox Accounts Server'
});

server.hostname = process.argv[2];
server.port = process.argv[3];
server.version = process.argv[4];

process.on('uncaughtException', gracefulShutdown);
server.on('uncaughtException', gracefulShutdown);

function shutdown(cb) {
  try {
    server.close(cb);
  } catch (e) {
    console.error(e.stack);
    process.exit(1);
  }
}

function gracefulShutdown(err) {
  if (err) {
    console.error(err.stack);
  }
  shutdown();
}

/**
 * authPW = 123456789
 * client accepts any hex Token the server kindly grants it
 * Note: other user types could be added:  i.e. verified user
 */
var account = {
    'new': {
      'authPW': config.PASSWORD_HASH,
      'uid': randomString(32),
      'sessionToken': randomString(64),
      'keyFetchToken': randomString(64),
      'passwordChangeToken': randomString(64),
      'verified': false,
      'authAt': Date.now()
    },

    'exists': {
      'email': config.USER_EXISTING_EMAIL + '@' + config.MAIL_HOST,
      'authPW': config.PASSWORD_HASH,
      'uid': randomString(32),
      'sessionToken': randomString(64),
      'keyFetchToken': randomString(64),
      'passwordChangeToken': randomString(64),
      'verified': false,
      'authAt': Date.now()
    }
};

/**
 * Mock Firefox Accounts Server
 *
 * Purpose:
 * Mimic behavior of FxA server v1
 * (SHA: 29dc9abbacb3fe1b6de763f3c7bd85e63215297c)
 * with mostly 'canned' responses
 * Some APIs (i.e. for authentication) provide limited logical checking
 * for testing B2G
 *
 * Reference
 * https://github.com/mozilla/fxa-auth-server/blob/master/docs/api.md
 */
var Server = {

  //set to true for verbose logging
  debug: config.DEBUG || false,

  // allows for terminating process directly when calling server standalone
  // when calling as child process, use child.kill() from parent
  stop: function() {
    gracefulShutdown();
    console.log('SERVER STOPPED');
  },

  start: function() {
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());
    server.use(ecstatic({ root: __dirname + '/' }));
    server.get('/', ecstatic({ root: __dirname }));
    server.listen(server.port, function() {
      var debug = Server.debug || false;
      if (debug) {
        console.log('    %s running on port: %s', server.name, server.port);
      }
    });
  }
};

(function(err, port) {
  Server.start();
  process.send(['start']);
})();

// handle process messages
process.on('message', function(data) {
  switch (data) {
    case 'stop':
      console.log('STOPPING MOCK SERVER');
      Server.stop();
      break;
  }
});

server.post('/v1/account/create', postAccountCreate);
server.get('/v1/account/status', getAccountStatus);
server.get('/v1/account/devices', getAccountDevices);
server.get('/v1/account/keys', getAccountKeys);
server.post('/v1/account/reset', respondEmpty);
server.post('/v1/account/destroy', respondEmpty);
server.post('/v1/account/login', postAccountLogin);
server.get('/v1/session/status', respondEmpty);
server.post('/v1/session/destroy', respondEmpty);
server.get('/v1/recovery_email/status', getRecoveryEmailStatus);
server.post('/v1/recovery_email/resend_code', respondEmpty);
server.post('/v1/recovery_email/verify_code', respondEmpty);
server.post('/v1/certificate/sign', postCertificateSign);
server.post('/v1/password/change/start', postPasswordChangeStart);
server.post('/v1/password/change/finish', respondEmpty);
server.post('/v1/password/forgot/send_code', postPasswordForgotSendCode);
server.post('/v1/password/forgot/resend_code', postPasswordForgotResendCode);
server.post('/v1/password/forgot/verify_code', postPasswordForgotVerifyCode);
server.get('/v1/forgot/status', getPasswordForgotStatus);
server.post('/v1/get_random_bytes', postGetRandomBytes);

//catch any undefined requests
server.get(/^\/([a-zA-Z0-9_\.~-]+)\/(.*)/, anyUndefined);
server.post(/^\/([a-zA-Z0-9_\.~-]+)\/(.*)/, anyUndefined);

/************************************
 * API: Account
 ************************************/

function postAccountCreate(req,res,next) {
  var accountSelected = getAccountType(req.body.email);
  var jsonResponse = getRespAccountCreate(accountSelected);
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function getAccountStatus(req,res,next) {
  var jsonResponse = { 'exists': false };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function getAccountDevices(req,res,next) {
  var jsonResponse = {
  'devices': [
    {
      'id': '4c352927-cd4f-4a4a-a03d-7d1893d950b8',
      'type': 'computer',
      'name': 'Foxys Macbook'
    }
  ]
  };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function getAccountKeys(req,res,next) {
  var jsonResponse = {
    'bundle': randomString(256)
  };
  printLog('GET /account/keys', jsonResponse);
  res.send(200,jsonResponse);
}

/************************************
 * API: Authentication
 ************************************/

function postAccountLogin(req,res,next) {
  var jsonResponse;
  var accountSelected = getAccountType(req.body.email);

  if (req.body.email === account.exists.email) {
    if (req.body.authPW === account.exists.authPW) {
      jsonResponse = getRespAccountLogin(accountSelected);
      res.send(200, jsonResponse);
    } else {
      //status code 400, errno 103: incorrect password
      jsonResponse = getError(103,accountSelected);
      res.send(jsonResponse);
    }
  } else {
    //status code 400, errno 102: attempt to access a non-existent account
    jsonResponse = getError(102, accountSelected);
    res.send(jsonResponse);
  }
  printLog(req.method + ' ' + req.url, jsonResponse);
}

/************************************
 * API: Recovery Email
 ************************************/

function getRecoveryEmailStatus(req,res,next) {
  var accountSelected = getAccountType(req.body.email);
  var jsonResponse = getRespRecoveryEmail(accountSelected);
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

/************************************
 * API: Certificate Signing
 ************************************/

function postCertificateSign(req,res,next) {
  var jsonResponse = {
    'cert': randomString(520,
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ.abcdefghijklmnopqrstuvwxyz0123456789')
  };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

/************************************
 * API: Password
 ************************************/

/**
 * should verify request of format:
 * {
 *   "email": "me@example.com",
 *   "oldAuthPW":
 *         "d486e79c9f3214b0010fe31bfb50fa6c12e1d093f7770c81c6b1c19c7ee375a6"
 *  }
 */
function postPasswordChangeStart(req,res,next) {

  var accountSelected = getAccountType(req.body.email);
  var jsonResponse;
  if (req.body.email === account.exists.email) {
    jsonResponse = getRespPasswordChangeStart(accountSelected);
    res.send(200, jsonResponse);
  } else {
    //status code 400, errno 102: attempt to access non-existent account
    jsonResponse = getError(102, accountSelected);
    res.send(jsonResponse);
  }
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function postPasswordForgotSendCode(req,res,next) {
  var jsonResponse = getRespPasswordForgotSendCode();
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function postPasswordForgotResendCode(req,res,next) {
  var jsonResponse = getRespPasswordForgotSendCode();
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function postPasswordForgotVerifyCode(req,res,next) {
  var jsonResponse = {
    'accountResetToken': randomString(128)
  };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

function getPasswordForgotStatus(req,res,next) {
  var jsonResponse = { 'tries': 3, 'ttl': 420 };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

/************************************
 * API: Miscellaneous
 ************************************/

function postGetRandomBytes(req,res,next) {
  var randomData = getRandomBytes();
  var jsonResponse = { 'data': randomData };
  printLog(req.method + ' ' + req.url, jsonResponse);
  res.send(200,jsonResponse);
}

/************************************
 * API: Undefined
 * any other requests land here
 ************************************/

function anyUndefined(req,res,next) {
  printLog(req.method + ' ' + req.url + ' (UNDEFINED)',
            'value of req is: ' + req);
}

function randomString(len, charSet) {
  charSet = charSet || 'abcdefghijklmnopqrstuvwxyz0123456789';
  var rand = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    rand += charSet.substring(randomPoz,randomPoz+1);
  }
  return rand;
}

/**
 * mock API will random 64 char length hex strings
 * @returns {string}
 */
function getRandomBytes() {
  return randomString(64);
}

function getAccountType(returnType) {
  switch(returnType) {
    case account.exists.email:
      return account.exists;
    default:
      return account.new;
  }
}

function respondEmpty(req,res,next) {
  printLog(req.method + ' ' + req.url, {});
  res.send(200, {});
}

function getRespAccountLogin(accountSelected) {
  return {
    'uid': accountSelected.uid,
    'sessionToken': accountSelected.sessionToken,
    'verified': accountSelected.verified,
    'authAt': Date.now()
  };
}

function getRespRecoveryEmail(accountSelected) {
  return {
    'email': accountSelected.email,
    'verified': accountSelected.verified
  };
}

function getRespAccountCreate(accountSelected) {
  return {
    'uid': accountSelected.uid,
    'sessionToken': accountSelected.sessionToken,
    'keyFetchToken': accountSelected.keyFetchToken,
    'authAt': Date.now()
  };
}

function getRespPasswordChangeStart(accountSelected) {
  return {
    'keyFetchToken': accountSelected.keyFetchToken,
    'passwordChangeToken': accountSelected.passwordChangeToken,
    'verified': accountSelected.verified
  };
}

function getRespPasswordForgotSendCode() {
  return  {
    'passwordForgotToken': randomString(128),
    'ttl': 900,
    'codeLength': 8,
    'tries': 3
  };
}

/**
 * Use:
 * var errNum = req.socket._httpMessage.statusCode;
 * @param errNum
 * @param accountSelected
 * @returns {*}
 */
function getError(errNum,accountSelected) {
  var info = config.AUTH_SERVER_URL;
  switch(errNum) {
    case 102:
      return {
        'code': 400,
        'errno': errNum,
        'error': 'Bad Request',
        'message': 'Attempt to access an account that does not exist',
        'info': info,
        'email': accountSelected.email,
        'log': []
      };

    case 103:
      return {
        'code': 400,
        'errno': errNum,
        'error': 'Bad Request',
        'message': 'Incorrect password',
        'info': info,
        'email': accountSelected.email,
        'log': []
      };

    case 999:
      return {
        'code': errNum,
        'errno': 999,
        'error': 'Not Found',
        'message': 'Unspecified error',
        'info': info,
        'log': []
      };
  }
}

/**
 * Log req/res to stdout
 */
function printLog(title,msg) {
  if (config.DEBUG) {
    console.log('\n========================');
    console.log(title);
    console.log('========================');
    console.log(msg);
    console.log('\n\n');
  }
}
