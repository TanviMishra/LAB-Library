// No URL formatting needed for local files

// Load local JSON data
function loadLocalData() {
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      // Flatten year-based structure into array of records
      const records = [];
      Object.keys(data).forEach((year) => {
        if (Array.isArray(data[year])) {
          data[year].forEach((project) => {
            // Add year to project object
            project.year = year;
            records.push(project);
          });
        }
      });

      if (records.length > 0) {
        // Sort by date (newest to oldest)
        records.sort((a, b) => {
          const dateA = parseDate(a["Date"]);
          const dateB = parseDate(b["Date"]);

          // If both dates are valid, compare them
          if (dateA && dateB) {
            return dateB - dateA; // Newest first (descending)
          }

          // If only one has a date, prioritize it
          if (dateA && !dateB) return -1;
          if (dateB && !dateA) return 1;

          // If neither has a date, maintain original order
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
let selectedFilters = []; // Array to store multiple selected tags
let totalProjectCount = 0; // Store total count of all projects

// Helper function to parse tags from string to array
function parseTags(tagsString) {
  if (!tagsString) return [];
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
}

// Helper function to parse date string to Date object
function parseDate(dateString) {
  if (!dateString) return null;

  // Try YYYY-MM-DD format first (used in 2025, 2026)
  if (dateString.includes("-")) {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  // Try DD/MM/YYYY format (used in 2024)
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      // DD/MM/YYYY format
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }

  return null;
}

// Helper function to extract year from date
function extractYear(dateString) {
  if (!dateString) return "";
  // Date format is "YYYY-MM-DD", extract year
  const year = dateString.split("-")[0];
  return year;
}

// Helper function to detect if device is a phone or iPad
function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         ('ontouchstart' in window) || 
         (navigator.maxTouchPoints > 0);
}

// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Display projects in grid
function displayProjects(records) {
  allRecords = records; // Store all records globally
  const container = document.getElementById("projects-container");
  container.innerHTML = "";

  // Filter valid and active records
  const validRecords = records.filter((record) => {
    const projectName = record["Project"] || record["project"];
    const isActive = record["Active"] !== false && record["Active"] !== null;
    return projectName && projectName.trim() !== "" && isActive;
  });

  // Apply tag filters if active (projects must have at least one of the selected tags)
  const filteredRecords =
    selectedFilters.length > 0
      ? validRecords.filter((record) => {
          const tagsString = record["Tags"] || "";
          const tags = parseTags(tagsString);
          return selectedFilters.some((filter) => tags.includes(filter));
        })
      : validRecords;

  // Don't shuffle here - use the already shuffled order from initial load
  // Filtering maintains the original shuffled order

  // Populate tag dropdown
  populateTagFilter(validRecords);

  // Store total count for display
  totalProjectCount = validRecords.length;

  filteredRecords.forEach((record, index) => {
    const projectDiv = document.createElement("div");
    projectDiv.className = "project-card";
    projectDiv.dataset.projectIndex = index;

    const projectName = record["Project"];
    const videoField = record["Video"];
    const imageField = record["Image"];
    const dateField = record["Date"];
    const yearText = extractYear(dateField) || record.year || "";

    let mediaHTML = "";

    // Handle video
    if (videoField && videoField.trim() !== "") {
      mediaHTML = `
                <video class="project-video" 
                       preload="none"
                       loop 
                       muted
                       playsinline>
                    <source src="${videoField}" type="video/mp4">
                    <source src="${videoField}" type="video/quicktime">
                    Your browser doesn't support video.
                </video>
            `;
    }
    // If no video, check for image
    else if (imageField && imageField.trim() !== "") {
      mediaHTML = `<img class="project-image" src="${imageField}" alt="${projectName}" loading="lazy" decoding="async">`;
    }

    // Placeholder if no media
    if (!mediaHTML) {
      mediaHTML = `<div class="no-video">No media available</div>`;
    }

    // Get team and materials for display
    const teamString = record["Team"] || "";
    const materialsString = record["Materials"] || "";
    const brief = record["Brief"] || "";
    const teamText = teamString.trim();
    const madeWithText = materialsString.trim();

    projectDiv.innerHTML = `
            <div class="project-video-container">
                ${mediaHTML}
            </div>
            <h3 class="project-name">${projectName}</h3>
            <div class="project-info" style="display: none;">
                <div class="project-meta">
                    ${
                      teamText
                        ? `<p class="project-team">by ${teamText}</p>`
                        : ""
                    }
                    ${yearText ? `<p class="project-year">${yearText}</p>` : ""}
                </div>
            </div>
            <div class="project-brief" style="display: none;">
                ${brief ? `<p>${brief}</p>` : ""}
            </div>
        `;

    // Add hover functionality for videos (not images) - desktop only
    const video = projectDiv.querySelector(".project-video");
    const isMobile = isMobileDevice();
    
    if (video && !isMobile) {
      // Desktop: hover to play and unmute
      // Chrome requires play() to start muted (allowed without gesture),
      // then we unmute after playback begins.
      projectDiv.addEventListener("mouseenter", () => {
        video.muted = true;
        video.play().then(() => {
          video.muted = false;
        }).catch((err) => console.log("Play failed:", err));
      });

      projectDiv.addEventListener("mouseleave", () => {
        video.muted = true;
        video.pause();
        video.currentTime = 0;
      });
    }

    // Click handler - different behavior for mobile vs desktop
    projectDiv.addEventListener("click", () => {
      const isExpanded = projectDiv.classList.contains("expanded");
      
      if (isMobile && video) {
        // Mobile: load, unmute and play video when expanding, mute and pause when collapsing
        if (!isExpanded) {
          // Will expand - iOS requires explicit load() call on user interaction
          console.log("iOS: Loading video, readyState:", video.readyState);
          video.load();
          
          // Wait for video metadata to load, then unmute and play
          const playVideo = () => {
            console.log("iOS: Attempting to play, readyState:", video.readyState);
            video.muted = false;
            video.play().catch((err) => {
              console.log("iOS Play failed:", err);
              console.log("Video diagnostics - readyState:", video.readyState, "networkState:", video.networkState, "error:", video.error);
            });
          };
          
          if (video.readyState >= 1) {
            // Video has metadata, can play
            playVideo();
          } else {
            // Wait for metadata to load
            video.addEventListener('loadedmetadata', playVideo, { once: true });
          }
        } else {
          // Will collapse - mute and pause video
          video.muted = true;
          video.pause();
        }
      }
      
      // Both mobile and desktop: toggle expand/collapse
      toggleProjectExpansion(projectDiv, record);
    });

    container.appendChild(projectDiv);
  });

  // Update counter at bottom
  updateProjectCounter(filteredRecords.length, totalProjectCount);

  // Force iOS Safari to render video thumbnails
  // iOS won't decode/paint a video frame until play() is called.
  // For muted+playsinline videos, autoplay is allowed by policy,
  // but iOS often still won't paint until the element is in-viewport.
  // We use IntersectionObserver to play->pause each video once visible,
  // which forces the first frame to render as a persistent thumbnail.
  forceIOSVideoThumbnails(container);
}

// Force iOS to paint video first frames as thumbnails
function forceIOSVideoThumbnails(container) {
  const videos = container.querySelectorAll('video.project-video');
  if (!videos.length) return;

  // Queue of videos that need thumbnails painted, processed sequentially
  // to avoid saturating mobile bandwidth with parallel downloads.
  const pendingVideos = [];
  let isProcessing = false;

  function processNext() {
    if (pendingVideos.length === 0) {
      isProcessing = false;
      return;
    }
    isProcessing = true;
    const video = pendingVideos.shift();

    video.muted = true;

    const paintFrame = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Wait for iOS compositor to fully render the frame
          setTimeout(() => {
            const card = video.closest('.project-card');
            if (!card || !card.classList.contains('expanded')) {
              video.pause();
            }
            // Process the next video in the queue
            processNext();
          }, 200);
        }).catch((err) => {
          console.log('iOS thumbnail paint failed:', err);
          // Continue to next video even on failure
          processNext();
        });
      } else {
        processNext();
      }
    };

    if (video.readyState >= 2) {
      paintFrame();
    } else {
      video.addEventListener('loadeddata', paintFrame, { once: true });
      // Add a timeout so one stalled video doesn't block the whole queue
      setTimeout(() => {
        if (video.readyState < 2) {
          video.removeEventListener('loadeddata', paintFrame);
          processNext();
        }
      }, 8000);
      if (video.readyState === 0) {
        video.load();
      }
    }
  }

  // Use IntersectionObserver to feed the queue as videos enter viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        pendingVideos.push(entry.target);
        if (!isProcessing) {
          processNext();
        }
      }
    });
  }, { 
    rootMargin: '300px',
    threshold: 0 
  });

  videos.forEach((video) => observer.observe(video));
}

