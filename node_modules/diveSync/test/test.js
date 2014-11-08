var diveSync = require("../");

diveSync(process.cwd(),
    {
      directories: false,
      all: false,
      recursive: true,
      filter: function filter(path, dir) {
//        if (dir) return true;
        return dir || /\.js$/i.test(path);
      }
    }, function(err, file) {
  if (err) throw err;
  console.log(file);
});
