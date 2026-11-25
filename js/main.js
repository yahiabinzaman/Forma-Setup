/**
 * ColorLab Forma Setup Pro - Streamlined UI Controller
 * Author: Yahia Bin Zaman / ColorLab
 */

(function () {
  "use strict";

  var csInterface = new CSInterface();

  var state = {
    diarySize: "size2",
    sectionType: "album_16",
    formaBatch: 1,
    mappingScheme: "scheme_artboard_match",
    orientationMode: "auto"
  };

  var BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  function toBnNum(num) {
    return String(num).split("").map(function (d) {
      return BN_DIGITS[parseInt(d, 10)] || d;
    }).join("");
  }

  var els = {
    statusBanner: document.getElementById("statusBanner"),
    statusIcon: document.getElementById("statusIcon"),
    statusText: document.getElementById("statusText"),
    btnRefreshDocs: document.getElementById("btnRefreshDocs"),

    sizePresetBtns: document.querySelectorAll(".btn-size-preset"),
    badgeDiarySize: document.getElementById("badgeDiarySize"),

    selSectionType: document.getElementById("selSectionType"),
    batchGroup: document.getElementById("batchGroup"),
    selFormaBatch: document.getElementById("selFormaBatch"),

    selMappingScheme: document.getElementById("selMappingScheme"),
    selOrientationMode: document.getElementById("selOrientationMode"),

    impositionGridPreview: document.getElementById("impositionGridPreview"),
    diagramTitle: document.getElementById("diagramTitle"),
    diagramInfo: document.getElementById("diagramInfo"),
    btnRunImposition: document.getElementById("btnRunImposition")
  };

  /**
   * Universal 16-Page Offset Imposition Layout:
   * Col 0: 8, 9, 12, 5  -> Dan (Right = 270°)
   * Col 1: 1, 16, 13, 4 -> Bam (Left = 90°)
   * Col 2: 2, 15, 14, 3 -> Dan (Right = 270°)
   * Col 3: 7, 10, 11, 6 -> Bam (Left = 90°)
   */
  var SCHEME_ARTBOARD_MATCH_16 = {
    1:  { slot: 1,  rot: 90,  ab: 1  }, // Col 1: Bam
    2:  { slot: 2,  rot: 270, ab: 2  }, // Col 2: Dan
    3:  { slot: 14, rot: 270, ab: 3  }, // Col 2: Dan
    4:  { slot: 13, rot: 90,  ab: 4  }, // Col 1: Bam
    5:  { slot: 12, rot: 270, ab: 5  }, // Col 0: Dan
    6:  { slot: 15, rot: 90,  ab: 6  }, // Col 3: Bam
    7:  { slot: 3,  rot: 90,  ab: 7  }, // Col 3: Bam
    8:  { slot: 0,  rot: 270, ab: 8  }, // Col 0: Dan
    9:  { slot: 4,  rot: 270, ab: 9  }, // Col 0: Dan
    10: { slot: 7,  rot: 90,  ab: 10 }, // Col 3: Bam
    11: { slot: 11, rot: 90,  ab: 11 }, // Col 3: Bam
    12: { slot: 8,  rot: 270, ab: 12 }, // Col 0: Dan
    13: { slot: 9,  rot: 90,  ab: 13 }, // Col 1: Bam
    14: { slot: 10, rot: 270, ab: 14 }, // Col 2: Dan
    15: { slot: 6,  rot: 270, ab: 15 }, // Col 2: Dan
    16: { slot: 5,  rot: 90,  ab: 16 }  // Col 1: Bam
  };

  var SCHEME_STANDARD_16 = SCHEME_ARTBOARD_MATCH_16;
  var SCHEME_WORK_TURN_16 = SCHEME_ARTBOARD_MATCH_16;

  var SCHEME_ALBUM_8 = {
    1: { slot: 1, rot: 90,  ab: 1 },
    2: { slot: 2, rot: 270, ab: 2 },
    3: { slot: 6, rot: 270, ab: 3 },
    4: { slot: 5, rot: 90,  ab: 4 },
    5: { slot: 4, rot: 270, ab: 5 },
    6: { slot: 7, rot: 90,  ab: 6 },
    7: { slot: 3, rot: 90,  ab: 7 },
    8: { slot: 0, rot: 270, ab: 8 }
  };

  function showStatus(text, type, durationMs) {
    if (!els.statusBanner) return;
    els.statusBanner.className = "status-banner show status-" + (type || "info");
    els.statusText.textContent = text;
    if (els.statusIcon) {
      els.statusIcon.className = "status-dot status-dot-" + (type || "info");
      els.statusIcon.textContent = "";
    }

    if (durationMs) {
      setTimeout(function () {
        els.statusBanner.className = "status-banner";
      }, durationMs);
    }
  }

  function initSizePresets() {
    els.sizePresetBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        els.sizePresetBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        state.diarySize = btn.getAttribute("data-size");

        var label = "2 No. Size";
        if (state.diarySize === "size1") label = "1 No. Size";
        else if (state.diarySize === "size3") label = "3 No. Size";
        els.badgeDiarySize.textContent = label;
      });
    });
  }

  function initSectionSelection() {
    els.selSectionType.addEventListener("change", function () {
      state.sectionType = els.selSectionType.value;

      if (state.sectionType === "inner_32") {
        els.batchGroup.style.display = "flex";
        els.selFormaBatch.innerHTML = '<option value="1">Forma 1 (Pages 1 - 16)</option><option value="2">Forma 2 (Pages 17 - 32)</option>';
      } else if (state.sectionType === "inner_48") {
        els.batchGroup.style.display = "flex";
        els.selFormaBatch.innerHTML = '<option value="1">Forma 1 (Pages 1 - 16)</option><option value="2">Forma 2 (Pages 17 - 32)</option><option value="3">Forma 3 (Pages 33 - 48)</option>';
      } else {
        els.batchGroup.style.display = "none";
      }

      state.formaBatch = parseInt(els.selFormaBatch.value, 10) || 1;
      renderPreview();
      updateCtpUI();
    });

    els.selFormaBatch.addEventListener("change", function () {
      state.formaBatch = parseInt(els.selFormaBatch.value, 10) || 1;
      renderPreview();
      updateCtpUI();
    });

    if (els.selMappingScheme) {
      els.selMappingScheme.addEventListener("change", function () {
        state.mappingScheme = els.selMappingScheme.value;
        renderPreview();
      });
    }

    if (els.selOrientationMode) {
      els.selOrientationMode.addEventListener("change", function () {
        state.orientationMode = els.selOrientationMode.value;
      });
    }
  }

  function renderPreview() {
    if (state.sectionType === "album_16") {
      if (els.diagramTitle) els.diagramTitle.textContent = "অ্যালবাম লেআউট প্রিভিউ (ঝুড়ি / Front & Back)";
      if (els.diagramInfo) els.diagramInfo.textContent = "১৬ আর্টবোর্ড (লম্বা লম্বি)";
      var albumHint = document.getElementById("setupHintText");
      if (albumHint) albumHint.textContent = "পেজ ১-১৬ সিলেক্ট করে বাটনে ক্লিক করুন। স্বয়ংক্রিয়ভাবে আর্টবোর্ডে সাজানো হবে।";
      els.impositionGridPreview.style.display = "flex";
      els.impositionGridPreview.style.flexDirection = "column";
      els.impositionGridPreview.style.gap = "6px";
      els.impositionGridPreview.innerHTML = "";

      // Part 1: Left Sheet (Front / Sheet 1)
      // Row 1 (Top): 5, 12, 9, 8 (Rot: 180° / উল্টা)
      // Row 2 (Bottom): 4, 13, 16, 1 (Rot: 0° / সোজা)
      var sheet1 = [
        { ab: 5, page: 5, rot: 180 },
        { ab: 12, page: 12, rot: 180 },
        { ab: 9, page: 9, rot: 180 },
        { ab: 8, page: 8, rot: 180 },
        { ab: 4, page: 4, rot: 0 },
        { ab: 13, page: 13, rot: 0 },
        { ab: 16, page: 16, rot: 0 },
        { ab: 1, page: 1, rot: 0 }
      ];

      // Part 2: Right Sheet (Back / Sheet 2)
      // Row 1 (Top): 7, 10, 11, 6 (Rot: 180° / উল্টা)
      // Row 2 (Bottom): 2, 15, 14, 3 (Rot: 0° / সোজা)
      var sheet2 = [
        { ab: 7, page: 7, rot: 180 },
        { ab: 10, page: 10, rot: 180 },
        { ab: 11, page: 11, rot: 180 },
        { ab: 6, page: 6, rot: 180 },
        { ab: 2, page: 2, rot: 0 },
        { ab: 15, page: 15, rot: 0 },
        { ab: 14, page: 14, rot: 0 },
        { ab: 3, page: 3, rot: 0 }
      ];

      function buildSheetGrid(items, title) {
        var wrap = document.createElement("div");
        wrap.className = "sheet-wrap";

        var lbl = document.createElement("div");
        lbl.className = "sheet-label";
        lbl.innerHTML = '<span>' + title + '</span><span style="opacity:0.8; font-weight:400;">৪x২ আর্টবোর্ড</span>';
        wrap.appendChild(lbl);

        var grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(4, 1fr)";
        grid.style.gap = "4px";

        items.forEach(function (it) {
          var cell = document.createElement("div");
          cell.className = "grid-cell";

          var isInv = (it.rot === 180);
          var arrow = isInv ? "↓" : "↑";
          var rotTxt = isInv ? "উল্টা" : "সোজা";
          var rotCls = isInv ? "cell-rot-down" : "cell-rot-up";
          var abStr = (it.ab < 10 ? "0" : "") + it.ab;

          cell.innerHTML = [
            '<div class="cell-ab-target">AB ' + abStr + '</div>',
            '<div class="cell-page-num">' + toBnNum(it.page) + '</div>',
            '<div class="cell-rot-arrow ' + rotCls + '">' + arrow + ' ' + rotTxt + '</div>'
          ].join("");

          cell.title = "Artboard " + it.ab + " -> Page " + it.page + " (" + (isInv ? "180° উল্টা" : "0° সোজা") + ")";
          grid.appendChild(cell);
        });

        wrap.appendChild(grid);
        return wrap;
      }

      els.impositionGridPreview.appendChild(buildSheetGrid(sheet1, "পার্ট ১ (সামনে / Front Sheet)"));
      els.impositionGridPreview.appendChild(buildSheetGrid(sheet2, "পার্ট ২ (পেছনে / Back Sheet)"));
      return;
    }

    var is8Page = (state.sectionType === "album_8");
    var totalSlots = is8Page ? 8 : 16;
    var cols = 4;

    var mapping = SCHEME_ARTBOARD_MATCH_16;
    if (is8Page) {
      mapping = SCHEME_ALBUM_8;
    } else if (state.mappingScheme === "scheme_forma01") {
      mapping = SCHEME_STANDARD_16;
    } else if (state.mappingScheme === "scheme_work_turn") {
      mapping = SCHEME_WORK_TURN_16;
    }

    var pageOffset = (state.formaBatch - 1) * 16;

    if (els.diagramTitle) {
      if (is8Page) els.diagramTitle.textContent = "অ্যালবাম লেআউট প্রিভিউ (৮ পেজ)";
      else if (state.sectionType === "note_16") els.diagramTitle.textContent = "নোট লেআউট প্রিভিউ (১৬ পেজ / ৮ স্প্রেড)";
      else els.diagramTitle.textContent = "ইনার লেআউট প্রিভিউ (৪x৪)";
    }
    var hintEl = document.getElementById("setupHintText");
    if (hintEl) {
      if (state.sectionType === "note_16") {
        hintEl.textContent = "১৬টি সিঙ্গেল পেজ অথবা ৮টি ডাবল-পেজ স্প্রেড (বা ১টি স্প্রেড) সিলেক্ট করে ক্লিক করুন।";
      } else if (is8Page) {
        hintEl.textContent = "৮টি পেজ সিলেক্ট করে বাটনে ক্লিক করুন। স্বয়ংক্রিয়ভাবে আর্টবোর্ডে সাজানো হবে।";
      } else {
        hintEl.textContent = "পেজ ১-১৬ সিলেক্ট করে বাটনে ক্লিক করুন। স্বয়ংক্রিয়ভাবে আর্টবোর্ডে সাজানো হবে।";
      }
    }
    els.diagramInfo.textContent = totalSlots + " Artboards (4x" + (is8Page ? 2 : 4) + ")";
    els.impositionGridPreview.style.display = "grid";
    els.impositionGridPreview.style.gridTemplateColumns = "repeat(" + cols + ", 1fr)";
    els.impositionGridPreview.style.gap = "4px";
    els.impositionGridPreview.innerHTML = "";

    var slotMap = {};
    for (var p = 1; p <= totalSlots; p++) {
      var item = mapping[p];
      if (item) {
        slotMap[item.slot] = {
          page: p + pageOffset,
          rot: item.rot,
          ab: item.ab || p
        };
      }
    }

    for (var slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
      var cell = document.createElement("div");
      cell.className = "grid-cell";

      var mapped = slotMap[slotIdx];
      var pageNum = mapped ? mapped.page : "-";
      var abNum = mapped ? mapped.ab : (slotIdx + 1);
      var rot = mapped ? mapped.rot : 0;
      var bnNum = mapped ? toBnNum(pageNum) : "-";

      var isRight = (rot === 270);
      var arrowSymbol = isRight ? "→" : "←";
      var rotText = isRight ? "ডান" : "বাম";
      var rotClass = isRight ? "cell-rot-right" : "cell-rot-left";
      var abFormatted = (abNum < 10 ? "0" : "") + abNum;

      cell.innerHTML = [
        '<div class="cell-ab-target">AB ' + abFormatted + '</div>',
        '<div class="cell-page-num">' + bnNum + '</div>',
        '<div class="cell-rot-arrow ' + rotClass + '">' + arrowSymbol + ' ' + rotText + '</div>'
      ].join("");

      cell.title = "Artboard " + abNum + " -> Page " + pageNum + " (" + rot + "°)";
      els.impositionGridPreview.appendChild(cell);
    }
  }

  function ensureHostScript(callback) {
    csInterface.evalScript('(typeof FormaEngine === "object" && typeof ReadyFileEngine === "object") ? "ready" : "missing"', function (res) {
      if (res === "ready") {
        if (callback) callback();
      } else {
        var extRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
        var jsxPath = (extRoot + "/jsx/hostscript.jsx").replace(/\\/g, "/").replace(/^\/([A-Za-z]:)/, "$1");
        csInterface.evalScript('$.evalFile(' + JSON.stringify(jsxPath) + ')', function () {
          if (callback) callback();
        });
      }
    });
  }

  function runImposition() {
    var payload = {
      diarySize: state.diarySize,
      sectionType: state.sectionType,
      formaBatch: state.formaBatch,
      mappingScheme: state.mappingScheme,
      orientationMode: state.orientationMode
    };

    showStatus("ফর্মা সেটআপ প্রক্রিয়াকরণ চলছে...", "info");
    els.btnRunImposition.disabled = true;

    ensureHostScript(function () {
      var script = "FormaEngine.executeImposition('" + JSON.stringify(payload) + "')";
      csInterface.evalScript(script, function (res) {
        els.btnRunImposition.disabled = false;
        try {
          var result = JSON.parse(res);
          if (result.success) {
            showStatus(result.message, "success", 6000);
          } else {
            showStatus(result.error, "error", 7000);
          }
        } catch (err) {
          showStatus("Result: " + res, "error", 7000);
        }
      });
    });
  }

  function runPrintDemo() {
    var btn = document.getElementById("btnPrintDemo");
    if (btn) btn.disabled = true;
    showStatus("প্রিন্ট ডেমোর জন্য আর্টবোর্ড প্রস্তুত করা হচ্ছে...", "info");

    ensureHostScript(function () {
      var script = "FormaEngine.executePrintDemo('" + state.sectionType + "')";
      csInterface.evalScript(script, function (res) {
        if (btn) btn.disabled = false;
        try {
          var result = JSON.parse(res);
          if (result.success) {
            showStatus(result.message || "ডেমো প্রিন্ট সম্পন্ন।", "success", 7000);
          } else {
            showStatus(result.error || "প্রিন্ট ডেমো ব্যর্থ হয়েছে।", "error", 7000);
          }
        } catch (err) {
          showStatus("Result: " + res, "error", 7000);
        }
      });
    });
  }

  function runRestoreSheet() {
    var btn = document.getElementById("btnRestoreSheet");
    if (btn) btn.disabled = true;
    showStatus("আর্টবোর্ড পুরো শিটে ফিট করা হচ্ছে...", "info");

    ensureHostScript(function () {
      var script = "FormaEngine.restoreFullSheet('" + state.sectionType + "')";
      csInterface.evalScript(script, function (res) {
        if (btn) btn.disabled = false;
        try {
          var result = JSON.parse(res);
          if (result.success) {
            showStatus(result.message || "আর্টবোর্ড সফলভাবে শিট বাউন্সে ফিট করা হয়েছে।", "success", 5000);
          } else {
            showStatus(result.error || "শিট ফিট ব্যর্থ হয়েছে।", "error", 6000);
          }
        } catch (err) {
          showStatus("Result: " + res, "error", 6000);
        }
      });
    });
  }

  var BENGALI_DICTIONARY = {
    "islampur": "ইসলামপুর",
    "malibagh": "মালিবাগ",
    "madrasa": "মাদ্রাসা",
    "madrasha": "মাদ্রাসা",
    "madrasah": "মাদ্রাসা",
    "jamia": "জামিয়া",
    "jamiya": "জামিয়া",
    "islamia": "ইসলামিয়া",
    "darul": "দারুল",
    "uloom": "উলুম",
    "ulum": "উলুম",
    "qawmi": "কওমি",
    "hafizia": "হাফেজিয়া",
    "shohid": "শহীদ",
    "shahid": "শহীদ",
    "school": "স্কুল",
    "college": "কলেজ",
    "dhaka": "ঢাকা",
    "bogura": "বগুড়া",
    "khulna": "খুলনা",
    "barishal": "বরিশাল",
    "sylhet": "সিলেট",
    "rajshahi": "রাজশাহী",
    "chattogram": "চট্টগ্রাম",
    "chittagong": "চট্টগ্রাম",
    "comilla": "কুমিল্লা",
    "narayanganj": "নারায়ণগঞ্জ",
    "gazipur": "গাজীপুর",
    "jatrabari": "যাত্রাবাড়ী",
    "uttara": "উত্তরা",
    "mirpur": "মিরপুর",
    "dhanmondi": "ধানমন্ডি",
    "colorlab": "কালারল্যাব",
    "al": "আল",
    "nur": "নূর",
    "noor": "নূর",
    "huda": "হুদা",
    "furqan": "ফুরকান"
  };

  function toBengaliWords(engStr) {
    if (!engStr) return "";
    var words = engStr.trim().split(/\s+/);
    var bnWords = words.map(function (w) {
      var key = w.toLowerCase().replace(/[^a-z]/g, "");
      return BENGALI_DICTIONARY[key] || w;
    });
    return bnWords.join(" ");
  }

  function updateCtpUI() {
    var badge = document.getElementById("badgeCtpColorMode");
    var descLine = document.getElementById("ctpColorDescLine");
    var selMode = document.getElementById("selCtpColorMode");
    var mode = selMode ? selMode.value : "auto";

    var is4Color = false;
    if (mode === "4color") is4Color = true;
    else if (mode === "2color") is4Color = false;
    else {
      is4Color = (state.sectionType === "album_16" || state.sectionType === "album_8");
    }

    if (badge) {
      badge.textContent = is4Color ? "৪-কালার সিএমওয়াইকে" : "২-কালার প্লেট";
      badge.style.color = is4Color ? "#34c759" : "#0a84ff";
      badge.style.background = is4Color ? "rgba(52, 199, 89, 0.15)" : "rgba(10, 132, 255, 0.15)";
    }
    if (descLine) {
      descLine.textContent = is4Color
        ? "• ৪-কালার ফুল কালার (CMYK কালার অপরিবর্তিত থাকবে)"
        : "• ম্যাজেন্টা ও ইয়েলো অপসারিত (Cyan & Black 2-Color)";
    }
  }

  function runCtpPrep() {
    var btn = document.getElementById("btnRunCtp");
    var selMode = document.getElementById("selCtpColorMode");
    var modeVal = selMode ? selMode.value : "auto";

    if (btn) btn.disabled = true;
    showStatus("সিটিপি প্রস্তুতি (গ্রিড ক্লিন, আউটলাইন, এম্বেড) চলছে...", "info");

    ensureHostScript(function () {
      var ctpPayload = {
        sectionType: state.sectionType,
        colorMode: modeVal
      };
      var script = "FormaEngine.executeCtpPrep('" + JSON.stringify(ctpPayload).replace(/'/g, "\\'") + "')";
      csInterface.evalScript(script, function (res) {
        if (btn) btn.disabled = false;
        try {
          var result = JSON.parse(res);
          if (result.success) {
            var is4Col = (modeVal === "4color" || (modeVal === "auto" && (state.sectionType === "album_16" || state.sectionType === "album_8")));
            var modeTxt = is4Col ? "৪-কালার সিএমওয়াইকে (ফুল কালার অক্ষুণ্ণ)" : "২-কালার (ম্যাজেন্টা ও ইয়েলো অপসারিত)";
            var guideTxt = (typeof result.removedGuides === "number") ? ("গাইড ক্লিন (" + result.removedGuides + "টি)") : "গাইড ও গ্রিড ক্লিন";
            var successMsg = "সিটিপি প্রস্তুতি সম্পন্ন [" + modeTxt + "]! " + guideTxt + ", ছবি এম্বেড ও টেক্সট আউটলাইন করা হয়েছে।";
            showStatus(successMsg, "success", 8000);
          } else {
            showStatus(result.error || "সিটিপি প্রিপারেশন ব্যর্থ হয়েছে।", "error", 7000);
          }
        } catch (err) {
          showStatus("Result: " + res, "error", 7000);
        }
      });
    });
  }

  function openInSystemBrowser(url) {
    var opened = false;
    try {
      if (window.__adobe_cep__ && typeof window.__adobe_cep__.openURLInDefaultBrowser === "function") {
        window.__adobe_cep__.openURLInDefaultBrowser(url);
        opened = true;
      }
    } catch (e) {}

    if (!opened) {
      try {
        if (typeof csInterface !== "undefined" && typeof csInterface.openURLInDefaultBrowser === "function") {
          csInterface.openURLInDefaultBrowser(url);
          opened = true;
        }
      } catch (e) {}
    }

    if (!opened) {
      try {
        if (window.cep && window.cep.process && typeof window.cep.process.createProcess === "function") {
          var isWin = (navigator.platform.indexOf("Win") !== -1);
          if (isWin) {
            window.cep.process.createProcess("C:\\Windows\\explorer.exe", url);
          } else {
            window.cep.process.createProcess("/usr/bin/open", url);
          }
          opened = true;
        }
      } catch (e) {}
    }

    if (!opened) {
      try {
        var isWinPlat = (navigator.platform.indexOf("Win") !== -1);
        if (isWinPlat) {
          csInterface.evalScript('try { app.system("cmd.exe /c start \\"\\" \\"' + url + '\\""); } catch(e){}');
        } else {
          csInterface.evalScript('try { var f = new File("/usr/bin/open"); if (f.exists) { app.system("/usr/bin/open \\"' + url + '\\""); } } catch(e){}');
        }
      } catch (e) {}
    }
  }

  function autoDetectDoc(quiet) {
    ensureHostScript(function () {
      csInterface.evalScript("FormaEngine.getActiveDocInfo()", function (res) {
        if (!res) return;
        try {
          var info = JSON.parse(res);
          if (info && info.hasDoc) {
            if (info.detectedType && els.selSectionType) {
              els.selSectionType.value = info.detectedType;
              state.sectionType = info.detectedType;
              els.selSectionType.dispatchEvent(new Event("change"));
            }
            renderPreview();
            updateCtpUI();
            if (!quiet) {
              var typeLabel = "ইনার (Inner 16)";
              if (state.sectionType === "album_16") typeLabel = "অ্যালবাম (Album 16)";
              else if (state.sectionType === "album_8") typeLabel = "অ্যালবাম (Album 8)";
              else if (state.sectionType === "note_16") typeLabel = "নোট (Note 16)";
              showStatus("ডকুমেন্ট ডিটেক্টেড: " + info.name + " [" + typeLabel + "]", "info", 3000);
            }
          }
        } catch (e) {}
      });
    });
  }

  function initTabs() {
    var tabBtns = document.querySelectorAll(".mode-tab-btn");
    var tabImposition = document.getElementById("tabImposition");
    var tabReadyFiles = document.getElementById("tabReadyFiles");
    var TAB_KEY = "colorlab_forma_active_tab";

    function switchTab(tabName) {
      tabBtns.forEach(function (btn) {
        var isTarget = btn.getAttribute("data-tab") === tabName;
        btn.classList.toggle("active", isTarget);
        btn.setAttribute("aria-selected", isTarget ? "true" : "false");
      });
      if (tabImposition) tabImposition.classList.toggle("active", tabName === "imposition");
      if (tabReadyFiles) tabReadyFiles.classList.toggle("active", tabName === "readyfiles");
      try { localStorage.setItem(TAB_KEY, tabName); } catch (e) {}
    }

    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    try {
      var savedTab = localStorage.getItem(TAB_KEY);
      if (savedTab === "readyfiles") switchTab("readyfiles");
    } catch (e) {}
  }

  function initReadyFileGenerator() {
    var fs = null;
    var path = null;
    var os = null;
    var exec = null;
    try {
      fs = require("fs");
      path = require("path");
      os = require("os");
      exec = require("child_process").exec;
    } catch (e) {}

    var RF_STORAGE_KEY = "colorlab_forma_ready_files_v1";
    var defaultSetup = (os && path) ? path.join(os.homedir(), "Downloads", "Setup Folder") : "";

    var rfState = {
      setupFolder: defaultSetup,
      sizes: [],
      selectedSize: "",
      templates: [],
      selectedMap: {},
      innerCount: 3,
      innerStart: 1,
      englishName: "",
      banglaName: "",
      outputFolder: "",
      useSubfolder: false,
      overwriteExisting: true,
      pdfCompatible: false,
      keepOpen: false,
      lastGeneratedFolder: "",
      isRunning: false
    };

    var elBadgeSize = document.getElementById("rfBadgeSize");
    var elSetupPath = document.getElementById("rfSetupPathDisplay");
    var elSizeBtnGroup = document.getElementById("rfSizeBtnGroup");
    var elInpEng = document.getElementById("rfInpEnglishName");
    var elInpBn = document.getElementById("rfInpBanglaName");
    var elEngWarn = document.getElementById("rfEngWarn");
    var elTemplateList = document.getElementById("rfTemplateList");
    var elBadgeTotal = document.getElementById("rfBadgeTotalFiles");
    var elInpInnerStart = document.getElementById("rfInpInnerStart");
    var elOutputPath = document.getElementById("rfOutputPathDisplay");
    var elChkSubfolder = document.getElementById("rfChkSubfolder");
    var elChkOverwrite = document.getElementById("rfChkOverwrite");
    var elChkPdfCompat = document.getElementById("rfChkPdfCompat");
    var elChkKeepOpen = document.getElementById("rfChkKeepOpen");
    var elPreviewList = document.getElementById("rfPreviewList");
    var elProgressWrap = document.getElementById("rfProgressWrap");
    var elProgressFill = document.getElementById("rfProgressFill");
    var elProgressText = document.getElementById("rfProgressText");
    var elProgressCount = document.getElementById("rfProgressCount");
    var elBtnGenerate = document.getElementById("rfBtnGenerate");
    var elBtnOpenFolder = document.getElementById("rfBtnOpenFolder");

    if (!elSizeBtnGroup || !elTemplateList) return;

    function toEnTwoDigit(n) {
      return (n < 10 ? "0" : "") + String(n);
    }

    function toBnTwoDigit(n) {
      return toBnNum(toEnTwoDigit(n));
    }

    function sanitizeFilenamePart(raw) {
      return String(raw || "")
        .replace(/[\/\\:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function autoConvertToBangla(engStr) {
      var extraDict = {
        "an": "আন",
        "al": "আল",
        "as": "আস",
        "dar": "দার",
        "jamiatul": "জামিআতুল",
        "mahmudia": "মাহমুদিয়া",
        "tahfizul": "তাহফিজুল",
        "quran": "কুরআন",
        "maktab": "মক্তব"
      };
      var words = String(engStr || "").trim().split(/\s+/);
      var out = [];
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (!w) continue;
        if (/^\d+$/.test(w)) {
          out.push(toBnNum(w));
          continue;
        }
        var key = w.toLowerCase().replace(/[^a-z]/g, "");
        if (extraDict[key]) {
          out.push(extraDict[key]);
        } else if (BENGALI_DICTIONARY[key]) {
          out.push(BENGALI_DICTIONARY[key]);
        } else {
          out.push(w);
        }
      }
      return out.join(" ");
    }

    function loadRfSettings() {
      try {
        var raw = localStorage.getItem(RF_STORAGE_KEY);
        if (!raw) return;
        var saved = JSON.parse(raw);
        if (saved.setupFolder && (!fs || fs.existsSync(saved.setupFolder))) {
          rfState.setupFolder = saved.setupFolder;
        }
        if (saved.selectedSize) rfState.selectedSize = saved.selectedSize;
        if (saved.outputFolder) rfState.outputFolder = saved.outputFolder;
        if (typeof saved.innerCount === "number") rfState.innerCount = Math.max(1, Math.min(30, saved.innerCount));
        if (typeof saved.innerStart === "number") rfState.innerStart = Math.max(1, Math.min(50, saved.innerStart));
        if (typeof saved.useSubfolder === "boolean") rfState.useSubfolder = saved.useSubfolder;
        if (typeof saved.overwriteExisting === "boolean") rfState.overwriteExisting = saved.overwriteExisting;
        if (typeof saved.pdfCompatible === "boolean") rfState.pdfCompatible = saved.pdfCompatible;
        if (typeof saved.keepOpen === "boolean") rfState.keepOpen = saved.keepOpen;
        if (saved.selectedMap && typeof saved.selectedMap === "object") rfState.selectedMap = saved.selectedMap;
      } catch (e) {}
    }

    function saveRfSettings() {
      try {
        localStorage.setItem(RF_STORAGE_KEY, JSON.stringify({
          setupFolder: rfState.setupFolder,
          selectedSize: rfState.selectedSize,
          outputFolder: rfState.outputFolder,
          innerCount: rfState.innerCount,
          innerStart: rfState.innerStart,
          useSubfolder: rfState.useSubfolder,
          overwriteExisting: rfState.overwriteExisting,
          pdfCompatible: rfState.pdfCompatible,
          keepOpen: rfState.keepOpen,
          selectedMap: rfState.selectedMap
        }));
      } catch (e) {}
    }

    function classifyTemplate(fileName) {
      var lower = fileName.toLowerCase();
      if (lower.indexOf("forma ") === 0) {
        return { kind: "inner", label: "Inner Forma (01, 02, 03...)" };
      }
      if (lower.indexOf("4 color") >= 0) {
        var isJhuri = lower.indexOf("jhuri") >= 0 || lower.indexOf("front") >= 0 || lower.indexOf("font") >= 0;
        return {
          kind: "color4",
          label: isJhuri ? "4 Color Album (Front & Back / Jhuri)" : "4 Color Album (Back To Back)"
        };
      }
      if (lower.indexOf("note ") === 0) {
        return { kind: "note", label: "Note Forma" };
      }
      return { kind: "other", label: "Custom Template" };
    }

    function buildOutputFileName(tplFileName, englishName, isInner, formaNum) {
      var idxAt = tplFileName.indexOf("@");
      var prefix = idxAt >= 0 ? tplFileName.slice(0, idxAt + 1) : tplFileName.replace(/\.ai$/i, " @");
      if (isInner) {
        var nn = toEnTwoDigit(formaNum);
        prefix = prefix.replace(/\b(Forma\s+)\d{2}\b/i, "$1" + nn);
      }
      return prefix + englishName + ".ai";
    }

    function scanSizes() {
      rfState.sizes = [];
      if (rfState.setupFolder) {
        elSetupPath.textContent = rfState.setupFolder;
        elSetupPath.title = rfState.setupFolder;
      } else {
        elSetupPath.textContent = "Setup Folder সিলেক্ট করুন...";
      }

      if (!fs || !path || !rfState.setupFolder || !fs.existsSync(rfState.setupFolder)) {
        rfState.selectedSize = "";
        rfState.templates = [];
        renderSizeButtons();
        renderTemplates();
        renderRfPreview();
        return;
      }

      var directAiFiles = fs.readdirSync(rfState.setupFolder).filter(function (f) {
        return /\.ai$/i.test(f) && f.charAt(0) !== ".";
      });

      var entries = fs.readdirSync(rfState.setupFolder, { withFileTypes: true });
      for (var i = 0; i < entries.length; i++) {
        var ent = entries[i];
        if (!ent.isDirectory()) continue;
        if (ent.name.charAt(0) === "." || ent.name === "Ready_File_Generator") continue;
        var dirPath = path.join(rfState.setupFolder, ent.name);
        var files = fs.readdirSync(dirPath).filter(function (f) {
          return /\.ai$/i.test(f) && f.charAt(0) !== ".";
        });
        if (files.length > 0) rfState.sizes.push(ent.name);
      }

      rfState.sizes.sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      });

      if (directAiFiles.length > 0) {
        rfState.sizes.unshift(".");
      }

      if (rfState.sizes.length === 0) {
        rfState.selectedSize = "";
      } else if (rfState.sizes.indexOf(rfState.selectedSize) === -1) {
        if (rfState.sizes.indexOf("2 No Size") >= 0) rfState.selectedSize = "2 No Size";
        else rfState.selectedSize = rfState.sizes[0];
      }

      renderSizeButtons();
      loadTemplatesForSelectedSize();
    }

    function getSizeDisplayLabel(sizeName) {
      if (sizeName === ".") {
        return (path && rfState.setupFolder) ? (path.basename(rfState.setupFolder) || "This Folder") : "This Folder";
      }
      return sizeName;
    }

    function getSizeFolderPath(sizeName) {
      if (sizeName === ".") return rfState.setupFolder;
      return path ? path.join(rfState.setupFolder, sizeName) : (rfState.setupFolder + "/" + sizeName);
    }

    function renderSizeButtons() {
      elSizeBtnGroup.innerHTML = "";
      if (rfState.sizes.length === 0) {
        elBadgeSize.textContent = "Not Found";
        elSizeBtnGroup.innerHTML = '<div style="grid-column:1/-1; color:#98989d; font-size:10px; text-align:center; padding:4px;">Setup Folder বা .ai টেমপ্লেট ফোল্ডার সিলেক্ট করুন</div>';
        return;
      }

      elBadgeSize.textContent = getSizeDisplayLabel(rfState.selectedSize);
      for (var i = 0; i < rfState.sizes.length; i++) {
        (function (sizeName) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "rf-size-btn" + (rfState.selectedSize === sizeName ? " active" : "");

          var title = document.createElement("span");
          title.className = "size-title";
          title.textContent = getSizeDisplayLabel(sizeName);

          var desc = document.createElement("span");
          desc.className = "size-desc";
          var count = fs.readdirSync(getSizeFolderPath(sizeName)).filter(function (f) {
            return /\.ai$/i.test(f) && f.charAt(0) !== ".";
          }).length;
          desc.textContent = count + " templates";

          btn.appendChild(title);
          btn.appendChild(desc);
          btn.addEventListener("click", function () {
            rfState.selectedSize = sizeName;
            saveRfSettings();
            renderSizeButtons();
            loadTemplatesForSelectedSize();
          });
          elSizeBtnGroup.appendChild(btn);
        })(rfState.sizes[i]);
      }
    }

    function loadTemplatesForSelectedSize() {
      rfState.templates = [];
      if (!rfState.selectedSize || !fs || !path) {
        renderTemplates();
        renderRfPreview();
        return;
      }

      var sizeDir = getSizeFolderPath(rfState.selectedSize);
      var files = fs.readdirSync(sizeDir).filter(function (f) {
        return /\.ai$/i.test(f) && f.charAt(0) !== ".";
      });

      var order = { color4: 1, inner: 2, note: 3, other: 4 };
      var list = files.map(function (f) {
        var meta = classifyTemplate(f);
        return {
          fileName: f,
          fullPath: path.join(sizeDir, f),
          kind: meta.kind,
          label: meta.label
        };
      });

      list.sort(function (a, b) {
        if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
        return a.fileName.localeCompare(b.fileName);
      });

      var firstColor4Seen = false;
      for (var i = 0; i < list.length; i++) {
        var tpl = list[i];
        var key = rfState.selectedSize + "::" + tpl.fileName;
        if (typeof rfState.selectedMap[key] !== "boolean") {
          if (tpl.kind === "color4") {
            rfState.selectedMap[key] = !firstColor4Seen;
            firstColor4Seen = true;
          } else {
            rfState.selectedMap[key] = true;
          }
        }
      }

      rfState.templates = list;
      renderTemplates();
      renderRfPreview();
    }

    function renderTemplates() {
      elTemplateList.innerHTML = "";
      if (rfState.templates.length === 0) {
        elTemplateList.innerHTML = '<div class="rf-preview-empty">এই সাইজে কোনো .ai টেমপ্লেট নেই</div>';
        return;
      }

      for (var i = 0; i < rfState.templates.length; i++) {
        (function (tpl) {
          var key = rfState.selectedSize + "::" + tpl.fileName;
          var checked = Boolean(rfState.selectedMap[key]);

          var row = document.createElement("div");
          row.className = "rf-tpl-item" + (checked ? " selected" : "");

          var left = document.createElement("label");
          left.className = "rf-tpl-left";

          var chk = document.createElement("input");
          chk.type = "checkbox";
          chk.checked = checked;
          chk.addEventListener("change", function () {
            rfState.selectedMap[key] = chk.checked;
            saveRfSettings();
            renderTemplates();
            renderRfPreview();
          });

          var info = document.createElement("div");
          info.className = "rf-tpl-info";

          var nameEl = document.createElement("div");
          nameEl.className = "rf-tpl-name";
          nameEl.textContent = tpl.fileName.replace(/@.*\.ai$/i, "@...");
          nameEl.title = tpl.fileName;

          var subEl = document.createElement("div");
          subEl.className = "rf-tpl-sub";
          subEl.textContent = tpl.label;

          info.appendChild(nameEl);
          info.appendChild(subEl);
          left.appendChild(chk);
          left.appendChild(info);
          row.appendChild(left);

          if (tpl.kind === "inner") {
            var stepper = document.createElement("div");
            stepper.className = "rf-stepper";

            var btnDec = document.createElement("button");
            btnDec.type = "button";
            btnDec.className = "rf-step-btn";
            btnDec.textContent = "-";
            btnDec.addEventListener("click", function () {
              rfState.innerCount = Math.max(1, rfState.innerCount - 1);
              saveRfSettings();
              renderTemplates();
              renderRfPreview();
            });

            var inp = document.createElement("input");
            inp.type = "number";
            inp.className = "rf-step-input";
            inp.min = 1;
            inp.max = 30;
            inp.value = rfState.innerCount;
            inp.addEventListener("change", function () {
              var v = parseInt(inp.value, 10);
              rfState.innerCount = isNaN(v) ? 1 : Math.max(1, Math.min(30, v));
              inp.value = rfState.innerCount;
              saveRfSettings();
              renderRfPreview();
            });

            var btnInc = document.createElement("button");
            btnInc.type = "button";
            btnInc.className = "rf-step-btn";
            btnInc.textContent = "+";
            btnInc.addEventListener("click", function () {
              rfState.innerCount = Math.min(30, rfState.innerCount + 1);
              saveRfSettings();
              renderTemplates();
              renderRfPreview();
            });

            stepper.appendChild(btnDec);
            stepper.appendChild(inp);
            stepper.appendChild(btnInc);
            row.appendChild(stepper);
          }

          elTemplateList.appendChild(row);
        })(rfState.templates[i]);
      }
    }

    function buildJobs() {
      var engSafe = sanitizeFilenamePart(rfState.englishName);
      var bnClean = String(rfState.banglaName || "").trim();
      var jobs = [];

      if (!engSafe || !bnClean || !rfState.outputFolder) return jobs;

      var destBase = (rfState.useSubfolder && path)
        ? path.join(rfState.outputFolder, "@" + engSafe)
        : rfState.outputFolder;

      for (var i = 0; i < rfState.templates.length; i++) {
        var tpl = rfState.templates[i];
        var key = rfState.selectedSize + "::" + tpl.fileName;
        if (!rfState.selectedMap[key]) continue;

        if (tpl.kind === "inner") {
          for (var c = 0; c < rfState.innerCount; c++) {
            var fNum = rfState.innerStart + c;
            var outName = buildOutputFileName(tpl.fileName, engSafe, true, fNum);
            jobs.push({
              templatePath: tpl.fullPath,
              outputPath: path ? path.join(destBase, outName) : destBase + "/" + outName,
              outputName: outName,
              destDir: destBase,
              isInner: true,
              formaNum: fNum,
              banglaName: bnClean,
              insideHint: "ফর্মা - " + toBnTwoDigit(fNum) + "  |  " + bnClean
            });
          }
        } else {
          var outSingle = buildOutputFileName(tpl.fileName, engSafe, false, 1);
          jobs.push({
            templatePath: tpl.fullPath,
            outputPath: path ? path.join(destBase, outSingle) : destBase + "/" + outSingle,
            outputName: outSingle,
            destDir: destBase,
            isInner: false,
            formaNum: 1,
            banglaName: bnClean,
            insideHint: bnClean
          });
        }
      }

      return jobs;
    }

    function renderRfPreview() {
      var engRaw = rfState.englishName;
      var engSafe = sanitizeFilenamePart(engRaw);

      if (engRaw.trim() !== engSafe && engRaw.trim().length > 0) {
        elEngWarn.style.display = "block";
        elEngWarn.textContent = "ফাইলনামের অবৈধ অক্ষর সরিয়ে: " + engSafe;
      } else {
        elEngWarn.style.display = "none";
      }

      if (rfState.outputFolder) {
        elOutputPath.textContent = rfState.outputFolder;
        elOutputPath.title = rfState.outputFolder;
        elOutputPath.style.color = "#ffffff";
      } else {
        elOutputPath.textContent = "প্রজেক্ট ফোল্ডার সিলেক্ট করুন...";
        elOutputPath.title = "";
        elOutputPath.style.color = "#98989d";
      }

      var jobs = buildJobs();
      if (!engSafe || !rfState.banglaName.trim()) {
        elBadgeTotal.textContent = "0 Files";
        elPreviewList.innerHTML = '<div class="rf-preview-empty">ইংরেজি ও বাংলা নাম লিখলে এখানে ফাইল লিস্ট দেখাবে</div>';
        elBtnGenerate.disabled = true;
        return;
      }

      if (!rfState.outputFolder) {
        elBadgeTotal.textContent = "No Folder";
        elPreviewList.innerHTML = '<div class="rf-preview-empty">প্রজেক্ট ফোল্ডার (Browse) সিলেক্ট করুন</div>';
        elBtnGenerate.disabled = true;
        return;
      }

      elBadgeTotal.textContent = jobs.length + (jobs.length === 1 ? " File" : " Files");
      if (jobs.length === 0) {
        elPreviewList.innerHTML = '<div class="rf-preview-empty">কমপক্ষে একটি টেমপ্লেট সিলেক্ট করুন</div>';
        elBtnGenerate.disabled = true;
        return;
      }

      elPreviewList.innerHTML = "";
      for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        var row = document.createElement("div");
        row.className = "rf-preview-row";

        var fEl = document.createElement("div");
        fEl.className = "rf-preview-file";
        fEl.textContent = (i + 1) + ". " + job.outputName;

        var tEl = document.createElement("div");
        tEl.className = "rf-preview-text";
        tEl.textContent = "ভেতরে: " + job.insideHint;

        row.appendChild(fEl);
        row.appendChild(tEl);
        elPreviewList.appendChild(row);
      }

      elBtnGenerate.disabled = rfState.isRunning;
    }

    function evalScriptPromise(script) {
      return new Promise(function (resolve, reject) {
        ensureHostScript(function () {
          csInterface.evalScript(script, function (res) {
            if (res === "EvalScript error.") {
              reject(new Error("ExtendScript error while executing script."));
              return;
            }
            resolve(res);
          });
        });
      });
    }

    async function runReadyFileGeneration() {
      if (rfState.isRunning) return;
      var jobs = buildJobs();
      if (jobs.length === 0) return;

      rfState.isRunning = true;
      elBtnGenerate.disabled = true;
      elBtnOpenFolder.classList.remove("visible");
      elProgressWrap.classList.add("visible");
      showStatus("রেডি ফাইল তৈরি হচ্ছে... দয়া করে অপেক্ষা করুন", "info");

      var created = 0;
      var skipped = 0;
      var errors = [];
      var destDir = jobs[0].destDir;

      for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        var pct = Math.round((i / jobs.length) * 100);
        elProgressFill.style.width = pct + "%";
        elProgressText.textContent = job.outputName;
        elProgressCount.textContent = (i + 1) + " / " + jobs.length;

        if (!rfState.overwriteExisting && fs && fs.existsSync(job.outputPath)) {
          skipped++;
          continue;
        }

        var payload = {
          templatePath: job.templatePath,
          outputPath: job.outputPath,
          banglaName: job.banglaName,
          isInner: job.isInner,
          formaNum: job.formaNum,
          overwriteExisting: rfState.overwriteExisting,
          pdfCompatible: rfState.pdfCompatible,
          keepOpen: rfState.keepOpen
        };

        try {
          var rawRes = await evalScriptPromise("ReadyFileEngine.generateSingleFile(" + JSON.stringify(JSON.stringify(payload)) + ")");
          var res = JSON.parse(rawRes);
          if (res && res.ok) {
            if (res.skipped) skipped++;
            else created++;
          } else {
            errors.push(job.outputName + ": " + (res && res.error ? res.error : "Unknown error"));
          }
        } catch (err) {
          errors.push(job.outputName + ": " + err.message);
        }
      }

      elProgressFill.style.width = "100%";
      elProgressText.textContent = "সম্পন্ন হয়েছে";
      elProgressCount.textContent = jobs.length + " / " + jobs.length;

      rfState.isRunning = false;
      rfState.lastGeneratedFolder = destDir;
      elBtnGenerate.disabled = false;

      if (errors.length > 0) {
        showStatus("সমস্যা: " + created + "টি হয়েছে, " + errors.length + "টিতে এরর (" + errors[0] + ")", "error", 9000);
      } else {
        var msg = created + "টি Ready File সফলভাবে তৈরি হয়েছে!";
        if (skipped > 0) msg += " (" + skipped + "টি স্কিপড)";
        showStatus(msg, "success", 8000);
        elBtnOpenFolder.classList.add("visible");
      }
    }

    document.getElementById("rfBtnDefaultSetup").addEventListener("click", function () {
      if (defaultSetup) {
        rfState.setupFolder = defaultSetup;
        rfState.selectedSize = "";
        saveRfSettings();
        scanSizes();
        showStatus("ডিফল্ট Setup Folder লোড করা হয়েছে", "info", 3000);
      }
    });

    document.getElementById("rfBtnBrowseSetup").addEventListener("click", async function () {
      try {
        var raw = await evalScriptPromise(
          "ReadyFileEngine.pickFolder(" +
            JSON.stringify("Select Setup Folder (1 No / 2 No / 3 No Size)") +
            ", " +
            JSON.stringify(rfState.setupFolder) +
            ")"
        );
        var res = JSON.parse(raw);
        if (res && res.ok && res.path) {
          rfState.setupFolder = res.path;
          saveRfSettings();
          scanSizes();
        }
      } catch (e) {
        showStatus("Folder picker error: " + e.message, "error", 5000);
      }
    });

    document.getElementById("rfBtnBrowseOutput").addEventListener("click", async function () {
      try {
        var raw = await evalScriptPromise(
          "ReadyFileEngine.pickFolder(" +
            JSON.stringify("Select Project Folder to Save Ready Files") +
            ", " +
            JSON.stringify(rfState.outputFolder || rfState.setupFolder) +
            ")"
        );
        var res = JSON.parse(raw);
        if (res && res.ok && res.path) {
          rfState.outputFolder = res.path;
          saveRfSettings();
          renderRfPreview();
        }
      } catch (e) {
        showStatus("Folder picker error: " + e.message, "error", 5000);
      }
    });

    document.getElementById("rfBtnAutoBn").addEventListener("click", function () {
      if (!rfState.englishName.trim()) return;
      rfState.banglaName = autoConvertToBangla(rfState.englishName);
      elInpBn.value = rfState.banglaName;
      renderRfPreview();
    });

    document.getElementById("rfBtnClearNames").addEventListener("click", function () {
      rfState.englishName = "";
      rfState.banglaName = "";
      elInpEng.value = "";
      elInpBn.value = "";
      elBtnOpenFolder.classList.remove("visible");
      elProgressWrap.classList.remove("visible");
      renderRfPreview();
      elInpEng.focus();
    });

    elInpEng.addEventListener("input", function () {
      rfState.englishName = elInpEng.value;
      renderRfPreview();
    });

    elInpBn.addEventListener("input", function () {
      rfState.banglaName = elInpBn.value;
      renderRfPreview();
    });

    document.getElementById("rfBtnStartDec").addEventListener("click", function () {
      rfState.innerStart = Math.max(1, rfState.innerStart - 1);
      elInpInnerStart.value = rfState.innerStart;
      saveRfSettings();
      renderRfPreview();
    });

    document.getElementById("rfBtnStartInc").addEventListener("click", function () {
      rfState.innerStart = Math.min(50, rfState.innerStart + 1);
      elInpInnerStart.value = rfState.innerStart;
      saveRfSettings();
      renderRfPreview();
    });

    elInpInnerStart.addEventListener("change", function () {
      var v = parseInt(elInpInnerStart.value, 10);
      rfState.innerStart = isNaN(v) ? 1 : Math.max(1, Math.min(50, v));
      elInpInnerStart.value = rfState.innerStart;
      saveRfSettings();
      renderRfPreview();
    });

    elChkSubfolder.addEventListener("change", function () {
      rfState.useSubfolder = elChkSubfolder.checked;
      saveRfSettings();
      renderRfPreview();
    });

    elChkOverwrite.addEventListener("change", function () {
      rfState.overwriteExisting = elChkOverwrite.checked;
      saveRfSettings();
    });

    elChkPdfCompat.addEventListener("change", function () {
      rfState.pdfCompatible = elChkPdfCompat.checked;
      saveRfSettings();
    });

    elChkKeepOpen.addEventListener("change", function () {
      rfState.keepOpen = elChkKeepOpen.checked;
      saveRfSettings();
    });

    elBtnGenerate.addEventListener("click", runReadyFileGeneration);

    elBtnOpenFolder.addEventListener("click", function () {
      if (!rfState.lastGeneratedFolder) return;
      var folder = rfState.lastGeneratedFolder;
      if (exec) {
        var isWin = (typeof process !== "undefined" && process.platform === "win32") ||
                    (navigator.platform && navigator.platform.indexOf("Win") !== -1);
        if (isWin) {
          exec('explorer "' + folder.replace(/"/g, '\\"') + '"');
        } else {
          exec('open "' + folder.replace(/"/g, '\\"') + '"');
        }
      } else {
        evalScriptPromise("ReadyFileEngine.openFolder(" + JSON.stringify(folder) + ")").catch(function () {});
      }
    });

    loadRfSettings();
    elInpInnerStart.value = rfState.innerStart;
    elChkSubfolder.checked = rfState.useSubfolder;
    elChkOverwrite.checked = rfState.overwriteExisting;
    elChkPdfCompat.checked = rfState.pdfCompatible;
    elChkKeepOpen.checked = rfState.keepOpen;
    scanSizes();
    renderRfPreview();

    return { refresh: scanSizes };
  }

  function init() {
    ensureHostScript();
    initTabs();
    initSizePresets();
    initSectionSelection();
    var readyFilesApi = initReadyFileGenerator();
    els.btnRunImposition.addEventListener("click", runImposition);

    var btnPrintDemo = document.getElementById("btnPrintDemo");
    if (btnPrintDemo) {
      btnPrintDemo.addEventListener("click", runPrintDemo);
    }

    var btnRestoreSheet = document.getElementById("btnRestoreSheet");
    if (btnRestoreSheet) {
      btnRestoreSheet.addEventListener("click", runRestoreSheet);
    }

    var btnRunCtp = document.getElementById("btnRunCtp");
    if (btnRunCtp) {
      btnRunCtp.addEventListener("click", runCtpPrep);
    }

    var selCtpMode = document.getElementById("selCtpColorMode");
    if (selCtpMode) {
      selCtpMode.addEventListener("change", updateCtpUI);
    }

    els.btnRefreshDocs.addEventListener("click", function () {
      autoDetectDoc(false);
      if (readyFilesApi && typeof readyFilesApi.refresh === "function") {
        readyFilesApi.refresh();
      }
    });

    var authorLink = document.getElementById("authorGithubLink");
    if (authorLink) {
      authorLink.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        var url = this.getAttribute("data-url") || "https://github.com/yahiabinzaman";
        openInSystemBrowser(url);
      });
    }

    autoDetectDoc(true);
    updateCtpUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
