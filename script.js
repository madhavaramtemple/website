/* ===== LANGUAGE SYSTEM ===== */
let currentLang = localStorage.getItem('temple_lang') || 'te';

function toggleLanguage() {
  currentLang = currentLang === 'te' ? 'en' : 'te';
  localStorage.setItem('temple_lang', currentLang);
  // Close any open modals
  if (typeof closeDonateModal === 'function') closeDonateModal();
  if (typeof closeAlbum === 'function') closeAlbum();
  updatePageContent();
}

function updatePageContent() {
  // 1. Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n'));
    if (val !== el.getAttribute('data-i18n')) el.innerHTML = val;
  });
  // 2. Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-placeholder'));
    if (val !== el.getAttribute('data-i18n-placeholder')) el.placeholder = val;
  });
  // 3. Update aria-labels
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-aria'));
    if (val !== el.getAttribute('data-i18n-aria')) el.setAttribute('aria-label', val);
  });
  // 4. Update select options
  document.querySelectorAll('option[data-i18n]').forEach(opt => {
    const val = t(opt.getAttribute('data-i18n'));
    if (val !== opt.getAttribute('data-i18n')) opt.textContent = val;
  });
  // 5. Update alt attributes
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-alt'));
    if (val !== el.getAttribute('data-i18n-alt')) el.setAttribute('alt', val);
  });
  // 6. Update title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const val = t(el.getAttribute('data-i18n-title'));
    if (val !== el.getAttribute('data-i18n-title')) el.setAttribute('title', val);
  });
  // 5. Toggle button text
  const langText = document.getElementById('langToggleText');
  if (langText) langText.textContent = currentLang === 'te' ? 'English' : 'తెలుగు';
  // 6. HTML lang attribute
  document.documentElement.setAttribute('lang', currentLang);
  // 7. Update meta description and keywords for SEO
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('meta_description'));
  const metaKw = document.querySelector('meta[name="keywords"]');
  if (metaKw) metaKw.setAttribute('content', t('meta_keywords'));
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadPhotosFromConfig();
  updatePageContent();
});

/* Scroll to top */
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 400;
  document.getElementById('scrollTopBtn').classList.toggle('visible', scrolled);
  // Hide float donate when near donation section
  const don = document.getElementById('donation');
  if (don) {
    const r = don.getBoundingClientRect();
    document.getElementById('floatDonate').style.opacity = (r.top < window.innerHeight && r.bottom > 0) ? '0' : '';
  }
});

/* Nav */
function toggleNav() {
  const links = document.getElementById('navLinks');
  const toggle = document.getElementById('navToggle');
  const isOpen = links.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', isOpen);
}
function closeNav() {
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('navToggle').classList.remove('open');
  document.getElementById('navToggle').setAttribute('aria-expanded','false');
}
document.addEventListener('click', e => {
  if (!document.querySelector('nav').contains(e.target)) closeNav();
});

/* Modal */
// ============================================================
// RAZORPAY KEY — Replace with your real Key ID after signup
// Get it from: razorpay.com → Settings → API Keys
// ============================================================
const RAZORPAY_KEY = 'rzp_test_REPLACE_WITH_YOUR_KEY';
// ============================================================

