// No URL formatting needed for local files

// Temporarily filter projects by year.
// Set to null to show all years again.
const TEMP_ONLY_YEAR = null;

// Phase 1 naming contract: Figma source names -> code aliases -> DOM families.
const FIGMA_NAME_CONTRACT = {
  sourceNames: ["h1", "h2", "p", "Padding S", "Padding L", "Margin S", "Margin L"],
  aliases: {
    "Padding S": "paddingSm",
    "Padding L": "paddingLg",
    "Margin S": "marginSm",
    "Margin L": "marginLg",
    h1: "typeH1",
    h2: "typeH2",
    p: "typeBody",
  },
  domFamilies: ["library-*", "filter-*", "project-*"],
};

const DOM_IDS = {
  projectsContainer: "projects-grid",
  filterPlaceholder: "library-placeholder",
  selectedTags: "library-selected-tag",
  filterMenu: "library-filter",
  introText: "intro-text",
  projectCounter: "project-counter",
  toolsHeading: "tools",
  yearHeading: "year",
  toolOptions: "library-tool-options",
  yearOptions: "library-year-options",
};

const DOM_CLASSES = {
  projectCard: "project-card",
  expanded: "expanded",
  collapsing: "collapsing",
  projectVideo: "project-video",
  projectImage: "project-image",
  noVideo: "no-video",
  projectVideoContainer: "project-video-container",
  projectName: "project-name",
  projectMeta: "project-meta",
  projectTeam: "project-team",
  projectYear: "project-year",
  projectBrief: "project-brief",
  filterOption: "filter-option",
  /** Header tag chips in `#library-filter` only — not `.filter-option`. */
  libraryFilterLink: "library-filter-link",
  selected: "selected",
  selectedTagInline: "library-selected-inline-tag",
  filterList: "filter-list",
  projectCardWhatIf: "project-card--what-if",
  whatIfStatement: "project-whatif-statement",
};

/** When true, grid shows only projects with usable `What If` data; cards use What If image + statement + brief. */
let whatIfsMode = false;

function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getWhatIf(record) {
  const w = record["What If"];
  if (!w || typeof w !== "object") return null;
  return w;
}

function hasWhatIfContent(record) {
  const w = getWhatIf(record);
  if (!w) return false;
  const img = (w.Image || "").trim();
  if (img && !/XX\.png$/i.test(img) && img !== "XX") return true;
  const st = (w.Statement || "").trim();
  if (st && st !== "XX") return true;
  const br = (w.Brief || "").trim();
  if (br && br !== "XX") return true;
  return false;
}

// Load local JSON data
function loadLocalData() {
  fetch("table.json")
    .then((response) => response.json())
    .then((data) => {
      const records = [];
      Object.keys(data).forEach((year) => {
        if (TEMP_ONLY_YEAR && year !== TEMP_ONLY_YEAR) return;
        if (Array.isArray(data[year])) {
          data[year].forEach((project) => {
            project.year = year;
            records.push(project);
          });
        }
      });

      if (records.length > 0) {
        records.sort((a, b) => {
          const dateA = parseDate(a["Date"]);
          const dateB = parseDate(b["Date"]);
          if (dateA && dateB) return dateB - dateA;
          if (dateA && !dateB) return -1;
          if (dateB && !dateA) return 1;
          return 0;
        });
        displayProjects(records);
      } else {
        document.getElementById(DOM_IDS.projectsContainer).innerHTML =
          "<p>No projects found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      document.getElementById(DOM_IDS.projectsContainer).innerHTML =
        "<p>Error loading data.</p>";
    });
}

// Global variables for filtering
let allRecords = [];
let selectedFilters = [];
let selectedTools = [];
let selectedYears = [];
let totalProjectCount = 0;

function syncWhatIfsLinkSelectedState() {
  const el = document.getElementById("what-ifs");
  if (!el) return;
  el.classList.toggle(DOM_CLASSES.selected, whatIfsMode);
}

function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
}

function parseToolsList(toolsString) {
  if (!toolsString) return [];
  return toolsString
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
}

function ensureFilterOptionContainers() {
  const pairs = [
    [DOM_IDS.toolOptions, DOM_IDS.toolsHeading],
    [DOM_IDS.yearOptions, DOM_IDS.yearHeading],
  ];
  pairs.forEach(([id, afterId]) => {
    if (document.getElementById(id)) return;
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "filter-options";
    const after = document.getElementById(afterId);
    if (after) after.insertAdjacentElement("afterend", wrap);
  });
}

