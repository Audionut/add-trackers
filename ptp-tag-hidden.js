// ==UserScript==
// @name         PTP content hider
// @version      1.0
// @description  Hide html elements with specified tags
// @author       You
// @match        https://passthepopcorn.me/index.php*
// @match        https://passthepopcorn.me/top10.php*
// @match        https://passthepopcorn.me/torrents.php*
// @match        https://passthepopcorn.me/user.php*
// @downloadURL  https://github.com/Audionut/add-trackers/raw/main/ptp-tag-hidden.js
// @updateURL    https://github.com/Audionut/add-trackers/raw/main/ptp-tag-hidden.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // USER CONFIGURATION - Edit these lines to customize behavior
    // Add or remove tags separated by commas (case-insensitive)
    const TAGS_TO_HIDE = 'family, animation, comedy, romance';
    
    // Set to true to delay page rendering until hiding is complete
    const DELAY_RENDER = true;
    
    // Convert to array and clean up
    const tagsArray = TAGS_TO_HIDE.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    
    console.log('Tags to hide:', tagsArray);
    console.log('Delay render:', DELAY_RENDER);

    let pageProcessed = false;
    let originalDisplay = null;

    // Hide the page immediately if delay render is enabled
    if (DELAY_RENDER) {
        const style = document.createElement('style');
        style.id = 'hide-page-style';
        style.textContent = 'body { display: none !important; }';
        (document.head || document.documentElement).appendChild(style);
    }

    function showPage() {
        if (DELAY_RENDER && !pageProcessed) {
            const hideStyle = document.getElementById('hide-page-style');
            if (hideStyle) {
                hideStyle.remove();
            }
            pageProcessed = true;
            console.log('Page rendering restored');
        }
    }

    function hideMoviesWithTargetTags() {
        let foundData = false;
        
        // Find all script tags
        const scripts = document.querySelectorAll('script');
        
        scripts.forEach(script => {
            const scriptText = script.textContent || script.innerHTML;
            
            // Check for coverViewJsonData
            if (scriptText.includes('coverViewJsonData')) {
                foundData = true;
                
                // Extract all coverViewJsonData assignments
                const regex = /coverViewJsonData\[\s*(\d+)\s*\]\s*=\s*({.*?});/gs;
                let match;
                
                while ((match = regex.exec(scriptText)) !== null) {
                    const arrayIndex = parseInt(match[1]);
                    const jsonString = match[2];
                    
                    try {
                        const data = JSON.parse(jsonString);
                        
                        // Check if Movies array exists
                        if (data.Movies && Array.isArray(data.Movies)) {
                            data.Movies.forEach((movie, movieIndex) => {
                                // Check if movie has any of the target tags
                                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (coverViewJsonData): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - Matched tags: ${matchedTags.join(', ')} - Array Index: ${arrayIndex}, Movie Index: ${movieIndex}`);
                                    
                                    // Hide corresponding HTML elements using both indices
                                    hideSpecificMovieElement(arrayIndex, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to parse coverViewJsonData:', e);
                    }
                }
            }
            
            // Check for PageData
            if (scriptText.includes('var PageData = {')) {
                foundData = true;
                
                try {
                    // Extract PageData object
                    const pageDataMatch = scriptText.match(/var PageData = ({[\s\S]*?});/);
                    if (pageDataMatch) {
                        const pageDataString = pageDataMatch[1];
                        const pageData = JSON.parse(pageDataString);
                        
                        // Check for Movies array
                        if (pageData.Movies && Array.isArray(pageData.Movies)) {
                            pageData.Movies.forEach((movie, movieIndex) => {
                                // Check if movie has any of the target tags
                                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (PageData.Movies): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - Matched tags: ${matchedTags.join(', ')} - Movie Index: ${movieIndex}`);
                                    
                                    // Hide corresponding HTML elements
                                    hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                        
                        // Check for RecentRatings array
                        if (pageData.RecentRatings && Array.isArray(pageData.RecentRatings)) {
                            pageData.RecentRatings.forEach((movie, movieIndex) => {
                                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (PageData.RecentRatings): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - Matched tags: ${matchedTags.join(', ')} - Movie Index: ${movieIndex}`);
                                    hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                        
                        // Check for RecentSnatches array
                        if (pageData.RecentSnatches && Array.isArray(pageData.RecentSnatches)) {
                            pageData.RecentSnatches.forEach((movie, movieIndex) => {
                                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (PageData.RecentSnatches): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - Matched tags: ${matchedTags.join(', ')} - Movie Index: ${movieIndex}`);
                                    hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                        
                        // Check for RecentUploads array
                        if (pageData.RecentUploads && Array.isArray(pageData.RecentUploads)) {
                            pageData.RecentUploads.forEach((movie, movieIndex) => {
                                if (movie.Tags && movie.Tags.some(tag => tagsArray.includes(tag.toLowerCase()))) {
                                    const matchedTags = movie.Tags.filter(tag => tagsArray.includes(tag.toLowerCase()));
                                    console.log(`Found movie with target tags (PageData.RecentUploads): ${movie.Title} (${movie.Year}) - GroupId: ${movie.GroupId} - Matched tags: ${matchedTags.join(', ')} - Movie Index: ${movieIndex}`);
                                    hideSpecificMovieElement(-1, movieIndex, movie.GroupId, movie.Title, matchedTags);
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse PageData:', e);
                }
            }
        });

        // If we found data and processed it, or if no data exists, show the page
        if (foundData || document.readyState === 'complete') {
            setTimeout(showPage, 100); // Small delay to ensure DOM updates are complete
        }
    }

    function hideSpecificMovieElement(arrayIndex, movieIndex, groupId, title, matchedTags) {
        // GroupID-based selectors
        const selectors = [
            // Direct group ID selectors (most reliable)
            `[data-group-id="${groupId}"]`,
            `[data-groupid="${groupId}"]`,
            `[href*="id=${groupId}"]`,              // Catches torrents.php?id=93851
            `[href*="id=${groupId}&"]`,             // Catches torrents.php?id=93851&torrentid=...
            `[href*="groupid=${groupId}"]`,
            `#group_${groupId}`,
            
            // Additional patterns for user recommendations and other layouts
            `[href="torrents.php?id=${groupId}"]`,  // Exact match for simple links
            `a[href^="torrents.php?id=${groupId}"]` // Links starting with this pattern
        ];

        let hiddenCount = 0;

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Check if the element is inside a Film Club panel
                const filmClubPanel = element.closest('#filmclub');
                if (filmClubPanel) {
                    // Hide the entire Film Club panel
                    filmClubPanel.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden Film Club panel with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, filmClubPanel);
                }
                // Check if the element is inside a cover movie list item
                else if (element.closest('.cover-movie-list__movie')) {
                    const coverMovieDiv = element.closest('.cover-movie-list__movie');
                    // Hide the entire cover movie div
                    coverMovieDiv.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden cover movie div with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, coverMovieDiv);
                }
                // Check if the element is inside a tbody (for movie list tables)
                else if (element.closest('tbody')) {
                    const parentTbody = element.closest('tbody');
                    // Hide the entire tbody instead of just individual cells
                    parentTbody.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden tbody with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, parentTbody);
                }
                // Check if the element is inside a table cell
                else if (element.closest('td')) {
                    const parentTd = element.closest('td');
                    // Hide the entire table cell instead of just the link
                    parentTd.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden table cell with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, parentTd);
                }
                // Check if the element is inside a user recommendation div
                else if (element.closest('.user-recommendation')) {
                    const recommendationDiv = element.closest('.user-recommendation');
                    recommendationDiv.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden user recommendation with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, recommendationDiv);
                }
                // Check for other common container patterns
                else if (element.closest('.movie-item, .cover-item, .torrent-group, [class*="movie"], [class*="cover"]')) {
                    const container = element.closest('.movie-item, .cover-item, .torrent-group, [class*="movie"], [class*="cover"]');
                    container.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden container with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, container);
                }
                // For other elements, hide the element itself
                else {
                    element.style.display = 'none';
                    hiddenCount++;
                    console.log(`Hidden element with GroupID ${groupId} for ${title} (tags: ${matchedTags.join(', ')}):`, element);
                }
            });
        });

        // Log if nothing was hidden
        if (hiddenCount === 0) {
            console.warn(`No elements found with GroupID ${groupId} for ${title}`);
        }

        // If no direct selectors worked, try container-based approach
        if (hiddenCount === 0) {
            hideByContainerAndPosition(arrayIndex, movieIndex, title, matchedTags);
        }

        // Fallback: hide by text content but be more specific
        if (hiddenCount === 0) {
            hideBySpecificTextContent(title, groupId, matchedTags);
        }
    }

    function hideByContainerAndPosition(arrayIndex, movieIndex, title, matchedTags) {
        // Look for containers that might correspond to the array index
        const containerSelectors = [
            `.covers-${arrayIndex}`,
            `.movie-list-${arrayIndex}`,
            `.cover-view-${arrayIndex}`,
            `#cover_container_${arrayIndex}`,
            `.covers .cover-section:nth-child(${arrayIndex + 1})`,
        ];

        containerSelectors.forEach(containerSelector => {
            const container = document.querySelector(containerSelector);
            if (container) {
                const movieElements = container.querySelectorAll('.movie-item, .cover-item, .movie, .cover');
                if (movieElements[movieIndex]) {
                    movieElements[movieIndex].style.display = 'none';
                    console.log(`Hidden movie by container position - Array: ${arrayIndex}, Movie: ${movieIndex} for ${title} (tags: ${matchedTags.join(', ')}):`, movieElements[movieIndex]);
                }
            }
        });
    }

    function hideBySpecificTextContent(title, groupId, matchedTags) {
        // Be more specific when searching by text content
        const titleElements = document.querySelectorAll('*');
        titleElements.forEach(element => {
            // Only check elements that might be movie titles (not just any text)
            if (element.textContent && 
                element.textContent.trim() === title && 
                (element.tagName === 'A' || 
                 element.classList.contains('title') || 
                 element.classList.contains('movie-title') ||
                 element.closest('.movie-item, .cover-item, .torrent-group'))) {
                
                const parent = element.closest('.movie-item, .torrent-group, .group-item, .cover-item, [class*="movie"], [class*="group"], [class*="cover"]');
                if (parent) {
                    parent.style.display = 'none';
                    console.log(`Hidden by specific text content for ${title} (tags: ${matchedTags.join(', ')}):`, parent);
                }
            }
        });
    }

    // Run when DOM starts loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideMoviesWithTargetTags);
    } else {
        hideMoviesWithTargetTags();
    }

    // Monitor for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if script tags were added
                        if (node.tagName === 'SCRIPT' && node.textContent.includes('coverViewJsonData')) {
                            shouldCheck = true;
                        }
                        // Check if script tags were added as children
                        if (node.querySelectorAll && node.querySelectorAll('script').length > 0) {
                            shouldCheck = true;
                        }
                    }
                });
            }
        });
        
        if (shouldCheck) {
            setTimeout(hideMoviesWithTargetTags, 50);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Fallback: ensure page is shown after a maximum delay
    setTimeout(() => {
        if (DELAY_RENDER && !pageProcessed) {
            console.log('Timeout reached, showing page anyway');
            showPage();
        }
    }, 3000); // 3 second maximum delay

})();