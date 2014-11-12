
var configuration = {};
var mockConfig = {
  create: function() {
    return {
      get: function() {
        return configuration;
      }
    };
  }
};

var mocks = {
  'server/sources/ymlHerokuConfig': mockConfig
};

var context = createContext(mocks);

context(['lodash', 'server/sources/cc/ccTrayReader', 'server/sources/cc/ccTrayRequestor'], function(_, theCcTrayReader, ccTrayRequestor) {

  beforeEach(function() {
    ccTrayRequestor.get = ccTrayRequestor.getSample;
  });

  describe('ccTrayReader', function () {
    describe('init()', function () {

      beforeEach(function() {
        configuration.jobs = undefined;
      });

      it('should log an example to the console, for documentation purposes', function (done) {
        theCcTrayReader.readActivity().then(function (result) {
          result.jobs = [result.jobs[0]];
          console.log('SAMPLE ACTIVITY PARSED FROM cctray.xml', JSON.stringify(result, undefined, 2));
          done();
        });
      });

      it('should by default only use jobs, i.e. project names with 3 name elements', function (done) {
        // 6 = number of jobs
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.jobs.length).toBe(8);
          done();
        });
      });

      it('should only read the jobs that are configured', function (done) {
        // 6 = number of jobs
        configuration.jobs = [ 'A-PIPELINE :: build' ];
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.jobs.length).toBe(1);
          done();
        });
      });

      it('should support configuration of stage name and then choose all the jobs under that stage', function (done) {
        // 6 = number of jobs
        configuration.jobs = {
          '0': 'A-PIPELINE :: deploy-dev'
        };
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.jobs.length).toBe(2);
          done();
        });
      });

      it('should stay the same number of activities when called twice', function (done) {
        theCcTrayReader.readActivity().then(function (result) {
          expect(result.jobs.length).toBe(8);
          theCcTrayReader.readActivity().then(function (result) {
            expect(result.jobs.length).toBe(8);
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
});