function parseDate(dateString) {
  if (!dateString) return null;
  if (dateString.includes("-")) {
    const parts = dateString.split("-");
    if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return null;
}

function extractYear(dateString) {
  if (!dateString) return "";
  return dateString.split("-")[0];
}

function isMobileDevice() {
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

// Display projects in grid
function displayProjects(records) {
  allRecords = records;
  const container = document.getElementById(DOM_IDS.projectsContainer);
  container.innerHTML = "";

  const validRecords = records.filter((record) => {
    const projectName = record["Project"] || record["project"];
    const isActive = record["Active"] !== false && record["Active"] !== null;
    return projectName && projectName.trim() !== "" && isActive;
  });

  const filteredRecords = validRecords.filter((record) => {
    if (whatIfsMode && !hasWhatIfContent(record)) return false;

    const tags = parseTags(record["Tags"] || "");
    if (selectedFilters.length > 0 && !selectedFilters.some((f) => tags.includes(f))) return false;

    const projectTools = parseToolsList(record["Tools"] || "");
    if (selectedTools.length > 0 && !selectedTools.some((t) => projectTools.includes(t))) return false;

    const y = extractYear(record["Date"]) || record.year || "";
    if (selectedYears.length > 0 && !selectedYears.includes(y)) return false;

    return true;
  });

  populateTagFilter(validRecords);
  ensureFilterOptionContainers();
  populateSecondaryFilters(validRecords);
  totalProjectCount = validRecords.length;

  filteredRecords.forEach((record) => {
    const projectDiv = document.createElement("div");
    projectDiv.className = DOM_CLASSES.projectCard;

    const projectName = record["Project"];
    const videoField = record["Video"];
    const imageField = record["Image"];
    const dateField = record["Date"];
    const yearText = extractYear(dateField) || record.year || "";
    const teamText = (record["Team"] || "").trim();
    const brief = record["Brief"] || "";
    const whatIf = getWhatIf(record);
    const useWhatIfLayout = whatIfsMode && whatIf && hasWhatIfContent(record);

    let mediaHTML = "";

    if (useWhatIfLayout) {
      projectDiv.classList.add(DOM_CLASSES.projectCardWhatIf);
      const wiImg = (whatIf.Image || "").trim();
      const wiBrief = (whatIf.Brief || "").trim();
      const wiStatement = (whatIf.Statement || "").trim();
      if (wiImg && !/XX\.png$/i.test(wiImg)) {
        mediaHTML = `<img class="${DOM_CLASSES.projectImage}" src="${wiImg}" alt="${escapeHtml(projectName)}" loading="lazy" decoding="async">`;
      } else {
        mediaHTML = `<div class="${DOM_CLASSES.noVideo}">No What If image</div>`;
      }
      const briefInner = [
        wiStatement
          ? `<p class="${DOM_CLASSES.whatIfStatement}">${escapeHtml(wiStatement)}</p>`
          : "",
        wiBrief ? `<p>${escapeHtml(wiBrief)}</p>` : "",
      ].join("");
      projectDiv.innerHTML = `
      <div class="${DOM_CLASSES.projectVideoContainer}">${mediaHTML}</div>
      <h2 class="${DOM_CLASSES.projectName}">${escapeHtml(projectName)}</h2>
      <div class="${DOM_CLASSES.projectMeta}" style="display: none;"></div>
      <div class="${DOM_CLASSES.projectBrief}" style="display: none;">
        ${briefInner}
      </div>
    `;
    } else {
    if (videoField && videoField.trim() !== "") {
      // Desktop: preload="metadata" gives a first-frame thumbnail immediately.
      // Mobile: preload="none" — the thumbnail painter loads them in controlled batches.
      const preloadValue = isMobileDevice() ? "none" : "metadata";
      mediaHTML = `
        <video class="${DOM_CLASSES.projectVideo}"
               preload="${preloadValue}"
               loop
               muted
               playsinline>
          <source src="${videoField}" type="video/mp4">
          <source src="${videoField}" type="video/quicktime">
          Your browser doesn't support video.
        </video>
      `;
    } else if (imageField && imageField.trim() !== "") {
      mediaHTML = `<img class="${DOM_CLASSES.projectImage}" src="${imageField}" alt="${projectName}" loading="lazy" decoding="async">`;
    } else {
      mediaHTML = `<div class="${DOM_CLASSES.noVideo}">No media available</div>`;
    }

    projectDiv.innerHTML = `
      <div class="${DOM_CLASSES.projectVideoContainer}">${mediaHTML}</div>
      <h2 class="${DOM_CLASSES.projectName}">${escapeHtml(projectName)}</h2>
      <div class="${DOM_CLASSES.projectMeta}" style="display: none;">
          ${teamText ? `<p class="${DOM_CLASSES.projectTeam}">by ${escapeHtml(teamText)}</p>` : ""}
          ${yearText ? `<p class="${DOM_CLASSES.projectYear}">${escapeHtml(yearText)}</p>` : ""}
      </div>
      <div class="${DOM_CLASSES.projectBrief}" style="display: none;">
        ${brief ? `<p>${escapeHtml(brief)}</p>` : ""}
      </div>
    `;
    }

    const video = projectDiv.querySelector(`.${DOM_CLASSES.projectVideo}`);
    const isMobile = isMobileDevice();

    // ── Desktop hover behaviour ──────────────────────────────────────
    if (video && !isMobile) {
      let isHovering = false;

      const ensureLoaded = () => {
        if (video.preload !== "auto") {
          video.preload = "auto";
          video.load();
        }
      };

      projectDiv.addEventListener("mouseenter", () => {
        isHovering = true;
        ensureLoaded();
      
        // Always start muted — Firefox blocks unmuted autoplay on hover.
        // Unmute only after play() resolves (requires a prior user gesture).
        video.muted = true;
        const p = video.play();
        if (p !== undefined) {
          p.then(() => {
            // play() succeeded — now safe to unmute if user is still hovering
            if (isHovering) video.muted = false;
          }).catch((err) => {
            console.log("Hover play failed:", err);
          });
        }
      });

      projectDiv.addEventListener("mouseleave", () => {
        isHovering = false;
        video.muted = true;
        video.pause();
        video.currentTime = 0;
      });

      projectDiv.addEventListener("click", () => {
        if (video.muted && !video.paused) video.muted = false;
      });
    }

    // ── Click handler (mobile + desktop expand/collapse) ─────────────
    projectDiv.addEventListener("click", () => {
      const isExpanded = projectDiv.classList.contains(DOM_CLASSES.expanded);

      if (isMobile && video) {
        if (!isExpanded) {
          video.load();
          const playVideo = () => {
            video.muted = false;
            video.play().catch((err) => console.log("iOS play failed:", err));
          };
          if (video.readyState >= 1) {
            playVideo();
          } else {
            video.addEventListener("loadedmetadata", playVideo, { once: true });
          }
        } else {
          video.muted = true;
          video.pause();
        }
      }

      toggleProjectExpansion(projectDiv);
    });

    container.appendChild(projectDiv);
  });

  updateProjectCounter(filteredRecords.length, totalProjectCount);

  if (isMobileDevice()) {
    forceIOSVideoThumbnails(container);
  } else {
    preloadDesktopVideos(container);
  }
}

// ── Desktop: buffer videos before they reach the viewport ────────────────────
function preloadDesktopVideos(container) {
  const videos = container.querySelectorAll(`video.${DOM_CLASSES.projectVideo}`);
  if (!videos.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          observer.unobserve(video);
          if (video.preload !== "auto") video.preload = "auto";
        }
      });
    },
    {
      rootMargin: "800px", // increased from 400px — buffer earlier
      threshold: 0,
    }
  );

  videos.forEach((video) => observer.observe(video));
}

