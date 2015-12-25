
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
        return {};
      },
      set: function() {

      }
    };

    mockery.registerMock('../options', globalOptions);
    mockery.registerMock('./lib/options', globalOptions);

    gocdApi = require('../../index');

  });


  it('should put it all together with the sample data', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE').then(function (data) {
        expect(data.activity).toBeDefined();
        expect(data.activity.stages.length).toBe(6);
        expect(data.history).toBeDefined();
        clearInterval(instance.refreshInterval);
        done();
      });
    });
  });

});