// Toggle project expansion within the grid
function toggleProjectExpansion(projectDiv, record) {
  const isExpanded = projectDiv.classList.contains("expanded");
  const isMobile = isMobileDevice();

  // Collapse all other expanded projects
  document.querySelectorAll(".project-card.expanded").forEach((card) => {
    if (card !== projectDiv) {
      // Stop video in other cards on mobile when clicking a new card
      if (isMobile) {
        const otherVideo = card.querySelector(".project-video");
        if (otherVideo) {
          otherVideo.muted = true;
          otherVideo.pause();
        }
      }
      collapseProject(card);
    }
  });

  if (isExpanded) {
    // Collapse this project with animation
    collapseProject(projectDiv);
  } else {
    // Expand this project
    projectDiv.classList.add("expanded");
    const projectInfo = projectDiv.querySelector(".project-info");
    const projectBrief = projectDiv.querySelector(".project-brief");
    if (projectInfo) projectInfo.style.display = "block";
    if (projectBrief) projectBrief.style.display = "block";
  }
}

// Collapse project with animation
function collapseProject(projectDiv) {
  projectDiv.classList.add("collapsing");
  projectDiv.classList.remove("expanded");

  // Stop video on mobile when collapsing
  if (isMobileDevice()) {
    const video = projectDiv.querySelector(".project-video");
    if (video) {
      video.muted = true;
      video.pause();
      // Do NOT reset currentTime — on iOS this clears the painted
      // thumbnail frame. The video will restart from the beginning
      // when played again via load() in the click handler anyway.
    }
  }

  // Wait for animation to complete before hiding content
  setTimeout(() => {
    const projectInfo = projectDiv.querySelector(".project-info");
    const projectBrief = projectDiv.querySelector(".project-brief");
    if (projectInfo) projectInfo.style.display = "none";
    if (projectBrief) projectBrief.style.display = "none";
    projectDiv.classList.remove("collapsing");
  }, 400); // Match animation duration
}

