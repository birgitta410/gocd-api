
var context = createContext({});
context(['server/sources/gocd/atomEntryParser'], function(theAtomEntryParser) {
  describe('atomEntryParser', function () {

    describe('parseParametersFromJobRunUrl', function () {

      var id = 'http://the-go-host:8153/go/pipelines/A-PIPELINE/1199/functional-test/1';

      it('should set the pipeline name', function () {
        var entry = theAtomEntryParser.parseParametersFromJobRunUrl(id);

        expect(entry.pipeline).toBe('A-PIPELINE');
      });

      it('should set the build number', function () {
        var entry = theAtomEntryParser.parseParametersFromJobRunUrl(id);

        expect(entry.buildNumber).toBe('1199');
      });

      it('should set the stage name', function () {
        var entry = theAtomEntryParser.parseParametersFromJobRunUrl(id);

        expect(entry.stageName).toBe('functional-test');
      });

      it('should set the run number', function () {
        var entry = theAtomEntryParser.parseParametersFromJobRunUrl(id);

        expect(entry.runNumber).toBe('1');
      });

      it('should be able to deal with details links', function () {
        var detailsUrl = 'http://192.168.50.79:8153/go/tab/build/detail/artwise/36/build/1/randomlyFails';
        var entry = theAtomEntryParser.parseParametersFromJobRunUrl(detailsUrl);

        expect(entry.pipeline).toBe('artwise');
        expect(entry.buildNumber).toBe('36');
        expect(entry.stageName).toBe('build');
        expect(entry.runNumber).toBe('1');
        expect(entry.jobName).toBe('randomlyFails');
      });
    });

    describe('withData()', function () {
      it('should set the result of the stage', function () {
        // title: 'QEN(1197) stage build(1) Passed',
        var entry = theAtomEntryParser.withData({ title: 'QEN(1197) stage build(1) Passed' });

        expect(entry.result).toBe('passed');
      });

      it('should set the name and email of the author', function () {
        var entry = theAtomEntryParser.withData({
          author: {
            name: 'Max Mustermann <mmustermann@internet.se>'
          }
        });

        expect(entry.author.name).toContain('Max Mustermann');
        expect(entry.author.email).toContain('internet');
      });

      it('should set the link to stage details', function () {

        var entry = theAtomEntryParser.withData({
          link: [
            { title: 'A-PIPELINE Pipeline Detail',
              href: 'http://the-host/go/api/pipelines/A-PIPELINE/1210.xml',
              type: 'application/vnd.go+xml'
            },
            { title: 'functional-test Stage Detail',
              href: 'http://the-host/go/api/stages/6116.xml',
              type: 'application/vnd.go+xml'
            },
            { title: 'functional-test Stage Detail',
              href:'http://the-host/go/pipelines/A-PIPELINE/1200/functional-test/1',
              type: 'text/html'
            }
          ]

        });

        expect(entry.detailsLink).toBe('http://the-host/go/api/stages/6116.xml');
      });

    });
  });
});