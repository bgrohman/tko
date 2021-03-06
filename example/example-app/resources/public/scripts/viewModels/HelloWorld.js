define(['underscore', 'knockout', 'models/Person', 'text!views/hello.html'], function(_, ko, Person, view) {
    "use strict";

    return function HelloWorld(app) {
        var self = this,
            savedPersonData = app.retrieveSetting('hello.world.person');

        self.view = view;

        self.person = new Person();
        self.person.setProperties(savedPersonData);

        self.save = function() {
            app.saveSetting('hello.world.person', self.person.toJS());
            self.person.save();
            app.notify('success', 'Hello, ' + self.person.fullName() + '.');
        };

        self.cancel = function() {
            var savedData = app.retrieveSetting('hello.world.person');

            if (!_.isUndefined(savedData)) {
                self.person.setProperties(savedData);
            } else {
                self.person.setProperties({
                    first: '',
                    last: ''
                });
            }
        };

        self.info = function() {
            app.notify('info', 'This is an info message.');
        };

        self.success = function() {
            app.notify('success', 'This is a success message.');
        };

        self.warning = function() {
            app.notify('warning', 'This is a warning message.');
        };

        self.error = function() {
            app.notify('error', 'This is an error message.');
        };

        app.subscribe('app.initialized', function() {
            app.notify('info', 'Hello World initialized', 5000);
        });
    };
});