// ── Mobile: paint first-frame thumbnails in parallel batches ─────────────────
//
// Key changes vs the old version:
//   • CONCURRENCY = 3  — run 3 paints at once instead of 1
//   • queue.unshift    — visible videos jump to the front of the queue
//   • 5 s timeout      — down from 8 s so a stalled video unblocks faster
//   • 150 ms paint delay — down from 200 ms
//
function forceIOSVideoThumbnails(container) {
  const videos = container.querySelectorAll(`video.${DOM_CLASSES.projectVideo}`);
  if (!videos.length) return;

  const CONCURRENCY = 3;
  let active = 0;
  const queue = [];

  function paintOne(video) {
    active++;
    video.muted = true;

    const done = () => {
      active--;
      next();
    };

    const paintFrame = () => {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setTimeout(() => {
            const card = video.closest(`.${DOM_CLASSES.projectCard}`);
            if (!card?.classList.contains(DOM_CLASSES.expanded)) video.pause();
            done();
          }, 150);
        }).catch((err) => {
          console.log("iOS thumbnail paint failed:", err);
          done();
        });
      } else {
        done();
      }
    };

    if (video.readyState >= 2) {
      paintFrame();
    } else {
      video.addEventListener("loadeddata", paintFrame, { once: true });
      // Don't let one stalled video block the whole queue
      setTimeout(() => {
        if (video.readyState < 2) {
          video.removeEventListener("loadeddata", paintFrame);
          done();
        }
      }, 5000); // reduced from 8 s
      if (video.readyState === 0) video.load();
    }
  }

  function next() {
    while (active < CONCURRENCY && queue.length > 0) {
      paintOne(queue.shift());
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          queue.unshift(entry.target); // front of queue = painted first
          next();
        }
      });
    },
    { rootMargin: "300px", threshold: 0 }
  );

  videos.forEach((video) => observer.observe(video));
}

