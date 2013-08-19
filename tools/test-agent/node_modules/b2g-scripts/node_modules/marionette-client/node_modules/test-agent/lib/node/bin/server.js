var server = new (require('../websocket-server')),
    fsPath = require('path'),
    Static = require('node-static'),
    optimist = require('optimist'),
    configFile,
    argv;

function bool(value){
  var allowed = ['yes', 'y', 'true', true];
  return allowed.indexOf(value) > -1;
}

var chain = optimist.
  usage("js-test-agent server --port [num] --configFile [./js-test-agent]").
  option('server', {
    desc: "Starts websocket server when given"
  }).

  option('enable-http', {
    desc: 'Enable static file server',
    default: true
  }).

  option('http-path', {
    default: process.env.PWD,
    desc: "Path to serve files from for http server"
  }).

  option('configFile', {
    alias: 'c',
    default: './test-agent-server.js'
  }).

  option('growl', {
    desc: "Enables growl notifications for server"
  }).

  option('port', {
    alias: 'p',
    default: 8789
  });

argv = chain.argv;

configFile = fsPath.normalize(argv.configFile);

if(configFile[0] !== '/'){
  configFile = fsPath.join(process.env.PWD, configFile);
}

if(!fsPath.existsSync(configFile)){
  console.error("%s cannot be loaded - it does not exist", configFile);
  process.exit(1);
}

argv['enable-http'] = bool(argv['enable-http']);

if(argv['enable-http']){
  var staticMiddleware = new Static.Server(argv['http-path'], { cache: 0 });
  var httpServer = require('http').createServer(function (request, response) {
    request.addListener('end', function onEnd() {
        staticMiddleware.serve(request, response);
    });
  });
  httpServer.listen(argv.port);
  console.log("HTTP Server running on port: %s, serving: %s", argv.port, argv['http-path']);
  server.attach(httpServer);
} else {
  server.listen(argv.port);
}

server.optimist = chain;

console.log("Listening on port: %s", argv.port);
console.log("Loading config file '%s'", configFile);

server.expose(configFile, function onExpose(){
  var Enhancements = require('../server/index');

  //assume enhancements have been made
  server.use(Enhancements.Responder).
         use(Enhancements.Broadcast).
         use(Enhancements.MochaTestEvents).
         use(Enhancements.QueueTests).
         use(Enhancements.EventMirror).
         use(Enhancements.Watcher);

  if(argv.growl){
    server.use(Enhancements.RunnerGrowl);
  }

  //so enhancements can add options
  if(argv.help){
    optimist.showHelp();
    process.exit(0);
  }
});
