"use client";
import { useTransition } from "react";
import { Button, Select } from "@/components/kit";
import { deleteEnquiry, setEnquiryStatus } from "@/lib/actions";

const STATUS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

/** Status dropdown + delete for one enquiry. Server actions re-check the `enquiries` permission. */
export function EnquiryActions({ id, status, name }: { id: string; status: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Select
        fieldSize="sm"
        className="w-36"
        aria-label={`Status of ${name}`}
        value={status}
        disabled={pending}
        options={STATUS}
        onChange={(v) => start(async () => { await setEnquiryStatus(id, v); })}
      />
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        aria-label={`Delete enquiry from ${name}`}
        onClick={() => start(async () => {
          if (!confirm(`Delete the enquiry from "${name}" permanently? This cannot be undone.`)) return;
          await deleteEnquiry(id);
        })}
      >
        Delete
      </Button>
    </div>
  );
}