// ── Expand / collapse ────────────────────────────────────────────────────────
function toggleProjectExpansion(projectDiv) {
  const isExpanded = projectDiv.classList.contains(DOM_CLASSES.expanded);
  const isMobile = isMobileDevice();

  document
    .querySelectorAll(`.${DOM_CLASSES.projectCard}.${DOM_CLASSES.expanded}`)
    .forEach((card) => {
    if (card !== projectDiv) {
      if (isMobile) {
        const v = card.querySelector(`.${DOM_CLASSES.projectVideo}`);
        if (v) { v.muted = true; v.pause(); }
      }
      collapseProject(card);
    }
    });

  if (isExpanded) {
    collapseProject(projectDiv);
  } else {
    projectDiv.classList.add(DOM_CLASSES.expanded);
    const meta = projectDiv.querySelector(`.${DOM_CLASSES.projectMeta}`);
    const brief = projectDiv.querySelector(`.${DOM_CLASSES.projectBrief}`);
    if (meta) meta.style.display = "block";
    if (brief) brief.style.display = "block";
  }
}

function collapseProject(projectDiv) {
  projectDiv.classList.add(DOM_CLASSES.collapsing);
  projectDiv.classList.remove(DOM_CLASSES.expanded);

  if (isMobileDevice()) {
    const video = projectDiv.querySelector(`.${DOM_CLASSES.projectVideo}`);
    if (video) {
      video.muted = true;
      video.pause();
      // Don't reset currentTime on iOS — it clears the painted thumbnail
    }
  }

  setTimeout(() => {
    const meta = projectDiv.querySelector(`.${DOM_CLASSES.projectMeta}`);
    const brief = projectDiv.querySelector(`.${DOM_CLASSES.projectBrief}`);
    if (meta) meta.style.display = "none";
    if (brief) brief.style.display = "none";
    projectDiv.classList.remove(DOM_CLASSES.collapsing);
  }, 400);
}

// ── Counter ──────────────────────────────────────────────────────────────────
function updateProjectCounter(shownCount, totalCount) {
  let el = document.getElementById(DOM_IDS.projectCounter);
  if (!el) {
    el = document.createElement("p");
    el.id = DOM_IDS.projectCounter;
    const container = document.getElementById(DOM_IDS.projectsContainer);
    container.parentNode.insertBefore(el, container.nextSibling);
  }
  el.textContent = `Showing: ${shownCount}/${totalCount}`;
}

// ── Tag filter (header) + secondary filters (Tools / Year under #projects-filter)
// Sub-options: <ul class="filter-list"><li><a class="filter-option" href="#">…</a></li></ul> (no ids on links)
// Header tags: `#library-filter` uses `library-filter-link`, not `filter-option`.
// "What Ifs" is `<a id="what-ifs">` — toggles What Ifs mode (see `whatIfsMode`).
function populateFilterList(container, items, selectedList, options) {
  const { kind, dataAttr, linkClass = DOM_CLASSES.filterOption } = options;
  if (!container) return;

  let ul;
  if (container.tagName === "UL") {
    ul = container;
    ul.innerHTML = "";
  } else {
    ul = container.querySelector(`ul.${DOM_CLASSES.filterList}`);
    if (!ul) {
      ul = document.createElement("ul");
      ul.className = DOM_CLASSES.filterList;
      container.appendChild(ul);
    } else {
      ul.innerHTML = "";
    }
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = linkClass;
    a.href = "#";
    if (kind === "tag") {
      a.setAttribute(dataAttr, item);
    } else {
      a.dataset.filterKind = kind;
      a.dataset.filterValue = item;
    }
    const display = item.length > 96 ? `${item.slice(0, 93)}…` : item;
    a.textContent = display;
    if (item.length > 96) a.title = item;
    if (selectedList.includes(item)) a.classList.add(DOM_CLASSES.selected);
    li.appendChild(a);
    ul.appendChild(li);
  });
}

