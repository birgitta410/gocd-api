
var mockery = require('mockery');
var ccTraySampleRequestor = require('../../lib/cc/ccTraySampleRequestor');
var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');
var globalOptions = require('../../lib/options');

describe('gocd-api', function () {

  var gocdApi;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    globalOptions.getHistoryRequestor = function() {
      return gocdSampleRequestor;
    };
    globalOptions.getCcTrayRequestor = function() {
      return ccTraySampleRequestor;
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
      }).done();
    });
  });

  it('should read sample data for the downstream pipeline', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('DOWNSTREAM-PIPELINE').then(function (data) {
        expect(data.activity).toBeDefined();
        expect(data.activity.stages.length).toBe(1);
        expect(data.history).toBeDefined();
        clearInterval(instance.refreshInterval);
        done();
      }).done();
    });
  });

  it("should exclude currently building pipelines", function(done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE').then(function (data) {
        expect(data.history['2066']).toBeUndefined();
        clearInterval(instance.refreshInterval);
        done();
      }).done();
    });
  });

  describe("should enrich activity data", function() {
    it("with author information from history", function(done) {
      gocdApi.getInstance().then(function(instance) {
        instance.readData('A-PIPELINE').then(function (data) {
          expect(data.activity.stages[4].initials).toBe("eno");
          clearInterval(instance.refreshInterval);
          done();
        }).done();
      });
    });

    it("with more accurate status of the stages", function(done) {
      gocdApi.getInstance().then(function(instance) {
        instance.readData('A-PIPELINE').then(function (data) {
          expect(data.activity.stages[1].gocdActivity).toBe('Building');
          expect(data.activity.stages[2].gocdActivity).toBe('Scheduled');
          clearInterval(instance.refreshInterval);
          done();
        }).done();
      });
    });

  });

});