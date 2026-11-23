import { coords, type Place } from "./weather";
import { Icon, accent } from "./ui";

export default function LocationHeading({ point }: { point: Place }) {
  const coordinates = coords(point);

  return (
    <header className="location-heading">
      <div>
        <Icon name="map-pin" color={accent} size={18} />
        <h2 className="display">{point.name}</h2>
      </div>
      <p>
        {point.region && point.region !== "Selected coordinates" && (
          <span>{point.region}</span>
        )}
        {point.name !== coordinates && (
          <span className="mono">{coordinates}</span>
        )}
      </p>
    </header>
  );
}
