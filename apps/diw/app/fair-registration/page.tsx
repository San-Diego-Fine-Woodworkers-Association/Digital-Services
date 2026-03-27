"use client";

import { Calendar } from "lucide-react";

export default function Page() {
  return (
    <div className="h-full flex">
      {/* Filters and Calendar */}
      <div className="h-full shrink-0 border-r border-border bg-card p-4">
        <Calendar className="bg-transparent [--cell-size:2.1rem]" />
      </div>

      {/* Main Content */}
      <div className="h-full overflow-y-auto">
        {/* Placeholder items */}
        <div className="p-4">
          <div className="mb-4 rounded-lg bg-muted p-4">Item 1</div>
          <div className="mb-4 rounded-lg bg-muted p-4">Item 2</div>
          <div className="mb-4 rounded-lg bg-muted p-4">Item 3</div>
          <div className="mb-4 rounded-lg bg-muted p-4">Item 4</div>
          <div className="mb-4 rounded-lg bg-muted p-4">Item 5</div>
        </div>
      </div>
    </div>
  )
}
