/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// navigator.mozContacts
(function(window) {
  var navigator = window.navigator;

  var contacts = [{
    id: 0,
    name: 'Andreas Gal',
    familyName: ['Gal'],
    givenName: ['Andreas'],
    tel: ['123-4242-4242'],
    email: ['gal@mozilla.com']
  },
  {
    id: 1,
    name: 'Coby Newman',
    familyName: ['Newman'],
    givenName: ['Coby'],
    tel: ['1-823-949-7735'],
    email: ['posuere.at@hendreritaarcu.com']
  },
  {
    id: 2,
    name: 'Caesar Velasquez',
    familyName: ['Velasquez'],
    givenName: ['Caesar'],
    tel: ['1-355-185-5419'],
    email: ['fames@Duis.org']
  },
  {
    id: 3,
    name: 'Hamilton Farrell',
    familyName: ['Farrell'],
    givenName: ['Hamilton'],
    tel: ['1-682-456-9186'],
    email: ['sem@Uttinciduntvehicula.com']
  },
  {
    id: 4,
    name: 'Emery Livingston',
    familyName: ['Livingston'],
    givenName: ['Emery'],
    tel: ['1-510-151-9801'],
    email: ['orci.luctus.et@massaInteger.com']
  },
  {
    id: 5,
    name: 'Griffith Heath',
    familyName: ['Heath'],
    givenName: ['Griffith'],
    tel: ['1-800-719-3201'],
    email: ['dapibus@Inlorem.ca']
  },
  {
    id: 6,
    name: 'Luke Stuart',
    familyName: ['Stuart'],
    givenName: ['Luke'],
    tel: ['1-120-910-1976'],
    email: ['congue@nibh.ca']
  },
  {
    id: 7,
    name: 'Brennan Love',
    familyName: ['Love'],
    givenName: ['Brennan'],
    tel: ['1-724-155-2807'],
    email: ['interdum.libero.dui@cursusvestibulum.edu']
  },
  {
    id: 8,
    name: 'Lamar Meadows',
    familyName: ['Meadows'],
    givenName: ['Lamar'],
    tel: ['1-976-164-8769'],
    email: ['tincidunt@non.com']
  },
  {
    id: 9,
    name: 'Erasmus Flynn',
    familyName: ['Flynn'],
    givenName: ['Erasmus'],
    tel: ['1-488-678-3487'],
    email: ['lorem.ut.aliquam@eu.ca']
  },
  {
    id: 10,
    name: 'Aladdin Ellison',
    familyName: ['Ellison'],
    givenName: ['Aladdin'],
    tel: ['1-977-743-6797'],
    email: ['sociosqu.ad@sollicitudin.org']
  },
  {
    id: 11,
    name: 'Valentine Rasmussen',
    familyName: ['Rasmussen'],
    givenName: ['Valentine'],
    tel: ['1-265-504-2025'],
    email: ['ultrices.iaculis@acsem.edu']
  },
  {
    id: 12,
    name: 'Deacon Murphy',
    familyName: ['Murphy'],
    givenName: ['Deacon'],
    tel: ['1-770-450-1221'],
    email: ['varius@erat.edu']
  },
  {
    id: 13,
    name: 'Paul Kennedy',
    familyName: ['Kennedy'],
    givenName: ['Paul'],
    tel: ['1-689-891-3529'],
    email: ['ac.arcu@vitae.edu']
  },
  {
    id: 14,
    name: 'Aaron Chase',
    familyName: ['Chase'],
    givenName: ['Aaron'],
    tel: ['1-451-574-7937'],
    email: ['tempor.bibendum.Donec@pharetraQuisque.edu']
  },
  {
    id: 15,
    name: 'Geoffrey Dunn',
    familyName: ['Dunn'],
    givenName: ['Geoffrey'],
    tel: ['1-924-387-2395'],
    email: ['a.malesuada@tellusPhasellus.com']
  },
  {
    id: 16,
    name: 'Ashton Russo',
    familyName: ['Russo'],
    givenName: ['Ashton'],
    tel: ['1-182-776-5600'],
    email: ['Aliquam.vulputate.ullamcorper@faucibusorci.edu']
  },
  {
    id: 17,
    name: 'Owen Noble',
    familyName: ['Noble'],
    givenName: ['Owen'],
    tel: ['1-463-693-1336'],
    email: ['et@vulputateveliteu.ca']
  },
  {
    id: 18,
    name: 'Kamal Blake',
    familyName: ['Blake'],
    givenName: ['Kamal'],
    tel: ['1-636-197-1985'],
    email: ['tempor@malesuada.edu']
  },
  {
    id: 19,
    name: 'Tyrone Delaney',
    familyName: ['Delaney'],
    givenName: ['Tyrone'],
    tel: ['1-886-920-6283'],
    email: ['est@aliquetsemut.com']
  },
  {
    id: 20,
    name: 'Ciaran Sellers',
    familyName: ['Sellers'],
    givenName: ['Ciaran'],
    tel: ['1-315-414-0323'],
    email: ['Etiam@Nulla.com']
  },
  {
    id: 21,
    name: 'Bernard Alford',
    familyName: ['Alford'],
    givenName: ['Bernard'],
    tel: ['1-430-958-2651'],
    email: ['elementum.lorem.ut@sociisnatoque.edu']
  },
  {
    id: 22,
    name: 'Kamal Cote',
    familyName: ['Cote'],
    givenName: ['Kamal'],
    tel: ['1-666-609-9141'],
    email: ['eleifend.egestas@cursus.edu']
  },
  {
    id: 23,
    name: 'Lucius Mckee',
    familyName: ['Mckee'],
    givenName: ['Lucius'],
    tel: ['1-224-590-6780'],
    email: ['Fusce.dolor@tellusnon.org']
  },
  {
    id: 24,
    name: 'Dale Coleman',
    familyName: ['Coleman'],
    givenName: ['Dale'],
    tel: ['1-320-245-3036'],
    email: ['dapibus.rutrum@ametlorem.org']
  },
  {
    id: 25,
    name: 'Kermit Nguyen',
    familyName: ['Nguyen'],
    givenName: ['Kermit'],
    tel: ['1-247-825-8563'],
    email: ['per@risusMorbi.org']
  },
  {
    id: 26,
    name: 'Timon Horton',
    familyName: ['Horton'],
    givenName: ['Timon'],
    tel: ['1-739-233-8981'],
    email: ['Etiam@nonummyultriciesornare.ca']
  },
  {
    id: 27,
    name: 'Dale Lamb',
    familyName: ['Lamb'],
    givenName: ['Dale'],
    tel: ['1-640-507-8295'],
    email: ['dapibus.id@pedeac.edu']
  },
  {
    id: 28,
    name: 'Owen Acevedo',
    familyName: ['Acevedo'],
    givenName: ['Owen'],
    tel: ['1-403-201-3170'],
    email: ['porttitor.tellus.non@dolorFusce.edu']
  },
  {
    id: 29,
    name: 'Richard Mckee',
    familyName: ['Mckee'],
    givenName: ['Richard'],
    tel: ['1-783-513-0684'],
    email: ['senectus.et.netus@Vestibulum.com']
  },
  {
    id: 30,
    name: 'Elijah Bass',
    familyName: ['Bass'],
    givenName: ['Elijah'],
    tel: ['1-632-950-0553'],
    email: ['erat@sapien.com']
  },
  {
    id: 31,
    name: 'Barrett Wells',
    familyName: ['Wells'],
    givenName: ['Barrett'],
    tel: ['1-112-180-5617'],
    email: ['interdum.ligula@varius.edu']
  },
  {
    id: 32,
    name: 'Herman Meyer',
    familyName: ['Meyer'],
    givenName: ['Herman'],
    tel: ['1-296-252-5507'],
    email: ['urna@vitaealiquameros.org']
  },
  {
    id: 33,
    name: 'Ashton Hinton',
    familyName: ['Hinton'],
    givenName: ['Ashton'],
    tel: ['1-695-256-8929'],
    email: ['lorem@mattisornare.org']
  },
  {
    id: 34,
    name: 'Harrison Marsh',
    familyName: ['Marsh'],
    givenName: ['Harrison'],
    tel: ['1-897-458-1730'],
    email: ['pharetra.felis.eget@auctor.com']
  },
  {
    id: 35,
    name: 'Benedict Santana',
    familyName: ['Santana'],
    givenName: ['Benedict'],
    tel: ['1-565-457-4828'],
    email: ['amet.metus.Aliquam@Maecenas.org']
  },
  {
    id: 36,
    name: 'David Church',
    familyName: ['Church'],
    givenName: ['David'],
    tel: ['1-179-353-3314'],
    email: ['Nullam.enim@Utsagittis.edu']
  },
  {
    id: 37,
    name: 'Colt Wolfe',
    familyName: ['Wolfe'],
    givenName: ['Colt'],
    tel: ['1-587-970-8581'],
    email: ['hendrerit.Donec.porttitor@tinciduntaliquam.org']
  },
  {
    id: 38,
    name: 'Carlos Bishop',
    familyName: ['Bishop'],
    givenName: ['Carlos'],
    tel: ['1-963-305-6702'],
    email: ['Nam@cursusNunc.org']
  },
  {
    id: 39,
    name: 'Dominic Ware',
    familyName: ['Ware'],
    givenName: ['Dominic'],
    tel: ['1-609-458-5449'],
    email: ['Fusce.aliquet@Etiam.ca']
  },
  {
    id: 40,
    name: 'Phillip Whitley',
    familyName: ['Whitley'],
    givenName: ['Phillip'],
    tel: ['1-284-955-1766'],
    email: ['per.inceptos.hymenaeos@nequesedsem.ca']
  },
  {
    id: 41,
    name: 'Valentine Sargent',
    familyName: ['Sargent'],
    givenName: ['Valentine'],
    tel: ['1-346-890-6417'],
    email: ['nec@dolorFusce.com']
  },
  {
    id: 42,
    name: 'Gabriel Huber',
    familyName: ['Huber'],
    givenName: ['Gabriel'],
    tel: ['1-399-465-0589'],
    email: ['pretium.neque@nislsemconsequat.ca']
  },
  {
    id: 43,
    name: 'George Tyler',
    familyName: ['Tyler'],
    givenName: ['George'],
    tel: ['1-739-571-2737'],
    email: ['blandit.viverra.Donec@dictum.ca']
  },
  {
    id: 44,
    name: 'Asher Carey',
    familyName: ['Carey'],
    givenName: ['Asher'],
    tel: ['1-477-425-4723'],
    email: ['torquent.per.conubia@blanditNamnulla.edu']
  },
  {
    id: 45,
    name: 'Anthony Solomon',
    familyName: ['Solomon'],
    givenName: ['Anthony'],
    tel: ['1-570-753-4296'],
    email: ['risus.Nunc@hendreritconsectetuercursus.com']
  },
  {
    id: 46,
    name: 'Griffith Fuller',
    familyName: ['Fuller'],
    givenName: ['Griffith'],
    tel: ['1-779-242-5342'],
    email: ['Suspendisse@aliquam.ca']
  },
  {
    id: 47,
    name: 'Beau Brewer',
    familyName: ['Brewer'],
    givenName: ['Beau'],
    tel: ['1-664-184-7334'],
    email: ['magna.tellus.faucibus@ultricesposuerecubilia.com']
  },
  {
    id: 48,
    name: 'Jordan Campbell',
    familyName: ['Campbell'],
    givenName: ['Jordan'],
    tel: ['1-593-938-2525'],
    email: ['Curae;.Phasellus@Morbiquis.ca']
  },
  {
    id: 49,
    name: 'Cyrus Cabrera',
    familyName: ['Cabrera'],
    givenName: ['Cyrus'],
    tel: ['1-915-748-1349'],
    email: ['lorem.tristique@acmetus.edu']
  },
  {
    id: 50,
    name: 'Hamilton Boone',
    familyName: ['Boone'],
    givenName: ['Hamilton'],
    tel: ['1-278-421-9845'],
    email: ['non.sapien@quamdignissimpharetra.edu']
  },
  {
    id: 51,
    name: 'Wallace Donovan',
    familyName: ['Donovan'],
    givenName: ['Wallace'],
    tel: ['1-940-175-9334'],
    email: ['justo@lacusMaurisnon.org']
  },
  {
    id: 52,
    name: 'Kirk Buckley',
    familyName: ['Buckley'],
    givenName: ['Kirk'],
    tel: ['1-283-177-6304'],
    email: ['Cras@Morbinon.edu']
  },
  {
    id: 53,
    name: 'Simon Hall',
    familyName: ['Hall'],
    givenName: ['Simon'],
    tel: ['1-269-202-5174'],
    email: ['mus.Proin@dolor.org']
  },
  {
    id: 54,
    name: 'Trevor Rush',
    familyName: ['Rush'],
    givenName: ['Trevor'],
    tel: ['1-865-595-9074'],
    email: ['Fusce@Donec.edu']
  },
  {
    id: 55,
    name: 'Todd Mccormick',
    familyName: ['Mccormick'],
    givenName: ['Todd'],
    tel: ['1-398-916-3514'],
    email: ['at@ornareelit.org']
  },
  {
    id: 56,
    name: 'Yuli Gay',
    familyName: ['Gay'],
    givenName: ['Yuli'],
    tel: ['1-198-196-4256'],
    email: ['Sed.congue.elit@Inornare.edu']
  },
  {
    id: 57,
    name: 'Joseph Frazier',
    familyName: ['Frazier'],
    givenName: ['Joseph'],
    tel: ['1-969-410-7180'],
    email: ['faucibus.ut.nulla@massa.org']
  },
  {
    id: 58,
    name: 'Ali Chase',
    familyName: ['Chase'],
    givenName: ['Ali'],
    tel: ['1-598-924-6112'],
    email: ['eu.elit@necanteMaecenas.edu']
  },
  {
    id: 59,
    name: 'Guy Simpson',
    familyName: ['Simpson'],
    givenName: ['Guy'],
    tel: ['1-558-377-3714'],
    email: ['in@mauriselit.edu']
  },
  {
    id: 60,
    name: 'Ivan Wynn',
    familyName: ['Wynn'],
    givenName: ['Ivan'],
    tel: ['1-274-885-0477'],
    email: ['lobortis.quis@Sed.com']
  },
  {
    id: 61,
    name: 'Preston Carpenter',
    familyName: ['Carpenter'],
    givenName: ['Preston'],
    tel: ['1-758-120-5270'],
    email: ['elit.Curabitur@vehiculaaliquet.edu']
  },
  {
    id: 62,
    name: 'Demetrius Santos',
    familyName: ['Santos'],
    givenName: ['Demetrius'],
    tel: ['1-913-961-7009'],
    email: ['id@magnaPhasellusdolor.com']
  },
  {
    id: 63,
    name: 'Dale Franklin',
    familyName: ['Franklin'],
    givenName: ['Dale'],
    tel: ['1-443-971-0116'],
    email: ['velit.Pellentesque@IntegerurnaVivamus.com']
  },
  {
    id: 64,
    name: 'Abraham Randolph',
    familyName: ['Randolph'],
    givenName: ['Abraham'],
    tel: ['1-368-169-0957'],
    email: ['egestas@maurisidsapien.com']
  },
  {
    id: 65,
    name: 'Hu Avila',
    familyName: ['Avila'],
    givenName: ['Hu'],
    tel: ['1-311-333-8877'],
    email: ['metus@adipiscinglacusUt.com']
  },
  {
    id: 66,
    name: 'Garth Trujillo',
    familyName: ['Trujillo'],
    givenName: ['Garth'],
    tel: ['1-409-494-1231'],
    email: ['commodo.hendrerit.Donec@etnunc.ca']
  },
  {
    id: 67,
    name: 'Quamar Buchanan',
    familyName: ['Buchanan'],
    givenName: ['Quamar'],
    tel: ['1-114-992-7225'],
    email: ['tellus@consequatpurusMaecenas.ca']
  },
  {
    id: 68,
    name: 'Ulysses Bishop',
    familyName: ['Bishop'],
    givenName: ['Ulysses'],
    tel: ['1-485-518-5941'],
    email: ['fermentum.fermentum.arcu@amalesuadaid.com']
  },
  {
    id: 69,
    name: 'Avram Knapp',
    familyName: ['Knapp'],
    givenName: ['Avram'],
    tel: ['1-307-139-5554'],
    email: ['est.ac.mattis@ultricesmauris.ca']
  },
  {
    id: 70,
    name: 'Conan Grant',
    familyName: ['Grant'],
    givenName: ['Conan'],
    tel: ['1-331-936-0280'],
    email: ['turpis@odio.com']
  },
  {
    id: 71,
    name: 'Chester Kemp',
    familyName: ['Kemp'],
    givenName: ['Chester'],
    tel: ['1-554-119-4848'],
    email: ['Aenean.gravida.nunc@eu.org']
  },
  {
    id: 72,
    name: 'Hedley Dudley',
    familyName: ['Dudley'],
    givenName: ['Hedley'],
    tel: ['1-578-607-6287'],
    email: ['Nunc@dignissimtemporarcu.ca']
  },
  {
    id: 73,
    name: 'Jermaine Avila',
    familyName: ['Avila'],
    givenName: ['Jermaine'],
    tel: ['1-860-455-2283'],
    email: ['accumsan@ametdapibusid.ca']
  },
  {
    id: 74,
    name: 'Kamal Hamilton',
    familyName: ['Hamilton'],
    givenName: ['Kamal'],
    tel: ['1-650-389-0920'],
    email: ['Fusce.dolor@nuncsed.ca']
  },
  {
    id: 75,
    name: 'Castor Maxwell',
    familyName: ['Maxwell'],
    givenName: ['Castor'],
    tel: ['1-260-489-7135'],
    email: ['diam.lorem@a.ca']
  },
  {
    id: 76,
    name: 'Lyle Burris',
    familyName: ['Burris'],
    givenName: ['Lyle'],
    tel: ['1-250-343-2038'],
    email: ['eget.lacus@tempordiamdictum.com']
  },
  {
    id: 77,
    name: 'Merrill Dalton',
    familyName: ['Dalton'],
    givenName: ['Merrill'],
    tel: ['1-851-675-1381'],
    email: ['eu.tempor@blanditmattisCras.edu']
  },
  {
    id: 78,
    name: 'Ezekiel Medina',
    familyName: ['Medina'],
    givenName: ['Ezekiel'],
    tel: ['1-389-582-3443'],
    email: ['lectus.sit@interdum.ca']
  },
  {
    id: 79,
    name: 'Len Tran',
    familyName: ['Tran'],
    givenName: ['Len'],
    tel: ['1-434-573-6114'],
    email: ['turpis.Aliquam.adipiscing@montesnasceturridiculus.com']
  },
  {
    id: 80,
    name: 'Len Dominguez',
    familyName: ['Dominguez'],
    givenName: ['Len'],
    tel: ['1-144-489-7487'],
    email: ['augue@Innec.ca']
  },
  {
    id: 81,
    name: 'Paul Lane',
    familyName: ['Lane'],
    givenName: ['Paul'],
    tel: ['1-448-169-4312'],
    email: ['lectus.Cum.sociis@dolornonummyac.org']
  },
  {
    id: 82,
    name: 'Eric Horne',
    familyName: ['Horne'],
    givenName: ['Eric'],
    tel: ['1-124-862-6890'],
    email: ['commodo.tincidunt.nibh@eleifendnuncrisus.com']
  },
  {
    id: 83,
    name: 'Elton Ellis',
    familyName: ['Ellis'],
    givenName: ['Elton'],
    tel: ['1-492-834-0019'],
    email: ['lorem.eu.metus@felis.ca']
  },
  {
    id: 84,
    name: 'Jameson Snyder',
    familyName: ['Snyder'],
    givenName: ['Jameson'],
    tel: ['1-811-590-5893'],
    email: ['fermentum@Nuncmaurissapien.org']
  },
  {
    id: 85,
    name: 'Micah Shelton',
    familyName: ['Shelton'],
    givenName: ['Micah'],
    tel: ['1-402-504-4026'],
    email: ['Nunc.mauris@malesuada.ca']
  },
  {
    id: 86,
    name: 'Evan Lester',
    familyName: ['Lester'],
    givenName: ['Evan'],
    tel: ['1-535-915-3570'],
    email: ['libero@adipiscingfringillaporttitor.org']
  },
  {
    id: 87,
    name: 'Reuben Dalton',
    familyName: ['Dalton'],
    givenName: ['Reuben'],
    tel: ['1-296-598-2504'],
    email: ['tincidunt.vehicula.risus@Craseutellus.com']
  },
  {
    id: 88,
    name: 'Beau Baird',
    familyName: ['Baird'],
    givenName: ['Beau'],
    tel: ['1-525-882-9957'],
    email: ['urna.suscipit.nonummy@facilisisvitae.com']
  },
  {
    id: 89,
    name: 'Hedley Olsen',
    familyName: ['Olsen'],
    givenName: ['Hedley'],
    tel: ['1-945-295-5863'],
    email: ['vulputate.ullamcorper@Vivamusnisi.org']
  },
  {
    id: 90,
    name: 'Oliver Todd',
    familyName: ['Todd'],
    givenName: ['Oliver'],
    tel: ['1-551-447-1296'],
    email: ['Donec.egestas@rutrum.edu']
  },
  {
    id: 91,
    name: 'Keegan Mayo',
    familyName: ['Mayo'],
    givenName: ['Keegan'],
    tel: ['1-351-848-2796'],
    email: ['ridiculus@Nuncsed.ca']
  },
  {
    id: 92,
    name: 'Wang Cote',
    familyName: ['Cote'],
    givenName: ['Wang'],
    tel: ['1-439-568-2013'],
    email: ['Morbi@tinciduntduiaugue.org']
  },
  {
    id: 93,
    name: 'Hyatt Rowe',
    familyName: ['Rowe'],
    givenName: ['Hyatt'],
    tel: ['1-596-765-3807'],
    email: ['eu.erat.semper@enimnonnisi.com']
  },
  {
    id: 94,
    name: 'Cade Wyatt',
    familyName: ['Wyatt'],
    givenName: ['Cade'],
    tel: ['1-988-289-5924'],
    email: ['erat.nonummy@sedpedeCum.com']
  },
  {
    id: 95,
    name: 'Stephen Vincent',
    familyName: ['Vincent'],
    givenName: ['Stephen'],
    tel: ['1-954-435-1259'],
    email: ['nec.euismod@ultricies.ca']
  },
  {
    id: 96,
    name: 'Tobias Cherry',
    familyName: ['Cherry'],
    givenName: ['Tobias'],
    tel: ['1-270-763-1111'],
    email: ['Nulla.aliquet@sit.com']
  },
  {
    id: 97,
    name: 'Keane Trevino',
    familyName: ['Trevino'],
    givenName: ['Keane'],
    tel: ['1-794-929-8599'],
    email: ['sem.semper.erat@Aliquamnecenim.edu']
  },
  {
    id: 98,
    name: 'Kennedy Cooley',
    familyName: ['Cooley'],
    givenName: ['Kennedy'],
    tel: ['1-725-946-1901'],
    email: ['urna.justo@Duismienim.edu']
  },
  {
    id: 99,
    name: 'Lucian Pope',
    familyName: ['Pope'],
    givenName: ['Lucian'],
    tel: ['1-186-946-8356'],
    email: ['justo.Proin@dis.com']
  },
  {
    id: 100,
    name: 'Hu Combs',
    familyName: ['Combs'],
    givenName: ['Hu'],
    tel: ['1-398-488-5222'],
    email: ['faucibus.lectus@nuncsedpede.com']
  }];

  if (('mozContacts' in navigator) && (navigator.mozContacts != null))
    return;

  navigator.mozContacts = {
    find: function fakeContactFind() {
      var request = {result: [].concat(contacts)};
      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, 0);

      return request;
    },

    save: function fakeContactSave() {
      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
      }, 0);

      return request;
    }
  };

  if (!('mozContact' in window)) {
    window.mozContact = function() {
      return {
        id: 'undefined',
        givenName: '',
        familyName: '',
        tel: [''],
        email: [''],
        init: function() {}
      };
    };
  }
})(this);

