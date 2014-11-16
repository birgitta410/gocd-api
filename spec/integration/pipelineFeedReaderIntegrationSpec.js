
var _ = require('lodash');
var mockery = require('mockery');

describe('pipelineFeedReader', function () {

  var gocdRequestor;
  var thePipelineFeedReader;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    var globalOptions = {
      getGocdRequestor: function() {
        return gocdRequestor;
      },
      addCredentialsToUrl : function(url) {
        if(url === undefined) return '';
        var urlNoHttp = url.indexOf('http') === 0 ? url.substr('http://'.length) : url;
        return 'http://admin:wa8jah@' + urlNoHttp;
      },
      get: function() {
        return {
          url: process.env.GOCD_URL,
          pipeline: process.env.GOCD_PIPELINE || 'artwise',
          debug: true
        };
      }
    };

    mockery.registerMock('../options', globalOptions);
    mockery.registerMock('./options', globalOptions);

    require('../../lib/logger');
    gocdRequestor = require('../../lib/gocd/gocdRequestor');
    thePipelineFeedReader = require('../../lib/gocd/pipelineFeedReader');

  });


  beforeEach(function() {
    thePipelineFeedReader.clear();
  });

  function getFirstResult(results) {
    var buildNumbers = _.keys(results);
    return results[buildNumbers[0]];
  }

  describe('readHistory()', function () {

    it('should initialise a set of pipeline runs', function (done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(_.keys(results).length).toBeGreaterThan(0);
        done();
      });

    });

    it('should add stages to respective pipeline runs', function (done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(getFirstResult(results).stages.length).toBeGreaterThan(1);
        done();
      });

    });

    it('should determine the time the last stage finished', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(getFirstResult(results).time).toBeDefined();

        done();
      });
    });

    it('should determine the result of the pipeline', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        var aResult = getFirstResult(results).result;
        expect(_.contains(['passed', 'failed'], aResult)).toBe(true);

        done();
      });
    });

    it('should determine the author of a job', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(getFirstResult(results).author).toBeDefined();
        expect(getFirstResult(results).author.name).toBeDefined();

        done();
      });
    });


    it('should parse committer and commit message from material HTML', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(getFirstResult(results).materials.length).toBeGreaterThan(0);
        expect(getFirstResult(results).materials[0].committer).toBeDefined();
        expect(getFirstResult(results).materials[0].comment).toBeDefined();
        expect(getFirstResult(results).materials[0].sha).toBeDefined();

        done();
      });
    });

    it('should set info text', function(done) {
      thePipelineFeedReader.readPipelineRuns().then(function (results) {
        expect(getFirstResult(results).info).toBeDefined();

        done();
      });
    });

  });
});