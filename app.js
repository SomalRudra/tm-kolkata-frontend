const WHATSAPP_NUMBER = "918981887910";
const CLIENT_SITE_URL = "https://tmkolkata.org/";
const ANALYTICS_FUNNEL_URL = window.TM_KOLKATA_ANALYTICS_URL || "https://analytics.tmkolkata.org/";
const EVENT_FEED_URL = window.TM_KOLKATA_EVENTS_URL || ANALYTICS_FUNNEL_URL;
const API_BASE_URL = window.TM_KOLKATA_API_URL || "https://tm-kolkata-backend-production.up.railway.app";

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#mobile-menu");
const siteHeader = document.querySelector(".site-header");
const videoModal = document.querySelector("#video-modal");
const openVideoButtons = document.querySelectorAll("[data-open-video]");
const closeVideoButtons = document.querySelectorAll("[data-close-video]");
const registrationSection = document.querySelector("#register");
const registrationForm = registrationSection.querySelector("form");
const registrationToggle = document.querySelector("[data-toggle-registration]");
const eventGrid = document.querySelector("#event-grid");
const tabButtons = document.querySelectorAll("[role='tab'][data-tab]");
const tabPanels = document.querySelectorAll("[role='tabpanel'][data-panel]");
const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
const spySections = Array.from(navLinks)
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
let publishedEvents = [];
let selectedRegistrationEvent = null;

