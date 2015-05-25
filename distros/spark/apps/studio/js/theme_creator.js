(function(exports) {
  'use strict';

  const GROUPS = [
    'default', 'communications', 'media', 'productivity', 'settings'
  ];

  const SOLARIZED_LIGHT_SECTIONS = {
    'Basics': {
      '--background': '#FCF5E4',
      '--text-color': '#6A7A82',
      '--highlight-color': '#3C86CB',
      '--link-color': '#3C86CB',
      '--border-color': '#889426',
      '--button-background': '#F2F0C2',
      '--input-background': '#FCF5E4',
      '--input-color': '#6A7A82',
      '--input-clear-background': '#3C86CB',
    },
    'Header': {
      '--header-background': '#FCF5E4',
      '--header-color': '#6A7A82',
      '--header-icon-color': '#CA9630',
      '--header-button-color': '#CA9630',
      '--header-disabled-button-color': '#BDC3C3',
      '--header-action-button-color': '#CA9630'
    }
  };

  const SOLARIZED_DARK_SECTIONS = {
    'Basics': {
      '--background': '#0E2B35',
      '--text-color': '#ffffff',
      '--highlight-color': '#889426',
      '--link-color': '#889426',
      '--border-color': '#C15082',
      '--button-background': '#3C86CB',
      '--input-background': '#0E2B35',
      '--input-color': '#6F8B94',
      '--input-clear-background': '#3C86CB',
    },
    'Header': {
      '--header-background': '#0E2B35',
      '--header-color': '#6F8B94',
      '--header-icon-color': '#C15082',
      '--header-button-color': '#C15082',
      '--header-disabled-button-color': '#BDC3C3',
      '--header-action-button-color': '#C15082'
    }
  };

  const THEME_SOLARIZED_LIGHT = {
    title: 'Solarized Light',
    groups: {
      'default': SOLARIZED_LIGHT_SECTIONS,
      'communications': SOLARIZED_LIGHT_SECTIONS,
      'media': SOLARIZED_LIGHT_SECTIONS,
      'productivity': SOLARIZED_LIGHT_SECTIONS,
      'settings': SOLARIZED_LIGHT_SECTIONS
    }
  };

  const THEME_SOLARIZED_DARK = {
    title: 'Solarized Dark',
    groups: {
      'default': SOLARIZED_DARK_SECTIONS,
      'communications': SOLARIZED_DARK_SECTIONS,
      'media': SOLARIZED_DARK_SECTIONS,
      'productivity': SOLARIZED_DARK_SECTIONS,
      'settings': SOLARIZED_DARK_SECTIONS
    }
  };

  const THEME_TEMPLATE = {
    'Basics': {
      '--background': null,
      '--text-color': null,
      '--highlight-color': null,
      '--link-color': null,
      '--border-color': null,
      '--button-background': null,
      '--input-background': null,
      '--input-color': null,
      '--input-clear-background': null
    },
    'Header': {
      '--header-background': null,
      '--header-color': null,
      '--header-icon-color': null,
      '--header-button-color': null,
      '--header-disabled-button-color': null,
      '--header-action-button-color': null
    }
  };

  const THEME_DEFAULTS = {
    default: {
      background: '#ffffff',
      textColor: '#4d4d4d',
      highlightColor: '#00caf2',
      linkColor: '#00caf2',
      borderColor: '#e7e7e7',
      buttonBackground: '#f4f4f4',
      inputBackground: '#ffffff',
      inputColor: '#333333',
      inputClearBackground: '#909ca7',
      headerBackground: '#ffffff',
      headerColor: '#4d4d4d',
      headerIconColor: '#4d4d4d',
      headerButtonColor: '#00caf2',
      headerDisabledButtonColor: '#e7e7e7',
      headerActionButtonColor: '#4d4d4d'
    },
    communications: {
      background: '#f4f4f4',
      textColor: '#27c8c2',
      highlightColor: '#00caf2',
      linkColor: '#177874',
      borderColor: '#e7e7e7',
      buttonBackground: '#f4f4f4',
      inputBackground: '#ffffff',
      inputColor: '#333333',
      inputClearBackground: '#909ca7',
      headerBackground: '#27c8c2',
      headerColor: '#ffffff',
      headerIconColor: '#ffffff',
      headerButtonColor: '#177874',
      headerDisabledButtonColor: '#e7e7e7',
      headerActionButtonColor: '#4d4d4d'
    },
    media: {
      background: '#333333',
      textColor: '#ffffff',
      highlightColor: '#00caf2',
      linkColor: '#00caf2',
      borderColor: '#4d4d4d',
      buttonBackground: '4d4d4d',
      inputBackground: '#4d4d4d',
      inputColor: '#2b2b2b',
      inputClearBackground: '#909ca7',
      headerBackground: '#333333',
      headerColor: '#ffffff',
      headerIconColor: '#ffffff',
      headerButtonColor: '#00caf2',
      headerDisabledButtonColor: '#e7e7e7',
      headerActionButtonColor: '#4d4d4d'
    },
    productivity: {
      background: '#ffffff',
      textColor: '#4d4d4d',
      highlightColor: '#27c8c2',
      linkColor: '#00caf2',
      borderColor: '#e7e7e7',
      buttonBackground: '#f4f4f4',
      inputBackground: '#ffffff',
      inputColor: '#333333',
      inputClearBackground: '#909ca7',
      headerBackground: '#ff9900',
      headerColor: '#ffffff',
      headerIconColor: '#4d4d4d',
      headerButtonColor: '#00caf2',
      headerDisabledButtonColor: '#e7e7e7',
      headerActionButtonColor: '#4d4d4d'
    },
    settings: {
      background: '#f4f4f4',
      textColor: '#4d4d4d',
      highlightColor: '#00caf2',
      linkColor: '#00caf2',
      borderColor: '#e7e7e7',
      buttonBackground: '#ffffff',
      inputBackground: '#ffffff',
      inputColor: '#333333',
      inputClearBackground: '#909ca7',
      headerBackground: '#f4f4f4',
      headerColor: '#858585',
      headerIconColor: '#4d4d4d',
      headerButtonColor: '#00caf2',
      headerDisabledButtonColor: '#e7e7e7',
      headerActionButtonColor: '#4d4d4d'
    }
  };

  function camelVariable(variable) {
    return variable.replace(
      /-([\w-])/g,
      (_, p1) => p1 === '-' ? '' : p1.toUpperCase()
    );
  }

  function getPaletteWithKeywords(arrayPalette) {
    if (!arrayPalette || !arrayPalette.length) {
      return {};
    }

    var l = arrayPalette.length;
    var palette = Object.keys(THEME_DEFAULTS.default).reduce(
      (acc, keyword, i) => {
        acc[keyword] = arrayPalette[i % l];
        return acc;
      }, {}
    );

    return palette;
  }

  function replaceThemeTemplate(group, palette, defaultPalette) {
    var result = {};

    Object.keys(group).forEach(variable => {
      var keyword = camelVariable(variable);

      var color = palette[keyword];
      color = color ? color.toHexString() : defaultPalette[keyword];

      result[variable] = color;
    });

    return result;
  }

  exports.ThemeCreator = {
    /**
     * @param theme { title, [autotheme], [palette] }
     * @return {
     *   title, [autotheme],
     *   groups { default, communications, media, productivity, settings }
     * }
     */
    template(theme) {
      var result = Object.assign({}, theme);
      result.groups = {};

      var paletteWithKeywords = getPaletteWithKeywords(theme.palette);
      GROUPS.forEach(group => {
        var groupValues = {};
        for (var key in THEME_TEMPLATE) {
          groupValues[key] = replaceThemeTemplate(
            THEME_TEMPLATE[key],
            paletteWithKeywords,
            THEME_DEFAULTS[group]
          );
        }
        result.groups[group] = groupValues;
      });

      delete result.palette;
      return result;
    },

    solarized(flavor) {
      switch(flavor) {
        case 'light':
          return THEME_SOLARIZED_LIGHT;
        case 'dark':
          return THEME_SOLARIZED_DARK;
        default:
          throw new Error('Flavor ' + flavor + ' is invalid.');
      }
    }
  };
})(window);
