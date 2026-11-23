import { listenForSheetOverscroll } from "./sheetOverscroll";
import { useEffect, useRef, type PointerEvent, type RefObject } from "react";

export default function ForecastSheetHandle({
  panel,
  collapse,
}: {
  panel: RefObject<HTMLDivElement | null>;
  collapse: () => void;
}) {
  useEffect(() => {
    if (panel.current) return listenForSheetOverscroll(panel.current, collapse);
  }, [panel, collapse]);

  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
  } | null>(null);

  const moved = useRef(false);

  function endDrag() {
    drag.current = null;
    panel.current?.removeAttribute("data-dragging");
    panel.current?.style.removeProperty("--sheet-offset");
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;

    const dy = event.clientY - start.y;
    const dx = Math.abs(event.clientX - start.x);
    moved.current ||= Math.max(dx, Math.abs(dy)) > 6;

    if (
      dy > dx &&
      (dy >= 56 ||
        (dy >= 28 && dy / Math.max(1, event.timeStamp - start.time) >= 0.45))
    ) {
      collapse();
    }

    endDrag();
  }

  return (
    <button
      type="button"
      className="control forecast-sheet-handle"
      aria-label="Collapse forecast"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || drag.current) return;
        moved.current = false;

        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        panel.current?.setAttribute("data-dragging", "");
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (start?.id !== event.pointerId) return;
        const dy = event.clientY - start.y;
        const dx = Math.abs(event.clientX - start.x);
        moved.current ||= Math.max(dx, Math.abs(dy)) > 6;

        panel.current?.style.setProperty(
          "--sheet-offset",
          `${dy > dx ? dy : 0}px`,
        );
      }}
      onPointerUp={finish}
      onLostPointerCapture={(event) => {
        if (drag.current?.id === event.pointerId) {
          moved.current = true;
          endDrag();
        }
      }}
      onClick={(event) => {
        if (event.detail === 0 || !moved.current) collapse();
      }}
    >
      <span />
    </button>
  );
}
