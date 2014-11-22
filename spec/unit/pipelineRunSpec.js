var moment = require('moment');
var Q = require('q');
var mockery = require('mockery');
var gocdSampleRequestor = require('../../lib/gocd/gocdSampleRequestor');

describe('pipelineRun', function () {

  var pipelineRunCreator;

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
    pipelineRunCreator = require('../../lib/gocd/pipelineRun');

  });

  describe('createNew()', function () {
    it('should add job details', function (done) {
      var pipelineRun = pipelineRunCreator.pipelineRun.createNew({
        author: { name: 'bla' },
        stageName: 'functional-test',
        detailsLink: 'somePlaceholderToTriggerSampleRequestor'
      });
      Q.all(pipelineRun.promiseInitialise()).then(function () {
        expect(pipelineRun.stages[0].jobs.length).toBe(1);
        expect(pipelineRun.stages[0].jobs[0].name).toBe('both');
        expect(pipelineRun.stages[0].jobs[0].state).toBe('Completed');
        expect(pipelineRun.stages[0].jobs[0].properties).toBeDefined();
        done();
      });
    });

  });

  describe('addStage()', function() {
    it('should add a new stage and recalculate results', function () {

      var firstStage = {
        updated: '2014-07-18T16:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        result: 'passed'
      };
      var secondStage = {
        updated: '2014-07-18T17:08:39+00:00',
        pipeline: 'A-PIPELINE',
        buildNumber: '1199',
        result: 'failed'
      };

      var pipelineRun = pipelineRunCreator.pipelineRun.createNew(firstStage);
      pipelineRun.promiseInitialise();

      expect(pipelineRun.wasSuccessful()).toBe(true);
      var expectedTime = moment('2014-07-18T16:08:39+00:00');
      var actualTime = moment(pipelineRun.time);
      expect(actualTime.hours()).toBe(expectedTime.hours());

      pipelineRun.addStage(secondStage);
      expect(pipelineRun.wasSuccessful()).toBe(false);

      expectedTime = moment('2014-07-18T17:08:39+00:00');
      actualTime = moment(pipelineRun.time);
      expect(actualTime.hours()).toBe(expectedTime.hours());

    });
  });

});