// Update project counter at bottom
function updateProjectCounter(shownCount, totalCount) {
  let counterElement = document.getElementById("project-counter");

  if (!counterElement) {
    // Create counter element if it doesn't exist
    counterElement = document.createElement("p");
    counterElement.id = "project-counter";
    counterElement.className = "project-counter";
    const container = document.getElementById("projects-container");
    container.parentNode.insertBefore(counterElement, container.nextSibling);
  }

  counterElement.textContent = `Showing: ${shownCount}/${totalCount}`;
}

// Populate tag filter dropdown
function populateTagFilter(records) {
  const dropdownMenu = document.getElementById("dropdown-menu");

  // Get all unique tags from active records
  const allTags = new Set();
  records.forEach((record) => {
    const tagsString = record["Tags"] || "";
    const tags = parseTags(tagsString);
    tags.forEach((tag) => allTags.add(tag));
  });

  // Clear existing options
  dropdownMenu.innerHTML = "";

  // Define the specific order for tags
  const tagOrder = [
    "Screens",
    "Materiality",
    "Light",
    "Optics",
    "Sound",
    "Gestures",
    "Multiplayer",
    "XR",
  ];

  // Add tags that exist in the data, in the specified order
  const existingTags = tagOrder.filter((tag) => allTags.has(tag));

  // Add slash before first option if there are any options
  if (existingTags.length > 0) {
    const firstSlash = document.createElement("span");
    firstSlash.textContent = " / ";
    firstSlash.style.color = "#666";
    firstSlash.style.fontSize = "18px";
    firstSlash.style.pointerEvents = "none";
    dropdownMenu.appendChild(firstSlash);
  }

  // Create a single horizontal line with filtered options
  existingTags.forEach((option, index) => {
    const optionElement = document.createElement("span");
    optionElement.className = "dropdown-option";
    optionElement.setAttribute("data-value", option);
    optionElement.textContent = option;

    // Highlight if already selected
    if (selectedFilters.includes(option)) {
      optionElement.classList.add("selected");
    }

    dropdownMenu.appendChild(optionElement);

    // Add slash between options (except for the last one)
    if (index < existingTags.length - 1) {
      const slash = document.createElement("span");
      slash.textContent = " / ";
      slash.style.color = "#666";
      slash.style.fontSize = "18px";
      slash.style.pointerEvents = "none";
      dropdownMenu.appendChild(slash);
    }
  });
}

