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

  var programMeta = [{
      title: 'The Dark Knight',
      description: 'When the menace known as the Joker wreaks havoc and chaos' +
        'on the people of Gotham, the caped crusader must come to terms with' +
        ' one of the greatest psychological tests of his ability to fight' +
        ' injustice.'
    }, {
      title: 'Pulp Fiction',
      description: 'The lives of two mob hit men, a boxer, a gangster\'s wife' +
        ', and a pair of diner bandits intertwine in four tales of violence' +
        ' and redemption.'
    }, {
      title: 'The Lord of the Rings: The Return of the King',
      description: 'Gandalf and Aragorn lead the World of Men against' +
        ' Sauron\'s army to draw his gaze from Frodo and Sam as they approach' +
        ' Mount Doom with the One Ring.'
    }, {
      title: 'Star Wars: Episode V - The Empire Strikes Back',
      description: 'After the rebels have been brutally overpowered by the ' +
        'Empire on their newly established base, Luke Skywalker takes ' +
        'advanced Jedi training with Master Yoda, while his friends are ' +
        'pursued by Darth Vader as part of his plan to capture Luke.'
    }, {
      title: 'Forrest Gump',
      description: 'Forrest Gump, while not intelligent, has accidentally ' +
        'been present at many historic moments, but his true love, Jenny ' +
        'Curran, eludes him.'
    }, {
      title: 'Inception',
      description: 'A thief who steals corporate secrets through use of ' +
        'dream-sharing technology is given the inverse task of planting an ' +
        'idea into the mind of a CEO.'
    }, {
      title: 'The Matrix',
      description: 'A computer hacker learns from mysterious rebels about ' +
        'the true nature of his reality and his role in the war against ' +
        'its controllers.'
    }, {
      title: 'Interstellar',
      description: 'A team of explorers travel through a wormhole in an ' +
        'attempt to ensure humanity\'s survival.'
    }, {
      title: 'Whiplash',
      description: 'A promising young drummer enrolls at a cut-throat music' +
        ' conservatory where his dreams of greatness are mentored by an ' +
        'instructor who will stop at nothing to realize a student\'s potential.'
    }, {
      title: 'The Intouchables',
      description: 'After he becomes a quadriplegic from a paragliding ' +
        'accident, an aristocrat hires a young man from the projects to be ' +
        'his caregiver.'
    }, {
      title: 'Gladiator',
      description: 'When a Roman general is betrayed and his family murdered' +
        ' by an emperor\'s corrupt son, he comes to Rome as a gladiator to' +
        ' seek revenge.'
    }, {
      title: 'Alien',
      description: 'The commercial vessel Nostromo receives a distress call' +
        ' from an unexplored planet. After searching for survivors, the crew' +
        ' heads home only to realize that a deadly bioform has joined them.'
    }, {
      title: 'The Lion King',
      description: 'Tricked into thinking that he caused the death of his ' +
        'father, a lion cub flees and abandons his destiny as the future king.'
    }, {
      title: 'American Beauty',
      description: 'A sexually frustrated suburban father has a mid-life ' +
        'crisis after becoming infatuated with his daughter\'s best friend.'
    }, {
      title: 'Toy Story 3',
      description: 'The toys are mistakenly delivered to a day-care center' +
        ' instead of the attic right before Andy leaves for college, and ' +
        'it\'s up to Woody to convince the other toys that they weren\'t' +
        ' abandoned and to return home.'
    }, {
      title: 'Indiana Jones and the Last Crusade',
      description: 'When Dr. Henry Jones Sr. suddenly goes missing while ' +
        'pursuing the Holy Grail, eminent archaeologist Indiana Jones must ' +
        'follow in his father\'s footsteps and stop the Nazis.'
    }, {
      title: 'The Wolf of Wall Street',
      description: 'Based on the true story of Jordan Belfort, from his rise ' +
        'to a wealthy stock-broker living the high life to his fall involving' +
        ' crime, corruption and the federal government.'
    }, {
      title: 'Gone Girl',
      description: 'With his wife\'s disappearance having become the focus ' +
        'of an intense media circus, a man sees the spotlight turned on him' +
        ' when it\'s suspected that he may not be innocent.'
    }, {
      title: 'A Beautiful Mind',
      description: 'After a brilliant but asocial mathematician accepts ' +
        'secret work in cryptography, his life takes a turn for the ' +
        'nightmarish.'
    }, {
      title: 'The Grand Budapest Hotel',
      description: 'The adventures of Gustave H, a legendary concierge at a' +
        ' famous hotel from the fictional Republic of Zubrowka between the ' +
        'first and second World Wars, and Zero Moustafa, the lobby boy who ' +
        'becomes his most trusted friend.'
    }, {
      title: 'Monsters, Inc.',
      description: 'Monsters generate their city\'s power by scaring ' +
        'children, but they are terribly afraid themselves of being ' +
        'contaminated by children, so when one enters Monstropolis, top ' +
        'scarer Sulley finds his world disrupted.'
    }, {
      title: 'The Hobbit: The Battle of the Five Armies',
      description: 'Bilbo and Company are forced to engage in a war against ' +
        'an array of combatants and keep the Lonely Mountain from falling ' +
        'into the hands of a rising darkness.'
    }, {
      title: 'Maleficent',
      description: 'A vengeful fairy is driven to curse an infant princess, ' +
        'only to discover that the child may be the one person who can ' +
        'restore peace to their troubled land.'
    }, {
      title: 'X-Men: Days of Future Past',
      description: 'The X-Men send Wolverine to the past in a desperate ' +
        'effort to change history and prevent an event that results in ' +
        'doom for both humans and mutants.'
    }, {
      title: 'Captain America: The Winter Soldier',
      description: 'As Steve Rogers struggles to embrace his role in the ' +
      'modern world, he teams up with another super soldier, the black widow,' +
      ' to battle a new threat from old history: an assassin known as the ' +
      'Winter Soldier.'
    }, {
      title: 'The Amazing Spider-Man 2',
      description: 'When New York is put under siege by Oscorp, it is up to ' +
        'Spider-Man to save the city he swore to protect as well as his ' +
        'loved ones'
    }, {
      title: 'Dawn of the Planet of the Apes',
      description: 'An ape empire conflicts with a sustaining human ' +
        'rebellion, as well as a rogue renegade due to the catastrophic ' +
        'events ten years earlier.'
    }, {
      title: 'Fast & Furious 6',
      description: 'Hobbs has Dominic and Brian reassemble their crew to ' +
        'take down a team of mercenaries: Dominic unexpectedly gets ' +
        'convoluted also facing his presumed deceased girlfriend, Letty.'
    }, {
      title: 'Iron Man 3',
      description: 'When Tony Stark\'s world is torn apart by a formidable ' +
        'terrorist called the Mandarin, he starts an odyssey of rebuilding ' +
        'and retribution.'
    }, {
      title: 'Frozen',
      description: 'When the newly crowned Queen Elsa accidentally uses her ' +
        'power to turn things into ice to curse her home in infinite winter,' +
        ' her sister, Anna, teams up with a mountain man, his playful ' +
        'reindeer, and a snowman to change the weather condition.'
    }, {
      title: '2012',
      description: 'A frustrated writer struggles to keep his family alive ' +
        'when a series of global catastrophes threatens to annihilate mankind.'
    }, {
      title: 'Magic Mike',
      description: 'A male stripper teaches a younger performer how to party,' +
        ' pick up women, and make easy money.'
    }, {
      title: 'The Hunger Games',
      description: 'Katniss Everdeen voluntarily takes her younger sister\'s' +
        ' place in the Hunger Games, a televised fight to the death in which' +
        ' two teenagers from each of the twelve Districts of Panem are chosen' +
        ' at random to compete.'
    }, {
      title: 'Dredd',
      description: 'In a violent, futuristic city where the police have the' +
        ' authority to act as judge, jury and executioner, a cop teams with ' +
        'a trainee to take down a gang that deals the reality-altering drug,' +
        ' SLO-MO.'
    }, {
      title: 'Silver Linings Playbook',
      description: 'After a stint in a mental institution, former teacher Pat' +
        ' Solitano moves back in with his parents and tries to reconcile ' +
        'with his ex-wife. Things get more challenging when Pat meets ' +
        'Tiffany, a mysterious girl with problems of her own.'
    }, {
      title: 'The Hobbit: An Unexpected Journey',
      description: 'A reluctant hobbit, Bilbo Baggins, sets out to the ' +
        'Lonely Mountain with a spirited group of dwarves to reclaim their ' +
        'mountain home - and the gold within it - from the dragon Smaug.'
    }, {
      title: '21 Jump Street',
      description: 'A pair of underachieving cops are sent back to a local ' +
        'high school to blend in and bring down a synthetic drug ring.'
    }, {
      title: 'The Amazing Spider-Man',
      description: 'After Peter Parker is bitten by a genetically altered ' +
        'spider, he gains newfound, spider-like powers and ventures out to ' +
        'solve the mystery of his parent\'s mysterious death.'
    }, {
      title: 'Skyfall',
      description: 'Bond\'s loyalty to M is tested when her past comes back ' +
        'to haunt her. Whilst MI6 comes under attack, 007 must track down ' +
        'and destroy the threat, no matter how personal the cost.'
    }, {
      title: 'Argo',
      description: 'Acting under the cover of a Hollywood producer scouting ' +
        'a location for a science fiction film, a CIA agent launches a ' +
        'dangerous operation to rescue six Americans in Tehran during the ' +
        'U.S. hostage crisis in Iran in 1980.'
    }];

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

      for(i = 0; i < programMeta.length; i++) {
        index = Math.floor(Math.random() * (programMeta.length - i)) + i;
        tmp = programMeta[i];
        programMeta[i] = programMeta[index];
        programMeta[index] = tmp;
        duration = (Math.floor(Math.random() * 4) + 2 ) * quarterHour;

        program = new TVProgram();
        program.title = programMeta[i].title;
        program.description = programMeta[i].description;
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

