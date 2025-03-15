// ==UserScript==
// @name         PTP - TMDB Trailer Selector
// @version      1.2
// @description  Add a dropdown to switch between various TMDB videos
// @match        https://passthepopcorn.me/torrents.php?id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @author       Audionut
// ==/UserScript==

(function() {
    'use strict';

    // Define your TMDB API Key
    const TMDB_API_KEY = 'f7e92920cf3d116e293256bfea1bda61';

    // Base64-encoded TMDB icon
    const tmdbIconBase64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNDg5LjA0IDM1LjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDp1cmwoI2xpbmVhci1ncmFkaWVudCk7fTwvc3R5bGU+PGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXItZ3JhZGllbnQiIHkxPSIxNy43IiB4Mj0iNDg5LjA0IiB5Mj0iMTcuNyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzkwY2VhMSIvPjxzdG9wIG9mZnNldD0iMC41NiIgc3RvcC1jb2xvcj0iIzNjYmVjOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzAwYjNlNSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5Bc3NldCA1PC90aXRsZT48ZyBpZD0iTGF5ZXJfMiIgZGF0YS1uYW1lPSJMYXllciAyIj48ZyBpZD0iTGF5ZXJfMS0yIiBkYXRhLW5hbWU9IkxheWVyIDEiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI5My41LDBoOC45bDguNzUsMjMuMmguMUwzMjAuMTUsMGg4LjM1TDMxMy45LDM1LjRoLTYuMjVabTQ2LjYsMGg3LjhWMzUuNGgtNy44Wm0yMi4yLDBoMjQuMDVWNy4ySDM3MC4xdjYuNmgxNS4zNVYyMUgzNzAuMXY3LjJoMTcuMTV2Ny4ySDM2Mi4zWm01NSwwSDQyOWEzMy41NCwzMy41NCwwLDAsMSw4LjA3LDFBMTguNTUsMTguNTUsMCwwLDEsNDQzLjc1LDRhMTUuMSwxNS4xLDAsMCwxLDQuNTIsNS41M0ExOC41LDE4LjUsMCwwLDEsNDUwLDE3LjhhMTYuOTEsMTYuOTEsMCwwLDEtMS42Myw3LjU4LDE2LjM3LDE2LjM3LDAsMCwxLTQuMzcsNS41LDE5LjUyLDE5LjUyLDAsMCwxLTYuMzUsMy4zN0EyNC41OSwyNC41OSwwLDAsMSw0MzAsMzUuNEg0MTcuMjlabTcuODEsMjguMmg0YTIxLjU3LDIxLjU3LDAsMCwwLDUtLjU1LDEwLjg3LDEwLjg3LDAsMCwwLDQtMS44Myw4LjY5LDguNjksMCwwLDAsMi42Ny0zLjM0LDExLjkyLDExLjkyLDAsMCwwLDEtNS4wOCw5Ljg3LDkuODcsMCwwLDAtMS00LjUyLDksOSwwLDAsMC0yLjYyLTMuMTgsMTEuNjgsMTEuNjgsMCwwLDAtMy44OC0xLjg4LDE3LjQzLDE3LjQzLDAsMCwwLTQuNjctLjYyaC00LjZaTTQ2MS4yNCwwaDEzLjJhMzQuNDIsMzQuNDIsMCwwLDEsNC42My4zMiwxMi45LDEyLjksMCwwLDEsNC4xNywxLjMsNy44OCw3Ljg4LDAsMCwxLDMsMi43M0E4LjM0LDguMzQsMCwwLDEsNDg3LjM5LDlhNy40Miw3LjQyLDAsMCwxLTEuNjcsNSw5LjI4LDkuMjgsMCwwLDEtNC40MywyLjgydi4xYTEwLDEwLDAsMCwxLDMuMTgsMSw4LjM4LDguMzgsMCwwLDEsMi40NSwxLjg1LDcuNzksNy43OSwwLDAsMSwxLjU3LDIuNjIsOS4xNiw5LjE2LDAsMCwxLC41NSwzLjIsOC41Miw4LjUyLDAsMCwxLTEuMiw0LjY4LDkuNDIsOS40MiwwLDAsMS0zLjEsMywxMy4zOCwxMy4zOCwwLDAsMS00LjI3LDEuNjUsMjMuMTEsMjMuMTEsMCwwLDEtNC43My41aC0xNC41Wk00NjksMTQuMTVoNS42NWE4LjE2LDguMTYsMCwwLDAsMS43OC0uMkE0Ljc4LDQuNzgsMCwwLDAsNDc4LDEzLjNhMy4zNCwzLjM0LDAsMCwwLDEuMTMtMS4yLDMuNjMsMy42MywwLDAsMCwuNDItMS44LDMuMjIsMy4yMiwwLDAsMC0uNDctMS44MiwzLjMzLDMuMzMsMCwwLDAtMS4yMy0xLjEzLDUuNzcsNS43NywwLDAsMC0xLjctLjU4LDEwLjc5LDEwLjc5LDAsMCwwLTEuODUtLjE3SDQ2OVptMCwxNC42NWg3YTguOTEsOC45MSwwLDAsMCwxLjgzLS4yLDQuNzgsNC43OCwwLDAsMCwxLjY3LS43LDQsNCwwLDAsMCwxLjIzLTEuMywzLjcxLDMuNzEsMCwwLDAsLjQ3LTIsMy4xMywzLjEzLDAsMCwwLS42Mi0yQTQsNCwwLDAsMCw0NzksMjEuNDUsNy44Myw3LjgzLDAsMCwwLDQ3NywyMC45YTE1LjEyLDE1LjEyLDAsMCwwLTIuMDUtLjE1SDQ2OVptLTI2NSw2LjUzSDI3MWExNy42NiwxNy42NiwwLDAsMCwxNy42Ni0xNy42NmgwQTE3LjY3LDE3LjY3LDAsMCwwLDI3MSwwSDIwNC4wNkExNy42NywxNy42NywwLDAsMCwxODYuNCwxNy42N2gwQTE3LjY2LDE3LjY2LDAsMCwwLDIwNC4wNiwzNS4zM1pNMTAuMSw2LjlIMFYwSDI4VjYuOUgxNy45VjM1LjRIMTAuMVpNMzksMGg3LjhWMTMuMkg2MS45VjBoNy44VjM1LjRINjEuOVYyMC4xSDQ2Ljc1VjM1LjRIMzlaTTgwLjIsMGgyNFY3LjJIODh2Ni42aDE1LjM1VjIxSDg4djcuMmgxNy4xNXY3LjJoLTI1Wm01NSwwSDE0N2w4LjE1LDIzLjFoLjFMMTYzLjQ1LDBIMTc1LjJWMzUuNGgtNy44VjguMjVoLS4xTDE1OCwzNS40aC01Ljk1bC05LTI3LjE1SDE0M1YzNS40aC03LjhaIi8+PC9nPjwvZz48L3N2Zz4=';

    // Extract IMDb ID from the page
    const imdbLinkElement = document.getElementById("imdb-title-link");
    if (!imdbLinkElement) {
        console.warn("No IMDb ID found, aborting.");
        return;
    }
    const imdbId = imdbLinkElement.href.match(/title\/(tt\d+)\//)[1];
    if (!imdbId) {
        console.warn("Invalid IMDb ID, aborting.");
        return;
    }

    let movieId = ''; // Declare movieId in a higher scope to use later
    let isTVShow = 0;

    // Function to fetch all TMDB video types using IMDb ID
    function searchTMDBVideos(imdbId, callback) {
        const searchUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        console.warn(`TMDB URL: ${searchUrl}`);

        fetch(searchUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch from TMDB');
                return response.json();
            })
            .then(data => {
                if (data && data.movie_results && data.movie_results.length > 0) {
                    movieId = data.movie_results[0].id;  // Save movieId for later (movie)
                    console.warn(`TMDB Movie ID: ${movieId}`);
                    const videoUrl = `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`;
                    return fetch(videoUrl);
                } else if (data && data.tv_results && data.tv_results.length > 0) {
                    movieId = data.tv_results[0].id;  // Save tvId for later (TV show)
                    console.warn(`TMDB TV Show ID: ${movieId}`);
                    const videoUrl = `https://api.themoviedb.org/3/tv/${movieId}/videos?api_key=${TMDB_API_KEY}`;
                    isTVShow = 1;
                    return fetch(videoUrl);
                } else {
                    console.warn('No TMDB movie or TV show found for the IMDb ID:', imdbId);
                    return Promise.resolve({ results: [] });
                }
            })
            .then(response => response.json())
            .then(data => {
                const tmdbVideos = (data.results || [])
                    .map(video => ({
                        title: `${video.type}: ${video.name}`,
                        videoId: video.key,
                        type: video.type.toLowerCase(), // Used for sorting
                        site: video.site
                    }));
                callback(tmdbVideos);
            })
            .catch(error => console.error('Error fetching TMDB videos:', error));
    }

    // Function to set the highest resolution available
    function getHighestResolutionVideoUrl(videoId) {
        const resolutions = ['hd2160', 'hd1440', 'hd1080', 'hd720'];
        const baseUrl = `https://www.youtube.com/embed/${videoId}`;
        return `${baseUrl}?vq=${resolutions[0]}`;
    }

    // Function to sort videos in the desired order
    function sortVideos(videos) {
        const sortOrder = {
            trailer: 1,
            teaser: 2,
            featurette: 3,
            'behind the scenes': 4,
            clip: 5
        };

        return videos.sort((a, b) => {
            const aOrder = sortOrder[a.type] || 100; // Use 100 for unsorted types
            const bOrder = sortOrder[b.type] || 100;
            if (aOrder === bOrder) {
                return a.title.localeCompare(b.title);
            }

            return aOrder - bOrder;
        });
    }

    function showinfo(info, node) {
        const showinfo_class = "tmdb_copyinfobox";

        // Ensure parent has relative positioning to anchor the pop-up correctly
        const parentNode = node.parentElement;
        if (window.getComputedStyle(parentNode).position === 'static') {
            parentNode.style.position = 'relative';
        }

        // Check if the pop-up already exists, if not create it
        let el = parentNode.getElementsByClassName(showinfo_class)[0];
        if (!el) {
            el = document.createElement("div");
            el.classList.add(showinfo_class);
            el.style = `
                position: absolute;
                right: 10px;
                top: -40px;
                background-color: white;
                border: 1px solid red;
                border-radius: 5px;
                padding: 5px;
                color: black;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;`;
            parentNode.insertAdjacentElement("beforeend", el);
        }

        // Set the content and make it visible
        el.textContent = info;
        el.style.opacity = 1; // Fade in
        el.style.visibility = "visible";

        // Start the fade-out after 2 seconds
        setTimeout(() => {
            el.style.opacity = 0; // Fade out
            setTimeout(() => {
                el.style.visibility = "hidden"; // Hide after fading out
            }, 500); // Match the transition duration
        }, 2000); // Keep visible for 2 seconds
    }

    // Function to copy text to clipboard and show the pop-up confirmation
    async function copyToClipboard(text, node) {
        try {
            await navigator.clipboard.writeText(text);
            showinfo("YouTube link copied!", node);  // Use the pop-up instead of alert
        } catch (err) {
            showinfo("Failed to copy link.\nCheck console for errors.", node);
            console.error('Failed to copy text: ', err);
        }
    }

    // Modify the populateDropdowns function to add TMDB link correctly and a copy button
    function populateDropdowns(videos, videoDropdown, originalIframe, videoDiv, originalLoaded, isTVShow) {
        // Clear existing options except the original
        videoDropdown.innerHTML = '';

        // Add default option for the original video
        const originalOption = document.createElement('option');
        originalOption.value = 'original';
        originalOption.textContent = 'Original Video';
        videoDropdown.appendChild(originalOption);

        // Sort videos before populating the dropdown
        const sortedVideos = sortVideos(videos);

        // Populate video dropdown with TMDB videos
        sortedVideos.forEach(video => {
            const option = document.createElement('option');
            option.value = video.videoId;
            option.textContent = video.title;
            videoDropdown.appendChild(option);
        });

        // Create a "Copy YouTube Link" button
        const copyLinkSpan = document.createElement('span');
        copyLinkSpan.style = 'float:right;font-size:0.9em';
        const copyLinkButton = document.createElement('a');
        copyLinkButton.textContent = '(Copy YouTube Link)';
        //copyLinkButton.style.marginLeft = '10px';
        copyLinkButton.style.cursor = 'pointer';
        copyLinkButton.disabled = true;  // Initially disabled

        // Add event listener to copy the YouTube link when the button is clicked
        copyLinkButton.addEventListener('click', () => {
            const selectedVideoId = videoDropdown.value;
            const selectedSite = sortedVideos.find(video => video.videoId === selectedVideoId)?.site;
            const youtubeWatchUrl = `https://www.youtube.com/watch?v=${selectedVideoId}`;
            copyToClipboard(youtubeWatchUrl, copyLinkButton);
        });

        // Automatically load the original video if it's still selected
        if (originalLoaded) {
            videoDiv.innerHTML = originalIframe;
        }

        // Load the selected video when changed
        videoDropdown.addEventListener('change', function() {
            const selectedVideoId = videoDropdown.value;
            const selectedSite = sortedVideos.find(video => video.videoId === selectedVideoId)?.site;

            if (selectedVideoId === 'original') {
                videoDiv.innerHTML = originalIframe;
                copyLinkButton.disabled = true;  // Disable copy button for original video
            } else if (selectedSite === 'YouTube') {
                videoDiv.innerHTML = `<iframe width="100%" height="400px" src="${getHighestResolutionVideoUrl(selectedVideoId)}" frameborder="0" allowfullscreen></iframe>`;
                copyLinkButton.disabled = false;  // Enable copy button for YouTube videos
            } else {
                videoDiv.innerHTML = `Video hosted on ${selectedSite}, cannot auto-play here.`;
                copyLinkButton.disabled = true;  // Disable copy button for non-YouTube videos
            }
        });

        // Ensure the first TMDB video is loaded only if the original isn't already playing
        if (!originalLoaded && sortedVideos.length > 0 && sortedVideos[0].site === 'YouTube') {
            const firstVideo = sortedVideos[0];
            videoDiv.innerHTML = `<iframe width="100%" height="400px" src="${getHighestResolutionVideoUrl(firstVideo.videoId)}" frameborder="0" allowfullscreen></iframe>`;
            copyLinkButton.disabled = false;  // Enable copy button for YouTube videos
        }

        // Add TMDB link with the correct type
        const tmdbLink = addTMDBLink(isTVShow);
        videoDropdown.parentElement.appendChild(tmdbLink);
        copyLinkSpan.appendChild(copyLinkButton);
        videoDropdown.parentElement.appendChild(copyLinkSpan);
    }

    // Function to add TMDB link for both movies and TV shows
    function addTMDBLink(isTVShow) {
        const tmdbLink = document.createElement('a');
        if (isTVShow === 1) {
            tmdbLink.href = `https://www.themoviedb.org/tv/${movieId}`;  // TV show link
        } else {
            tmdbLink.href = `https://www.themoviedb.org/movie/${movieId}`;  // Movie link
        }
        tmdbLink.target = '_blank';
        tmdbLink.style.marginLeft = '10px';

        const tmdbIcon = document.createElement('img');
        tmdbIcon.title = 'TMDB Link';
        tmdbIcon.style.height = '18px';
        tmdbIcon.style.verticalAlign = 'middle';
        tmdbIcon.src = `data:image/svg+xml;base64,${tmdbIconBase64}`;
        tmdbIcon.alt = 'TMDB Link';
        tmdbIcon.title = 'TMDB Link';

        tmdbLink.appendChild(tmdbIcon);
        return tmdbLink;
    }

    // Main function to initialize the script
    window.onload = function() {
        console.log('TMDB Video Selector Loaded.');

        // Check for the required elements
        const synopsisPanel = document.querySelector('#synopsis-and-trailer');
        const panelBody = synopsisPanel ? synopsisPanel.querySelector('.panel__body') : null;
        const videoDiv = panelBody ? panelBody.querySelector('#trailer') : null;

        if (!synopsisPanel || !panelBody || !videoDiv) {
            console.error('Required elements not found.');
            return;
        }

        // Save the original YouTube iframe
        const originalIframe = videoDiv.innerHTML;

        // Check if the original trailer is loaded
        let originalLoaded = true;

        // Create the dropdown
        const containerDiv = document.createElement('div');
        containerDiv.style.display = 'flex';
        containerDiv.style.justifyContent = 'space-between';
        containerDiv.style.alignItems = 'center';
        containerDiv.style.marginBottom = '10px';

        // Video dropdown
        const videoDropdown = document.createElement('select');
        videoDropdown.style.marginRight = '10px';
        containerDiv.appendChild(videoDropdown);

        // Insert the container with dropdown before the video div
        panelBody.insertBefore(containerDiv, videoDiv);

        // Automatically load and populate videos from TMDB based on IMDb ID
        searchTMDBVideos(imdbId, (videos) => {
            if (videos.length > 0) {
                populateDropdowns(videos, videoDropdown, originalIframe, videoDiv, originalLoaded, isTVShow);
            } else {
                console.error('No videos found.');
            }
        });
    };
})();