function getNextWeekdayDate(targetWeekday, hour, minute) {
  const date = new Date();
  const daysUntilTarget = (targetWeekday + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilTarget);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function getFallbackEvents() {
  return [
    {
      id: "fallback-bhadreswar",
      title: "Bhadreswar Center Introductory Session",
      event_mode: "In-Person",
      kolkata_region: "Bhadreswar",
      event_date: getNextWeekdayDate(6, 17, 0),
      venue: "Bhadreswar Center | Active In-Person Center",
      description: "A free introductory talk at the local TM center."
    },
    {
      id: "fallback-online",
      title: "Online Intro Session",
      event_mode: "Virtual",
      kolkata_region: "Online",
      event_date: getNextWeekdayDate(5, 20, 30),
      venue: "Online",
      description: "Upcoming Friday 8:30 PM IST."
    }
  ];
}

function getTrafficAttribution() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || "tm-kolkata-frontend";
  const normalizedSource = utmSource.toLowerCase();
  const sourceChannel = params.has("fbclid") || ["facebook", "fb", "meta", "instagram"].includes(normalizedSource)
    ? "Meta Ads"
    : "Direct Web";

  return {
    source_channel: sourceChannel,
    utm_source: utmSource,
    utm_campaign: params.get("utm_campaign") || "public-event-registration"
  };
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setMessage(form, message, isError = false) {
  const messageNode = form.querySelector(".form-message");
  messageNode.textContent = message;
  messageNode.style.color = isError ? "#b33d2f" : "#687a50";
}

function validateForm(form) {
  if (form.checkValidity()) {
    return true;
  }

  form.reportValidity();
  setMessage(form, "Please complete the highlighted fields.", true);
  return false;
}

function persistLead(type, payload) {
  const key = `tmKolkata.${type}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push(payload);
  localStorage.setItem(key, JSON.stringify(existing));
}

async function postIfConfigured(endpoint, payload) {
  if (!API_BASE_URL) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("TM Kolkata API callback failed", error);
  }
}

function trackAnalyticsFunnel(eventName, payload = {}) {
  const body = JSON.stringify({
    event_name: eventName,
    client_site_url: CLIENT_SITE_URL,
    page_url: window.location.href,
    page_path: window.location.pathname,
    occurred_at: new Date().toISOString(),
    payload
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(ANALYTICS_FUNNEL_URL, blob)) {
        return;
      }
    }

    fetch(ANALYTICS_FUNNEL_URL, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true
    }).catch((error) => {
      console.warn("TM Kolkata analytics funnel callback failed", error);
    });
  } catch (error) {
    console.warn("TM Kolkata analytics funnel callback failed", error);
  }
}

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`TM Kolkata API returned ${response.status}`);
  }
  return response.json();
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatEventTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDisplayRegion(region) {
  return region === "Salt Lake" ? "Bhadreswar" : region;
}

function getEventModeLabel(event) {
  return event.event_mode === "Virtual"
    ? "Online | Live"
    : `In-Person | ${getDisplayRegion(event.kolkata_region)}`;
}

function getEventTimingLabel(event) {
  return event.event_mode === "Virtual"
    ? "Friday 8:30 pm IST"
    : formatEventTime(event.event_date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character]);
}

function eventLabel(event) {
  if (String(event.id).startsWith("fallback-online")) {
    return "Online Intro Session - Upcoming Friday 8:30 PM IST";
  }

  if (String(event.id).startsWith("fallback-bhadreswar")) {
    return "Bhadreswar Center | Active In-Person Center";
  }

  return `${formatEventDate(event.event_date)} - ${getDisplayRegion(event.kolkata_region)}`;
}

function renderEvents(events) {
  const sessions = events.length ? events : getFallbackEvents();
  publishedEvents = sessions;
  eventGrid.innerHTML = "";

  sessions.forEach((tmEvent) => {
    const card = document.createElement("article");
    card.className = "event-card";
    const venueDesc = tmEvent.description
      ? `${tmEvent.venue} | ${tmEvent.description}`
      : tmEvent.venue;
    card.innerHTML = `
      <span class="type-tag ${tmEvent.event_mode === "Virtual" ? "online" : ""}">
        ${escapeHtml(getEventModeLabel(tmEvent))}
      </span>
      <h3>${escapeHtml(tmEvent.title)}</h3>
      <div class="event-time">
        <strong>${formatEventDate(tmEvent.event_date)}</strong>
        <span>${escapeHtml(getEventTimingLabel(tmEvent))}</span>
      </div>
      <p class="event-venue-desc">${escapeHtml(venueDesc)}</p>
      <button class="button primary reserve-button" type="button" data-event-id="${tmEvent.id}">
        Reserve Seat
      </button>
    `;
    eventGrid.append(card);
  });
}

async function loadEvents() {
  try {
    const response = await fetch(`${EVENT_FEED_URL.replace(/\/$/, "")}/api/events`);
    if (!response.ok) {
      throw new Error(`TM Kolkata event feed returned ${response.status}`);
    }
    const events = await response.json();
    renderEvents(Array.isArray(events) ? events : []);
  } catch (error) {
    try {
      const fallbackEvents = await fetchJson("/api/events");
      renderEvents(Array.isArray(fallbackEvents) ? fallbackEvents : []);
    } catch (fallbackError) {
      console.warn("TM Kolkata event feed failed", error, fallbackError);
      renderEvents([]);
    }
  }
}

function triggerJsonCallback(eventName, payload) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  console.info(eventName, JSON.stringify(payload));

  const callbackName = eventName === "tmKolkataRegistration"
    ? "onTMKolkataRegistration"
    : "onTMKolkataQuestion";

  if (typeof window[callbackName] === "function") {
    window[callbackName](payload);
  }
}

function openVideoModal() {
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  videoModal.querySelector(".modal-close").focus();
}

function closeVideoModal() {
  videoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function setRegistrationOpen(isOpen) {
  registrationSection.classList.toggle("is-open", isOpen);
  registrationForm.hidden = !isOpen;
  if (registrationToggle) {
    registrationToggle.setAttribute("aria-expanded", String(isOpen));
    registrationToggle.textContent = isOpen ? "Hide Registration Form" : "Register Free For TM Course";
  }
}

function openRegistrationForm({ scroll = true, focusFirstField = false } = {}) {
  setRegistrationOpen(true);
  registrationSection.classList.add("is-highlighted");
  window.setTimeout(() => registrationSection.classList.remove("is-highlighted"), 1400);
  if (scroll) {
    registrationSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (focusFirstField) {
    window.setTimeout(() => registrationForm.elements.fullName.focus(), 350);
  }
}

setRegistrationOpen(false);

function updateHeaderState() {
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 50);
}

function updateActiveNavLink() {
  const marker = window.innerHeight * 0.35;
  let activeHref = "";

  spySections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= marker && rect.bottom > marker) {
      activeHref = `#${section.id}`;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === activeHref;
    link.classList.toggle("is-active", isActive);
  });
}

function setMobileMenuOpen(isOpen) {
  siteNav.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function activateTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

navToggle.addEventListener("click", () => {
  const isOpen = !siteNav.classList.contains("is-open");
  setMobileMenuOpen(isOpen);
});

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("scroll", updateActiveNavLink, { passive: true });
updateHeaderState();
updateActiveNavLink();

if (siteNav) {
  siteNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      closeMobileMenu();
    }
  });
}

