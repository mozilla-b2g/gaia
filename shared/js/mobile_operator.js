/* exported MobileInfo, MobileOperator */
'use strict';

var MobileInfo = {
  brazil: {
    carriers: {
      '00': 'NEXTEL',
      '02': 'TIM', '03': 'TIM', '04': 'TIM',
      '05': 'CLARO', '06': 'VIVO', '07': 'CTBC', '08': 'TIM',
      '10': 'VIVO', '11': 'VIVO', '15': 'SERCOMTEL',
      '16': 'OI', '23': 'VIVO', '24': 'OI', '31': 'OI',
      '32': 'CTBC', '33': 'CTBC', '34': 'CTBC', '37': 'AEIOU'
    },
    regions: {
      '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP',
      '17': 'SP', '18': 'SP', '19': 'SP',
      '21': 'RJ', '22': 'RJ', '24': 'RJ',
      '27': 'ES', '28': 'ES',
      '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG',
      '38': 'MG',
      '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
      '47': 'SC', '48': 'SC', '49': 'SC',
      '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
      '61': 'DF',
      '62': 'GO',
      '63': 'TO',
      '64': 'GO',
      '65': 'MT', '66': 'MT',
      '67': 'MS',
      '68': 'AC',
      '69': 'RO',
      '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
      '79': 'SE',
      '81': 'PE',
      '82': 'AL',
      '83': 'PB',
      '84': 'RN',
      '85': 'CE',
      '86': 'PI',
      '87': 'PE',
      '88': 'CE',
      '89': 'PI',
      '91': 'PA',
      '92': 'AM',
      '93': 'PA', '94': 'PA',
      '95': 'RR',
      '96': 'AP',
      '97': 'AM',
      '98': 'MA', '99': 'MA'
    }
  }
};

var MobileOperator = {
  BRAZIL_MCC: '724',
  BRAZIL_CELLBROADCAST_CHANNEL: 50,

  userFacingInfo: function mo_userFacingInfo(mobileConnection) {
    var network = mobileConnection.voice.network;
    var iccid = mobileConnection.iccId;
    var iccObj = navigator.mozIccManager.getIccById(iccid);
    var iccInfo = iccObj ? iccObj.iccInfo : null;
    var operator = network ? (network.shortName || network.longName) : null;

    if (operator && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
      if (iccInfo.isDisplayNetworkNameRequired && operator !== iccInfo.spn) {
        operator = operator + ' ' + iccInfo.spn;
      } else {
        operator = iccInfo.spn;
      }
    }

    var carrier, region;
    if (this.isBrazil(mobileConnection)) {
      // We are in Brazil, It is legally required to show local info
      // about current registered GSM network in a legally specified way.
      var lac = mobileConnection.voice.cell.gsmLocationAreaCode % 100;
      var carriers = MobileInfo.brazil.carriers;
      var regions = MobileInfo.brazil.regions;

      carrier = carriers[network.mnc] ||
                (this.BRAZIL_MCC + network.mnc);
      region = (regions[lac] ? regions[lac] + ' ' + lac : '');
    }

    return {
      'operator': operator,
      'carrier': carrier,
      'region': region
    };
  },

  isBrazil: function mo_isBrazil(mobileConnection) {
    var cell = mobileConnection.voice.cell;
    var net = mobileConnection.voice.network;
    return net ?
           (net.mcc === this.BRAZIL_MCC && cell && cell.gsmLocationAreaCode) :
           null;
  }
};
