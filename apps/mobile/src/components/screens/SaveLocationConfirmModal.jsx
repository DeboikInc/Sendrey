import { useState } from "react";
import { Button } from "@material-tailwind/react";
import { Bookmark, Check } from "lucide-react";
import { useDispatch } from "react-redux";
import { addLocation } from "../../Redux/userSlice";


export default function SaveLocationConfirmModal({ place, onConfirm, onCancel, darkMode }) {
  const dispatch = useDispatch();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  if (!place) return null;

  const deriveShortName = () => {
    if (place.name && place.name !== place.address) return place.name;
    return place.address?.split(",")[0]?.trim() || "Mapped Location";
  };

  const handleSaveAndSelect = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await dispatch(addLocation({
        name: deriveShortName(),
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      })).unwrap();
    } catch (err) {
      setIsSaving(false);
      setSaveError(err);
      return; 
    }
    setIsSaving(false);
    onConfirm(place);
  };

  const handleJustSelect = () => {
    onConfirm(place);
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-xs p-6 rounded-2xl shadow-xl ${darkMode ? 'bg-black-100 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bookmark className="text-primary" size={24} />
          </div>
          <h4 className="font-bold text-lg mb-2">Save to Favourites?</h4>
          <p className="text-sm opacity-70 mb-6">
            Would you like to keep this location for your next request?
          </p>

          {saveError && (
            <div className="w-full mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm text-left">
              Couldn't save this location: {saveError}
            </div>
          )}

          <div className="flex flex-col w-full gap-2">
            {saveError ? (
              <>
                <Button
                  size="sm"
                  onClick={onCancel}
                  className="bg-primary flex items-center justify-center gap-2"
                >
                  Select New Location
                </Button>
                <Button
                  size="sm"
                  variant="text"
                  onClick={handleJustSelect}
                  className={darkMode ? 'text-gray-400' : 'text-gray-600'}
                >
                  Just Select
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveAndSelect}
                  disabled={isSaving}
                  className="bg-primary flex items-center justify-center gap-2"
                >
                  <Check size={16} /> {isSaving ? "Saving..." : "Save & Select"}
                </Button>
                <Button
                  size="sm"
                  variant="text"
                  onClick={handleJustSelect}
                  disabled={isSaving}
                  className={darkMode ? 'text-gray-400' : 'text-gray-600'}
                >
                  Just Select
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}