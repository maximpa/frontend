import ko from 'knockout';
import _ from 'underscore';
import $ from 'jquery';
import * as cache from 'modules/cache';
import Droppable from 'modules/droppable';
import * as vars from 'modules/vars';
import * as widgets from 'models/widgets';
import mediator from 'utils/mediator';
import * as mockjax from 'test/utils/mockjax';
import textInside from 'test/utils/text-inside';
import inject from 'test/utils/inject';

// Store the original settimeout
var yeld = setTimeout, injectedClipboard;

describe('Clipboard', function () {
    beforeEach(function () {
        window.localStorage.clear();
        this.droppable = new Droppable();
        widgets.register();
        cache.put('contentApi', 'internal-code/page/first', {
            'webUrl': 'http://theguardian.com/banana',
            'fields': {
                'headline': 'Bananas are yellow'
            }
        });
        this.scope = mockjax.scope();
        this.scope({
            url: '/api/proxy/piuccio*',
            responseText: {}
        });
        jasmine.clock().install();
    });
    afterEach(function () {
        this.scope.clear();
        this.droppable.dispose();
        injectedClipboard.dispose();
        jasmine.clock().uninstall();
    });

    it('loads items from the history', function (done) {
        function testDraggingAnArticle (clipboard) {
            // Local storage was cleared, the clipboard should be empty
            expect(getArticles().length).toBe(0);

            dragArticle({
                id: 'internal-code/page/first'
            }, clipboard, function () {
                expect(getArticles().length).toBe(1);
                expect(getArticles()[0].headline).toBe('Bananas are yellow');

                // Destroy the clipboard and initialize again
                injectClipboard(testLoadingFromStorage);
            });
        }

        function testLoadingFromStorage (clipboard) {
            expect(getArticles().length).toBe(1);
            expect(getArticles()[0].headline).toBe('Bananas are yellow');

            dragArticle({
                id: 'internal-code/page/first'
            }, clipboard, function () {
                dragArticle({
                    id: 'https://github.com/piuccio',
                    meta: {
                        headline: 'GitHub',
                        snapType: 'link'
                    }
                }, clipboard, testRemovingItems);
            });
        }

        function testRemovingItems (clipboard) {
            expect(getArticles().length).toBe(2);
            expect(getArticles()[0].headline).toBe('Bananas are yellow');
            expect(getArticles()[1].headline).toBe('GitHub');

            // Delete and item and check that it's not in storage anymore
            removeArticle({
                id: 'internal-code/page/first'
            }, clipboard, function () {
                injectClipboard(testLoadingAfterDelete);
            });
        }

        function testLoadingAfterDelete (clipboard) {
            expect(getArticles().length).toBe(1);
            expect(getArticles()[0].headline).toBe('GitHub');

            changeHeadline(0, 'Open Source', clipboard);
            expect(getArticles()[0].headline).toBe('Open Source');

            injectClipboard(testChangingMetadata);
        }

        function testChangingMetadata () {
            expect(getArticles().length).toBe(1);
            expect(getArticles()[0].headline).toBe('Open Source');

            done();
        }

        injectClipboard(testDraggingAnArticle);
    });
});

function injectClipboard (callback) {
    if (injectedClipboard) {
        injectedClipboard.dispose();
        jasmine.clock().tick(10);
    }

    injectedClipboard = inject(`
        <clipboard-widget params="position: 0, column: $data"></clipboard-widget>
    `);
    injectedClipboard.apply({
        switches: ko.observable({
            'facia-tool-sparklines': false
        }),
        identity: { email: 'fabio.crisci@theguardian.com' },
        isPasteActive: ko.observable()
    }, true).then(callback);

    jasmine.clock().tick(10);
}

function getArticles () {
    var articles = [];
    $('trail-widget').each(function (i, elem) {
        articles.push({
            headline: textInside($(elem).find('.element__headline')),
            dom: $(elem)
        });
    });
    return articles;
}

function dragArticle (article, clipboard, callback) {
    mediator.emit('drop', {
        sourceItem: article,
        sourceGroup: null
    }, clipboard.group, clipboard.group);
    // Let knockout refresh the HTML
    yeld(function () {
        jasmine.clock().tick(vars.CONST.detectPendingChangesInClipboard);
        callback(clipboard);
    }, 10);
}

function removeArticle (article, clipboard, callback) {
    var actualArticle = _.find(clipboard.group.items(), function (item) {
        return item.id() === article.id;
    });
    clipboard.group.omitItem(actualArticle);
    yeld(function () {
        jasmine.clock().tick(vars.CONST.detectPendingChangesInClipboard);
        callback(clipboard);
    }, 10);
}

function changeHeadline (position, newHeadline, clipboard) {
    var article = clipboard.group.items()[position];
    article.meta.headline(newHeadline);
    jasmine.clock().tick(vars.CONST.detectPendingChangesInClipboard);
}
