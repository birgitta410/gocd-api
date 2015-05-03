var options = require('../../lib/options');

describe('utils', function () {

  describe('getHistoryEndpoint', function () {

    it('should return go cd endpoint by default', function () {
      options.set({
        user: 'admin',
        password: 'password',
        url: 'my-go-cd-server:8153',
        pipeline: 'myPipeline'
      });

      expect(options.getHistoryEndpoint()).toBe('http://admin:password@my-go-cd-server:8153/go/api/pipelines/myPipeline/history');
    });

  });

  describe('getPipelineBasePath', function() {
    it('should return the go cd endpoint by default', function() {

      options.set({
        user: 'admin',
        password: 'password',
        url: 'my-go-cd-server:8153',
        pipeline: 'myPipeline'
      });

      expect(options.getPipelineBasePath()).toBe('http://admin:password@my-go-cd-server:8153/go/api/pipelines/myPipeline');
    });
  });

});
