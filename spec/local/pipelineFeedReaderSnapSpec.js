
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var mockery = require('mockery');

xdescribe('pipelineFeedReader Snap', function () {

  var snapSampleRequestor = require('../../lib/snap-ci/snapSampleRequestor');
  var thePipelineFeedReader;

  describe('Snap CI', function() {
    var NUM_ENTRIES_IN_FIXTURE = 5;

    beforeEach(function() {

      mockery.enable({
        warnOnUnregistered: false,
        warnOnReplace: false
      });

      var globalOptions = {
        getHistoryRequestor: function() {
          return snapSampleRequestor;
        }
      };

      mockery.registerMock('../options', globalOptions);

      thePipelineFeedReader = require('../../lib/gocd/pipelineFeedReader');

    });


    beforeEach(function() {
      thePipelineFeedReader.clear();
    });

    describe('readPipelineRuns()', function () {
      it('should write a sample to a file, for documentation purposes', function (done) {

        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          var pipelineRunToLog = '14';
          expect(results[pipelineRunToLog]).toBeDefined();
          var base = path.resolve(__dirname, 'samples');
          fs.writeFile(base + '/history-snap.json', JSON.stringify(results[pipelineRunToLog], undefined, 2), function() {
            done();
          });
        });
      });

      it('should initialise a set of pipeline runs', function (done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
          expect(results['14']).toBeDefined();
          done();
        });

      });

      it('should exclude pipelines if specified', function(done) {
        thePipelineFeedReader.readPipelineRuns({ exclude: ['14', '13'] }).then(function (results) {
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 2);

          done();
        });
      });

      it('should cache pipeline run even if its excluded in results when first present', function(done) {
        thePipelineFeedReader.readPipelineRuns({ exclude: ['13'] }).then(function (results) {
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 1);

          thePipelineFeedReader.readPipelineRuns().then(function (results) {
            expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
            expect(results['13']).toBeDefined();
            done();
          });

        });
      });


      it('should add stages to respective pipeline runs', function (done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(results['14'].stages.length).toBe(1);
          done();
        });

      });

      it('should determine the time the last stage got scheduled', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {

          var expectedTime = moment('2015-05-03T09:52:53Z');
          var actualTime = moment(results['14']['last_scheduled']);
          expect(actualTime.hours()).toBe(expectedTime.hours());
          expect(actualTime.minutes()).toBe(expectedTime.minutes());
          expect(actualTime.seconds()).toBe(expectedTime.seconds());

          done();
        });
      });

      it('should determine the result of the pipeline', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(results['14'].stages.length).toBe(1);
          expect(results['14'].result).toBe('passed');
          expect(results['13'].stages.length).toBe(1);
          expect(results['13'].result).toBe('failed');
          expect(results['13'].stageFailed).toBe('SampleStage');

          done();
        });
      });

      it('should determine the author of the latest change that triggered the run', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(results['14'].author).toBeDefined();
          expect(results['14'].author.name).toBe('Birgitta B.');
          expect(results['13'].author.name).toBe('Birgitta B.');

          done();
        });
      });

      it('should parse committer and commit message from material HTML, sorted by latest change first', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          var buildCause = results['14']['build_cause'];
          expect(buildCause.committer).toContain('Birgitta B.');
          expect(buildCause.comment).toContain('Add link');
          expect(buildCause.revision).toBe('38bd8b1f9285208ab60ad1ff1b7b761539420939');

          done();
        });
      });

      it('should put author and commit message of the latest change into info text, if present', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          var expectedTimeText = moment('2015-05-03T09:52:53Z').format('HH:mm:ss, MMMM Do YYYY');
          expect(results['14'].info).toBe('[14] passed | Birgitta B. | Add link to go.cd | ' + expectedTimeText);

          done();
        });
      });

      it('should create initials of person that authored changes for a failed job', function(done) {
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(results['14'].author.initials).toContain('bb');

          done();
        });
      });
      //
      //it('should read the details about material for each pipeline', function(done) {
      //  thePipelineFeedReader.readPipelineRuns().then(function (results) {
      //    expect(results['2066']['build_cause'].files.length).toBe(17);
      //
      //    done();
      //  });
      //});

    });
  });
});