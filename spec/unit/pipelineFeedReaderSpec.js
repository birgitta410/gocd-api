
var _ = require('lodash');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var mockery = require('mockery');

describe('pipelineFeedReader', function () {

  var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');
  var thePipelineFeedReader;

  var NUM_ENTRIES_IN_FIXTURE = 12;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      getGocdRequestor: function() {
        return gocdSampleRequestor;
      }
    };

    mockery.registerMock('../options', globalOptions);

    thePipelineFeedReader = require('../../lib/gocd/pipelineFeedReader');

  });


  beforeEach(function() {
    thePipelineFeedReader.clear();
  });

  describe('readHistory()', function () {

    it('should write a sample to a file, for documentation purposes', function (done) {

      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        var pipelineRunToLog = '1199';
        var base = path.resolve(__dirname, 'samples');
        fs.writeFile(base + '/history.json', JSON.stringify(results[pipelineRunToLog], undefined, 2), function() {
          done();
        });
      });
    });

    it('should initialise a set of pipeline runs', function (done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
        expect(results['1199']).toBeDefined();
        done();
      });

    });

    it('should exclude pipelines if specified', function(done) {
      thePipelineFeedReader.readPipelineRuns({ exclude: ['1199', '1198'] }).then(function (results) {
        expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 2);

        done();
      });
    });

    it('should cache pipeline run even if its excluded in results when first present', function(done) {
      thePipelineFeedReader.readPipelineRuns({ exclude: ['1199'] }).then(function (results) {
        expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE - 1);

        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(_.keys(results).length).toBe(NUM_ENTRIES_IN_FIXTURE);
          expect(results['1199']).toBeDefined();
          done();
        });

      });
    });

    it('should pass no url to the requestor in initial call', function(done) {
      spyOn(gocdSampleRequestor, 'get').andCallThrough();
      thePipelineFeedReader.readPipelineRuns().then(function () {
        done();
      });
      expect(gocdSampleRequestor.get.mostRecentCall.args[0]).toBeUndefined();
    });

    it('should add stages to respective pipeline runs', function (done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].stages.length).toBe(2);
        done();
      });

    });

    it('should use the latest run of a stage to determine results', function (done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        var buildStageRuns = _.where(results['1200'].stages, function(stage) {
          return stage.stageName === 'build' || stage.name === 'build';
        });
        expect(buildStageRuns.length).toBe(2);
        expect(results['1200'].wasSuccessful()).toBe(true);
        done();
      });
    });

    it('should determine the time the last stage finished', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        var expectedTime = moment('2014-07-18T16:08:39+00:00');
        var actualTime = moment(results['1199'].updated);
        expect(actualTime.hours()).toBe(expectedTime.hours());
        expect(actualTime.minutes()).toBe(expectedTime.minutes());
        expect(actualTime.seconds()).toBe(expectedTime.seconds());

        done();
      });
    });

    it('should determine the result of the pipeline', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].stages.length).toBe(2);
        expect(results['1199'].result).toBe('Failed');
        expect(results['1199'].stageFailed).toBe('functional-test');
        expect(results['1195'].stages.length).toBe(2);
        expect(results['1195'].result).toBe('Failed');
        expect(results['1195'].stageFailed).toBe('functional-test');

        done();
      });
    });

    it('should say a pipeline passed when a job was rerun and passed the second time', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1198'].result).toBe('Passed');

        done();
      });
    });

    it('should determine the author of the latest change that triggered the run', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].author).toBeDefined();
        expect(results['1199'].author.name).toContain('Jordan');
        expect(results['1195'].author.name).toContain('Jordan');

        done();
      });
    });

    it('should parse committer and commit message from material HTML, sorted by latest change first', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].materials.length).toBe(3);
        expect(results['1199'].materials[0].committer).toContain('Neil Jordan');
        expect(results['1199'].materials[0].time).toBe('2014-11-18T16:58:37+00:00');
        expect(results['1199'].materials[0].comment).toContain('latest change');
        expect(results['1199'].materials[0].sha).toBe('9dfead6ceaf953b7767d877789f36d19324b29d0');
        expect(results['1199'].materials[1].sha).toBe('074cc70d464ad708c82bc6316f6c21ee35cffdcf');

        done();
      });
    });

    it('should not request material info again if already set in previous call', function(done) {
      spyOn(gocdSampleRequestor, 'getMaterialHtml').andCallThrough();
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].materials).toBeDefined();
        expect(gocdSampleRequestor.getMaterialHtml.callCount).toBe(NUM_ENTRIES_IN_FIXTURE);
        thePipelineFeedReader.readPipelineRuns().then(function (results) {
          expect(results['1199'].materials).toBeDefined();
          expect(gocdSampleRequestor.getMaterialHtml.callCount).toBe(NUM_ENTRIES_IN_FIXTURE);

          done();
        });
      });

    });

    it('should put author and commit message of the latest change into info text, if present', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].info).toContain('Jordan');
        expect(results['1199'].info).toContain('latest change');

        done();
      });
    });

    it('should create initials of person that authored changes for a failed job', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(results['1199'].author.initials).toContain('njo');

        done();
      });
    });

  });
});