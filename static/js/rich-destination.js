/* Shared rich destination page behavior (Kashmir/Goa-style)
   Served via /js/rich-destination.js */

(function () {
  const images = Array.isArray(window.DESTINATION_IMAGES) ? window.DESTINATION_IMAGES : [];
  const climateQuery = typeof window.DESTINATION_CLIMATE_QUERY === "string" ? window.DESTINATION_CLIMATE_QUERY : "";
  const title = typeof window.DESTINATION_TITLE === "string" ? window.DESTINATION_TITLE : "";
  const subtitle = typeof window.DESTINATION_SUBTITLE === "string" ? window.DESTINATION_SUBTITLE : "";

  const sliderImage = document.getElementById("slider-image");
  const heroContainer = document.querySelector(".image-container");
  const heroBackgroundImg = document.querySelector(".img-box img");
  const thumbnailsContainer = document.getElementById("thumbnails-container");
  const descriptionText = document.getElementById("description-text");
  const ptext = document.getElementById("p-text");

  const pageTitle = document.getElementById("destination-title");
  const pageSubtitle = document.getElementById("destination-subtitle");

  if (pageTitle && title) pageTitle.textContent = title;
  if (pageSubtitle && subtitle) pageSubtitle.textContent = subtitle;

  // Short summary from description
  if (descriptionText && ptext) {
    const dtext = (descriptionText.innerText || "").trim().replace(/\s+/g, " ");
    const snippet = dtext.length > 160 ? dtext.slice(0, 160) + "…" : dtext;
    ptext.textContent = snippet;
  }

  if (!sliderImage || !thumbnailsContainer || images.length === 0) {
    return;
  }

  let currentIndex = 0;

  function preloadImage(src) {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }

  function setHeroBackground(src) {
    if (!src) return;

    // CSS background fallback (and nice if the img layer isn't present)
    if (heroContainer) {
      heroContainer.style.backgroundImage = `url("${src}")`;
    }

    // Actual background image layer (prevents the "first image stuck" issue)
    if (heroBackgroundImg) {
      heroBackgroundImg.classList.add("is-fading");
      window.setTimeout(() => {
        heroBackgroundImg.src = src;
        heroBackgroundImg.classList.remove("is-fading");
      }, 180);
    }
  }

  function updateImage() {
    const nextSrc = images[currentIndex];

    // Preload next slide for smoother transitions
    preloadImage(images[(currentIndex + 1) % images.length]);

    sliderImage.classList.remove("show");
    sliderImage.style.opacity = 0;
    window.setTimeout(() => {
      sliderImage.src = nextSrc;
      sliderImage.style.opacity = 1;
      sliderImage.classList.add("show");
    }, 250);

    setHeroBackground(nextSrc);

    const thumbnails = thumbnailsContainer.querySelectorAll("img");
    thumbnails.forEach((thumbnail, index) => {
      thumbnail.classList.toggle("active", index === currentIndex);
    });
  }

  window.moveSlide = function (step) {
    currentIndex = (currentIndex + step + images.length) % images.length;
    updateImage();
  };

  function selectSlide(index) {
    currentIndex = index;
    updateImage();
  }

  thumbnailsContainer.innerHTML = "";
  images.forEach((src, index) => {
    const thumbnail = document.createElement("img");
    thumbnail.src = src;
    thumbnail.alt = "Thumbnail";
    thumbnail.onclick = () => selectSlide(index);
    thumbnailsContainer.appendChild(thumbnail);
  });

  // Init image
  sliderImage.src = images[0];
  preloadImage(images[0]);
  setHeroBackground(images[0]);
  updateImage();

  // Auto-slide
  window.setInterval(() => {
    window.moveSlide(1);
  }, 5000);

  // Climate info (optional)
  async function loadClimate() {
    if (!climateQuery) return;
    const maxEl = document.querySelector(".max");
    const minEl = document.querySelector(".min");
    const humEl = document.querySelector(".humidity");
    if (!maxEl || !minEl || !humEl) return;

    try {
      const url =
        "https://api.shecodes.io/weather/v1/forecast?query=" +
        encodeURIComponent(climateQuery) +
        "&key=057314561f8344abb8d5d80t6761o6ae&units=metric";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const day0 = data && data.daily && data.daily[0] ? data.daily[0] : null;
      if (!day0 || !day0.temperature) return;

      maxEl.textContent = String(Math.round(day0.temperature.maximum));
      minEl.textContent = String(Math.round(day0.temperature.minimum));
      humEl.textContent = String(Math.round(day0.temperature.humidity));
    } catch {
      // Ignore climate errors silently
    }
  }

  loadClimate();
})();
