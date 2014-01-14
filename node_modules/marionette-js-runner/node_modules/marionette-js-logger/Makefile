default: test

node_modules: package.json
	npm install

b2g: package.json
	./node_modules/marionette-host-environment/bin/marionette-host-environment $@

.PHONY: test
test: b2g
	./node_modules/.bin/marionette-mocha $(wildcard test/*.js)

.PHONY: ci
ci:
	nohup Xvfb :99 &
	DISPLAY=:99 make test
