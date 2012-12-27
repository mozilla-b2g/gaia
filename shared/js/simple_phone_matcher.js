/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * A simple lib to match internaional phone number with local
 * and user formatted phone numbers.
 *
 * Adding this feature to gecko is discussed here:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=743363
 *
 */

var SimplePhoneMatcher = {
  mcc: '724', // Assuming a Brazilian mcc by default, can be changed.

  // Used to remove all the formatting from a phone number.
  sanitizedNumber: function spm_sanitizedNumber(number) {
    var join = this._formattingChars.join('|\\');
    var regexp = new RegExp('(\\' + join + ')', 'g');
    return number.replace(regexp, '');
  },

  // Generate variants of a phone number (with prefix, without...).
  // The variants are sorted from the shortest to the longest.
  generateVariants: function spm_generateVariants(number) {
    var sanitizedNumber = this.sanitizedNumber(number);

    var variants = [];

    variants = variants.concat(this._internationalPrefixes(sanitizedNumber),
                               this._trunkPrefixes(sanitizedNumber),
                               this._carrierPrefixes(sanitizedNumber),
                               this._areaPrefixes(sanitizedNumber));

    return variants.sort(function shortestFirst(a, b) {
      return a.length > b.length;
    });
  },

  // Find the best (ie longest) match between the variants for a number
  // and matches.
  // |matches| is an array of arrays
  // This way we can easily go trough the results of a mozContacts request:
  // array (contacts) of arrays (phone numbers).
  // => {
  //      bestMatchIndex: i,
  //      localIndex: j
  //    }
  // ie. bestMatchIndex will be the index in the contact arrays, localIndex
  // the index in the phone numbers array of this contact
  bestMatch: function spm_bestMatchIndex(variants, matches) {
    var bestMatchIndex = null;
    var bestLocalIndex = null;
    var bestMatchLength = 0;

    matches.forEach(function(match, matchIndex) {
      match.forEach(function(number, localIndex) {
        var sanitizedNumber = this.sanitizedNumber(number);

        variants.forEach(function match(variant) {
          if (variant.indexOf(sanitizedNumber) !== -1 ||
              sanitizedNumber.indexOf(variant) !== -1) {
            var length = sanitizedNumber.length;

            if (length > bestMatchLength) {
              bestMatchLength = length;
              bestMatchIndex = matchIndex;
              bestLocalIndex = localIndex;
            }
          }
        });
      }, this);
    }, this);

    return {
      bestMatchIndex: bestMatchIndex,
      localIndex: bestLocalIndex
    };
  },

  _formattingChars: ['\s', '-', '.', '(', ')'],

  _mccWith00Prefix: ['208', '214', '234', '235', '724'],
  _mccWith011Prefix: ['310', '311', '312', '313', '314', '315', '316'],

  // https://en.wikipedia.org/wiki/Country_calling_code
  // https://en.wikipedia.org/wiki/Trunk_code
  // This is an array of objects composed by { p: <prefix>, t: <true if it can be trunk> }
  _countryPrefixes: [
    // North American Numbering Plan countries and territories
    // US, CA, AG, AI, AS, BB, BM, BS, DM, DO, GD, GU, JM, KN, KY,
    // LC, MP, MS, PR, SX, TC, TT, VC, VG, VI
    {p: '1', t: false},

    // BS                  BB                    AI
    {p: '1242', t: false}, {p: '1246', t: false}, {p: '1264', t: false},
    // AG                  VG                     VI                     KY                     BM
    {p: '1268', t: false}, {p: '1284', t: false}, {p: '1340', t: false}, {p: '1345', t: false}, {p: '1441', t: false},
    // GD                  TC                     MS                     MP                     GU
    {p: '1473', t: false}, {p: '1649', t: false}, {p: '1664', t: false}, {p: '1670', t: false}, {p: '1671', t: false},
    // AS                  SX                     LC                     DM                     VC
    {p: '1684', t: false}, {p: '1721', t: false}, {p: '1758', t: false}, {p: '1767', t: false}, {p: '1784', t: false},
    // PR                  DO                     DO                     DO                     TT
    {p: '1787', t: false}, {p: '1809', t: false}, {p: '1829', t: false}, {p: '1849', t: false}, {p: '1868', t: false},
    // KN                  JM                     PR
    {p: '1869', t: false}, {p: '1876', t: false}, {p: '1939', t: false},

    // EG                 --                    SS
    {p: '20', t: false},  {p: '210', t: false}, {p: '211', t: false},
    // MA,EH              DZ                    --                    --                    TN
    {p: '212', t: false}, {p: '213', t: false}, {p: '214', t: false}, {p: '215', t: false}, {p: '216', t: false},
    // --                 LY                    --                    GM                    SN
    {p: '217', t: false}, {p: '218', t: false}, {p: '219', t: false}, {p: '220', t: false}, {p: '221', t: false},
    // MR                 ML                    GN                    CI                    BF
    {p: '222', t: false}, {p: '223', t: false}, {p: '224', t: false}, {p: '225', t: false}, {p: '226', t: false},
    // NE                 TG                    BJ                    MU                    LR
    {p: '227', t: false}, {p: '228', t: false}, {p: '229', t: false}, {p: '230', t: false}, {p: '231', t: false},
    // SL                 GH                    NG                    TD                    CF
    {p: '232', t: false}, {p: '233', t: false}, {p: '234', t: false}, {p: '235', t: false}, {p: '236', t: false},
    // CM                 CV                    ST                    GQ                    GA
    {p: '237', t: false}, {p: '238', t: false}, {p: '239', t: false}, {p: '240', t: false}, {p: '241', t: false},
    // CG                 CD                    AO                    GW                    IO
    {p: '242', t: false}, {p: '243', t: false}, {p: '244', t: false}, {p: '245', t: false}, {p: '246', t: false},
    // AC                 SC                    SD                    RW                    ET
    {p: '247', t: false}, {p: '248', t: false}, {p: '249', t: false}, {p: '250', t: false}, {p: '251', t: false},
    // SO,QS              DJ                    KE                    TZ                    UG
    {p: '252', t: false}, {p: '253', t: false}, {p: '254', t: false}, {p: '255', t: false}, {p: '256', t: false},
    // BI                 MZ                    --                    ZM                    MG
    {p: '257', t: false}, {p: '258', t: false}, {p: '259', t: false}, {p: '260', t: false}, {p: '261', t: false},
    // RE,YT              ZW                    NA                    MW                    LS
    {p: '262', t: false}, {p: '263', t: false}, {p: '264', t: false}, {p: '265', t: false}, {p: '266', t: false},
    // BW                 SZ                    KM                    ZA                    --
    {p: '267', t: false}, {p: '268', t: false}, {p: '269', t: false}, {p: '27', t: false},  {p: '28', t: false},
    // SH,TA              ER                    --                    --                    --
    {p: '290', t: false}, {p: '291', t: false}, {p: '292', t: false}, {p: '293', t: false}, {p: '294', t: false},
    // --                 --                    AW                    FO                    GL
    {p: '295', t: false}, {p: '296', t: false}, {p: '297', t: false}, {p: '298', t: false}, {p: '299', t: false},

    // GR                 NL                    BE
    {p: '30', t: false},  {p: '31', t: true},   {p: '32', t: true},
    // FR                 ES                    GI                    PT                    LU
    {p: '33', t: true},   {p: '34', t: false},  {p: '350', t: false}, {p: '351', t: true},  {p: '352', t: false},
    // IE                 IS                    AL                    MT                    CY
    {p: '353', t: false}, {p: '354', t: false}, {p: '355', t: true},  {p: '356', t: false}, {p: '357', t: false},
    // FI,AX              BG                    HU                    LT                    LV
    {p: '358', t: false}, {p: '359', t: true},  {p: '36', t: true},   {p: '370', t: true},  {p: '371', t: false},
    // EE                 MD                    AM,QN                 BY                    AD
    {p: '372', t: false}, {p: '373', t: true},  {p: '374', t: false}, {p: '375', t: true},  {p: '376', t: false},
    // MC                 SM                    VA                    UA                    RS
    {p: '377', t: false}, {p: '378', t: false}, {p: '379', t: false}, {p: '380', t: true},  {p: '381', t: true},
    // ME                 --                    --                    HR                    SI
    {p: '382', t: true},  {p: '383', t: false}, {p: '384', t: false}, {p: '385', t: true},  {p: '386', t: false},
    // BA                 EU                    MK                    IT,VA
    {p: '387', t: true},  {p: '388', t: false}, {p: '389', t: true},  {p: '39', t: false},

    // RO                 CH                    CZ
    {p: '40', t: true},   {p: '41', t: true},   {p: '420', t: false},
    // SK                 --                    LI                    --                    --
    {p: '421', t: false}, {p: '422', t: false}, {p: '423', t: false}, {p: '424', t: false}, {p: '425', t: false},
    // --                 --                    --                    --                    AT
    {p: '426', t: false}, {p: '427', t: false}, {p: '428', t: false}, {p: '429', t: false}, {p: '43', t: true},
    // GB/UK,GG,IM,JE     DK                    SE                    NO,SJ                 PL
    {p: '44', t: true},   {p: '45', t: false},  {p: '46', t: true},   {p: '47', t: false},  {p: '48', t: true},
    // DE
    {p: '49', t: true},

    // FK                 BZ                    GT
    {p: '500', t: false}, {p: '501', t: false}, {p: '502', t: false},
    // SV                 HN                    NI                    CR                    PA
    {p: '503', t: false}, {p: '504', t: false}, {p: '505', t: false}, {p: '506', t: false}, {p: '507', t: false},
    // PM                 HT                    PE                    MX                    CU
    {p: '508', t: false}, {p: '509', t: false}, {p: '51', t: true},   {p: '52', t: false},  {p: '53', t: false},
    // AR                 BR                    CL                    CO                    VE
    {p: '54', t: true},   {p: '55', t: true},   {p: '56', t: false},  {p: '57', t: false},  {p: '58', t: false},
    // GP,BL,MF           BO                    GY                    EC                    GF
    {p: '590', t: false}, {p: '591', t: true},  {p: '592', t: false}, {p: '593', t: false}, {p: '594', t: false},
    // PY                 MQ                    SR                    UY                    BQ,CW
    {p: '595', t: false}, {p: '596', t: false}, {p: '597', t: false}, {p: '598', t: false}, {p: '599', t: true},

    // MY                 AU,CX,CC              ID
    {p: '60', t: true},   {p: '61', t: true},   {p: '62', t: true},
    // PH                 NZ                    SG                    TH                    TL
    {p: '63', t: true},   {p: '64', t: false},  {p: '65', t: true},   {p: '66', t: true},   {p: '670', t: false},
    // --                 NF,AQ                 BN                    NR                    PG
    {p: '671', t: false}, {p: '672', t: false}, {p: '673', t: true},  {p:'674', t: false},  {p: '675', t: false},
    // TO                 SB                    VU                    FJ                    PW
    {p: '676', t: false}, {p: '677', t: false}, {p: '678', t: false}, {p:'679', t: false},  {p: '680', t: false},
    // WF                 CK                    NU                    --                    WS
    {p: '681', t: false}, {p: '682', t: false}, {p: '683', t: false}, {p:'684', t: false},  {p: '685', t: false},
    // KI                 NC                    TV                    PF                    TK
    {p: '686', t: false}, {p: '687', t: false}, {p: '688', t: false}, {p:'689', t: false},  {p: '690', t: false},
    // FM                 MH                    --                    --                    --
    {p: '691', t: false}, {p: '692', t: false}, {p: '693', t: false}, {p: '694', t: false}, {p: '695', t: false},
    // --                 --                    --                    --                    --
    {p: '696', t: false}, {p: '697', t: false}, {p: '698', t: false}, {p: '699', t: false}, {p: '699', t: false},

    // RU,KZ
    {p: '7', t: true},

    // KZ               KZ                   Abkhazia               Abkhazia
    {p: '76', t: true}, {p: '77', t: true},  {p: '7840', t: false}, {p: '7940', t: false},

    // XT                 --                    --
    {p: '800', t: false}, {p: '801', t: false}, {p: '802', t: false},
    // --                 --                    --                    --                    --
    {p: '803', t: false}, {p: '804', t: false}, {p: '805', t: false}, {p: '806', t: false}, {p: '807', t: false},
    // XS                 --                    JP                    KR                    --
    {p: '808', t: false}, {p: '809', t: false}, {p: '81', t: false},  {p: '82', t: true},   {p: '83', t: false},
    // VN                 KP                    --                    HK                    MO
    {p: '84', t: true},   {p: '850', t: true},  {p: '851', t: false}, {p: '852', t: false}, {p: '853', t: false},
    // --                 KH                    LA                    --                    --
    {p: '854', t: false}, {p: '855', t: true},  {p: '856', t: true},  {p: '857', t: false}, {p: '858', t: false},
    // --                 CN                    XN                    --                    --
    {p: '859', t: false}, {p: '86', t: true},   {p: '870', t: false}, {p: '871', t: false}, {p: '872', t: false},
    // --                 --                    --                    --                    --
    {p: '873', t: false}, {p: '874', t: false}, {p: '875', t: false}, {p: '876', t: false}, {p: '877', t: false},
    // XP                 --                    BD                    XG                    XV
    {p: '878', t: false}, {p: '879', t: false}, {p: '880', t: true},  {p: '881', t: false}, {p: '882', t: false},
    // XV                 --                    --                    TW                    --
    {p: '883', t: false}, {p: '884', t: false}, {p: '885', t: false}, {p: '886', t: true},  {p: '887', t: false},
    // XD                 --                    --
    {p: '888', t: false}, {p: '889', t: false}, {p: '89', t: false},

    // TR,QY              IN                    PK
    {p: '90', t: false},  {p: '91', t: true},   {p: '92', t: true},
    // AF                 LK                    MM                    MV                    LB
    {p: '93', t: true},   {p: '94', t: false},  {p: '95', t: true},   {p: '960', t: false}, {p: '961', t: false},
    // JO                 SY                    IQ                    KW                    SA
    {p: '962', t: false}, {p: '963', t: false}, {p: '964', t: false}, {p: '965', t: false}, {p: '966', t: false},
    // YE                 OM                    --                    PS                    AE
    {p: '967', t: false}, {p: '968', t: false}, {p: '969', t: false}, {p: '970', t: false}, {p: '971', t: false},
    // IL                 BH                    QA                    BT                    MN
    {p: '972', t: false}, {p: '973', t: false}, {p: '974', t: false}, {p: '975', t: true},  {p: '976', t: true},
    // NP                 --                    XR                    IR                    --
    {p: '977', t: true},  {p: '978', t: false}, {p: '979', t: false}, {p: '98', t: false},  {p: '990', t: false},
    // XC                 TJ                    TM                    AZ                    GE
    {p: '991', t: false}, {p: '992', t: false}, {p: '993', t: true},  {p: '994', t: true},  {p: '995', t: true},
    // KG                 --                    UZ                    --
    {p: '996', t: false}, {p: '997', t: false}, {p: '998', t: true},  {p: '999', t: false}
  ],
  _trunkCodes: ['0'],

  // https://en.wikipedia.org/wiki/List_of_dialling_codes_in_Brazil
  // https://en.wikipedia.org/wiki/Telephone_numbers_in_the_United_Kingdom
  // https://en.wikipedia.org/wiki/Telephone_numbering_plan
  // country code -> length of the area code
  _areaCodeSwipe: {
    '55': 2,
    '44': 3,
    '1': 3
  },

  _internationalPrefixes: function spm_internatialPrefixes(number) {
    var variants = [number];

    var internationalPrefix = '';
    if (this._mccWith00Prefix.indexOf(this.mcc) !== -1) {
      internationalPrefix = '00';
    }
    if (this._mccWith011Prefix.indexOf(this.mcc) !== -1) {
      internationalPrefix = '011';
    }

    var plusRegexp = new RegExp('^\\+');
    if (number.match(plusRegexp)) {
      variants.push(number.replace(plusRegexp, internationalPrefix));
    }

    var ipRegexp = new RegExp('^' + internationalPrefix);
    if (number.match(ipRegexp)) {
      variants.push(number.replace(ipRegexp, '+'));
    }

    return variants;
  },

  _trunkPrefixes: function spm_trunkPrefixes(number) {
    var variants = [];

    var prefixesWithTrunk0 = [];
    var prefixesWithNoTrunk = [];
    this._countryPrefixes.forEach(function(prefix) {
      if (prefix.t) {
        prefixesWithTrunk0.push(prefix.p);
      } else {
        prefixesWithNoTrunk.push(prefix.p);
      }
    });

    var trunk0Join = prefixesWithTrunk0.join('|')
    var trunk0Regexp = new RegExp('^\\+(' + trunk0Join + ')');
    this._internationalPrefixes(number).some(function match(variant) {
      var match = variant.match(trunk0Regexp);

      if (match) {
        variants.push(variant.replace(trunk0Regexp, '0'));
        variants.push(variant.replace(trunk0Regexp, ''));
      }

      return match;
    });

    var noTrunkJoin = prefixesWithNoTrunk.join('|');
    var noTrunkRegexp = new RegExp('^\\+(' + noTrunkJoin + ')');
    this._internationalPrefixes(number).some(function match(variant) {
      var match = variant.match(noTrunkRegexp);

      if (match) {
        variants.push(variant.replace(noTrunkRegexp, ''));
      }

      return match;
    });

    // If the number has a trunk prefix already we need a variant without it
    var withTrunkRegexp = new RegExp('^(' + this._trunkCodes.join('|') + ')');
    if (number.match(withTrunkRegexp)) {
      variants.push(number.replace(withTrunkRegexp, ''));
    }

    return variants;
  },

  _areaPrefixes: function spm_areaPrefixes(number) {
    var variants = [];

    Object.keys(this._areaCodeSwipe).forEach(function(country) {
      var re = new RegExp('^\\+' + country);

      this._internationalPrefixes(number).some(function match(variant) {
        var match = variant.match(re);

        if (match) {
          var afterArea = 1 + country.length + this._areaCodeSwipe[country];
          variants.push(variant.substring(afterArea));
        }

        return match;
      }, this);
    }, this);

    return variants;
  },

  // http://thebrazilbusiness.com/article/telephone-system-in-brazil
  _carrierPrefixes: function spm_carrierPrefix(number) {
    if (this.mcc != '724') {
      return [];
    }

    var variants = [];
    var withTrunk = new RegExp('^0');

    // A number with carrier prefix will have a trunk code and at
    // lest 13 digits
    if (number.length >= 13 && number.match(withTrunk)) {
      var afterCarrier = 3;
      variants.push(number.substring(afterCarrier));
    }

    return variants;
  }
};

