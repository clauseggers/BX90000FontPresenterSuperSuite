/**
 * mouse-hsl.js
 */

(function () {
  const root = document.documentElement;
  let currentHue = 200;
  let currentSat = 80;

  function setColorVars(hue, sat) {
    currentHue = hue;
    currentSat = sat;
    const tint = `hsl(${hue}, 30%, var(--mouse-tint-lightness))`;
    root.style.setProperty('--mouse-color', `hsl(${hue}, ${sat}%, var(--mouse-lightness))`);
    root.style.setProperty('--mouse-color-tint', tint);

    if (root.classList.contains('dark')) {
      root.style.setProperty('--white', tint);
      root.style.setProperty('--button-bg', tint);
    } else {
      root.style.setProperty('--button-bg', 'rgb(255, 255, 255)');
    }
  }

  // Expose so toggleColorScheme can trigger a refresh
  window.refreshMouseColor = () => setColorVars(currentHue, currentSat);

  setColorVars(200, 80);

  document.addEventListener('mousemove', function (e) {
    const hue = Math.round((e.clientX / window.innerWidth) * 360);
    const t = e.clientY / window.innerHeight;
    const sat = Math.round(50 + t * 50);
    setColorVars(hue, sat);
  });
})();