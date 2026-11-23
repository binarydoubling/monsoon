import { useEffect, useRef } from "react";
import type { Place } from "../forecast/weather";
import PlaceList from "../places/PlaceList";
import PlaceSearch from "../places/PlaceSearch";
import { AtlasText, Button, Icon, row } from "../shared/ui";
import Sources from "./Sources";

export type DialogView = "" | "search" | "saved" | "sources";

export default function AppDialog({
  modal,
  onClose,
  onSelect,
  saved,
}: {
  modal: DialogView;
  onClose: () => void;
  onSelect: (place: Place) => void;
  saved: Place[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);

  return (
    <dialog
      ref={dialog}
      className="place-dialog"
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          onClose();
      }}
    >
      <div
        className="stack"
        style={{ ...row, justifyContent: "space-between" }}
      >
        <AtlasText id="dialog-title" face="display" size={23}>
          {modal === "saved"
            ? "Saved points"
            : modal === "search"
              ? "Find a point"
              : "Data & map sources"}
        </AtlasText>
        <Button label="Close" style={{ padding: 5 }} onClick={onClose}>
          <Icon name="x" />
        </Button>
      </div>

      {modal === "search" && <PlaceSearch onSelect={onSelect} />}
      {modal === "saved" && (
        <PlaceList
          places={saved}
          onSelect={onSelect}
          emptyMessage="Use the bookmark on a point forecast to save it here."
        />
      )}
      {modal === "sources" && <Sources />}
    </dialog>
  );
}
