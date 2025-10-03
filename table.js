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
                       muted 
                       loop 
                       playsinline>
                    <source src="${videoField}" type="video/mp4">
                    <source src="${videoField}" type="video/quicktime">
                    Your browser doesn't support video.
                </video>
            `;
        }
        
        // Fallback to image if no video
        if (!mediaHTML && imageField && imageField.trim() !== "") {
            mediaHTML = `<img class="project-image" src="${imageField}" alt="${projectName}" loading="lazy">`;
        }
        
        // Placeholder if no media
        if (!mediaHTML) {
            mediaHTML = `<div class="no-video">No media available</div>`;
        }
        
        // Get team and year for display
        const team = record.fields["Team"] || [];
        const year = record.fields["Year"] || "";
        const teamText = team.join(", ");
        
        projectDiv.innerHTML = `
            <div class="project-video-container">
                ${mediaHTML}
            </div>
            <h3 class="project-name">${projectName}</h3>
            <div class="project-meta">
                <div class="project-team">Made by ${teamText}</div>
                <div class="project-year">${year}</div>
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
    
    // Get all tags and sort them, then add "All Experiments" at the end
    const sortedTags = Array.from(allTags).sort();
    const allOptions = [...sortedTags, "All Experiments"];
    
    // Filter out currently selected option
    const filteredOptions = allOptions.filter(option => {
        const optionValue = option === "All Experiments" ? "" : option;
        return optionValue !== currentFilter;
    });
    
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
        optionElement.setAttribute("data-value", option === "All Experiments" ? "" : option);
        optionElement.textContent = option;
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
    
    // Update selected text - show "Experiments" for "All Experiments"
    const displayText = selectedText === "All Experiments" ? "Experiments" : selectedText;
    document.getElementById("dropdown-selected").textContent = displayText;
    
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
    if (dropdownMenu.classList.contains('show')) {
        dropdownMenu.classList.remove('show');
    } else {
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