function openDonateModal()  { document.getElementById('donateModal').classList.add('open'); document.body.style.overflow='hidden'; }
function closeDonateModal() { document.getElementById('donateModal').classList.remove('open'); document.body.style.overflow=''; }
document.getElementById('donateModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeDonateModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeDonateModal(); });

/* Quick donate from card click — opens modal with amount pre-selected */
function quickDonate(amount) {
  openDonateModal();
  // Find the matching amount option and select it
  const opts = document.querySelectorAll('.amount-opt');
  let matched = false;
  opts.forEach(function(opt) {
    opt.classList.remove('selected');
    if (parseInt(opt.getAttribute('data-amount')) === amount) {
      opt.classList.add('selected');
      matched = true;
    }
  });
  // If no exact match (e.g. card shows ₹500 but modal has ₹501), use custom amount
  if (!matched) {
    opts.forEach(function(opt) {
      if (opt.getAttribute('data-amount') === 'custom') {
        opt.classList.add('selected');
        document.getElementById('customAmountBox').style.display = 'block';
        document.getElementById('customAmountInput').value = amount;
      }
    });
  } else {
    document.getElementById('customAmountBox').style.display = 'none';
  }
}

/* Amount select */
function selectAmount(el) {
  document.querySelectorAll('.amount-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const isCustom = el.getAttribute('data-amount') === 'custom';
  document.getElementById('customAmountBox').style.display = isCustom ? 'block' : 'none';
}

/* Get selected amount in paise (Razorpay uses paise) */
function getSelectedAmount() {
  const sel = document.querySelector('.amount-opt.selected');
  if (!sel) return null;
  if (sel.getAttribute('data-amount') === 'custom') {
    const val = parseInt(document.getElementById('customAmountInput').value);
    return isNaN(val) || val < 10 ? null : val * 100;
  }
  return parseInt(sel.getAttribute('data-amount')) * 100;
}

/* Razorpay Payment */
function startRazorpayPayment() {
  const amountPaise = getSelectedAmount();
  const name  = document.getElementById('donorName').value.trim();
  const phone = document.getElementById('donorPhone').value.trim();
  const email = document.getElementById('donorEmail').value.trim() || 'donor@temple.org';

  if (!amountPaise) {
    alert(t('alert_select_amount')); return;
  }
  if (!name) {
    alert(t('alert_enter_name')); return;
  }
  if (!phone || phone.length < 10) {
    alert(t('alert_enter_phone')); return;
  }

  const options = {
    key: RAZORPAY_KEY,
    amount: amountPaise,
    currency: 'INR',
    name: t('razorpay_name'),
    description: t('razorpay_description'),
    image: '',
    prefill: {
      name:  name,
      email: email,
      contact: '+91' + phone.replace(/^\+?91/, '')
    },
    notes: {
      donor_name: name,
      temple: 'Sri Bhadravathi Bhavanarayana Swamy Temple, Kotha Madhavaram'
    },
    theme: { color: '#7B0D1E' },
    modal: { ondismiss: function() { console.log('Payment dismissed'); } },
    handler: function(response) {
      closeDonateModal();
      const amt = (amountPaise / 100).toLocaleString('en-IN');
      alert(
        t('razorpay_success') + ' ' + name + ' ' + t('razorpay_success_honorific') + '\n' +
        t('razorpay_amount_label') + ' ₹' + amt + '\n' +
        'Payment ID: ' + response.razorpay_payment_id + '\n' +
        t('razorpay_blessing')
      );
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      alert(t('razorpay_failed') + ' ' + response.error.description + '\n' + t('razorpay_retry'));
    });
    rzp.open();
  } catch(e) {
    alert(t('razorpay_load_error'));
  }
}

/* ===== ₹99 MONTHLY QUICK DONATE ===== */
function donate99() {
  const name = prompt(t('monthly99_prompt_name'));
  if (!name || !name.trim()) return;

  const phone = prompt(t('monthly99_prompt_phone'));
  if (!phone || phone.trim().length < 10) {
    alert(t('alert_enter_phone'));
    return;
  }

  const options = {
    key: RAZORPAY_KEY,
    amount: 9900,  // ₹99 in paise
    currency: 'INR',
    name: t('razorpay_name'),
    description: t('monthly99_razorpay_desc'),
    image: '',
    prefill: {
      name: name.trim(),
      contact: '+91' + phone.trim().replace(/^\+?91/, '')
    },
    notes: {
      donor_name: name.trim(),
      donation_type: 'monthly_99',
      temple: 'Sri Bhadravathi Bhavanarayana Swamy Temple, Kotha Madhavaram'
    },
    theme: { color: '#C9973A' },
    modal: { ondismiss: function() { console.log('₹99 payment dismissed'); } },
    handler: function(response) {
      alert(
        t('monthly99_success_prefix') + name.trim() + t('monthly99_success_suffix') + '\n' +
        'Payment ID: ' + response.razorpay_payment_id + '\n\n' +
        t('monthly99_success_reminder')
      );
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      alert(t('alert_payment_failed_prefix') + response.error.description + t('alert_payment_failed_suffix'));
    });
    rzp.open();
  } catch(e) {
    alert(t('alert_razorpay_load_error'));
  }
}


