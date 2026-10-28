'use strict';



// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });



// testimonials variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");

// the cards use backdrop-filter, which would make them the containing block for this
// position: fixed modal; keep it at the top level so it centers on the viewport
document.body.appendChild(modalContainer);
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

// modal variable
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
}

// add click event to all modal items
for (let i = 0; i < testimonialsItem.length; i++) {

  testimonialsItem[i].addEventListener("click", function () {

    const avatar = this.querySelector("[data-testimonials-avatar]");
    modalImg.setAttribute("aria-label", avatar.getAttribute("aria-label"));
    if (window.openPixelAvatar) window.openPixelAvatar(avatar.dataset.pixelAvatar);
    modalTitle.innerHTML = this.querySelector("[data-testimonials-title]").innerHTML;
    modalText.innerHTML = this.querySelector("[data-testimonials-text]").innerHTML;

    testimonialsModalFunc();

  });

}

// add click event to modal close button
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);



// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () { elementToggleFunc(this); });

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {

    let selectedValue = this.dataset.selectItem;
    selectValue.innerText = this.innerText;
    selectValue.dataset.i18n = this.dataset.i18n;
    elementToggleFunc(select);
    filterFunc(selectedValue);

  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");
const wipScene = document.querySelector("[data-wip]");

const filterFunc = function (selectedValue) {

  let shown = 0;

  for (let i = 0; i < filterItems.length; i++) {

    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }

    if (filterItems[i].classList.contains("active")) shown++;

  }

  // a category with nothing in it yet gets the under-construction scene (assets/js/wip.js)
  if (wipScene) wipScene.classList.toggle("active", shown === 0);

}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {

  filterBtn[i].addEventListener("click", function () {

    let selectedValue = this.dataset.filterBtn;
    selectValue.innerText = this.innerText;
    selectValue.dataset.i18n = this.dataset.i18n;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;

  });

}



// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {

    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }

  });
}



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {

    for (let i = 0; i < pages.length; i++) {
      if (this.dataset.navLink === pages[i].dataset.page) {
        pages[i].classList.add("active");
        navigationLinks[i].classList.add("active");
        window.scrollTo(0, 0);
      } else {
        pages[i].classList.remove("active");
        navigationLinks[i].classList.remove("active");
      }
    }

  });
}


// horizontal scroll lists (testimonials, clients): wheel, mouse drag and arrow buttons
const scrollLists = document.querySelectorAll(".has-scrollbar");

// scroll offset at which each item starts, clamped to the scrollable range
const itemPositions = function (list) {
  const items = list.children;
  if (!items.length) return [0];
  const first = items[0].getBoundingClientRect().left;
  const max = list.scrollWidth - list.clientWidth;
  const positions = [];
  for (let i = 0; i < items.length; i++) {
    const pos = Math.min(max, Math.max(0, items[i].getBoundingClientRect().left - first));
    if (!positions.length || pos - positions[positions.length - 1] > 1) positions.push(pos);
  }
  return positions;
}

// index of the snap position nearest the current scroll; dir biases to the next/previous one
const positionIndex = function (positions, scrollLeft, dir) {
  if (dir > 0) {
    for (let i = 0; i < positions.length; i++) if (positions[i] > scrollLeft + 1) return i;
    return positions.length - 1;
  }
  if (dir < 0) {
    for (let i = positions.length - 1; i >= 0; i--) if (positions[i] < scrollLeft - 1) return i;
    return 0;
  }
  let best = 0;
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i] - scrollLeft) < Math.abs(positions[best] - scrollLeft)) best = i;
  }
  return best;
}

const scrollListTo = function (list, dir) {
  const positions = itemPositions(list);
  const i = positionIndex(positions, list.scrollLeft, dir);
  list.scrollTo({ left: positions[i], behavior: "smooth" });
}

const canScroll = function (list, dir) {
  if (dir < 0) return list.scrollLeft > 2;
  return list.scrollLeft < list.scrollWidth - list.clientWidth - 2;
}

const updateScrollButtons = function (list) {
  const name = list.dataset.scrollList;
  if (!name) return;
  const prev = document.querySelector(`[data-scroll-prev="${name}"]`);
  const next = document.querySelector(`[data-scroll-next="${name}"]`);
  if (prev) prev.disabled = !canScroll(list, -1);
  if (next) next.disabled = !canScroll(list, 1);
}

for (let i = 0; i < scrollLists.length; i++) {
  const list = scrollLists[i];

  // wheel: one card per notch; at either end the page scrolls as usual
  let wheelLocked = false;
  list.addEventListener("wheel", function (e) {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const dir = Math.sign(delta);
    if (!dir || !canScroll(list, dir)) return;
    e.preventDefault();
    if (wheelLocked) return;
    wheelLocked = true;
    scrollListTo(list, dir);
    setTimeout(function () { wheelLocked = false; }, 400);
  }, { passive: false });

  // mouse drag (touch already scrolls natively)
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragDx = 0;
  let dragging = false;
  let dragMoved = false;

  list.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragDx = 0;
    dragStartX = e.clientX;
    dragStartScroll = list.scrollLeft;
  });

  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    dragDx = e.clientX - dragStartX;
    if (!dragMoved && Math.abs(dragDx) > 5) {
      dragMoved = true;
      list.classList.add("dragging");
    }
    if (dragMoved) list.scrollLeft = dragStartScroll - dragDx;
  });

  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    if (!dragMoved) return;
    list.classList.remove("dragging");
    // settle on a card, moving toward where the user dragged
    scrollListTo(list, Math.abs(dragDx) > 40 ? -Math.sign(dragDx) : 0);
  });

  // a drag should not also open the testimonial modal
  list.addEventListener("click", function (e) {
    if (dragMoved) {
      e.stopPropagation();
      e.preventDefault();
      dragMoved = false;
    }
  }, true);

  // prevent native image dragging from hijacking the gesture
  list.addEventListener("dragstart", function (e) { e.preventDefault(); });

  list.addEventListener("scroll", function () { updateScrollButtons(list); });
  updateScrollButtons(list);

  // arrow buttons
  const name = list.dataset.scrollList;
  if (name) {
    const prev = document.querySelector(`[data-scroll-prev="${name}"]`);
    const next = document.querySelector(`[data-scroll-next="${name}"]`);
    if (prev) prev.addEventListener("click", function () { scrollListTo(list, -1); });
    if (next) next.addEventListener("click", function () { scrollListTo(list, 1); });
  }
}



// day / night theme toggle (initial theme is set by the inline script in <head>)
const themeToggle = document.querySelector("[data-theme-toggle]");

const syncThemeLabel = function () {
  const dark = document.documentElement.dataset.theme === "dark";
  const zhUI = document.documentElement.lang.indexOf("zh") === 0;
  const label = dark ? (zhUI ? "切换到白天模式" : "Switch to day mode") : (zhUI ? "切换到夜间模式" : "Switch to night mode");
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
}

themeToggle.addEventListener("click", function () {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) { }
  syncThemeLabel();
});

syncThemeLabel();

// the label is bilingual, so refresh it after a language switch (i18n.js handles that click first)
document.querySelector("[data-lang-toggle]").addEventListener("click", function () { setTimeout(syncThemeLabel); });
