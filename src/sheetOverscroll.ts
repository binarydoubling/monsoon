// Let the active forecast scroller consume the gesture before moving the sheet.
export function listenForSheetOverscroll(
  sheet: HTMLElement,
  collapse: () => void,
) {
  let scroller: HTMLElement | null = null;
  let originX = 0;
  let originY = 0;
  let pull = 0;
  let wheelPull = 0;
  let lastWheel = 0;

  function scrollArea(target: EventTarget | null) {
    return target instanceof Element
      ? target.closest<HTMLElement>(".minute-scroll, .scroll")
      : null;
  }

  function reset() {
    if (pull > 0) {
      sheet.removeAttribute("data-dragging");
      sheet.style.removeProperty("--sheet-offset");
    }

    pull = 0;
    scroller = null;
  }

  function start(event: TouchEvent) {
    reset();
    if (event.touches.length !== 1) return;

    if (
      event.target instanceof Element &&
      event.target.closest('[role="slider"], input')
    )
      return;

    scroller = scrollArea(event.target);
    if (!scroller) return;
    originX = event.touches[0].clientX;
    originY = event.touches[0].clientY + Math.max(0, scroller.scrollTop);
  }

  function move(event: TouchEvent) {
    if (!scroller || event.touches.length !== 1) return;
    const finger = event.touches[0];

    if (scroller.scrollTop > 1) {
      originY = finger.clientY + scroller.scrollTop;
      return;
    }

    const dy = Math.max(0, finger.clientY - originY);
    if (!pull && dy <= Math.max(5, Math.abs(finger.clientX - originX))) return;
    if (event.cancelable) event.preventDefault();
    sheet.setAttribute("data-dragging", "");
    sheet.style.setProperty("--sheet-offset", dy + "px");
    pull = dy;

    if (!pull) {
      sheet.removeAttribute("data-dragging");
      sheet.style.removeProperty("--sheet-offset");
    }
  }

  function finish() {
    if (pull >= 56) collapse();
    reset();
  }

  function wheel(event: WheelEvent) {
    const area = scrollArea(event.target);

    if (
      !area ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.deltaY >= 0 ||
      Math.abs(event.deltaX) >= -event.deltaY
    ) {
      wheelPull = 0;
      return;
    }

    const scale =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? area.clientHeight
          : 1;

    const excess = Math.max(
      0,
      -event.deltaY * scale - Math.max(0, area.scrollTop),
    );

    if (!excess || event.timeStamp - lastWheel > 200) wheelPull = 0;
    lastWheel = event.timeStamp;
    wheelPull += excess;

    if (wheelPull >= 56) {
      if (event.cancelable) event.preventDefault();
      collapse();
    }
  }

  sheet.addEventListener("touchstart", start, { passive: true });
  sheet.addEventListener("touchmove", move, { passive: false });
  sheet.addEventListener("touchend", finish);
  sheet.addEventListener("touchcancel", reset);
  sheet.addEventListener("wheel", wheel, { passive: false });

  return () => {
    reset();
    sheet.removeEventListener("touchstart", start);
    sheet.removeEventListener("touchmove", move);
    sheet.removeEventListener("touchend", finish);
    sheet.removeEventListener("touchcancel", reset);
    sheet.removeEventListener("wheel", wheel);
  };
}
