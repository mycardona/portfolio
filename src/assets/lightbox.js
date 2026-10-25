// Full-screen viewer for project gallery photos. Each thumbnail is a plain
// link to a large image, so without this script the link still opens it.
(() => {
  const dialog = document.querySelector(".lightbox");
  const links = [...document.querySelectorAll("[data-lightbox]")];
  if (!dialog || !links.length || typeof dialog.showModal !== "function") return;

  const image = dialog.querySelector(".lightbox-image");
  const prev = dialog.querySelector(".lightbox-prev");
  const next = dialog.querySelector(".lightbox-next");
  const count = dialog.querySelector(".lightbox-count");
  let index = 0;

  const show = (i) => {
    index = Math.max(0, Math.min(links.length - 1, i));
    const link = links[index];
    image.src = link.href;
    image.alt = link.querySelector("img")?.alt || "";
    count.textContent = `${index + 1} / ${links.length}`;
    prev.hidden = index === 0;
    next.hidden = index === links.length - 1;
    dialog.classList.toggle("is-single", links.length === 1);

    // Warm the cache for the neighbours so paging feels instant.
    [links[index - 1], links[index + 1]].forEach((neighbour) => {
      if (neighbour) new Image().src = neighbour.href;
    });
  };

  const open = (i) => {
    show(i);
    if (dialog.open) return;
    // A history entry lets the phone back gesture close the viewer.
    history.pushState({ lightbox: true }, "");
    dialog.showModal();
  };

  const requestClose = () => {
    if (history.state?.lightbox) history.back();
    else dialog.close();
  };

  links.forEach((link, i) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      open(i);
    });
  });

  window.addEventListener("popstate", () => {
    if (dialog.open) dialog.close();
  });

  dialog.addEventListener("close", () => {
    links[index].focus();
  });

  // Esc fires "cancel"; route it through history so the pushed entry is popped.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });

  dialog.querySelector(".lightbox-close").addEventListener("click", requestClose);
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));

  // Clicking the dark area around the photo closes the viewer.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) requestClose();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    else if (event.key === "ArrowRight") show(index + 1);
  });

  // Horizontal swipe pages through photos. Skipped while pinch-zoomed so the
  // finger pans the zoomed photo instead.
  let touchStart = null;
  dialog.addEventListener("touchstart", (event) => {
    const zoomed = window.visualViewport && window.visualViewport.scale > 1.01;
    touchStart = event.touches.length === 1 && !zoomed
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }, { passive: true });

  dialog.addEventListener("touchend", (event) => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    show(index + (dx < 0 ? 1 : -1));
  });
})();