/* ===== DYNAMIC ALBUM SYSTEM ===== */
/* Albums are auto-discovered from Google Drive folder structure */

/* Utility: escape HTML special characters in Drive folder names */
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* Color palette for dynamic gallery cards */
var GALLERY_COLORS = [
  ['#7B0D1E','#B02030'], ['#7B3A00','#C06020'], ['#1A5C00','#3A8C20'],
  ['#003070','#1050A0'], ['#5C1A7B','#8C40A0'], ['#8B2252','#C04848'],
  ['#2A3D00','#4A6C10'], ['#4A1A00','#7A3010']
];

/* Breadcrumb navigation state */
var _albumBreadcrumbs = [];
var _albumFolderCache = {};

/* --- Load gallery from Google Drive root folder --- */
async function loadPhotosFromConfig() {
  if (typeof photoConfig === 'undefined' || typeof DrivePhotoLoader === 'undefined') return;
  if (!photoConfig.googleDriveApiKey || !photoConfig.rootFolderId) return;

  var galleryGrid = document.querySelector('.gallery-grid');
  if (!galleryGrid) return;

  try {
    var result = await DrivePhotoLoader.discoverRoot();
    _albumFolderCache[photoConfig.rootFolderId] = result;
    renderGalleryGrid(galleryGrid, result);
  } catch (err) {
    console.warn('[Gallery] Failed to discover root folder:', err);
    galleryGrid.innerHTML = '<div class="gallery-error">'
      + '<span>📂</span><span>' + t('gallery_error') + '</span></div>';
  }
}

