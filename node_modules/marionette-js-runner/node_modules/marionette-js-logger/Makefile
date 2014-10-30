default: test

node_modules: package.json
	npm install

b2g: node_modules
	./node_modules/.bin/mozilla-download \
		--product b2g \
		--channel prerelease \
		--branch mozilla-central \
		$@

.PHONY: test
test: b2g
	./node_modules/.bin/marionette-mocha $(wildcard test/*.js)
