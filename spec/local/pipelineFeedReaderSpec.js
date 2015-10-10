
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var mockery = require('mockery');

describe('pipelineFeedReader Go CD', function () {

  var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');
  var thePipelineFeedReader;

  describe('Go CD', function() {

    var NUM_ENTRIES_IN_FIXTURE = 5;

    beforeEach(function() {

      mockery.enable({
        warnOnUnregistered: false,
        warnOnReplace: false
      });

      var globalOptions = {
        getHistoryRequestor: function() {
          return gocdSampleRequestor;
        }
      };

      mockery.registerMock('../options', globalOptions);

      thePipelineFeedReader = require('../../lib/gocd/pipelineFeedReader');

      jasmine.getEnv().defaultTimeoutInterval = 1000;

    });


    beforeEach(function() {
      thePipelineFeedReader.clear();
    });

    describe('refreshData()', function () {
      it('should write a sample to a file, for documentation purposes', function (done) {

        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE' });
          var pipelineRunToLog = '2066';
          expect(results[pipelineRunToLog]).toBeDefined();
          var base = path.resolve(__dirname, 'samples');
          fs.writeFile(base + '/history.json', JSON.stringify(results[pipelineRunToLog], undefined, 2), function() {
            done();
          });
        });
      });

      it('should initialise a set of pipeline runs', function (done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
          expect(results['2066']).toBeDefined();
          done();
        });

      });

      it('should exclude specific pipeline runs if specified', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE', exclude: ['2066', '2065'] });
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 2);

          done();
        });
      });

      it('should only include specified pipeline names', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE-NOT-IN-FIXTURE' });
          expect(_.keys(results).length).toBe(0);

          done();
        });
      });

      it('should cache pipeline run even if its excluded in results when first present', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ exclude: ['2066'], pipeline: 'A-PIPELINE' });
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 1);

          thePipelineFeedReader.refreshData().then(function () {
            var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
            expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
            expect(results['2066']).toBeDefined();
            done();
          });

        });
      });

      it('should add stages to respective pipeline runs', function (done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(results['2066'].stages.length).toBe(7);
          done();
        });

      });

      it('should determine the time the last stage got scheduled', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          var expectedTime = moment(1419000842499);
          var actualTime = moment(results['2066']['last_scheduled']);
          expect(actualTime.hours()).toBe(expectedTime.hours());
          expect(actualTime.minutes()).toBe(expectedTime.minutes());
          expect(actualTime.seconds()).toBe(expectedTime.seconds());

          done();
        });
      });

      it('should determine the result of the pipeline', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(results['2066'].stages.length).toBe(7);
          expect(results['2066'].result).toBe('passed');
          expect(results['2062'].stages.length).toBe(7);
          expect(results['2062'].result).toBe('failed');
          expect(results['2062'].stageFailed).toBe('functional-test');

          done();
        });
      });

      it('should determine the author of the latest change that triggered the run', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(results['2066'].author).toBeDefined();
          expect(results['2066'].author.name).toBe('Edward Norton');
          expect(results['2063'].author.name).toBe('Brad Pitt');

          done();
        });
      });

      it('should parse committer and commit message from material HTML, sorted by latest change first', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          var buildCause = results['2066']['build_cause'];
          expect(buildCause.committer).toContain('Edward Norton');
          expect(buildCause.comment).toContain('Some comment');
          expect(buildCause.revision).toBe('cb855ca1516888541722d8c0ed8973792f30ee57');

          done();
        });
      });

      it('should put author and commit message of the latest change into info text, if present', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          var expectedTimeText = moment(1419000842499).format('HH:mm:ss, MMMM Do YYYY');
          expect(results['2066'].info).toBe('[2066] passed | Edward Norton | Some comment 5554 | ' + expectedTimeText);

          done();
        });
      });

      it('should create initials of person that authored changes for a failed job', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(results['2066'].author.initials).toContain('eno');

          done();
        });
      });

      it('should read the details about material for each pipeline', function(done) {
        thePipelineFeedReader.refreshData().then(function () {
          var results = thePipelineFeedReader.readPipelineRuns({ pipeline: 'A-PIPELINE'});
          expect(results['2066']['build_cause'].files.length).toBe(17);

          done();
        });
      });

    });
  });

});