/* Render top-level gallery grid from Drive folder discovery */
function renderGalleryGrid(container, folderData) {
  var html = '';
  var colorIndex = 0;
  var folderIds = []; // track folder IDs for thumbnail loading

  // Render a card for each subfolder
  folderData.folders.forEach(function(folder) {
    var colors = GALLERY_COLORS[colorIndex % GALLERY_COLORS.length];
    var safeName = escapeHtml(folder.name).replace(/'/g, "\\'");
    html += '<div class="gallery-item" onclick="openDynamicAlbum(\'' + folder.id + '\',\'' + safeName + '\')">'
      + '<div class="gallery-placeholder" id="gcard_' + folder.id + '" style="background:linear-gradient(145deg,' + colors[0] + ',' + colors[1] + ')">'
      + '<span class="gallery-img-label">' + escapeHtml(folder.name) + '</span>'
      + '</div></div>';
    folderIds.push(folder.id);
    colorIndex++;
  });

  // If there are loose images AND also subfolders, add an "Others" card
  if (folderData.images.length > 0 && folderData.folders.length > 0) {
    var colors = GALLERY_COLORS[colorIndex % GALLERY_COLORS.length];
    // Use first loose image as cover for "Others"
    var othersCover = folderData.images[0].url;
    html += '<div class="gallery-item" onclick="openLooseImages()">'
      + '<div class="gallery-placeholder gallery-cover-loaded" style="background-image:url(\'' + othersCover + '\');background-size:cover;background-position:center;">'
      + '<span class="gallery-img-label">' + t('album_others') + '</span>'
      + '</div></div>';
  }

  // If ONLY images (no subfolders), show them directly as gallery cards
  if (folderData.images.length > 0 && folderData.folders.length === 0) {
    html = '';
    folderData.images.forEach(function(img, i) {
      html += '<div class="gallery-item">'
        + '<div class="gallery-placeholder gallery-cover-loaded" style="background-image:url(\'' + img.url + '\');background-size:cover;background-position:center;cursor:pointer;" '
        + 'onclick="openLightbox(\'' + img.url + '\',\'\',\'' + escapeHtml(img.name).replace(/'/g, "\\'") + '\')">'
        + '<span class="gallery-img-label">' + escapeHtml(img.name) + '</span>'
        + '</div></div>';
    });
  }

  if (!html && folderData.folders.length === 0 && folderData.images.length === 0) {
    html = '<div class="gallery-empty">'
      + '<span>📂</span><span>' + t('gallery_empty') + '</span></div>';
  }

  container.innerHTML = html;

  // Progressive thumbnail loading — fetch first image for each folder
  folderIds.forEach(function(folderId) {
    DrivePhotoLoader.peekFirstImage(folderId).then(function(url) {
      if (!url) return;
      var card = document.getElementById('gcard_' + folderId);
      if (!card) return;
      // Preload image, then apply as cover
      var img = new Image();
      img.onload = function() {
        card.style.backgroundImage = 'url(\'' + url + '\')';
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.classList.add('gallery-cover-loaded');
        // Hide the placeholder icon
        var icon = card.querySelector('.gallery-img-icon');
        if (icon) icon.style.display = 'none';
      };
      img.src = url;
    });
  });
}

/* --- Dynamic album navigation (works at any nesting depth) --- */

function openDynamicAlbum(folderId, folderName) {
  var overlay = document.getElementById('albumOverlay');
  var body = document.getElementById('albumModalBody');
  var crumb = document.getElementById('albumBreadcrumb');

  document.getElementById('albumModalTitle').textContent = folderName;

  // Manage breadcrumb stack
  if (!overlay.classList.contains('open')) {
    // Fresh open from gallery grid
    _albumBreadcrumbs = [];
  }
  _albumBreadcrumbs.push({ id: folderId, name: folderName });

  renderBreadcrumbs(crumb);

  // Show loading state
  body.innerHTML = '<div class="album-loading-msg">'
    + '<div class="drive-spinner"></div>'
    + '<span>' + t('album_photos_loading') + '</span></div>';

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Fetch folder contents (lazy loading with cache)
  DrivePhotoLoader.discoverFolder(folderId).then(function(result) {
    _albumFolderCache[folderId] = result;
    renderAlbumContents(body, result, folderName);
  }).catch(function(err) {
    console.warn('[Album] Failed to load folder:', err);
    body.innerHTML = '<div class="album-empty-msg">'
      + '<span>' + t('album_load_error') + '</span></div>';
  });
}

/* Generic album content renderer — works at any nesting level */
function renderAlbumContents(body, folderData, folderName) {
  var html = '';
  var hasSubfolders = folderData.folders.length > 0;
  var hasImages = folderData.images.length > 0;

  // Show subfolder cards
  if (hasSubfolders) {
    var subfolderIds = [];
    html += '<div class="subalbum-grid">';
    folderData.folders.forEach(function(subfolder) {
      html += '<div class="subalbum-card" onclick="openDynamicAlbum(\'' + subfolder.id + '\',\'' + escapeHtml(subfolder.name).replace(/'/g, "\\'") + '\')">'
        + '<div class="subalbum-thumb" id="scard_' + subfolder.id + '"></div>'
        + '<div class="subalbum-info"><h5>' + escapeHtml(subfolder.name) + '</h5>'
        + '</div></div>';
      subfolderIds.push(subfolder.id);
    });
    html += '</div>';

    // Progressive thumbnail loading for subalbum cards
    setTimeout(function() {
      subfolderIds.forEach(function(sid) {
        DrivePhotoLoader.peekFirstImage(sid).then(function(url) {
          if (!url) return;
          var thumb = document.getElementById('scard_' + sid);
          if (!thumb) return;
          var img = new Image();
          img.onload = function() {
            thumb.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;" />';
          };
          img.src = url;
        });
      });
    }, 50);
  }

  // Show images
  if (hasImages) {
    // If also has subfolders, label as "Others"
    if (hasSubfolders) {
      html += '<div class="album-others-section">'
        + '<h4 class="album-others-heading">' + t('album_others')
        + ' (' + folderData.images.length + ' ' + t('album_photos_count') + ')</h4>';
    }

    html += '<div class="album-photo-grid">';
    var safeFolder = escapeHtml(folderName).replace(/'/g, "\\'");
    folderData.images.forEach(function(img, i) {
      html += '<div class="album-photo-item" onclick="openLightbox(\'' + img.url + '\',\'\',\'' + safeFolder + ' — ' + (i + 1) + '\')">'
        + '<img src="' + img.url + '" alt="' + escapeHtml(img.name) + '" loading="lazy" /></div>';
    });
    html += '</div>';

    if (hasSubfolders) {
      html += '</div>'; // close .album-others-section
    }
  }

  // Empty folder
  if (!hasSubfolders && !hasImages) {
    html = '<div class="album-empty-msg">'
      + '<div style="font-size:48px;margin-bottom:12px;">📂</div>'
      + '<strong>' + escapeHtml(folderName) + '</strong><br>'
      + t('album_photos_upload_soon') + '</div>';
  }

  body.innerHTML = html;
}

/* Render breadcrumb navigation */
function renderBreadcrumbs(crumbEl) {
  if (_albumBreadcrumbs.length <= 1) {
    crumbEl.innerHTML = '<span>' + escapeHtml(_albumBreadcrumbs[0].name) + '</span>';
    return;
  }
  var html = '';
  _albumBreadcrumbs.forEach(function(item, index) {
    if (index < _albumBreadcrumbs.length - 1) {
      html += '<a onclick="navigateToBreadcrumb(' + index + ')">'
        + escapeHtml(item.name) + '</a>'
        + ' <span class="sep">›</span> ';
    } else {
      html += '<span>' + escapeHtml(item.name) + '</span>';
    }
  });
  crumbEl.innerHTML = html;
}

/* Navigate back to a breadcrumb level */
function navigateToBreadcrumb(index) {
  var target = _albumBreadcrumbs[index];
  _albumBreadcrumbs = _albumBreadcrumbs.slice(0, index);
  openDynamicAlbum(target.id, target.name);
}

/* Open "Others" — loose images from root folder */
function openLooseImages() {
  var overlay = document.getElementById('albumOverlay');
  var body = document.getElementById('albumModalBody');
  var crumb = document.getElementById('albumBreadcrumb');
  var title = t('album_others');

  document.getElementById('albumModalTitle').textContent = title;
  _albumBreadcrumbs = [{ id: 'others', name: title }];
  renderBreadcrumbs(crumb);

  var cached = _albumFolderCache[photoConfig.rootFolderId];
  if (cached && cached.images.length > 0) {
    var html = '<div class="album-photo-grid">';
    var safeTitle = escapeHtml(title).replace(/'/g, "\\'");
    cached.images.forEach(function(img, i) {
      html += '<div class="album-photo-item" onclick="openLightbox(\'' + img.url + '\',\'\',\'' + safeTitle + ' — ' + (i + 1) + '\')">'
        + '<img src="' + img.url + '" alt="' + escapeHtml(img.name) + '" loading="lazy" /></div>';
    });
    html += '</div>';
    body.innerHTML = html;
  } else {
    body.innerHTML = '<div class="album-empty-msg">' + t('album_photos_upload_soon') + '</div>';
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAlbum() {
  document.getElementById('albumOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _albumBreadcrumbs = [];
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAlbum(); });


/* Gallery Lightbox with prev/next navigation */
let _lbPhotos = [];
let _lbIndex = 0;
let _lbPrefix = '';

function openLightbox(imgSrc, emoji, caption) {
  // Auto-detect album photos from the current modal for navigation
  _lbPhotos = [];
  _lbIndex = 0;
  _lbPrefix = '';

  if (imgSrc) {
    const allImgs = document.querySelectorAll('#albumModalBody .album-photo-grid .album-photo-item img');
    if (allImgs.length > 1) {
      _lbPhotos = Array.from(allImgs).map(i => i.src);
      _lbPrefix = caption.replace(/ — \d+$/, '');
      _lbIndex = _lbPhotos.findIndex(src => src === imgSrc);
      if (_lbIndex === -1) _lbIndex = 0;
    }
  }

  _showLightboxImage(imgSrc, emoji, caption);
}

function _showLightboxImage(imgSrc, emoji, caption) {
  const lb = document.getElementById('galleryLightbox');
  const img = document.getElementById('lightboxImg');
  const em = document.getElementById('lightboxEmoji');
  document.getElementById('lightboxCaption').textContent = caption;
  if (imgSrc) {
    img.src = imgSrc;
    img.style.display = 'block';
    em.style.display = 'none';
  } else {
    img.style.display = 'none';
    em.textContent = emoji;
    em.style.display = 'block';
  }
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _updateLightboxNav();
}

function _updateLightboxNav() {
  const prevBtn = document.getElementById('lbPrev');
  const nextBtn = document.getElementById('lbNext');
  const counter = document.getElementById('lbCounter');
  if (_lbPhotos.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    counter.style.display = 'none';
  } else {
    prevBtn.style.display = _lbIndex > 0 ? 'flex' : 'none';
    nextBtn.style.display = _lbIndex < _lbPhotos.length - 1 ? 'flex' : 'none';
    counter.style.display = 'block';
    counter.textContent = (_lbIndex + 1) + ' / ' + _lbPhotos.length;
  }
}

function nextPhoto() {
  if (_lbPhotos.length > 0 && _lbIndex < _lbPhotos.length - 1) {
    _lbIndex++;
    _showLightboxImage(_lbPhotos[_lbIndex], '', _lbPrefix + ' — ' + (_lbIndex + 1));
  }
}

function prevPhoto() {
  if (_lbPhotos.length > 0 && _lbIndex > 0) {
    _lbIndex--;
    _showLightboxImage(_lbPhotos[_lbIndex], '', _lbPrefix + ' — ' + (_lbIndex + 1));
  }
}

function closeLightbox() {
  document.getElementById('galleryLightbox').style.display = 'none';
  document.body.style.overflow = '';
  _lbPhotos = [];
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('galleryLightbox');
  if (lb.style.display !== 'flex') return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowRight') nextPhoto();
  else if (e.key === 'ArrowLeft') prevPhoto();
});

/* Swipe support for mobile lightbox navigation */
(function() {
  let touchStartX = 0;
  let touchStartY = 0;
  const lb = document.getElementById('galleryLightbox');
  lb.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) nextPhoto();
      else prevPhoto();
    }
  }, { passive: true });
})();

/* Contact submit */
document.getElementById('contactSubmitBtn').addEventListener('click', () => {
  const form = document.getElementById('contactSubmitBtn').closest('.contact-form-box');
  const inputs = form.querySelectorAll('input, select, textarea');
  const name    = inputs[0].value.trim() || t('js_contact_default_name');
  const phone   = inputs[1].value.trim() || '-';
  const email   = inputs[2].value.trim() || '-';
  const subject = inputs[3].value.trim() || t('js_contact_default_subject');
  const message = inputs[4].value.trim() || '-';

  const emailSubject = t('js_contact_email_subject_prefix') + ' - ' + subject + ' (' + name + ')';
  const emailBody =
    t('js_contact_email_body_header') + '\n\n' +
    t('js_contact_name_label') + ': ' + name + '\n' +
    t('js_contact_phone_label') + ': ' + phone + '\n' +
    t('js_contact_email_label') + ': ' + email + '\n' +
    t('js_contact_subject_label') + ': ' + subject + '\n\n' +
    t('js_contact_message_label') + ':\n' + message;

  const mailUrl = 'mailto:madhavaramtemple@gmail.com?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(emailBody);
  window.location.href = mailUrl;
});

/* Smooth scroll with sticky nav offset */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if(id === '#') return;
    const target = document.querySelector(id);
    if(target) {
      e.preventDefault();
      const navH = document.querySelector('nav').offsetHeight;
      window.scrollTo({ top: target.offsetTop - navH - 8, behavior:'smooth' });
      closeNav();
    }
  });
});

/* ===== EVENTS LIST: SCROLL BOUNDARY PASSTHROUGH (mobile fix) ===== */
(function() {
  const eventsList = document.querySelector('.events-list');
  if (!eventsList) return;

  let lastTouchY = 0;

  eventsList.addEventListener('touchstart', function(e) {
    lastTouchY = e.touches[0].clientY;
  }, { passive: true });

  eventsList.addEventListener('touchmove', function(e) {
    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY - currentY; // positive = scrolling down
    const { scrollTop, scrollHeight, clientHeight } = eventsList;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    // At top and trying to scroll up → release to let page scroll
    if (atTop && deltaY < 0) {
      eventsList.style.overflowY = 'hidden';
      requestAnimationFrame(function() {
        setTimeout(function() { eventsList.style.overflowY = 'auto'; }, 100);
      });
      return;
    }

    // At bottom and trying to scroll down → release to let page scroll
    if (atBottom && deltaY > 0) {
      eventsList.style.overflowY = 'hidden';
      requestAnimationFrame(function() {
        setTimeout(function() { eventsList.style.overflowY = 'auto'; }, 100);
      });
      return;
    }

    lastTouchY = currentY;
  }, { passive: true });
})();