// navigator.mozTelephony
(function(window) {
  var navigator = window.navigator;
  if ('mozTelephony' in navigator)
    return;

  var TelephonyCalls = [];

  navigator.mozTelephony = {
    dial: function(number) {
      var TelephonyCall = {
        number: number,
        state: 'dialing',
        addEventListener: function() {},
        hangUp: function() {},
        removeEventListener: function() {}
      };

      TelephonyCalls.push(TelephonyCall);

      return TelephonyCall;
    },
    addEventListener: function(name, handler) {
    },
    get calls() {
      return TelephonyCalls;
    },
    muted: false,
    speakerEnabled: false,

    // Stubs
    onincoming: null,
    oncallschanged: null
  };
})(this);

// Register a handler to automatically update apps when the app cache
// changes.
(function(window) {
  if (!window.applicationCache)
    return;

  window.applicationCache.addEventListener('updateready', function(evt) {
      if (!navigator.mozNotification)
        return;

      // Figure out what our name is and where we come from
      navigator.mozApps.getSelf().onsuccess = function(e) {
        var app = e.target.result;
        var name = app.manifest.name;
        var origin = app.origin;

        // FIXME Localize this message:
        var notification = navigator.mozNotification.createNotification(
                   'Update Available',
                   'A new version of ' + name + ' is available');

        notification.onclick = function(event) {

          // If we're still running when the user taps on the notification
          // then ask if they want to reload now
          // FIXME: uncomment and localize when confirm() dialogs work
          /* if (confirm('Update ' + name + ' from ' + origin + ' now?')) */
          window.location.reload();
        };

        notification.show();
      }
  });
})(this);