// Handle tag filter toggle (add or remove from selection)
function toggleTagFilter(tagValue) {
  const index = selectedFilters.indexOf(tagValue);
  if (index > -1) {
    // Remove if already selected
    selectedFilters.splice(index, 1);
  } else {
    // Add if not selected
    selectedFilters.push(tagValue);
  }

  // Update UI
  updateFilterDisplay();

  // Close dropdown
  document.getElementById("dropdown-menu").classList.remove("show");

  // Re-display with new filters
  displayProjects(allRecords);
}

// Remove a specific filter tag
function removeFilterTag(tagValue) {
  const index = selectedFilters.indexOf(tagValue);
  if (index > -1) {
    selectedFilters.splice(index, 1);
    updateFilterDisplay();
    displayProjects(allRecords);
  }
}

// Update the filter display UI
function updateFilterDisplay() {
  const placeholder = document.getElementById("filter-placeholder");
  const selectedTagsContainer = document.getElementById("selected-tags");

  // Clear selected tags container
  selectedTagsContainer.innerHTML = "";

  if (selectedFilters.length === 0) {
    // Show placeholder
    placeholder.style.display = "inline";
  } else {
    // Hide placeholder and show selected tags
    placeholder.style.display = "none";

    selectedFilters.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.className = "selected-tag";
      tagElement.innerHTML = `
        <span class="tag-name">${tag}</span>
        <span class="tag-remove" data-tag="${tag}">×</span>
      `;

      // Add click handler for remove button
      const removeBtn = tagElement.querySelector(".tag-remove");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFilterTag(tag);
      });

      // Add click handler for tag name to open dropdown
      const tagName = tagElement.querySelector(".tag-name");
      tagName.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });

      selectedTagsContainer.appendChild(tagElement);
    });
  }

  // Update dropdown option states
  document.querySelectorAll(".dropdown-option").forEach((option) => {
    const optionValue = option.getAttribute("data-value");
    if (selectedFilters.includes(optionValue)) {
      option.classList.add("selected");
    } else {
      option.classList.remove("selected");
    }
  });
}

// Toggle dropdown menu
function toggleDropdown() {
  const dropdownMenu = document.getElementById("dropdown-menu");
  const placeholder = document.getElementById("filter-placeholder");

  if (dropdownMenu.classList.contains("show")) {
    dropdownMenu.classList.remove("show");
  } else {
    // Repopulate dropdown
    populateTagFilter(allRecords);
    dropdownMenu.classList.add("show");
  }
}

// Add event listeners for custom dropdown
function setupDropdownListeners() {
  const placeholder = document.getElementById("filter-placeholder");
  const selectedTagsContainer = document.getElementById("selected-tags");
  const dropdownMenu = document.getElementById("dropdown-menu");

  // Toggle dropdown when clicking on placeholder
  placeholder.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleDropdown();
  });

  // Toggle dropdown when clicking on selected tags container (if empty area)
  selectedTagsContainer.addEventListener("click", function (e) {
    if (e.target === selectedTagsContainer) {
      e.stopPropagation();
      toggleDropdown();
    }
  });

  // Handle option selection - toggle tag selection
  dropdownMenu.addEventListener("click", function (e) {
    if (e.target.classList.contains("dropdown-option")) {
      const value = e.target.getAttribute("data-value");
      toggleTagFilter(value);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !placeholder.contains(e.target) &&
      !selectedTagsContainer.contains(e.target) &&
      !dropdownMenu.contains(e.target)
    ) {
      dropdownMenu.classList.remove("show");
    }
  });
}

// Load data when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadLocalData();
  setupDropdownListeners();
  updateFilterDisplay(); // Initialize filter display
});