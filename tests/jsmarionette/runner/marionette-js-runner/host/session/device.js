'use strict';
let createReadStream = require('fs').createReadStream;
let debug = require('debug')('host/session/Device');
let denodeify = require('promise').denodeify;
let eventToPromise = require('event-to-promise');
let exec = require('mz/child_process').exec;
let http = require('http');
let ncp = denodeify(require('ncp').ncp);
let request = require('./request');
let tmpdir = denodeify(require('tmp').dir);

function Device(port) {
  this.port = port;
}

Device.prototype = {
  /**
   * @type {string}
   */
  _id: null,

  /**
   * @return {Promise<void>}
   */
  init: function() {
    return this.listDevices().then(devices => {
      debug('Connected to device', devices[0]);
      this._id = devices[0].id;
    });
  },

  /**
   * GET /devices
   *
   * @return {Promise<Array<string>>}
   */
  listDevices: function() {
    return request('GET', this.port, '/devices')
    .then(res => JSON.parse(res.body));
  },

  /**
   * POST /devices/:id/profile
   *
   * @return {Promise<void>}
   */
  loadProfile: function(profilePath) {
    debug(`Load profile from ${profilePath}`)
    let dir;
    // Create a tmp dir.
    return tmpdir()
    .then(_dir => {
      dir = _dir;
      debug(`Copy profile from ${profilePath} to ${dir}`);
      // Copy the profile to the temp location.
      return ncp(profilePath, dir);
    })
    .then(() => {
      // Create an archive to upload.
      return exec('tar -cf profile.tar .', {cwd: dir});
    })
    .then(() => {
      return exec('gzip profile.tar', {cwd: dir});
    })
    .then(() => {
      debug('Pushing profile to device', this._id);
      let readableStream = createReadStream(`${dir}/profile.tar.gz`);
      return Promise.all([
        request(
          'POST',
          this.port,
          `/devices/${this._id}/profile`,
          {readableStream}
        ),
        eventToPromise(readableStream, 'end')
      ]);
    });
  },

  /**
   * POST /devices/:id/restart?hard=false
   *
   * @return {Promise<void>}
   */
  rebootB2G: function() {
    debug('Will reboot b2g');
    return request(
      'POST',
      this.port,
      `/devices/${this._id}/restart?hard=false`
    );
  },

  /**
   * GET /devices/:id/logs
   *
   * @return {Promise<ReadableStream>}
   */
  streamLogcat: function() {
    debug('Will stream logs from', this._id);
    return new Promise(resolve => {
      http.request({
        method: 'GET',
        hostname: '127.0.0.1',
        port: this.port,
        path: `/devices/${this._id}/logs`
      }, resolve);
    });
  },

  /**
   * GET /devices/:id/crashes
   *
   * @return {Promise<Array<string>>}
   */
  listCrashes: function() {
    return request('GET', this.port, '/crashes')
    .then(res => JSON.parse(res.body));
  },

  /**
   * GET /devices/:id/crashes/:crashId
   *
   * @return {Promise<string>}
   */
  downloadCrash: function(crashId) {
    debug('Will download crash', crashId, 'from device', this._id);
    return request('GET', this.port, `/devices/${this._id}/crashes/${crashId}`)
    .then(res => res.body);
  }
};

module.exports = Device;
