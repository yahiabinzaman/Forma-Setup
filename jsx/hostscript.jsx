/**
 * ColorLab Forma Setup Pro - Core ExtendScript Engine
 * Author: Yahia Bin Zaman / ColorLab
 * Host: Adobe Illustrator (CC 2014 - 2026+)
 */

#target illustrator

$.global.FormaEngine = (function () {
    "use strict";

    function toJson(obj) {
        if (obj === null) return "null";
        if (typeof obj === "undefined") return "undefined";
        if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
        if (typeof obj === "string") {
            var s = obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
            var out = '"';
            for (var c = 0; c < s.length; c++) {
                var code = s.charCodeAt(c);
                if (code > 127) {
                    var hex = code.toString(16);
                    while (hex.length < 4) hex = "0" + hex;
                    out += "\\u" + hex;
                } else {
                    out += s.charAt(c);
                }
            }
            return out + '"';
        }
        if (obj instanceof Array) {
            var arrRes = [];
            for (var a = 0; a < obj.length; a++) arrRes.push(toJson(obj[a]));
            return "[" + arrRes.join(",") + "]";
        }
        if (typeof obj === "object") {
            var objRes = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) objRes.push(toJson(key) + ":" + toJson(obj[key]));
            }
            return "{" + objRes.join(",") + "}";
        }
        return '""';
    }

    /**
     * Finds the True Page Trim Bounds [left, top, right, bottom] of a page group.
     * Prevents oversized bleed images, unclipped elements, or stray points from
     * throwing off the page alignment. Allows standard offset bleed (up to 40 pt).
     */
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
                    // Strongly prioritize background elements at the bottom of the group
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
                var isBottom = (i >= count - 3); // bottom 3 items
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

    // Sort artboards by true visual 4x4 spatial grid (Row 1..4, Col 1..4)
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

    // Precise 2-Row Grid Sorter (for 16 pages placed in 2 rows of 8: Row 1 = 1..8, Row 2 = 9..16)
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

    /**
     * 16-Page Offset Imposition Plate Layout:
     *   Row 0: [ Slot 0: Page 8,  Slot 1: Page 1,  Slot 2: Page 2,  Slot 3: Page 7  ]
     *   Row 1: [ Slot 4: Page 9,  Slot 5: Page 16, Slot 6: Page 15, Slot 7: Page 10 ]
     *   Row 2: [ Slot 8: Page 12, Slot 9: Page 13, Slot 10: Page 14, Slot 11: Page 11 ]
     *   Row 3: [ Slot 12: Page 5, Slot 13: Page 4, Slot 14: Page 3, Slot 15: Page 6 ]
     */
    var PAGE_TO_SLOT_16 = {
        1: 1, 2: 2, 3: 14, 4: 13, 5: 12, 6: 15, 7: 3, 8: 0,
        9: 4, 10: 7, 11: 11, 12: 8, 13: 9, 14: 10, 15: 6, 16: 5
    };

    var PAGE_TO_SLOT_8 = {
        1: 1, 2: 2, 3: 6, 4: 5, 5: 4, 6: 7, 7: 3, 8: 0
    };

    /**
     * Exact User-Specified Column Rotations:
     * Col 0: 8, 9, 12, 5  -> Dan dike (Right / Clockwise = 270\u00B0 or -90\u00B0)
     * Col 1: 1, 16, 13, 4 -> Bam dike (Left / Counter-Clockwise = 90\u00B0)
     * Col 2: 2, 15, 14, 3 -> Dan dike (Right / Clockwise = 270\u00B0 or -90\u00B0)
     * Col 3: 7, 10, 11, 6 -> Bam dike (Left / Counter-Clockwise = 90\u00B0)
     */
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

    /**
     * Album 16-Page Front & Back (Jhuri) Imposition Mapping:
     * Left Sheet (Front):
     *   Row 1 (Top): Col 0: Page 5 (180\u00B0), Col 1: Page 12 (180\u00B0), Col 2: Page 9 (180\u00B0), Col 3: Page 8 (180\u00B0)
     *   Row 2 (Bot): Col 0: Page 4 (0\u00B0),   Col 1: Page 13 (0\u00B0),   Col 2: Page 16 (0\u00B0),  Col 3: Page 1 (0\u00B0)
     * Right Sheet (Back):
     *   Row 1 (Top): Col 0: Page 7 (180\u00B0), Col 1: Page 10 (180\u00B0), Col 2: Page 11 (180\u00B0), Col 3: Page 6 (180\u00B0)
     *   Row 2 (Bot): Col 0: Page 2 (0\u00B0),   Col 1: Page 15 (0\u00B0),   Col 2: Page 14 (0\u00B0),  Col 3: Page 3 (0\u00B0)
     */
    var ALBUM_TARGETS = {
        1:  { cx: 600,  cy: -732, rot: 0   }, // Left Sheet, Bot, Col 3
        2:  { cx: 1108, cy: -732, rot: 0   }, // Right Sheet, Bot, Col 0
        3:  { cx: 2426, cy: -732, rot: 0   }, // Right Sheet, Bot, Col 3
        4:  { cx: -717, cy: -732, rot: 0   }, // Left Sheet, Bot, Col 0
        5:  { cx: -717, cy: -96,  rot: 180 }, // Left Sheet, Top, Col 0 (5)
        6:  { cx: 2426, cy: -96,  rot: 180 }, // Right Sheet, Top, Col 3 (6)
        7:  { cx: 1108, cy: -96,  rot: 180 }, // Right Sheet, Top, Col 0 (7)
        8:  { cx: 600,  cy: -96,  rot: 180 }, // Left Sheet, Top, Col 3 (8)
        9:  { cx: 161,  cy: -96,  rot: 180 }, // Left Sheet, Top, Col 2 (9)
        10: { cx: 1548, cy: -96,  rot: 180 }, // Right Sheet, Top, Col 1 (10)
        11: { cx: 1987, cy: -96,  rot: 180 }, // Right Sheet, Top, Col 2 (11)
        12: { cx: -278, cy: -96,  rot: 180 }, // Left Sheet, Top, Col 1 (12)
        13: { cx: -278, cy: -732, rot: 0   }, // Left Sheet, Bot, Col 1 (13)
        14: { cx: 1987, cy: -732, rot: 0   }, // Right Sheet, Bot, Col 2 (14)
        15: { cx: 1548, cy: -732, rot: 0   }, // Right Sheet, Bot, Col 1 (15)
        16: { cx: 161,  cy: -732, rot: 0   }  // Left Sheet, Bot, Col 2 (16)
    };

    var ALBUM_16_ARTBOARD_RECTS = {
        1:  [380.75, -414.14, 819.95, -1050.62],  // Left Sheet, Bot, Col 3
        2:  [888.79, -414.14, 1327.99, -1050.62], // Right Sheet, Bot, Col 0
        3:  [2206.39, -414.14, 2645.59, -1050.62],// Right Sheet, Bot, Col 3
        4:  [-936.85, -414.14, -497.65, -1050.62],// Left Sheet, Bot, Col 0
        5:  [-936.85, 222.34, -497.65, -414.14],  // Left Sheet, Top, Col 0 (5)
        6:  [2206.39, 222.34, 2645.59, -414.14],  // Right Sheet, Top, Col 3 (6)
        7:  [888.79, 222.34, 1327.99, -414.14],   // Right Sheet, Top, Col 0 (7)
        8:  [380.75, 222.34, 819.95, -414.14],   // Left Sheet, Top, Col 3 (8)
        9:  [-58.45, 222.34, 380.75, -414.14],    // Left Sheet, Top, Col 2 (9)
        10: [1327.99, 222.34, 1767.19, -414.14],  // Right Sheet, Top, Col 1 (10)
        11: [1767.19, 222.34, 2206.39, -414.14],  // Right Sheet, Top, Col 2 (11)
        12: [-497.65, 222.34, -58.45, -414.14],   // Left Sheet, Top, Col 1 (12)
        13: [-497.65, -414.14, -58.45, -1050.62], // Left Sheet, Bot, Col 1 (13)
        14: [1767.19, -414.14, 2206.39, -1050.62],// Right Sheet, Bot, Col 2 (14)
        15: [1327.99, -414.14, 1767.19, -1050.62],// Right Sheet, Bot, Col 1 (15)
        16: [-58.45, -414.14, 380.75, -1050.62]   // Left Sheet, Bot, Col 2 (16)
    };

    function findArtboardForSlot(doc, target) {
        var bestAb = null;
        var minDist = 999999;
        for (var a = 0; a < doc.artboards.length; a++) {
            var ab = doc.artboards[a];
            var r = ab.artboardRect;
            var cx = (r[0] + r[2]) / 2;
            var cy = (r[1] + r[3]) / 2;
            var dist = Math.sqrt(Math.pow(cx - target.cx, 2) + Math.pow(cy - target.cy, 2));
            if (dist < minDist) {
                minDist = dist;
                bestAb = ab;
            }
        }
        return (minDist < 300) ? bestAb : null;
    }

    function getAlbum16ArtboardGrid(doc) {
        var abs = [];
        for (var a = 0; a < doc.artboards.length; a++) {
            var ab = doc.artboards[a];
            var r = ab.artboardRect;
            var cx = (r[0] + r[2]) / 2;
            var cy = (r[1] + r[3]) / 2;
            abs.push({ ab: ab, cx: cx, cy: cy });
        }

        if (abs.length < 16) return null;

        // 1. Sort by CX to separate Left 8 (Front Sheet) and Right 8 (Back Sheet)
        abs.sort(function (a, b) { return a.cx - b.cx; });
        var left8 = abs.slice(0, 8);
        var right8 = abs.slice(8, 16);

        // 2. Left Sheet: Sort by CY (top 4 vs bot 4)
        left8.sort(function (a, b) { return b.cy - a.cy; });
        var leftTop = left8.slice(0, 4);
        var leftBot = left8.slice(4, 8);
        // Sort each row from left to right (by CX)
        leftTop.sort(function (a, b) { return a.cx - b.cx; });
        leftBot.sort(function (a, b) { return a.cx - b.cx; });

        // 3. Right Sheet: Sort by CY (top 4 vs bot 4)
        right8.sort(function (a, b) { return b.cy - a.cy; });
        var rightTop = right8.slice(0, 4);
        var rightBot = right8.slice(4, 8);
        // Sort each row from left to right (by CX)
        rightTop.sort(function (a, b) { return a.cx - b.cx; });
        rightBot.sort(function (a, b) { return a.cx - b.cx; });

        return {
            leftTop: [leftTop[0].ab, leftTop[1].ab, leftTop[2].ab, leftTop[3].ab],
            leftBot: [leftBot[0].ab, leftBot[1].ab, leftBot[2].ab, leftBot[3].ab],
            rightTop: [rightTop[0].ab, rightTop[1].ab, rightTop[2].ab, rightTop[3].ab],
            rightBot: [rightBot[0].ab, rightBot[1].ab, rightBot[2].ab, rightBot[3].ab]
        };
    }

    function ensureAlbum16Artboards(doc) {
        while (doc.artboards.length > 1) {
            doc.artboards[doc.artboards.length - 1].remove();
        }
        doc.artboards[0].artboardRect = ALBUM_16_ARTBOARD_RECTS[1];
        doc.artboards[0].name = "01 - Artboard 1";

        for (var p = 2; p <= 16; p++) {
            var newAb = doc.artboards.add(ALBUM_16_ARTBOARD_RECTS[p]);
            newAb.name = (p < 10 ? "0" + p : p) + " - Artboard " + p;
        }
        doc.artboards.setActiveArtboardIndex(0);
    }

    function getArtboardForPage(doc, pageNum, sectionType, requiredPages) {
        if (sectionType === "album_16") {
            // Priority 1: Match by artboard name (e.g. "05 - Artboard 5", "Artboard 5", "12 - Artboard 12")
            for (var a = 0; a < doc.artboards.length; a++) {
                var abName = doc.artboards[a].name;
                var m = abName.match(/Artboard\s*(\d+)/i);
                if (m && parseInt(m[1], 10) === pageNum) {
                    return doc.artboards[a];
                }
            }
            // Priority 2: Match by exact slot position
            var tgt = ALBUM_TARGETS[pageNum];
            if (tgt) {
                var abBySlot = findArtboardForSlot(doc, tgt);
                if (abBySlot) return abBySlot;
            }
        }
        var spatial = getSpatiallySortedArtboards(doc, requiredPages);
        if (spatial && spatial.length >= requiredPages) {
            var slot = (requiredPages === 8) ? PAGE_TO_SLOT_8[pageNum] : PAGE_TO_SLOT_16[pageNum];
            if (slot !== undefined && spatial[slot]) {
                return spatial[slot];
            }
        }
        return (pageNum - 1 < doc.artboards.length) ? doc.artboards[pageNum - 1] : null;
    }

    function getPageRotation(pageNum, sectionType, requiredPages) {
        if (sectionType === "album_16") {
            return (ALBUM_TARGETS[pageNum] !== undefined) ? ALBUM_TARGETS[pageNum].rot : 0;
        }
        if (requiredPages === 8) {
            return (PAGE_ROTATION_8[pageNum] !== undefined) ? PAGE_ROTATION_8[pageNum] : 90;
        }
        return (PAGE_ROTATION_16[pageNum] !== undefined) ? PAGE_ROTATION_16[pageNum] : 90;
    }

    function repairRotatedClippingMasks(item) {
        if (!item || item.typename !== "GroupItem") return;
        try {
            if (item.clipped) {
                // If the clipped group contains a single-item Group wrapper, unwrap it to fix Illustrator clipping bug
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
        var doc = app.activeDocument;
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

    function updatePlateSlugText(doc, jobNameBn) {
        // Disabled: User manually places job name on plate slug.
        // Completely disabled to protect artwork text frames (such as poems, titles containing "\u0986\u09B2\u09AC\u09BF\u09A6\u09BE" or "\u0986\u09B2", etc.).
        return 0;
    }

    function isAlbumDoc(doc, sectionType) {
        if (!doc) return false;
        if (sectionType === "album_16" || sectionType === "album_8") return true;

        // 1. Check document name
        var lower = doc.name.toLowerCase();
        if (lower.indexOf("album") !== -1 || lower.indexOf("jhuri") !== -1 ||
            lower.indexOf("front & back") !== -1 || lower.indexOf("back to back") !== -1 ||
            doc.name.indexOf("\u0986\u09B2") !== -1 || // \u0986\u09B2
            doc.name.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995") !== -1 || // \u09AC\u09CD\u09AF\u09BE\u0995
            doc.name.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 || // \u099C\u09C1\u09DC\u09BF
            doc.name.indexOf("\u099D\u09C1\u09DC\u09BF") !== -1) { // \u099D\u09C1\u09DC\u09BF
            return true;
        }

        // 2. Check artboard names (e.g. "Front Sheet", "Back Sheet", or "05 - Artboard 5" at top-left)
        for (var a = 0; a < doc.artboards.length; a++) {
            var abName = doc.artboards[a].name.toLowerCase();
            if (abName.indexOf("front sheet") !== -1 || abName.indexOf("back sheet") !== -1) {
                return true;
            }
        }

        // 3. Check 16 artboards portrait orientation (Album pages are portrait, inner/note sheets are landscape)
        if (doc.artboards.length === 16) {
            var r = doc.artboards[0].artboardRect;
            var w = Math.abs(r[2] - r[0]);
            var h = Math.abs(r[1] - r[3]);
            if (h > w) return true;
        }

        // 4. Check text frame contents (looking for "\u09AC\u09CD\u09AF\u09BE\u0995 \u099F\u09C1 \u09AC\u09CD\u09AF\u09BE\u0995", "\u0986\u09B2 - ", or "\u099C\u09C1\u09DC\u09BF")
        try {
            for (var t = 0; t < doc.textFrames.length; t++) {
                var tc = doc.textFrames[t].contents;
                if (tc.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995 \u099F\u09C1 \u09AC\u09CD\u09AF\u09BE\u0995") !== -1 || // \u09AC\u09CD\u09AF\u09BE\u0995 \u099F\u09C1 \u09AC\u09CD\u09AF\u09BE\u0995
                    tc.indexOf("\u0986\u09B2 -") !== -1 || // \u0986\u09B2 -
                    tc.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 || // \u099C\u09C1\u09DC\u09BF
                    tc.indexOf("Back to Back") !== -1) {
                    return true;
                }
            }
        } catch (e) {}

        return false;
    }

    function setupAlbumSheetArtboards(doc) {
        for (var l = 0; l < doc.layers.length; l++) {
            doc.layers[l].locked = false;
            doc.layers[l].visible = true;
        }
        try { app.executeMenuCommand("unlockAll"); } catch (e) {}
        try { app.executeMenuCommand("showAll"); } catch (e) {}

        // 1. Calculate dynamic horizontal divider (DIVIDER_X) and artboard bounds
        var DIVIDER_X = null;
        var abLeftBounds = null;
        var abRightBounds = null;

        if (doc.artboards.length >= 16) {
            var abs = [];
            for (var a = 0; a < doc.artboards.length; a++) {
                var ab = doc.artboards[a];
                var r = ab.artboardRect;
                var l_ = Math.min(r[0], r[2]);
                var r_ = Math.max(r[0], r[2]);
                var t_ = Math.max(r[1], r[3]);
                var b_ = Math.min(r[1], r[3]);
                abs.push({
                    ab: ab,
                    left: l_,
                    right: r_,
                    top: t_,
                    bottom: b_,
                    cx: (l_ + r_) / 2,
                    cy: (t_ + b_) / 2
                });
            }

            // Sort artboards by CX: first 8 are Left Sheet (Front), next 8 are Right Sheet (Back)
            abs.sort(function (a, b) { return a.cx - b.cx; });
            var left8 = abs.slice(0, 8);
            var right8 = abs.slice(8, 16);

            var maxLeftAbX = -999999, minLeftAbX = 999999, maxLeftAbY = -999999, minLeftAbY = 999999;
            for (var i = 0; i < 8; i++) {
                if (left8[i].right > maxLeftAbX) maxLeftAbX = left8[i].right;
                if (left8[i].left < minLeftAbX) minLeftAbX = left8[i].left;
                if (left8[i].top > maxLeftAbY) maxLeftAbY = left8[i].top;
                if (left8[i].bottom < minLeftAbY) minLeftAbY = left8[i].bottom;
            }

            var minRightAbX = 999999, maxRightAbX = -999999, maxRightAbY = -999999, minRightAbY = 999999;
            for (var j = 0; j < 8; j++) {
                if (right8[j].left < minRightAbX) minRightAbX = right8[j].left;
                if (right8[j].right > maxRightAbX) maxRightAbX = right8[j].right;
                if (right8[j].top > maxRightAbY) maxRightAbY = right8[j].top;
                if (right8[j].bottom < minRightAbY) minRightAbY = right8[j].bottom;
            }

            DIVIDER_X = (maxLeftAbX + minRightAbX) / 2;
            abLeftBounds = [minLeftAbX, maxLeftAbY, maxLeftAbX, minLeftAbY];
            abRightBounds = [minRightAbX, maxRightAbY, maxRightAbX, minRightAbY];
        } else if (doc.artboards.length === 2) {
            var r0 = doc.artboards[0].artboardRect;
            var r1 = doc.artboards[1].artboardRect;
            var r0_left = Math.min(r0[0], r0[2]);
            var r0_right = Math.max(r0[0], r0[2]);
            var r1_left = Math.min(r1[0], r1[2]);
            var r1_right = Math.max(r1[0], r1[2]);
            if (r0_right < r1_left) {
                DIVIDER_X = (r0_right + r1_left) / 2;
            } else if (r1_right < r0_left) {
                DIVIDER_X = (r1_right + r0_left) / 2;
            } else {
                DIVIDER_X = (Math.min(r0_left, r1_left) + Math.max(r0_right, r1_right)) / 2;
            }
        }

        // Fallback: calculate horizontal midpoint from artwork items
        if (DIVIDER_X === null) {
            var allMinX = 999999, allMaxX = -999999;
            for (var lIdx = 0; lIdx < doc.layers.length; lIdx++) {
                var lyr = doc.layers[lIdx];
                for (var itIdx = 0; itIdx < lyr.pageItems.length; itIdx++) {
                    var pIt = lyr.pageItems[itIdx];
                    if (pIt.guides) continue;
                    var b = pIt.geometricBounds;
                    if (b[0] < allMinX) allMinX = b[0];
                    if (b[2] > allMaxX) allMaxX = b[2];
                }
            }
            if (allMinX < allMaxX) {
                DIVIDER_X = (allMinX + allMaxX) / 2;
            } else {
                DIVIDER_X = 0;
            }
        }

        // 2. Scan all page items on both sides of DIVIDER_X
        var minX_L = abLeftBounds ? abLeftBounds[0] : 999999;
        var maxY_L = abLeftBounds ? abLeftBounds[1] : -999999;
        var maxX_L = abLeftBounds ? abLeftBounds[2] : -999999;
        var minY_L = abLeftBounds ? abLeftBounds[3] : 999999;

        var minX_R = abRightBounds ? abRightBounds[0] : 999999;
        var maxY_R = abRightBounds ? abRightBounds[1] : -999999;
        var maxX_R = abRightBounds ? abRightBounds[2] : -999999;
        var minY_R = abRightBounds ? abRightBounds[3] : 999999;

        var foundL = (abLeftBounds !== null);
        var foundR = (abRightBounds !== null);

        for (var iLay = 0; iLay < doc.layers.length; iLay++) {
            var curLay = doc.layers[iLay];
            for (var j = 0; j < curLay.pageItems.length; j++) {
                var it = curLay.pageItems[j];
                if (it.guides) continue; // skip ruler guides
                var gb = it.geometricBounds;
                var cx = (gb[0] + gb[2]) / 2;

                if (cx < DIVIDER_X) {
                    if (gb[0] < minX_L) minX_L = gb[0];
                    if (gb[1] > maxY_L) maxY_L = gb[1];
                    if (gb[2] > maxX_L) maxX_L = gb[2];
                    if (gb[3] < minY_L) minY_L = gb[3];
                    foundL = true;
                } else {
                    if (gb[0] < minX_R) minX_R = gb[0];
                    if (gb[1] > maxY_R) maxY_R = gb[1];
                    if (gb[2] > maxX_R) maxX_R = gb[2];
                    if (gb[3] < minY_R) minY_R = gb[3];
                    foundR = true;
                }
            }
        }

        // Strict boundary protection: sheets must NEVER overlap across DIVIDER_X
        if (maxX_L > DIVIDER_X) maxX_L = DIVIDER_X;
        if (minX_R < DIVIDER_X) minX_R = DIVIDER_X;

        // Ensure vertical bounds are aligned for printing
        var commonTop = Math.max(maxY_L, maxY_R);
        var commonBottom = Math.min(minY_L, minY_R);

        var bLeft = [minX_L, commonTop, maxX_L, commonBottom];
        var bRight = [minX_R, commonTop, maxX_R, commonBottom];

        if (!foundL || !foundR) {
            throw new Error("\u0985\u09CD\u09AF\u09BE\u09B2\u09AC\u09BE\u09AE \u09B6\u09BF\u099F\u09C7\u09B0 \u09AC\u09BE\u0989\u09A8\u09CD\u09A1\u09B8 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF!");
        }

        // 3. Set exactly 2 fitted artboards without modifying or destroying user page groups/masks
        while (doc.artboards.length > 1) {
            doc.artboards[doc.artboards.length - 1].remove();
        }
        doc.artboards[0].artboardRect = bLeft;
        doc.artboards[0].name = "01 - Front Sheet";

        var ab2 = doc.artboards.add(bRight);
        ab2.name = "02 - Back Sheet";

        doc.artboards.setActiveArtboardIndex(0);
        app.redraw();

        var w1 = Math.round(((bLeft[2] - bLeft[0]) / 72) * 100) / 100;
        var h1 = Math.round(((bLeft[1] - bLeft[3]) / 72) * 100) / 100;
        var w2 = Math.round(((bRight[2] - bRight[0]) / 72) * 100) / 100;
        var h2 = Math.round(((bRight[1] - bRight[3]) / 72) * 100) / 100;

        return { w1: w1, h1: h1, w2: w2, h2: h2 };
    }

    function isItemInRoots(it, roots) {
        if (!it || !roots) return false;
        var curr = it;
        while (curr) {
            for (var r = 0; r < roots.length; r++) {
                if (curr === roots[r]) return true;
            }
            if (curr.parent && curr.parent.typename !== "Layer" && curr.parent.typename !== "Document") {
                curr = curr.parent;
            } else {
                break;
            }
        }
 
    }

    function isTemplateNumberCandidate(it) {
        if (!it) return false;
        if (it.guides || it.clipping || it.clipped) return false;
        var tn = it.typename;
        if (tn === "PlacedItem" || tn === "RasterItem" || tn === "MeshItem" || tn === "TextFrame") return false;

        if (tn === "GroupItem") {
            // Must have 1 to 5 children, none of which are images, text, or clipping masks
            if (!it.pageItems || it.pageItems.length === 0 || it.pageItems.length > 5) return false;
            for (var g = 0; g < it.pageItems.length; g++) {
                var ch = it.pageItems[g];
                var ctn = ch.typename;
                if (ctn === "PlacedItem" || ctn === "RasterItem" || ctn === "MeshItem" || ctn === "TextFrame" || ch.clipping || ch.clipped) {
                    return false;
                }
            }
            return true;
        }

        if (tn === "CompoundPathItem" || tn === "PathItem") {
            return true;
        }

        return false;
    }

    function cleanGridNumbers(doc, userSelItems) {
        var removed = 0;

        function checkAndRemove(it) {
            if (!it) return false;
            // NEVER touch anything that is part of the user's selected artwork!
            if (userSelItems && isItemInRoots(it, userSelItems)) return false;

            if (!isTemplateNumberCandidate(it)) return false;

            var gb;
            try { gb = it.geometricBounds; } catch (e) { return false; }
            if (!gb) return false;
            var w = Math.abs(gb[2] - gb[0]);
            var h = Math.abs(gb[1] - gb[3]);

            // Template guide numbers are 30-260 pt wide, 50-220 pt tall
            if (w < 30 || w > 260 || h < 50 || h > 220) return false;

            var cx = (gb[0] + gb[2]) / 2;
            var cy = (gb[1] + gb[3]) / 2;

            for (var p = 1; p <= 16; p++) {
                var tgt = ALBUM_TARGETS[p];
                // Match slot center within 40 pt
                if (Math.abs(cx - tgt.cx) < 40 && Math.abs(cy - tgt.cy) < 40) {
                    try {
                        it.remove();
                        removed++;
                        return true;
                    } catch (eRem) {}
                }
            }
            return false;
        }

        function scanItems(parent) {
            if (!parent || !parent.pageItems) return;
            for (var i = parent.pageItems.length - 1; i >= 0; i--) {
                var it = parent.pageItems[i];
                // NEVER scan inside user selected items!
                if (userSelItems && isItemInRoots(it, userSelItems)) continue;

                if (it.typename === "GroupItem") {
                    if (checkAndRemove(it)) continue;
                    scanItems(it);
                } else if (it.typename === "CompoundPathItem" || it.typename === "PathItem") {
                    checkAndRemove(it);
                }
            }
        }

        for (var l = 0; l < doc.layers.length; l++) {
            var lay = doc.layers[l];
            scanItems(lay);
        }
        return removed;
    }

    function getRootItemOnLayer(item) {
        var curr = item;
        while (curr.parent && curr.parent.typename !== "Layer" && curr.parent.typename !== "Document") {
            curr = curr.parent;
        }
        return curr;
    }

    function getUniqueRootSelectedItems(items) {
        if (!items) return [];
        var roots = [];
        for (var i = 0; i < items.length; i++) {
            var root = getRootItemOnLayer(items[i]);
            var already = false;
            for (var r = 0; r < roots.length; r++) {
                if (roots[r] === root) { already = true; break; }
                var b1 = roots[r].geometricBounds;
                var b2 = root.geometricBounds;
                if (b1[0] === b2[0] && b1[1] === b2[1] && b1[2] === b2[2] && b1[3] === b2[3]) {
                    already = true;
                    break;
                }
            }
            if (!already) {
                roots.push(root);
            }
        }
        return roots;
    }

    return {
        executeImposition: function (paramsJson) {
            try {
                if (app.documents.length === 0) {
                    return toJson({ success: false, error: "Illustrator-e kono document open nei!" });
                }

                var params = null;
                if (typeof paramsJson === "string") {
                    eval("params = " + paramsJson + ";");
                } else {
                    params = paramsJson;
                }
                if (!params) throw new Error("Invalid parameters.");

                var doc = app.activeDocument;
                var rawSel = doc.selection;
                var sel = getUniqueRootSelectedItems(rawSel);

                var is8Page = (params.sectionType === "album_8");
                var requiredPages = is8Page ? 8 : 16;

                if (!sel || sel.length === 0) {
                    return toJson({
                        success: false,
                        error: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AB\u09BE\u0987\u09B2\u09C7 " + requiredPages + "-\u099F\u09BF \u09AA\u09C7\u099C \u098F\u09A8\u09C7 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F (Select) \u0995\u09B0\u09C1\u09A8!\n\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u0995\u09CB\u09A8\u09CB \u0985\u09AC\u099C\u09C7\u0995\u09CD\u099F \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09BE \u09A8\u09C7\u0987\u0964"
                    });
                }

                if (sel.length !== requiredPages) {
                    return toJson({
                        success: false,
                        error: "\u09A0\u09BF\u0995 " + requiredPages + "-\u099F\u09BF \u09AA\u09C7\u099C \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C1\u09A8!\n\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09BE \u0986\u099B\u09C7: " + sel.length + " \u099F\u09BF\u0964"
                    });
                }

                // If Album 16, clean template grid numbers (protecting user's selected artwork!)
                if (params.sectionType === "album_16") {
                    cleanGridNumbers(doc, sel);
                    if (doc.artboards.length < 16) {
                        ensureAlbum16Artboards(doc);
                    }
                } else {
                    if (doc.artboards.length < requiredPages) {
                        return toJson({
                            success: false,
                            error: "\u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F\u09C7 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 " + requiredPages + "-\u099F\u09BF \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7!\n\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8\u09C7 \u0986\u099B\u09C7: " + doc.artboards.length + " \u099F\u09BF\u0964"
                        });
                    }
                }

                // Sort selected pages in 1 to 16 sequence (Row 1: 1..8, Row 2: 9..16)
                var sortedPages = sortSelected16Pages(sel);

                if (params.sectionType === "album_16") {
                    var grid = getAlbum16ArtboardGrid(doc);
                    if (!grid) {
                        throw new Error("\u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F\u09C7 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09E7\u09EC\u099F\u09BF \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1 \u09A5\u09BE\u0995\u09A4\u09C7 \u09B9\u09AC\u09C7!");
                    }

                    // Precise physical slot mapping matching Image 3 & UI Preview:
                    var albumMappings = [
                        // Left Sheet (Front Sheet)
                        // Top Row (180 deg): Col 0 -> Page 5, Col 1 -> Page 12, Col 2 -> Page 9, Col 3 -> Page 8
                        { ab: grid.leftTop[0], pageNum: 5,  rot: 180, name: "05 - Artboard 5" },
                        { ab: grid.leftTop[1], pageNum: 12, rot: 180, name: "12 - Artboard 12" },
                        { ab: grid.leftTop[2], pageNum: 9,  rot: 180, name: "09 - Artboard 9" },
                        { ab: grid.leftTop[3], pageNum: 8,  rot: 180, name: "08 - Artboard 8" },
                        // Bot Row (0 deg):   Col 0 -> Page 4, Col 1 -> Page 13, Col 2 -> Page 16, Col 3 -> Page 1
                        { ab: grid.leftBot[0], pageNum: 4,  rot: 0,   name: "04 - Artboard 4" },
                        { ab: grid.leftBot[1], pageNum: 13, rot: 0,   name: "13 - Artboard 13" },
                        { ab: grid.leftBot[2], pageNum: 16, rot: 0,   name: "16 - Artboard 16" },
                        { ab: grid.leftBot[3], pageNum: 1,  rot: 0,   name: "01 - Artboard 1" },

                        // Right Sheet (Back Sheet)
                        // Top Row (180 deg): Col 0 -> Page 7, Col 1 -> Page 10, Col 2 -> Page 11, Col 3 -> Page 6
                        { ab: grid.rightTop[0], pageNum: 7,  rot: 180, name: "07 - Artboard 7" },
                        { ab: grid.rightTop[1], pageNum: 10, rot: 180, name: "10 - Artboard 10" },
                        { ab: grid.rightTop[2], pageNum: 11, rot: 180, name: "11 - Artboard 11" },
                        { ab: grid.rightTop[3], pageNum: 6,  rot: 180, name: "06 - Artboard 6" },
                        // Bot Row (0 deg):   Col 0 -> Page 2, Col 1 -> Page 15, Col 2 -> Page 14, Col 3 -> Page 3
                        { ab: grid.rightBot[0], pageNum: 2,  rot: 0,   name: "02 - Artboard 2" },
                        { ab: grid.rightBot[1], pageNum: 15, rot: 0,   name: "15 - Artboard 15" },
                        { ab: grid.rightBot[2], pageNum: 14, rot: 0,   name: "14 - Artboard 14" },
                        { ab: grid.rightBot[3], pageNum: 3,  rot: 0,   name: "03 - Artboard 3" }
                    ];

                    for (var m = 0; m < albumMappings.length; m++) {
                        var map = albumMappings[m];
                        var pageItem = sortedPages[map.pageNum - 1];
                        placeOnArtboard(pageItem, map.ab, map.rot);
                        map.ab.name = map.name;
                    }

                } else {
                    // Standard Inner / Note Imposition Mapping
                    for (var p = 1; p <= requiredPages; p++) {
                        var pageItem = sortedPages[p - 1];
                        var destAB = getArtboardForPage(doc, p, params.sectionType, requiredPages);
                        if (destAB) {
                            var rot = getPageRotation(p, params.sectionType, requiredPages);
                            placeOnArtboard(pageItem, destAB, rot);
                        }
                    }
                }

                app.redraw();
                return toJson({
                    success: true,
                    message: "\u0986\u09B2\u09B9\u09BE\u09AE\u09A6\u09C1\u09B2\u09BF\u09B2\u09CD\u09B2\u09BE\u09B9! \u09AA\u09C7\u099C \u09E7 \u09B9\u09A4\u09C7 " + requiredPages + " \u09A8\u09BF\u0996\u09C1\u0981\u09A4\u09AD\u09BE\u09AC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u099A\u09BE\u09B9\u09BF\u09A6\u09BE\u09AE\u09A4\u09CB \u09B0\u09CB\u099F\u09C7\u09B6\u09A8 \u09B8\u09B9 \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 \u09B8\u09BE\u099C\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
                });

            } catch (ex) {
                return toJson({ success: false, error: ex.message });
            }
        },

        executePrintDemo: function (sectionType) {
            try {
                if (app.documents.length === 0) {
                    return toJson({ success: false, error: "\u0995\u09CB\u09A8\u09CB \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09BE \u09A8\u09C7\u0987!" });
                }
                var doc = app.activeDocument;

                // Check Album (Jhuri / Front & Back)
                if (isAlbumDoc(doc, sectionType)) {
                    var albSheets = setupAlbumSheetArtboards(doc);
                    app.executeMenuCommand("Print");
                    return toJson({
                        success: true,
                        message: "\u0985\u09CD\u09AF\u09BE\u09B2\u09AC\u09BE\u09AE \u09A1\u09C7\u09AE\u09CB \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 (\u09B8\u09BE\u09AE\u09A8\u09C7: " + albSheets.w1 + "x" + albSheets.h1 + " in, \u09AA\u09C7\u099B\u09A8\u09C7: " + albSheets.w2 + "x" + albSheets.h2 + " in)\u0964"
                    });
                }

                // 1. Unlock all layers and items (instant native)
                for (var l = 0; l < doc.layers.length; l++) {
                    doc.layers[l].locked = false;
                    doc.layers[l].visible = true;
                }
                try { app.executeMenuCommand("unlockAll"); } catch (e) {}
                try { app.executeMenuCommand("showAll"); } catch (e) {}

                // 2. Keep only 1 artboard, remove the rest
                while (doc.artboards.length > 1) {
                    doc.artboards[doc.artboards.length - 1].remove();
                }
                doc.artboards.setActiveArtboardIndex(0);

                // 3. Fit remaining artboard to artwork bounds
                app.executeMenuCommand("Fit Artboard to artwork bounds");

                var rect = doc.artboards[0].artboardRect;
                var left = rect[0];
                var top = rect[1];
                var right = rect[2];
                var bottom = rect[3];

                var totalW = right - left;
                var totalH = top - bottom;
                var halfW = totalW / 2;

                // 4. Left half artboard (reference point left)
                doc.artboards[0].artboardRect = [left, top, left + halfW, bottom];
                doc.artboards[0].name = "01 - Left (Half)";

                // 5. Right half artboard
                var ab2 = doc.artboards.add([left + halfW, top, right, bottom]);
                ab2.name = "02 - Right (Half)";

                doc.artboards.setActiveArtboardIndex(0);
                app.redraw();

                // 6. Open Print Dialog (modal)
                app.executeMenuCommand("Print");

                // 7. After Print Dialog is closed: restore to single full sheet artboard
                while (doc.artboards.length > 1) {
                    doc.artboards[doc.artboards.length - 1].remove();
                }
                doc.artboards.setActiveArtboardIndex(0);
                app.executeMenuCommand("Fit Artboard to artwork bounds");
                app.redraw();

                var finalRect = doc.artboards[0].artboardRect;
                var finalW = Math.round(((finalRect[2] - finalRect[0]) / 72) * 100) / 100;
                var finalH = Math.round(((finalRect[1] - finalRect[3]) / 72) * 100) / 100;

                return toJson({
                    success: true,
                    message: "\u09A1\u09C7\u09AE\u09CB \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u098F\u09AC\u0982 \u09AE\u09C2\u09B2 \u09B6\u09BF\u099F \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1\u09C7 (" + finalW + "x" + finalH + " in) \u09B0\u09BF\u09B8\u09CD\u099F\u09CB\u09B0 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
                });

            } catch (ex) {
                return toJson({ success: false, error: ex.message });
            }
        },

        restoreFullSheet: function (sectionType) {
            try {
                if (app.documents.length === 0) {
                    return toJson({ success: false, error: "\u0995\u09CB\u09A8\u09CB \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09BE \u09A8\u09C7\u0987!" });
                }
                var doc = app.activeDocument;

                // Check Album (Jhuri / Front & Back)
                if (isAlbumDoc(doc, sectionType)) {
                    var albSheets = setupAlbumSheetArtboards(doc);
                    return toJson({
                        success: true,
                        message: "\u0985\u09CD\u09AF\u09BE\u09B2\u09AC\u09BE\u09AE \u09E8\u099F\u09BF \u09B6\u09BF\u099F \u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1 (\u09B8\u09BE\u09AE\u09A8\u09C7: " + albSheets.w1 + "x" + albSheets.h1 + " in, \u09AA\u09C7\u099B\u09A8\u09C7: " + albSheets.w2 + "x" + albSheets.h2 + " in) \u09AB\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
                    });
                }

                // Unlock layers/items (instant native)
                for (var l = 0; l < doc.layers.length; l++) {
                    doc.layers[l].locked = false;
                    doc.layers[l].visible = true;
                }
                try { app.executeMenuCommand("unlockAll"); } catch (e) {}
                try { app.executeMenuCommand("showAll"); } catch (e) {}

                while (doc.artboards.length > 1) {
                    doc.artboards[doc.artboards.length - 1].remove();
                }
                doc.artboards.setActiveArtboardIndex(0);
                app.executeMenuCommand("Fit Artboard to artwork bounds");
                app.redraw();

                var finalRect = doc.artboards[0].artboardRect;
                var finalW = Math.round(((finalRect[2] - finalRect[0]) / 72) * 100) / 100;
                var finalH = Math.round(((finalRect[1] - finalRect[3]) / 72) * 100) / 100;

                return toJson({
                    success: true,
                    message: "\u0986\u09B0\u09CD\u099F\u09AC\u09CB\u09B0\u09CD\u09A1 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AA\u09C1\u09B0\u09CB \u09B6\u09BF\u099F \u09AC\u09BE\u0989\u09A8\u09CD\u09B8\u09C7 (" + finalW + "x" + finalH + " in) \u09AB\u09BF\u099F \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964"
                });

            } catch (ex) {
                return toJson({ success: false, error: ex.message });
            }
        },

        getActiveDocJobName: function () {
            try {
                if (app.documents.length === 0) return "";
                var name = app.activeDocument.name;
                var match = name.match(/@([^.]+)/);
                if (match && match[1]) {
                    var cand = match[1].replace(/^\s+|\s+$/g, "").replace(/\s*\d+$/, "");
                    if (cand.length > 0) return cand;
                }
                for (var i = 0; i < app.documents.length; i++) {
                    var dMatch = app.documents[i].name.match(/@([^.]+)/);
                    if (dMatch && dMatch[1]) {
                        var cand2 = dMatch[1].replace(/^\s+|\s+$/g, "").replace(/\s*\d+$/, "");
                        if (cand2.length > 0) return cand2;
                    }
                }
                return "";
            } catch (e) {
                return "";
            }
        },

        getActiveDocInfo: function () {
            try {
                if (app.documents.length === 0) return toJson({ hasDoc: false });
                var doc = app.activeDocument;
                var name = doc.name;
                var abCount = doc.artboards.length;
                var jobName = "";
                var match = name.match(/@([^.]+)/);
                if (match && match[1]) {
                    jobName = match[1].replace(/^\s+|\s+$/g, "").replace(/\s*\d+$/, "");
                }
                if (!jobName || jobName.length === 0) {
                    for (var i = 0; i < app.documents.length; i++) {
                        var dMatch = app.documents[i].name.match(/@([^.]+)/);
                        if (dMatch && dMatch[1]) {
                            var cand = dMatch[1].replace(/^\s+|\s+$/g, "").replace(/\s*\d+$/, "");
                            if (cand.length > 0) {
                                jobName = cand;
                                break;
                            }
                        }
                    }
                }

                var detectedType = "inner_16";
                var lower = name.toLowerCase();
                if (lower.indexOf("album") !== -1 || lower.indexOf("jhuri") !== -1 ||
                    lower.indexOf("front & back") !== -1 || lower.indexOf("back to back") !== -1 ||
                    name.indexOf("\u0986\u09B2") !== -1 || name.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995") !== -1 ||
                    name.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 || name.indexOf("\u099D\u09C1\u09DC\u09BF") !== -1) {
                    detectedType = "album_16";
                } else if (lower.indexOf("note") !== -1 || name.indexOf("\u09A8\u09CB\u099F") !== -1) {
                    detectedType = "note_16";
                } else if (lower.indexOf("inner") !== -1 || name.indexOf("\u0987\u09A8\u09BE\u09B0") !== -1) {
                    detectedType = "inner_16";
                } else if (doc.artboards.length === 16) {
                    var r0 = doc.artboards[0].artboardRect;
                    var w0 = Math.abs(r0[2] - r0[0]);
                    var h0 = Math.abs(r0[1] - r0[3]);
                    if (h0 > w0) detectedType = "album_16";
                }

                // Also check text frame contents if still inner_16
                if (detectedType === "inner_16") {
                    try {
                        for (var tScan = 0; tScan < doc.textFrames.length; tScan++) {
                            var tcScan = doc.textFrames[tScan].contents;
                            if (tcScan.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995 \u099F\u09C1 \u09AC\u09CD\u09AF\u09BE\u0995") !== -1 || 
                                tcScan.indexOf("\u0986\u09B2 -") !== -1 || 
                                tcScan.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 ||
                                tcScan.indexOf("Back to Back") !== -1) {
                                detectedType = "album_16";
                                break;
                            }
                        }
                    } catch (eScan) {}
                }

                return toJson({
                    hasDoc: true,
                    name: name,
                    jobName: jobName,
                    artboards: abCount,
                    detectedType: detectedType
                });
            } catch (e) {
                return toJson({ hasDoc: false, error: e.message });
            }
        },

        executeCtpPrep: function (paramsOrJobName) {
            try {
                if (app.documents.length === 0) {
                    return toJson({ success: false, error: "\u0995\u09CB\u09A8\u09CB \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09BE \u09A8\u09C7\u0987!" });
                }
                var doc = app.activeDocument;
                var report = [];

                var params = {};
                if (typeof paramsOrJobName === "string" && paramsOrJobName.indexOf("{") === 0) {
                    try { eval("params = " + paramsOrJobName + ";"); } catch(e){}
                } else if (typeof paramsOrJobName === "object" && paramsOrJobName !== null) {
                    params = paramsOrJobName;
                } else {
                    params = { jobNameBn: paramsOrJobName };
                }

                var jobNameBn = params.jobNameBn || "";
                var sectionType = params.sectionType || "";
                var colorMode = params.colorMode || "auto"; // "auto", "4color", "2color"

                // 1. Unlock all layers and items so they can be processed (instant native)
                for (var l = 0; l < doc.layers.length; l++) {
                    doc.layers[l].locked = false;
                    doc.layers[l].visible = true;
                }
                try { app.executeMenuCommand("unlockAll"); } catch (e) {}
                try { app.executeMenuCommand("showAll"); } catch (e) {}

                // 2. Color Mode Check: 4-Color (CMYK Full Color) vs 2-Color (Cyan & Black Only)
                var is4Color = false;
                if (colorMode === "4color") {
                    is4Color = true;
                } else if (colorMode === "2color") {
                    is4Color = false;
                } else {
                    // Auto: Album and "4 Color" docs are 4-Color; Inner and Note are 2-Color
                    var docLower = doc.name.toLowerCase();
                    if (isAlbumDoc(doc, sectionType) || docLower.indexOf("4 color") !== -1 || docLower.indexOf("album") !== -1 || docLower.indexOf("jhuri") !== -1) {
                        is4Color = true;
                    }
                }

                if (is4Color) {
                    report.push("\u09EA-\u0995\u09BE\u09B2\u09BE\u09B0 \u09B8\u09BF\u098F\u09AE\u0993\u09DF\u09BE\u0987\u0995\u09C7: \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u0995\u09BE\u09B2\u09BE\u09B0 \u0985\u0995\u09CD\u09B7\u09C1\u09A3\u09CD\u09A3 \u09B0\u09BE\u0996\u09BE \u09B9\u09DF\u09C7\u099B\u09C7");
                } else {
                    // Remove Magenta & Yellow (Clean for Cyan + Black 2-Color)
                    try {
                        for (var s = 0; s < doc.swatches.length; s++) {
                            var sw = doc.swatches[s];
                            if (sw.color && sw.color.typename === "CMYKColor") {
                                var swC = sw.color;
                                if (swC.magenta > 0 || swC.yellow > 0) {
                                    swC.magenta = 0;
                                    swC.yellow = 0;
                                    sw.color = swC;
                                }
                            }
                        }
                    } catch(e) {}

                    var cleanedColors = 0;
                    function cleanItemColor(item) {
                        if (!item) return;
                        try {
                            if (item.typename === "PathItem") {
                                if (item.filled && item.fillColor && item.fillColor.typename === "CMYKColor") {
                                    var fc = item.fillColor;
                                    if (fc.magenta > 0 || fc.yellow > 0) {
                                        fc.magenta = 0;
                                        fc.yellow = 0;
                                        item.fillColor = fc;
                                        cleanedColors++;
                                    }
                                }
                                if (item.stroked && item.strokeColor && item.strokeColor.typename === "CMYKColor") {
                                    var sc = item.strokeColor;
                                    if (sc.magenta > 0 || sc.yellow > 0) {
                                        sc.magenta = 0;
                                        sc.yellow = 0;
                                        item.strokeColor = sc;
                                        cleanedColors++;
                                    }
                                }
                            } else if (item.typename === "GroupItem") {
                                for (var g = 0; g < item.pageItems.length; g++) {
                                    cleanItemColor(item.pageItems[g]);
                                }
                            } else if (item.typename === "CompoundPathItem") {
                                for (var cp = 0; cp < item.pathItems.length; cp++) {
                                    cleanItemColor(item.pathItems[cp]);
                                }
                            } else if (item.typename === "TextFrame") {
                                for (var trIdx = 0; trIdx < item.textRanges.length; trIdx++) {
                                    var tr = item.textRanges[trIdx];
                                    if (tr.characterAttributes.fillColor && tr.characterAttributes.fillColor.typename === "CMYKColor") {
                                        var tfc = tr.characterAttributes.fillColor;
                                        if (tfc.magenta > 0 || tfc.yellow > 0) {
                                            tfc.magenta = 0;
                                            tfc.yellow = 0;
                                            tr.characterAttributes.fillColor = tfc;
                                            cleanedColors++;
                                        }
                                    }
                                    if (tr.characterAttributes.strokeColor && tr.characterAttributes.strokeColor.typename === "CMYKColor") {
                                        var tsc = tr.characterAttributes.strokeColor;
                                        if (tsc.magenta > 0 || tsc.yellow > 0) {
                                            tsc.magenta = 0;
                                            tsc.yellow = 0;
                                            tr.characterAttributes.strokeColor = tsc;
                                            cleanedColors++;
                                        }
                                    }
                                }
                            }
                        } catch(e) {}
                    }

                    for (var lyrIdx = 0; lyrIdx < doc.layers.length; lyrIdx++) {
                        var curLyr = doc.layers[lyrIdx];
                        for (var pi = 0; pi < curLyr.pageItems.length; pi++) {
                            cleanItemColor(curLyr.pageItems[pi]);
                        }
                    }
                    report.push("\u09E8-\u0995\u09BE\u09B2\u09BE\u09B0: \u09AE\u09CD\u09AF\u09BE\u099C\u09C7\u09A8\u09CD\u099F\u09BE \u0993 \u0987\u09DF\u09C7\u09B2\u09CB \u0985\u09AA\u09B8\u09BE\u09B0\u09BF\u09A4 (" + cleanedColors + ")");
                }

                // 4. Embed all Linked Images (safely iterate backwards)
                var embedCount = 0;
                var embedMissing = 0;
                for (var pl = doc.placedItems.length - 1; pl >= 0; pl--) {
                    try {
                        doc.placedItems[pl].embed();
                        embedCount++;
                    } catch (eEmbed) {
                        embedMissing++;
                    }
                }
                var embedReport = "\u09B2\u09BF\u0982\u0995\u09A1 \u09AB\u09BE\u0987\u09B2: " + embedCount + " \u099F\u09BF \u098F\u09AE\u09CD\u09AC\u09C7\u09A1 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8";
                if (embedMissing > 0) embedReport += " (" + embedMissing + " \u099F\u09BF \u09B2\u09BF\u0982\u0995 \u09AE\u09BF\u09B8\u09BF\u0982)";
                report.push(embedReport);

                // 5. Safe Text Outlining (Native DOM iteration - preserves all clipping masks & frames)
                var outlineCount = 0;
                for (var remTf = doc.textFrames.length - 1; remTf >= 0; remTf--) {
                    try {
                        doc.textFrames[remTf].createOutline();
                        outlineCount++;
                    } catch (eRem) {}
                }
                report.push("\u099F\u09C7\u0995\u09CD\u09B8\u099F: \u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09AB\u09A8\u09CD\u099F \u0986\u0989\u099F\u09B2\u09BE\u0987\u09A8 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 (" + outlineCount + " \u099F\u09BF)");

                app.redraw();
                return toJson({
                    success: true,
                    message: "\u09B8\u09BF\u099F\u09BF\u09AA\u09BF \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u09BF \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8!\n\u2022 " + report.join("\n\u2022 ")
                });

            } catch (ex) {
                return toJson({ success: false, error: ex.message });
            }
        }
    };
})();
var FormaEngine = $.global.FormaEngine;

$.global.ReadyFileEngine = (function () {
    "use strict";

    var BN_DIGITS = [
        "\u09E6", "\u09E7", "\u09E8", "\u09E9", "\u09EA",
        "\u09EB", "\u09EC", "\u09ED", "\u09EE", "\u09EF"
    ];

    function toJson(obj) {
        if (obj === null) return "null";
        if (typeof obj === "undefined") return "undefined";
        if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
        if (typeof obj === "string") {
            var s = obj.replace(/\\/g, "\\\\")
                       .replace(/"/g, '\\"')
                       .replace(/\n/g, "\\n")
                       .replace(/\r/g, "\\r")
                       .replace(/\t/g, "\\t");
            var out = '"';
            for (var c = 0; c < s.length; c++) {
                var code = s.charCodeAt(c);
                if (code > 127) {
                    var hex = code.toString(16);
                    while (hex.length < 4) hex = "0" + hex;
                    out += "\\u" + hex;
                } else {
                    out += s.charAt(c);
                }
            }
            return out + '"';
        }
        if (obj instanceof Array) {
            var arrRes = [];
            for (var a = 0; a < obj.length; a++) {
                arrRes.push(toJson(obj[a]));
            }
            return "[" + arrRes.join(",") + "]";
        }
        if (typeof obj === "object") {
            var objRes = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    objRes.push(toJson(key) + ":" + toJson(obj[key]));
                }
            }
            return "{" + objRes.join(",") + "}";
        }
        return '""';
    }

    function parseJson(str) {
        if (!str || typeof str !== "string") return null;
        return eval("(" + str + ")");
    }

    function trimStr(s) {
        return String(s || "").replace(/^[\s\r\n\uFEFF\xA0]+|[\s\r\n\uFEFF\xA0]+$/g, "");
    }

    function toBanglaTwoDigit(n) {
        var num = parseInt(n, 10);
        if (isNaN(num) || num < 0) num = 1;
        var s = (num < 10 ? "0" : "") + String(num);
        var out = "";
        for (var i = 0; i < s.length; i++) {
            var d = parseInt(s.charAt(i), 10);
            out += isNaN(d) ? s.charAt(i) : BN_DIGITS[d];
        }
        return out;
    }

    function unlockHierarchy(item) {
        var lockedNodes = [];
        try {
            if (item.locked) {
                lockedNodes.push(item);
                item.locked = false;
            }
            var p = item.parent;
            while (p && p.typename !== "Document") {
                if (typeof p.locked !== "undefined" && p.locked) {
                    lockedNodes.push(p);
                    p.locked = false;
                }
                p = p.parent;
            }
        } catch (e) {}
        return lockedNodes;
    }

    function restoreLocks(lockedNodes) {
        for (var i = lockedNodes.length - 1; i >= 0; i--) {
            try {
                lockedNodes[i].locked = true;
            } catch (e) {}
        }
    }

    /**
     * Updates Madrasa Bangla name and (if Inner Forma) the 2-digit Bangla forma number.
     * Matches exact slug text frames while leaving fixed label frames untouched.
     */
    function updateDocumentTexts(doc, banglaName, isInner, formaNum) {
        var updatedMadrasa = 0;
        var updatedForma = 0;
        var formaBn = toBanglaTwoDigit(formaNum);

        var reLabel = /(\u09AB\u09B0\u09CD\u09AE\u09BE|dg\u00A9v|\u09A8\u09CB\u099F\s*\u09AB\u09B0\u09CD\u09AE\u09BE|\u09EA\s*\u0995\u09BE\u09B2\u09BE\u09B0|4\s*Kvjvi)/;
        var reForma = /\u09AB\u09B0\u09CD\u09AE\u09BE/;
        var reBnTwoDigits = /[\u09E6-\u09EF]{2}/;
        var reMadrasaSuffix = /^.+?\s*-\s*(\u099C\u09C1[\u09DC\u09A1\u09BC]+\u09BF\s*\u099B\u09BE\u09AA\u09BE|\u09AC\u09CD\u09AF\u09BE\u0995\s*\u099F\u09C1\s*\u09AC\u09CD\u09AF\u09BE\u0995\s*\u099B\u09BE\u09AA\u09BE)$/;

        var frames = doc.textFrames;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            var raw = "";
            try {
                raw = tf.contents;
            } catch (e) {
                continue;
            }

            var clean = trimStr(raw.replace(/[\r\n]+/g, " "));
            if (!clean) continue;

            var newText = null;
            var kind = null;

            if (isInner && reForma.test(clean) && reBnTwoDigits.test(clean)) {
                newText = clean.replace(reBnTwoDigits, formaBn);
                kind = "forma";
            } else if (!reLabel.test(clean)) {
                var m = clean.match(reMadrasaSuffix);
                if (m && m[1]) {
                    newText = banglaName + " - " + m[1];
                    kind = "madrasa";
                }
            }

            if (newText !== null && newText !== clean) {
                var lockedNodes = unlockHierarchy(tf);
                try {
                    tf.contents = newText;
                    if (kind === "forma") updatedForma++;
                    if (kind === "madrasa") updatedMadrasa++;
                } finally {
                    restoreLocks(lockedNodes);
                }
            }
        }

        return {
            updatedMadrasa: updatedMadrasa,
            updatedForma: updatedForma
        };
    }

    function pickFolder(promptText, defaultPath) {
        try {
            var startFolder = defaultPath ? new Folder(defaultPath) : Folder.desktop;
            if (!startFolder.exists) startFolder = Folder.desktop;
            var chosen = startFolder.selectDlg(promptText || "Select Folder");
            if (!chosen) {
                return toJson({ ok: false, cancelled: true });
            }
            return toJson({ ok: true, path: chosen.fsName });
        } catch (err) {
            return toJson({ ok: false, error: String(err) });
        }
    }

    function openFolder(folderPath) {
        try {
            var f = new Folder(folderPath);
            if (!f.exists) {
                return toJson({ ok: false, error: "Folder does not exist." });
            }
            f.execute();
            return toJson({ ok: true });
        } catch (err) {
            return toJson({ ok: false, error: String(err) });
        }
    }

    function generateSingleFile(paramsJson) {
        var params = parseJson(paramsJson);
        if (!params || !params.templatePath || !params.outputPath) {
            return toJson({ ok: false, error: "Invalid parameters." });
        }

        var tplFile = new File(params.templatePath);
        if (!tplFile.exists) {
            return toJson({ ok: false, error: "Template not found: " + params.templatePath });
        }

        var outFile = new File(params.outputPath);
        if (tplFile.fsName === outFile.fsName) {
            return toJson({ ok: false, error: "Safety stop: output path matches source template." });
        }

        if (params.overwriteExisting === false && outFile.exists) {
            return toJson({
                ok: true,
                skipped: true,
                outputPath: outFile.fsName,
                fileName: outFile.displayName
            });
        }

        var outFolder = outFile.parent;
        if (outFolder && !outFolder.exists) {
            outFolder.create();
        }

        var prevInteraction = app.userInteractionLevel;
        var doc = null;
        try {
            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

            doc = app.open(tplFile);
            var stats = updateDocumentTexts(
                doc,
                trimStr(params.banglaName),
                Boolean(params.isInner),
                params.formaNum || 1
            );

            var saveOpts = new IllustratorSaveOptions();
            saveOpts.pdfCompatible = Boolean(params.pdfCompatible);
            saveOpts.compressed = true;
            saveOpts.embedICCProfile = false;
            saveOpts.fontSubsetThreshold = 100;

            doc.saveAs(outFile, saveOpts);

            if (!params.keepOpen) {
                doc.close(SaveOptions.DONOTSAVECHANGES);
                doc = null;
            }

            return toJson({
                ok: true,
                skipped: false,
                outputPath: outFile.fsName,
                fileName: outFile.displayName,
                updatedMadrasa: stats.updatedMadrasa,
                updatedForma: stats.updatedForma
            });
        } catch (err) {
            if (doc && !params.keepOpen) {
                try {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                } catch (e2) {}
            }
            return toJson({
                ok: false,
                error: String(err),
                templatePath: params.templatePath
            });
        } finally {
            app.userInteractionLevel = prevInteraction;
        }
    }

    return {
        pickFolder: pickFolder,
        openFolder: openFolder,
        generateSingleFile: generateSingleFile,
        updateDocumentTexts: updateDocumentTexts,
        toBanglaTwoDigit: toBanglaTwoDigit
    };
})();
var ReadyFileEngine = $.global.ReadyFileEngine;
