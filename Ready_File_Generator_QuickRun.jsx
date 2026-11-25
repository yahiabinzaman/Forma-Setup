/**
 * ColorLab Ready File Generator - Standalone QuickRun Script
 * Author: Yahia Bin Zaman / ColorLab
 * Run via: File > Scripts > Ready_File_Generator_QuickRun (or Other Script...)
 * ES3 compatible
 */

#target illustrator

(function () {
    "use strict";

    var DEFAULT_SETUP_PATH = new Folder("~").fsName + "/Downloads/Setup Folder";
    var BN_DIGITS = ["\u09E6", "\u09E7", "\u09E8", "\u09E9", "\u09EA", "\u09EB", "\u09EC", "\u09ED", "\u09EE", "\u09EF"];

    function trimStr(s) {
        return String(s || "").replace(/^[\s\r\n\uFEFF\xA0]+|[\s\r\n\uFEFF\xA0]+$/g, "");
    }

    function toEnTwoDigit(n) {
        var num = parseInt(n, 10);
        if (isNaN(num) || num < 0) num = 1;
        return (num < 10 ? "0" : "") + String(num);
    }

    function toBnTwoDigit(n) {
        var s = toEnTwoDigit(n);
        var out = "";
        for (var i = 0; i < s.length; i++) {
            var d = parseInt(s.charAt(i), 10);
            out += isNaN(d) ? s.charAt(i) : BN_DIGITS[d];
        }
        return out;
    }

    function sanitizeFilePart(raw) {
        return trimStr(String(raw || "").replace(/[\/\\:*?"<>|]/g, " ").replace(/\s+/g, " "));
    }

    function isAiFile(fileObj) {
        return (fileObj instanceof File) && /\.ai$/i.test(fileObj.name) && fileObj.name.charAt(0) !== ".";
    }

    function scanSizes(setupPath) {
        var root = new Folder(setupPath);
        if (!root.exists) return [];
        var sizes = [];
        var directAi = root.getFiles(isAiFile);
        if (directAi && directAi.length > 0) {
            sizes.push(root);
        }
        var items = root.getFiles();
        for (var i = 0; i < items.length; i++) {
            var f = items[i];
            if (!(f instanceof Folder)) continue;
            if (f.name.charAt(0) === "." || f.name === "Ready_File_Generator") continue;
            var children = f.getFiles(isAiFile);
            if (children && children.length > 0) {
                sizes.push(f);
            }
        }
        sizes.sort(function (a, b) {
            if (a.fsName === root.fsName) return -1;
            if (b.fsName === root.fsName) return 1;
            return a.displayName < b.displayName ? -1 : (a.displayName > b.displayName ? 1 : 0);
        });
        return sizes;
    }

    function classifyTemplate(name) {
        var lower = name.toLowerCase();
        if (lower.indexOf("forma ") === 0) return "inner";
        if (lower.indexOf("4 color") >= 0) return "color4";
        if (lower.indexOf("note ") === 0) return "note";
        return "other";
    }

    function buildOutputFileName(tplName, englishName, isInner, formaNum) {
        var decoded = File.decode(tplName);
        var idxAt = decoded.indexOf("@");
        var prefix = idxAt >= 0 ? decoded.slice(0, idxAt + 1) : decoded.replace(/\.ai$/i, " @");
        if (isInner) {
            prefix = prefix.replace(/\b(Forma\s+)\d{2}\b/i, "$1" + toEnTwoDigit(formaNum));
        }
        return prefix + englishName + ".ai";
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

    function updateDocumentTexts(doc, banglaName, isInner, formaNum) {
        var formaBn = toBnTwoDigit(formaNum);
        var reLabel = /(\u09AB\u09B0\u09CD\u09AE\u09BE|dg\u00A9v|\u09A8\u09CB\u099F\s*\u09AB\u09B0\u09CD\u09AE\u09BE|\u09EA\s*\u0995\u09BE\u09B2\u09BE\u09B0|4\s*Kvjvi)/;
        var reForma = /\u09AB\u09B0\u09CD\u09AE\u09BE/;
        var reBnTwoDigits = /[\u09E6-\u09EF]{2}/;
        var reMadrasaSuffix = /^.+?\s*-\s*(\u099C\u09C1[\u09DC\u09A1\u09BC]+\u09BF\s*\u099B\u09BE\u09AA\u09BE|\u09AC\u09CD\u09AF\u09BE\u0995\s*\u099F\u09C1\s*\u09AC\u09CD\u09AF\u09BE\u0995\s*\u099B\u09BE\u09AA\u09BE)$/;

        var frames = doc.textFrames;
        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            var raw = "";
            try { raw = tf.contents; } catch (e) { continue; }
            var clean = trimStr(raw.replace(/[\r\n]+/g, " "));
            if (!clean) continue;

            var newText = null;
            if (isInner && reForma.test(clean) && reBnTwoDigits.test(clean)) {
                newText = clean.replace(reBnTwoDigits, formaBn);
            } else if (!reLabel.test(clean)) {
                var m = clean.match(reMadrasaSuffix);
                if (m && m[1]) {
                    newText = banglaName + " - " + m[1];
                }
            }

            if (newText !== null && newText !== clean) {
                var locked = unlockHierarchy(tf);
                try {
                    tf.contents = newText;
                } finally {
                    restoreLocks(locked);
                }
            }
        }
    }

    var win = new Window("dialog", "ColorLab Ready File Generator");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 14;

    var pnlSetup = win.add("panel", undefined, "1. Template Setup Folder & Size");
    pnlSetup.orientation = "column";
    pnlSetup.alignChildren = ["fill", "top"];
    pnlSetup.margins = 10;

    var grpSetupPath = pnlSetup.add("group");
    grpSetupPath.orientation = "row";
    var etSetup = grpSetupPath.add("edittext", undefined, DEFAULT_SETUP_PATH);
    etSetup.preferredSize.width = 300;
    var btnSetupBrowse = grpSetupPath.add("button", undefined, "Browse...");

    var grpSize = pnlSetup.add("group");
    grpSize.orientation = "row";
    grpSize.add("statictext", undefined, "Diary Size:");
    var ddSize = grpSize.add("dropdownlist", undefined, []);
    ddSize.preferredSize.width = 220;

    var pnlNames = win.add("panel", undefined, "2. Madrasa Name");
    pnlNames.orientation = "column";
    pnlNames.alignChildren = ["fill", "top"];
    pnlNames.margins = 10;

    var grpEng = pnlNames.add("group");
    grpEng.add("statictext", undefined, "English Name:").preferredSize.width = 95;
    var etEng = grpEng.add("edittext", undefined, "");
    etEng.preferredSize.width = 270;

    var grpBn = pnlNames.add("group");
    grpBn.add("statictext", undefined, "Bangla Name:").preferredSize.width = 95;
    var etBn = grpBn.add("edittext", undefined, "");
    etBn.preferredSize.width = 270;

    var pnlTpls = win.add("panel", undefined, "3. Templates & Forma Count");
    pnlTpls.orientation = "column";
    pnlTpls.alignChildren = ["fill", "top"];
    pnlTpls.margins = 10;

    var tplContainer = pnlTpls.add("group");
    tplContainer.orientation = "column";
    tplContainer.alignChildren = ["fill", "top"];
    tplContainer.spacing = 4;

    var grpCounts = pnlTpls.add("group");
    grpCounts.orientation = "row";
    grpCounts.add("statictext", undefined, "Inner Forma Count:");
    var etInnerCount = grpCounts.add("edittext", undefined, "3");
    etInnerCount.characters = 4;
    grpCounts.add("statictext", undefined, "Start From:");
    var etInnerStart = grpCounts.add("edittext", undefined, "1");
    etInnerStart.characters = 4;

    var pnlOut = win.add("panel", undefined, "4. Project Output Folder");
    pnlOut.orientation = "column";
    pnlOut.alignChildren = ["fill", "top"];
    pnlOut.margins = 10;

    var grpOutPath = pnlOut.add("group");
    var etOut = grpOutPath.add("edittext", undefined, "");
    etOut.preferredSize.width = 300;
    var btnOutBrowse = grpOutPath.add("button", undefined, "Browse...");

    var grpOpts = pnlOut.add("group");
    grpOpts.orientation = "row";
    var chkSubfolder = grpOpts.add("checkbox", undefined, "Subfolder (@English)");
    var chkOverwrite = grpOpts.add("checkbox", undefined, "Overwrite");
    chkOverwrite.value = true;
    var chkPdf = grpOpts.add("checkbox", undefined, "PDF Compat");
    var chkKeep = grpOpts.add("checkbox", undefined, "Keep Open");

    var grpBtns = win.add("group");
    grpBtns.alignment = "right";
    grpBtns.add("button", undefined, "Cancel", { name: "cancel" });
    var btnRun = grpBtns.add("button", undefined, "Generate Ready Files", { name: "ok" });

    var currentSizes = [];
    var currentTplRows = [];

    function populateTemplates() {
        while (tplContainer.children.length > 0) {
            tplContainer.remove(tplContainer.children[0]);
        }
        currentTplRows = [];

        var sel = ddSize.selection;
        if (!sel) return;
        var sizeFolder = currentSizes[sel.index];
        if (!sizeFolder) return;

        var files = sizeFolder.getFiles(isAiFile);
        files.sort(function (a, b) {
            return File.decode(a.name) < File.decode(b.name) ? -1 : 1;
        });

        var first4Color = true;
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var decoded = File.decode(f.name);
            var kind = classifyTemplate(decoded);
            var chk = tplContainer.add("checkbox", undefined, decoded.replace(/@.*\.ai$/i, "@..."));
            if (kind === "color4") {
                chk.value = first4Color;
                first4Color = false;
            } else {
                chk.value = true;
            }
            currentTplRows.push({
                file: f,
                kind: kind,
                chk: chk
            });
        }
        win.layout.layout(true);
    }

    function populateSizes() {
        ddSize.removeAll();
        currentSizes = scanSizes(trimStr(etSetup.text));
        var defaultIdx = 0;
        for (var i = 0; i < currentSizes.length; i++) {
            var name = File.decode(currentSizes[i].name);
            ddSize.add("item", name);
            if (name === "2 No Size") defaultIdx = i;
        }
        if (currentSizes.length > 0) {
            ddSize.selection = defaultIdx;
        }
        populateTemplates();
    }

    btnSetupBrowse.onClick = function () {
        var f = new Folder(trimStr(etSetup.text) || Folder.desktop.fsName).selectDlg("Select Setup Folder");
        if (f) {
            etSetup.text = f.fsName;
            populateSizes();
        }
    };

    btnOutBrowse.onClick = function () {
        var f = new Folder(trimStr(etOut.text) || Folder.desktop.fsName).selectDlg("Select Project Output Folder");
        if (f) {
            etOut.text = f.fsName;
        }
    };

    ddSize.onChange = populateTemplates;

    btnRun.onClick = function () {
        var engSafe = sanitizeFilePart(etEng.text);
        var bnClean = trimStr(etBn.text);
        var outPath = trimStr(etOut.text);

        if (!engSafe || !bnClean) {
            alert("English Name ebong Bangla Name oboshoy dite hobe!");
            return;
        }
        if (!outPath) {
            alert("Project Output Folder select korun!");
            return;
        }

        var innerCount = parseInt(etInnerCount.text, 10);
        var innerStart = parseInt(etInnerStart.text, 10);
        if (isNaN(innerCount) || innerCount < 1) innerCount = 1;
        if (isNaN(innerStart) || innerStart < 1) innerStart = 1;

        var destFolder = chkSubfolder.value ? new Folder(outPath + "/@" + engSafe) : new Folder(outPath);
        if (!destFolder.exists) destFolder.create();

        var jobs = [];
        for (var i = 0; i < currentTplRows.length; i++) {
            var row = currentTplRows[i];
            if (!row.chk.value) continue;
            if (row.kind === "inner") {
                for (var c = 0; c < innerCount; c++) {
                    var num = innerStart + c;
                    jobs.push({
                        tpl: row.file,
                        outName: buildOutputFileName(row.file.name, engSafe, true, num),
                        isInner: true,
                        formaNum: num
                    });
                }
            } else {
                jobs.push({
                    tpl: row.file,
                    outName: buildOutputFileName(row.file.name, engSafe, false, 1),
                    isInner: false,
                    formaNum: 1
                });
            }
        }

        if (jobs.length === 0) {
            alert("Kompokkhe ekta template select korun!");
            return;
        }

        win.close(1);

        var prevInteraction = app.userInteractionLevel;
        var created = 0;
        var skipped = 0;
        try {
            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
            for (var j = 0; j < jobs.length; j++) {
                var job = jobs[j];
                var outFile = new File(destFolder.fsName + "/" + job.outName);
                if (job.tpl.fsName === outFile.fsName) continue;
                if (!chkOverwrite.value && outFile.exists) {
                    skipped++;
                    continue;
                }

                var doc = app.open(job.tpl);
                updateDocumentTexts(doc, bnClean, job.isInner, job.formaNum);

                var saveOpts = new IllustratorSaveOptions();
                saveOpts.pdfCompatible = chkPdf.value;
                saveOpts.compressed = true;
                saveOpts.embedICCProfile = false;
                saveOpts.fontSubsetThreshold = 100;

                doc.saveAs(outFile, saveOpts);
                if (!chkKeep.value) {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                }
                created++;
            }
        } finally {
            app.userInteractionLevel = prevInteraction;
        }

        alert("Done!\nCreated: " + created + " files\nSkipped: " + skipped + "\nFolder: " + destFolder.fsName);
    };

    populateSizes();
    win.show();
})();
