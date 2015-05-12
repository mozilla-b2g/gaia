/* global TVSource, TVChannel, TVProgram */

'use strict';

/**
 * This mock service contains mock channels and programs that make testing
 * easier.
 */
(function(exports) {

  var channelInfo = [
    {
      name: 'HBO',
      number: '1'
    }, {
      name: 'TVBS',
      number: '2'
    }, {
      name: 'Discovery',
      number: '3'
    }, {
      name: 'Fox',
      number: '5'
    }, {
      name: 'ABC',
      number: '8'
    }, {
      name: 'CNN',
      number: '9'
    }, {
      name: 'AXS TV',
      number: '10'
    }, {
      name: 'MTV',
      number: '10-1'
    }, {
      name: 'TNT',
      number: '10-2'
    }, {
      name: 'Disney',
      number: '13'
    }, {
      name: 'Oxygen',
      number: '14'
    }, {
      name: 'Lifetime',
      number: '15'
    }, {
      name: 'AXN',
      number: '19'
    }, {
      name: 'ESON',
      number: '20'
    }, {
      name: 'Mozilla',
      number: '25'
    }
  ];

  (function overrideTVSourceFunction() {
    // Override native TVChannel constructor in order to create mock channels.
    window.TVChannel = function() {};

    // Delete native property in order to override it
    delete TVSource.prototype.currentChannel;

    var channels = [];
    for(var i = 0; i < channelInfo.length; i++) {
      var channel = new TVChannel();
      channel.name = channelInfo[i].name;
      channel.number = channelInfo[i].number;
      channels.push(channel);
    }

    TVSource.prototype.getChannels = function() {
      var lastChannel;
      var lastChannelNumber = localStorage.getItem('_Mock-Channel-Number');
      channels.some(function(channel) {
        if (channel.number === lastChannelNumber) {
          lastChannel = channel;
          return true;
        }
        return false;
      }.bind(this));
      this.currentChannel = lastChannel;
      return {
        then: function(success) {
          setTimeout(function() {
            success(channels);
          }, 500);
        }
      };
    };

    TVSource.prototype.setCurrentChannel = function(channelNumber) {
      var resolve;
      if (this._lastTimeoutId) {
        clearTimeout(this._lastTimeoutId);
      }
      this._lastTimeoutId = setTimeout(function() {
        this.currentChannel = channels[channelNumber];
        localStorage.setItem('_Mock-Channel-Number', channelNumber);
        if (resolve) {
          resolve();
        }
      }.bind(this), 500);

      return {
        then: function(success) {
          resolve = success;
        }
      };
    };
  })();

  var programTitles = [
    'The Dark Knight',
    'Pulp Fiction',
    'The Lord of the Rings: The Return of the King',
    'Star Wars: Episode V - The Empire Strikes Back',
    'Forrest Gump',
    'Inception',
    'The Matrix',
    'Interstellar',
    'Whiplash',
    'The Intouchables',
    'Gladiator',
    'Alien ',
    'The Lion King',
    'American Beauty',
    'Toy Story 3',
    'Indiana Jones and the Last Crusade',
    'The Wolf of Wall Street',
    'Gone Girl',
    'A Beautiful Mind',
    'The Grand Budapest Hotel',
    'Monsters, Inc.',
    'The Hobbit: The Battle of the Five Armies',
    'Maleficent',
    'X-Men: Days of Future Past',
    'Captain America: The Winter Soldier',
    'The Amazing Spider-Man 2',
    'Dawn of the Planet of the Apes',
    'Fast & Furious 6',
    'Iron Man 3',
    'Frozen',
    '2012',
    'Magic Mike',
    'The Hunger Games',
    'Dredd',
    'Silver Linings Playbook',
    'The Hobbit: An Unexpected Journey',
    '21 Jump Street',
    'The Amazing Spider-Man',
    'Skyfall',
    'Argo'
  ];

  (function overrideTVChannelFunction() {
    // Override native TVProgram constructor in order to create mock programs.
    window.TVProgram = function() {};

    TVChannel.prototype._generatePrograms = function() {
      var quarterHour = 15 * 60000; // 15 min
      var halfHour = 30 * 60000;
      var startTime =
            new Date((Math.floor(Date.now() / halfHour) - 20) * halfHour)
            .getTime();
      var duration;
      var programs = [];
      var program;
      var index;
      var tmp;
      var i;

      for(i = 0; i < programTitles.length; i++) {
        index = Math.floor(Math.random() * (programTitles.length - i)) + i;
        tmp = programTitles[i];
        programTitles[i] = programTitles[index];
        programTitles[index] = tmp;
        duration = (Math.floor(Math.random() * 4) + 2 ) * quarterHour;

        program = new TVProgram();
        program.title = programTitles[i];
        program.startTime = startTime;
        program.duration = duration;
        programs.push(program);
        startTime += Math.ceil(duration / halfHour) * halfHour;
      }
      this._programs = programs;
    };

    TVChannel.prototype.getPrograms = function() {
      var promise = {
        then: function(callback) {
          if (!this._programs) {
            this._generatePrograms();
          }
          setTimeout(function() {
            callback(this._programs);
          }.bind(this), 800);
          return promise;
        }.bind(this),
        catch: function() {
          return promise;
        }
      };
      return promise;
    };
  })();
})(window);

