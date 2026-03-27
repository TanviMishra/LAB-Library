// No URL formatting needed for local files

// Temporarily filter projects by year.
// Set to null to show all years again.
const TEMP_ONLY_YEAR = "2026";

// Load local JSON data
function loadLocalData() {
  fetch("data.json")
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
        document.getElementById("projects-container").innerHTML =
          "<p>No projects found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      document.getElementById("projects-container").innerHTML =
        "<p>Error loading data.</p>";
    });
}

// Global variables for filtering
let allRecords = [];
let selectedFilters = [];
let totalProjectCount = 0;

function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
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
  const container = document.getElementById("projects-container");
  container.innerHTML = "";

  const validRecords = records.filter((record) => {
    const projectName = record["Project"] || record["project"];
    const isActive = record["Active"] !== false && record["Active"] !== null;
    return projectName && projectName.trim() !== "" && isActive;
  });

  const filteredRecords =
    selectedFilters.length > 0
      ? validRecords.filter((record) => {
          const tags = parseTags(record["Tags"] || "");
          return selectedFilters.some((filter) => tags.includes(filter));
        })
      : validRecords;

  populateTagFilter(validRecords);
  totalProjectCount = validRecords.length;

  filteredRecords.forEach((record) => {
    const projectDiv = document.createElement("div");
    projectDiv.className = "project-card";

    const projectName = record["Project"];
    const videoField = record["Video"];
    const imageField = record["Image"];
    const dateField = record["Date"];
    const yearText = extractYear(dateField) || record.year || "";
    const teamText = (record["Team"] || "").trim();
    const brief = record["Brief"] || "";

    let mediaHTML = "";

    if (videoField && videoField.trim() !== "") {
      // Desktop: preload="metadata" gives a first-frame thumbnail immediately.
      // Mobile: preload="none" — the thumbnail painter loads them in controlled batches.
      const preloadValue = isMobileDevice() ? "none" : "metadata";
      mediaHTML = `
        <video class="project-video"
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
      mediaHTML = `<img class="project-image" src="${imageField}" alt="${projectName}" loading="lazy" decoding="async">`;
    } else {
      mediaHTML = `<div class="no-video">No media available</div>`;
    }

    projectDiv.innerHTML = `
      <div class="project-video-container">${mediaHTML}</div>
      <h3 class="project-name">${projectName}</h3>
      <div class="project-info" style="display: none;">
        <div class="project-meta">
          ${teamText ? `<p class="project-team">by ${teamText}</p>` : ""}
          ${yearText ? `<p class="project-year">${yearText}</p>` : ""}
        </div>
      </div>
      <div class="project-brief" style="display: none;">
        ${brief ? `<p>${brief}</p>` : ""}
      </div>
    `;

    const video = projectDiv.querySelector(".project-video");
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
      const isExpanded = projectDiv.classList.contains("expanded");

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
  const videos = container.querySelectorAll("video.project-video");
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
  const videos = container.querySelectorAll("video.project-video");
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
            const card = video.closest(".project-card");
            if (!card?.classList.contains("expanded")) video.pause();
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
  const isExpanded = projectDiv.classList.contains("expanded");
  const isMobile = isMobileDevice();

  document.querySelectorAll(".project-card.expanded").forEach((card) => {
    if (card !== projectDiv) {
      if (isMobile) {
        const v = card.querySelector(".project-video");
        if (v) { v.muted = true; v.pause(); }
      }
      collapseProject(card);
    }
  });

  if (isExpanded) {
    collapseProject(projectDiv);
  } else {
    projectDiv.classList.add("expanded");
    const info = projectDiv.querySelector(".project-info");
    const brief = projectDiv.querySelector(".project-brief");
    if (info) info.style.display = "block";
    if (brief) brief.style.display = "block";
  }
}

function collapseProject(projectDiv) {
  projectDiv.classList.add("collapsing");
  projectDiv.classList.remove("expanded");

  if (isMobileDevice()) {
    const video = projectDiv.querySelector(".project-video");
    if (video) {
      video.muted = true;
      video.pause();
      // Don't reset currentTime on iOS — it clears the painted thumbnail
    }
  }

  setTimeout(() => {
    const info = projectDiv.querySelector(".project-info");
    const brief = projectDiv.querySelector(".project-brief");
    if (info) info.style.display = "none";
    if (brief) brief.style.display = "none";
    projectDiv.classList.remove("collapsing");
  }, 400);
}

// ── Counter ──────────────────────────────────────────────────────────────────
function updateProjectCounter(shownCount, totalCount) {
  let el = document.getElementById("project-counter");
  if (!el) {
    el = document.createElement("p");
    el.id = "project-counter";
    const container = document.getElementById("projects-container");
    container.parentNode.insertBefore(el, container.nextSibling);
  }
  el.textContent = `Showing: ${shownCount}/${totalCount}`;
}

// ── Tag filter ───────────────────────────────────────────────────────────────
function populateTagFilter(records) {
  const dropdownMenu = document.getElementById("dropdown-menu");
  const allTags = new Set();
  records.forEach((record) => {
    parseTags(record["Tags"] || "").forEach((tag) => allTags.add(tag));
  });

  dropdownMenu.innerHTML = "";

  const tagOrder = [
    "Screens", "Materiality", "Light", "Optics",
    "Sound", "Gestures", "Multiplayer", "XR",
  ];
  const existingTags = tagOrder.filter((tag) => allTags.has(tag));

  if (existingTags.length > 0) {
    const slash = document.createElement("span");
    slash.textContent = " / ";
    slash.style.cssText = "color:#666;font-size:18px;pointer-events:none";
    dropdownMenu.appendChild(slash);
  }

  existingTags.forEach((option, index) => {
    const el = document.createElement("span");
    el.className = "dropdown-option";
    el.setAttribute("data-value", option);
    el.textContent = option;
    if (selectedFilters.includes(option)) el.classList.add("selected");
    dropdownMenu.appendChild(el);

    if (index < existingTags.length - 1) {
      const slash = document.createElement("span");
      slash.textContent = " / ";
      slash.style.cssText = "color:#666;font-size:18px;pointer-events:none";
      dropdownMenu.appendChild(slash);
    }
  });
}

function toggleTagFilter(tagValue) {
  const index = selectedFilters.indexOf(tagValue);
  if (index > -1) selectedFilters.splice(index, 1);
  else selectedFilters.push(tagValue);
  updateFilterDisplay();
  document.getElementById("dropdown-menu").classList.remove("show");
  displayProjects(allRecords);
}

function removeFilterTag(tagValue) {
  const index = selectedFilters.indexOf(tagValue);
  if (index > -1) {
    selectedFilters.splice(index, 1);
    updateFilterDisplay();
    displayProjects(allRecords);
  }
}

function updateFilterDisplay() {
  const placeholder = document.getElementById("filter-placeholder");
  const container = document.getElementById("selected-tags");
  container.innerHTML = "";

  if (selectedFilters.length === 0) {
    placeholder.style.display = "inline";
  } else {
    placeholder.style.display = "none";
    selectedFilters.forEach((tag) => {
      const el = document.createElement("span");
      el.className = "selected-tag";
      el.innerHTML = `
        <span class="tag-name">${tag}</span>
        <span class="tag-remove" data-tag="${tag}">×</span>
      `;
      el.querySelector(".tag-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        removeFilterTag(tag);
      });
      el.querySelector(".tag-name").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });
      container.appendChild(el);
    });
  }

  document.querySelectorAll(".dropdown-option").forEach((option) => {
    option.classList.toggle(
      "selected",
      selectedFilters.includes(option.getAttribute("data-value"))
    );
  });
}

function toggleDropdown() {
  const menu = document.getElementById("dropdown-menu");
  if (menu.classList.contains("show")) {
    menu.classList.remove("show");
  } else {
    populateTagFilter(allRecords);
    menu.classList.add("show");
  }
}

function setupDropdownListeners() {
  const placeholder = document.getElementById("filter-placeholder");
  const selectedTagsContainer = document.getElementById("selected-tags");
  const dropdownMenu = document.getElementById("dropdown-menu");

  placeholder.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  selectedTagsContainer.addEventListener("click", (e) => {
    if (e.target === selectedTagsContainer) {
      e.stopPropagation();
      toggleDropdown();
    }
  });

  dropdownMenu.addEventListener("click", (e) => {
    if (e.target.classList.contains("dropdown-option")) {
      toggleTagFilter(e.target.getAttribute("data-value"));
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !placeholder.contains(e.target) &&
      !selectedTagsContainer.contains(e.target) &&
      !dropdownMenu.contains(e.target)
    ) {
      dropdownMenu.classList.remove("show");
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadLocalData();
  setupDropdownListeners();
  updateFilterDisplay();
});