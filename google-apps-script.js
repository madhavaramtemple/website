/*
 * ===== GOOGLE APPS SCRIPT — Temple Photo Upload Backend =====
 *
 * This script receives photo uploads from the temple website and
 * saves them to a Google Drive folder. Deploy as a web app.
 *
 * ── SETUP INSTRUCTIONS ──
 *
 * 1. Go to https://script.google.com
 * 2. Click "New project"
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" → "New deployment"
 * 5. Type: "Web app"
 * 6. Settings:
 *      - Description: "Temple Photo Upload"
 *      - Execute as: "Me" (your Google account)
 *      - Who has access: "Anyone"
 * 7. Click "Deploy" and authorize when prompted
 * 8. Copy the "Web app URL" (looks like: https://script.google.com/macros/s/XXXX/exec)
 * 9. Paste the URL into photos.js → photoConfig.uploadScriptUrl
 *
 * ── IMPORTANT NOTES ──
 * - The Google account that deploys this script must have
 *   edit access to the target Drive folder
 * - After any code changes, create a NEW deployment version
 * - Max file size: ~50MB (Google Apps Script limit)
 * ================================================================= */

var UPLOAD_FOLDER_ID = '16UxIG97sBeqWKOd66nOqCr2vAYYUrj5P';

/**
 * Handles POST requests from the temple website.
 * Receives a base64-encoded file and saves it to Google Drive.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (!data.fileName || !data.mimeType || !data.data) {
      return _jsonResponse({ success: false, error: 'Missing required fields' });
    }

    var folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);

    // Decode base64 data and create file
    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.data),
      data.mimeType,
      data.fileName
    );

    var file = folder.createFile(blob);

    return _jsonResponse({
      success: true,
      fileId: file.getId(),
      fileName: file.getName()
    });

  } catch (err) {
    return _jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Handles GET requests (health check).
 */
function doGet(e) {
  return _jsonResponse({ status: 'ok', message: 'Temple upload service is running' });
}

/**
 * Returns a JSON response with CORS headers.
 */
function _jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