// Emulate device buttons. This is groteskly unsafe and should be removed
// soon.
(function(window) {
  var supportedEvents = { keydown: true, keyup: true };
  var listeners = [];

  var originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, capture) {
    if (this === window && supportedEvents[type]) {
      listeners.push({ type: type, listener: listener, capture: capture });
    }
    originalAddEventListener.call(this, type, listener, capture);
  };

  var originalRemoveEventListener = window.removeEventListener;
  window.removeEventListener = function(type, listener) {
    if (this === window && supportedEvents[type]) {
      var newListeners = [];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type && listeners[n].listener == listener)
          continue;
        newListeners.push(listeners[n]);
      }
      listeners = newListeners;
    }
    originalRemoveEventListener.call(this, type, listener);
  }

  var KeyEventProto = {
    DOM_VK_HOME: 36
  };

  window.addEventListener('message', function(event) {
    var data = event.data;
    if (typeof data === 'string' && data.indexOf('moz-key-') == 0) {
      var type, key;
      if (data.indexOf('moz-key-down-') == 0) {
        type = 'keydown';
        key = data.substr(13);
      } else if (data.indexOf('moz-key-up-') == 0) {
        type = 'keyup';
        key = data.substr(11);
      } else {
        return;
      }
      key = KeyEvent[key];
      for (var n = 0; n < listeners.length; ++n) {
        if (listeners[n].type == type) {
          var fn = listeners[n].listener;
          var e = Object.create(KeyEventProto);
          e.type = type;
          e.keyCode = key;
          if (typeof fn === 'function')
            fn(e);
          else if (typeof fn === 'object' && fn.handleEvent)
            fn.handleEvent(e);
          if (listeners[n].capture)
            return;
        }
      }
    }
  });
})(this);

