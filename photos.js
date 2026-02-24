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
  discoverFolder: function(folderId) {
    var self = this;
    var apiKey = photoConfig.googleDriveApiKey;
    var cacheKey = 'folder_' + folderId;

    // Check cache first
    var cached = self.getCached(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return self.fetchFolderContents(folderId, apiKey).then(function(files) {
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
      return result;
    });
  },

  // Peek at a folder's first image (for cover thumbnails)
  // Returns image URL string or null
  peekFirstImage: function(folderId) {
    var self = this;
    var cacheKey = 'folder_' + folderId;

    // If folder already cached, grab from there
    var cached = self.getCached(cacheKey);
    if (cached) {
      if (cached.images && cached.images.length > 0) return Promise.resolve(cached.images[0].url);
      // No images at top level — try first subfolder
      if (cached.folders && cached.folders.length > 0) {
        return self.peekFirstImage(cached.folders[0].id);
      }
      return Promise.resolve(null);
    }

    // Fetch folder and check
    return self.discoverFolder(folderId).then(function(result) {
      if (result.images && result.images.length > 0) return result.images[0].url;
      // No images at top level — try first subfolder (one level deep only)
      if (result.folders && result.folders.length > 0) {
        return self.discoverFolder(result.folders[0].id).then(function(sub) {
          return (sub.images && sub.images.length > 0) ? sub.images[0].url : null;
        });
      }
      return null;
    }).catch(function() { return null; });
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
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            data: base64
          })
        })
        .then(function(response) { return response.json(); })
        .then(function(result) { resolve(result); })
        .catch(function(err) { reject(err); });
      };
      reader.onerror = function() { reject(new Error('Failed to read file')); };
      reader.readAsDataURL(file);
    });
  }
};
