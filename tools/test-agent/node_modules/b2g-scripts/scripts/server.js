var Server = require('../lib/script')({
  desc: 'Starts up an app server. Must have hostfile setup first',
  usage: 'server --gaia $GAIA_DIR',

  options: {

    dir: {
      alias: 'd',
      desc: 'App directories may be passed multiple times relative to gaia root',
      default: ['apps/']
    },

    gaia: {
      alias: 'g',
      desc: 'path to gaia directory',
      demand: true
    },

    port: {
      alias: 'p',
      desc: 'port to use',
      default: 8081
    }
  }

}, function(argv) {

  var static = require('node-static'),
      fsPath = require('path'),
      fs = require('fs'),
      dirs = [],
      port = parseInt(argv.port.toString().replace(/[^0-9]/g, ''));

  if (argv.dir) {
    if(typeof(argv.dir) === 'string') {
      argv.dir = [argv.dir];
    }
    dirs = argv.dir;
  } else {
    dirs = ['apps/'];
  }


  if(dirs.length === 0) {
    console.error('\nERROR: You must pass --dir or --gaia to provide a list of apps to serve.\n');
    this.help(1);
  }

  if (!fsPath.existsSync(argv.gaia)) {
    console.error('Invalid path: ', argv.gaia);
    this.help(1);
  }

  var apps = {};

  dirs.forEach(function(dir) {
    var path = fsPath.join(argv.gaia, dir),
        appList = fs.readdirSync(path);

    appList.forEach(function(app) {
      if (app.indexOf('.') === 0) {
        return;
      }
      apps[app] = dir;
    });
  });


  var file = new(static.Server)(argv.gaia);
  var key;

  for(key in apps) {
    console.log('SERVE: ' + key + ' from  appdir: '  + apps[key]);
  }

  require('http').createServer(function (request, response) {
      request.addListener('end', function () {
        var host = request.headers.host,
            app = host.split('.')[0];

          if(apps[app]) {
            request.url = fsPath.join('/' + apps[app], app, request.url);
            file.serve(
              request, response
            );
          } else {
            file.serve(request, response);
          }
      });
  }).listen(port);

});

module.exports = Server;

