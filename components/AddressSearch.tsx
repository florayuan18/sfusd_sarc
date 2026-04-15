import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AddressSearchProps = {
  address: string;
  onAddressChange: (value: string) => void;
  onSearch: () => void;
};

export function AddressSearch({
  address,
  onAddressChange,
  onSearch
}: AddressSearchProps) {
  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Home address in San Francisco
          </span>
          <input
            type="text"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder="1234 Mission St, San Francisco, CA"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-accent focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <Button size="lg" onClick={onSearch}>
          Search
        </Button>
      </div>
      <button
        type="button"
        disabled
        className="mt-3 text-sm font-medium text-slate-400"
        aria-disabled="true"
      >
        Use current location
      </button>
    </Card>
  );
}