// navigator.mozWifiManager
(function(window) {
  var navigator = window.navigator;

  try {
    if ('mozWifiManager' in navigator)
      return;
  } catch (e) {
    //Bug 739234 - state[0] is undefined when initializing DOMWifiManager
    dump(e);
  }

  /** fake network list, where each network object looks like:
    * {
    *   ssid         : SSID string (human-readable name)
    *   bssid        : network identifier string
    *   capabilities : array of strings (supported authentication methods)
    *   signal       : 0-100 signal level (integer)
    *   connected    : boolean state
    * }
    */
  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      signal: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      signal: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      signal: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      signal: 89,
      connected: false
    }
  };

  navigator.mozWifiManager = {
    // true if the wifi is enabled
    enabled: false,

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 0);

      self.enabled = bool;
      return request;
    },

    // returns a list of visible networks
    getNetworks: function() {
      var request = { result: fakeNetworks };

      setTimeout(function() {
        if (request.onsuccess)
          request.onsuccess();
      }, 2000);

      return request;
    },

    // selects a network
    select: function(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function() {
        if (connection.onsuccess)
          connection.onsuccess();
      }, 0);

      setTimeout(function() {
        if (self.onassociate)
          self.onassociate(networkEvent);
      }, 1000);

      setTimeout(function() {
        self.connected = network;
        network.connected = true;
        if (self.onconnect)
          self.onconnect(networkEvent);
      }, 2000);

      return connection;
    },

    // returns a network object for the currently connected network (if any)
    connected: null
  };
})(this);

