/*globals QUnit:true, test:true, asyncTest:true, start:true, expect:true, ok:true, deepEqual:true, equal:true */
(function(globals) {
	"use strict";

	var idCount = 0,
		postCount = 0,
		putCount = {},
		deleteCount = {},
		Person;

	$.ajax = function(options) {
		var deferred = $.Deferred(),
			id;

		if (options.url.substring(0, 7) === '/person') {
			if (options.type === 'POST') {
				options.data.id = ++idCount;
				postCount += 1;
				
				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'PUT') {
				id = options.url.substr(8);

				if (_.isUndefined(putCount[id])) {
					putCount['' + id] = 0;
				}
				putCount['' + id] += 1;

				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'DELETE') {
				id = options.url.substr(8);

				if (_.isUndefined(deleteCount[id])) {
					deleteCount['' + id] = 0;
				}
				deleteCount['' + id] += 1;

				_.defer(function() {
					deferred.resolve(options.data);
				});
			} else if (options.type === 'GET') {
				id = options.url.substr(8);
				_.defer(function() {
					deferred.resolve({
						first: 'John' + id,
						last: 'Doe' + id
					});
				});
			}
		}

		return deferred;
	};

	module('tko.app');
	test('initialization', function() {
		var app = new tko.App(function() {
			var self = this;
			
			ok(true, 'the application init function is called');

			self.test1 = ko.observable('foo');
		});

		$(function() {
			equal($('#test1').text(), 'foo', 'bindings applied');
		});
	});

	asyncTest('notifications', function() {
		var app = new tko.App(function() {
			var self = this;

			self.foo = function(x) {
				self.notify('info', x);
			};

			self.bar = function(x) {
				self.notify('success', x, 3000);
			};
		});

		app.foo('foo');
		equal(app.notifications.info(), 'foo', 'notification without timeout');
		app.foo('bar');
		equal(app.notifications.info(), 'bar', 'notification without timeout');

		app.bar('test');
		equal(app.notifications.success(), 'test', 'notification with timeout');
		setTimeout(function() {
			equal(app.notifications.success(), null, 'notification after timeout');
			start();
		}, 3500);
	});

	test('settings', function() {
		var app = new tko.App(function() {
			var self = this;

			self.saveSetting('foo', 'bar');
			equal(self.retrieveSetting('foo'), 'bar', 'retrieve saved setting');

			self.saveSetting('foo', 'baz');
			equal(self.retrieveSetting('foo'), 'baz', 'overwrite saved setting');
		});
	});

	asyncTest('pub/sub', function() {
		var fooCount = 0,
			sub,
			app;
	
		app = new tko.App(function() {
			var self = this,
				initSub;

			sub = self.subscribe('foo', function() {
				fooCount += 1;
				equal(fooCount, 1, 'subscription received');
			});
			self.publish('foo');

			self.unsubscribe('foo', sub);
			self.publish('foo');
			setTimeout(function() {
				equal(fooCount, 1, 'unsubscribe works');
				start();
			}, 2000);

			self.subscribe('bar', function(msg) {
				equal(msg.foo, 'baz', 'subscription receives messages');
			});
			self.publish('bar', {foo: 'baz'});

			initSub = self.subscribe('app.initialized', function() {
				ok(true, 'initialized message received');
				self.unsubscribe('app.initialized', initSub);
			});
		});

		sub = app.subscribe('app.initialized', function() {
			ok(true, 'initialized message delivered after the fact');
			app.unsubscribe('app.initialized', sub);
		});
	});

	asyncTest('routing', function() {
		var app = new tko.App(function() {
			var self = this;

			self.vm1 = {
				visible: ko.observable(false)
			};
			self.vm2 = {
				visible: ko.observable(false)
			};
			self.page('hello', self.vm1);
			self.page('world', self.vm2);

			self.route('foo', function() {
				ok(true, 'basic route works');
			});

			self.route('bar/:baz', function(baz) {
				ok(true, 'route with param works');
				equal(baz, 'baz', 'route with param has correct param value');
				start();
				self.navigate('');
			});
		});

		app.navigate('hello');
		setTimeout(function() {
			ok(app.vm1.visible(), 'correct page is visible');
			ok(!app.vm2.visible(), 'other pages are not visible');

			app.navigate('world');
			setTimeout(function() {
				ok(app.vm2.visible(), 'correct page is visible');
				ok(!app.vm1.visible(), 'other pages are not visible');

				setTimeout(function() {
					app.navigate('foo');
					app.navigate('bar/baz');
				}, 250);
			}, 250);
		}, 250);
	});

	module('tko.Model');

	Person = tko.Model.extend({
		urlRoot: '/person',
		first: ko.observable(),
		last: ko.observable(),
		log: function() {
			return this.first() + ' ' + this.last();
		}
	});

	test('basics', function() {
		var obj = new Person();
		ok(obj.first, 'new model instances have correct observables');
		ok(obj.last, 'new model instances have correct observables');
		equal(obj.urlRoot, '/person', 'new model instances have correct properties');
		ok(_.isFunction(obj.log), 'new model instances have correct functions');
		ok(!obj.id, 'new models do not have an id');

		obj = new Person({
			first: 'Bryan',
			last: 'G'
		});
		equal(obj.first(), 'Bryan', 'constructing a model with properties');
		equal(obj.last(), 'G', 'constructing a model with properties');
		equal(obj.log(), 'Bryan G', 'model functions work');

		var obj2 = new Person({
			first: 'John',
			last: 'Doe'
		});
		equal(obj.first(), 'Bryan', 'constructing a model with properties');
		equal(obj2.first(), 'John', 'constructing a model with properties');
		equal(obj.log(), 'Bryan G', 'model functions work');
		equal(obj2.log(), 'John Doe', 'model functions work');
	});

	test('setting properties', function() {
		var person = new Person(),
			otherPerson = new Person(),
			obj = {first: 'foo', last: 'bar'};

		person.setProperties(obj);
		equal(person.first(), 'foo', 'existing properties are set');
		equal(person.last(), 'bar', 'existing properties are set');

		person.setProperties({first: 'baz'});
		equal(person.first(), 'baz', 'setting a subset of properties');
		equal(person.last(), 'bar', 'setting a subset of properties');

		person.setProperties({foobar: 'foobar'});
		equal(person.first(), 'baz', 'setting missing properties');
		equal(person.last(), 'bar', 'setting missing properties');
		ok(!person.foobar, 'missing properties are not set');

		otherPerson.setProperties({first: 'John', last: 'Doe'});
		person.setProperties(otherPerson);
		equal(person.first(), 'John', 'copying properties from another model');
		equal(person.last(), 'Doe', 'copying properties from another model');
	});

	test('converting to JS', function() {
		var person,
			result;
		
		person = new Person({
			first: 'John',
			last: 'Doe'
		});
		result = person.toJS();
		deepEqual(result, {first: 'John', last: 'Doe'}, 'converting model to JS');
	});

	asyncTest('saving a new model', function() {
		var person = new Person({
			first: 'John',
			last: 'Doe'
		});

		person.save().done(function() {
			equal(postCount, 1, 'saving a new model generates a post');
			equal(person.id(), 1, 'saved models have an id');
			deepEqual(person.toJS(), {id: 1, first: 'John', last: 'Doe'}, 'saved models are not altered');
			start();
		});
	});

	asyncTest('saving an existing model', function() {
		var posts = postCount, 
			person = new Person({
				id: 10,
				first: 'Jane',
				last: 'Doe'
			});

		person.save().done(function() {
			equal(postCount, posts, 'saving an existing model generates a put');
			equal(putCount['10'], 1, 'saving an existing model generates a put');
			equal(person.id(), 10, 'saving an existing model does not change the id');
			start();
		});
	});

	asyncTest('deleting a model', function() {
		var posts = postCount, 
			person = new Person({
				id: 20,
				first: 'Jane',
				last: 'Doe'
			});

		person.destroy().then(function() {
			equal(postCount, posts, 'deleting an existing model generates a delete');
			ok(_.isUndefined(putCount['20']), 'deleting an existing model generates a delete');
			equal(deleteCount['20'], 1, 'deleting an existing model generates a delete');
			start();
		});
	});

	asyncTest('fetching a model', function() {
		var person = new Person({
			id: 999
		});

		person.fetch().done(function() {
			equal(person.first(), 'John999', 'fetching a model');
			equal(person.last(), 'Doe999', 'fetching a model');
			equal(person.id(), 999, 'fetching a model does not change the id');
			start();
		});
	});
}(window));
