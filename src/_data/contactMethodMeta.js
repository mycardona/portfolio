const mailIcon = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3.5" y="5.5" width="17" height="13" rx="2.2"></rect>
  <path d="M4.8 7l7.2 6 7.2-6"></path>
</svg>`;

module.exports = {
  fallback: {
    svg: mailIcon
  },
  booking: {
    label: "Booking Inquiries",
    svg: mailIcon
  },
  email: {
    label: "Email",
    svg: mailIcon
  },
  instagram: {
    label: "Instagram",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3.5" y="3.5" width="17" height="17" rx="4.5"></rect>
  <circle cx="12" cy="12" r="4"></circle>
  <circle cx="17.2" cy="6.8" r="1"></circle>
</svg>`
  },
  linkedin: {
    label: "LinkedIn",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3.5" y="3.5" width="17" height="17" rx="3.5"></rect>
  <circle cx="8.1" cy="8.1" r="1.05"></circle>
  <path d="M8.1 11.2v5.1"></path>
  <path d="M11.5 11.2v5.1"></path>
  <path d="M11.5 13.3c0-1.35 1-2.2 2.2-2.2s1.9.82 1.9 2.2v3"></path>
</svg>`
  },
  youtube: {
    label: "YouTube",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="3.5" y="6.5" width="17" height="11" rx="3.4"></rect>
  <polygon points="10,9.5 15,12 10,14.5"></polygon>
</svg>`
  },
  x: {
    label: "X",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M6 5.5h3.7l8.3 13H14.3z"></path>
  <path d="M7 18.5L17.3 5.5"></path>
</svg>`
  }
};
