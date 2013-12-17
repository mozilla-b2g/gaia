node_modules:
	npm install

.PHONY: test
test: node_modules
	./node_modules/.bin/mocha --reporter spec \
		test/consumer.js \
		test/acceptance/reporter.js \
		test/acceptance/consumer.js \
		test/reporter.js
