import { key, type Place } from "../forecast/weather";
import { AtlasText, Button, Icon, accent, line, sub } from "../shared/ui";

export default function PlaceList({
  places,
  onSelect,
  emptyMessage,
}: {
  places: Place[];
  onSelect: (place: Place) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="stack scroll">
      {places.map((p, i) => (
        <Button
          key={key(p) + i}
          onClick={() => onSelect(p)}
          style={{
            justifyContent: "flex-start",
            paddingBlock: 11,
            borderBottomWidth: 1,
            borderColor: line,
            gap: 10,
          }}
        >
          <Icon name="map-pin" color={accent} />
          <div className="stack" style={{ flex: 1 }}>
            <AtlasText face="bold">{p.name}</AtlasText>
            <AtlasText size={12} color={sub}>
              {p.region}
            </AtlasText>
          </div>
        </Button>
      ))}
      {emptyMessage && !places.length && (
        <AtlasText color={sub}>{emptyMessage}</AtlasText>
      )}
    </div>
  );
}
