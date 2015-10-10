
var mockery = require('mockery');
var ccTraySampleRequestor = require('../../lib/cc/ccTraySampleRequestor');
var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');

describe('gocd-api', function () {

  var gocdApi;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      getHistoryRequestor: function() {
        return gocdSampleRequestor;
      },
      getCcTrayRequestor: function() {
        return ccTraySampleRequestor;
      },
      get: function() {
        return {}
      }
    };

    mockery.registerMock('../options', globalOptions);

    gocdApi = require('../../index');

  });


  it('should put it all together with the sample data', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData().then(function (data) {
        expect(data.activity).toBeDefined();
        expect(data.activity.jobs.length).toBe(9);
        expect(data.history).toBeDefined();
        done();
      });
    });
  });

  it('should filter by pipeline name if provided', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData("A-PIPELINE").then(function (data) {
        expect(data.activity.jobs.length).toBe(8);
        // TODO expect(data.history.length).toBe(...);
        done();
      });
    });
  });

});