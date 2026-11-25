/**
 * ColorLab Forma Setup Pro - Standalone Fast Script
 * Author: Yahia Bin Zaman / ColorLab
 * Run via: File > Scripts > Other Script...
 */

#target illustrator

(function () {
    "use strict";

    if (app.documents.length === 0) {
        alert("Illustrator-e kono document open nei!\nDoya kore document open korun.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || (sel.length !== 16 && sel.length !== 8)) {
        alert("\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u0996\u09C7\u09DF\u09BE\u09B2 \u0995\u09B0\u09C1\u09A8:\n\u09A0\u09BF\u0995 \u09E7\u09EC-\u099F\u09BF (\u0985\u09A5\u09AC\u09BE \u09EE-\u099F\u09BF) \u09AA\u09C7\u099C \u0997\u09CD\u09B0\u09C1\u09AA \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7!\n\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09BE \u0986\u099B\u09C7: " + (sel ? sel.length : 0) + " \u099F\u09BF\u0964");
        return;
    }

    var requiredPages = sel.length;

    if (doc.artboards.length < requiredPages) {
        alert("\u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F\u09C7 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 " + requiredPages + "-\u099F\u09BF \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7!\n\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u0986\u099B\u09C7: " + doc.artboards.length + " \u099F\u09BF\u0964");
        return;
    }

    function getPageTrimBounds(item, abW, abH) {
        if (!item) return null;

        // 1. If the item itself is a clipped group, its clipping path is the definitive page boundary
        if (item.typename === "GroupItem" && item.clipped && item.pageItems) {
            for (var c = 0; c < item.pageItems.length; c++) {
                if (item.pageItems[c].clipping) {
                    return item.pageItems[c].geometricBounds;
                }
            }
        }

        if (item.typename === "GroupItem" && item.pageItems && item.pageItems.length > 0) {
            var bestCandidate = null;
            var bestDiff = 999999;

            // Helper to check how closely an element matches the page trim (allowing standard bleed up to 40 pt)
            function testBounds(gb, isAtBottom) {
                var w = Math.abs(gb[2] - gb[0]);
                var h = Math.abs(gb[1] - gb[3]);
                if (!abW || !abH) return;

                // Check Portrait orientation match
                var diffW = Math.abs(w - abW);
                var diffH = Math.abs(h - abH);
                if (diffW <= 40 && diffH <= 40) {
                    var totalDiff = diffW + diffH;
                    if (isAtBottom) totalDiff -= 15;
                    if (totalDiff < bestDiff) {
                        bestDiff = totalDiff;
                        bestCandidate = gb;
                    }
                    return;
                }

                // Check Landscape orientation match
                var diffW_rot = Math.abs(w - abH);
                var diffH_rot = Math.abs(h - abW);
                if (diffW_rot <= 40 && diffH_rot <= 40) {
                    var totalDiffRot = diffW_rot + diffH_rot;
                    if (isAtBottom) totalDiffRot -= 15;
                    if (totalDiffRot < bestDiff) {
                        bestDiff = totalDiffRot;
                        bestCandidate = gb;
                    }
                }
            }

            // 2. Scan from bottom of group upwards (where page backgrounds/frames reside)
            var count = item.pageItems.length;
            for (var i = count - 1; i >= 0; i--) {
                var ch = item.pageItems[i];
                var isBottom = (i >= count - 3);
                if (ch.typename === "PathItem" || ch.typename === "CompoundPathItem") {
                    testBounds(ch.geometricBounds, isBottom);
                } else if (ch.typename === "GroupItem") {
                    if (ch.clipped && ch.pageItems) {
                        for (var k = 0; k < ch.pageItems.length; k++) {
                            if (ch.pageItems[k].clipping) {
                                testBounds(ch.pageItems[k].geometricBounds, isBottom);
                            }
                        }
                    } else {
                        testBounds(ch.geometricBounds, isBottom);
                    }
                }
            }

            if (bestCandidate !== null) {
                return bestCandidate;
            }
        }

        // 3. Fallback to geometricBounds of the entire item
        return item.geometricBounds;
    }

    function getItemBounds(item) {
        return getPageTrimBounds(item);
    }

    function getSpatiallySortedArtboards(doc, requiredCount) {
        var abs = [];
        for (var i = 0; i < doc.artboards.length; i++) {
            var r = doc.artboards[i].artboardRect;
            abs.push({
                index: i,
                artboard: doc.artboards[i],
                cx: (r[0] + r[2]) / 2,
                cy: (r[1] + r[3]) / 2
            });
        }

        abs.sort(function (a, b) { return b.cy - a.cy; });
        var byX = function (a, b) { return a.cx - b.cx; };

        if (requiredCount === 16 && abs.length >= 16) {
            var r1 = abs.slice(0, 4);
            var r2 = abs.slice(4, 8);
            var r3 = abs.slice(8, 12);
            var r4 = abs.slice(12, 16);

            r1.sort(byX);
            r2.sort(byX);
            r3.sort(byX);
            r4.sort(byX);

            var grid16 = [];
            var rowList = [r1, r2, r3, r4];
            for (var rw = 0; rw < 4; rw++) {
                for (var cl = 0; cl < 4; cl++) {
                    grid16.push(rowList[rw][cl].artboard);
                }
            }
            return grid16;

        } else if (requiredCount === 8 && abs.length >= 8) {
            var top4 = abs.slice(0, 4);
            var bot4 = abs.slice(4, 8);
            top4.sort(byX);
            bot4.sort(byX);

            var grid8 = [];
            for (var t = 0; t < 4; t++) grid8.push(top4[t].artboard);
            for (var b = 0; b < 4; b++) grid8.push(bot4[b].artboard);
            return grid8;
        }

        var fallback = [];
        for (var f = 0; f < doc.artboards.length; f++) fallback.push(doc.artboards[f]);
        return fallback;
    }

    function sortSelected16Pages(items) {
        var list = [];
        for (var i = 0; i < items.length; i++) {
            var b = getItemBounds(items[i]);
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            list.push({ item: items[i], cx: cx, cy: cy });
        }

        list.sort(function (a, b) { return b.cy - a.cy; });

        if (items.length === 16) {
            var row1 = list.slice(0, 8);
            var row2 = list.slice(8, 16);
            row1.sort(function (a, b) { return a.cx - b.cx; });
            row2.sort(function (a, b) { return a.cx - b.cx; });

            var sorted16 = [];
            for (var r1 = 0; r1 < 8; r1++) sorted16.push(row1[r1].item);
            for (var r2 = 0; r2 < 8; r2++) sorted16.push(row2[r2].item);
            return sorted16;

        } else if (items.length === 8) {
            var rTop = list.slice(0, 4);
            var rBot = list.slice(4, 8);
            rTop.sort(function (a, b) { return a.cx - b.cx; });
            rBot.sort(function (a, b) { return a.cx - b.cx; });

            var sorted8 = [];
            for (var t = 0; t < 4; t++) sorted8.push(rTop[t].item);
            for (var u = 0; u < 4; u++) sorted8.push(rBot[u].item);
            return sorted8;
        }

        list.sort(function (a, b) { return a.cx - b.cx; });
        var fb = [];
        for (var j = 0; j < list.length; j++) fb.push(list[j].item);
        return fb;
    }

    var PAGE_TO_SLOT_16 = {
        1: 1, 2: 2, 3: 14, 4: 13, 5: 12, 6: 15, 7: 3, 8: 0,
        9: 4, 10: 7, 11: 11, 12: 8, 13: 9, 14: 10, 15: 6, 16: 5
    };

    var PAGE_TO_SLOT_8 = {
        1: 1, 2: 2, 3: 6, 4: 5, 5: 4, 6: 7, 7: 3, 8: 0
    };

    // User exact column rotation:
    // 8-9-12-5  -> Dan (Right = 270 deg)
    // 1-16-13-4 -> Bam (Left = 90 deg)
    // 2-15-14-3 -> Dan (Right = 270 deg)
    // 7-10-11-6 -> Bam (Left = 90 deg)
    var PAGE_ROTATION_16 = {
        8: 270, 9: 270, 12: 270, 5: 270,
        1: 90,  16: 90, 13: 90,  4: 90,
        2: 270, 15: 270, 14: 270, 3: 270,
        7: 90,  10: 90, 11: 90,  6: 90
    };

    var PAGE_ROTATION_8 = {
        8: 270, 5: 270,
        1: 90,  4: 90,
        2: 270, 3: 270,
        7: 90,  6: 90
    };

    function getArtboardForPage(doc, pageNum, requiredPages) {
        var spatial = getSpatiallySortedArtboards(doc, requiredPages);
        if (spatial && spatial.length >= requiredPages) {
            var slot = (requiredPages === 8) ? PAGE_TO_SLOT_8[pageNum] : PAGE_TO_SLOT_16[pageNum];
            if (slot !== undefined && spatial[slot]) {
                return spatial[slot];
            }
        }
        return (pageNum - 1 < doc.artboards.length) ? doc.artboards[pageNum - 1] : null;
    }

    function getPageRotation(pageNum, requiredPages) {
        if (requiredPages === 8) {
            return (PAGE_ROTATION_8[pageNum] !== undefined) ? PAGE_ROTATION_8[pageNum] : 90;
        }
        return (PAGE_ROTATION_16[pageNum] !== undefined) ? PAGE_ROTATION_16[pageNum] : 90;
    }

    function repairRotatedClippingMasks(item) {
        if (!item || item.typename !== "GroupItem") return;
        try {
            if (item.clipped) {
                if (item.pageItems && item.pageItems.length === 2 && item.pageItems[1].typename === "GroupItem" && item.pageItems[1].pageItems.length === 1) {
                    var nested = item.pageItems[1];
                    var inner = nested.pageItems[0];
                    inner.move(item, ElementPlacement.PLACEATEND);
                    nested.remove();
                }
                item.clipped = false;
                item.clipped = true;
            }
            if (item.pageItems) {
                for (var i = 0; i < item.pageItems.length; i++) {
                    var ch = item.pageItems[i];
                    if (ch.typename === "GroupItem") {
                        repairRotatedClippingMasks(ch);
                    }
                }
            }
        } catch (e) {}
    }

    function releaseBrokenFrameOpacityMasks(doc, item) {
        if (!item) return;
        try {
            var name = (item.name || "").toLowerCase();
            if (name.indexOf("frame") !== -1 || name.indexOf("ribon") !== -1 || name.indexOf(".psd") !== -1) {
                try {
                    doc.selection = [item];
                    app.executeMenuCommand("releaseMask");
                } catch (eRel) {}
            }
            if (item.typename === "GroupItem" && item.pageItems) {
                for (var i = 0; i < item.pageItems.length; i++) {
                    releaseBrokenFrameOpacityMasks(doc, item.pageItems[i]);
                }
            }
        } catch (e) {}
    }

    function placeOnArtboard(item, artboard, rotAngle) {
        var abRect = artboard.artboardRect;
        var abW = Math.abs(abRect[2] - abRect[0]);
        var abH = Math.abs(abRect[1] - abRect[3]);

        if (rotAngle && rotAngle !== 0) {
            item.rotate(rotAngle, true, true, true, true, Transformation.CENTER);
        }

        var abTargetCX = (abRect[0] + abRect[2]) / 2;
        var abTargetCY = (abRect[1] + abRect[3]) / 2;

        var bAfter = getPageTrimBounds(item, abW, abH);
        var curTrimCX = (bAfter[0] + bAfter[2]) / 2;
        var curTrimCY = (bAfter[1] + bAfter[3]) / 2;

        item.translate(abTargetCX - curTrimCX, abTargetCY - curTrimCY);
    }

    var sortedPages = sortSelected16Pages(sel);

    function isAlbum(d) {
        var n = d.name.toLowerCase();
        if (n.indexOf("album") !== -1 || n.indexOf("jhuri") !== -1 || n.indexOf("front & back") !== -1 ||
            d.name.indexOf("\u0986\u09B2") !== -1 || d.name.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995") !== -1) return true;
        if (d.artboards.length === 16) {
            var r = d.artboards[0].artboardRect;
            return (Math.abs(r[1] - r[3]) > Math.abs(r[2] - r[0]));
        }
        return false;
    }

    if (requiredPages === 16 && isAlbum(doc)) {
        var abs = [];
        for (var a = 0; a < doc.artboards.length; a++) {
            var ab = doc.artboards[a];
            var r = ab.artboardRect;
            abs.push({ ab: ab, cx: (r[0] + r[2]) / 2, cy: (r[1] + r[3]) / 2 });
        }
        abs.sort(function (x, y) { return x.cx - y.cx; });
        var left8 = abs.slice(0, 8);
        var right8 = abs.slice(8, 16);

        left8.sort(function (x, y) { return y.cy - x.cy; });
        var leftTop = left8.slice(0, 4).sort(function (x, y) { return x.cx - y.cx; });
        var leftBot = left8.slice(4, 8).sort(function (x, y) { return x.cx - y.cx; });

        right8.sort(function (x, y) { return y.cy - x.cy; });
        var rightTop = right8.slice(0, 4).sort(function (x, y) { return x.cx - y.cx; });
        var rightBot = right8.slice(4, 8).sort(function (x, y) { return x.cx - y.cx; });

        var albumMap = [
            { ab: leftTop[0].ab, p: 5,  rot: 180, name: "05 - Artboard 5" },
            { ab: leftTop[1].ab, p: 12, rot: 180, name: "12 - Artboard 12" },
            { ab: leftTop[2].ab, p: 9,  rot: 180, name: "09 - Artboard 9" },
            { ab: leftTop[3].ab, p: 8,  rot: 180, name: "08 - Artboard 8" },
            { ab: leftBot[0].ab, p: 4,  rot: 0,   name: "04 - Artboard 4" },
            { ab: leftBot[1].ab, p: 13, rot: 0,   name: "13 - Artboard 13" },
            { ab: leftBot[2].ab, p: 16, rot: 0,   name: "16 - Artboard 16" },
            { ab: leftBot[3].ab, p: 1,  rot: 0,   name: "01 - Artboard 1" },
            { ab: rightTop[0].ab, p: 7,  rot: 180, name: "07 - Artboard 7" },
            { ab: rightTop[1].ab, p: 10, rot: 180, name: "10 - Artboard 10" },
            { ab: rightTop[2].ab, p: 11, rot: 180, name: "11 - Artboard 11" },
            { ab: rightTop[3].ab, p: 6,  rot: 180, name: "06 - Artboard 6" },
            { ab: rightBot[0].ab, p: 2,  rot: 0,   name: "02 - Artboard 2" },
            { ab: rightBot[1].ab, p: 15, rot: 0,   name: "15 - Artboard 15" },
            { ab: rightBot[2].ab, p: 14, rot: 0,   name: "14 - Artboard 14" },
            { ab: rightBot[3].ab, p: 3,  rot: 0,   name: "03 - Artboard 3" }
        ];

        for (var am = 0; am < albumMap.length; am++) {
            var mObj = albumMap[am];
            placeOnArtboard(sortedPages[mObj.p - 1], mObj.ab, mObj.rot);
            mObj.ab.name = mObj.name;
        }

        app.redraw();
        alert("\u0986\u09B2\u09B9\u09BE\u09AE\u09A6\u09C1\u09B2\u09BF\u09B2\u09CD\u09B2\u09BE\u09B9!\n\u0985\u09CD\u09AF\u09BE\u09B2\u09AC\u09BE\u09AE \u09E7\u09EC-\u099F\u09BF \u09AA\u09C7\u099C \u09A8\u09BF\u0996\u09C1\u0981\u09A4\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u099A\u09BE\u09B9\u09BF\u09A6\u09BE\u09AE\u09A4\u09CB \u09B0\u09CB\u099F\u09C7\u09B6\u09A8 \u09B8\u09B9 \u09AA\u09CD\u09B2\u09C7\u099F\u09C7 \u09B8\u09BE\u099C\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7!");
        return;
    }

    for (var p = 1; p <= requiredPages; p++) {
        var pageItem = sortedPages[p - 1];
        var destAB = getArtboardForPage(doc, p, requiredPages);
        if (destAB) {
            var rot = getPageRotation(p, requiredPages);
            placeOnArtboard(pageItem, destAB, rot);
        }
    }

    app.redraw();
    alert("\u0986\u09B2\u09B9\u09BE\u09AE\u09A6\u09C1\u09B2\u09BF\u09B2\u09CD\u09B2\u09BE\u09B9!\n\u09E7\u09EC-\u099F\u09BF \u09AA\u09C7\u099C \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09C1\u09A8\u09BF\u09B0\u09CD\u09A6\u09BF\u09B7\u09CD\u099F \u0995\u09B2\u09BE\u09AE \u09B0\u09CB\u099F\u09C7\u09B6\u09A8 \u0985\u09A8\u09C1\u09AF\u09BE\u09DF\u09C0 \u09AA\u09CD\u09B2\u09C7\u099F\u09C7 \u09A8\u09BF\u0996\u09C1\u0981\u09A4\u09AD\u09BE\u09AC\u09C7 \u09B8\u09BE\u099C\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7!");
})();
