'use strict';

/* global MozActivity */

var vCardFile = 'BEGIN:VCARD\n';
    vCardFile += 'VERSION:4.0\n';
    vCardFile += 'N:Gump;Forrest;;;\n';
    vCardFile += 'FN:Forrest Gump\n';
    vCardFile += 'ORG:Bubba Gump Shrimp Co.\n';
    vCardFile += 'TITLE:Shrimp Man\n';
    vCardFile += 'TEL;TYPE=work,voice;VALUE=uri:tel:+1-111-555-1212\n';
    vCardFile += 'TEL;TYPE=home,voice;VALUE=uri:tel:+1-404-555-1212\n';
    vCardFile += 'ADR;TYPE=work;LABEL="100 Waters Edge\n';
    vCardFile += 'Baytown,LA 30314\n';
    vCardFile += 'United States of America"\n';
    vCardFile += '  :;;100 Waters Edge;Baytown;LA;30314;USA\n';
    vCardFile += 'ADR;TYPE=home;LABEL="42 Plantation St.\n';
    vCardFile += 'Baytown,LA 30314\n';
    vCardFile += 'United States of America"\n';
    vCardFile+='  :;;42 Plantation St.;Baytown;LA;30314;USA\n';
    vCardFile += 'EMAIL:forrestgump@example.com\n';
    vCardFile += 'REV:20080424T195243Z\n';
    vCardFile += 'END:VCARD\n';

var vCard = new Blob([vCardFile], {type: 'text/vcard'});

new MozActivity({
  name: 'open',
  data: {
    type: 'text/vcard',
    filename: 'vcard_4.vcf',
    blob: vCard
  }
});