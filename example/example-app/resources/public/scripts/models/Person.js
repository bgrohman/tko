define(['underscore', 'knockout', 'tko'], function(underscore, ko, tko) {
    "use strict";

    return tko.Model.extend({
        urlRoot: '/person',
        first: ko.observable(),
        last: ko.observable(),
        fullName: function() {
            return this.first() + ' ' + this.last();
        }
    });
});
