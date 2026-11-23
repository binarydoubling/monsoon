import {
  AtlasText,
  Button,
  Icon,
  Label,
  Logo,
  accent,
  ink,
  line,
  paper,
  row,
  sub,
} from "../shared/ui";

export default function Toolbar({
  small,
  fahrenheit,
  onHome,
  onSearch,
  onSaved,
  onUnitChange,
}: {
  small: boolean;
  fahrenheit: boolean;
  onHome: () => void;
  onSearch: () => void;
  onSaved: () => void;
  onUnitChange: (fahrenheit: boolean) => void;
}) {
  return (
    <div
      className="stack"
      style={{
        ...row,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: small ? 57 : 66,
        paddingInline: small ? 12 : 23,
        backgroundColor: "var(--crust)",
        borderBottomColor: line,
        borderBottomWidth: 1,
        gap: small ? 9 : 18,
      }}
    >
      <Button label="Monsoon home" onClick={onHome}>
        <Logo />
        <AtlasText
          face="display"
          size={small ? 22 : 28}
          color={ink}
          style={{ letterSpacing: -1 }}
        >
          Monsoon
        </AtlasText>
      </Button>
      {!small && (
        <div
          className="stack"
          style={{
            paddingLeft: 15,
            borderLeftWidth: 1,
            borderColor: line,
          }}
        >
          <Label color={sub}>WEATHER ATLAS</Label>
        </div>
      )}
      <div className="stack" style={{ flex: 1 }} />
      <Button
        onClick={onSearch}
        label="Search places or coordinates"
        style={{
          height: 35,
          paddingInline: 9,
          borderWidth: small ? 0 : 1,
          borderColor: line,
          borderRadius: 5,
        }}
      >
        <Icon name="search" size={17} color={ink} />
        {!small && (
          <AtlasText size={13} color={ink}>
            Search places or coordinates
          </AtlasText>
        )}
      </Button>
      <Button label="Saved points" onClick={onSaved} style={{ padding: 4 }}>
        <Icon name="bookmark" size={17} color={ink} />
        {!small && (
          <AtlasText size={13} color={ink}>
            Saved points
          </AtlasText>
        )}
      </Button>
      <div
        className="stack"
        style={{
          ...row,
          borderWidth: 1,
          borderColor: line,
          borderRadius: 5,
          padding: 2,
        }}
      >
        {[false, true].map((f) => (
          <Button
            key={String(f)}
            label={f ? "Use Fahrenheit" : "Use Celsius"}
            aria-pressed={f === fahrenheit}
            onClick={() => onUnitChange(f)}
            style={{
              paddingInline: small ? 5 : 8,
              paddingBlock: 4,
              borderRadius: 3,
              backgroundColor: f === fahrenheit ? accent : "transparent",
            }}
          >
            <AtlasText
              face="mono"
              size={11}
              color={f === fahrenheit ? paper : sub}
            >
              {f ? "°F" : "°C"}
            </AtlasText>
          </Button>
        ))}
      </div>
    </div>
  );
}
