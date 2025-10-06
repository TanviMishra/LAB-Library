// No URL formatting needed for local files

// Load local JSON data
function loadLocalData() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            if (data.records && data.records.length > 0) {
                displayProjects(data.records);
            } else {
                document.getElementById("projects-container").innerHTML = "<p>No projects found.</p>";
            }
        })
        .catch(error => {
            console.error("Error loading data:", error);
            document.getElementById("projects-container").innerHTML = "<p>Error loading data.</p>";
        });
}

// Global variables for filtering
let allRecords = [];
let currentFilter = "";

// Display projects in grid
function displayProjects(records) {
    allRecords = records; // Store all records globally
    const container = document.getElementById("projects-container");
    container.innerHTML = "";
    
    // Filter valid and active records
    const validRecords = records.filter(record => {
        const projectName = record.fields["Project"] || record.fields["project"];
        const isActive = record.active !== false; // Default to true if not specified
        return projectName && projectName.trim() !== "" && isActive;
    });
    
    // Apply tag filter if active
    const filteredRecords = currentFilter ? 
        validRecords.filter(record => {
            const tags = record.fields["Tags"] || [];
            return tags.includes(currentFilter);
        }) : validRecords;
    
    // Populate tag dropdown
    populateTagFilter(validRecords);
    
    filteredRecords.forEach(record => {
        const projectDiv = document.createElement("div");
        projectDiv.className = "project-card";
        
        const projectName = record.fields["Project"];
        const videoField = record.fields["Video"];
        const imageField = record.fields["Image"];
        
        let mediaHTML = "";
        
        // Handle video
        if (videoField && videoField.trim() !== "") {
            mediaHTML = `
                <video class="project-video" 
                       preload="metadata" 
                       loop 
                       playsinline>
                    <source src="${videoField}" type="video/mp4">
                    <source src="${videoField}" type="video/quicktime">
                    Your browser doesn't support video.
                </video>
            `;
        } else if (projectName) {
            
            if (!videoFound) {
                mediaHTML = `<div class="no-video">No video available</div>`;
            }
        }
        
        // Fallback to image if no video
        if (!mediaHTML && imageField && imageField.trim() !== "") {
            mediaHTML = `<img class="project-image" src="${imageField}" alt="${projectName}" loading="lazy">`;
        }
        
        // Placeholder if no media
        if (!mediaHTML) {
            mediaHTML = `<div class="no-video">No media available</div>`;
        }
        
        // Get team and made with for display
        const team = record.fields["Team"] || [];
        const madeWith = record.fields["Made with"] || [];
        const teamText = team.join(", ");
        const madeWithText = madeWith.join(", ");
        
        projectDiv.innerHTML = `
            <div class="project-video-container">
                ${mediaHTML}
            </div>
            <h3 class="project-name">${projectName}</h3>
            <div class="project-meta">
                <div class="project-made-with">${madeWithText}</div>
                <div class="project-team">Made by ${teamText}</div>
            </div>
        `;
        
        // Add hover functionality for videos
        const video = projectDiv.querySelector('.project-video');
        if (video) {
            projectDiv.addEventListener('mouseenter', () => {
                video.play().catch(err => console.log('Play failed:', err));
            });
            
            projectDiv.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
        
        container.appendChild(projectDiv);
    });
}

// Populate tag filter dropdown
function populateTagFilter(records) {
    const dropdownMenu = document.getElementById("dropdown-menu");
    
    // Get all unique tags from active records
    const allTags = new Set();
    records.forEach(record => {
        const tags = record.fields["Tags"] || [];
        tags.forEach(tag => allTags.add(tag));
    });
    
    // Clear existing options
    dropdownMenu.innerHTML = '';
    
    // Define the specific order for tags
    const tagOrder = ["Experiments", "Gestures", "Materials", "Optics", "Screens", "Sounds"];
    
    // Always include "Experiments" as the first option (shows all projects)
    const allOptions = ["Experiments"];
    
    // Add other tags that exist in the data, in the specified order
    const existingTags = tagOrder.slice(1).filter(tag => allTags.has(tag));
    allOptions.push(...existingTags);
    
    // Don't filter out the currently selected option - show all options in dropdown
    const filteredOptions = allOptions;
    
    // Add slash before first option if there are any options
    if (filteredOptions.length > 0) {
        const firstSlash = document.createElement("span");
        firstSlash.textContent = " / ";
        firstSlash.style.color = "#666";
        firstSlash.style.fontSize = "18px";
        firstSlash.style.pointerEvents = "none";
        dropdownMenu.appendChild(firstSlash);
    }
    
    // Create a single horizontal line with filtered options
    filteredOptions.forEach((option, index) => {
        const optionElement = document.createElement("span");
        optionElement.className = "dropdown-option";
        optionElement.setAttribute("data-value", option === "Experiments" ? "" : option);
        optionElement.textContent = option;
        
        // Highlight the currently selected option
        const optionValue = option === "Experiments" ? "" : option;
        if (optionValue === currentFilter) {
            optionElement.classList.add('selected');
        }
        
        dropdownMenu.appendChild(optionElement);
        
        // Add slash between options (except for the last one)
        if (index < filteredOptions.length - 1) {
            const slash = document.createElement("span");
            slash.textContent = " / ";
            slash.style.color = "#666";
            slash.style.fontSize = "18px";
            slash.style.pointerEvents = "none";
            dropdownMenu.appendChild(slash);
        }
    });
}

// Handle tag filter change
function handleTagFilter(selectedValue, selectedText) {
    currentFilter = selectedValue;
    
    // Update selected text
    const displayText = selectedValue === "" ? "Experiments" : selectedText;
    const dropdownSelected = document.getElementById("dropdown-selected");
    dropdownSelected.textContent = displayText;
    
    // Show the selected text again
    dropdownSelected.style.display = 'inline';
    
    // Update selected option styling
    document.querySelectorAll('.dropdown-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-value="${selectedValue}"]`).classList.add('selected');
    
    // Close dropdown
    document.getElementById("dropdown-menu").classList.remove('show');
    
    // Re-display with new filter
    displayProjects(allRecords);
}

// Toggle dropdown menu
function toggleDropdown() {
    const dropdownMenu = document.getElementById("dropdown-menu");
    const dropdownSelected = document.getElementById("dropdown-selected");
    
    if (dropdownMenu.classList.contains('show')) {
        dropdownMenu.classList.remove('show');
        // Show the selected text again when closing
        dropdownSelected.style.display = 'inline';
    } else {
        // Hide the selected text when opening dropdown
        dropdownSelected.style.display = 'none';
        // Repopulate dropdown to exclude currently selected option
        populateTagFilter(allRecords);
        dropdownMenu.classList.add('show');
    }
}


// Add event listeners for custom dropdown
function setupDropdownListeners() {
    const dropdownSelected = document.getElementById("dropdown-selected");
    const dropdownMenu = document.getElementById("dropdown-menu");
    
    // Toggle dropdown when clicking on the selected area
    dropdownSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDropdown();
    });
    
    // Handle option selection - close dropdown when clicking inside
    dropdownMenu.addEventListener('click', function(e) {
        if (e.target.classList.contains('dropdown-option')) {
            const value = e.target.getAttribute('data-value');
            const text = e.target.textContent;
            handleTagFilter(value, text);
            // Close dropdown immediately after selection
            dropdownMenu.classList.remove('show');
        }
    });
}

// Load data when page loads
document.addEventListener("DOMContentLoaded", function() {
    loadLocalData();
    setupDropdownListeners();
});