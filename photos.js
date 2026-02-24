/* ===== PHOTO GALLERY CONFIG — Google Drive Auto-Loader =====
 *
 * Photos are automatically loaded from Google Drive shared folders.
 * Just upload photos to the "photo albums" root folder — they appear on the site!
 *
 * ── HOW IT WORKS ──
 * 1. All subfolders inside the root folder become album cards on the gallery
 * 2. Subfolders within those become sub-album cards (recursive, any depth)
 * 3. Loose images (not in any subfolder) appear under "ఇతరాలు / Others"
 * 4. Folder names from Google Drive are used as album titles
 *
 * ── HOW TO ADD MORE PHOTOS ──
 * Just upload photos to the Google Drive folder. They appear automatically
 * within 30 minutes (or immediately if the user opens a new browser tab).
 * Photos are sorted by filename, so name them 01_photo.jpg, 02_photo.jpg, etc.
 * ================================================================= */

const photoConfig = {

  /* ── Google Drive API Key ──
   * SECURITY NOTE: This API key is intentionally in client-side code.
   * This is the standard approach for static sites using Google APIs.
   * The key MUST be restricted in Google Cloud Console:
   *   1. Application restrictions → HTTP referrers →
   *      add: madhavaramtemple.github.io/* (and any custom domain)
   *   2. API restrictions → Restrict key → select only "Google Drive API"
   */
  googleDriveApiKey: 'AIzaSyAz8AKbGMR6ubpU0eSguQMSTkJJNfam7QY',

  /* ── Root folder ID ──
   * This is the single "photo albums" folder in Google Drive.
   * All subfolders inside it become album cards automatically.
   * Folder ID is the last part of the Drive folder URL:
   *   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   */
  rootFolderId: '1VWHRsqb3dCWRfVAkx11ENB3JUCXw5pP5',

  /* ── Upload Script URL ──
   * Deploy the Google Apps Script (see google-apps-script.js) and
   * paste the web app URL here. Leave empty to disable uploads.
   * Looks like: https://script.google.com/macros/s/XXXX.../exec
   */
  uploadScriptUrl: 'https://script.google.com/macros/s/AKfycbw7GR5Axqyd65w4rZheWv8mdg3M4OftMx9OIp-ViAcRJmCR8dsOieTcMm9fWykvDukx/exec'
};


/* ===== GOOGLE DRIVE AUTO-LOADER ===== */
const DrivePhotoLoader = {

  CACHE_KEY_PREFIX: 'temple_drive_',
  CACHE_DURATION_MS: 30 * 60 * 1000,  // 30 minutes
  _inflight: {},  // de-duplicate concurrent API requests for same folder

  // Convert a Drive file ID to a displayable image URL
  fileIdToImageUrl: function(fileId, width) {
    width = width || 1024;
    return 'https://lh3.googleusercontent.com/d/' + fileId + '=w' + width;
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

  // Check sessionStorage cache
  getCached: function(cacheKey) {
    try {
      var raw = sessionStorage.getItem(this.CACHE_KEY_PREFIX + cacheKey);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > this.CACHE_DURATION_MS) {
        sessionStorage.removeItem(this.CACHE_KEY_PREFIX + cacheKey);
        return null;
      }
      return cached.data;
    } catch (e) {
      return null;
    }
  },

  // Save to sessionStorage cache
  setCache: function(cacheKey, data) {
    try {
      sessionStorage.setItem(this.CACHE_KEY_PREFIX + cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      // sessionStorage full or unavailable — silently ignore
    }
  },

  // Discover a folder's contents: separates subfolders from images
  // Returns { folders: [{id, name}], images: [{id, name, url}] }
  // De-duplicates concurrent requests for the same folder ID
  discoverFolder: function(folderId) {
    var self = this;
    var apiKey = photoConfig.googleDriveApiKey;
    var cacheKey = 'folder_' + folderId;

    // Check cache first
    var cached = self.getCached(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    // De-duplicate: if a request for this folder is already in-flight, reuse it
    if (self._inflight[folderId]) {
      return self._inflight[folderId];
    }

    var promise = self.fetchFolderContents(folderId, apiKey).then(function(files) {
      var folders = [];
      var images = [];

      files.forEach(function(file) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          folders.push({
            id: file.id,
            name: file.name
          });
        } else if (file.mimeType && file.mimeType.indexOf('image') !== -1) {
          images.push({
            id: file.id,
            name: file.name,
            url: self.fileIdToImageUrl(file.id)
          });
        }
        // Ignore non-image, non-folder files
      });

      var result = { folders: folders, images: images };
      self.setCache(cacheKey, result);
      delete self._inflight[folderId];
      return result;
    }).catch(function(err) {
      delete self._inflight[folderId];
      throw err;
    });

    self._inflight[folderId] = promise;
    return promise;
  },

  // Peek at a folder's first image (for cover thumbnails)
  // Recursively digs into ALL subfolders up to maxDepth levels to find a photo
  // Tries each subfolder sequentially until one yields an image
  // Returns image URL string or null
  peekFirstImage: function(folderId, depth) {
    var self = this;
    depth = depth || 0;
    var maxDepth = 3; // search up to 3 levels deep for a cover image

    return self.discoverFolder(folderId).then(function(result) {
      // If this folder has images, return the first one
      if (result.images && result.images.length > 0) {
        return result.images[0].url;
      }

      // No images here — try each subfolder sequentially until we find one
      if (result.folders && result.folders.length > 0 && depth < maxDepth) {
        var trySubfolder = function(index) {
          if (index >= result.folders.length) return null;
          return self.peekFirstImage(result.folders[index].id, depth + 1)
            .then(function(url) {
              if (url) return url;
              // This subfolder had nothing — try the next one
              return trySubfolder(index + 1);
            });
        };
        return trySubfolder(0);
      }

      return null;
    }).catch(function(err) {
      console.warn('[Gallery] peekFirstImage error for folder', folderId, err);
      return null;
    });
  },

  // Count total images in a folder (including all subfolders, recursive)
  // Returns Promise<number>
  countAllImages: function(folderId, depth) {
    var self = this;
    depth = depth || 0;
    var maxDepth = 3;

    return self.discoverFolder(folderId).then(function(result) {
      var count = result.images ? result.images.length : 0;
      if (result.folders && result.folders.length > 0 && depth < maxDepth) {
        var promises = result.folders.map(function(f) {
          return self.countAllImages(f.id, depth + 1);
        });
        return Promise.all(promises).then(function(counts) {
          counts.forEach(function(c) { count += c; });
          return count;
        });
      }
      return count;
    }).catch(function() { return 0; });
  },

  // Convenience: discover root folder
  discoverRoot: function() {
    return this.discoverFolder(photoConfig.rootFolderId);
  },

  // Upload a single file to the user-content Drive folder via Apps Script
  // file: a File object from <input type="file">
  // Returns a promise: { success: true/false }
  uploadFile: function(file) {
    var url = photoConfig.uploadScriptUrl;
    if (!url) return Promise.reject(new Error('Upload not configured'));

    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        // reader.result is "data:<mime>;base64,<data>"
        var base64 = reader.result.split(',')[1];
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            data: base64
          }),
          redirect: 'follow'
        })
        .then(function(response) {
          // Google Apps Script redirects (302) → browser follows → get JSON response
          return response.text();
        })
        .then(function(text) {
          try { resolve(JSON.parse(text)); }
          catch(e) { resolve({ success: true }); } // redirect followed but opaque response
        })
        .catch(function(err) { reject(err); });
      };
      reader.onerror = function() { reject(new Error('Failed to read file')); };
      reader.readAsDataURL(file);
    });
  }
};
