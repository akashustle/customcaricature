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
  const [customDistrict, setCustomDistrict] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [isOtherDistrict, setIsOtherDistrict] = useState(false);
  const [isOtherCity, setIsOtherCity] = useState(false);

  const states = getStates();
  const districts = state ? getDistricts(state) : [];
  const cities = district && !isOtherDistrict ? getCities(state, district) : [];

  const handleStateChange = (val: string) => {
    onStateChange(val);
    onDistrictChange("");
    onCityChange("");
    setCustomDistrict("");
    setCustomCity("");
    setIsOtherDistrict(false);
    setIsOtherCity(false);
  };

  const handleDistrictChange = (val: string) => {
    if (val === "__other__") {
      setIsOtherDistrict(true);
      onDistrictChange("");
      setCustomDistrict("");
      onCityChange("");
      setCustomCity("");
      setIsOtherCity(true); // If district is other, city must also be typed
    } else {
      setIsOtherDistrict(false);
      onDistrictChange(val);
      onCityChange("");
      setCustomCity("");
      setIsOtherCity(false);
    }
  };

  const handleCityChange = (val: string) => {
    if (val === "__other__") {
      setIsOtherCity(true);
      onCityChange("");
      setCustomCity("");
    } else {
      setIsOtherCity(false);
      onCityChange(val);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "grid grid-cols-3 gap-2" : "grid grid-cols-1 md:grid-cols-3 gap-3"}>
        {/* State */}
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

        {/* District */}
        <div>
          {showLabels && <Label className="font-sans text-xs">District {required && "*"}</Label>}
          {isOtherDistrict ? (
            <Input
              value={customDistrict}
              onChange={(e) => {
                setCustomDistrict(e.target.value);
                onDistrictChange(e.target.value);
              }}
              placeholder="Enter district name"
              className={compact ? "h-8 text-xs" : ""}
            />
          ) : (
            <Select value={district} onValueChange={handleDistrictChange} disabled={!state}>
              <SelectTrigger className={compact ? "h-8 text-xs" : ""}>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent className="max-h-60 z-[100] bg-popover">
                {districts.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
                <SelectItem value="__other__">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
          {isOtherDistrict && (
            <button onClick={() => { setIsOtherDistrict(false); onDistrictChange(""); setCustomDistrict(""); }} className="text-[10px] text-primary font-sans mt-1 hover:underline">← Back to list</button>
          )}
        </div>

        {/* City */}
        <div>
          {showLabels && <Label className="font-sans text-xs">City {required && "*"}</Label>}
          {isOtherCity || isOtherDistrict ? (
            <Input
              value={customCity}
              onChange={(e) => {
                setCustomCity(e.target.value);
                onCityChange(e.target.value);
              }}
              placeholder="Enter city name"
              className={compact ? "h-8 text-xs" : ""}
            />
          ) : (
            <Select value={cities.includes(city) ? city : ""} onValueChange={handleCityChange} disabled={!district}>
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
          )}
          {isOtherCity && !isOtherDistrict && (
            <button onClick={() => { setIsOtherCity(false); onCityChange(""); setCustomCity(""); }} className="text-[10px] text-primary font-sans mt-1 hover:underline">← Back to list</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationDropdowns;
