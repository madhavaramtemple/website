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
    alert('దయచేసి దానం మొత్తం ఎంచుకోండి.'); return;
  }
  if (!name) {
    alert('దయచేసి మీ పేరు నమోదు చేయండి.'); return;
  }
  if (!phone || phone.length < 10) {
    alert('దయచేసి సరైన ఫోన్ నంబర్ నమోదు చేయండి.'); return;
  }

  const options = {
    key: RAZORPAY_KEY,
    amount: amountPaise,
    currency: 'INR',
    name: 'శ్రీ భద్రావతీ భావనారాయణ స్వామి ఆలయం',
    description: 'ఆలయ నిధికి దానం — కొత్త మాధవరం',
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
        '🙏 దానం సఫలమైంది! ధన్యవాదాలు ' + name + ' గారు.\n' +
        'మొత్తం: ₹' + amt + '\n' +
        'Payment ID: ' + response.razorpay_payment_id + '\n' +
        'స్వామి వారి దీవెనలు మీకు సదా ఉండుగాక! 🙏'
      );
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function(response) {
      alert('చెల్లింపు విఫలమైంది: ' + response.error.description + '\nదయచేసి మళ్ళీ ప్రయత్నించండి.');
    });
    rzp.open();
  } catch(e) {
    alert('Razorpay లోడ్ కాలేదు. దయచేసి internet connection తనిఖీ చేయండి.');
  }
}


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
  const name    = inputs[0].value.trim() || 'పేరు తెలియదు';
  const phone   = inputs[1].value.trim() || '-';
  const email   = inputs[2].value.trim() || '-';
  const subject = inputs[3].value.trim() || 'వెబ్‌సైట్ సందేశం';
  const message = inputs[4].value.trim() || '-';

  const emailSubject = `ఆలయం సందేశం - ${subject} (${name})`;
  const emailBody =
    `శ్రీ భావనారాయణ స్వామి ఆలయం - వెబ్‌సైట్ సందేశం\n\n` +
    `పేరు: ${name}\n` +
    `ఫోన్: ${phone}\n` +
    `ఇమెయిల్: ${email}\n` +
    `విషయం: ${subject}\n\n` +
    `సందేశం:\n${message}`;

  const mailUrl = `mailto:madhavaramtemple@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
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