function populateTagFilter(records) {
  const menu = document.getElementById(DOM_IDS.filterMenu);
  if (!menu) return;

  const allTags = new Set();
  records.forEach((record) => {
    parseTags(record["Tags"] || "").forEach((tag) => allTags.add(tag));
  });

  const tagOrder = [
    "Screens", "Materiality", "Light", "Optics",
    "Sound", "Gestures", "Multiplayer", "XR",
  ];
  const existingTags = tagOrder.filter((tag) => allTags.has(tag));

  populateFilterList(menu, existingTags, selectedFilters, {
    kind: "tag",
    dataAttr: "data-value",
    linkClass: DOM_CLASSES.libraryFilterLink,
  });
}

function populateSecondaryFilters(records) {
  const tools = new Set();
  const years = new Set();

  records.forEach((record) => {
    parseToolsList(record["Tools"] || "").forEach((t) => tools.add(t));
    const y = extractYear(record["Date"]) || record.year || "";
    if (y) years.add(y);
  });

  const toolsArr = [...tools].sort((a, b) => a.localeCompare(b));
  const yearsArr = [...years].sort((a, b) => b.localeCompare(a));

  populateFilterList(
    document.getElementById(DOM_IDS.toolOptions),
    toolsArr,
    selectedTools,
    { kind: "tool", dataAttr: "" }
  );
  populateFilterList(
    document.getElementById(DOM_IDS.yearOptions),
    yearsArr,
    selectedYears,
    { kind: "year", dataAttr: "" }
  );
}

function toggleTagFilter(tagValue) {
  const index = selectedFilters.indexOf(tagValue);
  if (index > -1) selectedFilters.splice(index, 1);
  else selectedFilters.push(tagValue);
  updateFilterDisplay();
  displayProjects(allRecords);
}

function toggleSecondaryFilter(kind, value) {
  const arr =
    kind === "tool" ? selectedTools : kind === "year" ? selectedYears : null;
  if (!arr) return;
  const i = arr.indexOf(value);
  if (i > -1) arr.splice(i, 1);
  else arr.push(value);
  updateFilterDisplay();
  displayProjects(allRecords);
}

function updateFilterDisplay() {
  const placeholder = document.getElementById(DOM_IDS.filterPlaceholder);
  const container = document.getElementById(DOM_IDS.selectedTags);
  if (!container || !placeholder) return;
  container.innerHTML = "";

  if (selectedFilters.length === 0) {
    placeholder.hidden = false;
  } else {
    placeholder.hidden = true;
    selectedFilters.forEach((tag, i) => {
      if (i > 0) {
        container.appendChild(document.createTextNode(" / "));
      }
      const span = document.createElement("span");
      span.className = DOM_CLASSES.selectedTagInline;
      span.textContent = tag.toUpperCase();
      span.setAttribute("role", "button");
      span.tabIndex = 0;
      span.addEventListener("click", (e) => {
        e.preventDefault();
        toggleTagFilter(tag);
      });
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleTagFilter(tag);
        }
      });
      container.appendChild(span);
    });
  }
}

function setupFilterListeners() {
  const filterMenu = document.getElementById(DOM_IDS.filterMenu);
  if (filterMenu) {
    filterMenu.addEventListener("click", (e) => {
      const target = e.target.closest("a");
      if (!target || !target.classList.contains(DOM_CLASSES.libraryFilterLink)) return;
      if (!filterMenu.contains(target)) return;
      e.preventDefault();
      const v = target.getAttribute("data-value");
      if (v) toggleTagFilter(v);
    });
  }

  const projectsFilter = document.getElementById("projects-filter");
  if (projectsFilter) {
    projectsFilter.addEventListener("click", (e) => {
      const target = e.target.closest("a");
      if (!target || !target.classList.contains(DOM_CLASSES.filterOption)) return;
      if (!projectsFilter.contains(target)) return;
      e.preventDefault();
      const kind = target.dataset.filterKind;
      const value = target.dataset.filterValue;
      if (kind && value !== undefined) toggleSecondaryFilter(kind, value);
    });
  }
}

function setupWhatIfsLink() {
  const a = document.getElementById("what-ifs");
  if (!a) return;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    whatIfsMode = !whatIfsMode;
    if (whatIfsMode) {
      selectedFilters.length = 0;
      selectedTools.length = 0;
      selectedYears.length = 0;
      updateFilterDisplay();
    }
    syncWhatIfsLinkSelectedState();
    displayProjects(allRecords);
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadLocalData();
  setupFilterListeners();
  setupWhatIfsLink();
  updateFilterDisplay();
  syncWhatIfsLinkSelectedState();
});