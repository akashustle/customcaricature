import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getStates, getDistricts, getCities } from "@/lib/india-locations";
import { useState } from "react";

interface LocationDropdownsProps {
  state: string;
  district: string;
  city: string;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
  compact?: boolean;
  showLabels?: boolean;
}

const LocationDropdowns = ({
  state, district, city,
  onStateChange, onDistrictChange, onCityChange,
  required = true, compact = false, showLabels = true,
}: LocationDropdownsProps) => {
  const [customCity, setCustomCity] = useState("");
  const states = getStates();
  const districts = state ? getDistricts(state) : [];
  const cities = district ? getCities(state, district) : [];

  const handleStateChange = (val: string) => {
    onStateChange(val);
    onDistrictChange("");
    onCityChange("");
    setCustomCity("");
  };

  const handleDistrictChange = (val: string) => {
    onDistrictChange(val);
    onCityChange("");
    setCustomCity("");
  };

  const handleCityChange = (val: string) => {
    if (val === "__other__") {
      onCityChange("");
      setCustomCity("");
    } else {
      onCityChange(val);
    }
  };

  const isOtherCity = city === "__other__" || (district && !cities.includes(city) && city !== "" && customCity !== "");

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 md:grid-cols-3 gap-3"}>
        <div>
          {showLabels && <Label className="font-sans text-xs">State {required && "*"}</Label>}
          <Select value={state} onValueChange={handleStateChange}>
            <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent className="max-h-60 z-[100] bg-popover">
              {states.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          {showLabels && <Label className="font-sans text-xs">District {required && "*"}</Label>}
          <Select value={district} onValueChange={handleDistrictChange} disabled={!state}>
            <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent className="max-h-60 z-[100] bg-popover">
              {districts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          {showLabels && <Label className="font-sans text-xs">City {required && "*"}</Label>}
          <Select value={cities.includes(city) ? city : city ? "__other__" : ""} onValueChange={handleCityChange} disabled={!district}>
            <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent className="max-h-60 z-[100] bg-popover">
              {cities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
              <SelectItem value="__other__">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {(city === "__other__" || (!cities.includes(city) && city === "" && district)) && city === "__other__" ? null : null}
      {/* Show custom city input when "Other" selected */}
      {(!cities.includes(city) && district && city === "") ? null : null}
      {city === "__other__" && (
        <div>
          {showLabels && <Label className="font-sans text-xs">Enter City Name *</Label>}
          <Input
            value={customCity}
            onChange={(e) => {
              setCustomCity(e.target.value);
              onCityChange(e.target.value);
            }}
            placeholder="Enter your city"
            className={compact ? "h-8 text-xs" : ""}
          />
        </div>
      )}
    </div>
  );
};

export default LocationDropdowns;