document.addEventListener("click", (event) => {
  if (!siteNav.classList.contains("is-open")) {
    return;
  }

  if (siteNav.contains(event.target) || navToggle.contains(event.target)) {
    return;
  }

  closeMobileMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 992) {
    closeMobileMenu();
  }
});

openVideoButtons.forEach((button) => button.addEventListener("click", openVideoModal));
closeVideoButtons.forEach((button) => button.addEventListener("click", closeVideoModal));

document.querySelectorAll(".accordion details").forEach((details) => {
  details.addEventListener("toggle", () => {
    if (!details.open) {
      return;
    }

    document.querySelectorAll(".accordion details").forEach((otherDetails) => {
      if (otherDetails !== details) {
        otherDetails.open = false;
      }
    });
  });
});

document.querySelectorAll('a[href="#register"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    selectedRegistrationEvent = null;
    openRegistrationForm({ scroll: true, focusFirstField: true });
  });
});

if (registrationToggle) {
  registrationToggle.addEventListener("click", () => {
    const isOpen = registrationSection.classList.contains("is-open");
    setRegistrationOpen(!isOpen);
    if (!isOpen) {
      registrationSection.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => registrationForm.elements.fullName.focus(), 350);
    }
  });
}

eventGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-id]");
  if (!button) {
    return;
  }

  const tmEvent = publishedEvents.find((item) => String(item.id) === button.dataset.eventId);
  if (tmEvent) {
    trackAnalyticsFunnel("reserve_seat_clicked", {
      event_id: tmEvent.id,
      kolkata_region: getDisplayRegion(tmEvent.kolkata_region),
      event_date: tmEvent.event_date,
      event_mode: tmEvent.event_mode
    });
    selectedRegistrationEvent = tmEvent;
    openRegistrationForm({ scroll: true, focusFirstField: true });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
    closeMobileMenu();
  }
  if (event.key === "Escape" && videoModal.getAttribute("aria-hidden") === "false") {
    closeVideoModal();
  }
});

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm(registrationForm)) {
    return;
  }

  const payload = {
    ...formToObject(registrationForm)
  };
  const registrationPayload = {
    ...getTrafficAttribution(),
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    gender: payload.gender,
    age: payload.age,
    question: payload.question,
    event_id: selectedRegistrationEvent ? String(selectedRegistrationEvent.id) : "",
    event_title: selectedRegistrationEvent ? selectedRegistrationEvent.title : "",
    bucket: "BUCKET_B_REGISTERED",
  };

  persistLead("registrations", registrationPayload);
  triggerJsonCallback("tmKolkataRegistration", registrationPayload);
  trackAnalyticsFunnel("registration_submitted", registrationPayload);
  await postIfConfigured("/api/leads/register", registrationPayload);

  registrationForm.reset();
  selectedRegistrationEvent = null;
  setRegistrationOpen(false);
  setMessage(registrationForm, "Thank you. Your intro talk registration has been received.");

  const whatsappMessage = [
    "Hello, I am interested in Transcendental Meditation Kolkata.",
    "",
    `Name: ${payload.fullName}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email}`,
    `Gender: ${payload.gender}`,
    `Age: ${payload.age}`,
    "",
    "Question:",
    payload.question
  ].join("\n");
  window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
});

// Charts carousel
const chartsInner = document.querySelector(".charts-carousel-inner");
const chartSlides = document.querySelectorAll(".chart-slide");
const chartPrev = document.querySelector("[data-chart-prev]");
const chartNext = document.querySelector("[data-chart-next]");
const chartDotsContainer = document.querySelector(".chart-dots");
let chartIndex = 0;

if (chartsInner && chartSlides.length) {
  chartSlides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "chart-dot" + (i === 0 ? " is-active" : "");
    dot.type = "button";
    dot.setAttribute("aria-label", "Go to chart " + (i + 1));
    dot.addEventListener("click", () => {
      chartIndex = i;
      updateChartSlide();
    });
    chartDotsContainer.append(dot);
  });

  function updateChartSlide() {
    chartsInner.style.transform = "translateX(-" + (chartIndex * 100) + "%)";
    document.querySelectorAll(".chart-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === chartIndex);
    });
  }

  if (chartPrev) {
    chartPrev.addEventListener("click", () => {
      chartIndex = (chartIndex - 1 + chartSlides.length) % chartSlides.length;
      updateChartSlide();
    });
  }

  if (chartNext) {
    chartNext.addEventListener("click", () => {
      chartIndex = (chartIndex + 1) % chartSlides.length;
      updateChartSlide();
    });
  }
}

loadEvents();
