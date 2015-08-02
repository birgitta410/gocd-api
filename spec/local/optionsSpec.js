var options = require('../../lib/options');

describe('utils', function () {

  describe('getGocdHistoryEndpoint', function () {

    it('should return go cd endpoint by default / if user and password is specified', function () {
      options.set({
        user: 'admin',
        password: 'password',
        url: 'my-go-cd-server:8153',
        pipeline: 'myPipeline'
      });

      expect(options.getGocdHistoryPath()).toBe('/go/api/pipelines/myPipeline/history');
    });

    it('should return the snap ci endpoint if API key was specified', function() {
      options.set({
        user: 'snapci-user',
        key: 'xxaabbcc',
        pipeline: 'myPipeline'
      });

      expect(options.getSnapHistoryEndpoint()).toBe('/myPipeline/branch/master/pipelines');
    });

  });

});
