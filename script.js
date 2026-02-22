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


/* ===== ALBUM SYSTEM ===== */

/* Helper: 10-day Brahmotsavam sub-albums */
function makeDaySubAlbums() {
  return [
    { id: 'day1',  titleKey: 'album_day1',  icon: '🚩', thumb: '', photos: [] },
    { id: 'day2',  titleKey: 'album_day2',  icon: '🦅', thumb: '', photos: [] },
    { id: 'day3',  titleKey: 'album_day3',  icon: '🐒', thumb: '', photos: [] },
    { id: 'day4',  titleKey: 'album_day4',  icon: '🐘', thumb: '', photos: [] },
    { id: 'day5',  titleKey: 'album_day5',  icon: '☀️', thumb: '', photos: [] },
    { id: 'day6',  titleKey: 'album_day6',  icon: '🌙', thumb: '', photos: [] },
    { id: 'day7',  titleKey: 'album_day7',  icon: '🛞', thumb: '', photos: [] },
    { id: 'day8',  titleKey: 'album_day8',  icon: '🐎', thumb: '', photos: [] },
    { id: 'day9',  titleKey: 'album_day9',  icon: '💐', thumb: '', photos: [] },
    { id: 'day10', titleKey: 'album_day10', icon: '🪷', thumb: '', photos: [] }
  ];
}

const albumData = {
  'brahmotsavalu': {
    titleKey: 'album_brahmotsavalu',
    icon: '🎊',
    years: [
      {
        id: 'before-2025',
        labelKey: 'album_before_2025',
        icon: '📜',
        thumb: '',
        hasSubAlbums: false,
        photos: []
      },
      {
        id: '2025',
        label: '2025',
        icon: '🪔',
        thumb: '',
        hasSubAlbums: true,
        subAlbums: makeDaySubAlbums()
      },
      {
        id: '2026',
        label: '2026',
        icon: '✨',
        thumb: '',
        hasSubAlbums: true,
        subAlbums: makeDaySubAlbums()
      }
    ]
  },
  'temple-facilities': {
    titleKey: 'album_temple_facilities',
    icon: '🛕',
    singleAlbum: true,
    photos: []
  },
  'daily-poojas': {
    titleKey: 'album_daily_poojas',
    icon: '🪔',
    singleAlbum: true,
    photos: []
  },
  'devotees': {
    titleKey: 'album_devotees',
    icon: '🙏',
    singleAlbum: true,
    photos: []
  },
  'development-activities': {
    titleKey: 'album_development_activities',
    icon: '🏗️',
    singleAlbum: true,
    photos: []
  }
};

/* --- Load photos from photoConfig (photos.js) + Google Drive --- */
async function loadPhotosFromConfig() {
  if (typeof photoConfig === 'undefined') return;

  // Phase 1: Apply any manual photo URLs immediately
  applyPhotoConfigToAlbumData();

  // Phase 2: Fetch photos from Google Drive if configured
  if (typeof DrivePhotoLoader !== 'undefined' &&
      photoConfig.googleDriveApiKey &&
      photoConfig.driveFolders) {
    photoConfig._driveLoading = true;
    try {
      await DrivePhotoLoader.loadAll();
    } catch (err) {
      console.warn('[Photos] Drive loading failed:', err);
    }
    photoConfig._driveLoading = false;

    // Re-apply config (now includes Drive photos appended to manual ones)
    applyPhotoConfigToAlbumData();
  }
}

/* Populate albumData from photoConfig.photos */
function applyPhotoConfigToAlbumData() {
  if (!photoConfig.photos) return;
  Object.keys(albumData).forEach(albumKey => {
    const album = albumData[albumKey];

    // Single-album (flat photo grid, no year/day hierarchy)
    if (album.singleAlbum) {
      if (photoConfig.photos[albumKey] && photoConfig.photos[albumKey].length > 0) {
        album.photos = photoConfig.photos[albumKey];
      }
      return;
    }

    // Multi-year album (Brahmotsavams etc.)
    if (!album.years) return;
    album.years.forEach(year => {
      const yearPath = albumKey + '/' + year.id;
      if (photoConfig.photos[yearPath] && photoConfig.photos[yearPath].length > 0) {
        year.photos = photoConfig.photos[yearPath];
      }
      if (year.hasSubAlbums && year.subAlbums) {
        year.subAlbums.forEach(sub => {
          const subPath = albumKey + '/' + year.id + '/' + sub.id;
          if (photoConfig.photos[subPath] && photoConfig.photos[subPath].length > 0) {
            sub.photos = photoConfig.photos[subPath];
          }
        });
      }
    });
  });
}

/* Helper: build "View Full Album" link HTML */
function getViewFullAlbumLink(path) {
  if (typeof photoConfig === 'undefined' || !photoConfig.albumLinks) return '';
  const link = photoConfig.albumLinks[path];
  if (!link) return '';
  return '<div class="view-full-album">'
    + '<a href="' + link + '" target="_blank" rel="noopener noreferrer">'
    + t('album_view_full')
    + '</a></div>';
}

