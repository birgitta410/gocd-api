
var mockery = require('mockery');
var fs = require('fs');
var path = require('path');
var globalOptions = require('../../lib/options');
var ccTraySampleRequestor = require('../../lib/cc/ccTraySampleRequestor');

describe('ccTrayReader', function () {

  var options = {};

  var theCcTrayReader;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    globalOptions.get = function() {
        return options;
      };
    globalOptions.getCcTrayRequestor = function() {
      return ccTraySampleRequestor;
    };

    mockery.registerMock('../options', globalOptions);

    theCcTrayReader = require('../../lib/cc/ccTrayReader');

  });


  describe('init()', function () {

    var NUM_STAGES_IN_A_PIPELINE = 6;
    var NUM_JOBS_IN_A_PIPELINE_2 = 1;
    var NUM_JOBS_IN_TEST_DATA = NUM_STAGES_IN_A_PIPELINE + NUM_JOBS_IN_A_PIPELINE_2;

    beforeEach(function() {
      options.stages = undefined;
    });

    it('should write a sample to a file, for documentation purposes', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        result.stages = [result.stages[0]];
        var base = path.resolve(__dirname, 'samples');
        fs.writeFile(base + '/activity.json', JSON.stringify(result, undefined, 2), function() {
          done();
        });

      });
    });

    it('should by default read all the stages of all the pipelines with 2 name elements', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.stages.length).toBe(NUM_JOBS_IN_TEST_DATA);
        done();
      });
    });

    it('should only read the stages that are configured', function (done) {
      options.stages = [ 'A-PIPELINE :: build' ];
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.stages.length).toBe(1);
        done();
      });
    });

    it('should only consider the pipeline that is configured', function (done) {
      theCcTrayReader.readActivity("A-PIPELINE").then(function (result) {
        expect(result.stages.length).toBe(NUM_STAGES_IN_A_PIPELINE);
        done();
      });
    });

    it('should stay the same number of activities when called twice', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.stages.length).toBe(NUM_JOBS_IN_TEST_DATA);
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.stages.length).toBe(NUM_JOBS_IN_TEST_DATA);
          done();
        });
      });
    });

    it('should parse the breaker\'s name/email from messages', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.stages[4].breaker.name).toContain('Maria Mustermann');
        expect(result.stages[4].breaker.email).toContain('internet');
        done();
      });
    });

    it('should provide id of pipeline that is currently building', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.buildNumberInProgress).toBe('1200');
        done();
      });
    });

  });
});