Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

const loader = Cc[
  '@mozilla.org/moz/jssubscript-loader;1'
].getService(
  Components.interfaces.mozIJSSubScriptLoader
);

  // try to start a server

/**
 * muwhahaha- might as well be horrible.
 */
function main() {
  // we need a port to connect to for the fun to start.
  var serverPort = env.get('FAKESERVER_IPC_PORT');
  if (!serverPort)
    return dump('pass environment variable FAKESERVER_IPC_PORT ! (stopping)');


  // initialize the handler
  var handler = new FakeServerProxyHandler(parseInt(serverPort, 10));
}

try {

  var env = Cc['@mozilla.org/process/environment;1'].
    getService(Components.interfaces.nsIEnvironment);

  /** horrible hacks to to expose console.log */

  /**
   * multi-argument dump + newline ending.
   *
   *    log('warn:', 'fobar'); // "warn: fobar\n"
   *
   * @private
   */
  function log() {
    dump(Array.slice(arguments).join(' ') + '\n');
  }

  console = {
    log: log,
    warn: log.bind(null, 'WARN: '),
    error: log.bind(null, 'ERR: ')
  };

  function registerResource(alias, source) {
    // Map resource://fakeserver to lib/
    var fileObj = Cc['@mozilla.org/file/local;1']
                 .createInstance(Ci.nsILocalFile);
    fileObj.initWithPath(_ROOT + '/' + source);

    let(ios = Components.classes['@mozilla.org/network/io-service;1']
               .getService(Components.interfaces.nsIIOService)) {

      let protocolHandler =
        ios.getProtocolHandler('resource')
           .QueryInterface(Components.interfaces.nsIResProtocolHandler);

      let curDirURI = ios.newFileURI(fileObj);
      protocolHandler.setSubstitution(alias, curDirURI);
    }
  }

  registerResource('fakeserver', 'xpcom');
  registerResource('node_modules', 'node_modules');


  /** fake server support */
  loader.loadSubScript(
    'resource://fakeserver/fake-server-support.js'
  );

  /** json wire protocol parser */
  loader.loadSubScript(
    'resource://node_modules/json-wire-protocol/json-wire-protocol.js',
    { window: this }
  );

  /** event loop util */
  loader.loadSubScript(
    'resource://fakeserver/proxy/eventloop.js'
  );

  /** proxy handler */
  loader.loadSubScript(
    'resource://fakeserver/proxy/handler.js'
  );

  // turn tcp on
  Services.prefs.setBoolPref('dom.mozTCPSocket.enabled', true);

  main();

} catch(e) {
  dump('Erorr:\n');
  dump(e.toString() + '\n');
  dump(e.message + '\n');
  dump(e.stack);
}
