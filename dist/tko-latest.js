/*! tko - v0.1.0 - 2012-12-24
* https://github.com/bgrohman/tko
* Copyright (c) 2012 Bryan Grohman; Licensed MIT */

(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['underscore', 'knockout', 'jquery', 'amplify', 'routie', 'bootstrap'], factory);
	} else {
		root.tko = factory(root._, root.ko, root.$, root.amplify, root.routie);
	}
}(this, function(_, ko, $, amplify, routie) {

	/**
	 * Base Model constructor. Should not be used directly. Use Model.extend
	 * to create new constructors.
	 */
	function Model() {
		this.urlRoot = null;
		this.id = null;

		/**
		 * Copies the properties of the from object to this Model. Only this
		 * Model's observables will be set. The id will be set if it has not
		 * already been set.
		 * @param from the object from which to copy properties
		 */
		this.setProperties = function(from) {
			var self = this,
				fromObj,
				selfVal,
				fromVal;

			if (!_.isUndefined(from) && !_.isNull(from)) {
				fromObj = ko.toJS(from);

				_.each(_.keys(self), function(key) {
					if (key !== 'id') {
						selfVal = self[key];

						if (ko.isObservable(selfVal)) {
							fromVal = fromObj[key];

							if (!_.isUndefined(fromVal)) {
								selfVal(fromVal);
							}
						}
					}
				});

				if (!_.isUndefined(fromObj.id)) {
					if (_.isNull(self.id)) {
						self.id = ko.observable(fromObj.id);
					}
				}
			}
		};

		/**
		 * Returns a plain object without observables representing this Model.
		 * @returns a plain object
		 */
		this.toJS = function() {
			var self = this,
				obj = {};

			_.each(_.keys(self), function(key) {
				if (ko.isObservable(self[key])) {
					obj[key] = self[key]();
				}
			});

			return obj;
		};

		/**
		 * Saves or updates this model. Generates a POST or PUT using this 
		 * Model's urlRoot.
		 */
		this.save = function() {
			var self = this,
				id,
				url,
				requestType,
				request;

			if (_.isUndefined(self.id) || _.isNull(self.id)) {
				requestType = 'POST';
				url = self.urlRoot;
			} else {
				requestType = 'PUT';
				id = ko.isObservable(self.id) ? self.id() : self.id;
				url = self.urlRoot + '/' + id;
			}

			request = $.ajax({
				type: requestType,
				url: url,
				cache: false,
				data: self.toJS(),
				dataType: 'json'
			});

			request.done(function(data) {
				if (!_.isUndefined(data.id)) {
					self.id = ko.observable(data.id);
				}
			});

			return request;
		};

		/**
		 * Deletes this Model. Generates a DELETE request using this Model's 
		 * urlRoot.
		 */
		this.destroy = function() {
			var self = this,
				id;

			if (!_.isUndefined(self.id)) {
				id = ko.isObservable(self.id) ? self.id() : self.id;

				return $.ajax({
					type: 'DELETE',
					url: self.urlRoot + '/' + id,
					cache: false
				});
			}

			return null;
		};

		/**
		 * Populates this Model with data from the server. Generates a GET 
		 * request using this Model's urlRoot and sets the Model's properties
		 * using the response.
		 */
		this.fetch = function() {
			var self = this,
				request,
				id;

			if (!_.isUndefined(self.id)) {
				id = ko.isObservable(self.id) ? self.id() : self.id;

				request = $.ajax({
					type: 'GET',
					url: self.urlRoot + '/' + id,
					cache: false
				});

				request.done(function(data) {
					self.setProperties(data);
				});

				return request;
			}

			return null;
		};
	}

	/**
	 * Creates a new Model constructor.
	 * @param props the properties used by the new Model
	 * @returns a new Model constructor
	 */
	Model.extend = function(props) {
		return function(properties) {
			var model = new Model();
			_.each(props, function(val, key) {
				if (ko.isObservable(val)) {
					model[key] = ko.observable(val());
				} else {
					model[key] = val;
				}
			});
			model.setProperties(properties);
			return model;
		};
	};

	/**
	 * View model for notifications.
	 */
	function Notifications(app) {
		var self = this;

		self.error = ko.observable();
		self.warning = ko.observable();
		self.success = ko.observable();
		self.info = ko.observable();

		self.clear = function(type) {
			if (_.has(self, type)) {
				self[type](null);
			}
		};

		self.visible = ko.computed(function() {
			var messageKeys = ['error', 'warning', 'success', 'info'];
			return _.any(messageKeys, function(key) {
				var val = self[key]();
				return !(_.isUndefined(val) || _.isNull(val) || _.isEmpty(val));
			});
		});
	}

	/**
	 * Creates a new App.
	 * @param next function to call during initialization with 'this' set to
	 * the new App.
	 */
	function App(next) {
		var self = this,
			pageViewModels = [],
			defaultPageRoute,
			notifyTimeouts = {};

		self.notifications = new Notifications(self);

		self.notify = function(type, msg, timeout) {
			if (_.has(self.notifications, type)) {
				if (notifyTimeouts[type]) {
					clearTimeout(notifyTimeouts[type]);
				}
				self.notifications[type](msg);

				if (_.isNumber(timeout)) {
					notifyTimeouts[type] = setTimeout(function() {
						self.notifications.clear(type);
						notifyTimeouts[type] = null;
					}, timeout);
				}
			}
		};

		self.publish = function(topic, msg) {
			amplify.publish(topic, msg);
		};

		self.subscribe = function(topic, callback) {
			return amplify.subscribe(topic, callback);
		};

		self.unsubscribe = function(topic, callback) {
			amplify.unsubscribe(topic, callback);
		};

		self.retrieveSetting = function(key) {
			return amplify.store(key);
		};

		self.saveSetting = function(key, val) {
			return amplify.store(key, val);
		};

		self.route = function(route, handler) {
			routie(route, handler);
		};

		self.navigate = function(route) {
			routie(route);
		};

		self.page = function(name, viewModel, isDefault) {
			pageViewModels.push(viewModel);

			self.route(name, function() {
				_.each(pageViewModels, function(vm) {
					vm.visible(false);
				});
				viewModel.visible(true);
			});

			if (isDefault) {
				defaultPageRoute = name;
			}
		};

		function applyRoute() {
			var hash = window.location.hash,
				route,
				useDefault = true;

			if (!_.isEmpty(hash)) {
				route = hash.substr(1);

				if (!_.isEmpty(route)) {
					self.navigate('');
					self.navigate(route);
					useDefault = false;
				}
			}

			if (useDefault && _.isString(defaultPageRoute)) {
				self.navigate(defaultPageRoute);
			}
		}

		function init() {
			if (_.isFunction(next)) {
				next.call(self);
			}

			$(function() {
				ko.applyBindings(self);
				applyRoute();
				self.publish('app.initialized');
			});
		}

		init();
	}

	return {
		Notifications: Notifications,
		Model: Model,
		App: App
	};
}));
