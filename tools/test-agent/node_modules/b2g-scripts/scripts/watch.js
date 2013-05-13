var Watcher = require('../lib/script')({

  desc: [
    'Watch a directory, run a script when a file changes.',
    //indent is intentional for output
    '            Files ending with .js,.css,.html,.properties files are watched.'
  ].join('\n'),

  usage: 'watch --path $PWD "b2g-scripts reload-app"',

  options: {
    'path': {
      default: process.cwd(),
      desc: 'Directory path to watch for changes'
    }
  }

}, function(argv) {

    var MatchFiles = require('match-files'),
        exec = require('child_process').exec,
        Watchr = require('test-agent').Watchr,
        fsPath = require('path'),
        script = argv._[1];

    var dir = fsPath.resolve(argv.path),
        MATCH_REGEX = /\.(js|css|html|properties)$/;

    if (fsPath.existsSync(dir)) {
      console.log('watching ', dir, 'for changes');
      console.log('will execute', script, 'when files change');
      MatchFiles.find(dir, {
        fileFilters: [function(path) {
          return path.match(MATCH_REGEX);
        }]
      }, function(err, files) {
        var watch;
        if(err) {
          throw err;
        }

        watch = new Watchr(files);
        watch.start(function(file) {
          console.log(file, 'has changed');
          exec(script, function(err, stdout, stderr) {
            if (err) {
              throw err;
            }

            if (stderr) {
              console.error(stderr);
            }

            console.log(stdout);
          });
        });
      });
    } else {
      console.log(dir, 'is not a valid path');
    }

});

module.exports = Watcher;
