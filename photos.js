/* ===== PHOTO GALLERY CONFIG — Google Drive Auto-Loader =====
 *
 * Photos are automatically loaded from Google Drive shared folders.
 * Just upload photos to the right Drive folder — they appear on the site!
 *
 * ── ONE-TIME SETUP ──
 * 1. Go to https://console.cloud.google.com/ → create a project
 * 2. Enable "Google Drive API" (APIs & Services → Library → search "Google Drive API")
 * 3. Create an API key (APIs & Services → Credentials → Create Credentials → API Key)
 * 4. Restrict the API key:
 *    - Application restrictions → HTTP referrers → add your domain (e.g., yourusername.github.io/*)
 *    - API restrictions → Restrict key → select only "Google Drive API"
 * 5. Create Google Drive folders matching the album structure:
 *      Brahmotsavalu/
 *        Before 2025/       ← upload old/archival photos
 *        2025/
 *          Day 1/           ← upload Day 1 photos
 *          Day 2/           ← etc.
 *          ...
 *        2026/
 *          Day 1/
 *          ...
 * 6. Share each folder: Right-click → Share → "Anyone with the link" → Viewer
 * 7. Copy folder IDs from the URL: drive.google.com/drive/folders/FOLDER_ID
 * 8. Paste the API key and folder IDs below
 * 9. Commit & push — done!
 *
 * ── HOW TO ADD MORE PHOTOS ──
 * Just upload photos to the Google Drive folder. They appear automatically
 * within 30 minutes (or immediately if the user opens a new browser tab).
 * Photos are sorted by filename, so name them 01_photo.jpg, 02_photo.jpg, etc.
 *
 * ── MANUAL PHOTO URLs (optional) ──
 * You can also add direct image URLs in the `photos` section below.
 * Manual URLs appear first, then Drive photos are appended after them.
 * ================================================================= */

const photoConfig = {

  /* ── Google Drive API Key ──
   * SECURITY NOTE: This API key is intentionally in client-side code.
   * This is the standard approach for static sites using Google APIs.
   * The key MUST be restricted in Google Cloud Console:
   *   1. Application restrictions → HTTP referrers →
   *      add: madhavaramtemple.github.io/* (and any custom domain)
   *   2. API restrictions → Restrict key → select only "Google Drive API"
   * This ensures the key only works from this website and only for Drive API.
   * See: https://cloud.google.com/docs/authentication/api-keys#securing
   */
  googleDriveApiKey: 'AIzaSyAz8AKbGMR6ubpU0eSguQMSTkJJNfam7QY',

  /* ── Google Drive Folder IDs ── */
  // Map each album path to its Google Drive folder ID
  // Folder ID is the last part of the Drive folder URL:
  //   https://drive.google.com/drive/folders/FOLDER_ID_HERE
  driveFolders: {
    // ── Brahmotsavams ──
    'brahmotsavalu/before-2025': '16NlMJ-XRNppVRhAScfTopKPTfCR0gvqV',   // Brahmotsavams → Previous years
    'brahmotsavalu/2025':        '1uFqqUlVO_NUGUOymQIuodgd1T7CKDDR7',   // Brahmotsavams → 2025
    'brahmotsavalu/2026':        '1CqULkcELUNalYGvfnXNik6wVAMcy2JjT',   // Brahmotsavams → 2026

    // ── Other albums ──
    'temple-facilities':         '1Yb3KY5GifLqp3ygIW_W1SZe9lKG4kcck',   // Temple Facilities
    'daily-poojas':              '1nji09QCxlXuU2HZ5yhIPqImKocBqZZNC',   // Daily poojas
    'devotees':                  '1SYLYujx5EK-lDa9ww04WUmbC1UmPYWo-',   // Devotees
    'development-activities':    '1wFnWUN-XDbW0n3ONAtOypmTlCVEnb0eO',   // Development activities
  },

  /* ── Shared album links (for "View Full Album" buttons) ── */
  albumLinks: {
    // Opens the full Google Drive/Photos album in a new tab
    // Example:
    // 'brahmotsavalu':           'https://drive.google.com/drive/folders/XXXXX',
    // 'brahmotsavalu/2025':      'https://drive.google.com/drive/folders/XXXXX',
    // 'brahmotsavalu/2025/day1': 'https://drive.google.com/drive/folders/XXXXX',
  },

  /* ── Manual photo URLs (optional, backward compatible) ── */
  photos: {
    // You can still add direct image URLs here.
    // These are displayed FIRST, before auto-loaded Drive photos.
    // Format: 'albumPath': ['url1', 'url2', ...]

    'brahmotsavalu/before-2025': [],
    'brahmotsavalu/2025/day1': [],
    'brahmotsavalu/2025/day2': [],
    'brahmotsavalu/2025/day3': [],
    'brahmotsavalu/2025/day4': [],
    'brahmotsavalu/2025/day5': [],
    'brahmotsavalu/2025/day6': [],
    'brahmotsavalu/2025/day7': [],
    'brahmotsavalu/2025/day8': [],
    'brahmotsavalu/2025/day9': [],
    'brahmotsavalu/2025/day10': [],
    'brahmotsavalu/2026/day1': [],
    'brahmotsavalu/2026/day2': [],
    'brahmotsavalu/2026/day3': [],
    'brahmotsavalu/2026/day4': [],
    'brahmotsavalu/2026/day5': [],
    'brahmotsavalu/2026/day6': [],
    'brahmotsavalu/2026/day7': [],
    'brahmotsavalu/2026/day8': [],
    'brahmotsavalu/2026/day9': [],
    'brahmotsavalu/2026/day10': [],

    // ── Other albums (flat photo grids) ──
    'temple-facilities': [],
    'daily-poojas': [],
    'devotees': [],
    'development-activities': [],
  }
};


