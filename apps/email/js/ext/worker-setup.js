define(
  [
    './worker-router',
    './mailbridge',
    'logic',
    './mailuniverse',
    'exports'
  ],
  function(
    $router,
    $mailbridge,
    logic,
    $mailuniverse,
    exports
  ) {
'use strict';

var routerBridgeMaker = $router.registerInstanceType('bridge');

var bridgeUniqueIdentifier = 0;
function createBridgePair(universe) {
  var uid = bridgeUniqueIdentifier++;

  var TMB = new $mailbridge.MailBridge(universe);
  var routerInfo = routerBridgeMaker.register(function(data) {
    TMB.__receiveMessage(data.msg);
  });
  var sendMessage = routerInfo.sendMessage;

  TMB.__sendMessage = function(msg) {
    logic(TMB, 'send', { type: msg.type, msg: msg });
    sendMessage(null, msg);
  };

  // Let's say hello to the main thread in order to generate a
  // corresponding mailAPI.
  TMB.__sendMessage({
    type: 'hello',
    config: universe.exposeConfigForClient()
  });
}

var universe = null;

function onUniverse() {
  createBridgePair(universe);
  console.log("Mail universe/bridge created and notified!");
}

var sendControl = $router.registerSimple('control', function(data) {
  var args = data.args;
  switch (data.cmd) {
    case 'hello':
      universe = new $mailuniverse.MailUniverse(onUniverse, args[0]);
      break;

    case 'online':
    case 'offline':
      universe._onConnectionChange(args[0]);
      break;
  }
});
sendControl('hello');

////////////////////////////////////////////////////////////////////////////////

});
