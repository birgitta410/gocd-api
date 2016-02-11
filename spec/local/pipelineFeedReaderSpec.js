
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var mockery = require('mockery');

describe('pipelineFeedReader Go CD', function () {

  var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');
  var thePipelineFeedReader;
  var testPipelines = ['A-PIPELINE', 'DOWNSTREAM-PIPELINE'];

  describe('Go CD', function() {

    var NUM_ENTRIES_IN_FIXTURE = 5;
    var NUM_ENTRIES_IN_DOWNSTREAM_FIXTURE = 2;
    var NUM_ENTRIES_IN_FIXTURE_PAGE_1 = 3;

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

    describe("initFullCache()", function() {
      it('should fill the cache with data for all pipelines, all the way back', function (testDone) {

        thePipelineFeedReader.initFullCache(testPipelines).then(function () {

          thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
            expect(_.keys(results.pipelineRuns).length).toBe(NUM_ENTRIES_IN_FIXTURE);
            expect(results.pipelineRuns['2063'].stages.length).toBe(7);

            thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(downstreamResults) {
              expect(_.keys(downstreamResults.pipelineRuns).length).toBe(NUM_ENTRIES_IN_DOWNSTREAM_FIXTURE);
              expect(downstreamResults.pipelineRuns['2065'].stages.length).toBe(2);
              testDone();
            }).done();

          }).done();


        }).done();

      });

      it('should cache pipeline run even if its excluded in results when first present', function(testDone) {
        thePipelineFeedReader.initFullCache(testPipelines).then(function () {
          thePipelineFeedReader.readHistory({ exclude: ['2066'], pipeline: 'A-PIPELINE' }).then(function(firstResults) {
            expect(_.keys(firstResults.pipelineRuns).length).toBe(NUM_ENTRIES_IN_FIXTURE - 1);

            thePipelineFeedReader.initFullCache(testPipelines).then(function () {
              thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(secondResults) {
                expect(_.keys(secondResults.pipelineRuns).length).toBe(NUM_ENTRIES_IN_FIXTURE);
                expect(secondResults.pipelineRuns['2066']).toBeDefined();
                testDone();
              }).done();

            }).done();
          }).done();


        }).done();
      });

    });

    describe('readHistory()', function () {

      it('should always read fresh data for at least one page', function (testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(results.pipelineRuns['2066'].stages.length).toBe(7);
          expect(results.pipelineRuns['2063']).toBeUndefined();
          testDone();
        }).done();
      });

      it('should write a sample to a file, for documentation purposes', function (testDone) {

        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          var pipelineRunToLog = '2066';
          expect(results.pipelineRuns[pipelineRunToLog]).toBeDefined();
          var base = path.resolve(__dirname, 'samples');
          fs.writeFile(base + '/history.json', JSON.stringify(results.pipelineRuns[pipelineRunToLog], undefined, 2), function() {
            testDone();
          });
        }).done();
      });

      it('should initialise a set of pipeline runs', function (testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(_.keys(results.pipelineRuns).length).toBe(NUM_ENTRIES_IN_FIXTURE_PAGE_1);
          expect(results.pipelineRuns['2066']).toBeDefined();
          testDone();
        }).done();

      });

      it('should exclude specific pipeline runs if specified', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE', exclude: ['2066', '2065']}).then(function(results) {
          expect(_.keys(results.pipelineRuns).length).toBe(NUM_ENTRIES_IN_FIXTURE_PAGE_1 - 2);

          testDone();
        }).done();
      });

      it('should only include specified pipeline names', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE-NOT-IN-FIXTURE'}).then(function(results) {
          expect(_.keys(results.pipelineRuns).length).toBe(0);

          testDone();
        }).done();
      });

      it('should add stages to respective pipeline runs', function (testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(results.pipelineRuns['2066'].stages.length).toBe(7);
          testDone();
        }).done();

      });

      it('should determine the time the last stage got scheduled', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          var expectedTime = moment(1419000842499);
          var actualTime = moment(results.pipelineRuns['2066'].summary.lastScheduled);
          expect(actualTime.hours()).toBe(expectedTime.hours());
          expect(actualTime.minutes()).toBe(expectedTime.minutes());
          expect(actualTime.seconds()).toBe(expectedTime.seconds());

          testDone();
        }).done();
      });

      it('should determine the result of the pipeline', function(testDone) {
        thePipelineFeedReader.initFullCache(testPipelines).then(function () {
          thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
            expect(results.pipelineRuns['2066'].stages.length).toBe(7);
            expect(results.pipelineRuns['2066'].summary.result).toBe('passed');
            expect(results.pipelineRuns['2062'].stages.length).toBe(7);
            expect(results.pipelineRuns['2062'].summary.result).toBe('failed');
            expect(results.pipelineRuns['2062'].summary.stageNotSuccessful).toBe('functional-test');

            thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(resultsDownstream) {
              expect(resultsDownstream.pipelineRuns['2066'].summary.result).toBe('cancelled');

              testDone();
            }).done();
          }).done();
        }).done();
      });

      it('should determine the author of the latest change that triggered the run', function(testDone) {
        thePipelineFeedReader.initFullCache(testPipelines).then(function () {
          thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
            expect(results.pipelineRuns['2066'].summary.author).toBeDefined();
            expect(results.pipelineRuns['2066'].summary.author.name).toBe('Edward Norton');
            expect(results.pipelineRuns['2063'].summary.author.name).toBe('Brad Pitt');

            testDone();
          }).done();
        }).done();
      });

      it('should parse committer and commit message from material HTML, sorted by latest change first', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          var changeInfo = results.pipelineRuns['2066'].summary.changeInfo;
          expect(changeInfo.committer).toContain('Edward Norton');
          expect(changeInfo.comment).toContain('Some comment');
          expect(changeInfo.revision).toBe('cb855ca1516888541722d8c0ed8973792f30ee57');

          testDone();
        }).done();
      });

      it('should put author and commit message of the latest change into info text, if present', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          var expectedTimeText = moment(1419000842499).format('HH:mm:ss, MMMM Do YYYY');
          expect(results.pipelineRuns['2066'].summary.text).toBe('[2066] passed | Edward Norton | Some comment 5554 | ' + expectedTimeText);

          testDone();
        }).done();
      });

      it('should create initials of person that authored changes for a failed job', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(results.pipelineRuns['2066'].summary.author.initials).toContain('eno');

          testDone();
        }).done();
      });

      it('should read the details about material for each pipeline', function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(results.pipelineRuns['2066']['build_cause'].files.length).toBe(17);

          testDone();
        }).done();
      });

      it("should determine the state of a stage based on its jobs", function(testDone) {
        thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
          expect(results.pipelineRuns['2066'].stages[2].summary.state).toBe('Building');
          expect(results.pipelineRuns['2065'].stages[2].summary.state).toBe('Scheduled');
          expect(results.pipelineRuns['2065'].stages[5].summary.state).toBe('Completed');
          expect(results.pipelineRuns['2064'].stages[2].summary.state).toBe('Building');
          testDone();
        }).done();
      });

      it('should add statistics about the pipeline', function (testDone) {
        thePipelineFeedReader.initFullCache(['A-PIPELINE']).then(function () {
          thePipelineFeedReader.readHistory({ pipeline: 'A-PIPELINE'}).then(function(results) {
            expect(results.statistics).toBeDefined();

            expect(results.statistics.timeSinceLastSuccess.human).toContain('year');
            expect(results.statistics.timeSinceLastSuccess.milliSeconds).toBeDefined();
            testDone();
          }).done();
        }).done();
      });

      describe('for pipelines triggered by upstream pipelines', function() {

        beforeEach(function(beforeDone) {
          thePipelineFeedReader.initFullCache(testPipelines).then(function () {
            beforeDone();
          }).done();
        });

        it("should determine the upstream pipeline run", function(testDone) {
          thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(results) {
            expect(results.pipelineRuns['2066'].summary.upstream.pipelineName).toBe("A-PIPELINE");
            expect(results.pipelineRuns['2066'].summary.upstream.pipelineLabel).toBe("2066");

            testDone();
          }).done();
        });

        it('should determine the author of the latest change that triggered the upstream pipeline', function(testDone) {
          thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(results) {
            expect(results.pipelineRuns['2066'].summary.author).toBeDefined();
            expect(results.pipelineRuns['2066'].summary.author.name).toBe('Edward Norton');

            testDone();
          }).done();
        });

        it('should parse committer and commit message from material HTML, sorted by latest change first', function(testDone) {
          thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(results) {

            var changeInfo = results.pipelineRuns['2066'].summary.changeInfo;
            expect(changeInfo.committer).toContain('Edward Norton');
            expect(changeInfo.comment).toContain('Some comment');
            expect(changeInfo.revision).toBe('cb855ca1516888541722d8c0ed8973792f30ee57');

            testDone();
          }).done();
        });

        it('should put author and commit message of the latest change into info text, if present', function(testDone) {
          thePipelineFeedReader.readHistory({ pipeline: 'DOWNSTREAM-PIPELINE'}).then(function(results) {

            var expectedTime2065 = moment(1450880504418).format('HH:mm:ss, MMMM Do YYYY');
            expect(results.pipelineRuns['2065'].summary.text).toBe('[2065] passed | Edward Norton | Some comment | ' + expectedTime2065);

            var expectedTime2066 = moment(1450893820238).format('HH:mm:ss, MMMM Do YYYY');
            expect(results.pipelineRuns['2066'].summary.text).toBe('[2066] Stage cancelled: smoke-test | Edward Norton | Some comment 5554 | ' + expectedTime2066);

            testDone();
          }).done();
        });
      });

    });
  });

});