// document.mozL10n
(function(window) {
  var gL10nData = {};
  var gTextData = '';
  var gLanguage = '';

  // parser

  function evalString(text) {
    return text.replace(/\\\\/g, '\\')
               .replace(/\\n/g, '\n')
               .replace(/\\r/g, '\r')
               .replace(/\\t/g, '\t')
               .replace(/\\b/g, '\b')
               .replace(/\\f/g, '\f')
               .replace(/\\{/g, '{')
               .replace(/\\}/g, '}')
               .replace(/\\"/g, '"')
               .replace(/\\'/g, "'");
  }

  function parseProperties(text, lang) {
    var reBlank = /^\s*|\s*$/;
    var reComment = /^\s*#|^\s*$/;
    var reSection = /^\s*\[(.*)\]\s*$/;
    var reImport = /^\s*@import\s+url\((.*)\)\s*$/i;

    // parse the *.properties file into an associative array
    var currentLang = '*';
    var supportedLang = [];
    var skipLang = false;
    var data = [];
    var match = '';
    var entries = text.replace(reBlank, '').split(/[\r\n]+/);
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i];

      // comment or blank line?
      if (reComment.test(line))
        continue;

      // section start?
      if (reSection.test(line)) {
        match = reSection.exec(line);
        currentLang = match[1];
        skipLang = (currentLang != lang) && (currentLang != '*');
        continue;
      } else if (skipLang) {
        continue;
      }

      // @import rule?
      if (reImport.test(line)) {
        match = reImport.exec(line);
      }

      // key-value pair
      var tmp = line.split('=');
      if (tmp.length > 1)
        data[tmp[0]] = evalString(tmp[1]);
    }

    // find the attribute descriptions, if any
    for (var key in data) {
      var id, prop, index = key.lastIndexOf('.');
      if (index > 0) { // attribute
        id = key.substring(0, index);
        prop = key.substr(index + 1);
      } else { // textContent, could be innerHTML as well
        id = key;
        prop = 'textContent';
      }
      if (!gL10nData[id])
        gL10nData[id] = {};
      gL10nData[id][prop] = data[key];
    }
  }

  function parse(text, lang) {
    gTextData += text;
    // we only support *.properties files at the moment
    return parseProperties(text, lang);
  }

  // load and parse the specified resource file
  function loadResource(href, lang, onSuccess, onFailure) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', href, true);
    xhr.overrideMimeType('text/plain; charset=utf-8');
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200 || xhr.status == 0) {
          parse(xhr.responseText, lang);
          if (onSuccess)
            onSuccess();
        } else {
          if (onFailure)
            onFailure();
        }
      }
    };
    xhr.send(null);
  }

  // load and parse all resources for the specified locale
  function loadLocale(lang, callback) {
    clear();

    // check all <link type="application/l10n" href="..." /> nodes
    // and load the resource files
    var langLinks = document.querySelectorAll('link[type="application/l10n"]');
    var langCount = langLinks.length;

    // start the callback when all resources are loaded
    var onResourceLoaded = null;
    var gResourceCount = 0;
    onResourceLoaded = function() {
      gResourceCount++;
      if (gResourceCount >= langCount) {
        // execute the [optional] callback
        if (callback)
          callback();
        // fire a 'localized' DOM event
        var evtObject = document.createEvent('Event');
        evtObject.initEvent('localized', false, false);
        evtObject.language = lang;
        window.dispatchEvent(evtObject);
      }
    }

    // load all resource files
    function l10nResourceLink(link) {
      var href = link.href;
      var type = link.type;
      this.load = function(lang, callback) {
        var applied = lang;
        loadResource(href, lang, callback, function() {
          console.warn(href + ' not found.');
          applied = '';
        });
        return applied; // return lang if found, an empty string if not found
      };
    }

    gLanguage = lang;
    for (var i = 0; i < langCount; i++) {
      var resource = new l10nResourceLink(langLinks[i]);
      var rv = resource.load(lang, onResourceLoaded);
      if (rv != lang) // lang not found, used default resource instead
        gLanguage = '';
    }
  }

  // fetch an l10n object, warn if not found
  function getL10nData(key) {
    var data = gL10nData[key];
    if (!data)
      console.warn('[l10n] #' + key + ' missing for [' + gLanguage + ']');
    return data;
  }

  // replace {{arguments}} with their values
  function substArguments(str, args) {
    var reArgs = /\{\{\s*([a-zA-Z\.]+)\s*\}\}/;
    var match = reArgs.exec(str);
    while (match) {
      if (!match || match.length < 2)
        return str; // argument key not found

      var arg = match[1];
      var sub = '';
      if (arg in args) {
        sub = args[arg];
      } else if (arg in gL10nData) {
        sub = gL10nData[arg].textContent;
      } else {
        console.warn('[l10n] could not find argument {{' + arg + '}}');
        return str;
      }

      str = str.substring(0, match.index) + sub +
            str.substr(match.index + match[0].length);
      match = reArgs.exec(str);
    }
    return str;
  }

  // translate a string
  function translateString(key, args) {
    var data = getL10nData(key);
    if (!data)
      return '{{' + key + '}}';
    return substArguments(data.textContent, args);
  }

  // translate an HTML element
  function translateElement(element) {
    if (!element || !element.dataset)
      return;

    // get the related l10n object
    var key = element.dataset.l10nId;
    var data = getL10nData(key);
    if (!data)
      return;

    // get arguments (if any)
    // TODO: more flexible parser?
    var args;
    if (element.dataset.l10nArgs) try {
      args = JSON.parse(element.dataset.l10nArgs);
    } catch (e) {
      console.warn('[l10n] could not parse arguments for #' + key + '');
    }

    // translate element
    // TODO: security check?
    for (var k in data)
      element[k] = substArguments(data[k], args);
  }

  // translate an HTML subtree
  function translateFragment(element) {
    element = element || document.querySelector('html');

    // check all translatable children (= w/ a `data-l10n-id' attribute)
    var children = element.querySelectorAll('*[data-l10n-id]');
    var elementCount = children.length;
    for (var i = 0; i < elementCount; i++)
      translateElement(children[i]);

    // translate element itself if necessary
    if (element.dataset.l10nId)
      translateElement(element);
  }

  // clear all l10n data
  function clear() {
    gL10nData = {};
    gTextData = '';
    gLanguage = '';
  }

  // load the default locale on startup
  window.addEventListener('DOMContentLoaded', function() {
    var lang = navigator.language;
    if (navigator.mozSettings) {
      var req = navigator.mozSettings.getLock().get('language.current');
      req.onsuccess = function() {
        loadLocale(req.result['language.current'] || lang, translateFragment);
      };
      req.onerror = function() {
        loadLocale(lang, translateFragment);
      };
    } else {
      loadLocale(lang, translateFragment);
    }
  });

  // Public API
  document.mozL10n = {
    // get a localized string
    get: translateString,

    // get|set the document language and direction
    get language() {
      return {
        // get|set the document language (ISO-639-1)
        get code() { return gLanguage; },
        set code(lang) { loadLocale(lang, translateFragment); },

        // get the direction (ltr|rtl) of the current language
        get direction() {
          // http://www.w3.org/International/questions/qa-scripts
          // Arabic, Hebrew, Farsi, Pashto, Urdu
          var rtlList = ['ar', 'he', 'fa', 'ps', 'ur'];
          return (rtlList.indexOf(gLanguage) >= 0) ? 'rtl' : 'ltr';
        }
      };
    }
  };
})(this);

