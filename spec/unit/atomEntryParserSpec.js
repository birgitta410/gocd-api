var theAtomEntryParser = require('../../lib/gocd/atomEntryParser');

describe('atomEntryParser', function () {

  describe('withData()', function () {

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
