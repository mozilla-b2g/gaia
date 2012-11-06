all: PhoneNumberMetaData.js

%.js: %.xml xml2meta.py
	python xml2meta.py $< > $@

PhoneNumberMetaData.xml:
	curl http://libphonenumber.googlecode.com/svn/trunk/resources/PhoneNumberMetaData.xml > $@

clean:
	rm -f PhoneNumberMetaData.xml *~
