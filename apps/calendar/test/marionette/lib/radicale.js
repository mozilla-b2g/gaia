var childProcess = require('child_process'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    ejs = require('ejs'),
    emptyPort = require('empty-port');

const CAL_ICS_TMP_PATH = __dirname + '/template/calendar.ics.ejs',
      CONFIG_TMP_PATH = __dirname + '/template/config.ejs',
      START_PORT = 50000;

/**
 * Radicale inherit CaldavServer.
 * It is a kind of CaldavServer implemented by pure Python.
 *
 * We install it from the gaia-marionette shell script file
 * during running the tests.
 */
function Radicale() {
  // Setup the Radicale config file,
  // and we create it at path /radicale/install/path/config in the disk.
  var options = { startPort: START_PORT },
      configTemplate,
      config;

  if (!fs.existsSync(this.fileSystemPath)) {
    fs.mkdirSync(this.fileSystemPath);
  }

  // Setup config file for the Radicale server
  // with the random port.
  emptyPort(options, function(error, pickedPort) {
    this.port = pickedPort;

    configTemplate = fs.readFileSync(CONFIG_TMP_PATH, 'utf8'),
    config = ejs.render(configTemplate, {
      port: pickedPort,
      filesystemPath: this.fileSystemPath
    });

    fs.writeFileSync(this.configFilePath, config);
  }.bind(this));
}

Radicale.prototype = {
  // The instance of the child process.
  childProcess: null,
  // The path to the config file.
  configFilePath: path.join(os.tmpdir(), 'config'),
  // The path to the directory of the file system in server.
  fileSystemPath: path.join(os.tmpdir(), 'collections'),
  // The server port between 50000 to 65535.
  port: 0,
  // The events storage in the server.
  events: [],

  /**
   * Start the Radicale server with config file.
   *
   * @return {Number} Server port.
   */
  start: function() {
    this.childProcess =
      childProcess.spawn('radicale', ['--config', this.configFilePath]);
    return this.port;
  },

  /**
   * Shutdown the Radicale server.
   *
   * @param {Function} callback execute after server is closed.
   */
  close: function(callback) {
    this.childProcess.on('exit', function() {
      callback();
    });
    this.childProcess.kill();
  },

  /**
   * Add events in the CalDAV server.
   *
   * @param {String} username The user you would like to add for.
   * @param {Array|Object} event JSON objects, the structure is like
   *   { startDate, endDate, title, location, description }.
   */
  addEvent: function(username, event) {
    if (Array.isArray(event)) {
      this.events = this.events.concat(event);
    } else {
      this.events.push(event);
    }

    var calendarIcsTemplate = fs.readFileSync(CAL_ICS_TMP_PATH, 'utf8'),
        calendarIcs = ejs.render(calendarIcsTemplate, { events: this.events });

    fs.writeFileSync(
      this.fileSystemPath + '/' + username,
      calendarIcs
    );
  },

  /**
   * Remove all events for all users.
   */
  removeAllEvents: function() {
    this.events = [];
    fs.readdirSync(this.fileSystemPath).forEach(function(file) {
      fs.unlinkSync(this.fileSystemPath + '/' + file);
    }.bind(this));
  }
};

module.exports = Radicale;