/* ===== GOOGLE DRIVE AUTO-LOADER ===== */
const DrivePhotoLoader = {

  CACHE_KEY_PREFIX: 'temple_drive_photos_',
  CACHE_DURATION_MS: 30 * 60 * 1000,  // 30 minutes

  // Convert a Drive file ID to a displayable image URL
  // Uses lh3.googleusercontent.com which has proper CORS headers
  fileIdToImageUrl: function(fileId, width) {
    width = width || 1024;
    return 'https://lh3.googleusercontent.com/d/' + fileId + '=w' + width;
  },

  // Fetch image file list from a single Drive folder
  fetchFolder: function(folderId, apiKey) {
    var url = 'https://www.googleapis.com/drive/v3/files'
      + '?q=%27' + folderId + '%27+in+parents'
      + '+and+mimeType+contains+%27image%27'
      + '&key=' + apiKey
      + '&fields=files(id,name)'
      + '&orderBy=name'
      + '&pageSize=1000';

    return fetch(url)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Drive API error: ' + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        if (!data.files) return [];
        return data.files.map(function(file) {
          return DrivePhotoLoader.fileIdToImageUrl(file.id);
        });
      });
  },

  // Fetch all items (files + folders) from a Drive folder
  fetchFolderContents: function(folderId, apiKey) {
    var url = 'https://www.googleapis.com/drive/v3/files'
      + '?q=%27' + folderId + '%27+in+parents'
      + '&key=' + apiKey
      + '&fields=files(id,name,mimeType)'
      + '&orderBy=name'
      + '&pageSize=1000';

    return fetch(url)
      .then(function(response) {
        if (!response.ok) throw new Error('Drive API error: ' + response.status);
        return response.json();
      })
      .then(function(data) {
        return data.files || [];
      });
  },

  // Recursively fetch images from folder — if folder has subfolders,
  // collect all images from all subfolders into one flat array
  fetchFolderRecursive: function(folderId, apiKey) {
    var self = this;
    return self.fetchFolderContents(folderId, apiKey).then(function(files) {
      var images = [];
      var subfolderPromises = [];

      files.forEach(function(file) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recurse into subfolder
          subfolderPromises.push(self.fetchFolderRecursive(file.id, apiKey));
        } else if (file.mimeType && file.mimeType.indexOf('image') !== -1) {
          images.push(self.fileIdToImageUrl(file.id));
        }
      });

      if (subfolderPromises.length === 0) return images;

      return Promise.all(subfolderPromises).then(function(subResults) {
        subResults.forEach(function(subImages) {
          images = images.concat(subImages);
        });
        return images;
      });
    });
  },

  // Auto-detect day subfolders inside a year folder and map to album paths
  // E.g., Brahmotsavams/2025/ → Day 1/, Day 2/, etc. → brahmotsavalu/2025/day1, day2...
  autoDetectDays: function(yearFolderId, albumBasePath, apiKey) {
    var self = this;
    var config = photoConfig;

    return self.fetchFolderContents(yearFolderId, apiKey).then(function(files) {
      var dayPromises = [];
      var directImages = [];

      files.forEach(function(file) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Try to extract day number from folder name (e.g., "Day 1", "day1", "Day 01")
          var dayMatch = file.name.match(/day\s*(\d+)/i);
          if (dayMatch) {
            var dayNum = parseInt(dayMatch[1], 10);
            var dayPath = albumBasePath + '/day' + dayNum;

            var cached = self.getCached(dayPath);
            if (cached) {
              if (!config.photos[dayPath]) config.photos[dayPath] = [];
              config.photos[dayPath] = config.photos[dayPath].concat(cached);
            } else {
              var p = self.fetchFolderRecursive(file.id, apiKey).then(function(urls) {
                self.setCache(dayPath, urls);
                if (!config.photos[dayPath]) config.photos[dayPath] = [];
                config.photos[dayPath] = config.photos[dayPath].concat(urls);
              });
              dayPromises.push(p);
            }
          } else {
            // Non-day subfolder — fetch recursively and add to parent
            var p2 = self.fetchFolderRecursive(file.id, apiKey).then(function(urls) {
              directImages = directImages.concat(urls);
            });
            dayPromises.push(p2);
          }
        } else if (file.mimeType && file.mimeType.indexOf('image') !== -1) {
          directImages.push(self.fileIdToImageUrl(file.id));
        }
      });

      return Promise.all(dayPromises).then(function() {
        return directImages; // images directly in the year folder (not in day subfolders)
      });
    });
  },

  // Check sessionStorage cache
  getCached: function(albumPath) {
    try {
      var raw = sessionStorage.getItem(this.CACHE_KEY_PREFIX + albumPath);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > this.CACHE_DURATION_MS) {
        sessionStorage.removeItem(this.CACHE_KEY_PREFIX + albumPath);
        return null;
      }
      return cached.urls;
    } catch (e) {
      return null;
    }
  },

  // Save to sessionStorage cache
  setCache: function(albumPath, urls) {
    try {
      sessionStorage.setItem(this.CACHE_KEY_PREFIX + albumPath, JSON.stringify({
        timestamp: Date.now(),
        urls: urls
      }));
    } catch (e) {
      // sessionStorage full or unavailable — silently ignore
    }
  },

  // Load all configured Drive folders — returns a Promise
  loadAll: function() {
    var config = photoConfig;
    if (!config.googleDriveApiKey || !config.driveFolders) {
      return Promise.resolve();
    }

    var apiKey = config.googleDriveApiKey;
    var folders = config.driveFolders;
    var self = this;
    var promises = [];

    Object.keys(folders).forEach(function(albumPath) {
      var folderId = folders[albumPath];
      if (!folderId || folderId === 'PASTE_FOLDER_ID_HERE') return;

      // Brahmotsavam year folders — auto-detect day subfolders
      var yearMatch = albumPath.match(/^brahmotsavalu\/(20\d{2})$/);
      if (yearMatch) {
        var p = self.autoDetectDays(folderId, albumPath, apiKey)
          .then(function(directImages) {
            // directImages = photos in the year folder (not in day subfolders)
            if (directImages.length > 0) {
              self.setCache(albumPath, directImages);
              if (!config.photos[albumPath]) config.photos[albumPath] = [];
              config.photos[albumPath] = config.photos[albumPath].concat(directImages);
            }
          })
          .catch(function(err) {
            console.warn('[DrivePhotoLoader] Failed to load ' + albumPath + ':', err.message);
          });
        promises.push(p);
        return;
      }

      // Check cache first
      var cached = self.getCached(albumPath);
      if (cached) {
        if (!config.photos[albumPath]) config.photos[albumPath] = [];
        config.photos[albumPath] = config.photos[albumPath].concat(cached);
        return;
      }

      // All other folders — fetch recursively (handles nested subfolders)
      var p2 = self.fetchFolderRecursive(folderId, apiKey)
        .then(function(urls) {
          self.setCache(albumPath, urls);
          if (!config.photos[albumPath]) config.photos[albumPath] = [];
          config.photos[albumPath] = config.photos[albumPath].concat(urls);
        })
        .catch(function(err) {
          console.warn('[DrivePhotoLoader] Failed to load ' + albumPath + ':', err.message);
        });

      promises.push(p2);
    });

    return Promise.all(promises);
  }
};
