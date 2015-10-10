
var mockery = require('mockery');
var fs = require('fs');
var path = require('path');
var ccTraySampleRequestor = require('../../lib/cc/ccTraySampleRequestor');

describe('ccTrayReader', function () {

  var options = {};

  var theCcTrayReader;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      get: function() {
        return options;
      },
      getCcTrayRequestor: function() {
        return ccTraySampleRequestor;
      }
    };

    mockery.registerMock('../options', globalOptions);

    theCcTrayReader = require('../../lib/cc/ccTrayReader');

  });


  describe('init()', function () {

    var NUM_JOBS_IN_TEST_DATA = 9;

    beforeEach(function() {
      options.jobs = undefined;
      options.pipeline = undefined;
    });

    it('should write a sample to a file, for documentation purposes', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        result.jobs = [result.jobs[0]];
        var base = path.resolve(__dirname, 'samples');
        fs.writeFile(base + '/activity.json', JSON.stringify(result, undefined, 2), function() {
          done();
        });

      });
    });

    it('should by default only use jobs, i.e. project names with 3 name elements', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs.length).toBe(NUM_JOBS_IN_TEST_DATA);
        done();
      });
    });

    it('should only read the jobs that are configured', function (done) {
      options.jobs = [ 'A-PIPELINE :: build' ];
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs.length).toBe(1);
        done();
      });
    });

    it('should only consider the pipeline that is configured', function (done) {
      options.pipeline = 'A-PIPELINE';
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs.length).toBe(8);
        done();
      });
    });

    it('should support configuration of stage name and then choose all the jobs under that stage', function (done) {
      options.jobs = {
        '0': 'A-PIPELINE :: deploy-dev'
      };
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs.length).toBe(2);
        done();
      });
    });

    it('should stay the same number of activities when called twice', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs.length).toBe(NUM_JOBS_IN_TEST_DATA);
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.jobs.length).toBe(NUM_JOBS_IN_TEST_DATA);
          done();
        });
      });
    });

    it('should parse the breaker\'s name/email from messages', function (done) {
      theCcTrayReader.readActivity().then(function (result) {
        expect(result.jobs[5].breaker.name).toContain('Maria Mustermann');
        expect(result.jobs[5].breaker.email).toContain('internet');
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