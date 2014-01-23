default: test lint

.PHONY: test
test: node_modules
	./node_modules/.bin/mocha $(shell find test -name "*_test.js")

.PHONY: lint
lint:
	gjslint --recurse . \
		--disable "220,225,0211,0212,0217,0210" \
		--exclude_directories "examples,node_modules,b2g,api-design"

node_modules:
	npm install