/* --- Album navigation --- */

function openAlbum(albumKey) {
  const album = albumData[albumKey];
  if (!album) return;
  const overlay = document.getElementById('albumOverlay');
  const body    = document.getElementById('albumModalBody');
  const crumb   = document.getElementById('albumBreadcrumb');
  document.getElementById('albumModalTitle').textContent = t(album.titleKey);
  overlay.dataset.currentAlbum = albumKey;

  // Single-album: show flat photo grid directly
  if (album.singleAlbum) {
    const albumTitle = t(album.titleKey);
    crumb.innerHTML = '<span>' + albumTitle + '</span>';
    const albumLink = getViewFullAlbumLink(albumKey);

    if (photoConfig._driveLoading && (!album.photos || album.photos.length === 0)) {
      body.innerHTML = '<div class="album-loading-msg">'
        + '<div class="drive-spinner"></div>'
        + '<span>' + t('album_photos_loading') + '</span></div>';
    } else if (!album.photos || album.photos.length === 0) {
      body.innerHTML = '<div class="album-empty-msg">'
        + '<div style="font-size:48px;margin-bottom:12px;">' + album.icon + '</div>'
        + '<strong>' + albumTitle + '</strong><br>'
        + t('album_photos_upload_soon') + '<br>'
        + '<span style="font-size:12px;color:#bbb;">' + t('album_send_photos') + '</span></div>'
        + albumLink;
    } else {
      let html = '<div class="album-photo-grid">';
      album.photos.forEach((photo, i) => {
        html += '<div class="album-photo-item" onclick="openLightbox(\'' + photo + '\',\'\',\'' + albumTitle + ' — ' + (i + 1) + '\')">'
          + '<img src="' + photo + '" alt="' + albumTitle + ' ' + (i + 1) + '" loading="lazy" /></div>';
      });
      html += '</div>';
      html += albumLink;
      body.innerHTML = html;
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    return;
  }

  // Multi-year album (Brahmotsavams): show year grid
  renderYearGrid(album, body, crumb);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAlbum() {
  document.getElementById('albumOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* Level 1: Year cards */
function renderYearGrid(album, body, crumb) {
  const albumTitle = t(album.titleKey);
  crumb.innerHTML = '<span>🏠</span> <span class="sep">›</span> <span>' + albumTitle + '</span>';
  let html = '<div class="subalbum-grid">';
  album.years.forEach(yr => {
    const yrLabel = yr.labelKey ? t(yr.labelKey) : yr.label;
    const thumbHtml = yr.thumb ? '<img src="' + yr.thumb + '" alt="' + yrLabel + '" />' : yr.icon;
    const countText = yr.hasSubAlbums
      ? yr.subAlbums.length + ' ' + t('album_days_count')
      : (yr.photos.length > 0 ? yr.photos.length + ' ' + t('album_photos_count') : t('album_photos_coming_soon'));
    html += '<div class="subalbum-card" onclick="openYear(\'' + yr.id + '\')">'
      + '<div class="subalbum-thumb">' + thumbHtml + '</div>'
      + '<div class="subalbum-info"><h5>' + yrLabel + '</h5>'
      + '<span>' + countText + '</span></div></div>';
  });
  html += '</div>';
  // Add "View Full Album" link for the main album
  const albumKey = document.getElementById('albumOverlay').dataset.currentAlbum;
  html += getViewFullAlbumLink(albumKey);
  body.innerHTML = html;
}

/* Level 2: Open a year — show day sub-albums or flat photos */
function openYear(yearId) {
  const albumKey = document.getElementById('albumOverlay').dataset.currentAlbum;
  const album = albumData[albumKey];
  const year  = album.years.find(y => y.id === yearId);
  if (!year) return;
  const body  = document.getElementById('albumModalBody');
  const crumb = document.getElementById('albumBreadcrumb');
  const albumTitle = t(album.titleKey);
  const yrLabel = year.labelKey ? t(year.labelKey) : year.label;

  if (year.hasSubAlbums) {
    // Show day-wise sub-album grid
    crumb.innerHTML = '<a onclick="backToYearGrid()">🏠 ' + albumTitle + '</a>'
      + ' <span class="sep">›</span> <span>' + yrLabel + '</span>';
    let html = '<div class="subalbum-grid">';
    year.subAlbums.forEach(sub => {
      const photoCount = sub.photos.length;
      const subTitle = sub.titleKey ? t(sub.titleKey) : sub.title;
      const thumbHtml  = sub.thumb ? '<img src="' + sub.thumb + '" alt="' + subTitle + '" />' : sub.icon;
      html += '<div class="subalbum-card" onclick="openSubAlbum(\'' + yearId + '\',\'' + sub.id + '\')">'
        + '<div class="subalbum-thumb">' + thumbHtml + '</div>'
        + '<div class="subalbum-info"><h5>' + subTitle + '</h5>'
        + '<span>' + (photoCount > 0 ? photoCount + ' ' + t('album_photos_count') : t('album_photos_coming_soon')) + '</span></div></div>';
    });
    html += '</div>';
    html += getViewFullAlbumLink(albumKey + '/' + yearId);
    body.innerHTML = html;
  } else {
    // Flat photo grid (no day sub-folders)
    crumb.innerHTML = '<a onclick="backToYearGrid()">🏠 ' + albumTitle + '</a>'
      + ' <span class="sep">›</span> <span>' + yrLabel + '</span>';
    const yearAlbumLink = getViewFullAlbumLink(albumKey + '/' + yearId);
    if (photoConfig._driveLoading && year.photos.length === 0) {
      body.innerHTML = '<div class="album-loading-msg">'
        + '<div class="drive-spinner"></div>'
        + '<span>' + t('album_photos_loading') + '</span></div>';
      return;
    }
    if (year.photos.length === 0) {
      body.innerHTML = '<div class="album-empty-msg">'
        + '<div style="font-size:48px;margin-bottom:12px;">' + year.icon + '</div>'
        + '<strong>' + yrLabel + '</strong><br>'
        + t('album_photos_upload_soon') + '<br>'
        + '<span style="font-size:12px;color:#bbb;">' + t('album_send_photos') + '</span></div>'
        + yearAlbumLink;
    } else {
      let html = '<div class="album-photo-grid">';
      year.photos.forEach((photo, i) => {
        html += '<div class="album-photo-item" onclick="openLightbox(\'' + photo + '\',\'\',\'' + yrLabel + ' — ' + (i + 1) + '\')">'
          + '<img src="' + photo + '" alt="' + yrLabel + ' ' + (i + 1) + '" loading="lazy" /></div>';
      });
      html += '</div>';
      html += yearAlbumLink;
      body.innerHTML = html;
    }
  }
}

/* Level 3: Open a day sub-album within a year */
function openSubAlbum(yearId, subAlbumId) {
  const albumKey = document.getElementById('albumOverlay').dataset.currentAlbum;
  const album = albumData[albumKey];
  const year  = album.years.find(y => y.id === yearId);
  const sub   = year.subAlbums.find(s => s.id === subAlbumId);
  if (!sub) return;
  const body  = document.getElementById('albumModalBody');
  const crumb = document.getElementById('albumBreadcrumb');
  const albumTitle = t(album.titleKey);
  const yrLabel = year.labelKey ? t(year.labelKey) : year.label;
  const subTitle = sub.titleKey ? t(sub.titleKey) : sub.title;

  crumb.innerHTML = '<a onclick="backToYearGrid()">🏠 ' + albumTitle + '</a>'
    + ' <span class="sep">›</span> <a onclick="openYear(\'' + yearId + '\')">' + yrLabel + '</a>'
    + ' <span class="sep">›</span> <span>' + subTitle + '</span>';

  const subAlbumLink = getViewFullAlbumLink(albumKey + '/' + yearId + '/' + subAlbumId);

  if (photoConfig._driveLoading && sub.photos.length === 0) {
    body.innerHTML = '<div class="album-loading-msg">'
      + '<div class="drive-spinner"></div>'
      + '<span>' + t('album_photos_loading') + '</span></div>';
    return;
  }

  if (sub.photos.length === 0) {
    body.innerHTML = '<div class="album-empty-msg">'
      + '<div style="font-size:48px;margin-bottom:12px;">' + sub.icon + '</div>'
      + '<strong>' + subTitle + '</strong><br>'
      + t('album_photos_upload_soon') + '<br>'
      + '<span style="font-size:12px;color:#bbb;">' + t('album_send_photos') + '</span></div>'
      + subAlbumLink;
    return;
  }

  let html = '<div class="album-photo-grid">';
  sub.photos.forEach((photo, i) => {
    html += '<div class="album-photo-item" onclick="openLightbox(\'' + photo + '\',\'\',\'' + subTitle + ' — ' + (i + 1) + '\')">'
      + '<img src="' + photo + '" alt="' + subTitle + ' ' + (i + 1) + '" loading="lazy" /></div>';
  });
  html += '</div>';
  html += subAlbumLink;
  body.innerHTML = html;
}

/* Back to year grid (level 1) */
function backToYearGrid() {
  const albumKey = document.getElementById('albumOverlay').dataset.currentAlbum;
  const album = albumData[albumKey];
  renderYearGrid(album, document.getElementById('albumModalBody'), document.getElementById('albumBreadcrumb'));
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAlbum(); });


/* Gallery Lightbox */
function openLightbox(imgSrc, emoji, caption) {
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
}
function closeLightbox() {
  document.getElementById('galleryLightbox').style.display = 'none';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeLightbox(); });

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
