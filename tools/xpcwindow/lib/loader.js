const Cc = Components.classes;
const Ci = Components.interfaces;

const mozIJSSubScriptLoader = Cc['@mozilla.org/moz/jssubscript-loader;1']
                            .getService(Components.interfaces.mozIJSSubScriptLoader);


var args = _ARGV.split(' ');


if (args[0] === '') {
  args.shift();
}

function importLib(file) {
  mozIJSSubScriptLoader.loadSubScript(
    'file://' + _ROOT + 'lib/' + file
  );
}


//Register xpcwindow
// Map resource://xpcwindow/ to lib/
(function() {

  var fileObj = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);

  fileObj.initWithPath(_ROOT);

  let (ios = Components.classes['@mozilla.org/network/io-service;1']
             .getService(Components.interfaces.nsIIOService)) {
    let protocolHandler =
      ios.getProtocolHandler('resource')
         .QueryInterface(Components.interfaces.nsIResProtocolHandler);

    let curDirURI = ios.newFileURI(fileObj);
    protocolHandler.setSubstitution('xpcwindow', curDirURI);
  }
}());

var window = this.window = {
  xpcDump: dump,
  xpcComponents: Components,
  xpcArgv: args,

  get TCPSocket() {
    var comp = '@mozilla.org/tcp-socket;1';
    //lazy get MozTCPSocket
    if (comp in Components.classes) {
      dump(typeof(Components.classes[comp].open) + '\n');
      delete window.TCPSocket;
      return window.TCPSocket = new Components.classes[comp];
    } else {
      Components.utils.import(
        'resource://xpcwindow/lib/components/tcp-socket.jsm'
      );

      delete window.TCPSocket;
      return window.TCPSocket = new TCPSocket;
    }
  }

};

window.window = window;

importLib('window/timers.js');
importLib('window/import-scripts.js');
importLib('window/console.js');
importLib('window/window.js');
importLib('window/xpc-event-loop.js');
importLib('window/xpc-error.js');

mozIJSSubScriptLoader.loadSubScript(
  'file://' + _IMPORT_FILE,
  window
);
