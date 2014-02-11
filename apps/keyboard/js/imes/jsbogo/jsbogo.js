/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

(function() {

  /* BoGo Engine. https://github.com/lewtds/bogo.js
   *
   * Copyright 2014, Trung Ngo <ndtrung4419@gmail.com>
   *
   * This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
  function BoGo() {
    var EffectType = {
      APPENDING: 0,
      MARK: 1,
      TONE: 2
    };

    var Mark = {
      NONE: 0,
      HAT: 1,
      BREVE: 2,
      HORN: 3,
      DASH: 4
    };

    var Tone = {
      NONE: 0,
      GRAVE: 1,
      ACUTE: 2,
      HOOK: 3,
      TILDE: 4,
      DOT: 5
    };

    var VOWELS = 'aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩị' +
                 'oòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ';

    var composition = [];
    var rules = [];

    var MARKS_MAP = {
      'a': 'aâă__',
      'â': 'aâă__',
      'ă': 'aâă__',
      'e': 'eê___',
      'ê': 'eê___',
      'o': 'oô_ơ_',
      'ô': 'oô_ơ_',
      'ơ': 'oô_ơ_',
      'u': 'u__ư_',
      'ư': 'u__ư_',
      'd': 'd___đ',
      'đ': 'd___đ'
    };

    var MARK_CHARS = {
      '^': Mark.HAT,
      '(': Mark.BREVE,
      '+': Mark.HORN,
      '-': Mark.DASH
    };

    var TONE_CHARS = {
      '~': Tone.TILDE,
      '\'': Tone.ACUTE,
      '?': Tone.HOOK,
      '`': Tone.GRAVE,
      '.': Tone.DOT
    };

    function is_vowel(chr) {
      return VOWELS.indexOf(chr) != -1;
    }

    function add_mark_to_char(chr, mark) {
      var result;
      var tone = get_tone_from_char(chr);
      chr = add_tone_to_char(chr, Tone.NONE);

      if (chr in MARKS_MAP && MARKS_MAP[chr][mark] != '_') {
        result = MARKS_MAP[chr][mark];
      } else {
        result = chr;
      }

      result = add_tone_to_char(result, tone);
      return result;
    }

    function get_tone_from_char(chr) {
      var position = VOWELS.indexOf(chr);
      if (position != -1) {
        return position % 6;
      } else {
        return Tone.NONE;
      }
    }

    function add_tone_to_char(chr, tone) {
      var result;
      var position = VOWELS.indexOf(chr);

      if (position != -1) {
        var current_tone = position % 6;
        var offset = tone - current_tone;
        result = VOWELS[position + offset];
      } else {
        result = chr;
      }
      return result;
    }

    function find_mark_target(rule) {
      var target;
      for (var i = composition.length - 1; i > -1; i--) {
        if (composition[i].rule.key == rule.effective_on) {
          target = composition[i];
        }
      }
      return target;
    }

    function find_rightmost_vowels() {
      var vowels = [];
      for (var i = composition.length - 1; i >= 0; i--) {
        var trans = composition[i];

        if (trans.rule.type == EffectType.APPENDING &&
          is_vowel(trans.rule.key)) {
          vowels.unshift(trans);
        }
      }
      return vowels;
    }

    function find_next_appending_trans(trans) {
      var from_index = composition.indexOf(trans);
      var next_appending_trans;

      // FIXME: Need not-found guard.
      for (var i = from_index + 1; i < composition.length; i++) {
        if (composition[i].rule.type == EffectType.APPENDING) {
          next_appending_trans = composition[i];
        }
      }

      return next_appending_trans;
    }

    function find_tone_target(rule) {
      var vowels = find_rightmost_vowels();
      var target;

      if (vowels.length == 1) {
        // cá
        target = vowels[0];
      } else if (vowels.length == 2) {
        if (find_next_appending_trans(vowels[1]) !== undefined ||
          flatten(vowels) == 'uo') {
          // nước, thuở
          target = vowels[1];
        } else {
          // cáo
          target = vowels[0];
        }
      } else if (vowels.length == 3) {
        if (flatten(vowels) == 'uye') {
          // chuyển
          target = vowels[2];
        } else {
          // khuỷu
          target = vowels[1];
        }
      }

      return target;
    }

    function refresh_last_tone_target() {
      // Refresh the tone position of the last EffectType.TONE transformation.
      for (var i = composition.length - 1; i >= 0; i--) {
        var trans = composition[i];
        if (trans.rule.type == EffectType.TONE) {
          var new_target = find_tone_target(trans.rule);
          trans.target = new_target;
          break;
        }
      }
    }

    function process_char(chr) {
      var isUpperCase = chr === chr.toUpperCase();
      chr = chr.toLowerCase();

      var applicable_rules = [];
      rules.forEach(function(rule) {
        if (rule.key == chr) {
          applicable_rules.push(rule);
        }
      });

      // If none of the applicable_rules can actually be applied then this new
      // transformation fallbacks to an APPENDING one.
      var trans = {
        rule: {
          type: EffectType.APPENDING,
          key: chr
        },
        isUpperCase: isUpperCase
      };

      for (var i = 0; i < applicable_rules.length; i++) {
        var rule = applicable_rules[i];
        var target;

        if (rule.type == EffectType.MARK) {
          target = find_mark_target(rule);
        } else if (rule.type == EffectType.TONE) {
          target = find_tone_target(rule);
        }

        if (target !== undefined) {
          // Fix uaw being wrongly processed to muă by skipping
          // the aw rule. Then the uw rule will be matched later.
          // Note that this requires the aw rule be placed before
          // uw in the rule list.
          if (chr == 'w') {
            var target_index = composition.indexOf(target);
            var prev_trans = composition[target_index - 1];
            if (target.rule.key == 'a' &&
              prev_trans.rule.key == 'u') {
              continue;
            }
          }

          trans.rule = rule;
          trans.target = target;
          break;
        }
      }

      composition.push(trans);

      // Implement the uow typing shortcut by creating a virtual
      // Mark.HORN rule that targets 'u'.
      //
      // FIXME: This is a potential slowdown. Perhaps it should be
      //        toggled by a config key.
      if (flatten().match(/uơ.+$/)) {
        var vowels = find_rightmost_vowels();
        var virtual_trans = {
          rule: {
            type: EffectType.MARK,
            key: '', // This is a virtual rule,
                 // it should not appear in the raw string.
            effect: Mark.HORN
          },
          target: vowels[0]
        };

        composition.push(virtual_trans);
      }

      // Sometimes, a tone's position in a previous state must be changed to
      // fit the new state.
      //
      // e.g.
      // prev state: chuyenr  -> chuỷen
      // this state: chuyenre -> chuyển
      if (trans.rule.type == EffectType.APPENDING) {
        refresh_last_tone_target();
      }
    }

    function flatten() {
      var canvas = [];

      composition.forEach(function(trans, index) {

        function apply_effect(func, trans) {
          var index = trans.target.dest;
          var char_with_effect = func(canvas[index], trans.rule.effect);

          // Double typing an effect key undoes it. Btw, we're playing
          // fast-and-loose here by relying on the fact that Tone.NONE
          // equals Mark.None and equals 0.
          if (char_with_effect == canvas[index]) {
            canvas[index] = func(canvas[index], Tone.NONE);
          } else {
            canvas[index] = char_with_effect;
          }
        }

        switch (trans.rule.type) {
        case EffectType.APPENDING:
          trans.dest = canvas.length;
          canvas.push(trans.rule.key);
          break;
        case EffectType.MARK:
          apply_effect(add_mark_to_char, trans);
          break;
        case EffectType.TONE:
          apply_effect(add_tone_to_char, trans);
          break;
        default:
          break;
        }
      });

      composition.forEach(function(trans) {
        if (trans.rule.type == EffectType.APPENDING) {
          if (trans.isUpperCase) {
            canvas[trans.dest] = canvas[trans.dest].toUpperCase();
          }
        }
      });

      return canvas.join('');
    }

    function process_string(string) {
      for (var i = 0; i < string.length; i++) {
        process_char(string[i]);
      }
    }

    // js > parse_rule('a a a^')
    // {type: EffectType.MARK, effect: HAT, key: a, effective_on: a}
    //
    // js > parse_rule('a w a(')
    // {type: EffectType.MARK, effect: BREVE, key: w, effective_on: a}
    //
    // js > parse_rule('a f a`')
    // {type: EffectType.MARK, effect: HAT, key: a, effective_on: a}
    //
    // js > parse_rule('w u+')
    // {type: EffectType.APPEND, effect: ư, key: w}
    function parse_rule(string) {
      var tokens = string.trim().replace(/\s\s+/, ' ').split(' ');

      var effective_on = tokens[0];
      var key = tokens[1];
      var type;
      var effect;

      var effect_char = tokens[2][1];
      if (effect_char in MARK_CHARS) {
        type = EffectType.MARK;
        effect = MARK_CHARS[effect_char];
      } else if (effect_char in TONE_CHARS) {
        type = EffectType.TONE;
        effect = TONE_CHARS[effect_char];
      }

      var trans = {
        type: type,
        key: key,
        effect: effect,
        effective_on: effective_on
      };

      return trans;
    }

    function process_backspace() {
      var indexes_to_remove = [];
      var last_appending_trans;
      var i;
      var trans;

      // Find the last APPENDING transformation and all
      // the transformations that add effects to it.
      for (i = composition.length - 1; i >= 0; i--) {
        trans = composition[i];
        if (trans.rule.type == EffectType.APPENDING) {
          last_appending_trans = trans;
          indexes_to_remove.push(i);
          break;
        }
      }

      for (i = indexes_to_remove[0] + 1; i < composition.length; i++) {
        trans = composition[i];
        if (trans.hasOwnProperty('target') &&
          trans.target === last_appending_trans) {
          indexes_to_remove.push(i);
        }
      }

      // Then remove them
      indexes_to_remove.sort().reverse();
      indexes_to_remove.forEach(function(index) {
        composition.splice(index, 1);
      });
    }

    function get_raw_input_string() {
      var raw_input_keys = [];
      composition.forEach(function(trans) {
        raw_input_keys.push(trans.rule.key);
      });
      return raw_input_keys.join('');
    }

    function clear_composition() {
      composition = [];
    }

    function clear_rules() {
      rules = [];
    }

    function has_composition() {
      return composition.length !== 0;
    }

    var exports = {
      add_rule: function(rule_string) {
        rules.push(parse_rule(rule_string));
      },
      clear_rules: clear_rules,
      process_char: process_char,
      process_string: process_string,
      process_backspace: process_backspace,
      clear_composition: clear_composition,
      get_processed_string: flatten,
      get_raw_input_string: get_raw_input_string,
      has_composition: has_composition
    };

    return exports;
  }


  var input_context;
  var engine;

  function init(_input_context) {
    console.log('KEYBOARD: ' + _input_context);
    input_context = _input_context;

    engine = new BoGo();
    engine.add_rule('o w o+');
    engine.add_rule('u w u+');
    engine.add_rule('a a a^');
    engine.add_rule('a w a(');
    engine.add_rule('e e e^');
    engine.add_rule('o o o^');
    engine.add_rule('d d d-');
    engine.add_rule('_ f _`');
    engine.add_rule('_ r _?');
    engine.add_rule('_ x _~');
    engine.add_rule('_ j _.');
    engine.add_rule('_ s _\'');
  }

  function click(keycode, x, y) {
    if (keycode == 32) {
      input_context.endComposition(engine.get_processed_string());
      engine.clear_composition();
      input_context.sendKey(keycode);
    } else if (keycode == 8) {
      if (engine.has_composition()) {
        engine.process_backspace();
        input_context.setComposition(engine.get_processed_string());
      } else {
        engine.clear_composition();
        input_context.sendKey(keycode);
      }
    } else {
      var chr = String.fromCharCode(keycode);
      engine.process_char(chr);
      input_context.setComposition(engine.get_processed_string());
    }
  }

  // Expose the engine to the Gaia keyboard
  InputMethods.jsbogo = {
    init: init,
    click: click
  };
})();
