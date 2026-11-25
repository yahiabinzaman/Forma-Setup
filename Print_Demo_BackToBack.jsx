/**
 * ColorLab Print Demo (Back-to-Back Split & Print)
 * Author: Yahia Bin Zaman / ColorLab
 * Run via: File > Scripts > Other Script...
 */

#target illustrator

(function () {
    "use strict";

    if (app.documents.length === 0) {
        alert("\u0995\u09CB\u09A8\u09CB \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09BE \u09A8\u09C7\u0987!\n\u09A6\u09DF\u09BE \u0995\u09B0\u09C7 \u09AB\u09B0\u09CD\u09AE\u09BE \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u0993\u09AA\u09C7\u09A8 \u0995\u09B0\u09C1\u09A8\u0964");
        return;
    }

    var doc = app.activeDocument;

    function forEachLayer(layers, fn) {
        if (!layers) return;
        for (var i = 0; i < layers.length; i++) {
            var lyr = layers[i];
            fn(lyr);
            if (lyr.layers && lyr.layers.length > 0) {
                forEachLayer(lyr.layers, fn);
            }
        }
    }

    try {
        // 1. Unlock all layers, sublayers, and page items
        forEachLayer(doc.layers, function (lyr) {
            try {
                lyr.locked = false;
                lyr.visible = true;
            } catch (eLyr) {}
        });
        try { app.executeMenuCommand("unlockAll"); } catch (e) {}
        try { app.executeMenuCommand("showAll"); } catch (e) {}

        var lower = doc.name.toLowerCase();
        var isJhuri = (
            lower.indexOf("jhuri") !== -1 ||
            lower.indexOf("front & back") !== -1 ||
            lower.indexOf("font & back") !== -1 ||
            doc.name.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 ||
            doc.name.indexOf("\u099D\u09C1\u09DC\u09BF") !== -1
        );
        var isBackToBack = (lower.indexOf("back to back") !== -1 || lower.indexOf("back-to-back") !== -1);
        if (!isJhuri && !isBackToBack && doc.textFrames) {
            try {
                for (var tf = 0; tf < doc.textFrames.length; tf++) {
                    var tc = doc.textFrames[tf].contents;
                    if (tc.indexOf("\u099C\u09C1\u09DC\u09BF") !== -1 ||
                        tc.indexOf("\u099C\u09C1\u09A1\u09BC\u09BF") !== -1 ||
                        tc.indexOf("\u099D\u09C1\u09DC\u09BF") !== -1 ||
                        tc.indexOf("\u09AB\u09CD\u09B0\u09A8\u09CD\u099F \u09B8\u09BE\u0987\u09A1") !== -1 ||
                        tc.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995 \u09B8\u09BE\u0987\u09A1") !== -1 ||
                        tc.indexOf("d\u00AB\u203AU mvBW") !== -1 ||
                        tc.indexOf("e\u00A8vK mvBW") !== -1) {
                        isJhuri = true;
                        break;
                    }
                    if (tc.indexOf("\u09AC\u09CD\u09AF\u09BE\u0995 \u099F\u09C1 \u09AC\u09CD\u09AF\u09BE\u0995") !== -1 ||
                        tc.toLowerCase().indexOf("back to back") !== -1) {
                        isBackToBack = true;
                        break;
                    }
                }
            } catch (eTxt) {}
        }
        var isAlbum = isJhuri || (!isBackToBack && lower.indexOf("album") !== -1);
        if (!isAlbum && !isBackToBack && doc.artboards.length === 16) {
            var r0 = doc.artboards[0].artboardRect;
            var w0 = Math.abs(r0[2] - r0[0]);
            var h0 = Math.abs(r0[1] - r0[3]);
            if (h0 > w0) {
                var xs = [];
                for (var xi = 0; xi < doc.artboards.length; xi++) {
                    var xr = doc.artboards[xi].artboardRect;
                    xs.push((xr[0] + xr[2]) / 2);
                }
                xs.sort(function (a, b) { return a - b; });
                if ((xs[8] - xs[7]) > w0 * 0.15) isAlbum = true;
            }
        }

        if (isAlbum) {
            // 1. Calculate dynamic horizontal divider (midX) and artboard bounds
            var midX = null;
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
                        left: l_, right: r_, top: t_, bottom: b_,
                        cx: (l_ + r_) / 2, cy: (t_ + b_) / 2
                    });
                }
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

                midX = (maxLeftAbX + minRightAbX) / 2;
                abLeftBounds = [minLeftAbX, maxLeftAbY, maxLeftAbX, minLeftAbY];
                abRightBounds = [minRightAbX, maxRightAbY, maxRightAbX, minRightAbY];
            } else if (doc.artboards.length === 2) {
                var r0_ = doc.artboards[0].artboardRect;
                var r1_ = doc.artboards[1].artboardRect;
                var r0L = Math.min(r0_[0], r0_[2]), r0R = Math.max(r0_[0], r0_[2]);
                var r1L = Math.min(r1_[0], r1_[2]), r1R = Math.max(r1_[0], r1_[2]);
                if (r0R < r1L) midX = (r0R + r1L) / 2;
                else if (r1R < r0L) midX = (r1R + r0L) / 2;
                else midX = (Math.min(r0L, r1L) + Math.max(r0R, r1R)) / 2;
            }

            if (midX === null) {
                var allMinX = 999999, allMaxX = -999999;
                forEachLayer(doc.layers, function (lyr) {
                    if (!lyr.pageItems) return;
                    for (var itIdx = 0; itIdx < lyr.pageItems.length; itIdx++) {
                        var pIt = lyr.pageItems[itIdx];
                        if (pIt.guides) continue;
                        var bnd = pIt.geometricBounds;
                        if (bnd[0] < allMinX) allMinX = bnd[0];
                        if (bnd[2] > allMaxX) allMaxX = bnd[2];
                    }
                });
                midX = (allMinX < allMaxX) ? (allMinX + allMaxX) / 2 : 0;
            }

            // 2. Scan all page items on both sides of midX
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

            forEachLayer(doc.layers, function (curLay) {
                if (!curLay.pageItems) return;
                for (var pi = 0; pi < curLay.pageItems.length; pi++) {
                    var it = curLay.pageItems[pi];
                    if (it.guides) continue;
                    var gb = it.geometricBounds;
                    var cx = (gb[0] + gb[2]) / 2;

                    if (cx < midX) {
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
            });

            if (maxX_L > midX) maxX_L = midX;
            if (minX_R < midX) minX_R = midX;

            var commonTop = Math.max(maxY_L, maxY_R);
            var commonBottom = Math.min(minY_L, minY_R);

            var bLeft = [minX_L, commonTop, maxX_L, commonBottom];
            var bRight = [minX_R, commonTop, maxX_R, commonBottom];

            if (!foundL || !foundR) {
                throw new Error("\u0985\u09CD\u09AF\u09BE\u09B2\u09AC\u09BE\u09AE \u09B6\u09BF\u099F\u09C7\u09B0 \u09AC\u09BE\u0989\u09A8\u09CD\u09A1\u09B8 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF!");
            }

            while (doc.artboards.length > 1) {
                doc.artboards[doc.artboards.length - 1].remove();
            }
            doc.artboards[0].artboardRect = bLeft;
            doc.artboards[0].name = "01 - Front Sheet";

            var abAlbum2 = doc.artboards.add(bRight);
            abAlbum2.name = "02 - Back Sheet";

            doc.artboards.setActiveArtboardIndex(0);
            app.redraw();

            app.executeMenuCommand("Print");
            return;
        }

        // Inner / Note / 4-Color Back-To-Back: 1 big sheet split into left & right halves
        while (doc.artboards.length > 1) {
            doc.artboards[doc.artboards.length - 1].remove();
        }
        doc.artboards.setActiveArtboardIndex(0);

        app.executeMenuCommand("Fit Artboard to artwork bounds");

        var rect = doc.artboards[0].artboardRect;
        var left = rect[0];
        var top = rect[1];
        var right = rect[2];
        var bottom = rect[3];

        var totalW = right - left;
        var halfW = totalW / 2;

        doc.artboards[0].artboardRect = [left, top, left + halfW, bottom];
        doc.artboards[0].name = "01 - Left (Half)";

        var ab2 = doc.artboards.add([left + halfW, top, right, bottom]);
        ab2.name = "02 - Right (Half)";

        doc.artboards.setActiveArtboardIndex(0);
        app.redraw();

        app.executeMenuCommand("Print");

        while (doc.artboards.length > 1) {
            doc.artboards[doc.artboards.length - 1].remove();
        }
        doc.artboards.setActiveArtboardIndex(0);
        app.executeMenuCommand("Fit Artboard to artwork bounds");
        app.redraw();

    } catch (ex) {
        alert("\u09A4\u09CD\u09B0\u09C1\u099F\u09BF: " + ex.message);
    }
})();
